// R2 deposundaki YETİM dosyaları bulur: veritabanında hiçbir kayıtta anahtarı geçmeyen nesneler.
// Kullanım (api klasöründe):
//   node temizle-depo.js          → yalnız rapor (kuru çalıştırma), hiçbir şey silmez
//   node temizle-depo.js --sil    → raporlanan yetim dosyaları siler
// Güvenlik: son 1 saatte yüklenenler (kayda henüz bağlanmamış olabilir) ve 7 günden yeni zipler/ dosyaları
// (paylaşım linkleri hâlâ geçerli) atlanır.
import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import { listObjects, deleteObject } from './storage.js';
import { dosyaAnahtarlari } from './depoTemizlik.js';

if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(','));

const sil = process.argv.includes('--sil');
const SAAT = 3600_000;
const simdi = Date.now();

await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/artidoksan2');

// Tüm koleksiyonlardaki dosya anahtarları (model bağımsız, iç içe alanlar dahil)
const kullanilan = new Set();
const koleksiyonlar = await mongoose.connection.db.listCollections().toArray();
for (const { name } of koleksiyonlar) {
  for await (const belge of mongoose.connection.db.collection(name).find()) dosyaAnahtarlari(belge, kullanilan);
}

const nesneler = await listObjects();
const yetim = [];
let atlanan = 0;
for (const o of nesneler) {
  if (kullanilan.has(o.key)) continue;
  const yas = simdi - new Date(o.tarih).getTime();
  if (yas < SAAT || (o.key.startsWith('zipler/') && yas < 7 * 24 * SAAT)) { atlanan += 1; continue; }
  yetim.push(o);
}

const mb = (b) => (b / 1024 / 1024).toFixed(2);
const gruplar = {};
for (const o of yetim) {
  const g = o.key.split('/')[0];
  gruplar[g] ??= { adet: 0, boyut: 0 };
  gruplar[g].adet += 1;
  gruplar[g].boyut += o.boyut;
}
console.log(`\nDepoda ${nesneler.length} dosya, veritabanında kullanılan ${kullanilan.size} anahtar.`);
console.log(`Yetim: ${yetim.length} dosya (${mb(yetim.reduce((t, o) => t + o.boyut, 0))} MB), güvenlik için atlanan: ${atlanan}`);
for (const [g, v] of Object.entries(gruplar)) console.log(`  ${g}/ → ${v.adet} dosya, ${mb(v.boyut)} MB`);

if (!sil) {
  if (yetim.length) console.log('\nÖrnekler:\n' + yetim.slice(0, 15).map((o) => `  ${o.key}`).join('\n'));
  console.log('\nKuru çalıştırma — silmek için: node temizle-depo.js --sil\n');
} else {
  let silinen = 0;
  for (const o of yetim) {
    try { await deleteObject(o.key); silinen += 1; } catch (err) { console.error('Silinemedi:', o.key, err.message); }
  }
  console.log(`\n${silinen} yetim dosya silindi.\n`);
}
await mongoose.disconnect();
