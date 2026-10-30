import express from 'express';
import mongoose from 'mongoose';

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

// Modul B: güvenlik aksamı kataloğundan seçilen satır (bilgiler seçim
// anında kopyalanır; belgeId katalog kaydına geri dönük bakış içindir)
const denetimAksamSchema = new mongoose.Schema({
  bilesenTipiKodu: { type: String, trim: true, default: '' },
  bilesenTipiAdi: { type: String, trim: true, default: '' },
  belgeId: { type: String, default: '' },
  marka: { type: String, trim: true, default: '' },
  tip: { type: String, trim: true, default: '' },
  sertifikaNo: { type: String, trim: true, default: '' },
});

// Denetim kaydı: firma + asansör + modül + denetim tarihi.
// Modul G detayı: ek proje dosyası (PDF/ZIP) + AB uygunluk beyanı ve
// son kontrol tarihleri. Modul B ek olarak: tip projeleri (ZIP listesi)
// ve katalogdan seçilen güvenlik aksamları.
const denetimSchema = new mongoose.Schema(
  {
    firmaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firma', required: true },
    asansorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asansor', required: true },
    modul: { type: String, trim: true, default: '' },
    denetimTarihi: { type: Date, required: true },
    ekProje: { type: dosyaSlotSchema, default: null },
    abUygunlukBeyaniTarihi: { type: Date, default: null },
    sonKontrolTarihi: { type: Date, default: null },
    tipProjeler: { type: [dosyaSlotSchema], default: [] },
    guvenlikAksamlari: { type: [denetimAksamSchema], default: [] },
    // Modul E: montaj sözleşmesi ve malzeme faturası dosya/fotoğrafları
    montajSozlesmeleri: { type: [dosyaSlotSchema], default: [] },
    malzemeFaturalari: { type: [dosyaSlotSchema], default: [] },
  },
  { timestamps: true, collection: 'denetimler' }
);

export const Denetim = mongoose.model('Denetim', denetimSchema);

const POPULATE = [
  { path: 'firmaId', select: 'ad unvan telefon il ilce' },
  { path: 'asansorId', select: 'seriNo yapiRuhsatNo il ilce' },
];

const router = express.Router();

// GET /api/denetimler — firma ve asansör özetiyle, yeniden eskiye
router.get('/', async (_req, res) => {
  try {
    const denetimler = await Denetim.find()
      .sort({ denetimTarihi: -1, createdAt: -1 })
      .populate(POPULATE);
    res.json(denetimler);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const denetim = await Denetim.findById(req.params.id).populate(POPULATE);
    if (!denetim) return res.status(404).json({ message: 'Denetim bulunamadı' });
    res.json(denetim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { firmaId, asansorId, modul, denetimTarihi } = req.body ?? {};
    if (!firmaId || !asansorId) {
      return res.status(400).json({ message: 'Firma ve asansör seçimi zorunludur' });
    }
    if (!denetimTarihi) {
      return res.status(400).json({ message: 'Denetim tarihi zorunludur' });
    }
    const denetim = await Denetim.create({ firmaId, asansorId, modul, denetimTarihi });
    res.status(201).json(await denetim.populate(POPULATE));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      firmaId, asansorId, modul, denetimTarihi,
      ekProje, abUygunlukBeyaniTarihi, sonKontrolTarihi,
      tipProjeler, guvenlikAksamlari, montajSozlesmeleri, malzemeFaturalari,
    } = req.body ?? {};
    // undefined alanlar Mongoose tarafından ayıklanır — kısmi PUT
    const denetim = await Denetim.findByIdAndUpdate(
      req.params.id,
      {
        firmaId, asansorId, modul, denetimTarihi,
        ekProje, abUygunlukBeyaniTarihi, sonKontrolTarihi,
        tipProjeler, guvenlikAksamlari, montajSozlesmeleri, malzemeFaturalari,
      },
      { new: true, runValidators: true }
    ).populate(POPULATE);
    if (!denetim) return res.status(404).json({ message: 'Denetim bulunamadı' });
    res.json(denetim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const denetim = await Denetim.findByIdAndDelete(req.params.id);
    if (!denetim) return res.status(404).json({ message: 'Denetim bulunamadı' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
