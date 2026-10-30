<script setup lang="ts">
import { IonPage, IonContent, IonHeader } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { blurActive } from '@/utils/blurActive';

const router = useRouter();

function git(path: string) {
  blurActive();
  router.push(path);
}
</script>

<template>
  <ion-page>
    <!-- Header: scroll boyunca üstte sabit -->
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-900">
        <header class="mx-auto max-w-lg px-4 py-3">
          <h1 class="text-xl font-bold leading-8 tracking-wide text-ink">Ayarlar</h1>
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg space-y-2 px-4 py-4">
        <!-- Onaylı Kurumlar -->
        <button type="button" @click="git('/ayarlar/onayli-kurumlar')"
          class="flex w-full items-center gap-3 bg-surface-800 p-3 text-left ring-1 ring-white/5 active:bg-[#1a2a20]">
          <span class="grid h-10 w-10 shrink-0 place-items-center bg-[#1c2a21] ring-1 ring-white/10">
            <!-- Onaylı kurum: rozet + onay -->
            <svg class="h-5 w-5 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <span class="flex-1 text-sm font-semibold text-ink">Onaylı Kurumlar</span>
          <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <!-- Danışmanlar -->
        <button type="button" @click="git('/ayarlar/danismanlar')"
          class="flex w-full items-center gap-3 bg-surface-800 p-3 text-left ring-1 ring-white/5 active:bg-[#1a2a20]">
          <span class="grid h-10 w-10 shrink-0 place-items-center bg-[#1c2a21] ring-1 ring-white/10">
            <!-- Danışman: kulaklıklı destek -->
            <svg class="h-5 w-5 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path d="M21 11h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1" />
              <path d="M3 11a9 9 0 1 1 18 0v5a4 4 0 0 1-4 4h-5" />
            </svg>
          </span>
          <span class="flex-1 text-sm font-semibold text-ink">Danışmanlar</span>
          <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <!-- CE Belgeleri (Aksam Kataloğu) -->
        <button type="button" @click="git('/ayarlar/ce-belgeleri')"
          class="flex w-full items-center gap-3 bg-surface-800 p-3 text-left ring-1 ring-white/5 active:bg-[#1a2a20]">
          <span class="grid h-10 w-10 shrink-0 place-items-center bg-[#1c2a21] ring-1 ring-white/10">
            <!-- CE belgesi: rozetli dosya -->
            <svg class="h-5 w-5 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="m9 15 2 2 4-4" />
            </svg>
          </span>
          <span class="flex-1 text-sm font-semibold text-ink">CE Belgeleri</span>
          <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <!-- SMM Firmaları -->
        <button type="button" @click="git('/ayarlar/smm-firmalari')"
          class="flex w-full items-center gap-3 bg-surface-800 p-3 text-left ring-1 ring-white/5 active:bg-[#1a2a20]">
          <span class="grid h-10 w-10 shrink-0 place-items-center bg-[#1c2a21] ring-1 ring-white/10">
            <!-- SMM firması: bina + kişi -->
            <svg class="h-5 w-5 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
              <path d="M10 6h4M10 10h4" />
              <circle cx="12" cy="16" r="1.5" />
              <path d="M9.5 22a2.5 2.5 0 0 1 5 0" />
            </svg>
          </span>
          <span class="flex-1 text-sm font-semibold text-ink">SMM Firmaları</span>
          <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <!-- Güvenlik Aksamları -->
        <button type="button" @click="git('/ayarlar/guvenlik-aksamlari')"
          class="flex w-full items-center gap-3 bg-surface-800 p-3 text-left ring-1 ring-white/5 active:bg-[#1a2a20]">
          <span class="grid h-10 w-10 shrink-0 place-items-center bg-[#1c2a21] ring-1 ring-white/10">
            <!-- Güvenlik aksamı: kalkan -->
            <svg class="h-5 w-5 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
          </span>
          <span class="flex-1 text-sm font-semibold text-ink">Güvenlik Aksamlar</span>
          <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </ion-content>
  </ion-page>
</template>
