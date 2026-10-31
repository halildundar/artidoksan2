<script setup lang="ts">
import { onMounted, ref } from 'vue';

// Koyu temalı giriş ekranı: uygulama açılır açılmaz tam ekran görünür,
// kısa bir süre kalır ve yumuşakça solup kaybolur (kullanıcı isteği).
const GORUNME_MS = 1800;
const SOLMA_MS = 500;

const gorunur = ref(true);
const soluyor = ref(false);

onMounted(() => {
  setTimeout(() => {
    soluyor.value = true;
    setTimeout(() => (gorunur.value = false), SOLMA_MS);
  }, GORUNME_MS);
});
</script>

<template>
  <Teleport to="body">
    <!-- Zemin inline style: marka rengi — açık temada da koyu kalır
      (tailwind.css'teki açık tema ezmesi bg-[#223c2d] sınıfını değiştirir) -->
    <div v-if="gorunur"
      class="fixed inset-0 z-[70] grid place-items-center transition-opacity duration-500"
      style="background-color: #223c2d"
      :class="soluyor ? 'opacity-0' : 'opacity-100'">
      <div class="flex flex-col items-center gap-5 px-8">
        <!-- TÜV NORD yazı logosu (resmî vektör, beyaz) -->
        <svg viewBox="0 0 140.3 21.2" class="w-60 max-w-full" aria-label="TÜV NORD">
          <path fill="#ffffff" d="M126.4,17.6h3.7c3.8,0,6.8-3.1,6.8-7s-3.1-6.9-6.8-6.9h-3.7C126.4,3.7,126.4,17.6,126.4,17.6z M130.1,20.6H123v-20h7.1c5.5,0,10.2,4.6,10.2,10S135.6,20.6,130.1,20.6L130.1,20.6z M108.2,9.9h5.1c1.8,0,3.1-1.4,3.1-3.1s-1.3-3.1-3.1-3.1h-5.1V9.9L108.2,9.9z M120.4,20.6h-3.7l-4.2-7.6h-4.3v7.6h-3.3v-20h8.5c3.7,0,6.5,2.7,6.5,6.2c0,4-3.2,5.6-3.9,5.9L120.4,20.6L120.4,20.6z M78.1,20.6h-2.9l-10.9-14v14H61v-20h2.8l10.9,14.1V0.6H78C78.1,0.6,78.1,20.6,78.1,20.6z M51.6,20.6l7.4-20h-5.4l-4.8,13.8L44.1,0.6h-5.4l7.4,20H51.6L51.6,20.6z M16.5,0.6V5h-5.8v15.6H5.8V5H0V0.6H16.5z M30.4,0.6h-4.9v4.8h4.9V0.6z M32.5,11.9V0.6h4.8v12c0,5-4,8.6-9.3,8.6c-5.1,0-9.3-3.3-9.3-8.6v-12h4.9v11.3c0,3,1.9,4.7,4.5,4.7S32.5,14.7,32.5,11.9z M91.5,21.2c-6.1,0-10.9-4.7-10.9-10.6S85.4,0,91.5,0s10.9,4.7,10.9,10.6S97.6,21.2,91.5,21.2L91.5,21.2z M91.5,3.1c-4.2,0-7.5,3.3-7.5,7.5s3.3,7.5,7.5,7.5s7.5-3.3,7.5-7.5S95.7,3.1,91.5,3.1z" />
        </svg>
        <!-- Metin rengi sabit açık ton — splash her temada koyu zeminli -->
        <span class="text-base font-bold tracking-[0.4em]" style="color: #e6ede8">ASANSÖR</span>
      </div>
    </div>
  </Teleport>
</template>
