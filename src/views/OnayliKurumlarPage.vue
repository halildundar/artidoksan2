<script setup lang="ts">
import {
  IonPage,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  onIonViewWillEnter,
  type InfiniteScrollCustomEvent,
} from '@ionic/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getOnayliKurumlar, deleteOnayliKurum, type OnayliKurum } from '@/services/onayliKurumService';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import { blurActive } from '@/utils/blurActive';

const router = useRouter();

const kurumlar = ref<OnayliKurum[]>([]);
const toplam = ref(0);
const yukleniyor = ref(false);
const hata = ref('');
const arama = ref('');

async function yukle() {
  yukleniyor.value = true;
  hata.value = '';
  try {
    const sonuc = await getOnayliKurumlar(arama.value.trim() || undefined);
    kurumlar.value = sonuc.items;
    toplam.value = sonuc.total;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kurumlar yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

// Scroll sonuna gelince sonraki 100 kayıt listeye EKLENEREK yüklenir
async function dahaYukle(ev: InfiniteScrollCustomEvent) {
  try {
    const sonuc = await getOnayliKurumlar(arama.value.trim() || undefined, kurumlar.value.length);
    kurumlar.value.push(...sonuc.items);
    toplam.value = sonuc.total;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Devamı yüklenemedi';
  } finally {
    ev.target.complete();
  }
}

function geri() {
  blurActive();
  router.back();
}

function git(path: string) {
  blurActive();
  router.push(path);
}

// Silme onayı uygulama içi diyalogla sorulur (proje kuralı — window.confirm yok)
const silinecek = ref<OnayliKurum | null>(null);
const siliniyor = ref(false);

function sil(kurum: OnayliKurum) {
  blurActive();
  silinecek.value = kurum;
}

async function silmeyiOnayla() {
  const kurum = silinecek.value;
  if (!kurum || siliniyor.value) return;
  siliniyor.value = true;
  hata.value = '';
  try {
    await deleteOnayliKurum(kurum._id);
    silinecek.value = null;
    await yukle();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Silinemedi';
    silinecek.value = null;
  } finally {
    siliniyor.value = false;
  }
}

function tarih(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR') : '';
}

onIonViewWillEnter(yukle);
</script>

<template>
  <ion-page>
    <!-- Header: geri + başlık + Yeni Ekle, scroll boyunca sabit -->
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-900">
        <header class="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <button type="button" @click="geri"
              class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <h1 class="truncate text-base font-bold leading-8 tracking-wide text-ink">Onaylı Kurumlar</h1>
          </div>
          <button type="button" @click="git('/ayarlar/onayli-kurumlar/yeni')"
            class="flex shrink-0 items-center gap-1.5 bg-[#2b5c3d] px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Yeni Ekle
          </button>
        </header>

        <!-- Arama: NoBo veya ünvan -->
        <div class="mx-auto max-w-lg px-4 pb-3">
          <div class="flex items-center gap-2 bg-surface-900 px-2.5 ring-1 ring-white/10 focus-within:ring-white/30">
            <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input v-model="arama" type="search" @keyup.enter="yukle" @input="!arama && yukle()"
              class="w-full bg-transparent py-1.5 text-xs text-ink outline-none placeholder:text-ink-muted/50"
              placeholder="Ünvan, NoBo veya ülke ara (Enter)" />
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
          <p v-else-if="!kurumlar.length" class="py-8 text-center text-sm text-ink-muted">
            {{ arama ? 'Aramayla eşleşen kurum yok.' : 'Henüz onaylı kurum yok. Sağ üstteki "Yeni Ekle" ile ekleyin.' }}
          </p>
          <p v-else class="text-[11px] text-ink-muted/70">
            {{ kurumlar.length }} / {{ toplam }} kayıt gösteriliyor
          </p>

          <div v-for="kurum in kurumlar" :key="kurum._id"
            class="flex items-center gap-3 bg-surface-800 p-3 ring-1 ring-white/5">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-ink">{{ kurum.unvan }}</span>
              <span class="block truncate text-xs text-ink-muted">
                NoBo: {{ kurum.nobo }}{{ kurum.ulke ? ` • ${kurum.ulke}` : '' }}{{ kurum.kurumTipi ? ` • ${kurum.kurumTipi}` : '' }}
              </span>
              <span v-if="kurum.sonOnayTarihi" class="mt-0.5 block text-[11px] text-ink-muted/80">
                Son onay: {{ tarih(kurum.sonOnayTarihi) }}
              </span>
            </span>
            <button type="button" @click="git(`/ayarlar/onayli-kurumlar/${kurum._id}/duzenle`)"
              class="grid h-8 w-8 shrink-0 place-items-center bg-surface-900 text-ink-muted ring-1 ring-white/10 active:bg-[#1a2a20]"
              aria-label="Düzenle">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.17 6.83a2.85 2.85 0 0 0-4-4L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <button type="button" @click="sil(kurum)"
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

        <!-- Scroll sonunda sonraki sayfayı ekleyerek yükler -->
        <ion-infinite-scroll :disabled="yukleniyor || kurumlar.length >= toplam" @ionInfinite="dahaYukle">
          <ion-infinite-scroll-content loading-text="Yükleniyor…"></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </div>
    </ion-content>

    <SilmeOnayi :acik="!!silinecek" :siliniyor="siliniyor"
      :aciklama="silinecek?.unvan ?? ''"
      @vazgec="silinecek = null" @onayla="silmeyiOnayla" />
  </ion-page>
</template>
