import { request } from './api';
import type { BelgeSlot } from './dosyaService';

export type MuhendisTuru = 'elektrik' | 'makine' | '';

export const MUHENDIS_ETIKETLERI: Record<'elektrik' | 'makine', string> = {
  elektrik: 'Elektrik Mühendisi',
  makine: 'Makine Mühendisi',
};

export interface Denetci {
  _id: string;
  adSoyad: string;
  muhendisTuru: MuhendisTuru;
  imzaKase: BelgeSlot | null;
  onayliKurumId?: string | null;
  onayliKurumNobo?: string;
  onayliKurumUnvan?: string;
  onayliKurumAdres?: string;
  createdAt: string;
  updatedAt: string;
}

export interface YeniDenetci {
  adSoyad: string;
  muhendisTuru: MuhendisTuru;
  imzaKase: BelgeSlot | null;
  onayliKurumId?: string | null;
}

export function getDenetciler(): Promise<Denetci[]> {
  return request<Denetci[]>('/denetciler');
}

export function getDenetci(id: string): Promise<Denetci> {
  return request<Denetci>(`/denetciler/${id}`);
}

export function createDenetci(data: YeniDenetci): Promise<Denetci> {
  return request<Denetci>('/denetciler', { method: 'POST', body: JSON.stringify(data) });
}

export function updateDenetci(id: string, data: YeniDenetci): Promise<Denetci> {
  return request<Denetci>(`/denetciler/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteDenetci(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/denetciler/${id}`, { method: 'DELETE' });
}
