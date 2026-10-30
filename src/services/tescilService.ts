import { request } from './api';
import type { BelgeSlot } from './dosyaService';
import type { DenetimFirmaOzet, DenetimAsansorOzet } from './denetimService';

// Tescil kaydı — Modul G denetimiyle aynı içerik; tarih olarak AB uygunluk
// beyanı ve son kontrol tarihleri tutulur (ayrı bir tescil tarihi yoktur).
// Ek olarak firmanın CE belgelerinden seçilenlerin id'leri (ceBelgeIdleri) tutulur.
export interface Tescil {
  _id: string;
  firmaId: string | DenetimFirmaOzet | null;
  asansorId: string | DenetimAsansorOzet | null;
  ekProje?: BelgeSlot | null;
  abUygunlukBeyaniTarihi: string | null;
  sonKontrolTarihi: string | null;
  ceBelgeIdleri: string[];
  createdAt: string;
  updatedAt: string;
}

export interface YeniTescil {
  firmaId: string;
  asansorId: string;
  abUygunlukBeyaniTarihi?: string | null;
  sonKontrolTarihi?: string | null;
}

// Kısmi güncelleme — yalnızca gönderilen alanlar değişir
export type TescilGuncelleme = Partial<YeniTescil> & {
  ekProje?: BelgeSlot | null;
  abUygunlukBeyaniTarihi?: string | null;
  sonKontrolTarihi?: string | null;
  ceBelgeIdleri?: string[];
};

export function getTesciller(): Promise<Tescil[]> {
  return request<Tescil[]>('/tesciller');
}

export function getTescil(id: string): Promise<Tescil> {
  return request<Tescil>(`/tesciller/${id}`);
}

export function createTescil(data: YeniTescil): Promise<Tescil> {
  return request<Tescil>('/tesciller', { method: 'POST', body: JSON.stringify(data) });
}

export function updateTescil(id: string, data: TescilGuncelleme): Promise<Tescil> {
  return request<Tescil>(`/tesciller/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteTescil(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/tesciller/${id}`, { method: 'DELETE' });
}
