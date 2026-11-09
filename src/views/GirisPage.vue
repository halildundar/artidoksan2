<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { girisYap, kodDogrula, kodTekrar } from '@/services/authService';
import { ApiError } from '@/services/api';
import { alGirisHedefi, alGirisNedeni, useAuth } from '@/composables/useAuth';
import { blurActive } from '@/utils/blurActive';

// Giriş ekranı: TÜV NORD açılış ekranından sonra oturum yoksa burası gösterilir.
// Hatalar (yanlış şifre, pasif hesap, kilit, ağ hatası…) formun üstündeki uyarı kutusunda görünür.
const router = useRouter();
const { girisTamamla } = useAuth();

const adim = ref<'giris' | 'kod'>('giris');
const email = ref('');
const parola = ref('');
const parolaGorunur = ref(false);
const kod = ref('');
const maskeliEposta = ref('');
const mesgul = ref(false);
const hata = ref('');
const hataKodu = ref(''); // pasif | dogrulanmadi | ...
const bilgi = ref('');
const bekleme = ref(0); // "kodu tekrar gönder" geri sayımı (sn)
let sayac: ReturnType<typeof setInterval> | null = null;

const gecerli = computed(() => email.value.trim() !== '' && parola.value !== '');
// Kimlik bilgisi hatasında alanlar kırmızı çerçeveli gösterilir
const alanHatali = computed(() => !!hata.value && adim.value === 'giris' && hataKodu.value === '');

