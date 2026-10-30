<script setup lang="ts">
import { IonPage, IonContent, IonHeader, onIonViewWillEnter } from '@ionic/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getSmmFirmalari, deleteSmmFirmasi, type SmmFirmasi } from '@/services/smmFirmaService';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import { blurActive } from '@/utils/blurActive';

const router = useRouter();

const firmalar = ref<SmmFirmasi[]>([]);
const yukleniyor = ref(false);
const hata = ref('');

async function yukle() {
  yukleniyor.value = true;
  hata.value = '';
  try {
    firmalar.value = await getSmmFirmalari();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'SMM firmaları yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

onIonViewWillEnter(yukle);

function git(path: string) {
  blurActive();
  router.push(path);
}

const silinecek = ref<SmmFirmasi | null>(null);
const siliniyor = ref(false);

async function silOnayla() {
  const f = silinecek.value;
  if (!f) return;
  siliniyor.value = true;
  try {
    await deleteSmmFirmasi(f._id);
    firmalar.value = firmalar.value.filter((x) => x._id !== f._id);
    silinecek.value = null;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'SMM firması silinemedi';
    silinecek.value = null;
  } finally {
    siliniyor.value = false;
  }
}
</script>

<template>
  <ion-page>
    <!-- Header: scroll boyunca üstte sabit -->
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-900">
        <header class="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <button type="button" @click="git('/ayarlar')"
              class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <h1 class="truncate text-base font-bold leading-8 tracking-wide text-ink">SMM Firmaları</h1>
          </div>
          <button type="button" @click="git('/ayarlar/smm-firmalari/yeni')"
            class="flex shrink-0 items-center gap-1.5 bg-[#2b5c3d] px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Yeni Ekle
          </button>
        </header>
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
          <p v-else-if="!firmalar.length" class="py-8 text-center text-sm text-ink-muted">
            Henüz SMM firması yok. Sağ üstteki "Yeni Ekle" ile ilk firmayı ekleyin.
          </p>

          <div v-for="f in firmalar" :key="f._id"
            class="flex w-full items-center gap-2 bg-surface-800 p-3 ring-1 ring-white/5">
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span v-if="f.yil"
                  class="shrink-0 bg-[#1c2a21] px-2 py-0.5 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                  {{ f.yil }}
                </span>
                <span class="truncate text-xs font-semibold text-ink">{{ f.kisaAd }}</span>
              </span>
              <span class="mt-1 block truncate text-[11px] text-ink-muted">{{ f.unvan || '—' }}</span>
              <span v-if="f.makMuhAdSoyad || f.elkMuhAdSoyad"
                class="mt-0.5 block truncate text-[11px] text-ink-muted/80">
                {{ [f.makMuhAdSoyad, f.elkMuhAdSoyad].filter(Boolean).join(' • ') }}
              </span>
            </span>
            <button type="button" @click="git(`/ayarlar/smm-firmalari/${f._id}/duzenle`)"
              aria-label="Düzenle"
              class="grid h-7 w-7 shrink-0 place-items-center bg-surface-900 text-ink-muted ring-1 ring-white/10">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.17 6.83a2.85 2.85 0 0 0-4-4L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <button type="button" @click="silinecek = f" aria-label="SMM firmasını sil"
              class="grid h-7 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
              ✕
            </button>
          </div>
        </section>
      </div>
    </ion-content>

    <SilmeOnayi :acik="silinecek != null" :siliniyor="siliniyor"
      :aciklama="silinecek ? `${silinecek.kisaAd} SMM firması silinecek. Emin misiniz?` : ''"
      @vazgec="silinecek = null" @onayla="silOnayla" />
  </ion-page>
</template>
