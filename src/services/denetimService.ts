import { request } from './api';
import type { BelgeSlot } from './dosyaService';

// Liste yanıtında firmaId/asansorId populate edilir
export interface DenetimFirmaOzet {
  _id: string;
  ad: string;
  unvan?: string;
  telefon?: string;
  il?: string;
  ilce?: string;
}

export interface DenetimAsansorOzet {
  _id: string;
  seriNo: string;
  yapiRuhsatNo: string;
  il: string;
  ilce: string;
}

// Modul B: güvenlik aksamı kataloğundan seçilen satır (seçim anında
// kopyalanan bilgiler; belgeId katalog kaydını işaret eder)
export interface DenetimAksam {
  _id?: string;
  bilesenTipiKodu: string;
  bilesenTipiAdi: string;
  belgeId: string;
  marka: string;
  tip: string;
  sertifikaNo: string;
}

// Modül G denetçisi (Ayarlar > Denetçiler) — populate edilmiş özet
export interface DenetimDenetciOzet {
  _id: string;
  adSoyad: string;
  muhendisTuru: 'elektrik' | 'makine' | '';
  imzaKase?: BelgeSlot | null;
}

export interface Denetim {
  _id: string;
  firmaId: string | DenetimFirmaOzet | null;
  asansorId: string | DenetimAsansorOzet | null;
  denetciId?: string | DenetimDenetciOzet | null;
  modul: string;
  denetimTarihi: string;
  // Modul G detayı
  ekProje?: BelgeSlot | null;
  abUygunlukBeyaniTarihi: string | null;
  sonKontrolTarihi: string | null;
  // Modul B detayı: tip projeleri (ZIP) + seçilen güvenlik aksamları
  tipProjeler?: BelgeSlot[];
  guvenlikAksamlari?: DenetimAksam[];
  // Modul E detayı: montaj sözleşmesi ve malzeme faturası dosya/fotoğrafları
  montajSozlesmeleri?: BelgeSlot[];
  malzemeFaturalari?: BelgeSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface YeniDenetim {
  firmaId: string;
  asansorId: string;
  modul: string;
  denetimTarihi: string;
  denetciId?: string | null;
}

// Kısmi güncelleme — yalnızca gönderilen alanlar değişir
export type DenetimGuncelleme = Partial<YeniDenetim> & {
  ekProje?: BelgeSlot | null;
  abUygunlukBeyaniTarihi?: string | null;
  sonKontrolTarihi?: string | null;
  tipProjeler?: BelgeSlot[];
  guvenlikAksamlari?: DenetimAksam[];
  montajSozlesmeleri?: BelgeSlot[];
  malzemeFaturalari?: BelgeSlot[];
};

export function getDenetimler(): Promise<Denetim[]> {
  return request<Denetim[]>('/denetimler');
}

export function getDenetim(id: string): Promise<Denetim> {
  return request<Denetim>(`/denetimler/${id}`);
}

export function createDenetim(data: YeniDenetim): Promise<Denetim> {
  return request<Denetim>('/denetimler', { method: 'POST', body: JSON.stringify(data) });
}

export function updateDenetim(id: string, data: DenetimGuncelleme): Promise<Denetim> {
  return request<Denetim>(`/denetimler/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteDenetim(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/denetimler/${id}`, { method: 'DELETE' });
}
