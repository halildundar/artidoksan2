<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue';

// Yeni sürüm bildirimi (PWA): servis işçisi yeni build'i indirince altta bir
// şerit çıkar; "Güncelle" yeni sürümü etkinleştirip sayfayı yeniler, "Sonra"
// şeridi kapatır (bir sonraki açılışta yine sorar). Açık kalan sekmelerin
// güncellemeyi yakalaması için saatte bir sunucudan sürüm kontrolü yapılır.
const KONTROL_ARALIGI_MS = 60 * 60 * 1000;

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, kayit) {
    if (!kayit) return;
    setInterval(() => {
      kayit.update().catch(() => { /* çevrimdışıysa sonraki tur dener */ });
    }, KONTROL_ARALIGI_MS);
  },
});
</script>

<template>
  <Teleport to="body">
    <div v-if="needRefresh"
      class="fixed inset-x-0 bottom-0 z-50 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        class="mx-auto flex max-w-lg items-center gap-2 border-t border-white/10 bg-[#101a14] px-4 py-3 shadow-lg ring-1 ring-white/10">
        <span class="min-w-0 flex-1 text-xs text-ink">
          <span class="font-semibold">Yeni sürüm hazır.</span>
          Güncellemek için dokunun.
        </span>
        <button type="button" @click="needRefresh = false"
          class="shrink-0 bg-surface-800 px-3 py-2 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
          Sonra
        </button>
        <button type="button" @click="updateServiceWorker()"
          class="shrink-0 bg-[#2b5c3d] px-3 py-2 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
          Güncelle
        </button>
      </div>
    </div>
  </Teleport>
</template>
