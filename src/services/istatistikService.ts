import { request } from './api';

export interface KomponentToplam {
  aktif: number;
  pasif: number;
}

export interface KomponentTipSayisi extends KomponentToplam {
  kod: string;
  ad: string;
  kategori: 'guvenlik_aksami' | 'asansor_bileseni';
}

export interface SonAsansor {
  _id: string;
  seriNo: string;
  yapiRuhsatNo: string;
  il: string;
  ilce: string;
  makinaKonumu: 'MR' | 'MRL' | null;
  hiz: number | null;
  beyanYuku: number | null;
  kisiSayisi: number | null;
  tahrikTipi: 'elektrikli' | 'hidrolik' | null;
  askiTipi: string | null;
}

export interface SonDenetim {
  _id: string;
  modul: string;
  tarih: string;
  firma: string;
  asansor: string;
}

export interface SonTescil {
  _id: string;
  tarih: string;
  belediye: string;
  firma: string;
  asansor: string;
  makinaKonumu: 'MR' | 'MRL' | null;
  hiz: number | null;
  beyanYuku: number | null;
  tahrikTipi: 'elektrikli' | 'hidrolik' | null;
  askiTipi: string | null;
}

export interface Istatistik {
  firma: number;
  asansor: number;
  denetim: number;
  tescil: number;
  asansorDagilimi: { makine: Record<string, number>; tahrik: Record<string, number> };
  denetimModulleri: Record<string, number>;
  sonAsansorler: SonAsansor[];
  sonDenetimler: SonDenetim[];
  sonTescilKayitlari: SonTescil[];
  komponent: {
    toplam: KomponentToplam;
    guvenlik: KomponentToplam;
    bilesen: KomponentToplam;
    yakinda: number; // 90 gün içinde geçerliliği bitecek aktif belgeler
    tipler: KomponentTipSayisi[];
  };
}

export function getIstatistik(): Promise<Istatistik> {
  return request<Istatistik>('/istatistik');
}
