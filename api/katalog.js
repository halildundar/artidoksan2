import { Router } from 'express';
import mongoose from 'mongoose';

// Bileşen tipleri — artidoksan1'deki BilesenTipi seed listesinin sabit hali.
// (Bu projede ayrı bir admin CRUD'u yerine kod içinde sabit tutulur.)
export const BILESEN_TIPLERI = [
  { kod: 'hiz_regulatoru', ad: 'Hız Regülatörü', kategori: 'guvenlik_aksami', tahrikTipi: 'elektrikli' },
  { kod: 'kontrol_karti', ad: 'Kontrol Kartı', kategori: 'guvenlik_aksami', tahrikTipi: 'elektrikli' },
  { kod: 'tampon', ad: 'Tampon', kategori: 'guvenlik_aksami', tahrikTipi: 'elektrikli' },
  { kod: 'fren', ad: 'Fren', kategori: 'guvenlik_aksami', tahrikTipi: 'elektrikli' },
  { kod: 'ucm_acop', ad: 'UCM/ACOP', kategori: 'guvenlik_aksami', tahrikTipi: 'elektrikli' },
  { kod: 'durak_kapi_kilidi', ad: 'Durak Kapı Kilidi', kategori: 'guvenlik_aksami', tahrikTipi: 'elektrikli' },
  { kod: 'kabin_kapi_kilidi', ad: 'Kabin Kapı Kilidi', kategori: 'guvenlik_aksami', tahrikTipi: 'elektrikli' },
  { kod: 'sarkac_test_raporu', ad: 'Sarkaç Test Raporu', kategori: 'guvenlik_aksami', tahrikTipi: null },
  { kod: 'yangin_sizdirmazlik_raporu', ad: 'Yangına Dayanım ve Sızdırmazlık Raporu', kategori: 'guvenlik_aksami', tahrikTipi: null },
  { kod: 'debi_sinirlama_valfi', ad: 'Debi Sınırlama Valfi', kategori: 'guvenlik_aksami', tahrikTipi: 'hidrolik' },
  { kod: 'boru_kirilma_valfi', ad: 'Boru Kırılma Valfi', kategori: 'guvenlik_aksami', tahrikTipi: 'hidrolik' },
  { kod: 'halat', ad: 'Halat', kategori: 'asansor_bileseni', tahrikTipi: 'elektrikli' },
  { kod: 'ray', ad: 'Ray', kategori: 'asansor_bileseni', tahrikTipi: 'elektrikli' },
  { kod: 'motor_dislisiz', ad: 'Motor (Dişlisiz)', kategori: 'asansor_bileseni', tahrikTipi: 'elektrikli' },
  { kod: 'motor_dislili', ad: 'Motor (Dişlili)', kategori: 'asansor_bileseni', tahrikTipi: 'elektrikli' },
  { kod: 'kapi_panel', ad: 'Kapı Panel', kategori: 'asansor_bileseni', tahrikTipi: null },
  { kod: 'kabin_panel', ad: 'Kabin Panel', kategori: 'asansor_bileseni', tahrikTipi: null },
  { kod: 'cam_panel', ad: 'Cam Panel', kategori: 'asansor_bileseni', tahrikTipi: null },
  { kod: 'hidrolik_unite', ad: 'Hidrolik Ünite', kategori: 'asansor_bileseni', tahrikTipi: 'hidrolik' },
];

const dosyaSlotSchema = new mongoose.Schema(
  {
    dosyaAdi: { type: String, trim: true, required: true },
    dosyaAnahtari: { type: String, required: true },
    mimeType: { type: String, trim: true },
    boyut: { type: Number },
    yuklenmeTarihi: { type: Date, required: true },
  },
  { _id: false }
);

// CE / Aksam belgesi kataloğu — artidoksan1 AksamBelgesi modelinin
// sadeleştirilmiş uyarlaması (kullanıcı/rol/süreç alanları yok).
const aksamBelgesiSchema = new mongoose.Schema(
  {
    bilesenTipiKodu: { type: String, required: true, trim: true, index: true },
    bilesenTipiAdi: { type: String, trim: true },
    kategori: { type: String, required: true, enum: ['guvenlik_aksami', 'asansor_bileseni'], index: true },
    tahrikTipi: { type: String, enum: ['elektrikli', 'hidrolik', null], default: null },
    // guvenlik_aksami alanları
    sertifikaNo: { type: String, trim: true, default: '' },
    gecerlilikBaslangic: { type: Date, default: null },
    gecerlilikBitis: { type: Date, default: null },
    modulKodu: { type: String, trim: true, default: '' },
    onayliKurumId: { type: mongoose.Schema.Types.ObjectId, ref: 'OnayliKurum', default: null },
    onayliKurumNobo: { type: String, trim: true, default: '' },
    onayliKurumUnvan: { type: String, trim: true, default: '' },
    // ortak
    marka: { type: String, trim: true, default: '' },
    tipler: { type: [String], default: [] },
    // asansor_bileseni alanı
    belgeTipi: { type: String, trim: true, default: '' },
    aciklama: { type: String, trim: true, default: '' },
    durum: { type: String, enum: ['aktif', 'pasif'], default: 'aktif', index: true },
    dosya: { type: dosyaSlotSchema, default: undefined },
  },
  { timestamps: true, collection: 'aksambelgeleri' }
);

