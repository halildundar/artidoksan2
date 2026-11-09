import { request } from './api';

export type KullaniciRolu = 'admin' | 'denetci' | 'danisman';

export const ROL_ETIKETLERI: Record<KullaniciRolu, string> = {
  admin: 'Admin',
  denetci: 'Denetçi',
  danisman: 'Danışman',
};

// Oturum süresi seçenekleri (dk); boş = genel varsayılan
export const OTURUM_SURELERI: { deger: number | null; etiket: string }[] = [
  { deger: null, etiket: 'Varsayılan (1 gün)' },
  { deger: 30, etiket: '30 dakika' },
  { deger: 60, etiket: '1 saat' },
  { deger: 180, etiket: '3 saat' },
  { deger: 360, etiket: '6 saat' },
  { deger: 1440, etiket: '1 gün' },
];

export interface Kullanici {
  _id: string;
  ad: string;
  soyad: string;
  rol: KullaniciRolu;
  kaynakId?: string | null;
  email?: string;
  emailDogrulandi?: boolean;
  parolaAyarli?: boolean;
  aktif?: boolean;
  oturumSuresiDk?: number | null;
  sonGiris?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface YeniKullanici {
  ad: string;
  soyad: string;
  rol: KullaniciRolu;
  email?: string;
  aktif?: boolean;
  oturumSuresiDk?: number | null;
  // Denetçi/Danışman rolünde mevcut kayıttan eklemek için
  kaynakId?: string;
}

// Liste/form durum rozeti: Pasif > Doğrulanmadı (e-posta yok/doğrulanmamış) > Aktif
export function kullaniciDurumu(k: Kullanici): { etiket: string; sinif: string } {
  if (k.aktif === false) return { etiket: 'Pasif', sinif: 'bg-red-950/60 text-red-300 ring-red-500/20' };
  if (!k.email) return { etiket: 'E-posta yok', sinif: 'bg-surface-900 text-ink-muted ring-white/10' };
  if (!k.emailDogrulandi) return { etiket: 'Doğrulanmadı', sinif: 'bg-amber-500/10 text-amber-300 ring-amber-500/30' };
  return { etiket: 'Aktif', sinif: 'bg-[#1c2a21] text-[#6fcf97] ring-white/10' };
}

export function getKullanicilar(): Promise<Kullanici[]> {
  return request<Kullanici[]>('/kullanicilar');
}

export function getKullanici(id: string): Promise<Kullanici> {
  return request<Kullanici>(`/kullanicilar/${id}`);
}

export function createKullanici(data: YeniKullanici): Promise<Kullanici> {
  return request<Kullanici>('/kullanicilar', { method: 'POST', body: JSON.stringify(data) });
}

export function updateKullanici(id: string, data: YeniKullanici): Promise<Kullanici> {
  return request<Kullanici>(`/kullanicilar/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteKullanici(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/kullanicilar/${id}`, { method: 'DELETE' });
}

// Yönetici: e-postayı sıfırla + doğrulama e-postası gönder; çıkışa zorla; cihazlar
export function dogrulamaGonder(id: string): Promise<{ ok: boolean; eposta: string }> {
  return request(`/auth/kullanici/${id}/dogrulama-gonder`, { method: 'POST', body: '{}' });
}

export function cikisaZorla(id: string): Promise<{ ok: boolean }> {
  return request(`/auth/kullanici/${id}/cikisa-zorla`, { method: 'POST', body: '{}' });
}

export interface KullaniciCihaz {
  _id: string;
  ad: string;
  sonKullanim: string;
  guvenilirBitis: string;
}

export function getKullaniciCihazlari(id: string): Promise<{ cihazlar: KullaniciCihaz[]; oturumSayisi: number }> {
  return request(`/auth/kullanici/${id}/cihazlar`);
}
