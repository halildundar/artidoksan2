<script setup lang="ts">
import { IonPage, IonContent, IonHeader } from '@ionic/vue';
</script>

<template>
  <ion-page>
    <!-- Header: scroll boyunca üstte sabit -->
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-bar">
        <header class="mx-auto max-w-lg px-4 py-3">
          <h1 class="text-xl font-bold leading-8 tracking-wide text-ink">Rapor</h1>
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg p-4">
        <p class="text-sm text-ink-muted">Rapor ekranı yakında doldurulacak.</p>
      </div>
    </ion-content>
  </ion-page>
</template>
