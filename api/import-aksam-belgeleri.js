// aitest (artidoksan1 güncel sürümünün DB'si) aksambelgesis koleksiyonundaki
// güvenlik aksamı / bileşen sertifikalarını artidoksan2.aksambelgeleri'ne
// aktarır. _id korunur (upsert) — tekrar çalıştırmak güvenlidir.
// Dosya anahtarları aynı R2 bucket'ını ("test") işaret ettiğinden belge
// dosyaları artidoksan2 görüntüleyicisinde de açılır.
import mongoose from 'mongoose';
import { BILESEN_TIPLERI } from './katalog.js';

const kaynak = await mongoose.createConnection('mongodb://127.0.0.1:27017/aitest').asPromise();
const hedef = await mongoose.createConnection('mongodb://127.0.0.1:27017/artidoksan2').asPromise();

// aitest'teki genel 'motor' kodu bizde yok — Motor (Dişlisiz) olarak eşlenir.
const KOD_ESLEME = { motor: 'motor_dislisiz' };

// Onaylı kurum id'leri veritabanları arasında farklı — NoBo numarasıyla eşle.
const kurumlar = await hedef.db.collection('onaylikurumlar').find({}, { projection: { nobo: 1, unvan: 1 } }).toArray();
const kurumByNobo = new Map(kurumlar.map((k) => [String(k.nobo).trim(), k]));

const kayitlar = await kaynak.db.collection('aksambelgesis').find({}).toArray();
console.log(`kaynak kayıt: ${kayitlar.length}`);

const hedefCol = hedef.db.collection('aksambelgeleri');
let eklendi = 0, guncellendi = 0, atlanan = 0;

for (const k of kayitlar) {
  const kod = KOD_ESLEME[k.bilesenTipiKoduSnapshot] ?? k.bilesenTipiKoduSnapshot;
  const tip = BILESEN_TIPLERI.find((t) => t.kod === kod);
  if (!tip) {
    console.log(`  atlandı (bilinmeyen kod ${k.bilesenTipiKoduSnapshot}): ${k.marka ?? '-'} / ${k.sertifikaNo ?? '-'}`);
    atlanan++;
    continue;
  }

  const kurum = k.onayliKurumNobo ? kurumByNobo.get(String(k.onayliKurumNobo).trim()) : null;
  const bitis = k.gecerlilikBitis ? new Date(k.gecerlilikBitis) : null;

  const belge = {
    bilesenTipiKodu: tip.kod,
    bilesenTipiAdi: tip.ad,
    kategori: tip.kategori,
    tahrikTipi: tip.tahrikTipi,
    sertifikaNo: k.sertifikaNo ?? '',
    gecerlilikBaslangic: k.gecerlilikBaslangic ? new Date(k.gecerlilikBaslangic) : null,
    gecerlilikBitis: bitis,
    modulKodu: k.modulKodu ?? '',
    onayliKurumId: kurum?._id ?? null,
    onayliKurumNobo: k.onayliKurumNobo ?? '',
    onayliKurumUnvan: kurum?.unvan ?? '',
    marka: k.marka ?? '',
    tipler: Array.isArray(k.tipler) ? k.tipler : [],
    belgeTipi: k.belgeTipi ?? '',
    aciklama: k.aciklama ?? '',
    durum: bitis && bitis < new Date() ? 'pasif' : (k.durum === 'pasif' ? 'pasif' : 'aktif'),
    createdAt: k.createdAt ? new Date(k.createdAt) : new Date(),
    updatedAt: k.updatedAt ? new Date(k.updatedAt) : new Date(),
  };
  if (k.dosya?.dosyaAnahtari) {
    belge.dosya = {
      dosyaAdi: k.dosya.dosyaAdi ?? 'belge',
      dosyaAnahtari: k.dosya.dosyaAnahtari,
      mimeType: k.dosya.mimeType ?? '',
      boyut: k.dosya.boyut ?? null,
      yuklenmeTarihi: k.dosya.yuklenmeTarihi ? new Date(k.dosya.yuklenmeTarihi) : new Date(k.createdAt ?? Date.now()),
    };
  }

  const sonuc = await hedefCol.updateOne({ _id: k._id }, { $set: belge }, { upsert: true });
  if (sonuc.upsertedCount) eklendi++;
  else guncellendi++;
}

console.log(`eklendi: ${eklendi}, güncellendi: ${guncellendi}, atlanan: ${atlanan}`);
console.log(`hedef toplam: ${await hedefCol.countDocuments()}`);
await kaynak.close();
await hedef.close();
