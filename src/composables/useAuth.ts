import { ref, computed } from 'vue';
import {
  cikisYap, oturumuDogrula, oturumuKaydet, oturumuYenile, getSonYenilemeNedeni, type AuthKullanici, type OturumYaniti,
} from '@/services/authService';
import { setErisimJetonu, setYenilemeJetonu } from '@/services/authDepo';
import { setOturumDustu } from '@/services/api';

// Giriş zorunlu (rota koruması); yalnız VITE_AUTH_ZORUNLU=0 ile kapatılabilir (API tarafındaki AUTH_ZORUNLU ile birlikte).
export const AUTH_ZORUNLU = import.meta.env.VITE_AUTH_ZORUNLU !== '0';

const UYARI_SN = 120; // bitişe bu kadar kala "oturum sona erecek" şeridi gösterilir
const YENILEME_ANAHTARI = 'artidoksan.yenileme'; // authDepo ile aynı (çoklu sekme senkronu için)

const kullanici = ref<AuthKullanici | null>(null);
const oturumBitis = ref<number | null>(null);
const hazir = ref(false);
// Süre dolmadan uyarı: bitişe UYARI_SN kala açılır, kalan saniye her saniye güncellenir
const uyariAcik = ref(false);
const kalanSn = ref(0);

// Başlangıçtaki oturum geri yükleme bitene kadar rota koruması bekler (yenilemede girişe atmasın)
let hazirCoz: () => void = () => {};
export const hazirSozu = new Promise<void>((coz) => { hazirCoz = coz; });
let girisYoneltici: (() => void) | null = null;

// Girişten sonra dönülecek sayfa: adres çubuğunda (?hedef=) görünmesin diye bellekte tutulur
let girisSonrasiHedef: string | null = null;
export const setGirisHedefi = (yol: string | null) => { girisSonrasiHedef = yol; };
export const alGirisHedefi = () => { const h = girisSonrasiHedef; girisSonrasiHedef = null; return h; };

// Oturum neden bitti? Giriş ekranı bunu kullanıcıya açıklar (bir kez okunur)
export type OturumNedeni = 'sure-doldu' | 'kapatildi' | 'pasif' | 'oturum' | 'baska-pencere';
let girisNedeni: OturumNedeni | null = null;
export const alGirisNedeni = () => { const n = girisNedeni; girisNedeni = null; return n; };

let bitisZamanlayici: ReturnType<typeof setTimeout> | null = null;
let uyariZamanlayici: ReturnType<typeof setTimeout> | null = null;
let geriSayim: ReturnType<typeof setInterval> | null = null;
let sonlaniyor = false;

function zamanlayicilariTemizle() {
  if (bitisZamanlayici) clearTimeout(bitisZamanlayici);
  if (uyariZamanlayici) clearTimeout(uyariZamanlayici);
  if (geriSayim) clearInterval(geriSayim);
  bitisZamanlayici = uyariZamanlayici = null;
  geriSayim = null;
  uyariAcik.value = false;
}

function temizle() {
  zamanlayicilariTemizle();
  kullanici.value = null;
  oturumBitis.value = null;
  setErisimJetonu(null);
  setYenilemeJetonu(null);
}

// Oturum bitti: jetonlar silinir, neden saklanır, kullanıcı giriş ekranına yönlendirilir (tek sefer)
function oturumuSonlandir(neden: OturumNedeni) {
  if (sonlaniyor || !kullanici.value) return;
  sonlaniyor = true;
  temizle();
  girisNedeni = neden;
  girisYoneltici?.();
  setTimeout(() => { sonlaniyor = false; }, 500);
}

function uyariBaslat() {
  if (!oturumBitis.value) return;
  uyariAcik.value = true;
  const guncelle = () => {
    kalanSn.value = Math.max(0, Math.ceil(((oturumBitis.value ?? 0) - Date.now()) / 1000));
  };
  guncelle();
  if (geriSayim) clearInterval(geriSayim);
  geriSayim = setInterval(guncelle, 1000);
}