export const AksamBelgesi = mongoose.model('AksamBelgesi', aksamBelgesiSchema);

function payloadOlustur(body) {
  const {
    bilesenTipiKodu, sertifikaNo, gecerlilikBaslangic, gecerlilikBitis, modulKodu,
    onayliKurumId, onayliKurumNobo, onayliKurumUnvan, marka, tipler, belgeTipi, aciklama, durum, dosya,
  } = body ?? {};
  const tip = BILESEN_TIPLERI.find((t) => t.kod === bilesenTipiKodu);
  if (!tip) return null;
  return {
    bilesenTipiKodu: tip.kod,
    bilesenTipiAdi: tip.ad,
    kategori: tip.kategori,
    tahrikTipi: tip.tahrikTipi,
    sertifikaNo,
    gecerlilikBaslangic: gecerlilikBaslangic || null,
    gecerlilikBitis: gecerlilikBitis || null,
    modulKodu,
    onayliKurumId: onayliKurumId || null,
    onayliKurumNobo,
    onayliKurumUnvan,
    marka,
    tipler: Array.isArray(tipler) ? tipler.filter((t) => t && t.trim()) : [],
    belgeTipi,
    aciklama,
    durum: durum === 'pasif' ? 'pasif' : 'aktif',
    dosya: dosya || undefined,
  };
}

// Geçerlilik bitişi geçen kayıtlar liste yüklenirken otomatik pasife alınır
// (artidoksan1 pasifeAlSuresiGecenleri deseni).
async function pasifeAlSuresiGecenleri() {
  await AksamBelgesi.updateMany(
    { durum: 'aktif', gecerlilikBitis: { $ne: null, $lt: new Date() } },
    { $set: { durum: 'pasif' } }
  );
}

const router = Router();

router.get('/bilesen-tipleri', (_req, res) => {
  res.json(BILESEN_TIPLERI);
});

router.get('/aksam-belgeleri', async (req, res) => {
  try {
    await pasifeAlSuresiGecenleri();
    const filter = {};
    if (req.query.kod) filter.bilesenTipiKodu = String(req.query.kod);
    if (req.query.kategori) filter.kategori = String(req.query.kategori);
    if (req.query.durum) filter.durum = String(req.query.durum);
    if (req.query.search) {
      const q = String(req.query.search);
      filter.$or = [
        { marka: { $regex: q, $options: 'i' } },
        { sertifikaNo: { $regex: q, $options: 'i' } },
        { bilesenTipiAdi: { $regex: q, $options: 'i' } },
      ];
    }
    const belgeler = await AksamBelgesi.find(filter).lean();
    belgeler.sort(
      (a, b) =>
        (a.bilesenTipiAdi ?? '').localeCompare(b.bilesenTipiAdi ?? '', 'tr') ||
        (a.marka ?? '').localeCompare(b.marka ?? '', 'tr')
    );
    res.json(belgeler);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/aksam-belgeleri/:id', async (req, res) => {
  try {
    const belge = await AksamBelgesi.findById(req.params.id);
    if (!belge) return res.status(404).json({ message: 'Belge bulunamadı' });
    res.json(belge);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/aksam-belgeleri', async (req, res) => {
  try {
    const payload = payloadOlustur(req.body);
    if (!payload) return res.status(400).json({ message: 'Geçersiz bileşen tipi' });
    if (!payload.marka?.trim() && payload.kategori === 'guvenlik_aksami') {
      return res.status(400).json({ message: 'Marka zorunludur' });
    }
    const belge = await AksamBelgesi.create(payload);
    res.status(201).json(belge);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/aksam-belgeleri/:id', async (req, res) => {
  try {
    const payload = payloadOlustur(req.body);
    if (!payload) return res.status(400).json({ message: 'Geçersiz bileşen tipi' });
    const belge = await AksamBelgesi.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!belge) return res.status(404).json({ message: 'Belge bulunamadı' });
    res.json(belge);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/aksam-belgeleri/:id', async (req, res) => {
  try {
    const belge = await AksamBelgesi.findByIdAndDelete(req.params.id);
    if (!belge) return res.status(404).json({ message: 'Belge bulunamadı' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
