import { request } from './api';
import type { BelgeSlot } from './dosyaService';

export interface KatYuksekligi {
  kat: number;
  yukseklik: number;
}

export interface AgirlikBlogu {
  adet: number;
  birimAgirlik: number;
}

export interface GuvenlikAksami {
  slot: string;
  aksamBelgesiId: string;
  markaSnapshot: string;
  tip: string;
  seriNo: string;
  // Belgenin seçim anındaki tam bilgisi (id'ye ek olarak kaydedilir)
  bilesenTipiAdi?: string;
  sertifikaNo?: string;
  belgeTipi?: string;
  gecerlilikBaslangic?: string | null;
  gecerlilikBitis?: string | null;
  onayliKurumNobo?: string;
  onayliKurumUnvan?: string;
}

export interface AsansorEkBelge {
  _id?: string;
  ad: string;
  dosya?: BelgeSlot;
}

// Liste yanıtında firmaId populate edilir
export interface FirmaOzet {
  _id: string;
  ad: string;
}

export interface Asansor {
  _id: string;
  firmaId: string | FirmaOzet;
  yapiRuhsatNo: string;
  yapiSahibiAdi: string;
  yapiMuteahhidi: string;
  yapiRuhsatiDosya?: BelgeSlot | null;
  seriNo: string;
  montajYili: number | null;
  abUygunlukBeyaniTarihi: string | null;
  il: string;
  ilce: string;
  mahalle: string;
  postaKodu: string;
  adres: string;
  ada: string;
  parsel: string;
  tahrikTipi: 'elektrikli' | 'hidrolik' | null;
  sinif: 'insan_ve_yuk' | 'yuk' | null;
  makinaKonumu: 'MR' | 'MRL' | null;
  askiTipi: '1:1' | '2:1' | '3:1' | '4:1' | null;
  durakSayisi: number | null;
  katSayisi: number | null;
  beyanYuku: number | null;
  kisiSayisi: number | null;
  hiz: number | null;
  kabinGenislik: number | null;
  kabinDerinlik: number | null;
  kabinYukseklik: number | null;
  halatAdet: number | null;
  halatTipi: string;
  tahrikKasnakCapi: number | null;
  palangaCaplari: number | null;
  halatSapturmaKasnagiCapi: number | null;
  halatPalanga1Capi: number | null;
  halatPalanga2Capi: number | null;
  halatPalanga3Capi: number | null;
  halatSekli: 'celik_halat' | 'kayis' | 'kompozit_halat' | null;
  rayRR: number | null;
  rayRK: number | null;
  kuyuDipBosluk: number | null;
  kuyuDipTamponStroke: number | null;
  kuyuDipKarsiBosluk: number | null;
  kuyuDipKarsiStroke: number | null;
  kuyuDipDurmaAlani: string | null;
  kuyuUstKorkulukMesafe: number | null;
  kuyuUstKorkulukYuksekligi: number | null;
  kuyuUstSuspansiyonMesafe: number | null;
  kuyuUstKabinUstDurma: number | null;
  kuyuUstSonKat: number | null;
  kuyuUstDurmaAlani: string | null;
  askiHalatArasiMesafe: number | null;
  palangaHalatArasiMesafe: number | null;
  kasnaklarArasiYatayMesafe: number | null;
  kasnaklarArasiDikeyMesafe: number | null;
  sarimAcisi: number | null;
  regulatorKonumu: string;
  karsiAgirlikKonumu: string;
  kabinPalangaKonumu: string;
  kabinRayTipi: string;
  kabinRayArasi: number | null;
  karsiAgirlikRayTipi: string;
  karsiAgirlikRayArasi: number | null;
  kabinRayDurakKapisiArasi: number | null;
  kabinRayKarsiAgirlikRayArasi: number | null;
  karsiAgirlikRayDurakKapisiArasi: number | null;
  kuyuDipYukseklik: number | null;
  // Kabin en alt konumdayken kabin alt noktasının kuyu tabanına mesafesi (mm)
  kuyuDipKabinEnAltNokta: number | null;
  // Kabin eşiği altındaki etek sacı ucunun kuyu tabanına mesafesi (mm)
  kuyuDipEtekSaciTabanMesafe: number | null;
  // (iv) ölçüsü: kabin altı ile kuyudaki en yüksek ekipman (gergi kasnağı)
  // arasındaki dikey mesafe (mm)
  kuyuDipIvOlcusu: number | null;
  // Makine dairesi (MR) ölçüleri (mm)
  makineDairesiCalismaYuksekligi: number | null;
  makineDairesiGecisYuksekligi: number | null;
  makineDairesiKapiYuksekligi: number | null;
  // Makine dairesi risk analizinde seçilen maddeler (id + snapshot + fotolar)
  makineDairesiRiskMaddeleri: {
    maddeId: string | null;
    metin: string;
    resim?: BelgeSlot | null;
    fotolar?: BelgeSlot[];
  }[];
  // Kuyu üstü risk analizinde seçilen maddeler (id + snapshot + fotolar)
  kuyuUstuRiskMaddeleri: {
    maddeId: string | null;
    metin: string;
    resim?: BelgeSlot | null;
    fotolar?: BelgeSlot[];
  }[];
  // Kuyu dibi risk analizinde seçilen maddeler (id + snapshot + fotolar)
  kuyuDibiRiskMaddeleri: {
    maddeId: string | null;
    metin: string;
    resim?: BelgeSlot | null;
    fotolar?: BelgeSlot[];
  }[];
  katYukseklikleri: KatYuksekligi[];
  sonKatYukseklik: number | null;
  seyirMesafesi: number | null;
  kuyuBoyu: number | null;
  kuyuGenislik: number | null;
  kuyuDerinlik: number | null;
  karkasAgirligi: number | null;
  agirlikBloklari: AgirlikBlogu[];
  karsiAgirlik: number | null;
  kabinAgirligi: number | null;
  kabinGirisTipi: 'tek' | 'cift';
  giris1KapiGenislik: number | null;
  giris1KapiYukseklik: number | null;
  giris1KapiAdet: number | null;
  giris1PanelSayisi: number | null;
  giris1KapiYonu: string | null;
  giris1Konum: string;
  giris2KapiGenislik: number | null;
  giris2KapiYukseklik: number | null;
  giris2KapiAdet: number | null;
  giris2PanelSayisi: number | null;
  giris2KapiYonu: string | null;
  giris2Konum: string | null;
  giris2Duraklar: number[];
  // Kapı yüksekliği 2000 mm altındaysa düşük kapının bulunduğu duraklar
  giris1DusukKapiDuraklari: number[];
  giris2DusukKapiDuraklari: number[];
  // Kapı paneli malzemesi (giriş başına); cam seçilirse cam belgesi yüklenir
  giris1PanelMalzemesi: 'paslanmaz' | 'cam' | null;
  giris2PanelMalzemesi: 'paslanmaz' | 'cam' | null;
  giris1CamBelgesi?: BelgeSlot | null;
  giris2CamBelgesi?: BelgeSlot | null;
  // Kapı montaj fotoğrafları (giriş başına)
  giris1KapiFotolari: BelgeSlot[];
  giris2KapiFotolari: BelgeSlot[];
  // Kabin paneli malzemesi; cam seçilirse cam belgesi + fotoğraflar
  kabinPanelMalzemesi: 'paslanmaz' | 'cam' | null;
  kabinCamBelgesi?: BelgeSlot | null;
  kabinFotolari: BelgeSlot[];
  motorAksamBelgesiId: string | null;
  motorMarkaSnapshot: string;
  motorTip: string;
  motorSeriNo: string;
  motorRpm: number | null;
  motorGucKw: number | null;
  motorTahvilOrani: string;
  // Motor popup'ı: dişli tipi seçimi + montaj fotoğrafları
  motorDisliTipi: 'dislisiz' | 'dislili' | null;
  motorFotolari: BelgeSlot[];
  halatMarka: string;
  rayMarka: string;
  kapiPanelleriMarka: string;
  kapiPanelleriMarka2: string;
  ekBelgeler: AsansorEkBelge[];
  // Kurum evrakları: serbest dosya/fotoğraf listesi (yükleme hep sona ekler)
  kurumEvraklari?: BelgeSlot[];
  // Bölüm modallarının fotoğraf alanları (dosya seçme + kamera)
  duraklarFotolari?: BelgeSlot[];
  kuyuDipFotolari?: BelgeSlot[];
  rayFotolari?: BelgeSlot[];
  kuyuUstFotolari?: BelgeSlot[];
  agirlikFotolari?: BelgeSlot[];
  halatKasnakFotolari?: BelgeSlot[];
  makineDairesiFotolari?: BelgeSlot[];
  // Durak/kabin kapı kilidi montaj fotoğrafları (1. ve 2. giriş ayrı)
  durakKilitFotolari: BelgeSlot[];
  durakKilitFotolari2: BelgeSlot[];
  kabinKilitFotolari: BelgeSlot[];
  kabinKilitFotolari2: BelgeSlot[];
  // Tampon montaj fotoğrafları (kabin altı / karşı ağırlık altı)
  kabinTamponFotolari: BelgeSlot[];
  karsiAgirlikTamponFotolari: BelgeSlot[];
  // Fren: kabin fren konumu + karşı ağırlık freni var/yok ve konumu
  frenKonumu: 'kabin-alti' | 'kabin-ustu' | null;
  karsiAgirlikFrenVar: boolean;
  karsiAgirlikFrenKonumu: 'alt' | 'ust' | null;
  frenFotolari: BelgeSlot[];
  karsiAgirlikFrenFotolari: BelgeSlot[];
  // Hız regülatörü: devreye girme hızı (m/s) + montaj fotoğrafları
  regulatorDevreyeGirmeHizi: number | null;
  hizRegulatoruFotolari: BelgeSlot[];
  // Kontrol kartı montaj fotoğrafları
  kontrolKartiFotolari: BelgeSlot[];
  // UCM/ACOP: çözüm türü + montaj fotoğrafları
  ucmAcopTuru: 'kart-motor-fren' | 'kart-reg-fren' | null;
  ucmAcopFotolari: BelgeSlot[];
  guvenlikAksamlari: GuvenlikAksami[];
  kabinTamponAdedi: number | null;
  karsiAgirlikTamponAdedi: number | null;
  kabinIciAydinlatma: number | null;
  kabinUstuAydinlatma: number | null;
  kuyuDibiAydinlatma: number | null;
  makineAlaniAydinlatma: number | null;
  ucmAcopHizRegulatoruFrenIle: boolean;
  // SMM firması: havuzdan (Ayarlar > SMM Firmaları) seçilir, bilgiler
  // olduğu gibi snapshot olarak kopyalanır
  smmFirmaId: string | null;
  smmYil: number | null;
  smmKisaAd: string;
  smmUnvan: string;
  smmAdres: string;
  smmBuroTescilBelgesi?: BelgeSlot | null;
  smmMakMuhAdSoyad: string;
  smmMakMuhOdaSicilNo: string;
  smmMakMuhTelefon: string;
  smmMakMuhSmmBelgesi?: BelgeSlot | null;
  smmMakMuhImzaSirkusu?: BelgeSlot | null;
  smmElkMuhAdSoyad: string;
  smmElkMuhOdaSicilNo: string;
  smmElkMuhTelefon: string;
  smmElkMuhSmmBelgesi?: BelgeSlot | null;
  smmElkMuhImzaSirkusu?: BelgeSlot | null;
  createdAt: string;
  updatedAt: string;
}

