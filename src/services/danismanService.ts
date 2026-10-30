import { request } from './api';

export interface Danisman {
  _id: string;
  adSoyad: string;
  il: string;
  email: string;
  telefon: string;
  createdAt: string;
  updatedAt: string;
}

export interface YeniDanisman {
  adSoyad: string;
  il?: string;
  email?: string;
  telefon?: string;
}

export function getDanismanlar(): Promise<Danisman[]> {
  return request<Danisman[]>('/danismanlar');
}

export function getDanisman(id: string): Promise<Danisman> {
  return request<Danisman>(`/danismanlar/${id}`);
}

export function createDanisman(data: YeniDanisman): Promise<Danisman> {
  return request<Danisman>('/danismanlar', { method: 'POST', body: JSON.stringify(data) });
}

export function updateDanisman(id: string, data: YeniDanisman): Promise<Danisman> {
  return request<Danisman>(`/danismanlar/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteDanisman(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/danismanlar/${id}`, { method: 'DELETE' });
}
