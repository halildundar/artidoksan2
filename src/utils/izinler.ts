// Kullanıcı izinleri: modül × eylem. api/izinler.js ile aynı katalog kullanılır.
export type Eylem = 'okuma' | 'olusturma' | 'duzenleme' | 'silme';
export type IzinHaritasi = Record<string, Partial<Record<Eylem, boolean>>>;

export const EYLEMLER: { kod: Eylem; etiket: string }[] = [
  { kod: 'okuma', etiket: 'Görüntüle' },
  { kod: 'olusturma', etiket: 'Ekle' },
  { kod: 'duzenleme', etiket: 'Düzenle' },
  { kod: 'silme', etiket: 'Sil' },
];

// okumaSerbest: seçim listeleri (asansör/firma formları vb.) çalışsın diye API okuması herkese açıktır;
// "Görüntüle" ise Ayarlar'daki yönetim ekranının görünürlüğünü belirler
export interface IzinModulu { kod: string; ad: string; grup: string; okumaSerbest?: boolean }
export const IZIN_MODULLERI: IzinModulu[] = [
  { kod: 'firmalar', ad: 'Firmalar', grup: 'Ana modüller' },
  { kod: 'asansorler', ad: 'Asansörler', grup: 'Ana modüller' },
  { kod: 'denetimler', ad: 'Denetimler', grup: 'Ana modüller' },
  { kod: 'tesciller', ad: 'Tescil', grup: 'Ana modüller' },
  { kod: 'yazdirma', ad: 'Yazdırma (belge üretimi)', grup: 'Ana modüller' },
  { kod: 'rapor', ad: 'Rapor', grup: 'Ana modüller' },
  { kod: 'guvenlik-aksamlari', ad: 'Güvenlik Aksamları', grup: 'Ayarlar', okumaSerbest: true },
  { kod: 'onayli-kurumlar', ad: 'Onaylı Kurumlar', grup: 'Ayarlar', okumaSerbest: true },
  { kod: 'denetciler', ad: 'Denetçiler', grup: 'Ayarlar', okumaSerbest: true },
  { kod: 'danismanlar', ad: 'Danışmanlar', grup: 'Ayarlar', okumaSerbest: true },
  { kod: 'smm-firmalari', ad: 'SMM Firmaları', grup: 'Ayarlar', okumaSerbest: true },
  { kod: 'risk-maddeleri', ad: 'Risk Madde Kataloğu', grup: 'Ayarlar', okumaSerbest: true },
];

// Yeni kullanıcı varsayılanı: yalnız görüntüleme
export function varsayilanIzinler(): IzinHaritasi {
  return Object.fromEntries(IZIN_MODULLERI.map((m) => [m.kod, { okuma: true, olusturma: false, duzenleme: false, silme: false }]));
}

export function tamIzinler(): IzinHaritasi {
  return Object.fromEntries(IZIN_MODULLERI.map((m) => [m.kod, { okuma: true, olusturma: true, duzenleme: true, silme: true }]));
}

// Sunucudan gelen (eksik olabilen) izin haritasını tüm modül/eylemleri içerecek şekilde tamamlar
export function izinleriTamamla(h: IzinHaritasi | null | undefined): IzinHaritasi {
  if (!h) return varsayilanIzinler();
  return Object.fromEntries(
    IZIN_MODULLERI.map((m) => [
      m.kod,
      Object.fromEntries(EYLEMLER.map((e) => [e.kod, !!h?.[m.kod]?.[e.kod]])),
    ])
  ) as IzinHaritasi;
}
