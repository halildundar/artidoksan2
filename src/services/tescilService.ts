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
  yesilEtiketRaporu?: BelgeSlot | null;
  faturalar?: BelgeSlot[];
  abUygunlukBeyaniTarihi: string | null;
  sonKontrolTarihi: string | null;
  belediyeAdi?: string;
  dilekceTarihi?: string | null;
  garantiTarihi?: string | null;
  faturaNo?: string;
  faturaTarihi?: string | null;
  projeHizmetSozlesmeTarihi?: string | null;
  sablonSeti?: string;
  uretilenBelgeler?: UretilenBelge[];
  ceBelgeIdleri: string[];
  createdAt: string;
  updatedAt: string;
}

// Yazdır ekranında şablondan üretilen DOCX+PDF çifti
export interface UretilenBelge {
  sablonKodu: string;
  sablonAdi: string;
  docx: BelgeSlot | null;
  pdf: BelgeSlot | null;
  uretimTarihi: string | null;
}

// Yazdır listesi satırı — api/yazdir.js kalemListesi çıktısı
export interface YazdirKalemi {
  no: number;
  kod: string;
  ad: string;
  tip: 'dosya' | 'sablon' | 'ce' | 'aksam';
  dosyalar?: BelgeSlot[];
  uretilen?: UretilenBelge | null;
  altBilgi?: string;
}

export interface YazdirListesi {
  sablonSeti: string;
  kalemler: YazdirKalemi[];
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
  yesilEtiketRaporu?: BelgeSlot | null;
  faturalar?: BelgeSlot[];
  abUygunlukBeyaniTarihi?: string | null;
  sonKontrolTarihi?: string | null;
  belediyeAdi?: string;
  dilekceTarihi?: string | null;
  garantiTarihi?: string | null;
  faturaNo?: string;
  faturaTarihi?: string | null;
  projeHizmetSozlesmeTarihi?: string | null;
  sablonSeti?: string;
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

// Yazdır ekranı: kalem listesi (dosyalar + üretilmiş şablonlar)
export function getTescilYazdir(id: string): Promise<YazdirListesi> {
  return request<YazdirListesi>(`/tesciller/${id}/yazdir`);
}

// Şablondan DOCX+PDF üretir (yeniden üretim üzerine yazar)
export function uretTescilBelgesi(id: string, sablonKodu: string): Promise<UretilenBelge> {
  return request<UretilenBelge>(`/tesciller/${id}/yazdir/${sablonKodu}`, { method: 'POST' });
}
