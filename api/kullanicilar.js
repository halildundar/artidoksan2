import express from 'express';
import mongoose from 'mongoose';

// Kullanıcılar (Ayarlar > Kullanıcılar): ad, soyad, rol (Admin / Denetçi / Danışman), e-posta, aktif/pasif.
// Giriş, doğrulama ve oturum işleri api/auth.js'tedir. İzinler (rol bazlı erişim) sonraki aşamada tasarlanacak.
export const ROLLER = ['admin', 'denetci', 'danisman'];
export const OTURUM_SURELERI_DK = [30, 60, 180, 360, 1440];

const kullaniciSchema = new mongoose.Schema(
  {
    ad: { type: String, required: true, trim: true },
    soyad: { type: String, trim: true, default: '' },
    rol: { type: String, enum: ROLLER, required: true },
    // Denetçi/danışman kaydından eklendiyse kaynağı (tekrar eklemeyi önlemek için)
    kaynakId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Giriş kimliği: küçük harf, tekil
    email: { type: String, trim: true, lowercase: true, default: undefined },
    emailDogrulandi: { type: Boolean, default: false },
    parolaHash: { type: String, select: false, default: undefined },
    parolaAyarli: { type: Boolean, default: false },
    // Pasif kullanıcı giriş yapamaz
    aktif: { type: Boolean, default: true },
    // Oturum süresi (dk): 30 / 60 / 180 / 360 / 1440; boş = genel varsayılan
    oturumSuresiDk: { type: Number, default: null },
    // Admin "çıkışa zorla" / pasife alma / e-posta değişimi ile artar → eski erişim jetonları geçersiz olur
    oturumSurumu: { type: Number, default: 0 },
    // Yalnız elle atanır (seed): yeni cihaz e-posta kodu istenmez (ilk yönetici hesabı için)
    dogrulamaAtla: { type: Boolean, default: false, select: false },
    sonGiris: { type: Date, default: null },
    denemeSayaci: { type: Number, default: 0, select: false },
    kilitBitis: { type: Date, default: null, select: false },
    // Gelecekteki izin alanları için ayrılmış yer
    izinler: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true, collection: 'kullanicilar' }
);
kullaniciSchema.index({ email: 1 }, { unique: true, sparse: true });

export const Kullanici = mongoose.models.Kullanici || mongoose.model('Kullanici', kullaniciSchema);

const router = express.Router();

const EPOSTA_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// "Ad Soyad" → ad (son kelime hariç) ve soyad (son kelime)
export function adSoyadAyir(adSoyad) {
  const p = String(adSoyad ?? '').trim().split(/\s+/).filter(Boolean);
  if (p.length <= 1) return { ad: p[0] ?? '', soyad: '' };
  return { ad: p.slice(0, -1).join(' '), soyad: p[p.length - 1] };
}

// Kullanıcının tüm oturumlarını ve güvenilir cihazlarını kapatır; eski erişim jetonları da düşsün diye sürümü artırır
export async function oturumlariSifirla(kullaniciId) {
  await Kullanici.updateOne({ _id: kullaniciId }, { $inc: { oturumSurumu: 1 } });
  const Oturum = mongoose.models.Oturum;
  const Cihaz = mongoose.models.Cihaz;
  if (Oturum) await Oturum.updateMany({ kullaniciId, iptal: false }, { $set: { iptal: true } });
  if (Cihaz) await Cihaz.updateMany({ kullaniciId, iptal: false }, { $set: { iptal: true } });
}

function temizle(body) {
  const { ad, soyad, rol, email, aktif, oturumSuresiDk } = body ?? {};
  const v = { ad: String(ad ?? '').trim(), soyad: String(soyad ?? '').trim(), rol };
  if (email !== undefined) v.email = String(email ?? '').trim().toLowerCase();
  if (aktif !== undefined) v.aktif = !!aktif;
  if (oturumSuresiDk !== undefined) v.oturumSuresiDk = oturumSuresiDk ? Number(oturumSuresiDk) : null;
  return v;
}

function dogrula(v) {
  if (!v.ad) return 'İsim zorunludur';
  if (!ROLLER.includes(v.rol)) return 'Geçersiz rol';
  if (v.email && !EPOSTA_RE.test(v.email)) return 'Geçerli bir e-posta adresi girin';
  if (v.oturumSuresiDk != null && !OTURUM_SURELERI_DK.includes(v.oturumSuresiDk)) return 'Geçersiz oturum süresi';
  return null;
}

