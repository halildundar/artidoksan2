// TS ISO 7465 T-profil ray tipleri — value kayıtta saklanan koddur, label
// seçim listelerinde ölçüleriyle birlikte gösterilir.
export interface RayTipiSecenek {
  value: string;
  label: string;
}

export const KABIN_RAY_TIPLERI: RayTipiSecenek[] = [
  { value: 'T140/B', label: 'T140/B 140x108x19mm' },
  { value: 'T140-2/B', label: 'T140-2/B 140x102x28,6mm' },
  { value: 'T127/B', label: 'T127/B 127x89x16mm' },
  { value: 'T125/B', label: 'T125/B 125x82x16mm' },
  { value: 'T90/B', label: 'T90/B 90x75x16mm' },
  { value: 'T89/B', label: 'T89/B 89x62x16mm' },
  { value: 'T82/B', label: 'T82/B 82x68x9mm' },
  { value: 'T70/B', label: 'T70/B 70x65x9mm' },
  { value: 'T50/B', label: 'T50/B 50x50x5mm' },
  { value: 'T90/A', label: 'T90/A 90x75x16mm' },
  { value: 'T89/A', label: 'T89/A 89x62x16mm' },
  { value: 'T82/A', label: 'T82/A 82x68x9mm' },
  { value: 'T70/A', label: 'T70/A 70x65x9mm' },
  { value: 'T50/A', label: 'T50/A 50x50x5mm' },
];

// Kayıtta kod saklanır; gösterimde seçim listelerindeki tam etiket
// (kod + ölçüler) kullanılır.
export function rayTipiEtiketi(value: string | null | undefined): string {
  if (!value) return '';
  return KABIN_RAY_TIPLERI.find((r) => r.value === value)?.label ?? value;
}

// Karşı ağırlık rayları en ağır iki kabin ray tipini (T140/B, T140-2/B) içermez.
export const KARSI_AGIRLIK_RAY_TIPLERI: RayTipiSecenek[] = KABIN_RAY_TIPLERI.filter(
  (r) => r.value !== 'T140/B' && r.value !== 'T140-2/B'
);
