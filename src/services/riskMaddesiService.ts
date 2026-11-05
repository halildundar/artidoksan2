import { request } from './api';
import type { BelgeSlot } from './dosyaService';

// Risk analizi maddeleri — hazır madde kataloğu (ayrı koleksiyon). Popup'tan
// çoktan seçmeli seçilir; `grup` hangi risk analizine ait olduğunu belirtir
// (örn. 'makine-dairesi').
export interface RiskMaddesi {
  _id: string;
  grup: string;
  metin: string;
  resim?: BelgeSlot | null;
  standart?: boolean;
}

// Asansöre kaydedilen seçim: katalog id'si + metin/resim snapshot'ı +
// asansöre özgü ek fotoğraflar
export interface RiskMaddesiSecim {
  maddeId: string | null;
  metin: string;
  resim?: BelgeSlot | null;
  fotolar?: BelgeSlot[];
}

export function getRiskMaddeleri(grup: string): Promise<RiskMaddesi[]> {
  return request<RiskMaddesi[]>(`/risk-maddeleri?grup=${encodeURIComponent(grup)}`);
}

export function createRiskMaddesi(veri: Omit<RiskMaddesi, '_id'>): Promise<RiskMaddesi> {
  return request<RiskMaddesi>('/risk-maddeleri', { method: 'POST', body: JSON.stringify(veri) });
}

export function updateRiskMaddesi(
  id: string,
  veri: Pick<RiskMaddesi, 'metin' | 'resim' | 'standart'>
): Promise<RiskMaddesi> {
  return request<RiskMaddesi>(`/risk-maddeleri/${id}`, { method: 'PUT', body: JSON.stringify(veri) });
}

export function deleteRiskMaddesi(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/risk-maddeleri/${id}`, { method: 'DELETE' });
}
