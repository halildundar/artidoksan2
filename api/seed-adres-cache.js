import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import { listIller, listIlceler, listMahalleler, adresYazimlariniBekle } from './adres.js';

// PTT'ye erişebilen bir makinede (Türkiye IP'si) çalıştırılır: tüm il/ilçe/
// mahalle listelerini PTT'den çekip adresCache koleksiyonuna yazar. Hedef DB
// SEED_MONGODB_URI ile verilir (yoksa .env'deki MONGODB_URI kullanılır):
//   SEED_MONGODB_URI="mongodb+srv://..." node seed-adres-cache.js
// Tekrar çalıştırmak güvenlidir: DB'de olan anahtarlar atlanır, eksikler
// tamamlanır. PTT art arda istekte hız limiti uyguluyor — istekler aralıklı
// gider, üst üste çok hata görülürse betik kibarca durur (sonra yeniden
// çalıştırın, kaldığı yerden sürer).
// Bazı ağlarda Atlas'ın SRV DNS sorgusu engelli — açık çözümleyici kullanılır.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const ISTEK_ARASI_MS = 400;
const HATA_BEKLEME_MS = 30_000;
const UST_USTE_HATA_SINIRI = 8;

const uri = process.env.SEED_MONGODB_URI || process.env.MONGODB_URI;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

await mongoose.connect(uri);
console.log('bağlandı:', uri.replace(/\/\/[^@]*@/, '//***@'));

const cache = mongoose.connection.collection('adresCache');

async function dbVeri(anahtar) {
  const kayit = await cache.findOne({ _id: anahtar });
  return kayit?.veri?.length ? kayit.veri : null;
}

const iller = await listIller();
console.log(`${iller.length} il`);

let ustUsteHata = 0;
let eklenen = 0;
let atlanan = 0;
let hataToplam = 0;
let durduruldu = false;

async function dene(etiket, fn) {
  try {
    await fn();
    ustUsteHata = 0;
    eklenen++;
    await bekle(ISTEK_ARASI_MS);
    return true;
  } catch (e) {
    hataToplam++;
    ustUsteHata++;
    console.log(`${etiket}: alınamadı (${e.message}) — ${HATA_BEKLEME_MS / 1000}s bekleniyor`);
    await bekle(HATA_BEKLEME_MS);
    if (ustUsteHata >= UST_USTE_HATA_SINIRI) {
      console.log('PTT art arda engelledi — betik duruyor. Daha sonra yeniden çalıştırın; kaldığı yerden devam eder.');
      durduruldu = true;
    }
    return false;
  }
}

for (const il of iller) {
  if (durduruldu) break;
  // İlçe listesi: DB'de varsa oradan, yoksa PTT'den
  let ilceler = await dbVeri(`ilceler:${il.value}`);
  if (ilceler) {
    atlanan++;
  } else {
    await dene(`${il.label} ilçeleri`, async () => {
      ilceler = await listIlceler(il.value);
    });
    if (!ilceler) continue;
  }

  let eksikVardi = false;
  for (const ilce of ilceler) {
    if (durduruldu) break;
    if (await dbVeri(`mahalleler:${il.value}:${ilce.value}`)) {
      atlanan++;
      continue;
    }
    eksikVardi = true;
    await dene(`${il.label}/${ilce.label} mahalleleri`, () => listMahalleler(il.value, ilce.value));
  }
  console.log(`${il.label}: ${ilceler.length} ilçe ${eksikVardi ? 'işlendi' : '(tamamı zaten vardı)'}`);
}

await adresYazimlariniBekle();
await mongoose.disconnect();
console.log(`SEED ${durduruldu ? 'YARIM KALDI' : 'TAMAM'} — yeni: ${eklenen}, atlanan: ${atlanan}, hata: ${hataToplam}`);
