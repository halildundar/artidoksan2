<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuth } from '@/composables/useAuth';

// Kaydı görebilecek danışmanların adlarını mavi rozet olarak gösterir (yalnız Admin ve Denetçi'ye).
// Danışman listesi oturum boyunca paylaşılır; liste satırı başına istek atılmaz.
const props = defineProps<{ ids?: string[] | null }>();

const { kullanici } = useAuth();
const gorunur = computed(() => kullanici.value?.rol === 'admin' || kullanici.value?.rol === 'denetci');

const adlar = ref<Map<string, string>>(new Map());
onMounted(async () => {
  if (!gorunur.value) return;
  adlar.value = await danismanAdlari();
});

const rozetler = computed(() => (props.ids ?? []).map((id) => adlar.value.get(id)).filter((a): a is string => !!a));
</script>

<script lang="ts">
import { getDanismanlar as _liste } from '@/services/danismanService';

// Bileşenler arası paylaşılan önbellek (1 dk)
let onbellek: { zaman: number; istek: Promise<Map<string, string>> } | null = null;
function danismanAdlari(): Promise<Map<string, string>> {
  if (!onbellek || Date.now() - onbellek.zaman > 60_000) {
    onbellek = {
      zaman: Date.now(),
      istek: _liste().then((l) => new Map(l.map((d) => [d._id, d.adSoyad]))).catch(() => new Map()),
    };
  }
  return onbellek.istek;
}
</script>

<template>
  <span v-if="gorunur && rozetler.length" class="flex flex-wrap gap-1">
    <span v-for="ad in rozetler" :key="ad"
      class="max-w-full truncate bg-sky-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300 ring-1 ring-sky-500/30">{{ ad }}</span>
  </span>
</template>
