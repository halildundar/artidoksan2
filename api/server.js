import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';

// Bazı ağlarda Atlas'ın SRV DNS sorgusu engelli (querySrv ECONNREFUSED) —
// .env'de DNS_SERVERS tanımlıysa (örn. 8.8.8.8,1.1.1.1) açık çözümleyici
// kullanılır. Render'da tanımsızdır, davranış değişmez.
if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(','));
import cors from 'cors';
import mongoose from 'mongoose';
import adresRouter from './adres.js';
import adresKayitlariRouter from './adresKayitlari.js';
import riskMaddeleriRouter from './riskMaddeleri.js';
import katalogRouter from './katalog.js';
import asansorRouter, { varsayilanlariTamamla } from './asansor.js';
import denetimRouter from './denetim.js';
import denetimYazdirRouter from './denetimYazdir.js';
import denetciRouter from './denetciler.js';
import tescilRouter from './tescil.js';
import yazdirRouter from './yazdir.js';
import smmFirmalariRouter from './smmFirmalari.js';
import multer from 'multer';
import archiver from 'archiver';
import { buildObjectKey, putObject, createViewUrl, createDownloadUrl, getObjectBuffer } from './storage.js';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/artidoksan2';
const PORT = process.env.PORT ?? 3000;

const app = express();
app.use(cors()); // mobil uygulamalar farklı origin'den gelir
app.use(express.json({ limit: '10mb' })); // KYS verisi (doküman listesi + uygulama kayıtları) büyük olabilir

// Tek bir yüklenmiş dosyanın kaydı (artidoksan1'deki belgeSlotSchema deseni)
const belgeSlotSchema = new mongoose.Schema(
  {
    dosyaAdi: { type: String, trim: true, required: true },
    dosyaAnahtari: { type: String, required: true },
    mimeType: { type: String, trim: true },
    boyut: { type: Number },
    yuklenmeTarihi: { type: Date, required: true },
  },
  { _id: false }
);

// CE belgesi satırı: modül + onaylı kurum + belge no + geçerlilik/bitiş + dosya
const ceBelgesiSchema = new mongoose.Schema({
  modul: { type: String, trim: true, default: '' },
  kurum: { type: String, trim: true, default: '' },
  belgeNo: { type: String, trim: true, default: '' },
  gecerlilikTarihi: { type: Date, default: null },
  bitisTarihi: { type: Date, default: null },
  dosya: { type: belgeSlotSchema, default: null },
});

// Personel sekmesi mühendis satırı: tür + ad soyad + belgeler (dosya/foto)
const muhendisSchema = new mongoose.Schema({
  tur: { type: String, enum: ['elektrik', 'makine'], default: 'elektrik' },
  adSoyad: { type: String, trim: true, default: '' },
  belgeler: { type: [belgeSlotSchema], default: [] },
});

