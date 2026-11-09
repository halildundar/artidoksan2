import { authBasliklari } from './authDepo';

const BASE_URL = import.meta.env.VITE_API_URL as string;

export class ApiError extends Error {
  constructor(message: string, public status: number, public kod?: string) {
    super(message);
  }
}

// Erişim jetonu süresi dolunca (401) bir kez yenilenip istek tekrarlanır; authService kayıt eder.
// Dönüş: null = yenilendi | "sure-doldu" / "kapatildi" / "pasif" / "oturum" = oturum bitti | "" = geçici hata (ağ)
let yenileyici: (() => Promise<string | null>) | null = null;
export function setYenileyici(fn: () => Promise<string | null>) {
  yenileyici = fn;
}

// Yenileme de başarısız olursa (süre doldu / kapatıldı / pasif) kullanıcı nedeniyle birlikte girişe yönlendirilir
let oturumDustu: ((neden: string) => void) | null = null;
export function setOturumDustu(fn: (neden: string) => void) {
  oturumDustu = fn;
}

async function gonder(path: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...authBasliklari(), ...(options?.headers as Record<string, string> | undefined) },
    });
  } catch {
    // Ağ hatası ("Failed to fetch"): API kapalı ya da henüz açılmamış
    throw new ApiError('Sunucuya ulaşılamadı — API çalışmıyor olabilir', 0);
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res = await gonder(path, options);
  if (res.status === 401 && yenileyici && !path.startsWith('/auth/')) {
    const neden = await yenileyici();
    if (neden === null) res = await gonder(path, options);
    else if (neden) oturumDustu?.(neden);
  }
  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`;
    let kod: string | undefined;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      kod = body?.kod;
    } catch {
      /* gövde JSON değilse varsayılan mesaj kalır */
    }
    throw new ApiError(message, res.status, kod);
  }
  return res.json() as Promise<T>;
}
