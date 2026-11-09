<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { ROL_ETIKETLERI } from '@/services/kullaniciService';
import { parolaDegistirIste, parolaDegistirOnayla } from '@/services/authService';
import { blurActive } from '@/utils/blurActive';

// Ana menü başlıklarının sağ köşesindeki kullanıcı simgesi: ad soyad, rol, e-posta, Şifre değiştir, Çıkış.
// Oturum açılmamışsa kutuda "Giriş yap" bağlantısı görünür.
const router = useRouter();
const { kullanici, cikis } = useAuth();

const acik = ref(false);
const dugme = ref<HTMLButtonElement | null>(null);
const konum = ref({ ust: 0, sag: 0 });

async function ac() {
  blurActive();
  acik.value = !acik.value;
  if (acik.value) {
    await nextTick();
    const r = dugme.value?.getBoundingClientRect();
    if (r) konum.value = { ust: r.bottom + 8, sag: Math.max(8, window.innerWidth - r.right) };
  }
}

function tusa(e: KeyboardEvent) {
  if (e.key === 'Escape') { acik.value = false; sifreAcik.value = false; }
}
watch(acik, (a) => (a ? document.addEventListener('keydown', tusa) : document.removeEventListener('keydown', tusa)));
onBeforeUnmount(() => document.removeEventListener('keydown', tusa));

const baslangic = () => (kullanici.value ? `${kullanici.value.ad[0] ?? ''}${kullanici.value.soyad[0] ?? ''}`.toLocaleUpperCase('tr') : '');

function girisSayfasi() {
  acik.value = false;
  router.push('/giris');
}

async function cikisYap() {
  acik.value = false;
  await cikis();
  router.replace('/giris');
}

// ---- Şifre değiştirme: mevcut + yeni şifre → e-postaya gelen kodla onay ----
const sifreAcik = ref(false);
const adim = ref<'form' | 'kod' | 'bitti'>('form');
const mevcut = ref('');
const yeni = ref('');
const tekrar = ref('');
const kod = ref('');
const eposta = ref('');
const mesgul = ref(false);
const hata = ref('');

function sifreAc() {
  acik.value = false;
  sifreAcik.value = true;
  adim.value = 'form';
  mevcut.value = yeni.value = tekrar.value = kod.value = hata.value = '';
}

async function kodIste() {
  if (mesgul.value) return;
  if (yeni.value.length < 8) { hata.value = 'Yeni şifre en az 8 karakter olmalıdır.'; return; }
  if (yeni.value !== tekrar.value) { hata.value = 'Yeni şifreler aynı değil.'; return; }
  mesgul.value = true;
  hata.value = '';
  try {
    const r = await parolaDegistirIste(mevcut.value, yeni.value);
    eposta.value = r.eposta;
    adim.value = 'kod';
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'İşlem başarısız';
  } finally {
    mesgul.value = false;
  }
}

async function onayla() {
  if (mesgul.value || kod.value.trim().length < 6) return;
  mesgul.value = true;
  hata.value = '';
  try {
    await parolaDegistirOnayla(kod.value.trim());
    adim.value = 'bitti';
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kod doğrulanamadı';
  } finally {
    mesgul.value = false;
  }
}

const girdi = 'w-full bg-surface-900 px-3 py-2.5 text-sm text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30';
</script>

