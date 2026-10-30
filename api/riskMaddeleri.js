import { Router } from 'express';
import mongoose from 'mongoose';

// Risk analizi maddeleri — hazır madde kataloğu ayrı koleksiyonda tutulur;
// popup'tan çoktan seçmeli olarak seçilir, eklenip çıkarılabilir. Her maddenin
// bir resmi olabilir. `grup` hangi risk analizine ait olduğunu belirtir
// (örn. makine-dairesi).
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

const riskMaddesiSchema = new mongoose.Schema(
  {
    grup: { type: String, required: true, trim: true, index: true },
    metin: { type: String, required: true, trim: true },
    resim: { type: dosyaSlotSchema, default: undefined },
  },
  { timestamps: true, collection: 'riskMaddeleri' }
);

const RiskMaddesi =
  mongoose.models.RiskMaddesi || mongoose.model('RiskMaddesi', riskMaddesiSchema);

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.grup) filter.grup = String(req.query.grup);
    const maddeler = await RiskMaddesi.find(filter).sort({ createdAt: 1 });
    res.json(maddeler);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { grup, metin, resim } = req.body ?? {};
    if (!grup || !metin || !String(metin).trim()) {
      return res.status(400).json({ message: 'Grup ve madde metni zorunludur' });
    }
    const madde = await RiskMaddesi.create({ grup, metin, resim: resim ?? undefined });
    res.status(201).json(madde);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { metin, resim } = req.body ?? {};
    if (!metin || !String(metin).trim()) {
      return res.status(400).json({ message: 'Madde metni zorunludur' });
    }
    const madde = await RiskMaddesi.findByIdAndUpdate(
      req.params.id,
      { metin, resim: resim ?? null },
      { new: true, runValidators: true }
    );
    if (!madde) return res.status(404).json({ message: 'Madde bulunamadı' });
    res.json(madde);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const madde = await RiskMaddesi.findByIdAndDelete(req.params.id);
    if (!madde) return res.status(404).json({ message: 'Madde bulunamadı' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
