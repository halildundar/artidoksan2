import type { Firma } from '@/services/firmaService';
import type { BelgeSlot } from '@/services/dosyaService';

// Firma bilgi popup'ının (FirmaBilgiModal) tablo içerikleri — PDF raporu da
// aynı bölümleri kullansın diye saf fonksiyonlar halinde burada tutulur.
// Her satır 1 (tam genişlik) veya 2 (yan yana) etiket/değer çiftinden oluşur.
export type Hucre = [string, string];
export type Satir = Hucre[];
export interface BelgeSatiri {
  etiket: string;
  slot: BelgeSlot | null;
}

export function bilgiTarih(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR') : '—';
}

export function firmaKimlikSatirlari(f: Firma): Satir[] {
  return [
    [['Kısa Adı', f.ad], ['Yetkili', f.yetkili]],
    [['Ünvan', f.unvan]],
    [['Telefon', f.telefon], ['E-posta', f.email]],
    [['İl/İlçe', [f.ilce, f.il].filter(Boolean).join('/')], ['Posta Kodu', f.postaKodu]],
    [['Mahalle', f.mahalle]],
    [['Adres', f.adres]],
  ];
}

export function firmaBelgeSatirlari(f: Firma): BelgeSatiri[] {
  return [
    { etiket: 'İmza Sirküsü', slot: f.belgeler?.imzaSirkusu ?? null },
    { etiket: 'Vergi Levhası', slot: f.belgeler?.vergiLevhasi ?? null },
    { etiket: 'Sicil Gazetesi', slot: f.belgeler?.sicilGazetesi ?? null },
    { etiket: 'Faaliyet Belgesi', slot: f.belgeler?.faaliyetBelgesi ?? null },
    { etiket: 'Sanayi Sicil Belgesi', slot: f.sanayiSicilDosya ?? null },
    { etiket: 'ISO Belgesi', slot: f.isoDosya ?? null },
    { etiket: 'TSE-HYB Belgesi', slot: f.hybDosya ?? null },
  ];
}

export function firmaResmiBelgeSatirlari(f: Firma): Satir[] {
  return [
    [['Sanayi Sicil No', f.sanayiSicilBelgeNo], ['Belge Tarihi', bilgiTarih(f.sanayiSicilBelgeTarihi)]],
    [['TSE-HYB No', f.hybBelgeNo], ['İlk Veriliş', bilgiTarih(f.hybIlkVerilis)]],
    [['HYB Geçerlilik', bilgiTarih(f.hybGecerlilik)]],
  ];
}

export function firmaSmmSatirlari(f: Firma): Satir[] {
  return [
    [['Yıl', f.smmYil ? String(f.smmYil) : ''], ['Kısa Adı', f.smmKisaAd]],
    [['Ünvan', f.smmUnvan]],
    [['Adres', f.smmAdres]],
    [['Mak. Müh.', f.smmMakMuhAdSoyad], ['Sicil/Tel', [f.smmMakMuhOdaSicilNo, f.smmMakMuhTelefon].filter(Boolean).join(' / ')]],
    [['Elk. Müh.', f.smmElkMuhAdSoyad], ['Sicil/Tel', [f.smmElkMuhOdaSicilNo, f.smmElkMuhTelefon].filter(Boolean).join(' / ')]],
  ];
}

export const MUHENDIS_TUR_ETIKETLERI: Record<string, string> = {
  elektrik: 'Elektrik Mühendisi',
  makine: 'Makine Mühendisi',
};

export function firmaPersonelSatirlari(f: Firma): Satir[] {
  const p = f.personel ?? {};
  return [
    [['Genel Müdür', p.genelMudur ?? ''], ['KYT Temsilcisi', p.kytTemsilcisi ?? '']],
    [['Montaj Sorumlusu', p.montajSorumlusu ?? ''], ['Bakım Sorumlusu', p.bakimSorumlusu ?? '']],
    [['Satın Alma Sorumlusu', p.satinAlmaSorumlusu ?? ''], ['Son Kontrol Sorumlusu', p.sonKontrolSorumlusu ?? '']],
  ];
}

export function firmaSmmBelgeSatirlari(f: Firma): BelgeSatiri[] {
  return [
    { etiket: 'Büro Tescil Belgesi', slot: f.smmBuroTescilBelgesi ?? null },
    { etiket: 'Mak. Müh. SMM Belgesi', slot: f.smmMakMuhSmmBelgesi ?? null },
    { etiket: 'Mak. Müh. İmza Sirküsü', slot: f.smmMakMuhImzaSirkusu ?? null },
    { etiket: 'Elk. Müh. SMM Belgesi', slot: f.smmElkMuhSmmBelgesi ?? null },
    { etiket: 'Elk. Müh. İmza Sirküsü', slot: f.smmElkMuhImzaSirkusu ?? null },
    { etiket: 'Sözleşme', slot: f.smmSozlesme ?? null },
  ];
}
