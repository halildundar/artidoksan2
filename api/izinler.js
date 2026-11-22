// Kullanıcı izinleri: modül × eylem (okuma / oluşturma / düzenleme / silme).
// Admin rolü tüm izinlere sahiptir ve kullanıcı yönetimi (ekleme dahil) yalnız Admin'e açıktır.
// İzinler kullanıcı kaydında `izinler: { [modul]: { okuma, olusturma, duzenleme, silme } }` olarak tutulur.
// Not: istemcideki src/utils/izinler.ts ile aynı katalog kullanılır.

export const EYLEMLER = ['okuma', 'olusturma', 'duzenleme', 'silme'];
export const EYLEM_ETIKETLERI = { okuma: 'Görüntüle', olusturma: 'Ekle', duzenleme: 'Düzenle', silme: 'Sil' };

// okumaSerbest: ekranların çalışması için her giriş yapmış kullanıcı okuyabilir (yalnız ekleme/düzenleme/silme izne bağlı)
export const MODULLER = [
  { kod: 'firmalar', ad: 'Firmalar', grup: 'Ana modüller' },
  { kod: 'asansorler', ad: 'Asansörler', grup: 'Ana modüller' },
  { kod: 'denetimler', ad: 'Denetimler', grup: 'Ana modüller' },
  { kod: 'tesciller', ad: 'Tescil', grup: 'Ana modüller' },
  { kod: 'yazdirma', ad: 'Yazdırma (belge üretimi)', grup: 'Ana modüller' },
  { kod: 'guvenlik-aksamlari', ad: 'Güvenlik Aksamları', grup: 'Ayarlar', okumaSerbest: true },
  { kod: 'onayli-kurumlar', ad: 'Onaylı Kurumlar', grup: 'Ayarlar', okumaSerbest: true },
  { kod: 'denetciler', ad: 'Denetçiler', grup: 'Ayarlar', okumaSerbest: true },
  { kod: 'danismanlar', ad: 'Danışmanlar', grup: 'Ayarlar', okumaSerbest: true },
  { kod: 'smm-firmalari', ad: 'SMM Firmaları', grup: 'Ayarlar', okumaSerbest: true },
  { kod: 'risk-maddeleri', ad: 'Risk Madde Kataloğu', grup: 'Ayarlar', okumaSerbest: true },
];

const modulBul = (kod) => MODULLER.find((m) => m.kod === kod);

// Tüm modüllerde tüm eylemler (Admin / eski kullanıcıların mevcut erişimini korumak için)
export function tamIzinler() {
  return Object.fromEntries(MODULLER.map((m) => [m.kod, Object.fromEntries(EYLEMLER.map((e) => [e, true]))]));
}

// Yeni (Admin olmayan) kullanıcı: yalnız görüntüleme; düzenleme izinlerini Admin ayarlar
export function varsayilanIzinler() {
  return Object.fromEntries(MODULLER.map((m) => [m.kod, Object.fromEntries(EYLEMLER.map((e) => [e, e === 'okuma']))]));
}

// İstemciden gelen izin nesnesinden yalnız bilinen modül/eylemleri boolean olarak alır
export function izinleriTemizle(girdi) {
  if (!girdi || typeof girdi !== 'object') return undefined;
  const sonuc = {};
  for (const m of MODULLER) {
    const g = girdi[m.kod] ?? {};
    sonuc[m.kod] = Object.fromEntries(EYLEMLER.map((e) => [e, !!g[e]]));
  }
  return sonuc;
}

// Kullanıcının etkin izinleri (admin: hepsi; okumaSerbest modüllerde okuma her zaman açık; kayıt yoksa yalnız okuma)
export function etkinIzinler(kullanici) {
  if (kullanici?.rol === 'admin') return tamIzinler();
  const kayitli = kullanici?.izinler && typeof kullanici.izinler === 'object' ? kullanici.izinler : varsayilanIzinler();
  return Object.fromEntries(
    MODULLER.map((m) => [
      m.kod,
      Object.fromEntries(EYLEMLER.map((e) => [e, e === 'okuma' && m.okumaSerbest ? true : !!kayitli[m.kod]?.[e]])),
    ])
  );
}

export function izinVarMi(kullanici, modul, eylem) {
  if (!kullanici) return false;
  return !!etkinIzinler(kullanici)[modul]?.[eylem];
}

const YONTEM_EYLEM = { GET: 'okuma', HEAD: 'okuma', OPTIONS: 'okuma', POST: 'olusturma', PUT: 'duzenleme', PATCH: 'duzenleme', DELETE: 'silme' };

// Express ara katmanı: HTTP yöntemini eyleme çevirir. modul: sabit modül kodu ya da (req) => kod.
// Kullanıcı yoksa (AUTH_ZORUNLU=0) geçer; giriş zorunluluğu girisGerekli'de uygulanır.
export function izinGerekli(modul) {
  return (req, res, next) => {
    const k = req.kullanici;
    if (!k) return next();
    const kod = typeof modul === 'function' ? modul(req) : modul;
    const eylem = YONTEM_EYLEM[req.method] ?? 'okuma';
    if (izinVarMi(k, kod, eylem)) return next();
    const m = modulBul(kod);
    res.status(403).json({ message: `Bu işlem için yetkiniz yok (${m?.ad ?? kod}: ${EYLEM_ETIKETLERI[eylem]})`, kod: 'izin-yok' });
  };
}
