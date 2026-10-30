import { request } from './api';
import type { BelgeSlot } from './dosyaService';

// SMM firma havuzu — Ayarlar > SMM Firmaları'ndan yönetilir; montaj
// firmasına havuzdan seçilir ve bilgileri olduğu gibi kopyalanır.
export interface SmmFirmasi {
  _id: string;
  yil: number | null;
  kisaAd: string;
  unvan: string;
  adres: string;
  buroTescilBelgesi?: BelgeSlot | null;
  makMuhAdSoyad: string;
  makMuhOdaSicilNo: string;
  makMuhTelefon: string;
  makMuhSmmBelgesi?: BelgeSlot | null;
  makMuhImzaSirkusu?: BelgeSlot | null;
  elkMuhAdSoyad: string;
  elkMuhOdaSicilNo: string;
  elkMuhTelefon: string;
  elkMuhSmmBelgesi?: BelgeSlot | null;
  elkMuhImzaSirkusu?: BelgeSlot | null;
  createdAt: string;
  updatedAt: string;
}

export type YeniSmmFirmasi = Partial<Omit<SmmFirmasi, '_id' | 'createdAt' | 'updatedAt'>> & {
  kisaAd: string;
};

export function getSmmFirmalari(q?: string): Promise<SmmFirmasi[]> {
  const p = q ? `?q=${encodeURIComponent(q)}` : '';
  return request<SmmFirmasi[]>(`/smm-firmalari${p}`);
}

export function createSmmFirmasi(data: YeniSmmFirmasi): Promise<SmmFirmasi> {
  return request<SmmFirmasi>('/smm-firmalari', { method: 'POST', body: JSON.stringify(data) });
}

export function updateSmmFirmasi(id: string, data: YeniSmmFirmasi): Promise<SmmFirmasi> {
  return request<SmmFirmasi>(`/smm-firmalari/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteSmmFirmasi(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/smm-firmalari/${id}`, { method: 'DELETE' });
}
