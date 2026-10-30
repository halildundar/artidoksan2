<script setup lang="ts">
import { ref } from 'vue';
import FotoCekModal from '@/components/FotoCekModal.vue';

// "+ Fotoğraf Ekle" (dosya seçici) ve "Fotoğraf Çek" (canlı kamera) buton
// çifti — şema modallarındaki fotoğraf alanlarının ortak girişi. İki yol da
// seçilen/çekilen kareleri tek "dosyalar" olayıyla üst bileşene verir;
// yükleme ve listeye ekleme üst bileşende kalır.
const props = withDefaults(
  defineProps<{ yukleniyor?: boolean; ekleEtiket?: string; dikey?: boolean }>(),
  { yukleniyor: false, ekleEtiket: '+ Fotoğraf Ekle', dikey: false }
);
const emit = defineEmits<{ dosyalar: [dosyalar: File[]] }>();

const kameraAcik = ref(false);

function dosyadanSec(event: Event) {
  const input = event.target as HTMLInputElement;
  const dosyalar = Array.from(input.files ?? []);
  input.value = '';
  if (dosyalar.length) emit('dosyalar', dosyalar);
}
</script>

<template>
  <div class="flex gap-1.5" :class="props.dikey ? 'flex-col items-stretch' : 'items-center'">
    <label
      class="cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-center text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
      <input type="file" accept="image/*" multiple class="hidden" @change="dosyadanSec" />
      {{ props.yukleniyor ? 'Yükleniyor…' : props.ekleEtiket }}
    </label>
    <button type="button" @click="kameraAcik = true"
      class="flex items-center justify-center gap-1 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
      Fotoğraf Çek
    </button>
    <FotoCekModal v-model:acik="kameraAcik" @tamam="emit('dosyalar', $event)" />
  </div>
</template>
