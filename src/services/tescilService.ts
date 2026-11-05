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
  no: number | string;
  kod: string;
  ad: string;
  tip: 'dosya' | 'sablon' | 'ce' | 'aksam';
  dosyalar?: BelgeSlot[];
  uretilen?: UretilenBelge | null;
  // Üretilmiş belgenin girdileri (veri/şablon) sonradan değişti
  eskimis?: boolean;
  // Şablonun alan eşlemesi henüz hazır değil (listede görünür, yazdırılamaz)
  hazirDegil?: boolean;
  altBilgi?: string;
}

export interface YazdirListesi {
  sablonSeti: string;
  teknikDosyaSeti?: string;
  tuvFormsSeti?: string;
  kalemler: YazdirKalemi[];
  mesaj?: string;
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
// kaynak: yazdırmanın bağlı olduğu kayıt türü (tescil ya da denetim) — aynı arayüz
export type YazdirKaynak = 'tesciller' | 'denetimler';

export function getTescilYazdir(id: string, kaynak: YazdirKaynak = 'tesciller'): Promise<YazdirListesi> {
  return request<YazdirListesi>(`/${kaynak}/${id}/yazdir`);
}

// ---- Yazdırma işleri: sunucuda kuyruğa alınır, ilerleme sorgulanır ----
export interface YazdirIs {
  id: string;
  tip: 'tekli' | 'toplu';
  ad: string;
  durum: 'calisiyor' | 'bitti' | 'hatali' | 'iptal';
  // sirada | hazirlaniyor (Word dosyaları dolduruluyor) | cevriliyor (PDF'e) | kaydediliyor | bitti
  faz: 'sirada' | 'hazirlaniyor' | 'cevriliyor' | 'kaydediliyor' | 'bitti';
  // 0-100 genel ilerleme
  yuzde: number;
  toplam: number;
  tamamlanan: number;
  wordHazir: number;
  pdfHazir: number;
  iptalEdilebilir: boolean;
  uretilen: number;
  atlanan: number;
  hatali: number;
  hatalar: { ad: string; mesaj: string }[];
  calisan: { kod: string; no: number | string; ad: string }[];
  kalemler: {
    kod: string;
    durum: 'bekliyor' | 'uretiliyor' | 'hazir' | 'cevrildi' | 'tamam' | 'guncel' | 'hata' | 'iptal';
  }[];
  bekleyen: number;
  // Bu iş sırada beklerken önündeki işlem sayısı (yaklaşık)
  onunde: number;
  olusturma: number;
  bitis: number | null;
  bitisSonra: number | null;
}

export interface YazdirIsleri {
  isler: YazdirIs[];
  genelBekleyen: number;
  paralel: number;
}

// Tek şablon belgesini kuyruğa alır (zorla: girdi değişmese de yeniden üretir)
export function baslatTescilYazdir(
  id: string, sablonKodu: string, zorla = false, kaynak: YazdirKaynak = 'tesciller'
): Promise<{ isId: string }> {
  return request<{ isId: string }>(`/${kaynak}/${id}/yazdir/${sablonKodu}`, {
    method: 'POST',
    body: JSON.stringify({ zorla }),
  });
}

// Tüm şablon belgelerini kuyruğa alır; güncel olanlar atlanır
export function baslatTopluTescilYazdir(
  id: string, kaynak: YazdirKaynak = 'tesciller'
): Promise<{ isId: string; mevcut: boolean }> {
  return request<{ isId: string; mevcut: boolean }>(`/${kaynak}/${id}/yazdir-toplu`, { method: 'POST' });
}

export function getTescilYazdirIsleri(id: string, kaynak: YazdirKaynak = 'tesciller'): Promise<YazdirIsleri> {
  return request<YazdirIsleri>(`/${kaynak}/${id}/yazdir/isler`);
}

export function iptalTescilYazdirIsi(
  id: string, isId: string, kaynak: YazdirKaynak = 'tesciller'
): Promise<{ iptal: boolean }> {
  return request<{ iptal: boolean }>(`/${kaynak}/${id}/yazdir/isler/${isId}`, { method: 'DELETE' });
}

// Üretilmiş tüm DOCX/PDF çıktılarını kayıttan ve depodan siler
export function sifirlaTescilYazdir(
  id: string, kaynak: YazdirKaynak = 'tesciller'
): Promise<{ silinen: number; depodanSilinen: number }> {
  return request<{ silinen: number; depodanSilinen: number }>(`/${kaynak}/${id}/yazdir`, { method: 'DELETE' });
}