const firmaSchema = new mongoose.Schema(
  {
    ad: { type: String, required: true, trim: true },
    unvan: { type: String, trim: true, default: '' },
    telefon: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    il: { type: String, trim: true, default: '' },
    ilce: { type: String, trim: true, default: '' },
    mahalle: { type: String, trim: true, default: '' },
    postaKodu: { type: String, trim: true, default: '' },
    adres: { type: String, trim: true, default: '' },
    yetkili: { type: String, trim: true, default: '' },
    vergiDairesi: { type: String, trim: true, default: '' },
    vergiNo: { type: String, trim: true, default: '' },
    belgeler: {
      logo: { type: belgeSlotSchema, default: undefined },
      imzaKase: { type: belgeSlotSchema, default: undefined },
      imzaSirkusu: { type: belgeSlotSchema, default: undefined },
      vergiLevhasi: { type: belgeSlotSchema, default: undefined },
      sicilGazetesi: { type: belgeSlotSchema, default: undefined },
      faaliyetBelgesi: { type: belgeSlotSchema, default: undefined },
    },
    // Kurum evrakları çoklu dosya listeleri (belgeler'deki tekil yuvalar
    // geriye uyum için listenin ilk dosyasıyla senkron tutulur)
    kurumEvrakDosyalari: {
      imzaSirkusu: { type: [belgeSlotSchema], default: undefined },
      vergiLevhasi: { type: [belgeSlotSchema], default: undefined },
      sicilGazetesi: { type: [belgeSlotSchema], default: undefined },
      faaliyetBelgesi: { type: [belgeSlotSchema], default: undefined },
    },
    // Sanayi Sicil Belgesi: no + tarih + dosya
    sanayiSicilBelgeNo: { type: String, trim: true, default: '' },
    sanayiSicilBelgeTarihi: { type: Date, default: null },
    sanayiSicilDosya: { type: belgeSlotSchema, default: null },
    // TSE-HYB Belgesi: no + ilk veriliş + geçerlilik tarihi + dosya
    hybBelgeNo: { type: String, trim: true, default: '' },
    hybIlkVerilis: { type: Date, default: null },
    hybGecerlilik: { type: Date, default: null },
    hybDosya: { type: belgeSlotSchema, default: null },
    // ISO belgesi (yalnız dosya)
    isoDosya: { type: belgeSlotSchema, default: null },
    // CE belgeleri tablosu
    ceBelgeleri: { type: [ceBelgesiSchema], default: [] },
    // Cihazlar sekmesi: serbest dosya/fotoğraf listesi (yükleme hep sona ekler)
    cihazDosyalari: { type: [belgeSlotSchema], default: [] },
    // KYS (Modül E Kalite El Kitabı): firma bilgisi dışındaki girdiler, politika/hedef/doküman listesi,
    // revizyonlar, düzenlenmiş şablonlar ve uygulama kayıtları. Listeleme yanıtlarını şişirmemek için
    // varsayılan olarak seçilmez; /api/firmalar/:id/kys ile okunur/yazılır.
    kys: { type: mongoose.Schema.Types.Mixed, default: undefined, select: false },
    // Personel sekmesi: sabit görev sahipleri (ad soyad)
    personel: {
      genelMudur: { type: String, trim: true, default: '' },
      kytTemsilcisi: { type: String, trim: true, default: '' },
      montajSorumlusu: { type: String, trim: true, default: '' },
      bakimSorumlusu: { type: String, trim: true, default: '' },
      satinAlmaSorumlusu: { type: String, trim: true, default: '' },
      sonKontrolSorumlusu: { type: String, trim: true, default: '' },
    },
    // Personel sekmesi: mühendis listesi (birden fazla eklenebilir)
    muhendisler: { type: [muhendisSchema], default: [] },
    // Personel sekmesi: SGK dökümü dosyaları/fotoğrafları (yükleme hep sona ekler)
    sgkDokumleri: { type: [belgeSlotSchema], default: [] },
    // SMM Bilgileri: kendi bünyesinde veya başka bir firma (varsayılan başka)
    smmTuru: { type: String, enum: ['kendi', 'baska', null], default: null },
    // Havuzdan seçilen SMM firması (bilgiler seçim anında kopyalanır) + yıl
    smmFirmaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmFirmasi', default: null },
    smmYil: { type: Number, default: null },
    // SMM firmasıyla yapılan sözleşme (PDF veya resim)
    smmSozlesme: { type: belgeSlotSchema, default: null },
    smmKisaAd: { type: String, trim: true, default: '' },
    smmUnvan: { type: String, trim: true, default: '' },
    smmAdres: { type: String, trim: true, default: '' },
    smmBuroTescilBelgesi: { type: belgeSlotSchema, default: null },
    // Makine mühendisi
    smmMakMuhAdSoyad: { type: String, trim: true, default: '' },
    smmMakMuhOdaSicilNo: { type: String, trim: true, default: '' },
    smmMakMuhTelefon: { type: String, trim: true, default: '' },
    smmMakMuhSmmBelgesi: { type: belgeSlotSchema, default: null },
    smmMakMuhImzaSirkusu: { type: belgeSlotSchema, default: null },
    // Elektrik mühendisi
    smmElkMuhAdSoyad: { type: String, trim: true, default: '' },
    smmElkMuhOdaSicilNo: { type: String, trim: true, default: '' },
    smmElkMuhTelefon: { type: String, trim: true, default: '' },
    smmElkMuhSmmBelgesi: { type: belgeSlotSchema, default: null },
    smmElkMuhImzaSirkusu: { type: belgeSlotSchema, default: null },
  },
  { timestamps: true, collection: 'firmalar' }
);

