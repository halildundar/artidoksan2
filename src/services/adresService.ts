import { request } from './api';
import type { BelgeSlot } from './dosyaService';

export interface AdresSecenek {
  label: string;
  value: number;
}

export interface MahalleKaydi {
  ad: string;
  postaKodu: string;
}

export function getIller(): Promise<AdresSecenek[]> {
  return request<AdresSecenek[]>('/adres/iller');
}

export function getIlceler(ilKodu: number): Promise<AdresSecenek[]> {
  return request<AdresSecenek[]>(`/adres/ilceler?ilKodu=${ilKodu}`);
}

export function getMahalleler(ilKodu: number, ilceKodu: number): Promise<MahalleKaydi[]> {
  return request<MahalleKaydi[]>(`/adres/mahalleler?ilKodu=${ilKodu}&ilceKodu=${ilceKodu}`);
}

// ---- Adres kayıtları (ayrı koleksiyon) ----
// Asansör adresleri burada toplanır; asansöre seçilen kaydın verileri
// olduğu gibi kopyalanır.
export interface AdresKaydi {
  _id: string;
  il: string;
  ilce: string;
  mahalle: string;
  postaKodu: string;
  adres: string;
  ada: string;
  parsel: string;
  yapiRuhsatiDosya?: BelgeSlot | null;
}

export function getAdresKayitlari(): Promise<AdresKaydi[]> {
  return request<AdresKaydi[]>('/adres-kayitlari');
}

export function createAdresKaydi(veri: Omit<AdresKaydi, '_id'>): Promise<AdresKaydi> {
  return request<AdresKaydi>('/adres-kayitlari', { method: 'POST', body: JSON.stringify(veri) });
}

export function updateAdresKaydi(id: string, veri: Omit<AdresKaydi, '_id'>): Promise<AdresKaydi> {
  return request<AdresKaydi>(`/adres-kayitlari/${id}`, { method: 'PUT', body: JSON.stringify(veri) });
}

export function deleteAdresKaydi(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/adres-kayitlari/${id}`, { method: 'DELETE' });
}
