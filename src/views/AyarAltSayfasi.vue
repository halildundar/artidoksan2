<script setup lang="ts">
import { IonPage, IonContent, IonHeader } from '@ionic/vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { blurActive } from '@/utils/blurActive';

// Ayarlar altındaki üç bölümün ortak iskeleti — başlık route meta'sından
// gelir, içerikler sonra doldurulacak.
const route = useRoute();
const router = useRouter();

const baslik = computed(() => (route.meta.baslik as string) ?? 'Ayarlar');

function geri() {
  blurActive();
  router.back();
}
</script>

<template>
  <ion-page>
    <!-- Header: geri butonu başlıktan önce, scroll boyunca sabit -->
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-900">
        <header class="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button type="button" @click="geri"
            class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 class="truncate text-xl font-bold leading-8 tracking-wide text-ink">{{ baslik }}</h1>
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg p-4">
        <!-- TODO: içerik sonra doldurulacak -->
        <p class="text-sm text-ink-muted">{{ baslik }} içeriği yakında eklenecek.</p>
      </div>
    </ion-content>
  </ion-page>
</template>
