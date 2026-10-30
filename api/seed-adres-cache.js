import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import { listIller, listIlceler, listMahalleler, adresYazimlariniBekle } from './adres.js';

// PTT'ye erişebilen bir makinede (Türkiye IP'si) çalıştırılır: tüm il/ilçe/
// mahalle listelerini PTT'den çekip adresCache koleksiyonuna yazar. Hedef DB
// SEED_MONGODB_URI ile verilir (yoksa .env'deki MONGODB_URI kullanılır):
//   SEED_MONGODB_URI="mongodb+srv://..." node seed-adres-cache.js
// Bazı ağlarda Atlas'ın SRV DNS sorgusu engelli — açık çözümleyici kullanılır.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = process.env.SEED_MONGODB_URI || process.env.MONGODB_URI;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

await mongoose.connect(uri);
console.log('bağlandı:', uri.replace(/\/\/[^@]*@/, '//***@'));

const iller = await listIller();
console.log(`${iller.length} il`);

let ilceToplam = 0;
let hataToplam = 0;
for (const il of iller) {
  let ilceler;
  try {
    ilceler = await listIlceler(il.value);
  } catch (e) {
    console.log(`${il.label}: ilçe listesi alınamadı (${e.message})`);
    hataToplam++;
    continue;
  }
  for (const ilce of ilceler) {
    try {
      await listMahalleler(il.value, ilce.value);
    } catch (e) {
      console.log(`${il.label}/${ilce.label}: mahalle alınamadı (${e.message})`);
      hataToplam++;
    }
    await bekle(120); // PTT'yi boğmamak için
  }
  ilceToplam += ilceler.length;
  console.log(`${il.label}: ${ilceler.length} ilçe tamam`);
}

await adresYazimlariniBekle();
await mongoose.disconnect();
console.log(`SEED TAMAM — ${iller.length} il, ${ilceToplam} ilçe, ${hataToplam} hata`);
