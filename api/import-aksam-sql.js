// Eski MariaDB sertifika tablolarını (motor / durak-kapi-kilit / kabin-kapi-kilit dökümleri)
// artidoksan2.aksambelgeleri koleksiyonuna (Ayarlar > Güvenlik Aksamları) aktarır.
// Sertifika dosyaları eski siteden indirilip R2'ye yüklenir.
//
// Kullanım (api/ klasöründen):
//   node import-aksam-sql.js motor --dry     # yazmadan: ayrıştırma + dosya erişim denetimi
//   node import-aksam-sql.js motor           # gerçek aktarım   (motor | durak | kabin | ucm)
//
// Tekrar çalıştırmak güvenlidir: marka + sertifika numarası zaten kayıtlı olan belgeler atlanır.
import 'dotenv/config';
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { buildObjectKey, putObject } from './storage.js';
import { BILESEN_TIPLERI } from './katalog.js';

if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(','));

const DRY = process.argv.includes('--dry');
const KAYNAK_URL = 'https://lift.artidoksancert.com';
// tür -> SQL dosyası, tablo adı ve katalog bileşen kodu
const TURLER = {
  // Eski tabloda dişli bilgisi yok: Motor (Dişlisiz) olarak eşlenir
  motor: { sql: 'motor.sql', tablo: 'motor', kod: 'motor_dislisiz' },
  durak: { sql: 'durakkapikilit.sql', tablo: 'durak-kapi-kilit', kod: 'durak_kapi_kilidi' },
  kabin: { sql: 'kabinkapikilit.sql', tablo: 'kabin-kapi-kilit', kod: 'kabin_kapi_kilidi' },
  ucm: { sql: 'ucmacop.sql', tablo: 'ucm-acop', kod: 'ucm_acop' },
};
const TUR = TURLER[process.argv[2]];
if (!TUR) { console.error('Kullanım: node import-aksam-sql.js <motor|durak|kabin|ucm> [--dry]'); process.exit(1); }
const SQL_YOLU = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', TUR.sql);
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/artidoksan2';

// Eski onay_kurum_id -> NoBo (sertifika numarası önekleri ve mevcut katalogdaki eşleşmelerden)
const KURUM_NOBO = { 2: '2195', 6: '0400', 7: '2528', 10: '0437', 11: '0036', 12: '1015', 13: '1282', 14: '0036', 28: '1128' };
// Eski veride id ile sertifika no bazen çelişiyor (ör. 2195-LD... sertifikası 2528 kurumunda): kesin önekler önceliklidir
const ONEK_NOBO = [[/^2195-?(LD|AS)/i, '2195'], [/^LDsq/i, '2528'], [/^SCMB\./i, '1128'], [/^LF\/KSA/i, '0437']];

// ---------- SQL ayrıştırma ----------
function sqlSatirlariniOku(metin) {
  const bas = metin.indexOf(`INSERT INTO \`${TUR.tablo}\``);
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

// "13.08.2021" -> Date (UTC öğlen); "-" / boş -> null
function tarih(s) {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(s ?? '').trim());
  return m ? new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12)) : null;
}

const sertNo = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr');
const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

async function indir(yol) {
  // Eski tabloda yol 100 karakterde kesilmiş olabilir (".p" / ".pd") — uzantı tamamlanır
  yol = yol.replace(/\.p$/i, '.pdf').replace(/\.pd$/i, '.pdf');
  const url = KAYNAK_URL + yol.split('/').map((p) => encodeURIComponent(p)).join('/');
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return null;
  if ((res.headers.get('content-type') ?? '').includes('text/html')) return null;
  return Buffer.from(await res.arrayBuffer());
}

// ---------- Aktarım ----------
const satirlar = sqlSatirlariniOku(fs.readFileSync(SQL_YOLU, 'utf8'));
console.log(`SQL'den okunan belge: ${satirlar.length}`);

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;
const col = db.collection('aksambelgeleri');
const tip = BILESEN_TIPLERI.find((t) => t.kod === TUR.kod);
if (!tip) throw new Error(`Bilinmeyen bileşen tipi: ${TUR.kod}`);

const kurumlar = await db.collection('onaylikurumlar').find({}, { projection: { nobo: 1, unvan: 1 } }).toArray();
const kurumByNobo = new Map(kurumlar.map((k) => [String(k.nobo).trim(), k]));

