import crypto from 'node:crypto';
import { promisify } from 'node:util';
import express from 'express';
import mongoose from 'mongoose';
import { Kullanici, oturumlariSifirla } from './kullanicilar.js';
import { epostaGonder, konsolModu, sonKonsolEpostalari } from './eposta.js';
import {
  hesapDogrulamaSablonu, girisKoduSablonu, sifreSifirlamaSablonu, sifreDegistirmeSablonu, sifreDegistiBildirimiSablonu, YapilandirmaHatasi,
} from './epostaSablonlari.js';

// Giriş ve oturum sistemi: e-posta + şifre; yeni cihazda / ilk girişte e-posta doğrulama kodu.
// Erişim jetonu kısa ömürlü (JWT, HS256); yenileme jetonu opak ve sunucuda hash'li saklanır.
// Varsayılan olarak tüm API uçları giriş ister; AUTH_ZORUNLU=0 iken açık kalır (girisGerekli yalnız jeton varsa kullanıcıyı ekler).

const scrypt = promisify(crypto.scrypt);

// Varsayılan: giriş zorunlu. Yalnız AUTH_ZORUNLU=0 ile (geliştirme/acil durum) kapatılır.
const AUTH_ZORUNLU = process.env.AUTH_ZORUNLU !== '0';
const ERISIM_OMRU_SN = Number(process.env.ERISIM_OMRU_SN) || 15 * 60;
const VARSAYILAN_OTURUM_DK = Number(process.env.OTURUM_VARSAYILAN_DK) || 1440;
const CIHAZ_GUVENILIR_GUN = Number(process.env.CIHAZ_GUVENILIR_GUN) || 30;
const KOD_SURESI_DK = 10;
const DAVET_SURESI_SAAT = 24;
const SIFIRLAMA_SURESI_DK = 30;

// JWT imza anahtarı: JWT_SECRET tanımlıysa o; değilse veritabanı bağlantı bilgisinden (gizli) türetilen sabit bir değer.
// Üretimde ayrıca JWT_SECRET tanımlamak daha iyidir (değişince tüm oturumlar düşer).
const JWT_SIRRI = process.env.JWT_SECRET
  || crypto.createHash('sha256').update(`artidoksan-jwt:${process.env.MONGODB_URI ?? 'yerel'}`).digest('hex');

// ---------- Modeller ----------
const oturumSchema = new mongoose.Schema(
  {
    kullaniciId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    cihazId: { type: String, default: '' },
    refreshHash: { type: String, required: true, index: true },
    mutlakBitis: { type: Date, required: true },
    iptal: { type: Boolean, default: false },
    sonKullanim: { type: Date, default: Date.now },
    ua: { type: String, default: '' },
  },
  { timestamps: true, collection: 'oturumlar' }
);
const cihazSchema = new mongoose.Schema(
  {
    kullaniciId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    cihazId: { type: String, required: true },
    ad: { type: String, default: '' },
    guvenilirBitis: { type: Date, required: true },
    iptal: { type: Boolean, default: false },
    sonKullanim: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'cihazlar' }
);
const dogrulamaKoduSchema = new mongoose.Schema(
  {
    kullaniciId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amac: { type: String, enum: ['hesap-dogrula', 'giris', 'parola-sifirla', 'parola-degistir'], required: true },
    kodHash: { type: String, required: true },
    tokenHash: { type: String, default: '' },
    bitis: { type: Date, required: true },
    deneme: { type: Number, default: 0 },
    gonderimler: { type: [Date], default: [] },
    veri: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true, collection: 'dogrulamakodlari' }
);
dogrulamaKoduSchema.index({ kullaniciId: 1, amac: 1 }, { unique: true });
dogrulamaKoduSchema.index({ tokenHash: 1 });