<template>
  <div class="shrink-0">
    <button ref="dugme" type="button" aria-label="Kullanıcı menüsü" :aria-expanded="acik" @click="ac"
      class="grid h-9 w-9 place-items-center bg-surface-800 text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
      </svg>
    </button>

    <Teleport to="body">
      <!-- Açılır kutu: dışına tıklayınca kapanır -->
      <div v-if="acik" class="fixed inset-0 z-[60]" @click="acik = false">
        <div class="fixed w-64 overflow-hidden bg-surface-800 shadow-xl shadow-black/40 ring-1 ring-white/10"
          :style="{ top: `${konum.ust}px`, right: `${konum.sag}px` }" @click.stop>
          <!-- Oturum açılmamış -->
          <div v-if="!kullanici" class="space-y-2 p-3">
            <p class="text-xs text-ink-muted">Oturum açılmadı.</p>
            <button type="button" @click="girisSayfasi"
              class="w-full bg-[#2b5c3d] px-3 py-2 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
              Giriş yap
            </button>
          </div>
          <template v-else>
          <div class="flex items-center gap-3 border-b border-white/5 p-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center bg-[#2b5c3d] text-sm font-bold text-ink ring-1 ring-white/10">
              {{ baslangic() }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-bold text-ink">{{ kullanici.ad }} {{ kullanici.soyad }}</span>
              <span class="mt-0.5 inline-block bg-[#1c2a21] px-2 py-0.5 text-[10px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                {{ ROL_ETIKETLERI[kullanici.rol] }}
              </span>
            </span>
          </div>
          <p class="truncate border-b border-white/5 px-3 py-2 text-xs text-ink-muted">{{ kullanici.email }}</p>
          <button type="button" @click="sifreAc"
            class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-ink active:bg-[#1a2a20]">
            <svg class="h-4 w-4 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Şifre değiştir
          </button>
          <button type="button" @click="cikisYap"
            class="flex w-full items-center gap-2 border-t border-white/5 px-3 py-2.5 text-left text-xs font-semibold text-red-300/90 active:bg-red-950/40">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Çıkış yap
          </button>
          </template>
        </div>
      </div>

      <!-- Şifre değiştirme: tam sayfa -->
      <div v-if="sifreAcik && kullanici" class="fixed inset-0 z-[70] flex flex-col bg-[#101a14]">
        <div
          class="flex shrink-0 items-center gap-2 border-b border-white/5 bg-surface-bar px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button type="button" aria-label="Geri" @click="sifreAcik = false"
            class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h2 class="min-w-0 flex-1 truncate text-sm font-bold text-ink">Şifre değiştir</h2>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <div class="mx-auto max-w-sm space-y-3">
            <p v-if="hata" class="bg-red-950/60 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/20">{{ hata }}</p>

            <form v-if="adim === 'form'" class="space-y-3" @submit.prevent="kodIste">
              <label class="block space-y-1">
                <span class="text-xs font-medium text-ink-muted">Mevcut şifre</span>
                <input v-model="mevcut" type="password" autocomplete="current-password" :class="girdi" />
              </label>
              <label class="block space-y-1">
                <span class="text-xs font-medium text-ink-muted">Yeni şifre (en az 8 karakter)</span>
                <input v-model="yeni" type="password" autocomplete="new-password" :class="girdi" />
              </label>
              <label class="block space-y-1">
                <span class="text-xs font-medium text-ink-muted">Yeni şifre (tekrar)</span>
                <input v-model="tekrar" type="password" autocomplete="new-password" :class="girdi" />
              </label>
              <p class="text-[11px] text-ink-muted">Güvenliğiniz için e-posta adresinize bir onay kodu göndereceğiz.</p>
              <button type="submit" :disabled="mesgul || !mevcut || !yeni"
                class="w-full bg-[#2b5c3d] px-4 py-3 text-sm font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-50">
                {{ mesgul ? 'Gönderiliyor…' : 'Onay kodu gönder' }}
              </button>
            </form>

            <form v-else-if="adim === 'kod'" class="space-y-3" @submit.prevent="onayla">
              <p class="text-xs text-ink-muted">{{ eposta }} adresine gelen 6 haneli kodu girin.</p>
              <input v-model="kod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6"
                :class="girdi + ' text-center text-lg tracking-[0.5em]'" placeholder="000000" />
              <button type="submit" :disabled="mesgul || kod.trim().length < 6"
                class="w-full bg-[#2b5c3d] px-4 py-3 text-sm font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-50">
                {{ mesgul ? 'Doğrulanıyor…' : 'Şifreyi değiştir' }}
              </button>
              <button type="button" class="w-full text-center text-xs text-ink-muted" @click="adim = 'form'">← Geri dön</button>
            </form>

            <div v-else class="space-y-3">
              <p class="bg-[#223c2d]/60 px-3 py-2 text-xs text-ink ring-1 ring-white/10">
                Şifreniz değiştirildi. Diğer cihazlardaki oturumlar kapatıldı.
              </p>
              <button type="button" @click="sifreAcik = false"
                class="w-full bg-[#2b5c3d] px-4 py-3 text-sm font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                Tamam
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
