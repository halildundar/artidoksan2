import express from 'express';
import mongoose from 'mongoose';
import { deleteObject } from './storage.js';

// Denetçiler (Ayarlar > Denetçiler): ad soyad, mühendis türü (elektrik /
// makine) ve imza-kaşe görseli. Denetim belgelerinde {denetci_adi} ve
// denetçi imza-kaşe etiketleri bu kayıttan doldurulur.
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

export const MUHENDIS_TURLERI = ['elektrik', 'makine'];

const denetciSchema = new mongoose.Schema(
  {
    adSoyad: { type: String, required: true, trim: true },
    muhendisTuru: { type: String, enum: [...MUHENDIS_TURLERI, ''], default: '' },
    imzaKase: { type: dosyaSlotSchema, default: null },
  },
  { timestamps: true, collection: 'denetciler' }
);

export const Denetci = mongoose.models.Denetci || mongoose.model('Denetci', denetciSchema);

const router = express.Router();

function temizle(body) {
  const { adSoyad, muhendisTuru, imzaKase } = body ?? {};
  return { adSoyad: String(adSoyad ?? '').trim(), muhendisTuru: muhendisTuru ?? '', imzaKase: imzaKase ?? null };
}

router.get('/', async (_req, res) => {
  try {
    const liste = await Denetci.find().lean();
    liste.sort((a, b) => (a.adSoyad ?? '').localeCompare(b.adSoyad ?? '', 'tr'));
    res.json(liste);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const kayit = await Denetci.findById(req.params.id);
    if (!kayit) return res.status(404).json({ message: 'Denetçi bulunamadı' });
    res.json(kayit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const veri = temizle(req.body);
    if (!veri.adSoyad) return res.status(400).json({ message: 'Ad soyad zorunludur' });
    res.status(201).json(await Denetci.create(veri));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const veri = temizle(req.body);
    if (!veri.adSoyad) return res.status(400).json({ message: 'Ad soyad zorunludur' });
    const onceki = await Denetci.findById(req.params.id).lean();
    if (!onceki) return res.status(404).json({ message: 'Denetçi bulunamadı' });
    const kayit = await Denetci.findByIdAndUpdate(req.params.id, veri, { new: true, runValidators: true });
    // İmza-kaşe değiştirildi/kaldırıldıysa eski dosya depoda yetim kalmasın
    const eski = onceki.imzaKase?.dosyaAnahtari;
    if (eski && eski !== veri.imzaKase?.dosyaAnahtari) await deleteObject(eski).catch(() => {});
    res.json(kayit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const kayit = await Denetci.findByIdAndDelete(req.params.id);
    if (!kayit) return res.status(404).json({ message: 'Denetçi bulunamadı' });
    if (kayit.imzaKase?.dosyaAnahtari) await deleteObject(kayit.imzaKase.dosyaAnahtari).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
