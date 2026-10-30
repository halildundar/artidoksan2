import mongoose from 'mongoose';

// Tek seferlik aktarım: artidoksan1'in veritabanındaki (aitest.onaylikurums,
// NANDO'dan içe aktarılmış) onaylı kurum kayıtlarını bu projenin
// veritabanına (artidoksan2.onaylikurumlar) kopyalar.
// Çalıştırma: node import-onayli-kurumlar.js
const KAYNAK_URI = 'mongodb://127.0.0.1:27017/aitest';
const HEDEF_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/artidoksan2';

const kaynak = await mongoose.createConnection(KAYNAK_URI).asPromise();
const hedef = await mongoose.createConnection(HEDEF_URI).asPromise();

const kaynakCol = kaynak.db.collection('onaylikurums');
const hedefCol = hedef.db.collection('onaylikurumlar');

const docs = await kaynakCol.find().toArray();
console.log(`Kaynakta ${docs.length} kayıt bulundu`);

let eklenen = 0;
let guncellenen = 0;
for (const doc of docs) {
  const { _id, __v, ...veri } = doc;
  // nobo + unvan ikilisine göre upsert: script tekrar çalıştırılırsa kopya üretmez
  const sonuc = await hedefCol.updateOne(
    { nobo: veri.nobo, unvan: veri.unvan },
    { $set: veri },
    { upsert: true }
  );
  if (sonuc.upsertedCount) eklenen++;
  else if (sonuc.modifiedCount) guncellenen++;
}

console.log(`Aktarım bitti: ${eklenen} yeni, ${guncellenen} güncellendi`);
console.log(`Hedefte toplam: ${await hedefCol.countDocuments()}`);

await kaynak.close();
await hedef.close();
