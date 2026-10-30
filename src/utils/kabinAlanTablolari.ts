// TS EN 81-20 — Çizelge 6 (Beyan yükü ve kabinin azami kullanılabilir net
// alanı) ve Çizelge 8 (İnsan sayısı ve kabinin azami kullanılabilir alanı).
// Kabin Ölçüleri şemasında girilen Genişlik×Derinlik'ten hesaplanan kabin
// alanının hangi kapasite/kişi sayısı aralığına denk geldiğini bulmak için
// kullanılır (artidoksan1'den birebir taşındı).

export interface AlanTabloSatiri {
  deger: number;
  alan: number;
}

// Çizelge 6 — Beyan yükü (kg) → kabinin azami kullanılabilir (net) alanı (m²).
// 2500 kg sonrası her ilave 100 kg için 0,16 m² eklenir (dipnot c).
export const beyanYukuAlanTablosu: AlanTabloSatiri[] = [
  { deger: 100, alan: 0.37 },
  { deger: 180, alan: 0.58 },
  { deger: 225, alan: 0.7 },
  { deger: 300, alan: 0.9 },
  { deger: 375, alan: 1.1 },
  { deger: 400, alan: 1.17 },
  { deger: 450, alan: 1.3 },
  { deger: 525, alan: 1.45 },
  { deger: 600, alan: 1.6 },
  { deger: 630, alan: 1.66 },
  { deger: 675, alan: 1.75 },
  { deger: 750, alan: 1.9 },
  { deger: 800, alan: 2.0 },
  { deger: 825, alan: 2.05 },
  { deger: 900, alan: 2.2 },
  { deger: 975, alan: 2.35 },
  { deger: 1000, alan: 2.4 },
  { deger: 1050, alan: 2.5 },
  { deger: 1125, alan: 2.65 },
  { deger: 1200, alan: 2.8 },
  { deger: 1250, alan: 2.9 },
  { deger: 1275, alan: 2.95 },
  { deger: 1350, alan: 3.1 },
  { deger: 1425, alan: 3.25 },
  { deger: 1500, alan: 3.4 },
  { deger: 1600, alan: 3.56 },
  { deger: 2000, alan: 4.2 },
  { deger: 2500, alan: 5.0 },
];
const BEYAN_YUKU_ILAVE_KG = 100;
const BEYAN_YUKU_ILAVE_ALAN = 0.16;

// Çizelge 8 — İnsan sayısı → kabinin azami kullanılabilir alanı (m²).
// 20 kişi sonrası her ilave kişi için 0,115 m² eklenir.
export const insanSayisiAlanTablosu: AlanTabloSatiri[] = [
  { deger: 1, alan: 0.28 },
  { deger: 2, alan: 0.49 },
  { deger: 3, alan: 0.6 },
  { deger: 4, alan: 0.79 },
  { deger: 5, alan: 0.98 },
  { deger: 6, alan: 1.17 },
  { deger: 7, alan: 1.31 },
  { deger: 8, alan: 1.45 },
  { deger: 9, alan: 1.59 },
  { deger: 10, alan: 1.73 },
  { deger: 11, alan: 1.87 },
  { deger: 12, alan: 2.01 },
  { deger: 13, alan: 2.15 },
  { deger: 14, alan: 2.29 },
  { deger: 15, alan: 2.43 },
  { deger: 16, alan: 2.57 },
  { deger: 17, alan: 2.71 },
  { deger: 18, alan: 2.85 },
  { deger: 19, alan: 2.99 },
  { deger: 20, alan: 3.13 },
];
const INSAN_SAYISI_ILAVE_KISI = 1;
const INSAN_SAYISI_ILAVE_ALAN = 0.115;

export interface AlanAraligi {
  // Hesaplanan alan tablonun ilk satırından küçükse alt sınır yoktur (null).
  alt: number | null;
  ust: number;
}

// Verilen kabin alanının (m²) tabloda hangi iki satır arasına denk geldiğini
// bulur — tablo sınırını aşan alanlar için ilave kg/kişi formülüyle üst
// sınır genişletilir.
export function alanAraligiBul(
  tablo: AlanTabloSatiri[],
  alan: number,
  ilaveDeger: number,
  ilaveAlan: number
): AlanAraligi {
  if (alan <= tablo[0].alan) {
    return { alt: null, ust: tablo[0].deger };
  }
  for (let i = 0; i < tablo.length - 1; i++) {
    if (alan > tablo[i].alan && alan <= tablo[i + 1].alan) {
      return { alt: tablo[i].deger, ust: tablo[i + 1].deger };
    }
  }
  const son = tablo[tablo.length - 1];
  const asimAdedi = Math.ceil((alan - son.alan) / ilaveAlan);
  return { alt: son.deger, ust: son.deger + asimAdedi * ilaveDeger };
}

export function beyanYukuAraligiBul(alan: number): AlanAraligi {
  return alanAraligiBul(beyanYukuAlanTablosu, alan, BEYAN_YUKU_ILAVE_KG, BEYAN_YUKU_ILAVE_ALAN);
}

export function insanSayisiAraligiBul(alan: number): AlanAraligi {
  return alanAraligiBul(insanSayisiAlanTablosu, alan, INSAN_SAYISI_ILAVE_KISI, INSAN_SAYISI_ILAVE_ALAN);
}
