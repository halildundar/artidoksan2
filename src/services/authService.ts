import { request, setYenileyici } from './api';
import {
  getCihazAdi, getCihazId, getYenilemeJetonu, setErisimJetonu, setYenilemeJetonu,
} from './authDepo';
import type { KullaniciRolu } from './kullaniciService';

export interface AuthKullanici {
  _id: string;
  ad: string;
  soyad: string;
  rol: KullaniciRolu;
  email: string;
}

export interface OturumYaniti {
  erisimJetonu: string;
  yenilemeJetonu: string;
  oturumBitis: string;
  kullanici: AuthKullanici;
}

export type GirisYaniti = OturumYaniti | { kodGerekli: true; eposta: string };

const post = <T>(yol: string, govde: unknown) =>
  request<T>(yol, { method: 'POST', body: JSON.stringify(govde) });

export function oturumuKaydet(o: { erisimJetonu: string; yenilemeJetonu?: string }) {
  setErisimJetonu(o.erisimJetonu);
  if (o.yenilemeJetonu) setYenilemeJetonu(o.yenilemeJetonu);
}

export const girisYap = (email: string, parola: string) =>
  post<GirisYaniti>('/auth/giris', { email, parola, cihazId: getCihazId(), cihazAd: getCihazAdi() });

export const kodDogrula = (email: string, kod: string) =>
  post<OturumYaniti>('/auth/kod-dogrula', { email, kod, cihazId: getCihazId(), cihazAd: getCihazAdi() });

export const kodTekrar = (email: string, amac: 'giris' | 'parola-sifirla' | 'hesap-dogrula') =>
  post<{ ok: boolean }>('/auth/kod-tekrar', { email, amac });

export const hesapDogrula = (v: { token?: string; email?: string; kod?: string; yeniParola: string }) =>
  post<{ ok: boolean; eposta: string }>('/auth/dogrula', v);

export const parolaSifirlaIste = (email: string) => post<{ ok: boolean }>('/auth/parola-sifirla-iste', { email });

export const parolaSifirla = (v: { token?: string; email?: string; kod?: string; yeniParola: string }) =>
  post<{ ok: boolean }>('/auth/parola-sifirla', v);

export const parolaDegistirIste = (mevcutParola: string, yeniParola: string) =>
  post<{ ok: boolean; eposta: string }>('/auth/parola-degistir-iste', { mevcutParola, yeniParola });

export const parolaDegistirOnayla = (kod: string) => post<{ ok: boolean }>('/auth/parola-degistir-onayla', { kod });

// Oturumun sunucudaki durumunu (jeton yenileyerek) doğrular: arka plandan dönüşte tek seferlik kullanılır
export const oturumuDogrula = () => oturumuYenile().then((r) => ({ gecerli: !!r, neden: sonNeden }));

export const cikisYap = (tum = false) => post<{ ok: boolean }>('/auth/cikis', { tum });

// Yenileme jetonuyla yeni erişim jetonu alır; oturum geçersizse depodaki jetonlar silinir
type YenilemeSonucu = { kullanici: AuthKullanici; oturumBitis: string } | null;
let devam: Promise<YenilemeSonucu> | null = null;

// Son yenilemenin sunucudaki sonlanma nedeni (sure-doldu | kapatildi | pasif | oturum); ağ hatasında boş
let sonNeden = '';
export const getSonYenilemeNedeni = () => sonNeden;

export function oturumuYenile(): Promise<YenilemeSonucu> {
  if (devam) return devam;
  const jeton = getYenilemeJetonu();
  if (!jeton) return Promise.resolve(null);
  devam = request<{ erisimJetonu: string; oturumBitis: string; kullanici: AuthKullanici }>('/auth/yenile', {
    method: 'POST',
    body: JSON.stringify({ yenilemeJetonu: jeton }),
  })
    .then((r): YenilemeSonucu => {
      sonNeden = '';
      setErisimJetonu(r.erisimJetonu);
      return { kullanici: r.kullanici, oturumBitis: r.oturumBitis };
    })
    .catch((e): YenilemeSonucu => {
      // Yalnız oturum geçersizse jetonlar silinir (ağ hatasında oturum korunur)
      if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 401) {
        sonNeden = (e as { kod?: string }).kod || 'oturum';
        setErisimJetonu(null);
        setYenilemeJetonu(null);
      } else {
        sonNeden = '';
      }
      return null;
    })
    .finally(() => { devam = null; });
  return devam;
}

// api.ts 401 aldığında bir kez yenilemeyi dener (null = yenilendi, metin = oturum bitme nedeni, boş = geçici hata)
setYenileyici(async () => ((await oturumuYenile()) ? null : sonNeden));
