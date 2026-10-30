import type { BelgeSlot } from '@/services/dosyaService';

// KapiKilitleriModal'ın paylaşılan tipleri (script setup export edemediği için
// ayrı dosyada) — AksamBelgesi bu arayüzü yapısal olarak karşılar.
export interface KilitBelgeSecenek {
  _id: string;
  marka: string;
  sertifikaNo?: string;
  tipler: string[];
  bilesenTipiAdi?: string;
  belgeTipi?: string;
  gecerlilikBaslangic?: string | null;
  gecerlilikBitis?: string | null;
  onayliKurumNobo?: string;
  onayliKurumUnvan?: string;
  dosya?: { dosyaAdi: string; dosyaAnahtari: string; mimeType: string };
}

// Marka tekil seçilir (aynı markanın birden çok sertifikası tek satır görünür);
// tip, markanın tüm belgelerinin tipler[] birleşiminden seçilir. Kayıtta belge,
// marka + tip eşleşmesinden çözülür.
export interface KapiGiris {
  durakMarka: string | null;
  durakTip: string | null;
  durakSeriNolar: { deger: string }[];
  durakFotolar: BelgeSlot[];
  kabinMarka: string | null;
  kabinTip: string | null;
  kabinSeriNo: string;
  kabinFotolar: BelgeSlot[];
}

// Tamponlar modalının bölüm durumu (kabin tamponu / karşı ağırlık tamponu):
// adet girilir, adet kadar Marka/Tip/Seri No satırı oluşur + montaj fotoğrafları.
export interface TamponBolum {
  adet: number | '' | null;
  satirlar: { marka: string | null; tip: string | null; seriNo: string }[];
  fotolar: BelgeSlot[];
}

// Fren modalının bölüm durumları: kabin freni (konum: kabin altı/üstü) ve
// karşı ağırlık freni (var/yok radio; varsa marka/tip/seri + alt/üst konum).
export interface FrenKabin {
  marka: string | null;
  tip: string | null;
  seriNo: string;
  konum: 'kabin-alti' | 'kabin-ustu' | null;
  fotolar: BelgeSlot[];
}

// Hız regülatörü / kontrol kartı gibi tek satırlı aksam bölümleri:
// marka/tip/seri + montaj fotoğrafları (AksamModal).
export interface AksamBolum {
  marka: string | null;
  tip: string | null;
  seriNo: string;
  fotolar: BelgeSlot[];
}

// Duraklar modalının satırı: durak numarası + durak arası mesafe (mm).
export interface DurakSatiri {
  kat: number | '' | null;
  yukseklik: number | '' | null;
}

// Kapı ve Ölçüleri modalının giriş başına durumu: panel sayısı (2/3/4),
// yön ('merkezi' = merkezi kapı; 'sag'/'sol' = teleskopik yönü) ve ölçüler.
export interface KapiOlcum {
  panel: number;
  yon: 'sag' | 'sol' | 'merkezi' | null;
  genislik: number | '' | null;
  yukseklik: number | '' | null;
  // Yükseklik 2000 mm altındaysa düşük kapının bulunduğu duraklar seçilir
  riskDuraklar: number[];
  panelMalzemesi: 'paslanmaz' | 'cam' | null;
  camBelgesi: BelgeSlot | null;
  fotolar: BelgeSlot[];
}

// Motor modalının durumu: dişlisiz/dişlili seçimi, marka/tip/seri,
// güç (kW) ve rpm; dişlilide ek ratio (tahvil oranı) + montaj fotoğrafları.
export interface MotorBilgi {
  disliTipi: 'dislisiz' | 'dislili';
  marka: string | null;
  tip: string | null;
  seriNo: string;
  gucKw: number | '' | null;
  rpm: number | '' | null;
  ratio: string;
  fotolar: BelgeSlot[];
}

export interface FrenKarsiAgirlik {
  var: boolean;
  marka: string | null;
  tip: string | null;
  seriNo: string;
  konum: 'alt' | 'ust' | null;
  fotolar: BelgeSlot[];
}

// Markaya ait belgelerden tipi içeren ilk belge (tip yoksa ilk belge) — modal
// görüntüleme ile kayıt tarafı aynı çözümü kullanır.
export function kilitBelgesiBul<T extends KilitBelgeSecenek>(
  belgeler: T[],
  marka: string | null,
  tip: string | null
): T | null {
  if (!marka) return null;
  const adaylar = belgeler.filter((b) => b.marka === marka);
  return adaylar.find((b) => !!tip && b.tipler.includes(tip)) ?? adaylar[0] ?? null;
}