// Yedek kontrol: zamanlayıcı kaçırıldıysa (uyku, arka plan) süre dolmuş mu?
function sureKontrol() {
  if (kullanici.value && oturumBitis.value && oturumBitis.value <= Date.now()) oturumuSonlandir('sure-doldu');
}

// Bitiş zamanına tam zamanlayıcı kurar (sunucuya gitmeden): uyarı şeridi + bitişte yönlendirme
function zamanlayicilariKur() {
  zamanlayicilariTemizle();
  if (!oturumBitis.value) return;
  const kalanMs = oturumBitis.value - Date.now();
  if (kalanMs <= 0) { oturumuSonlandir('sure-doldu'); return; }
  const MAKS = 2 ** 31 - 1; // setTimeout üst sınırı (~24,8 gün)
  bitisZamanlayici = setTimeout(sureKontrol, Math.min(kalanMs, MAKS));
  if (kalanMs <= UYARI_SN * 1000) uyariBaslat();
  else uyariZamanlayici = setTimeout(uyariBaslat, Math.min(kalanMs - UYARI_SN * 1000, MAKS));
}

// Uygulama öne gelince / ağ dönünce: önce yerel süre, sonra tek seferlik sunucu doğrulaması
// (pasif / çıkışa zorla / başka cihazdan şifre değişimi). Sürekli yoklama yoktur.
async function geriDonusKontrolu() {
  if (!kullanici.value) return;
  sureKontrol();
  if (!kullanici.value) return;
  zamanlayicilariKur(); // arka planda durmuş zamanlayıcıları yeniden hizala
  const r = await oturumuDogrula();
  if (!r.gecerli && r.neden) oturumuSonlandir(r.neden as OturumNedeni);
}

let izleniyor = false;
function izlemeBaslat() {
  if (izleniyor || typeof document === 'undefined') return;
  izleniyor = true;
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void geriDonusKontrolu(); });
  window.addEventListener('focus', () => sureKontrol());
  window.addEventListener('online', () => { void geriDonusKontrolu(); });
  // Başka sekmede/pencerede çıkış yapıldıysa (yenileme jetonu silindi) bu sekme de girişe düşer
  window.addEventListener('storage', (e) => {
    if (e.key === YENILEME_ANAHTARI && e.newValue === null) oturumuSonlandir('baska-pencere');
  });
  setInterval(sureKontrol, 30_000);
}

export function useAuth() {
  // Uygulama açılışında kayıtlı yenileme jetonuyla oturum geri yüklenir
  async function baslat(yoneltici?: () => void) {
    if (yoneltici) girisYoneltici = yoneltici;
    setOturumDustu((neden) => oturumuSonlandir(neden as OturumNedeni));
    izlemeBaslat();
    const r = await oturumuYenile();
    if (r) {
      kullanici.value = r.kullanici;
      oturumBitis.value = new Date(r.oturumBitis).getTime();
      zamanlayicilariKur();
    } else if (getSonYenilemeNedeni()) {
      // Kayıtlı oturum sunucuda bitmişti (süre doldu / kapatıldı / pasif): giriş ekranı nedenini gösterir
      girisNedeni = getSonYenilemeNedeni() as OturumNedeni;
    }
    hazir.value = true;
    hazirCoz();
  }

  function girisTamamla(o: OturumYaniti) {
    oturumuKaydet(o);
    kullanici.value = o.kullanici;
    oturumBitis.value = new Date(o.oturumBitis).getTime();
    girisNedeni = null;
    sonlaniyor = false;
    zamanlayicilariKur();
  }

  async function cikis(tum = false) {
    try { await cikisYap(tum); } catch { /* sunucuya ulaşılamasa da yerel oturum kapanır */ }
    temizle();
  }

  return {
    kullanici, hazir, girisliMi: computed(() => !!kullanici.value),
    uyariAcik, kalanSn,
    baslat, girisTamamla, cikis, geriDonusKontrolu,
  };
}
