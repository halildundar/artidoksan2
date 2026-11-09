import { request } from './api';

// Firma KYS verisi (Modül E Kalite El Kitabı): firma kaydından ayrı, büyük bir belge olduğu için
// firma listesi yanıtlarında gelmez; ayrı uçtan okunur/yazılır.
export type KysVerisi = Record<string, unknown>;

export function getKys(firmaId: string): Promise<KysVerisi | null> {
  return request<KysVerisi | null>(`/firmalar/${firmaId}/kys`);
}

export function saveKys(firmaId: string, veri: KysVerisi): Promise<{ ok: boolean; kaydedildi: string }> {
  return request<{ ok: boolean; kaydedildi: string }>(`/firmalar/${firmaId}/kys`, {
    method: 'PUT',
    body: JSON.stringify(veri),
  });
}