const Oturum = mongoose.models.Oturum || mongoose.model('Oturum', oturumSchema);
const Cihaz = mongoose.models.Cihaz || mongoose.model('Cihaz', cihazSchema);
const DogrulamaKodu = mongoose.models.DogrulamaKodu || mongoose.model('DogrulamaKodu', dogrulamaKoduSchema);

// ---------- Yardımcılar ----------
const sha256 = (x) => crypto.createHash('sha256').update(String(x)).digest('hex');
const b64u = (buf) => Buffer.from(buf).toString('base64url');

function jwtImzala(payload) {
  const govde = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify(payload));
  return govde + '.' + crypto.createHmac('sha256', JWT_SIRRI).update(govde).digest('base64url');
}

function jwtCoz(token) {
  const p = String(token ?? '').split('.');
  if (p.length !== 3) return null;
  const beklenen = crypto.createHmac('sha256', JWT_SIRRI).update(`${p[0]}.${p[1]}`).digest();
  const gelen = Buffer.from(p[2], 'base64url');
  if (gelen.length !== beklenen.length || !crypto.timingSafeEqual(gelen, beklenen)) return null;
  try {
    const payload = JSON.parse(Buffer.from(p[1], 'base64url').toString('utf8'));
    return payload.exp && payload.exp * 1000 > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export async function parolaHashle(parola) {
  const tuz = crypto.randomBytes(16);
  const h = await scrypt(parola, tuz, 64);
  return `s1$${tuz.toString('base64')}$${h.toString('base64')}`;
}

async function parolaKontrol(parola, saklanan) {
  const [s, tuz, hash] = String(saklanan ?? '').split('$');
  if (s !== 's1' || !tuz || !hash) return false;
  const h = await scrypt(parola, Buffer.from(tuz, 'base64'), 64);
  const bekle = Buffer.from(hash, 'base64');
  return h.length === bekle.length && crypto.timingSafeEqual(h, bekle);
}

const parolaGecerli = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 128;
const kodUret = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
const maskele = (e) => String(e).replace(/^(.).*(@.*)$/, (_, a, b) => `${a}***${b}`);

const genel = (k) => ({ _id: k._id, ad: k.ad, soyad: k.soyad, rol: k.rol, email: k.email ?? '' });

class HataKodu extends Error {
  constructor(durum, mesaj, ek = {}) { super(mesaj); this.durum = durum; this.ek = ek; }
}

// Basit bellek içi hız sınırı (anahtar başına pencere içinde en çok n istek)
const sayaclar = new Map();
function hizSiniri(anahtar, n, pencereMs) {
  const simdi = Date.now();
  const liste = (sayaclar.get(anahtar) ?? []).filter((t) => simdi - t < pencereMs);
  if (liste.length >= n) throw new HataKodu(429, 'Çok fazla deneme. Lütfen biraz bekleyip tekrar deneyin.');
  liste.push(simdi);
  sayaclar.set(anahtar, liste);
}

// Kod/bağlantı üretir ve e-posta ile gönderir (yeniden gönderme sınırlarıyla)
async function kodGonder(kullanici, amac, { sureMs, veri } = {}) {
  const simdi = Date.now();
  const onceki = await DogrulamaKodu.findOne({ kullaniciId: kullanici._id, amac });
  const gonderimler = (onceki?.gonderimler ?? []).map((d) => d.getTime()).filter((t) => simdi - t < 3600_000);
  if (gonderimler.some((t) => simdi - t < 60_000)) throw new HataKodu(429, 'Kod az önce gönderildi. 60 saniye sonra tekrar isteyin.');
  if (gonderimler.filter((t) => simdi - t < 600_000).length >= 3) throw new HataKodu(429, 'Çok fazla kod istendi. 10 dakika sonra tekrar deneyin.');
  if (gonderimler.length >= 5) throw new HataKodu(429, 'Saatlik kod sınırına ulaşıldı. Daha sonra tekrar deneyin.');

  const kod = kodUret();
  const token = crypto.randomBytes(32).toString('hex');
  const sure = sureMs ?? KOD_SURESI_DK * 60_000;
  await DogrulamaKodu.findOneAndUpdate(
    { kullaniciId: kullanici._id, amac },
    { $set: { kodHash: sha256(kod), tokenHash: sha256(token), bitis: new Date(simdi + sure), deneme: 0, gonderimler: [...gonderimler, simdi].map((t) => new Date(t)), veri } },
    { upsert: true }
  );
  const sablon = amac === 'hesap-dogrula' ? hesapDogrulamaSablonu(kullanici, kod, token)
    : amac === 'parola-sifirla' ? sifreSifirlamaSablonu(kullanici, kod, token)
    : amac === 'parola-degistir' ? sifreDegistirmeSablonu(kullanici, kod)
    : girisKoduSablonu(kullanici, kod);
  await epostaGonder({ alici: kullanici.email, ...sablon });
}

// Kod veya bağlantı jetonunu doğrular; başarılıysa kaydı tüketir ve (varsa) ek veriyi döndürür
async function kodDogrula(kullaniciId, amac, { kod, token }) {
  const kayit = await DogrulamaKodu.findOne({ kullaniciId, amac });
  if (!kayit || kayit.bitis.getTime() < Date.now()) throw new HataKodu(400, 'Kod süresi dolmuş veya geçersiz. Yeni kod isteyin.');
  if (kayit.deneme >= 5) throw new HataKodu(429, 'Çok fazla hatalı deneme. Yeni kod isteyin.');
  const dogru = token ? sha256(token) === kayit.tokenHash : sha256(String(kod ?? '').trim()) === kayit.kodHash;
  if (!dogru) {
    await DogrulamaKodu.updateOne({ _id: kayit._id }, { $inc: { deneme: 1 } });
    throw new HataKodu(400, 'Kod hatalı.');
  }
  await DogrulamaKodu.deleteOne({ _id: kayit._id });
  return kayit.veri;
}

async function oturumOlustur(kullanici, cihazId, ua) {
  const sureDk = kullanici.oturumSuresiDk || VARSAYILAN_OTURUM_DK;
  const yenileme = crypto.randomBytes(48).toString('base64url');
  const mutlakBitis = new Date(Date.now() + sureDk * 60_000);
  const oturum = await Oturum.create({ kullaniciId: kullanici._id, cihazId, refreshHash: sha256(yenileme), mutlakBitis, ua: String(ua ?? '').slice(0, 200) });
  await Kullanici.updateOne({ _id: kullanici._id }, { $set: { sonGiris: new Date() } });
  return { erisimJetonu: erisimJetonu(kullanici, oturum), yenilemeJetonu: yenileme, oturumBitis: mutlakBitis, kullanici: genel(kullanici) };
}

function erisimJetonu(kullanici, oturum) {
  return jwtImzala({ sub: String(kullanici._id), rol: kullanici.rol, oid: String(oturum._id), exp: Math.floor(Date.now() / 1000) + ERISIM_OMRU_SN });
}

async function cihazGuvenilirYap(kullaniciId, cihazId, ad) {
  if (!cihazId) return;
  await Cihaz.findOneAndUpdate(
    { kullaniciId, cihazId },
    { $set: { ad: String(ad ?? '').slice(0, 120), guvenilirBitis: new Date(Date.now() + CIHAZ_GUVENILIR_GUN * 86400_000), iptal: false, sonKullanim: new Date() } },
    { upsert: true }
  );
}

// ---------- Ara katman ----------
// Oturum neden geçersiz? İstemci buna göre giriş ekranında açıklama gösterir:
// sure-doldu (mutlak süre bitti) | kapatildi (yönetici çıkışa zorladı / şifre değişti) | pasif | oturum (jeton eksik/süresi dolmuş: yenilenebilir)
function oturumNedeni(kullanici, oturum) {
  if (kullanici && kullanici.aktif === false) return 'pasif';
  if (!kullanici || !oturum) return 'oturum';
  if (oturum.iptal) return 'kapatildi';
  if (oturum.mutlakBitis.getTime() < Date.now()) return 'sure-doldu';
  if (!kullanici.emailDogrulandi) return 'kapatildi';
  return null;
}

const NEDEN_MESAJI = {
  'sure-doldu': 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
  kapatildi: 'Oturumunuz kapatıldı. Lütfen tekrar giriş yapın.',
  pasif: 'Hesabınız pasif. Yöneticinizle iletişime geçin.',
  oturum: 'Oturum geçersiz veya süresi dolmuş',
};

async function jetondenKullanici(req) {
  const m = /^Bearer (.+)$/i.exec(req.headers.authorization ?? '');
  const payload = m ? jwtCoz(m[1]) : null;
  if (!payload) return { hata: 'oturum' };
  const [kullanici, oturum] = await Promise.all([Kullanici.findById(payload.sub), Oturum.findById(payload.oid).lean()]);
  const hata = oturumNedeni(kullanici, oturum);
  return hata ? { hata } : { kullanici, oturum };
}

// Giriş gerektirir (AUTH_ZORUNLU kapalı değilken); roller verilirse yalnız o roller. Zorunlu değilken jeton varsa kullanıcı eklenir.
export function girisGerekli(...roller) {
  return async (req, res, next) => {
    try {
      const k = await jetondenKullanici(req);
      if (k.kullanici) { req.kullanici = k.kullanici; req.oturum = k.oturum; }
      if (!AUTH_ZORUNLU) return next();
      if (!k.kullanici) return res.status(401).json({ message: NEDEN_MESAJI[k.hata], kod: k.hata });
      if (roller.length && !roller.includes(k.kullanici.rol)) return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
}

const sar = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof HataKodu) return res.status(err.durum).json({ message: err.message, ...err.ek });
    if (err instanceof YapilandirmaHatasi) return res.status(500).json({ message: err.message });
    console.error('[auth]', err);
    res.status(500).json({ message: 'Beklenmeyen bir hata oluştu' });
  }
};

const eposta = (v) => String(v ?? '').trim().toLowerCase();
const ip = (req) => req.ip || req.socket?.remoteAddress || '';

const router = express.Router();

// ---------- Giriş ----------
router.post('/giris', sar(async (req, res) => {
  const email = eposta(req.body?.email);
  const { parola, cihazId, cihazAd } = req.body ?? {};
  hizSiniri(`giris:${ip(req)}`, 30, 15 * 60_000);
  hizSiniri(`giris:${email}`, 10, 15 * 60_000);
  const k = email ? await Kullanici.findOne({ email }).select('+parolaHash +denemeSayaci +kilitBitis +dogrulamaAtla') : null;
  const genelHata = new HataKodu(401, 'E-posta veya şifre hatalı');
  if (!k) throw genelHata;
  if (k.kilitBitis && k.kilitBitis.getTime() > Date.now()) throw new HataKodu(429, 'Çok fazla hatalı deneme. Hesap kısa süreliğine kilitlendi, daha sonra tekrar deneyin.');
  if (!k.emailDogrulandi || !k.parolaHash) throw new HataKodu(403, 'E-posta adresiniz henüz doğrulanmadı. Yöneticinizin gönderdiği doğrulama e-postasını kullanın.', { kod: 'dogrulanmadi' });
  if (!(await parolaKontrol(String(parola ?? ''), k.parolaHash))) {
    const sayac = (k.denemeSayaci ?? 0) + 1;
    await Kullanici.updateOne({ _id: k._id }, sayac >= 5 ? { $set: { denemeSayaci: 0, kilitBitis: new Date(Date.now() + 15 * 60_000) } } : { $set: { denemeSayaci: sayac } });
    throw genelHata;
  }
  await Kullanici.updateOne({ _id: k._id }, { $set: { denemeSayaci: 0, kilitBitis: null } });
  if (k.aktif === false) throw new HataKodu(403, 'Hesabınız pasif. Yöneticinizle iletişime geçin.', { kod: 'pasif' });

  const guvenilir = k.dogrulamaAtla || (cihazId && await Cihaz.exists({ kullaniciId: k._id, cihazId, iptal: false, guvenilirBitis: { $gt: new Date() } }));
  if (guvenilir) {
    if (cihazId) await Cihaz.updateOne({ kullaniciId: k._id, cihazId }, { $set: { sonKullanim: new Date() } });
    return res.json(await oturumOlustur(k, cihazId, req.headers['user-agent']));
  }
  await kodGonder(k, 'giris');
  res.json({ kodGerekli: true, eposta: maskele(k.email) });
}));

router.post('/kod-dogrula', sar(async (req, res) => {
  const email = eposta(req.body?.email);
  const { kod, cihazId, cihazAd } = req.body ?? {};
  hizSiniri(`kod:${ip(req)}`, 30, 15 * 60_000);
  const k = await Kullanici.findOne({ email });
  if (!k) throw new HataKodu(400, 'Kod hatalı.');
  await kodDogrula(k._id, 'giris', { kod });
  if (k.aktif === false || !k.emailDogrulandi) throw new HataKodu(403, 'Hesabınız pasif. Yöneticinizle iletişime geçin.', { kod: 'pasif' });
  await cihazGuvenilirYap(k._id, cihazId, cihazAd);
  res.json(await oturumOlustur(k, cihazId, req.headers['user-agent']));
}));

// Kodu yeniden gönder (giriş kodu yalnız parola doğrulanmış, bekleyen bir kod varsa)
router.post('/kod-tekrar', sar(async (req, res) => {
  const email = eposta(req.body?.email);
  const amac = req.body?.amac;
  hizSiniri(`tekrar:${ip(req)}`, 20, 15 * 60_000);
  if (!['giris', 'parola-sifirla', 'hesap-dogrula'].includes(amac)) throw new HataKodu(400, 'Geçersiz istek');
  const k = await Kullanici.findOne({ email });
  if (k && k.aktif !== false) {
    if (amac === 'giris') {
      if (await DogrulamaKodu.exists({ kullaniciId: k._id, amac: 'giris' })) await kodGonder(k, 'giris');
    } else if (amac === 'parola-sifirla') {
      if (k.emailDogrulandi) await kodGonder(k, 'parola-sifirla', { sureMs: SIFIRLAMA_SURESI_DK * 60_000 });
    } else if (await DogrulamaKodu.exists({ kullaniciId: k._id, amac: 'hesap-dogrula' })) {
      await kodGonder(k, 'hesap-dogrula', { sureMs: DAVET_SURESI_SAAT * 3600_000 });
    }
  }
  res.json({ ok: true });
}));

router.post('/yenile', sar(async (req, res) => {
  const { yenilemeJetonu } = req.body ?? {};
  if (!yenilemeJetonu) throw new HataKodu(401, NEDEN_MESAJI.oturum, { kod: 'oturum' });
  const oturum = await Oturum.findOne({ refreshHash: sha256(yenilemeJetonu) });
  const k = oturum ? await Kullanici.findById(oturum.kullaniciId) : null;
  const neden = oturumNedeni(k, oturum);
  if (neden) throw new HataKodu(401, NEDEN_MESAJI[neden], { kod: neden });
  await Oturum.updateOne({ _id: oturum._id }, { $set: { sonKullanim: new Date() } });
  res.json({ erisimJetonu: erisimJetonu(k, oturum), oturumBitis: oturum.mutlakBitis, kullanici: genel(k) });
}));

router.get('/ben', girisGerekli(), sar(async (req, res) => {
  if (!req.kullanici) throw new HataKodu(401, NEDEN_MESAJI.oturum, { kod: 'oturum' });
  res.json({ kullanici: genel(req.kullanici), oturumBitis: req.oturum.mutlakBitis });
}));

router.post('/cikis', girisGerekli(), sar(async (req, res) => {
  if (req.kullanici) {
    if (req.body?.tum) await Oturum.updateMany({ kullaniciId: req.kullanici._id }, { $set: { iptal: true } });
    else await Oturum.updateOne({ _id: req.oturum._id }, { $set: { iptal: true } });
  }
  res.json({ ok: true });
}));

// ---------- Hesap doğrulama (yönetici davetinden) ve şifre belirleme ----------
async function kullaniciBul({ token, email }, amac) {
  if (token) {
    const kayit = await DogrulamaKodu.findOne({ amac, tokenHash: sha256(token) });
    return kayit ? await Kullanici.findById(kayit.kullaniciId) : null;
  }
  return Kullanici.findOne({ email: eposta(email) });
}

router.post('/dogrula', sar(async (req, res) => {
  const { token, kod, yeniParola } = req.body ?? {};
  hizSiniri(`dogrula:${ip(req)}`, 20, 15 * 60_000);
  if (!parolaGecerli(yeniParola)) throw new HataKodu(400, 'Şifre en az 8 karakter olmalıdır.');
  const k = await kullaniciBul({ token, email: req.body?.email }, 'hesap-dogrula');
  if (!k) throw new HataKodu(400, 'Bağlantı veya kod geçersiz.');
  await kodDogrula(k._id, 'hesap-dogrula', token ? { token } : { kod });
  await Kullanici.updateOne({ _id: k._id }, { $set: { emailDogrulandi: true, parolaHash: await parolaHashle(yeniParola), parolaAyarli: true, denemeSayaci: 0, kilitBitis: null } });
  res.json({ ok: true, eposta: k.email });
}));

router.post('/parola-sifirla-iste', sar(async (req, res) => {
  const email = eposta(req.body?.email);
  hizSiniri(`sifirla:${ip(req)}`, 10, 15 * 60_000);
  const k = email ? await Kullanici.findOne({ email }) : null;
  // E-postanın kayıtlı olup olmadığı sızdırılmaz
  if (k && k.aktif !== false && k.emailDogrulandi) {
    await kodGonder(k, 'parola-sifirla', { sureMs: SIFIRLAMA_SURESI_DK * 60_000 }).catch((e) => console.warn('[auth] sıfırlama e-postası:', e.message));
  }
  res.json({ ok: true });
}));

router.post('/parola-sifirla', sar(async (req, res) => {
  const { token, kod, yeniParola } = req.body ?? {};
  hizSiniri(`sifirlaok:${ip(req)}`, 20, 15 * 60_000);
  if (!parolaGecerli(yeniParola)) throw new HataKodu(400, 'Şifre en az 8 karakter olmalıdır.');
  const k = await kullaniciBul({ token, email: req.body?.email }, 'parola-sifirla');
  if (!k || k.aktif === false) throw new HataKodu(400, 'Bağlantı veya kod geçersiz.');
  await kodDogrula(k._id, 'parola-sifirla', token ? { token } : { kod });
  await Kullanici.updateOne({ _id: k._id }, { $set: { parolaHash: await parolaHashle(yeniParola), parolaAyarli: true, denemeSayaci: 0, kilitBitis: null } });
  await oturumlariSifirla(k._id);
  epostaGonder({ alici: k.email, ...sifreDegistiBildirimiSablonu(k) }).catch(() => {});
  res.json({ ok: true });
}));

// ---------- Şifre değiştirme (giriş yapmış kullanıcı): mevcut şifre + yeni şifre → e-posta kodu ----------
router.post('/parola-degistir-iste', girisGerekli(), sar(async (req, res) => {
  if (!req.kullanici) throw new HataKodu(401, 'Oturum geçersiz', { kod: 'oturum' });
  const { mevcutParola, yeniParola } = req.body ?? {};
  if (!parolaGecerli(yeniParola)) throw new HataKodu(400, 'Yeni şifre en az 8 karakter olmalıdır.');
  hizSiniri(`pdeg:${req.kullanici._id}`, 10, 15 * 60_000);
  const k = await Kullanici.findById(req.kullanici._id).select('+parolaHash');
  if (!(await parolaKontrol(String(mevcutParola ?? ''), k.parolaHash))) throw new HataKodu(400, 'Mevcut şifre hatalı.');
  await kodGonder(k, 'parola-degistir', { veri: { yeniHash: await parolaHashle(yeniParola) } });
  res.json({ ok: true, eposta: maskele(k.email) });
}));

router.post('/parola-degistir-onayla', girisGerekli(), sar(async (req, res) => {
  if (!req.kullanici) throw new HataKodu(401, 'Oturum geçersiz', { kod: 'oturum' });
  const veri = await kodDogrula(req.kullanici._id, 'parola-degistir', { kod: req.body?.kod });
  if (!veri?.yeniHash) throw new HataKodu(400, 'İstek geçersiz. Yeniden başlatın.');
  await Kullanici.updateOne({ _id: req.kullanici._id }, { $set: { parolaHash: veri.yeniHash, parolaAyarli: true } });
  // Diğer cihazların oturumları kapanır; bu cihaz sürer
  await Oturum.updateMany({ kullaniciId: req.kullanici._id, _id: { $ne: req.oturum._id } }, { $set: { iptal: true } });
  epostaGonder({ alici: req.kullanici.email, ...sifreDegistiBildirimiSablonu(req.kullanici) }).catch(() => {});
  res.json({ ok: true });
}));

// ---------- Yönetici işlemleri (Ayarlar > Kullanıcılar) ----------
// E-posta doğrulaması gönder: oturumlar ve güvenilir cihazlar sıfırlanır, yeni adrese doğrulama e-postası gider
router.post('/kullanici/:id/dogrulama-gonder', girisGerekli('admin'), sar(async (req, res) => {
  const k = await Kullanici.findById(req.params.id);
  if (!k) throw new HataKodu(404, 'Kullanıcı bulunamadı');
  if (!k.email) throw new HataKodu(400, 'Önce kullanıcıya bir e-posta adresi girin.');
  await Kullanici.updateOne({ _id: k._id }, { $set: { emailDogrulandi: false } });
  await oturumlariSifirla(k._id);
  await DogrulamaKodu.deleteMany({ kullaniciId: k._id });
  await kodGonder(k, 'hesap-dogrula', { sureMs: DAVET_SURESI_SAAT * 3600_000 });
  res.json({ ok: true, eposta: k.email });
}));

router.post('/kullanici/:id/cikisa-zorla', girisGerekli('admin'), sar(async (req, res) => {
  if (!(await Kullanici.exists({ _id: req.params.id }))) throw new HataKodu(404, 'Kullanıcı bulunamadı');
  await oturumlariSifirla(req.params.id);
  res.json({ ok: true });
}));

router.get('/kullanici/:id/cihazlar', girisGerekli('admin'), sar(async (req, res) => {
  const [cihazlar, oturumSayisi] = await Promise.all([
    Cihaz.find({ kullaniciId: req.params.id, iptal: false, guvenilirBitis: { $gt: new Date() } }).sort({ sonKullanim: -1 }).lean(),
    Oturum.countDocuments({ kullaniciId: req.params.id, iptal: false, mutlakBitis: { $gt: new Date() } }),
  ]);
  res.json({ cihazlar, oturumSayisi });
}));

// Geliştirme kolaylığı: konsol modunda son e-postalar (kodu ekrandan okumak için). Üretimde (konsol dışı) kapalı.
router.get('/dev/son-epostalar', (_req, res) => {
  if (!konsolModu()) return res.status(404).json({ message: 'Bulunamadı' });
  res.json(sonKonsolEpostalari.map((e) => ({ alici: e.alici, konu: e.konu, metin: e.metin, zaman: e.zaman })));
});

export default router;
