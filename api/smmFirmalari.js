import { Router } from 'express';
import mongoose from 'mongoose';

// SMM firma havuzu — genel havuz Ayarlar'dan yönetilir; montaj firmasına
// SMM firması havuzdan seçilir ve bilgileri olduğu gibi kopyalanır.
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

const smmFirmasiSchema = new mongoose.Schema(
  {
    // Yıl yalnız seçimle girilir (2024-2032)
    yil: { type: Number, default: null },
    kisaAd: { type: String, required: true, trim: true },
    unvan: { type: String, trim: true, default: '' },
    adres: { type: String, trim: true, default: '' },
    buroTescilBelgesi: { type: dosyaSlotSchema, default: null },
    // Makine mühendisi
    makMuhAdSoyad: { type: String, trim: true, default: '' },
    makMuhOdaSicilNo: { type: String, trim: true, default: '' },
    makMuhTelefon: { type: String, trim: true, default: '' },
    makMuhSmmBelgesi: { type: dosyaSlotSchema, default: null },
    makMuhImzaSirkusu: { type: dosyaSlotSchema, default: null },
    // Elektrik mühendisi
    elkMuhAdSoyad: { type: String, trim: true, default: '' },
    elkMuhOdaSicilNo: { type: String, trim: true, default: '' },
    elkMuhTelefon: { type: String, trim: true, default: '' },
    elkMuhSmmBelgesi: { type: dosyaSlotSchema, default: null },
    elkMuhImzaSirkusu: { type: dosyaSlotSchema, default: null },
  },
  { timestamps: true, collection: 'smmFirmalari' }
);

const SmmFirmasi =
  mongoose.models.SmmFirmasi || mongoose.model('SmmFirmasi', smmFirmasiSchema);

const ALANLAR = [
  'yil', 'kisaAd', 'unvan', 'adres', 'buroTescilBelgesi',
  'makMuhAdSoyad', 'makMuhOdaSicilNo', 'makMuhTelefon', 'makMuhSmmBelgesi', 'makMuhImzaSirkusu',
  'elkMuhAdSoyad', 'elkMuhOdaSicilNo', 'elkMuhTelefon', 'elkMuhSmmBelgesi', 'elkMuhImzaSirkusu',
];

function veriAl(body) {
  const veri = {};
  for (const alan of ALANLAR) {
    if (alan in (body ?? {})) veri[alan] = body[alan];
  }
  return veri;
}

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.q) {
      const q = String(req.query.q);
      filter.$or = ['kisaAd', 'unvan', 'adres'].map((alan) => ({
        [alan]: { $regex: q, $options: 'i' },
      }));
    }
    const kayitlar = await SmmFirmasi.find(filter).sort({ createdAt: -1 });
    res.json(kayitlar);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const veri = veriAl(req.body);
    if (!veri.kisaAd || !String(veri.kisaAd).trim()) {
      return res.status(400).json({ message: 'Kısa ad zorunludur' });
    }
    const kayit = await SmmFirmasi.create(veri);
    res.status(201).json(kayit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const veri = veriAl(req.body);
    if ('kisaAd' in veri && (!veri.kisaAd || !String(veri.kisaAd).trim())) {
      return res.status(400).json({ message: 'Kısa ad zorunludur' });
    }
    const kayit = await SmmFirmasi.findByIdAndUpdate(req.params.id, veri, {
      new: true,
      runValidators: true,
    });
    if (!kayit) return res.status(404).json({ message: 'SMM firması bulunamadı' });
    res.json(kayit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const kayit = await SmmFirmasi.findByIdAndDelete(req.params.id);
    if (!kayit) return res.status(404).json({ message: 'SMM firması bulunamadı' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
