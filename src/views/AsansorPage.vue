<script setup lang="ts">
import KullaniciMenusu from '@/components/KullaniciMenusu.vue';
import { IonPage, IonContent, IonHeader, onIonViewWillEnter } from '@ionic/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getAsansorler, deleteAsansor, type Asansor } from '@/services/asansorService';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import { blurActive } from '@/utils/blurActive';

const router = useRouter();

const asansorler = ref<Asansor[]>([]);
const yukleniyor = ref(false);
const hata = ref('');
const arama = ref('');

async function yukle() {
  yukleniyor.value = true;
  hata.value = '';
  try {
    asansorler.value = await getAsansorler({ search: arama.value.trim() || undefined });
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Asansörler yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

function git(path: string) {
  blurActive();
  router.push(path);
}

function firmaAdi(asansor: Asansor) {
  return typeof asansor.firmaId === 'object' && asansor.firmaId ? asansor.firmaId.ad : '';
}

// Silme onayı uygulama içi diyalogla sorulur (proje kuralı — window.confirm yok)
const silinecek = ref<Asansor | null>(null);
const siliniyor = ref(false);

function sil(asansor: Asansor) {
  blurActive();
  silinecek.value = asansor;
}

async function silmeyiOnayla() {
  const asansor = silinecek.value;
  if (!asansor || siliniyor.value) return;
  siliniyor.value = true;
  hata.value = '';
  try {
    await deleteAsansor(asansor._id);
    silinecek.value = null;
    await yukle();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Silinemedi';
    silinecek.value = null;
  } finally {
    siliniyor.value = false;
  }
}

onIonViewWillEnter(yukle);
</script>

<template>
  <ion-page>
    <!-- Header: başlık + Yeni Ekle + arama, scroll boyunca sabit -->
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-bar">
        <header class="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <h1 class="truncate text-xl font-bold leading-8 tracking-wide text-ink">Asansörler</h1>
          <div class="flex shrink-0 items-center gap-2">
          <button type="button" @click="git('/asansor/yeni')"
            class="flex shrink-0 items-center gap-1.5 bg-[#2b5c3d] px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Yeni Ekle
          </button>
          <KullaniciMenusu />
        </div>
        </header>

        <div class="mx-auto max-w-lg px-4 pb-3">
          <div class="flex items-center gap-2 bg-surface-900 px-2.5 ring-1 ring-white/10 focus-within:ring-white/30">
            <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input v-model="arama" type="search" @keyup.enter="yukle" @input="!arama && yukle()"
              class="w-full bg-transparent py-1.5 text-xs text-ink outline-none placeholder:text-ink-muted/50"
              placeholder="Ruhsat no, seri no, yapı sahibi veya il/ilçe ara (Enter)" />
          </div>
        </div>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg">
        <div v-if="hata"
          class="mx-4 mt-4 flex items-center gap-2 bg-red-950/60 px-3 py-2 ring-1 ring-red-500/20">
          <span class="min-w-0 flex-1 text-sm text-red-300">{{ hata }}</span>
          <button type="button" @click="yukle"
            class="shrink-0 bg-surface-800 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-white/10">
            Tekrar Dene
          </button>
        </div>

        <section class="space-y-2 px-4 pb-6 pt-4">
          <p v-if="yukleniyor" class="py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>
          <p v-else-if="!asansorler.length" class="py-8 text-center text-sm text-ink-muted">
            {{ arama ? 'Aramayla eşleşen asansör yok.' : 'Henüz asansör yok. Sağ üstteki "Yeni Ekle" ile ekleyin.' }}
          </p>

          <div v-for="asansor in asansorler" :key="asansor._id"
            class="flex items-center gap-3 bg-surface-800 p-3 ring-1 ring-white/5">
            <!-- Satıra dokununca detay sayfası (buton grubu + özetler) açılır -->
            <button type="button" @click="git(`/asansor/${asansor._id}`)"
              class="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span class="grid h-11 w-11 shrink-0 place-items-center bg-[#1c2a21] ring-1 ring-white/10">
                <svg class="h-5 w-5 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <path d="M8.5 15v-5.5M6.5 11.5l2-2 2 2" />
                  <path d="M15.5 9.5V15M13.5 13l2 2 2-2" />
                </svg>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold text-ink">Seri: {{ asansor.seriNo || asansor.yapiRuhsatNo || '—' }}</span>
                <span class="block truncate text-xs text-ink-muted">
                  {{ [firmaAdi(asansor), [asansor.ilce, asansor.il].filter(Boolean).join('/')].filter(Boolean).join(' • ') || 'Bilgi girilmedi' }}
                </span>
                <span class="mt-0.5 block text-[11px] text-ink-muted/80">
                  {{ [asansor.tahrikTipi === 'elektrikli' ? 'Elektrikli' : asansor.tahrikTipi === 'hidrolik' ? 'Hidrolik' : '', asansor.yapiRuhsatNo ? `Ruhsat: ${asansor.yapiRuhsatNo}` : ''].filter(Boolean).join(' • ') }}
                </span>
              </span>
            </button>
            <button type="button" @click="sil(asansor)"
              class="grid h-8 w-8 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20 active:bg-red-950/40"
              aria-label="Sil">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        </section>
      </div>
    </ion-content>

    <SilmeOnayi :acik="!!silinecek" :siliniyor="siliniyor"
      :aciklama="silinecek ? `${silinecek.seriNo || silinecek.yapiRuhsatNo} seri no'lu asansör` : ''"
      @vazgec="silinecek = null" @onayla="silmeyiOnayla" />
  </ion-page>
</template>
