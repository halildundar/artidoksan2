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

// Tescil kaydı — Modul G denetimiyle aynı içerik: firma + asansör,
// ek proje dosyası (PDF/ZIP), AB uygunluk beyanı ve son kontrol tarihleri
// (ayrı bir "tescil tarihi" tutulmaz). Ek olarak firmanın CE belgelerinden
// seçilenlerin alt belge id'leri tutulur.
const tescilSchema = new mongoose.Schema(
  {
    firmaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firma', required: true },
    asansorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asansor', required: true },
    ekProje: { type: dosyaSlotSchema, default: null },
    // Yeşil etiket raporu (PDF)
    yesilEtiketRaporu: { type: dosyaSlotSchema, default: null },
    // Fatura dosyaları (çoklu — yazdırma listesinde ZIP'lenir)
    faturalar: { type: [dosyaSlotSchema], default: [] },
    abUygunlukBeyaniTarihi: { type: Date, default: null },
    sonKontrolTarihi: { type: Date, default: null },
    belediyeAdi: { type: String, trim: true },
    dilekceTarihi: { type: Date, default: null },
    // Yazdırma şablonlarında kullanılan kalıcı değerler (kullanıcı kararı:
    // popup yerine tescil sayfasında form alanı)
    garantiTarihi: { type: Date, default: null },
    faturaNo: { type: String, trim: true, default: '' },
    faturaTarihi: { type: Date, default: null },
    projeHizmetSozlesmeTarihi: { type: Date, default: null },
    // Yazdır ekranında seçilen şablon seti (templates/<set>/)
    sablonSeti: { type: String, trim: true, default: 'tescil-temp1' },
    // Şablonlardan üretilen DOCX+PDF çiftleri (yazdir.js yönetir)
    uretilenBelgeler: {
      type: [
        new mongoose.Schema(
          {
            sablonKodu: { type: String, required: true },
            sablonAdi: { type: String, default: '' },
            docx: { type: dosyaSlotSchema, default: null },
            pdf: { type: dosyaSlotSchema, default: null },
            uretimTarihi: { type: Date, default: null },
            // Üretimde kullanılan girdilerin parmak izi (yazdir.js; değişmemişse yeniden çevrilmez)
            kaynakOzeti: { type: String, default: '' },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    // Firmanın ceBelgeleri alt belgelerinden seçilenlerin _id'leri
    ceBelgeIdleri: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'tesciller' }
);

export const Tescil = mongoose.model('Tescil', tescilSchema);

const POPULATE = [
  { path: 'firmaId', select: 'ad unvan telefon il ilce' },
  { path: 'asansorId', select: 'seriNo yapiRuhsatNo il ilce kisiSayisi beyanYuku makinaKonumu askiTipi hiz durakSayisi asansorProjesiDosya' },
];

const router = express.Router();

// GET /api/tesciller — firma ve asansör özetiyle, yeniden eskiye
router.get('/', async (_req, res) => {
  try {
    const tesciller = await Tescil.find()
      .sort({ createdAt: -1 })
      .populate(POPULATE);
    res.json(tesciller);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tescil = await Tescil.findById(req.params.id).populate(POPULATE);
    if (!tescil) return res.status(404).json({ message: 'Tescil bulunamadı' });
    res.json(tescil);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { firmaId, asansorId, abUygunlukBeyaniTarihi, sonKontrolTarihi } = req.body ?? {};
    if (!firmaId || !asansorId) {
      return res.status(400).json({ message: 'Firma ve asansör seçimi zorunludur' });
    }
    const tescil = await Tescil.create({ firmaId, asansorId, abUygunlukBeyaniTarihi, sonKontrolTarihi });
    res.status(201).json(await tescil.populate(POPULATE));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      firmaId, asansorId,
      ekProje, yesilEtiketRaporu, faturalar, abUygunlukBeyaniTarihi, sonKontrolTarihi,
      belediyeAdi, dilekceTarihi, garantiTarihi, faturaNo, faturaTarihi,
      projeHizmetSozlesmeTarihi, sablonSeti, ceBelgeIdleri,
    } = req.body ?? {};
    // undefined alanlar Mongoose tarafından ayıklanır — kısmi PUT
    const tescil = await Tescil.findByIdAndUpdate(
      req.params.id,
      {
        firmaId, asansorId,
        ekProje, yesilEtiketRaporu, faturalar, abUygunlukBeyaniTarihi, sonKontrolTarihi,
        belediyeAdi, dilekceTarihi, garantiTarihi, faturaNo, faturaTarihi,
        projeHizmetSozlesmeTarihi, sablonSeti, ceBelgeIdleri,
      },
      { new: true, runValidators: true }
    ).populate(POPULATE);
    if (!tescil) return res.status(404).json({ message: 'Tescil bulunamadı' });
    res.json(tescil);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tescil = await Tescil.findByIdAndDelete(req.params.id);
    if (!tescil) return res.status(404).json({ message: 'Tescil bulunamadı' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
