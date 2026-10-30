import { Router } from 'express';
import mongoose from 'mongoose';

// Asansör modeli — artidoksan1 Asansor.js'in uyarlaması (kullanıcı/rol,
// danışman snapshot'ı ve tescil dosyası alanları bu projede yok).
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

const katYuksekligiSchema = new mongoose.Schema(
  { kat: { type: Number, required: true }, yukseklik: { type: Number, required: true } },
  { _id: false }
);

const agirlikBloguSchema = new mongoose.Schema(
  { adet: { type: Number, required: true }, birimAgirlik: { type: Number, required: true } },
  { _id: false }
);

// Risk analizinde seçilen madde: katalog id'sine ek olarak metin ve resim
// snapshot'ı da saklanır (madde sonradan değişse de kayıt kendi kopyasını taşır)
const riskMaddeSecimSchema = new mongoose.Schema(
  {
    maddeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskMaddesi', default: null },
    metin: { type: String, trim: true, default: '' },
    resim: { type: dosyaSlotSchema, default: undefined },
    // Asansöre özgü ek fotoğraflar (risk durumları panelinden eklenir)
    fotolar: { type: [dosyaSlotSchema], default: [] },
  },
  { _id: false }
);

const guvenlikAksamSchema = new mongoose.Schema(
  {
    slot: {
      type: String,
      required: true,
      enum: [
        'kabin_tamponu', 'karsi_agirlik_tamponu', 'durak_kapi_kilidi', 'kabin_kapi_kilidi',
        // Çift girişli kabinlerde 2. girişin kapı kilitleri ayrı slotta tutulur
        'durak_kapi_kilidi_2', 'kabin_kapi_kilidi_2',
        'sarkac_test_raporu', 'yangin_sizdirmazlik_raporu', 'fren', 'karsi_agirlik_freni',
        'kontrol_karti', 'hiz_regulatoru', 'ucm_acop',
      ],
    },
    aksamBelgesiId: { type: mongoose.Schema.Types.ObjectId, ref: 'AksamBelgesi', required: true },
    markaSnapshot: { type: String, trim: true, default: '' },
    tip: { type: String, trim: true, default: '' },
    seriNo: { type: String, trim: true, default: '' },
    // Belgenin seçim anındaki tam bilgisi — id'ye ek olarak kaydedilir
    // (kullanıcı isteği: belge sonradan değişse de kayıt kendi kopyasını taşır).
    bilesenTipiAdi: { type: String, trim: true, default: '' },
    sertifikaNo: { type: String, trim: true, default: '' },
    belgeTipi: { type: String, trim: true, default: '' },
    gecerlilikBaslangic: { type: Date, default: null },
    gecerlilikBitis: { type: Date, default: null },
    onayliKurumNobo: { type: String, trim: true, default: '' },
    onayliKurumUnvan: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const ekBelgeSchema = new mongoose.Schema(
  { ad: { type: String, required: true, trim: true }, dosya: { type: dosyaSlotSchema, default: undefined } },
  { timestamps: true }
);

const asansorSchema = new mongoose.Schema(
  {
    firmaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firma', required: true, index: true },
    // Kimlik alanı artık seri no (kullanıcı isteği) — ruhsat no opsiyonel.
    yapiRuhsatNo: { type: String, trim: true, default: '' },
    yapiSahibiAdi: { type: String, trim: true, default: '' },
    yapiMuteahhidi: { type: String, trim: true, default: '' },
    yapiRuhsatiDosya: { type: dosyaSlotSchema, default: undefined },
    seriNo: { type: String, trim: true, default: '' },
    montajYili: { type: Number, default: null },
    abUygunlukBeyaniTarihi: { type: Date, default: null },
    il: { type: String, trim: true, default: '' },
    ilce: { type: String, trim: true, default: '' },
    mahalle: { type: String, trim: true, default: '' },
    postaKodu: { type: String, trim: true, default: '' },
    adres: { type: String, trim: true, default: '' },
    ada: { type: String, trim: true, default: '' },
    parsel: { type: String, trim: true, default: '' },
    tahrikTipi: { type: String, enum: ['elektrikli', 'hidrolik', null], default: null },
    sinif: { type: String, enum: ['insan_ve_yuk', 'yuk', null], default: null },
    makinaKonumu: { type: String, enum: ['MR', 'MRL', null], default: null },
    askiTipi: { type: String, enum: ['1:1', '2:1', '3:1', '4:1', null], default: null },
    durakSayisi: { type: Number, default: null },
    katSayisi: { type: Number, default: null },
    beyanYuku: { type: Number, default: null },
    kisiSayisi: { type: Number, default: null },
    hiz: { type: Number, enum: [0.3, 0.4, 0.5, 0.6, 0.63, 0.8, 1.0, 1.2, 1.25, 1.6, 2.0, 2.5, 3.0, null], default: null },
    kabinGenislik: { type: Number, default: null },
    kabinDerinlik: { type: Number, default: null },
    kabinYukseklik: { type: Number, default: null },
    halatAdet: { type: Number, default: null },
    halatTipi: { type: String, trim: true, default: '' },
    tahrikKasnakCapi: { type: Number, default: null },
    palangaCaplari: { type: Number, default: null },
    // Halat & Kasnaklar şeması alanları (artidoksan1 güncel modeli)
    halatSapturmaKasnagiCapi: { type: Number, default: null },
    halatPalanga1Capi: { type: Number, default: null },
    halatPalanga2Capi: { type: Number, default: null },
    halatPalanga3Capi: { type: Number, default: null },
    halatSekli: { type: String, enum: ['celik_halat', 'kayis', 'kompozit_halat', null], default: null },
    // Ray Ölçüleri şeması: RR = ray–ray arası, RK = ray–kapı arası
    rayRR: { type: Number, default: null },
    rayRK: { type: Number, default: null },
    // Kuyu Dip Alanı şeması
    kuyuDipBosluk: { type: Number, default: null },
    kuyuDipTamponStroke: { type: Number, default: null },
    kuyuDipKarsiBosluk: { type: Number, default: null },
    kuyuDipKarsiStroke: { type: Number, default: null },
    kuyuDipDurmaAlani: { type: String, enum: ['50x70x100', '40x50x200', '70x100x50', null], default: null },
    // Kuyu Üst Alanı şeması
    kuyuUstKorkulukMesafe: { type: Number, default: null },
    kuyuUstKorkulukYuksekligi: { type: Number, default: null },
    kuyuUstSuspansiyonMesafe: { type: Number, default: null },
    kuyuUstKabinUstDurma: { type: Number, default: null },
    kuyuUstSonKat: { type: Number, default: null },
    kuyuUstDurmaAlani: { type: String, enum: ['50x70x100', '40x50x100', null], default: null },
    askiHalatArasiMesafe: { type: Number, default: null },
    palangaHalatArasiMesafe: { type: Number, default: null },
    kasnaklarArasiYatayMesafe: { type: Number, default: null },
    kasnaklarArasiDikeyMesafe: { type: Number, default: null },
    sarimAcisi: { type: Number, default: null },
    regulatorKonumu: { type: String, enum: ['sol-on', 'sol-arka', 'sag-on', 'sag-arka'], default: 'sag-arka' },
    karsiAgirlikKonumu: { type: String, enum: ['arka', 'sol', 'sag'], default: 'arka' },
    kabinPalangaKonumu: { type: String, enum: ['yok', 'kabin-ustu', 'kabin-alti'], default: 'yok' },
    kabinRayTipi: {
      type: String,
      enum: ['T140/B', 'T140-2/B', 'T127/B', 'T125/B', 'T90/B', 'T89/B', 'T82/B', 'T70/B', 'T50/B', 'T90/A', 'T89/A', 'T82/A', 'T70/A', 'T50/A'],
      default: 'T89/B',
    },
    kabinRayArasi: { type: Number, default: null },
    karsiAgirlikRayTipi: {
      type: String,
      enum: ['T127/B', 'T125/B', 'T90/B', 'T89/B', 'T82/B', 'T70/B', 'T50/B', 'T90/A', 'T89/A', 'T82/A', 'T70/A', 'T50/A'],
      default: 'T50/A',
    },
    karsiAgirlikRayArasi: { type: Number, default: null },
    kabinRayDurakKapisiArasi: { type: Number, default: null },
    kabinRayKarsiAgirlikRayArasi: { type: Number, default: null },
    karsiAgirlikRayDurakKapisiArasi: { type: Number, default: null },
    kuyuDipYukseklik: { type: Number, default: null },
    // Kabin en alt konumdayken kabin alt noktasının kuyu tabanına mesafesi (mm)
    kuyuDipKabinEnAltNokta: { type: Number, default: null },
    // Kabin eşiği altındaki etek sacı ucunun kuyu tabanına mesafesi (mm)
    kuyuDipEtekSaciTabanMesafe: { type: Number, default: null },
    // (iv) ölçüsü: kabin altı ile kuyudaki en yüksek ekipman (gergi kasnağı)
    // arasındaki dikey mesafe (mm)
    kuyuDipIvOlcusu: { type: Number, default: null },
    // Makine dairesi (MR) ölçüleri (mm)
    makineDairesiCalismaYuksekligi: { type: Number, default: null },
    makineDairesiGecisYuksekligi: { type: Number, default: null },
    makineDairesiKapiYuksekligi: { type: Number, default: null },
    // Makine dairesi risk analizinde seçilen maddeler (id + snapshot)
    makineDairesiRiskMaddeleri: { type: [riskMaddeSecimSchema], default: [] },
    // Kuyu üstü risk analizinde seçilen maddeler (id + snapshot)
    kuyuUstuRiskMaddeleri: { type: [riskMaddeSecimSchema], default: [] },
    // Kuyu dibi risk analizinde seçilen maddeler (id + snapshot)
    kuyuDibiRiskMaddeleri: { type: [riskMaddeSecimSchema], default: [] },
    katYukseklikleri: { type: [katYuksekligiSchema], default: [] },
    sonKatYukseklik: { type: Number, default: null },
    seyirMesafesi: { type: Number, default: null },
    kuyuBoyu: { type: Number, default: null },
    kuyuGenislik: { type: Number, default: null },
    kuyuDerinlik: { type: Number, default: null },
    karkasAgirligi: { type: Number, default: null },
    agirlikBloklari: { type: [agirlikBloguSchema], default: [] },
    karsiAgirlik: { type: Number, default: null },
    kabinAgirligi: { type: Number, default: null },
    kabinGirisTipi: { type: String, enum: ['tek', 'cift'], default: 'tek' },
    giris1KapiGenislik: { type: Number, default: null },
    giris1KapiYukseklik: { type: Number, default: null },
    giris1KapiAdet: { type: Number, default: null },
    giris1PanelSayisi: { type: Number, enum: [2, 3, 4, 5, null], default: null },
    giris1KapiYonu: { type: String, enum: ['sag', 'sol', 'merkezi', null], default: null },
    giris1Konum: { type: String, enum: ['on', 'arka', 'sol', 'sag'], default: 'on' },
    giris2KapiGenislik: { type: Number, default: null },
    giris2KapiYukseklik: { type: Number, default: null },
    giris2KapiAdet: { type: Number, default: null },
    giris2PanelSayisi: { type: Number, enum: [2, 3, 4, 5, null], default: null },
    giris2KapiYonu: { type: String, enum: ['sag', 'sol', 'merkezi', null], default: null },
    giris2Konum: { type: String, enum: ['on', 'arka', 'sol', 'sag', null], default: null },
    giris2Duraklar: { type: [Number], default: [] },
    // Kapı yüksekliği 2000 mm altındaysa düşük kapının bulunduğu duraklar
    giris1DusukKapiDuraklari: { type: [Number], default: [] },
    giris2DusukKapiDuraklari: { type: [Number], default: [] },
    // Kapı paneli malzemesi (giriş başına); cam seçilirse cam belgesi yüklenir
    giris1PanelMalzemesi: { type: String, enum: ['paslanmaz', 'cam', null], default: null },
    giris2PanelMalzemesi: { type: String, enum: ['paslanmaz', 'cam', null], default: null },
    giris1CamBelgesi: { type: dosyaSlotSchema, default: undefined },
    giris2CamBelgesi: { type: dosyaSlotSchema, default: undefined },
    // Kapı montaj fotoğrafları (giriş başına)
    giris1KapiFotolari: { type: [dosyaSlotSchema], default: [] },
    giris2KapiFotolari: { type: [dosyaSlotSchema], default: [] },
    // Kabin paneli malzemesi; cam seçilirse cam belgesi yüklenir + fotoğraflar
    kabinPanelMalzemesi: { type: String, enum: ['paslanmaz', 'cam', null], default: null },
    kabinCamBelgesi: { type: dosyaSlotSchema, default: undefined },
    kabinFotolari: { type: [dosyaSlotSchema], default: [] },
    motorAksamBelgesiId: { type: mongoose.Schema.Types.ObjectId, ref: 'AksamBelgesi', default: null },
    motorMarkaSnapshot: { type: String, trim: true, default: '' },
    motorTip: { type: String, trim: true, default: '' },
    motorSeriNo: { type: String, trim: true, default: '' },
    motorRpm: { type: Number, default: null },
    motorGucKw: { type: Number, default: null },
    motorTahvilOrani: { type: String, trim: true, default: '' },
    // Motor popup'ı: dişli tipi seçimi + montaj fotoğrafları
    motorDisliTipi: { type: String, enum: ['dislisiz', 'dislili', null], default: null },
    motorFotolari: { type: [dosyaSlotSchema], default: [] },
    halatMarka: { type: String, trim: true, default: '' },
    rayMarka: { type: String, trim: true, default: '' },
    kapiPanelleriMarka: { type: String, trim: true, default: '' },
    kapiPanelleriMarka2: { type: String, trim: true, default: '' },
    ekBelgeler: { type: [ekBelgeSchema], default: [] },
    // Durak/kabin kapı kilidi montaj fotoğrafları (1. ve 2. giriş ayrı)
    durakKilitFotolari: { type: [dosyaSlotSchema], default: [] },
    durakKilitFotolari2: { type: [dosyaSlotSchema], default: [] },
    kabinKilitFotolari: { type: [dosyaSlotSchema], default: [] },
    kabinKilitFotolari2: { type: [dosyaSlotSchema], default: [] },
    // Tampon montaj fotoğrafları (kabin altı / karşı ağırlık altı)
    kabinTamponFotolari: { type: [dosyaSlotSchema], default: [] },
    karsiAgirlikTamponFotolari: { type: [dosyaSlotSchema], default: [] },
    // Fren: kabin fren konumu + karşı ağırlık freni var/yok ve konumu
    frenKonumu: { type: String, enum: ['kabin-alti', 'kabin-ustu', null], default: null },
    karsiAgirlikFrenVar: { type: Boolean, default: false },
    karsiAgirlikFrenKonumu: { type: String, enum: ['alt', 'ust', null], default: null },
    // Fren montaj fotoğrafları
    frenFotolari: { type: [dosyaSlotSchema], default: [] },
    karsiAgirlikFrenFotolari: { type: [dosyaSlotSchema], default: [] },
    // Hız regülatörü: devreye girme hızı (m/s) + montaj fotoğrafları
    regulatorDevreyeGirmeHizi: { type: Number, default: null },
    hizRegulatoruFotolari: { type: [dosyaSlotSchema], default: [] },
    // Kontrol kartı montaj fotoğrafları
    kontrolKartiFotolari: { type: [dosyaSlotSchema], default: [] },
    // UCM/ACOP: çözüm türü (kart + motor freni / kart + hız regülatörü + fren)
    // + montaj fotoğrafları
    ucmAcopTuru: { type: String, enum: ['kart-motor-fren', 'kart-reg-fren', null], default: null },
    ucmAcopFotolari: { type: [dosyaSlotSchema], default: [] },
    guvenlikAksamlari: { type: [guvenlikAksamSchema], default: [] },
    kabinTamponAdedi: { type: Number, default: null },
    karsiAgirlikTamponAdedi: { type: Number, default: null },
    kabinIciAydinlatma: { type: Number, default: null },
    kabinUstuAydinlatma: { type: Number, default: null },
    kuyuDibiAydinlatma: { type: Number, default: null },
    makineAlaniAydinlatma: { type: Number, default: null },
    ucmAcopHizRegulatoruFrenIle: { type: Boolean, default: false },
    // SMM firması: Ayarlar > SMM Firmaları havuzundan seçilir; seçim anındaki
    // bilgiler olduğu gibi kopyalanır (havuz kaydı sonradan değişse de asansör
    // kendi snapshot'ını taşır).
    smmFirmaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmFirmasi', default: null },
    smmYil: { type: Number, default: null },
    smmKisaAd: { type: String, trim: true, default: '' },
    smmUnvan: { type: String, trim: true, default: '' },
    smmAdres: { type: String, trim: true, default: '' },
    smmBuroTescilBelgesi: { type: dosyaSlotSchema, default: null },
    smmMakMuhAdSoyad: { type: String, trim: true, default: '' },
    smmMakMuhOdaSicilNo: { type: String, trim: true, default: '' },
    smmMakMuhTelefon: { type: String, trim: true, default: '' },
    smmMakMuhSmmBelgesi: { type: dosyaSlotSchema, default: null },
    smmMakMuhImzaSirkusu: { type: dosyaSlotSchema, default: null },
    smmElkMuhAdSoyad: { type: String, trim: true, default: '' },
    smmElkMuhOdaSicilNo: { type: String, trim: true, default: '' },
    smmElkMuhTelefon: { type: String, trim: true, default: '' },
    smmElkMuhSmmBelgesi: { type: dosyaSlotSchema, default: null },
    smmElkMuhImzaSirkusu: { type: dosyaSlotSchema, default: null },
  },
  { timestamps: true, collection: 'asansorler' }
);

export const Asansor = mongoose.model('Asansor', asansorSchema);

// İstemciden gelen gövdeden model dışı anahtarları ayıklar (strict şema
// zaten bilinmeyenleri atar; _id/timestamps elle temizlenir).
function temizle(body) {
  const { _id, createdAt, updatedAt, __v, ...veri } = body ?? {};
  return veri;
}

const router = Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.firmaId) filter.firmaId = String(req.query.firmaId);
    if (req.query.search) {
      const q = String(req.query.search);
      filter.$or = [
        { yapiRuhsatNo: { $regex: q, $options: 'i' } },
        { seriNo: { $regex: q, $options: 'i' } },
        { yapiSahibiAdi: { $regex: q, $options: 'i' } },
        { il: { $regex: q, $options: 'i' } },
        { ilce: { $regex: q, $options: 'i' } },
      ];
    }
    const asansorler = await Asansor.find(filter)
      .sort({ createdAt: -1 })
      .populate('firmaId', 'ad')
      .lean();
    res.json(asansorler);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const asansor = await Asansor.findById(req.params.id).lean();
    if (!asansor) return res.status(404).json({ message: 'Asansör bulunamadı' });
    res.json(asansor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const veri = temizle(req.body);
    if (!veri.firmaId) return res.status(400).json({ message: 'Firma seçimi zorunludur' });
    if (!veri.seriNo || !String(veri.seriNo).trim()) {
      return res.status(400).json({ message: 'Asansör seri no zorunludur' });
    }
    const asansor = await Asansor.create(veri);
    res.status(201).json(asansor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const veri = temizle(req.body);
    // Kısmi güncelleme (örn. şema modalı kapanınca tek bölüm kaydı) destekli:
    // zorunlu alanlar yalnızca gövdede GÖNDERİLDİYSE boş olamaz.
    if ('firmaId' in veri && !veri.firmaId) {
      return res.status(400).json({ message: 'Firma seçimi zorunludur' });
    }
    if ('seriNo' in veri && (!veri.seriNo || !String(veri.seriNo).trim())) {
      return res.status(400).json({ message: 'Asansör seri no zorunludur' });
    }
    const asansor = await Asansor.findByIdAndUpdate(req.params.id, veri, {
      new: true,
      runValidators: true,
    });
    if (!asansor) return res.status(404).json({ message: 'Asansör bulunamadı' });
    res.json(asansor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const asansor = await Asansor.findByIdAndDelete(req.params.id);
    if (!asansor) return res.status(404).json({ message: 'Asansör bulunamadı' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
