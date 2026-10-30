import { request } from './api';
import type { BelgeSlot } from './dosyaService';

export type BelgeSlotAnahtar =
  | 'logo'
  | 'imzaKase'
  | 'imzaSirkusu'
  | 'vergiLevhasi'
  | 'sicilGazetesi'
  | 'faaliyetBelgesi';

export type FirmaBelgeleri = Partial<Record<BelgeSlotAnahtar, BelgeSlot>>;

// Kurum evrakları: her tür için birden fazla dosya/resim tutulabilir.
// belgeler'deki tekil yuva geriye uyum için listenin ilk dosyasıyla senkrondur.
export type KurumEvrakAnahtar = 'imzaSirkusu' | 'vergiLevhasi' | 'sicilGazetesi' | 'faaliyetBelgesi';
export type KurumEvrakDosyalari = Partial<Record<KurumEvrakAnahtar, BelgeSlot[]>>;

// Personel sekmesi: sabit görev sahipleri (ad soyad)
export interface FirmaPersonel {
  genelMudur: string;
  kytTemsilcisi: string;
  montajSorumlusu: string;
  bakimSorumlusu: string;
  satinAlmaSorumlusu: string;
  sonKontrolSorumlusu: string;
}

// Personel sekmesi mühendis satırı: tür + ad soyad + belgeler (dosya/foto)
export interface Muhendis {
  _id?: string;
  tur: 'elektrik' | 'makine';
  adSoyad: string;
  belgeler: BelgeSlot[];
}

// CE belgesi satırı: modül + onaylı kurum + belge no + geçerlilik/bitiş + dosya
export interface CeBelgesi {
  _id?: string;
  modul: string;
  kurum: string;
  belgeNo: string;
  gecerlilikTarihi: string | null;
  bitisTarihi: string | null;
  dosya?: BelgeSlot | null;
}

export interface Firma {
  _id: string;
  ad: string;
  unvan: string;
  telefon: string;
  email: string;
  il: string;
  ilce: string;
  mahalle: string;
  postaKodu: string;
  adres: string;
  yetkili: string;
  belgeler?: FirmaBelgeleri;
  kurumEvrakDosyalari?: KurumEvrakDosyalari;
  // Sanayi Sicil Belgesi: no + tarih + dosya
  sanayiSicilBelgeNo: string;
  sanayiSicilBelgeTarihi: string | null;
  sanayiSicilDosya?: BelgeSlot | null;
  // TSE-HYB Belgesi: no + ilk veriliş + geçerlilik tarihi + dosya
  hybBelgeNo: string;
  hybIlkVerilis: string | null;
  hybGecerlilik: string | null;
  hybDosya?: BelgeSlot | null;
  // ISO belgesi (yalnız dosya)
  isoDosya?: BelgeSlot | null;
  ceBelgeleri: CeBelgesi[];
  // Cihazlar sekmesi: serbest dosya/fotoğraf listesi (yükleme hep sona ekler)
  cihazDosyalari?: BelgeSlot[];
  // Personel sekmesi
  personel?: Partial<FirmaPersonel>;
  muhendisler?: Muhendis[];
  sgkDokumleri?: BelgeSlot[];
  // SMM Bilgileri: kendi bünyesinde veya başka bir firma (varsayılan başka)
  smmTuru: 'kendi' | 'baska' | null;
  // Havuzdan seçilen SMM firması (bilgiler seçim anında kopyalanır) + yıl
  smmFirmaId: string | null;
  smmYil: number | null;
  // SMM firmasıyla yapılan sözleşme (PDF veya resim)
  smmSozlesme?: BelgeSlot | null;
  smmKisaAd: string;
  smmUnvan: string;
  smmAdres: string;
  smmBuroTescilBelgesi?: BelgeSlot | null;
  smmMakMuhAdSoyad: string;
  smmMakMuhOdaSicilNo: string;
  smmMakMuhTelefon: string;
  smmMakMuhSmmBelgesi?: BelgeSlot | null;
  smmMakMuhImzaSirkusu?: BelgeSlot | null;
  smmElkMuhAdSoyad: string;
  smmElkMuhOdaSicilNo: string;
  smmElkMuhTelefon: string;
  smmElkMuhSmmBelgesi?: BelgeSlot | null;
  smmElkMuhImzaSirkusu?: BelgeSlot | null;
  createdAt: string;
  updatedAt: string;
}

export interface YeniFirma {
  ad: string;
  unvan?: string;
  telefon?: string;
  email?: string;
  il?: string;
  ilce?: string;
  mahalle?: string;
  postaKodu?: string;
  adres?: string;
  yetkili?: string;
  belgeler?: FirmaBelgeleri;
  kurumEvrakDosyalari?: KurumEvrakDosyalari;
  sanayiSicilBelgeNo?: string;
  sanayiSicilBelgeTarihi?: string | null;
  sanayiSicilDosya?: BelgeSlot | null;
  hybBelgeNo?: string;
  hybIlkVerilis?: string | null;
  hybGecerlilik?: string | null;
  hybDosya?: BelgeSlot | null;
  isoDosya?: BelgeSlot | null;
  ceBelgeleri?: CeBelgesi[];
  cihazDosyalari?: BelgeSlot[];
  personel?: Partial<FirmaPersonel>;
  muhendisler?: Muhendis[];
  sgkDokumleri?: BelgeSlot[];
  smmTuru?: 'kendi' | 'baska' | null;
  smmFirmaId?: string | null;
  smmYil?: number | null;
  smmSozlesme?: BelgeSlot | null;
  smmKisaAd?: string;
  smmUnvan?: string;
  smmAdres?: string;
  smmBuroTescilBelgesi?: BelgeSlot | null;
  smmMakMuhAdSoyad?: string;
  smmMakMuhOdaSicilNo?: string;
  smmMakMuhTelefon?: string;
  smmMakMuhSmmBelgesi?: BelgeSlot | null;
  smmMakMuhImzaSirkusu?: BelgeSlot | null;
  smmElkMuhAdSoyad?: string;
  smmElkMuhOdaSicilNo?: string;
  smmElkMuhTelefon?: string;
  smmElkMuhSmmBelgesi?: BelgeSlot | null;
  smmElkMuhImzaSirkusu?: BelgeSlot | null;
}

export function getFirmalar(): Promise<Firma[]> {
  return request<Firma[]>('/firmalar');
}

export function getFirma(id: string): Promise<Firma> {
  return request<Firma>(`/firmalar/${id}`);
}

export function updateFirma(id: string, data: YeniFirma): Promise<Firma> {
  return request<Firma>(`/firmalar/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function createFirma(data: YeniFirma): Promise<Firma> {
  return request<Firma>('/firmalar', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteFirma(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/firmalar/${id}`, { method: 'DELETE' });
}
