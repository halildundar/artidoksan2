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

export interface Istatistik {
  firma: number;
  asansor: number;
  denetim: number;
  tescil: number;
  asansorDagilimi: { makine: Record<string, number>; tahrik: Record<string, number> };
  denetimModulleri: Record<string, number>;
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