// Oturum bitince buraya yönlendirilen kullanıcıya nedeni açıklanır
const NEDEN_METNI: Record<string, { metin: string; hata: boolean }> = {
  'sure-doldu': { metin: 'Oturum süreniz doldu. Devam etmek için lütfen tekrar giriş yapın.', hata: false },
  kapatildi: { metin: 'Oturumunuz yönetici tarafından veya güvenlik nedeniyle kapatıldı. Lütfen tekrar giriş yapın.', hata: false },
  pasif: { metin: 'Hesabınız pasif. Yöneticinizle iletişime geçin.', hata: true },
  oturum: { metin: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.', hata: false },
  'baska-pencere': { metin: 'Başka bir pencerede oturum kapatıldı. Devam etmek için tekrar giriş yapın.', hata: false },
};

onMounted(() => {
  const n = alGirisNedeni();
  const m = n ? NEDEN_METNI[n] : null;
  if (!m) return;
  if (m.hata) hata.value = m.metin;
  else bilgi.value = m.metin;
});

function hatayiTemizle() {
  hata.value = '';
  hataKodu.value = '';
}

function hataGoster(e: unknown, varsayilan: string) {
  hata.value = e instanceof Error ? e.message : varsayilan;
  hataKodu.value = e instanceof ApiError ? (e.kod ?? '') : '';
}

function geriSayimBaslat() {
  bekleme.value = 60;
  if (sayac) clearInterval(sayac);
  sayac = setInterval(() => {
    bekleme.value -= 1;
    if (bekleme.value <= 0 && sayac) { clearInterval(sayac); sayac = null; }
  }, 1000);
}
onBeforeUnmount(() => { if (sayac) clearInterval(sayac); });

function bitir() {
  blurActive();
  const hedef = alGirisHedefi();
  router.replace(hedef && hedef !== '/giris' ? hedef : '/');
}

async function giris() {
  if (!gecerli.value || mesgul.value) return;
  mesgul.value = true;
  hatayiTemizle();
  bilgi.value = '';
  try {
    const y = await girisYap(email.value.trim(), parola.value);
    if ('kodGerekli' in y) {
      maskeliEposta.value = y.eposta;
      adim.value = 'kod';
      bilgi.value = `${y.eposta} adresine doğrulama kodu gönderdik.`;
      geriSayimBaslat();
    } else {
      girisTamamla(y);
      bitir();
    }
  } catch (e) {
    hataGoster(e, 'Giriş yapılamadı');
  } finally {
    mesgul.value = false;
  }
}

async function kodOnayla() {
  if (kod.value.trim().length < 6 || mesgul.value) return;
  mesgul.value = true;
  hatayiTemizle();
  try {
    girisTamamla(await kodDogrula(email.value.trim(), kod.value.trim()));
    bitir();
  } catch (e) {
    hataGoster(e, 'Kod doğrulanamadı');
  } finally {
    mesgul.value = false;
  }
}

async function tekrarGonder() {
  if (bekleme.value > 0 || mesgul.value) return;
  mesgul.value = true;
  hatayiTemizle();
  try {
    await kodTekrar(email.value.trim(), 'giris');
    bilgi.value = 'Yeni kod gönderildi.';
    geriSayimBaslat();
  } catch (e) {
    hataGoster(e, 'Kod gönderilemedi');
  } finally {
    mesgul.value = false;
  }
}

function sifremiUnuttum() {
  blurActive();
  router.push({ path: '/sifre-sifirla', query: email.value.trim() ? { email: email.value.trim() } : {} });
}

function geriDon() {
  adim.value = 'giris';
  kod.value = '';
  bilgi.value = '';
  hatayiTemizle();
}

const alan = 'w-full bg-surface-900 py-3 pl-10 text-sm text-ink outline-none ring-1 transition placeholder:text-ink-muted/50 focus:ring-2';
</script>

<template>
  <ion-page>
    <ion-content>
      <div class="flex min-h-full flex-col" style="background: linear-gradient(180deg, #223c2d 0, #223c2d 15rem, transparent 15rem)">
        <!-- Marka alanı: açılış ekranıyla aynı koyu yeşil zemin ve TÜV NORD logosu -->
        <div class="px-6 pb-14 pt-[max(3rem,env(safe-area-inset-top))] text-center">
          <svg viewBox="0 0 140.3 21.2" class="mx-auto w-44 max-w-full" aria-label="TÜV NORD">
            <path fill="#ffffff" d="M126.4,17.6h3.7c3.8,0,6.8-3.1,6.8-7s-3.1-6.9-6.8-6.9h-3.7C126.4,3.7,126.4,17.6,126.4,17.6z M130.1,20.6H123v-20h7.1c5.5,0,10.2,4.6,10.2,10S135.6,20.6,130.1,20.6L130.1,20.6z M108.2,9.9h5.1c1.8,0,3.1-1.4,3.1-3.1s-1.3-3.1-3.1-3.1h-5.1V9.9L108.2,9.9z M120.4,20.6h-3.7l-4.2-7.6h-4.3v7.6h-3.3v-20h8.5c3.7,0,6.5,2.7,6.5,6.2c0,4-3.2,5.6-3.9,5.9L120.4,20.6L120.4,20.6z M78.1,20.6h-2.9l-10.9-14v14H61v-20h2.8l10.9,14.1V0.6H78C78.1,0.6,78.1,20.6,78.1,20.6z M51.6,20.6l7.4-20h-5.4l-4.8,13.8L44.1,0.6h-5.4l7.4,20H51.6L51.6,20.6z M16.5,0.6V5h-5.8v15.6H5.8V5H0V0.6H16.5z M30.4,0.6h-4.9v4.8h4.9V0.6z M32.5,11.9V0.6h4.8v12c0,5-4,8.6-9.3,8.6c-5.1,0-9.3-3.3-9.3-8.6v-12h4.9v11.3c0,3,1.9,4.7,4.5,4.7S32.5,14.7,32.5,11.9z M91.5,21.2c-6.1,0-10.9-4.7-10.9-10.6S85.4,0,91.5,0s10.9,4.7,10.9,10.6S97.6,21.2,91.5,21.2L91.5,21.2z M91.5,3.1c-4.2,0-7.5,3.3-7.5,7.5s3.3,7.5,7.5,7.5s7.5-3.3,7.5-7.5S95.7,3.1,91.5,3.1z" />
          </svg>
          <p class="mt-3 text-xs font-bold tracking-[0.4em]" style="color: #e6ede8">ASANSÖR</p>
        </div>

        <div class="mx-auto -mt-8 w-full max-w-sm flex-1 px-4 pb-8">
          <div class="space-y-4 bg-surface-800 p-5 shadow-xl shadow-black/20 ring-1 ring-white/10">
            <div>
              <h1 class="text-lg font-bold text-ink">{{ adim === 'giris' ? 'Hoş geldiniz' : 'E-posta doğrulaması' }}</h1>
              <p class="mt-0.5 text-xs text-ink-muted">
                {{ adim === 'giris' ? 'Devam etmek için hesabınızla giriş yapın.' : `Bu cihazdan ilk giriş. ${maskeliEposta} adresine gelen 6 haneli kodu girin.` }}
              </p>
            </div>

            <!-- Hata / bilgi uyarısı -->
            <div v-if="hata" role="alert"
              class="flex items-start gap-2 bg-red-950/60 px-3 py-2.5 text-xs text-red-300 ring-1 ring-red-500/30">
              <svg class="mt-px h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span class="min-w-0 flex-1 leading-snug">{{ hata }}</span>
            </div>
            <div v-else-if="bilgi" role="status"
              class="flex items-start gap-2 bg-[#223c2d]/60 px-3 py-2.5 text-xs text-ink ring-1 ring-white/10">
              <svg class="mt-px h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="m9 11 3 3L22 4" />
              </svg>
              <span class="min-w-0 flex-1 leading-snug">{{ bilgi }}</span>
            </div>

            <!-- 1. adım: e-posta + şifre -->
            <form v-if="adim === 'giris'" class="space-y-3" novalidate @submit.prevent="giris">
              <label class="block space-y-1">
                <span class="text-xs font-medium text-ink-muted">E-posta</span>
                <span class="relative block">
                  <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/70"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-10 6L2 7" />
                  </svg>
                  <input v-model="email" type="email" autocomplete="username" inputmode="email" autocapitalize="off"
                    placeholder="ornek@mail.com" :class="[alan, 'pr-3', alanHatali ? 'ring-red-500/60' : 'ring-white/10 focus:ring-white/30']"
                    @input="hatayiTemizle" />
                </span>
              </label>

              <label class="block space-y-1">
                <span class="text-xs font-medium text-ink-muted">Şifre</span>
                <span class="relative block">
                  <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/70"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input v-model="parola" :type="parolaGorunur ? 'text' : 'password'" autocomplete="current-password"
                    placeholder="Şifreniz" :class="[alan, 'pr-11', alanHatali ? 'ring-red-500/60' : 'ring-white/10 focus:ring-white/30']"
                    @input="hatayiTemizle" />
                  <button type="button" :aria-label="parolaGorunur ? 'Şifreyi gizle' : 'Şifreyi göster'" @click="parolaGorunur = !parolaGorunur"
                    class="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-ink-muted active:text-ink">
                    <svg v-if="!parolaGorunur" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.74 0 8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7 13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.53 13.53 0 0 0 2.06 11.65a1 1 0 0 0 0 .7C3.42 15.76 7.26 19 12 19a9.74 9.74 0 0 0 5.39-1.61" />
                      <path d="m2 2 20 20" />
                    </svg>
                  </button>
                </span>
              </label>

              <button type="submit" :disabled="!gecerli || mesgul"
                class="flex w-full items-center justify-center gap-2 bg-[#2b5c3d] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/10 transition active:bg-[#346e4a] disabled:opacity-50">
                <svg v-if="mesgul" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                  <path d="M21 12a9 9 0 1 1-6.2-8.55" />
                </svg>
                {{ mesgul ? 'Giriş yapılıyor…' : 'Giriş yap' }}
              </button>
              <button type="button" class="w-full text-center text-xs font-semibold text-ink-muted underline" @click="sifremiUnuttum">
                Şifremi unuttum
              </button>
            </form>

            <!-- 2. adım: e-posta doğrulama kodu (yeni cihaz) -->
            <form v-else class="space-y-3" novalidate @submit.prevent="kodOnayla">
              <input v-model="kod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6"
                :class="[alan, 'pr-3 text-center text-xl font-bold tracking-[0.5em]', hata ? 'ring-red-500/60' : 'ring-white/10 focus:ring-white/30']"
                style="padding-left: 0.75rem" placeholder="000000" @input="hatayiTemizle" />
              <button type="submit" :disabled="kod.trim().length < 6 || mesgul"
                class="flex w-full items-center justify-center gap-2 bg-[#2b5c3d] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/10 transition active:bg-[#346e4a] disabled:opacity-50">
                <svg v-if="mesgul" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                  <path d="M21 12a9 9 0 1 1-6.2-8.55" />
                </svg>
                {{ mesgul ? 'Doğrulanıyor…' : 'Doğrula ve giriş yap' }}
              </button>
              <button type="button" :disabled="bekleme > 0 || mesgul" @click="tekrarGonder"
                class="w-full text-center text-xs font-semibold text-ink-muted underline disabled:no-underline disabled:opacity-60">
                {{ bekleme > 0 ? `Kodu tekrar gönder (${bekleme} sn)` : 'Kodu tekrar gönder' }}
              </button>
              <button type="button" class="w-full text-center text-xs text-ink-muted" @click="geriDon">← Geri dön</button>
            </form>
          </div>

          <p class="mt-5 text-center text-[11px] text-ink-muted/70">Artidoksan · TüvNord Asansör</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>
