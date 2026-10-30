import { request } from './api';
import type { BelgeSlot } from './dosyaService';

export interface BilesenTipi {
  kod: string;
  ad: string;
  kategori: 'guvenlik_aksami' | 'asansor_bileseni';
  tahrikTipi: 'elektrikli' | 'hidrolik' | null;
}

export interface AksamBelgesi {
  _id: string;
  bilesenTipiKodu: string;
  bilesenTipiAdi: string;
  kategori: 'guvenlik_aksami' | 'asansor_bileseni';
  tahrikTipi: 'elektrikli' | 'hidrolik' | null;
  sertifikaNo: string;
  gecerlilikBaslangic: string | null;
  gecerlilikBitis: string | null;
  modulKodu: string;
  onayliKurumId: string | null;
  onayliKurumNobo: string;
  onayliKurumUnvan: string;
  marka: string;
  tipler: string[];
  belgeTipi: string;
  aciklama: string;
  durum: 'aktif' | 'pasif';
  dosya?: BelgeSlot;
  createdAt: string;
  updatedAt: string;
}

export type YeniAksamBelgesi = Omit<AksamBelgesi, '_id' | 'createdAt' | 'updatedAt' | 'bilesenTipiAdi' | 'kategori' | 'tahrikTipi'> & {
  bilesenTipiKodu: string;
};

export function getBilesenTipleri(): Promise<BilesenTipi[]> {
  return request<BilesenTipi[]>('/bilesen-tipleri');
}

export function getAksamBelgeleri(params?: { kod?: string; kategori?: string; durum?: string; search?: string }): Promise<AksamBelgesi[]> {
  const p = new URLSearchParams();
  if (params?.kod) p.set('kod', params.kod);
  if (params?.kategori) p.set('kategori', params.kategori);
  if (params?.durum) p.set('durum', params.durum);
  if (params?.search) p.set('search', params.search);
  const q = p.toString();
  return request<AksamBelgesi[]>(`/aksam-belgeleri${q ? `?${q}` : ''}`);
}

export function getAksamBelgesi(id: string): Promise<AksamBelgesi> {
  return request<AksamBelgesi>(`/aksam-belgeleri/${id}`);
}

export function createAksamBelgesi(data: Partial<YeniAksamBelgesi>): Promise<AksamBelgesi> {
  return request<AksamBelgesi>('/aksam-belgeleri', { method: 'POST', body: JSON.stringify(data) });
}

export function updateAksamBelgesi(id: string, data: Partial<YeniAksamBelgesi>): Promise<AksamBelgesi> {
  return request<AksamBelgesi>(`/aksam-belgeleri/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteAksamBelgesi(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/aksam-belgeleri/${id}`, { method: 'DELETE' });
}
