// Oturum jetonlarının tutulduğu yer (bağımlılığı yok: api.ts ve authService.ts ikisi de buradan okur).
// Erişim jetonu bellekte; yenileme jetonu ve cihaz kimliği kalıcı depoda (mobil WebView + PWA'da çalışır).

const K_YENILEME = 'artidoksan.yenileme';
const K_CIHAZ = 'artidoksan.cihaz';

let erisim: string | null = null;

export const getErisimJetonu = () => erisim;
export const setErisimJetonu = (t: string | null) => { erisim = t; };

function oku(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function yaz(k: string, v: string | null) {
  try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* depo yoksa oturum bellekte kalır */ }
}

export const getYenilemeJetonu = () => oku(K_YENILEME);
export const setYenilemeJetonu = (t: string | null) => yaz(K_YENILEME, t);

// Bu cihaz/tarayıcı için kalıcı kimlik: "yeni cihaz" doğrulaması bunun üzerinden tanınır
export function getCihazId(): string {
  let id = oku(K_CIHAZ);
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    yaz(K_CIHAZ, id);
  }
  return id;
}

export function getCihazAdi(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : 'Web';
  const tarayici = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : '';
  return [platform, tarayici].filter(Boolean).join(' · ');
}

// fetch çağrıları için Authorization başlığı (jeton varsa)
export function authBasliklari(): Record<string, string> {
  return erisim ? { Authorization: `Bearer ${erisim}` } : {};
}
