<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import FileViewerHost from '@/components/FileViewerHost.vue';
</script>

<template>
  <ion-app>
    <ion-router-outlet />
    <!-- Uygulama genelinde tek dosya görüntüleyici (useFileViewer ile açılır) -->
    <FileViewerHost />
  </ion-app>
</template>
