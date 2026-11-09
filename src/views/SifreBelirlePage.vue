<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { hesapDogrula, kodTekrar, parolaSifirla, parolaSifirlaIste } from '@/services/authService';
import { blurActive } from '@/utils/blurActive';

// İki mod: /dogrula (yönetici davetiyle hesap doğrulama + şifre belirleme) ve
// /sifre-sifirla (şifremi unuttum). E-postadaki butondan token ile gelinir; token yoksa e-posta + kod girilir.
const route = useRoute();
const router = useRouter();

const sifirlama = computed(() => route.meta.mod === 'sifirla');
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));

const email = ref(typeof route.query.email === 'string' ? route.query.email : '');
const kod = ref('');
const yeniParola = ref('');
const tekrar = ref('');
const kodIstendi = ref(false); // sıfırlamada: kod gönderildi, kod girişi açık
const mesgul = ref(false);
const hata = ref('');
const bilgi = ref('');
const bitti = ref(false);

const baslik = computed(() => (sifirlama.value ? 'Şifre sıfırlama' : 'Hesabınızı doğrulayın'));
const kodAdimi = computed(() => !!token.value || !sifirlama.value || kodIstendi.value);
const parolaTamam = computed(() => yeniParola.value.length >= 8 && yeniParola.value === tekrar.value);
const gonderilebilir = computed(() =>
  parolaTamam.value && (token.value ? true : email.value.trim() !== '' && kod.value.trim().length >= 6));

async function kodIste() {
  if (!email.value.trim() || mesgul.value) return;
  mesgul.value = true;
  hata.value = '';
  try {
    await parolaSifirlaIste(email.value.trim());
    kodIstendi.value = true;
    bilgi.value = 'Kayıtlı bir hesap varsa e-posta adresine kod ve bağlantı gönderildi.';
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kod gönderilemedi';
  } finally {
    mesgul.value = false;
  }
}

async function tekrarGonder() {
  if (mesgul.value) return;
  mesgul.value = true;
  hata.value = '';
  try {
    await kodTekrar(email.value.trim(), sifirlama.value ? 'parola-sifirla' : 'hesap-dogrula');
    bilgi.value = 'Yeni kod gönderildi (varsa).';
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kod gönderilemedi';
  } finally {
    mesgul.value = false;
  }
}

async function kaydet() {
  if (!gonderilebilir.value || mesgul.value) return;
  mesgul.value = true;
  hata.value = '';
  const v = token.value
    ? { token: token.value, yeniParola: yeniParola.value }
    : { email: email.value.trim(), kod: kod.value.trim(), yeniParola: yeniParola.value };
  try {
    if (sifirlama.value) await parolaSifirla(v);
    else await hesapDogrula(v);
    bitti.value = true;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'İşlem başarısız';
  } finally {
    mesgul.value = false;
  }
}

function girise() {
  blurActive();
  router.replace('/giris');
}

const girdi = 'w-full bg-surface-900 px-3 py-2.5 text-sm text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30';
</script>

<template>
  <ion-page>
    <ion-content>
      <div class="mx-auto flex min-h-full max-w-sm flex-col justify-center px-5 py-10">
        <div class="mb-6 text-center">
          <h1 class="text-2xl font-bold tracking-wide text-ink">Artidoksan</h1>
          <p class="mt-1 text-xs text-ink-muted">TüvNord Asansör</p>
        </div>

        <div class="space-y-3 bg-surface-800 p-4 ring-1 ring-white/5">
          <!-- Tamamlandı -->
          <template v-if="bitti">
            <h2 class="text-sm font-bold text-ink">{{ sifirlama ? 'Şifreniz güncellendi' : 'Hesabınız doğrulandı' }}</h2>
            <p class="text-xs text-ink-muted">Yeni şifrenizle giriş yapabilirsiniz.</p>
            <button type="button" @click="girise"
              class="w-full bg-[#2b5c3d] px-4 py-3 text-sm font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
              Giriş yap
            </button>
          </template>

          <form v-else class="space-y-3" @submit.prevent="kaydet">
            <h2 class="text-sm font-bold text-ink">{{ baslik }}</h2>
            <p v-if="hata" class="bg-red-950/60 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/20">{{ hata }}</p>
            <p v-else-if="bilgi" class="bg-[#223c2d]/60 px-3 py-2 text-xs text-ink ring-1 ring-white/10">{{ bilgi }}</p>

            <p v-if="token" class="text-xs text-ink-muted">
              {{ sifirlama ? 'Yeni şifrenizi belirleyin.' : 'E-posta adresiniz doğrulanacak. Giriş için bir şifre belirleyin.' }}
            </p>

            <!-- Token yoksa: e-posta (+ sıfırlamada kod isteme) ve kod -->
            <template v-else>
              <label class="block space-y-1">
                <span class="text-xs font-medium text-ink-muted">E-posta</span>
                <input v-model="email" type="email" inputmode="email" autocomplete="username" :class="girdi" placeholder="ornek@mail.com" />
              </label>
              <button v-if="sifirlama && !kodIstendi" type="button" :disabled="!email.trim() || mesgul" @click="kodIste"
                class="w-full bg-[#2b5c3d] px-4 py-3 text-sm font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-50">
                {{ mesgul ? 'Gönderiliyor…' : 'Kod gönder' }}
              </button>
              <template v-if="kodAdimi">
                <label class="block space-y-1">
                  <span class="text-xs font-medium text-ink-muted">E-postadaki 6 haneli kod</span>
                  <input v-model="kod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6"
                    :class="girdi + ' text-center tracking-[0.4em]'" placeholder="000000" />
                </label>
                <button type="button" :disabled="mesgul || !email.trim()" @click="tekrarGonder"
                  class="text-xs font-semibold text-ink-muted underline disabled:opacity-60">Kodu tekrar gönder</button>
              </template>
            </template>

            <template v-if="kodAdimi">
              <label class="block space-y-1">
                <span class="text-xs font-medium text-ink-muted">Yeni şifre (en az 8 karakter)</span>
                <input v-model="yeniParola" type="password" autocomplete="new-password" :class="girdi" />
              </label>
              <label class="block space-y-1">
                <span class="text-xs font-medium text-ink-muted">Yeni şifre (tekrar)</span>
                <input v-model="tekrar" type="password" autocomplete="new-password" :class="girdi" />
              </label>
              <p v-if="tekrar && yeniParola !== tekrar" class="text-xs text-red-300">Şifreler aynı değil.</p>
              <button type="submit" :disabled="!gonderilebilir || mesgul"
                class="w-full bg-[#2b5c3d] px-4 py-3 text-sm font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-50">
                {{ mesgul ? 'Kaydediliyor…' : (sifirlama ? 'Şifreyi güncelle' : 'Doğrula ve şifreyi kaydet') }}
              </button>
            </template>

            <button type="button" class="w-full text-center text-xs text-ink-muted" @click="girise">← Girişe dön</button>
          </form>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>
