import { ApiError, request } from './api';
import { authBasliklari } from './authDepo';

const BASE_URL = import.meta.env.VITE_API_URL as string;

export interface BelgeSlot {
  dosyaAdi: string;
  dosyaAnahtari: string;
  mimeType: string;
  boyut: number;
  yuklenmeTarihi: string;
}

// Multipart olduğu için JSON tabanlı request() sarmalayıcısını kullanmaz.
export async function uploadDosya(file: File): Promise<BelgeSlot> {
  const fd = new FormData();
  fd.append('dosya', file);
  const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', body: fd, headers: authBasliklari() });
  if (!res.ok) {
    let message = `Yükleme başarısız (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* gövde JSON değilse varsayılan mesaj kalır */
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<BelgeSlot>;
}

// Verilen dosyaları sunucuda tek ZIP'te toplar; paylaşılabilir (7 gün
// geçerli) indirme linki döner.
export interface ZipLink {
  url: string;
  boyut: number;
  dosyaSayisi: number;
}

export function createZipLink(
  ad: string,
  dosyalar: Pick<BelgeSlot, 'dosyaAnahtari' | 'dosyaAdi'>[]
): Promise<ZipLink> {
  return request<ZipLink>('/zip-link', {
    method: 'POST',
    body: JSON.stringify({ ad, dosyalar }),
  });
}

// Birden çok dosya için paylaşılabilir (7 gün geçerli) indirme linkleri —
// PDF raporlarının içine gömülür. Sonuç: dosyaAnahtari → url
export function createDosyaLinkleri(
  dosyalar: Pick<BelgeSlot, 'dosyaAnahtari' | 'dosyaAdi'>[]
): Promise<Record<string, string>> {
  return request<{ linkler: Record<string, string> }>('/dosya-linkleri', {
    method: 'POST',
    body: JSON.stringify({ dosyalar }),
  }).then((r) => r.linkler);
}

export async function getDosyaUrl(key: string): Promise<string> {
  const { url } = await request<{ url: string }>(`/dosya-url?key=${encodeURIComponent(key)}`);
  return url;
}

export async function getDosyaIndirUrl(key: string, dosyaAdi: string): Promise<string> {
  const { url } = await request<{ url: string }>(
    `/dosya-url?key=${encodeURIComponent(key)}&indir=1&ad=${encodeURIComponent(dosyaAdi)}`
  );
  return url;
}
