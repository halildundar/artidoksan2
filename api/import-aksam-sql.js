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
  // Kapı paneli raporları: belge_tur sütunu satır başına bileşen tipini belirler (kod: null)
  panel: { sql: 'kapipanel.sql', tablo: 'kapi-panel', kod: null },
  // akilli: katalogda zaten bulunan sertifika / marka+tip kombinasyonları atlanır, marka yazımı katalogdakine uydurulur
  tampon: { sql: 'tampon.sql', tablo: 'tampon', kod: 'tampon', akilli: true },
  fren: { sql: 'fren.sql', tablo: 'fren', kod: 'fren', akilli: true },
  kart: { sql: 'kart.sql', tablo: 'kontrol-kart', kod: 'kontrol_karti', akilli: true },
};
const BELGE_TUR_KODU = { PENDULUM: 'sarkac_test_raporu', 'FIRE RESISTANCE': 'yangin_sizdirmazlik_raporu' };
const TUR = TURLER[process.argv[2]];
if (!TUR) { console.error('Kullanım: node import-aksam-sql.js <motor|durak|kabin|ucm|panel|tampon|fren|kart> [--dry]'); process.exit(1); }
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
const tipBul = (kod) => {
  const t = BILESEN_TIPLERI.find((x) => x.kod === kod);
  if (!t) throw new Error(`Bilinmeyen bileşen tipi: ${kod}`);
  return t;
};
if (TUR.kod) tipBul(TUR.kod);

const kurumlar = await db.collection('onaylikurumlar').find({}, { projection: { nobo: 1, unvan: 1 } }).toArray();
const kurumByNobo = new Map(kurumlar.map((k) => [String(k.nobo).trim(), k]));

// Mükerrer denetimi: marka + sertifika no (genel "SELF DECLERATION" gibi metinler yüzünden tek başına cert no yetmez)
const anahtarOf = (marka, cert, kod = '') => `${kod}|${sertNo(marka)}|${sertNo(cert) === '-' ? '' : sertNo(cert)}`;
// Motor türünde dişlili/dişlisiz birlikte kontrol edilir
const kodDeseni = !TUR.kod ? { $in: Object.values(BELGE_TUR_KODU) } : TUR.kod.startsWith('motor') ? /^motor/ : TUR.kod;
const mevcut = await col.find({ bilesenTipiKodu: kodDeseni }, { projection: { sertifikaNo: 1, marka: 1, bilesenTipiKodu: 1, tipler: 1 } }).toArray();
const mevcutSertifikalar = new Set(mevcut.map((m) => anahtarOf(m.marka, m.sertifikaNo, TUR.kod ? '' : m.bilesenTipiKodu)));
const dosyadakiler = new Set();
// Akıllı karşılaştırma yardımcıları (büyük/küçük harf, boşluk ve noktalama farkı yok sayılır)
const norm = (s) => String(s ?? '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/[^a-z0-9]/g, '');
const tipKumesi = (arr) => [...new Set(arr.map(norm).filter(Boolean))].sort().join('|');
const markaYazimi = new Map();
if (TUR.akilli) {
  for (const m of await col.find({}, { projection: { marka: 1 } }).toArray()) if (m.marka && !markaYazimi.has(norm(m.marka))) markaYazimi.set(norm(m.marka), m.marka);
}
console.log(`Katalogda kayıtlı belge: ${mevcut.length}`);

const rapor = { eklenen: [], atlanan: [], eksikDosya: [], bilinmeyenKurum: [] };

for (const r of satirlar) {
  const tip = tipBul(TUR.kod ?? BELGE_TUR_KODU[String(r.belge_tur ?? '').trim().toUpperCase()]);
  const anahtar = anahtarOf(r.marka, r.cert_no, TUR.kod ? '' : tip.kod);
  if (TUR.akilli) {
    const certN = norm(r.cert_no);
    const tipListe = String(r.tip ?? '').split(',').map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const ayniSertifika = certN ? mevcut.find((m) => norm(m.sertifikaNo) === certN) : null;
    if (ayniSertifika) {
      // İNTERLİFT FC 81 belgesinde eksik "FOCUS" tipi katalog belgesine eklenir
      const eksik = tipListe.filter((t) => !ayniSertifika.tipler?.some((x) => norm(x) === norm(t)));
      if (norm(r.marka) === 'interlift' && eksik.map(norm).join() === 'focus') {
        if (!DRY) await col.updateOne({ _id: ayniSertifika._id }, { $push: { tipler: 'FOCUS' }, $set: { updatedAt: new Date() } });
        rapor.atlanan.push(`${r.marka} / ${r.cert_no} (katalogda var; eksik "FOCUS" tipi mevcut belgeye eklendi)`);
      } else rapor.atlanan.push(`${r.marka} / ${r.cert_no} (sertifika katalogda zaten var)`);
      continue;
    }
    // Aynı marka + (aynı tip kümesi VEYA sertifika no'su revizyon eki farkıyla başlıyor: "...-15" / "...-15REV2")
    const ayniMarkaTip = mevcut.find((m) => norm(m.marka) === norm(r.marka) && (tipKumesi(m.tipler ?? []) === tipKumesi(tipListe)
      || (norm(m.sertifikaNo).length > 8 && (certN.startsWith(norm(m.sertifikaNo)) || norm(m.sertifikaNo).startsWith(certN)))));
    if (ayniMarkaTip) { rapor.atlanan.push(`${r.marka} / ${r.cert_no} (katalogda aynı marka+tip var, sertifika: ${ayniMarkaTip.sertifikaNo})`); continue; }
  }
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
    marka: markaYazimi.get(norm(r.marka)) ?? String(r.marka ?? '').trim(),
    tipler,
    belgeTipi: '',
    aciklama: r.class && r.class.trim() !== '-' ? `Sınıf: ${r.class.trim()}`
      : [r.hiz?.trim() && `Hız: ${r.hiz.trim()}`, r.kapasite?.trim() && `Kapasite: ${r.kapasite.trim()}`].filter(Boolean).join(', '),
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
