import { Router } from 'express';
import mongoose from 'mongoose';

// Asansör adres kayıtları — adresler ayrı koleksiyonda toplanır; asansöre
// adres, kayıtlardan seçilir ve verileri olduğu gibi kopyalanır.
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

const adresKaydiSchema = new mongoose.Schema(
  {
    il: { type: String, trim: true, default: '' },
    ilce: { type: String, trim: true, default: '' },
    mahalle: { type: String, trim: true, default: '' },
    postaKodu: { type: String, trim: true, default: '' },
    adres: { type: String, trim: true, default: '' },
    ada: { type: String, trim: true, default: '' },
    parsel: { type: String, trim: true, default: '' },
    yapiRuhsatiDosya: { type: dosyaSlotSchema, default: undefined },
  },
  { timestamps: true, collection: 'adresKayitlari' }
);

const AdresKaydi =
  mongoose.models.AdresKaydi || mongoose.model('AdresKaydi', adresKaydiSchema);

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.q) {
      const q = String(req.query.q);
      filter.$or = ['il', 'ilce', 'mahalle', 'adres', 'postaKodu', 'ada', 'parsel'].map((alan) => ({
        [alan]: { $regex: q, $options: 'i' },
      }));
    }
    const kayitlar = await AdresKaydi.find(filter).sort({ createdAt: -1 });
    res.json(kayitlar);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { il, ilce, mahalle, postaKodu, adres, ada, parsel, yapiRuhsatiDosya } = req.body ?? {};
    if (!il || !ilce) return res.status(400).json({ message: 'İl ve ilçe zorunludur' });
    const kayit = await AdresKaydi.create({
      il, ilce, mahalle, postaKodu, adres, ada, parsel,
      yapiRuhsatiDosya: yapiRuhsatiDosya ?? undefined,
    });
    res.status(201).json(kayit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { il, ilce, mahalle, postaKodu, adres, ada, parsel, yapiRuhsatiDosya } = req.body ?? {};
    if (!il || !ilce) return res.status(400).json({ message: 'İl ve ilçe zorunludur' });
    const kayit = await AdresKaydi.findByIdAndUpdate(
      req.params.id,
      { il, ilce, mahalle, postaKodu, adres, ada, parsel, yapiRuhsatiDosya: yapiRuhsatiDosya ?? null },
      { new: true, runValidators: true }
    );
    if (!kayit) return res.status(404).json({ message: 'Adres bulunamadı' });
    res.json(kayit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const kayit = await AdresKaydi.findByIdAndDelete(req.params.id);
    if (!kayit) return res.status(404).json({ message: 'Adres bulunamadı' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