const Firma = mongoose.model('Firma', firmaSchema);

// Onaylı kurumlar (artidoksan1'deki OnayliKurum modelinin uyarlaması)
const onayliKurumSchema = new mongoose.Schema(
  {
    nobo: { type: String, required: true, trim: true, index: true },
    unvan: { type: String, required: true, trim: true },
    ulke: { type: String, trim: true, default: '' },
    adres: { type: String, trim: true, default: '' },
    telefon: { type: String, trim: true, default: '' },
    eposta: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    kurumTipi: { type: String, trim: true, default: '' },
    sonOnayTarihi: { type: Date, default: null },
  },
  { timestamps: true, collection: 'onaylikurumlar' }
);

const OnayliKurum = mongoose.model('OnayliKurum', onayliKurumSchema);

function onayliKurumPayload(body) {
  const { nobo, unvan, ulke, adres, telefon, eposta, website, kurumTipi, sonOnayTarihi } = body ?? {};
  return { nobo, unvan, ulke, adres, telefon, eposta, website, kurumTipi, sonOnayTarihi: sonOnayTarihi || null };
}

app.get('/api/onayli-kurumlar', async (req, res) => {
  try {
    const filter = {};
    const search = req.query.search;
    if (search) {
      filter.$or = [
        { unvan: { $regex: String(search), $options: 'i' } },
        { nobo: { $regex: String(search), $options: 'i' } },
        { ulke: { $regex: String(search), $options: 'i' } },
      ];
    }
    const kurumlar = await OnayliKurum.find(filter).lean();
    // Türkiye kayıtları listenin başında, grup içi ünvana göre Türkçe sıralı
    kurumlar.sort(
      (a, b) =>
        Number(b.ulke === 'Türkiye') - Number(a.ulke === 'Türkiye') ||
        (a.unvan ?? '').localeCompare(b.unvan ?? '', 'tr')
    );
    // Her istekte en fazla LIMIT kayıt döner; scroll ile devamı ?skip= ile alınır
    const LIMIT = 100;
    const skip = Math.max(0, Number(req.query.skip) || 0);
    res.json({ items: kurumlar.slice(skip, skip + LIMIT), total: kurumlar.length, limit: LIMIT });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Form select'leri için hafif tam liste (sadece _id, nobo, unvan)
app.get('/api/onayli-kurumlar-secenekler', async (_req, res) => {
  try {
    const kurumlar = await OnayliKurum.find({}, { nobo: 1, unvan: 1, ulke: 1 }).lean();
    kurumlar.sort(
      (a, b) =>
        Number(b.ulke === 'Türkiye') - Number(a.ulke === 'Türkiye') ||
        (a.unvan ?? '').localeCompare(b.unvan ?? '', 'tr')
    );
    res.json(kurumlar.map(({ _id, nobo, unvan }) => ({ _id, nobo, unvan })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/onayli-kurumlar/:id', async (req, res) => {
  try {
    const kurum = await OnayliKurum.findById(req.params.id);
    if (!kurum) return res.status(404).json({ message: 'Onaylı kurum bulunamadı' });
    res.json(kurum);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/onayli-kurumlar', async (req, res) => {
  try {
    const payload = onayliKurumPayload(req.body);
    if (!payload.nobo?.trim() || !payload.unvan?.trim()) {
      return res.status(400).json({ message: 'NoBo numarası ve ünvan zorunludur' });
    }
    const kurum = await OnayliKurum.create(payload);
    res.status(201).json(kurum);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/onayli-kurumlar/:id', async (req, res) => {
  try {
    const payload = onayliKurumPayload(req.body);
    if (!payload.nobo?.trim() || !payload.unvan?.trim()) {
      return res.status(400).json({ message: 'NoBo numarası ve ünvan zorunludur' });
    }
    const kurum = await OnayliKurum.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!kurum) return res.status(404).json({ message: 'Onaylı kurum bulunamadı' });
    res.json(kurum);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/onayli-kurumlar/:id', async (req, res) => {
  try {
    const kurum = await OnayliKurum.findByIdAndDelete(req.params.id);
    if (!kurum) return res.status(404).json({ message: 'Onaylı kurum bulunamadı' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Danışmanlar: yalnızca ad soyad, il, email, telefon
const danismanSchema = new mongoose.Schema(
  {
    adSoyad: { type: String, required: true, trim: true },
    il: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    telefon: { type: String, trim: true, default: '' },
  },
  { timestamps: true, collection: 'danismanlar' }
);

const Danisman = mongoose.model('Danisman', danismanSchema);

app.get('/api/danismanlar', async (_req, res) => {
  try {
    const danismanlar = await Danisman.find().lean();
    danismanlar.sort((a, b) => (a.adSoyad ?? '').localeCompare(b.adSoyad ?? '', 'tr'));
    res.json(danismanlar);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/danismanlar/:id', async (req, res) => {
  try {
    const danisman = await Danisman.findById(req.params.id);
    if (!danisman) return res.status(404).json({ message: 'Danışman bulunamadı' });
    res.json(danisman);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/danismanlar', async (req, res) => {
  try {
    const { adSoyad, il, email, telefon } = req.body ?? {};
    if (!adSoyad || !adSoyad.trim()) {
      return res.status(400).json({ message: 'Ad soyad zorunludur' });
    }
    const danisman = await Danisman.create({ adSoyad, il, email, telefon });
    res.status(201).json(danisman);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/danismanlar/:id', async (req, res) => {
  try {
    const { adSoyad, il, email, telefon } = req.body ?? {};
    if (!adSoyad || !adSoyad.trim()) {
      return res.status(400).json({ message: 'Ad soyad zorunludur' });
    }
    const danisman = await Danisman.findByIdAndUpdate(
      req.params.id,
      { adSoyad, il, email, telefon },
      { new: true, runValidators: true }
    );
    if (!danisman) return res.status(404).json({ message: 'Danışman bulunamadı' });
    res.json(danisman);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/danismanlar/:id', async (req, res) => {
  try {
    const danisman = await Danisman.findByIdAndDelete(req.params.id);
    if (!danisman) return res.status(404).json({ message: 'Danışman bulunamadı' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/adres', adresRouter);
app.use('/api/adres-kayitlari', adresKayitlariRouter);
app.use('/api/risk-maddeleri', riskMaddeleriRouter);
app.use('/api', katalogRouter);
app.use('/api/asansorler', asansorRouter);
app.use('/api/denetciler', denetciRouter);
app.use('/api/denetimler', denetimYazdirRouter); // /:id/yazdir rotaları (önce eşleşmeli)
app.use('/api/denetimler', denetimRouter);
app.use('/api/tesciller', yazdirRouter); // /:id/yazdir rotaları (önce eşleşmeli)
app.use('/api/tesciller', tescilRouter);
app.use('/api/smm-firmalari', smmFirmalariRouter);

// Dosya yükleme: multipart ile gelir, R2'ye yazılır, slot kaydı döner.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const IZINLI_MIMELER = [
  'image/png', 'image/jpeg', 'image/webp', 'application/pdf',
  // Denetim ek projesi ZIP olarak da yüklenebilir (Windows tarayıcıları
  // x-zip-compressed gönderir)
  'application/zip', 'application/x-zip-compressed',
];

app.post('/api/upload', upload.single('dosya'), async (req, res) => {
  try {
    const dosya = req.file;
    if (!dosya) return res.status(400).json({ message: 'Dosya gerekli' });
    if (!IZINLI_MIMELER.includes(dosya.mimetype)) {
      return res.status(400).json({ message: 'Desteklenmeyen dosya türü (PNG/JPEG/WebP/PDF/ZIP)' });
    }
    // multer originalname'i latin1 okur — Türkçe karakterler için düzeltilir
    const dosyaAdi = Buffer.from(dosya.originalname, 'latin1').toString('utf8');
    const key = buildObjectKey('firmalar', dosyaAdi);
    await putObject(key, dosya.buffer, dosya.mimetype);
    res.status(201).json({
      dosyaAdi,
      dosyaAnahtari: key,
      mimeType: dosya.mimetype,
      boyut: dosya.size,
      yuklenmeTarihi: new Date().toISOString(),
    });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

// Önizleme/görüntüleme için kısa ömürlü imzalı URL
app.get('/api/dosya-url', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ message: 'key gerekli' });
    // ?indir=1&ad=<dosya adı> → tarayıcı indirme olarak davranır
    const url =
      req.query.indir === '1'
        ? await createDownloadUrl(String(key), String(req.query.ad || 'dosya'))
        : await createViewUrl(String(key));
    res.json({ url });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

// ---- ZIP indirme linki: verilen dosyalar R2'den okunur, tek ZIP'te
// toplanıp R2'ye yazılır ve paylaşılabilir imzalı indirme linki döner ----
const ZIP_URL_TTL_SECONDS = 7 * 24 * 60 * 60; // imzalı URL üst sınırı (7 gün)

function zipOlustur(girdiler) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 6 } });
    const parcalar = [];
    archive.on('data', (parca) => parcalar.push(parca));
    archive.on('error', reject);
    archive.on('end', () => resolve(Buffer.concat(parcalar)));
    for (const g of girdiler) archive.append(g.buffer, { name: g.ad });
    archive.finalize();
  });
}

// Birden çok dosya için paylaşılabilir (7 gün geçerli) indirme linkleri —
// PDF raporlarının içine gömülen dosya linkleri için kullanılır.
app.post('/api/dosya-linkleri', async (req, res) => {
  try {
    const { dosyalar } = req.body ?? {};
    if (!Array.isArray(dosyalar) || !dosyalar.length) {
      return res.status(400).json({ message: 'Dosya listesi boş' });
    }
    if (dosyalar.length > 500) {
      return res.status(400).json({ message: 'En fazla 500 dosya için link üretilebilir' });
    }
    const linkler = {};
    for (const d of dosyalar) {
      if (!d?.dosyaAnahtari || linkler[d.dosyaAnahtari]) continue;
      linkler[d.dosyaAnahtari] = await createDownloadUrl(
        String(d.dosyaAnahtari),
        String(d.dosyaAdi || 'dosya'),
        ZIP_URL_TTL_SECONDS
      );
    }
    res.json({ linkler });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

app.post('/api/zip-link', async (req, res) => {
  try {
    const { ad, dosyalar } = req.body ?? {};
    if (!Array.isArray(dosyalar) || !dosyalar.length) {
      return res.status(400).json({ message: 'Ziplenecek dosya listesi boş' });
    }
    // Aynı dosya adı iki kez geçerse ZIP içinde " (2)", " (3)"… ekiyle ayrışır
    const kullanilan = new Map();
    const girdiler = [];
    for (const d of dosyalar) {
      if (!d?.dosyaAnahtari) continue;
      const buffer = await getObjectBuffer(String(d.dosyaAnahtari));
      let isim = String(d.dosyaAdi || 'dosya');
      const sayi = (kullanilan.get(isim) ?? 0) + 1;
      kullanilan.set(isim, sayi);
      if (sayi > 1) {
        const nokta = isim.lastIndexOf('.');
        isim = nokta > 0 ? `${isim.slice(0, nokta)} (${sayi})${isim.slice(nokta)}` : `${isim} (${sayi})`;
      }
      girdiler.push({ ad: isim, buffer });
    }
    if (!girdiler.length) {
      return res.status(400).json({ message: 'Ziplenecek dosya bulunamadı' });
    }
    const zipBuffer = await zipOlustur(girdiler);
    // İndirilen dosya adı her zaman .zip ile biter
    const zipTaban = String(ad || 'dosyalar').trim() || 'dosyalar';
    const zipAdi = /\.zip$/i.test(zipTaban) ? zipTaban : `${zipTaban}.zip`;
    const key = buildObjectKey('zipler', zipAdi);
    await putObject(key, zipBuffer, 'application/zip');
    const url = await createDownloadUrl(key, zipAdi, ZIP_URL_TTL_SECONDS);
    res.json({ url, boyut: zipBuffer.length, dosyaSayisi: girdiler.length });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

app.get('/api/firmalar', async (_req, res) => {
  try {
    const firmalar = await Firma.find().sort({ createdAt: -1 });
    res.json(firmalar);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/firmalar', async (req, res) => {
  try {
    const {
      ad, unvan, telefon, email, il, ilce, mahalle, postaKodu, adres, yetkili, vergiDairesi, vergiNo, belgeler,
      sanayiSicilBelgeNo, sanayiSicilBelgeTarihi, sanayiSicilDosya,
      hybBelgeNo, hybIlkVerilis, hybGecerlilik, hybDosya, isoDosya, ceBelgeleri, cihazDosyalari,
      personel, muhendisler, sgkDokumleri, kurumEvrakDosyalari,
      smmTuru, smmFirmaId, smmYil, smmSozlesme, smmKisaAd, smmUnvan, smmAdres, smmBuroTescilBelgesi,
      smmMakMuhAdSoyad, smmMakMuhOdaSicilNo, smmMakMuhTelefon, smmMakMuhSmmBelgesi, smmMakMuhImzaSirkusu,
      smmElkMuhAdSoyad, smmElkMuhOdaSicilNo, smmElkMuhTelefon, smmElkMuhSmmBelgesi, smmElkMuhImzaSirkusu,
    } = req.body ?? {};
    if (!ad || !ad.trim()) {
      return res.status(400).json({ message: 'Firma adı zorunludur' });
    }
    const firma = await Firma.create({
      ad, unvan, telefon, email, il, ilce, mahalle, postaKodu, adres, yetkili, vergiDairesi, vergiNo, belgeler,
      sanayiSicilBelgeNo, sanayiSicilBelgeTarihi, sanayiSicilDosya,
      hybBelgeNo, hybIlkVerilis, hybGecerlilik, hybDosya, isoDosya, ceBelgeleri, cihazDosyalari,
      personel, muhendisler, sgkDokumleri, kurumEvrakDosyalari,
      smmTuru, smmFirmaId, smmYil, smmSozlesme, smmKisaAd, smmUnvan, smmAdres, smmBuroTescilBelgesi,
      smmMakMuhAdSoyad, smmMakMuhOdaSicilNo, smmMakMuhTelefon, smmMakMuhSmmBelgesi, smmMakMuhImzaSirkusu,
      smmElkMuhAdSoyad, smmElkMuhOdaSicilNo, smmElkMuhTelefon, smmElkMuhSmmBelgesi, smmElkMuhImzaSirkusu,
    });
    res.status(201).json(firma);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/firmalar/:id', async (req, res) => {
  try {
    const firma = await Firma.findById(req.params.id);
    if (!firma) return res.status(404).json({ message: 'Firma bulunamadı' });
    res.json(firma);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/firmalar/:id/kys', async (req, res) => {
  try {
    const firma = await Firma.findById(req.params.id).select('+kys');
    if (!firma) return res.status(404).json({ message: 'Firma bulunamadı' });
    res.json(firma.kys ?? null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/firmalar/:id/kys', async (req, res) => {
  try {
    const kys = req.body;
    if (!kys || typeof kys !== 'object' || Array.isArray(kys)) return res.status(400).json({ message: 'Geçersiz KYS verisi' });
    const firma = await Firma.findByIdAndUpdate(req.params.id, { $set: { kys } }, { new: true }).select('_id');
    if (!firma) return res.status(404).json({ message: 'Firma bulunamadı' });
    res.json({ ok: true, kaydedildi: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/firmalar/:id', async (req, res) => {
  try {
    const {
      ad, unvan, telefon, email, il, ilce, mahalle, postaKodu, adres, yetkili, vergiDairesi, vergiNo, belgeler,
      sanayiSicilBelgeNo, sanayiSicilBelgeTarihi, sanayiSicilDosya,
      hybBelgeNo, hybIlkVerilis, hybGecerlilik, hybDosya, isoDosya, ceBelgeleri, cihazDosyalari,
      personel, muhendisler, sgkDokumleri, kurumEvrakDosyalari,
      smmTuru, smmFirmaId, smmYil, smmSozlesme, smmKisaAd, smmUnvan, smmAdres, smmBuroTescilBelgesi,
      smmMakMuhAdSoyad, smmMakMuhOdaSicilNo, smmMakMuhTelefon, smmMakMuhSmmBelgesi, smmMakMuhImzaSirkusu,
      smmElkMuhAdSoyad, smmElkMuhOdaSicilNo, smmElkMuhTelefon, smmElkMuhSmmBelgesi, smmElkMuhImzaSirkusu,
    } = req.body ?? {};
    if (!ad || !ad.trim()) {
      return res.status(400).json({ message: 'Firma adı zorunludur' });
    }
    // undefined alanlar Mongoose tarafından güncellemeden ayıklanır —
    // yalnız gönderilen alanlar değişir (kısmi PUT)
    const firma = await Firma.findByIdAndUpdate(
      req.params.id,
      {
        ad, unvan, telefon, email, il, ilce, mahalle, postaKodu, adres, yetkili, vergiDairesi, vergiNo, belgeler,
        sanayiSicilBelgeNo, sanayiSicilBelgeTarihi, sanayiSicilDosya,
        hybBelgeNo, hybIlkVerilis, hybGecerlilik, hybDosya, isoDosya, ceBelgeleri, cihazDosyalari,
      personel, muhendisler, sgkDokumleri, kurumEvrakDosyalari,
        smmTuru, smmFirmaId, smmYil, smmSozlesme, smmKisaAd, smmUnvan, smmAdres, smmBuroTescilBelgesi,
        smmMakMuhAdSoyad, smmMakMuhOdaSicilNo, smmMakMuhTelefon, smmMakMuhSmmBelgesi, smmMakMuhImzaSirkusu,
        smmElkMuhAdSoyad, smmElkMuhOdaSicilNo, smmElkMuhTelefon, smmElkMuhSmmBelgesi, smmElkMuhImzaSirkusu,
      },
      { new: true, runValidators: true }
    );
    if (!firma) return res.status(404).json({ message: 'Firma bulunamadı' });
    res.json(firma);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/firmalar/:id', async (req, res) => {
  try {
    // Bağlı kayıt kalırsa yetim asansör/tescil/denetim oluşur — önce onlar silinmeli
    const [asansor, tescil, denetim] = await Promise.all(
      ['Asansor', 'Tescil', 'Denetim'].map((ad) => mongoose.model(ad).countDocuments({ firmaId: req.params.id }))
    );
    if (asansor || tescil || denetim) {
      const parcalar = [
        asansor && `${asansor} asansör`,
        tescil && `${tescil} tescil`,
        denetim && `${denetim} denetim`,
      ].filter(Boolean);
      return res.status(409).json({
        message: `Bu firmaya bağlı ${parcalar.join(', ')} var. Firmayı silmek için önce bunları silin.`,
      });
    }
    const firma = await Firma.findByIdAndDelete(req.params.id);
    if (!firma) return res.status(404).json({ message: 'Firma bulunamadı' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Beklenmeyen bir Promise hatası tüm API'yi düşürmesin (Node 15+ varsayılanı
// çökmektir): loglanır, süreç çalışmaya devam eder
process.on('unhandledRejection', (neden) => {
  console.error('Yakalanmamış Promise hatası:', neden instanceof Error ? neden.stack : neden);
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(`MongoDB bağlandı: ${MONGODB_URI}`);
    varsayilanlariTamamla()
      .then((n) => n && console.log(`${n} asansör kaydına varsayılan ölçüler yazıldı`))
      .catch((e) => console.error('Varsayılan ölçüler yazılamadı:', e.message));
    app.listen(PORT, () => console.log(`API hazır: http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB bağlantı hatası:', err.message);
    process.exit(1);
  });
