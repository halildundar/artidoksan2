import { request } from './api';

export interface OnayliKurum {
  _id: string;
  nobo: string;
  unvan: string;
  ulke: string;
  adres: string;
  telefon: string;
  eposta: string;
  website: string;
  kurumTipi: string;
  sonOnayTarihi: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface YeniOnayliKurum {
  nobo: string;
  unvan: string;
  ulke?: string;
  adres?: string;
  telefon?: string;
  eposta?: string;
  website?: string;
  kurumTipi?: string;
  sonOnayTarihi?: string | null;
}

export interface OnayliKurumListesi {
  items: OnayliKurum[];
  total: number;
  limit: number;
}

export function getOnayliKurumlar(search?: string, skip = 0): Promise<OnayliKurumListesi> {
  const p = new URLSearchParams();
  if (search) p.set('search', search);
  if (skip > 0) p.set('skip', String(skip));
  const q = p.toString();
  return request<OnayliKurumListesi>(`/onayli-kurumlar${q ? `?${q}` : ''}`);
}

export interface OnayliKurumSecenek {
  _id: string;
  nobo: string;
  unvan: string;
}

export function getOnayliKurumSecenekleri(): Promise<OnayliKurumSecenek[]> {
  return request<OnayliKurumSecenek[]>('/onayli-kurumlar-secenekler');
}

export function getOnayliKurum(id: string): Promise<OnayliKurum> {
  return request<OnayliKurum>(`/onayli-kurumlar/${id}`);
}

export function createOnayliKurum(data: YeniOnayliKurum): Promise<OnayliKurum> {
  return request<OnayliKurum>('/onayli-kurumlar', { method: 'POST', body: JSON.stringify(data) });
}

export function updateOnayliKurum(id: string, data: YeniOnayliKurum): Promise<OnayliKurum> {
  return request<OnayliKurum>(`/onayli-kurumlar/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteOnayliKurum(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/onayli-kurumlar/${id}`, { method: 'DELETE' });
}
