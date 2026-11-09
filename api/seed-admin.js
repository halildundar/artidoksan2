// İlk yönetici hesabını hazırlar: e-posta doğrulaması atlanır, rastgele güçlü şifre üretilir ve yalnız bir kez ekrana yazılır.
// Kullanım (api klasöründe):  node seed-admin.js "De Karahan" karahan@admin.com [şifre]   (şifre verilmezse rastgele üretilir)
// Kayıt yoksa oluşturulur (Admin rolüyle); varsa e-posta/şifre güncellenir, tüm oturumları sıfırlanır.
import 'dotenv/config';
import dns from 'node:dns';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Kullanici, adSoyadAyir, oturumlariSifirla } from './kullanicilar.js';
import { parolaHashle } from './auth.js';

if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',')); // server.js ile aynı

const [adSoyad = 'De Karahan', email = 'karahan@admin.com', verilenSifre] = process.argv.slice(2);

// Okunaklı karakterler (0/O, 1/l/I yok), 16 hane
const ALFABE = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const sifreUret = () => Array.from(crypto.randomBytes(16), (b) => ALFABE[b % ALFABE.length]).join('');

await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/artidoksan2');
const { ad, soyad } = adSoyadAyir(adSoyad);
const sifre = verilenSifre || sifreUret();
if (sifre.length < 8) throw new Error('Şifre en az 8 karakter olmalıdır');

let k = await Kullanici.findOne({ rol: 'admin', ad, soyad });
if (!k) k = await Kullanici.findOne({ email: email.toLowerCase() });
const veri = {
  email: email.toLowerCase(), emailDogrulandi: true, parolaHash: await parolaHashle(sifre), parolaAyarli: true,
  aktif: true, dogrulamaAtla: true, denemeSayaci: 0, kilitBitis: null,
};
if (k) {
  await Kullanici.updateOne({ _id: k._id }, { $set: veri });
  await oturumlariSifirla(k._id);
} else {
  k = await Kullanici.create({ ad, soyad, rol: 'admin', ...veri });
}

console.log(`\nYönetici hazır: ${ad} ${soyad} <${veri.email}>`);
console.log(`Geçici şifre (bir kez gösterilir, kaydedin): ${sifre}\n`);
await mongoose.disconnect();