// Mükerrer denetimi: marka + sertifika no (genel "SELF DECLERATION" gibi metinler yüzünden tek başına cert no yetmez)
const anahtarOf = (marka, cert) => `${sertNo(marka)}|${sertNo(cert) === '-' ? '' : sertNo(cert)}`;
// Motor türünde dişlili/dişlisiz birlikte kontrol edilir
const kodDeseni = TUR.kod.startsWith('motor') ? /^motor/ : TUR.kod;
const mevcut = await col.find({ bilesenTipiKodu: kodDeseni }, { projection: { sertifikaNo: 1, marka: 1 } }).toArray();
const mevcutSertifikalar = new Set(mevcut.map((m) => anahtarOf(m.marka, m.sertifikaNo)));
const dosyadakiler = new Set();
console.log(`Katalogda kayıtlı belge: ${mevcut.length}`);

const rapor = { eklenen: [], atlanan: [], eksikDosya: [], bilinmeyenKurum: [] };

for (const r of satirlar) {
  const anahtar = anahtarOf(r.marka, r.cert_no);
  if (mevcutSertifikalar.has(anahtar)) { rapor.atlanan.push(`${r.marka} / ${r.cert_no} (katalogda zaten var)`); continue; }
  // Dosyada aynı marka+sertifikayla tekrar eden satır yalnız tipleri farklıysa ayrı belge olur
  const tipAnahtari = `${anahtar}|${[...new Set(String(r.tip ?? '').split(',').map((t) => t.trim().toLocaleLowerCase('tr')).filter(Boolean))].sort().join(',')}`;
  if (dosyadakiler.has(tipAnahtari)) { rapor.atlanan.push(`${r.marka} / ${r.cert_no} (dosyada tekrar)`); continue; }
  dosyadakiler.add(tipAnahtari);

  const nobo = ONEK_NOBO.find(([re]) => re.test(String(r.cert_no ?? '').trim()))?.[1] ?? KURUM_NOBO[r.onay_kurum_id];
  const kurum = nobo ? kurumByNobo.get(nobo) : null;
  if (!kurum) rapor.bilinmeyenKurum.push(`${r.marka} / ${r.cert_no} (onay_kurum_id=${r.onay_kurum_id})`);

  const bitis = tarih(r.cert_end_date);
  const tipler = [...new Set(String(r.tip ?? '').split(',').map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean))];
  const _id = new mongoose.Types.ObjectId();

  const belge = {
    _id,
    bilesenTipiKodu: tip.kod,
    bilesenTipiAdi: tip.ad,
    kategori: tip.kategori,
    tahrikTipi: tip.tahrikTipi,
    sertifikaNo: String(r.cert_no ?? '').trim(),
    gecerlilikBaslangic: tarih(r.cert_start_date),
    gecerlilikBitis: bitis,
    modulKodu: '',
    onayliKurumId: kurum?._id ?? null,
    onayliKurumNobo: kurum ? String(kurum.nobo) : '',
    onayliKurumUnvan: kurum?.unvan ?? '',
    marka: String(r.marka ?? '').trim(),
    tipler,
    belgeTipi: '',
    aciklama: '',
    durum: bitis && bitis < new Date() ? 'pasif' : 'aktif',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (r.cert_filepath) {
    const dosyaAdi = r.cert_filepath.split('/').pop().replace(/\.p$/i, '.pdf').replace(/\.pd$/i, '.pdf');
    const ext = dosyaAdi.split('.').pop().toLowerCase();
    const buffer = await indir(r.cert_filepath).catch(() => null);
    if (!buffer || !MIME[ext]) {
      rapor.eksikDosya.push(`${r.marka} / ${r.cert_no} (${r.cert_filepath})`);
    } else {
      const anahtar = DRY ? `DRY/${dosyaAdi}` : buildObjectKey(`aksam-belgesi-${_id}`, dosyaAdi);
      if (!DRY) await putObject(anahtar, buffer, MIME[ext]);
      belge.dosya = { dosyaAdi, dosyaAnahtari: anahtar, mimeType: MIME[ext], boyut: buffer.length, yuklenmeTarihi: new Date() };
    }
  }

  if (!DRY) await col.insertOne(belge);
  rapor.eklenen.push(`${belge.marka} / ${belge.sertifikaNo} | ${tipler.length} tip | ${belge.durum} | kurum ${belge.onayliKurumNobo || '-'} | ${belge.dosya ? 'dosya var' : 'DOSYA YOK'}`);
}

console.log(`\n===== ÖZET${DRY ? ' (DRY-RUN — yazılmadı)' : ''} =====`);
console.log(`Eklenen: ${rapor.eklenen.length}`);
for (const e of rapor.eklenen) console.log('  +', e);
console.log(`Atlanan (zaten var): ${rapor.atlanan.length}`);
for (const e of rapor.atlanan) console.log('  =', e);
console.log(`Bulunamayan dosya: ${rapor.eksikDosya.length}`, rapor.eksikDosya);
console.log(`Onaylı kurumu eşlenemeyen: ${rapor.bilinmeyenKurum.length}`, rapor.bilinmeyenKurum);
await mongoose.disconnect();