router.get('/', async (_req, res) => {
  try {
    const liste = await Kullanici.find().lean();
    liste.sort((a, b) => `${a.ad} ${a.soyad}`.localeCompare(`${b.ad} ${b.soyad}`, 'tr'));
    res.json(liste);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const kayit = await Kullanici.findById(req.params.id);
    if (!kayit) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    res.json(kayit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const veri = temizle(req.body);
    const hata = dogrula(veri);
    if (hata) return res.status(400).json({ message: hata });
    if (!veri.email) delete veri.email;
    else if (await Kullanici.exists({ email: veri.email })) return res.status(409).json({ message: 'Bu e-posta başka bir kullanıcıda kayıtlı' });
    // Denetçi/Danışman rolü mevcut kayıttan seçilir: ad soyad kaynaktan gelir, aynı kayıt iki kez eklenemez
    if (['denetci', 'danisman'].includes(veri.rol) && req.body?.kaynakId) {
      if (!mongoose.isValidObjectId(req.body.kaynakId)) return res.status(400).json({ message: 'Geçersiz kayıt' });
      const model = mongoose.models[veri.rol === 'denetci' ? 'Denetci' : 'Danisman'];
      const kaynak = model ? await model.findById(req.body.kaynakId).lean() : null;
      if (!kaynak) return res.status(400).json({ message: 'Seçilen kayıt bulunamadı' });
      if (await Kullanici.exists({ kaynakId: kaynak._id, rol: veri.rol })) return res.status(409).json({ message: 'Bu kişi zaten kullanıcı olarak eklenmiş' });
      Object.assign(veri, adSoyadAyir(kaynak.adSoyad), { kaynakId: kaynak._id });
    }
    res.status(201).json(await Kullanici.create(veri));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mevcut denetçi/danışman kayıtlarından kullanıcı ekler: { kaynaklar: [{ tur: 'denetci'|'danisman', id }] }
router.post('/ice-aktar', async (req, res) => {
  try {
    const kaynaklar = Array.isArray(req.body?.kaynaklar) ? req.body.kaynaklar : [];
    const eklenen = [];
    for (const k of kaynaklar) {
      if (!['denetci', 'danisman'].includes(k?.tur) || !mongoose.isValidObjectId(k?.id)) continue;
      const model = mongoose.models[k.tur === 'denetci' ? 'Denetci' : 'Danisman'];
      const kaynak = model ? await model.findById(k.id).lean() : null;
      if (!kaynak) continue;
      if (await Kullanici.exists({ kaynakId: kaynak._id, rol: k.tur })) continue; // zaten ekli
      const { ad, soyad } = adSoyadAyir(kaynak.adSoyad);
      eklenen.push(await Kullanici.create({ ad, soyad, rol: k.tur, kaynakId: kaynak._id }));
    }
    res.status(201).json(eklenen);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const veri = temizle(req.body);
    const hata = dogrula(veri);
    if (hata) return res.status(400).json({ message: hata });
    const onceki = await Kullanici.findById(req.params.id).lean();
    if (!onceki) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    const guncelle = { ...veri };
    const unset = {};
    let sifirla = false;
    if (veri.email !== undefined) {
      if (!veri.email) {
        delete guncelle.email;
        if (onceki.email) { unset.email = ''; sifirla = true; }
        guncelle.emailDogrulandi = false;
      } else if (veri.email !== onceki.email) {
        if (await Kullanici.exists({ email: veri.email, _id: { $ne: onceki._id } })) {
          return res.status(409).json({ message: 'Bu e-posta başka bir kullanıcıda kayıtlı' });
        }
        // E-posta eklendi/değişti: doğrulama sıfırlanır, oturumlar kapanır; yönetici "Doğrulama gönder" der
        guncelle.emailDogrulandi = false;
        sifirla = true;
      }
    }
    if (veri.aktif === false && onceki.aktif !== false) sifirla = true; // pasife alınca oturumlar kapanır

    const kayit = await Kullanici.findByIdAndUpdate(
      req.params.id,
      { $set: guncelle, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true, runValidators: true }
    );
    if (sifirla) await oturumlariSifirla(kayit._id);
    res.json(await Kullanici.findById(kayit._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const kayit = await Kullanici.findByIdAndDelete(req.params.id);
    if (!kayit) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    await oturumlariSifirla(kayit._id).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
