<script setup lang="ts">
import { computed } from 'vue';
import { useAuth } from '@/composables/useAuth';

// Oturum süresi dolmadan önce (son 2 dakika) ekranın altında geri sayımlı uyarı şeridi.
// Süre mutlak olduğundan uzatma yoktur; kullanıcı işini kaydedip çıkışa hazırlanır.
const { uyariAcik, kalanSn, kullanici } = useAuth();

const metin = computed(() => {
  const dk = Math.floor(kalanSn.value / 60);
  const sn = String(kalanSn.value % 60).padStart(2, '0');
  return `${dk}:${sn}`;
});
</script>

<template>
  <Teleport to="body">
    <div v-if="uyariAcik && kullanici" role="status" aria-live="polite"
      class="fixed inset-x-0 bottom-0 z-[65] px-3 pb-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))]">
      <div class="mx-auto flex max-w-lg items-center gap-3 bg-amber-500/10 px-3 py-2.5 shadow-lg shadow-black/30 ring-1 ring-amber-500/40 backdrop-blur"
        style="background-color: rgb(40 32 10 / 0.92)">
        <svg class="h-5 w-5 shrink-0 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <p class="min-w-0 flex-1 text-xs leading-snug text-amber-100">
          Oturum süreniz <span class="font-bold tabular-nums">{{ metin }}</span> içinde sona erecek.
          Çalışmanızı kaydedin; ardından tekrar giriş yapmanız gerekecek.
        </p>
      </div>
    </div>
  </Teleport>
</template>
