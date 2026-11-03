<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

// Şema çizimleri sabit piksel ölçüsünde (genislik × yukseklik) tasarlandı;
// dar ekranda (telefon) taşıp yatay kaydırma çubuğu açmasın diye, kullanılabilir
// genişliğe göre küçültülür (büyütülmez). İçerideki tüm öğeler (ölçü etiketleri,
// açılır kutular) çizimle birlikte orantılı ölçeklenir.
const props = defineProps<{ genislik: number; yukseklik: number }>();

const kap = ref<HTMLElement | null>(null);
const olcek = ref(1);
let gozlemci: ResizeObserver | null = null;

function hesapla() {
  const w = kap.value?.clientWidth ?? 0;
  olcek.value = w > 0 ? Math.min(1, w / props.genislik) : 1;
}

onMounted(() => {
  hesapla();
  if (kap.value && typeof ResizeObserver !== 'undefined') {
    gozlemci = new ResizeObserver(hesapla);
    gozlemci.observe(kap.value);
  }
});

onBeforeUnmount(() => gozlemci?.disconnect());
</script>

<template>
  <div ref="kap" class="w-full" style="overflow-x: clip" :style="{ height: `${yukseklik * olcek}px` }">
    <div class="mx-auto origin-top-left"
      :style="{ width: `${genislik}px`, height: `${yukseklik}px`, transform: olcek < 1 ? `scale(${olcek})` : undefined }">
      <slot />
    </div>
  </div>
</template>
