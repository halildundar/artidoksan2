// Asansör ön bilgi formunun (AsansorOnBilgiPage) sabit seçenek listeleri ve
// detay sayfasında (AsansorDetayPage) kullanılan değer→etiket haritaları —
// artidoksan1 güncel sürümündeki (apps/ctrl) asansorOptions.ts karşılığı.

export interface Secenek {
  value: string;
  label: string;
}

export const SINIF_SECENEKLERI: Secenek[] = [
  { value: 'insan_ve_yuk', label: 'İnsan ve Yük' },
  { value: 'yuk', label: 'Yük' },
];

export const MAKINA_KONUMU_SECENEKLERI: Secenek[] = [
  { value: 'MR', label: 'Makine Daireli (MR)' },
  { value: 'MRL', label: 'Makine Dairesiz (MRL)' },
];

const ASKI_TIPI_TUMU: Secenek[] = [
  { value: '1:1', label: '1:1' },
  { value: '2:1', label: '2:1' },
  { value: '3:1', label: '3:1' },
  { value: '4:1', label: '4:1' },
];

// Makine dairesiz (MRL) asansörlerde 1:1 askı fiziksel olarak kurulamaz.
export function askiTipiSecenekleriFor(makinaKonumu: string | null): Secenek[] {
  return makinaKonumu === 'MRL' ? ASKI_TIPI_TUMU.filter((o) => o.value !== '1:1') : ASKI_TIPI_TUMU;
}

// Hızlar iki ondalık haneyle gösterilir (örn. 1.00, 0.63) — kullanıcı isteği.
export const HIZ_DEGERLERI = [0.3, 0.4, 0.5, 0.6, 0.63, 0.8, 1.0, 1.2, 1.25, 1.6, 2.0, 2.5, 3.0];

export const AGIRLIK_KONUMU_SECENEKLERI: Secenek[] = [
  { value: 'arka', label: 'Arka' },
  { value: 'sag', label: 'Sağ' },
  { value: 'sol', label: 'Sol' },
];

export const GIRIS_TIPI_SECENEKLERI: Secenek[] = [
  { value: 'tek', label: 'Tek Giriş' },
  { value: 'cift', label: 'Çift Giriş' },
];

// Standart halat tipi değerleri — aitest projesindeki halat sertifikasının
// tipler listesinden alındı ("çap(halat türü)" biçiminde). CE kataloğuna
// eklenen halat belgelerinin tipleri bu listeyle birleştirilir.
export const HALAT_TIPI_DEGERLERI = [
  '6.5mm(8x19 W-IWRC)',
  '8mm(8x19 S-IWRC)',
  '8mm(8x19 S-FC)',
  '10mm(8x19 S-IWRC)',
  '10mm(8x19 S-FC)',
  '11mm(8x19 S-FC)',
  '12mm(8x19 S-IWRC)',
  '12mm(8x19 S-FC)',
];

export const SINIF_ETIKETLERI: Record<string, string> = Object.fromEntries(
  SINIF_SECENEKLERI.map((o) => [o.value, o.label])
);
export const MAKINA_KONUMU_ETIKETLERI: Record<string, string> = Object.fromEntries(
  MAKINA_KONUMU_SECENEKLERI.map((o) => [o.value, o.label])
);
export const AGIRLIK_KONUMU_ETIKETLERI: Record<string, string> = Object.fromEntries(
  AGIRLIK_KONUMU_SECENEKLERI.map((o) => [o.value, o.label])
);
export const GIRIS_TIPI_ETIKETLERI: Record<string, string> = Object.fromEntries(
  GIRIS_TIPI_SECENEKLERI.map((o) => [o.value, o.label])
);
export const HALAT_SEKLI_ETIKETLERI: Record<string, string> = {
  celik_halat: 'Çelik Halat',
  kayis: 'Kayış (Belt)',
  kompozit_halat: 'Kompozit Halat',
};
