<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import FileViewerHost from '@/components/FileViewerHost.vue';
import GuncellemeBildirimi from '@/components/GuncellemeBildirimi.vue';
import GirisEkrani from '@/components/GirisEkrani.vue';
import OturumUyarisi from '@/components/OturumUyarisi.vue';
import { useTema } from '@/composables/useTema';

// Kayıtlı tema tercihi uygulanır (koyu varsayılan)
useTema().baslat();
</script>

<template>
  <ion-app>
    <!-- Koyu temalı açılış ekranı — kısa süre görünüp solarak kaybolur -->
    <GirisEkrani />
    <ion-router-outlet />
    <!-- Uygulama genelinde tek dosya görüntüleyici (useFileViewer ile açılır) -->
    <FileViewerHost />
    <!-- Yeni sürüm çıktığında alttan "Güncelle" şeridi gösterir -->
    <GuncellemeBildirimi />
    <!-- Oturum bitmeden son 2 dakikada geri sayımlı uyarı -->
    <OturumUyarisi />
  </ion-app>
</template>