export type YeniAsansor = Partial<Omit<Asansor, '_id' | 'createdAt' | 'updatedAt' | 'firmaId'>> & {
  firmaId: string;
};

// Kısmi güncelleme — şema modalı kapanınca tek bölümün alanları gönderilir,
// firmaId zorunlu değildir (backend yalnızca gönderilen alanları doğrular).
export type AsansorGuncelleme = Partial<Omit<Asansor, '_id' | 'createdAt' | 'updatedAt' | 'firmaId'>> & {
  firmaId?: string;
};

export function getAsansorler(params?: { firmaId?: string; search?: string }): Promise<Asansor[]> {
  const p = new URLSearchParams();
  if (params?.firmaId) p.set('firmaId', params.firmaId);
  if (params?.search) p.set('search', params.search);
  const q = p.toString();
  return request<Asansor[]>(`/asansorler${q ? `?${q}` : ''}`);
}

export function getAsansor(id: string): Promise<Asansor> {
  return request<Asansor>(`/asansorler/${id}`);
}

export function createAsansor(data: YeniAsansor): Promise<Asansor> {
  return request<Asansor>('/asansorler', { method: 'POST', body: JSON.stringify(data) });
}

export function updateAsansor(id: string, data: AsansorGuncelleme): Promise<Asansor> {
  return request<Asansor>(`/asansorler/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteAsansor(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/asansorler/${id}`, { method: 'DELETE' });
}
