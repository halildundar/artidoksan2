<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getDanismanlar, type Danisman } from '@/services/danismanService';
import { useAuth } from '@/composables/useAuth';

// Kaydı görebilecek danışmanları (çoklu) seçme. Yalnız Admin ve Denetçi'ye görünür;
// Danışman kullanıcı kayıt eklerken kendisi otomatik atanır (sunucu zorlar), bu alan gizlenir.
const secili = defineModel<string[]>({ default: () => [] });

const { kullanici } = useAuth();
const gorunur = computed(() => kullanici.value?.rol === 'admin' || kullanici.value?.rol === 'denetci');

const danismanlar = ref<Danisman[]>([]);
const yukleniyor = ref(false);

onMounted(async () => {
  if (!gorunur.value) return;
  yukleniyor.value = true;
  try {
    danismanlar.value = [...(await getDanismanlar())].sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, 'tr'));
  } catch { /* liste alınamazsa boş kalır */ } finally {
    yukleniyor.value = false;
  }
});

function degistir(id: string, isaretli: boolean) {
  const kume = new Set(secili.value);
  if (isaretli) kume.add(id); else kume.delete(id);
  secili.value = [...kume];
}
</script>

<template>
  <div v-if="gorunur" class="space-y-1">
    <span class="text-xs font-medium text-ink-muted">Görebilecek danışmanlar</span>
    <p v-if="yukleniyor" class="text-[11px] text-ink-muted/80">Yükleniyor…</p>
    <p v-else-if="!danismanlar.length" class="text-[11px] text-ink-muted/80">Kayıtlı danışman yok.</p>
    <div v-else class="max-h-40 space-y-0.5 overflow-y-auto bg-surface-900 p-2 ring-1 ring-white/10">
      <label v-for="d in danismanlar" :key="d._id" class="flex cursor-pointer items-center gap-2 py-0.5 text-xs text-ink">
        <input type="checkbox" :checked="secili.includes(d._id)" class="accent-white"
          @change="degistir(d._id, ($event.target as HTMLInputElement).checked)" />
        {{ d.adSoyad }}
      </label>
    </div>
    <span class="block text-[11px] text-ink-muted/80">İşaretli danışmanlar bu kaydı görebilir (firma/asansörde bağlı denetim ve tescili de). Hiçbiri işaretli değilse yalnız ekleyen ve Admin görür.</span>
  </div>
</template>
