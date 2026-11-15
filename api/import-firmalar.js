// Eski MariaDB `as-firma` tablosunu (as_firma.sql dökümü) artidoksan2.firmalar
// koleksiyonuna aktarır. Firma evrakları eski siteden indirilip R2'ye yüklenir
// ve belgeler.* / kurumEvrakDosyalari.* yuvalarına işlenir.
//
// Kullanım (api/ klasöründen):
//   node import-firmalar.js --dry     # yazmadan: ayrıştırma + dosya erişim denetimi
//   node import-firmalar.js           # gerçek aktarım
//
// Tekrar çalıştırmak güvenlidir: aynı ada (ad) sahip firma zaten varsa atlanır.
import 'dotenv/config';
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { buildObjectKey, putObject } from './storage.js';

if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(','));

const DRY = process.argv.includes('--dry');
const KAYNAK_URL = 'https://lift.artidoksancert.com';
const SQL_YOLU = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'as_firma.sql');
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/artidoksan2';

// ---------- SQL ayrıştırma ----------
function sqlSatirlariniOku(metin) {
  const bas = metin.indexOf('INSERT INTO `as-firma`');
  if (bas < 0) throw new Error('INSERT bulunamadı');
  const kolonBas = metin.indexOf('(', bas);
  const kolonBit = metin.indexOf(')', kolonBas);
  const kolonlar = metin.slice(kolonBas + 1, kolonBit).split(',').map((k) => k.trim().replace(/`/g, ''));
  let i = metin.indexOf('VALUES', kolonBit) + 6;

  const satirlar = [];
  while (i < metin.length) {
    while (i < metin.length && /[\s,]/.test(metin[i])) i++;
    if (metin[i] === ';') break;
    if (metin[i] !== '(') throw new Error(`Beklenmeyen karakter @${i}: ${metin.slice(i, i + 30)}`);
    i++;
    const deger = [];
    for (;;) {
      while (/\s/.test(metin[i])) i++;
      if (metin[i] === "'") {
        i++;
        let s = '';
        for (;;) {
          const c = metin[i];
          if (c === '\\') { s += metin[i + 1] === 'n' ? '\n' : metin[i + 1]; i += 2; }
          else if (c === "'" && metin[i + 1] === "'") { s += "'"; i += 2; }
          else if (c === "'") { i++; break; }
          else { s += c; i++; }
        }
        deger.push(s);
      } else {
        let j = i;
        while (metin[j] !== ',' && metin[j] !== ')') j++;
        const ham = metin.slice(i, j).trim();
        deger.push(ham === 'NULL' ? null : Number(ham));
        i = j;
      }
      while (/\s/.test(metin[i])) i++;
      if (metin[i] === ',') { i++; continue; }
      if (metin[i] === ')') { i++; break; }
      throw new Error(`Değer sonrası beklenmeyen karakter @${i}`);
    }
    if (deger.length !== kolonlar.length) throw new Error(`Kolon sayısı uyuşmuyor (${deger.length}/${kolonlar.length})`);
    satirlar.push(Object.fromEntries(kolonlar.map((k, n) => [k, deger[n]])));
  }
  return satirlar;
}

// ---------- Alan temizleme ----------
// Kiril'deki Latin'e benzeyen harfler (örn. id 97 "МЕНМЕT") Latin'e çevrilir.
const KIRIL = { М: 'M', Е: 'E', Н: 'H', Т: 'T', А: 'A', В: 'B', К: 'K', О: 'O', Р: 'P', С: 'C', Х: 'X', м: 'm', е: 'e', о: 'o', р: 'p', с: 'c', а: 'a' };
function temiz(v) {
  if (v == null) return '';
  let s = String(v).replace(/[Ѐ-ӿ]/g, (c) => KIRIL[c] ?? c).replace(/\s+/g, ' ').trim();
  if (/^[-.]+$/.test(s) || s === '') return '';
  return s;
}

// Adres sonundaki "İLÇE/İL" kalıbından il + ilçe çıkarılır (yoksa boş).
function ilIlce(adres) {
  const m = adres.match(/([A-Za-zÇĞİÖŞÜçğıöşü0-9.]+)\s*\/\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*\.?\s*$/);
  if (!m) return { il: '', ilce: '' };
  return { ilce: m[1], il: m[2] };
}

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf' };
const EK_ADAYLARI = ['png', 'pdf', 'jpg', 'jpeg', 'jfif', 'webp', 'JPG', 'PDF', 'PNG', 'JPEG'];

// SQL kolonu -> [belgeler anahtarı, çoklu liste anahtarı | null]
const BELGE_ESLEME = {
  logo: ['logo', null],
  imza_kase: ['imzaKase', null],
  vergi_levhasi: ['vergiLevhasi', 'vergiLevhasi'],
  imza_sirkuleri: ['imzaSirkusu', 'imzaSirkusu'],
  faaliyet_belgesi: ['faaliyetBelgesi', 'faaliyetBelgesi'],
  sicil_gazetesi: ['sicilGazetesi', 'sicilGazetesi'],
};

// ---------- Dosya indirme ----------
async function indir(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return null;
  const tip = res.headers.get('content-type') ?? '';
  if (tip.includes('text/html')) return null; // SPA yedek sayfası, gerçek dosya değil
  return { buffer: Buffer.from(await res.arrayBuffer()), tip };
}

// Yol bire bir bulunamazsa: satırdaki diğer klasör adları ve farklı uzantılar denenir.
async function dosyaBul(sutun, row) {
  const verilen = row[sutun];
  if (!verilen || verilen === '-') return null;
  const parcalar = verilen.split('/'); // ['', 'uploads', 'as-firma', KLASOR, 'Kuruluş Evraklar', DOSYA]
  const dosya = parcalar[5];
  const ad = dosya.replace(/\.[^.]+$/, '');
  const uzanti = dosya.includes('.') ? dosya.split('.').pop() : '';

  const klasorler = new Set([parcalar[3]]);
  for (const k of Object.keys(BELGE_ESLEME).concat('son_kon_imz')) {
    const p = row[k]?.split?.('/');
    if (p?.[3]) klasorler.add(p[3]);
  }
  klasorler.add(row.kisa_ad);
  klasorler.add(row.kisa_ad.trim());

  const dosyalar = [dosya, ...EK_ADAYLARI.filter((e) => e !== uzanti).map((e) => `${ad}.${e}`)];
  for (const k of klasorler) {
    for (const d of dosyalar) {
      const url = `${KAYNAK_URL}/uploads/as-firma/${encodeURIComponent(k)}/${encodeURIComponent('Kuruluş Evraklar')}/${encodeURIComponent(d)}`;
      const sonuc = await indir(url);
      if (sonuc) return { ...sonuc, dosyaAdi: d, url };
    }
  }
  return null;
}

async function slotOlustur(sutun, row, rapor) {
  const bulunan = await dosyaBul(sutun, row);
  if (!bulunan) {
    rapor.eksikDosya.push(`${row.kisa_ad} / ${sutun}`);
    return null;
  }
  const ext = bulunan.dosyaAdi.split('.').pop().toLowerCase();
  const mimeType = MIME[ext];
  if (!mimeType) {
    rapor.eksikDosya.push(`${row.kisa_ad} / ${sutun} (desteklenmeyen uzantı: ${ext})`);
    return null;
  }
  if (bulunan.dosyaAdi !== row[sutun].split('/').pop()) {
    rapor.yedekle.push(`${row.kisa_ad} / ${sutun}: ${row[sutun].split('/').pop()} -> ${bulunan.dosyaAdi}`);
  }
  let dosyaAnahtari = null;
  if (!DRY) {
    dosyaAnahtari = buildObjectKey('firmalar', bulunan.dosyaAdi);
    await putObject(dosyaAnahtari, bulunan.buffer, mimeType);
  }
  return {
    dosyaAdi: bulunan.dosyaAdi,
    dosyaAnahtari: dosyaAnahtari ?? `DRY/${bulunan.dosyaAdi}`,
    mimeType,
    boyut: bulunan.buffer.length,
    yuklenmeTarihi: new Date(),
  };
}

// ---------- Ana akış ----------
const satirlar = sqlSatirlariniOku(fs.readFileSync(SQL_YOLU, 'utf8'));
console.log(`SQL'den okunan firma: ${satirlar.length}${DRY ? '  (DRY-RUN: yazma yok)' : ''}`);

await mongoose.connect(MONGODB_URI);
const col = mongoose.connection.db.collection('firmalar');
console.log(`Hedef DB: ${mongoose.connection.name}, mevcut firma sayısı: ${await col.countDocuments()}`);
const mevcutAdlar = new Set((await col.find({}, { projection: { ad: 1 } }).toArray()).map((f) => f.ad.trim().toLocaleUpperCase('tr')));

const rapor = { eklendi: 0, atlandi: [], eksikDosya: [], yedekle: [], duzeltme: [], yuklenenDosya: 0 };

for (const row of satirlar) {
  const ad = temiz(row.kisa_ad);
  if (!ad) { rapor.atlandi.push(`id ${row.id}: boş ad`); continue; }
  if (mevcutAdlar.has(ad.toLocaleUpperCase('tr'))) { rapor.atlandi.push(`${ad} (zaten var)`); continue; }

  let email = temiz(row.email);
  let telefon = temiz(row.telefon);
  // Yanlış alana girilmiş değerler
  if (telefon.includes('@') && email && !email.includes('@')) {
    rapor.duzeltme.push(`${ad}: e-posta ile telefon alanları yer değiştirdi`);
    [email, telefon] = [telefon, email];
  }
  if (email && !email.includes('@')) {
    if (/^https?:\/\//i.test(email)) { rapor.duzeltme.push(`${ad}: e-posta alanındaki web sitesi atıldı (${email})`); email = ''; }
    else if (/^[+\d()\s%-]{7,}$/.test(email) && !telefon) { rapor.duzeltme.push(`${ad}: e-posta/telefon yer değiştirdi`); telefon = email; email = ''; }
    else if (/^[+\d()\s%-]{7,}$/.test(email)) { rapor.duzeltme.push(`${ad}: e-posta alanındaki telefon atıldı (${email})`); email = ''; }
    else { rapor.duzeltme.push(`${ad}: geçersiz e-posta atıldı (${email})`); email = ''; }
  }
  if (telefon.includes('@')) {
    if (!email) { rapor.duzeltme.push(`${ad}: telefon alanındaki e-posta taşındı`); email = telefon; }
    telefon = '';
  }
  email = email.toLowerCase();

  const adres = temiz(row.adres);
  const { il, ilce } = ilIlce(adres);
  const yetkili = temiz(row.sirket_muduru);
  let sonKontrolcu = temiz(row.son_kontrolcu);
  if (/^[+\d()\s%-]{7,}$/.test(sonKontrolcu)) { rapor.duzeltme.push(`${ad}: son kontrolcü alanındaki sayı atıldı (${sonKontrolcu})`); sonKontrolcu = ''; }

  const belgeler = {};
  const kurumEvrak = {};
  for (const [sutun, [slotAdi, listeAdi]] of Object.entries(BELGE_ESLEME)) {
    const slot = await slotOlustur(sutun, row, rapor);
    if (!slot) continue;
    belgeler[slotAdi] = slot;
    if (listeAdi) kurumEvrak[listeAdi] = [slot];
    rapor.yuklenenDosya++;
  }

  const simdi = new Date();
  const belge = {
    ad,
    unvan: temiz(row.unvan),
    telefon,
    email,
    il,
    ilce,
    mahalle: '',
    postaKodu: row.pk ? String(row.pk) : '',
    adres,
    yetkili,
    vergiDairesi: '',
    vergiNo: temiz(row.vergi_no),
    belgeler,
    kurumEvrakDosyalari: kurumEvrak,
    personel: {
      genelMudur: yetkili,
      kytTemsilcisi: '',
      montajSorumlusu: '',
      bakimSorumlusu: '',
      satinAlmaSorumlusu: '',
      sonKontrolSorumlusu: sonKontrolcu,
    },
    sanayiSicilBelgeNo: '', sanayiSicilBelgeTarihi: null, sanayiSicilDosya: null,
    hybBelgeNo: '', hybIlkVerilis: null, hybGecerlilik: null, hybDosya: null,
    isoDosya: null, ceBelgeleri: [], cihazDosyalari: [], muhendisler: [], sgkDokumleri: [],
    smmTuru: null, smmFirmaId: null, smmYil: null, smmSozlesme: null,
    smmKisaAd: '', smmUnvan: '', smmAdres: '', smmBuroTescilBelgesi: null,
    smmMakMuhAdSoyad: '', smmMakMuhOdaSicilNo: '', smmMakMuhTelefon: '', smmMakMuhSmmBelgesi: null, smmMakMuhImzaSirkusu: null,
    smmElkMuhAdSoyad: '', smmElkMuhOdaSicilNo: '', smmElkMuhTelefon: '', smmElkMuhSmmBelgesi: null, smmElkMuhImzaSirkusu: null,
    createdAt: simdi,
    updatedAt: simdi,
    __v: 0,
  };

  if (!DRY) await col.insertOne(belge);
  mevcutAdlar.add(ad.toLocaleUpperCase('tr'));
  rapor.eklendi++;
  console.log(`${DRY ? '[dry] ' : ''}${ad}  (${Object.keys(belgeler).length}/6 dosya)  il=${il || '-'} ilçe=${ilce || '-'}`);
}

console.log('\n===== ÖZET =====');
console.log(`${DRY ? 'Eklenecek' : 'Eklenen'} firma: ${rapor.eklendi}`);
console.log(`Atlanan: ${rapor.atlandi.length}`, rapor.atlandi);
console.log(`İşlenen dosya: ${rapor.yuklenenDosya}`);
console.log(`Bulunamayan dosya: ${rapor.eksikDosya.length}`, rapor.eksikDosya);
console.log(`Yedek yol/uzantıyla bulunan: ${rapor.yedekle.length}`, rapor.yedekle);
console.log(`Veri düzeltmeleri: ${rapor.duzeltme.length}`, rapor.duzeltme);
await mongoose.disconnect();
