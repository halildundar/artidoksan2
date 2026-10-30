<script setup lang="ts">
import { ref, watch } from 'vue';
import FotoEkleCek from '@/components/FotoEkleCek.vue';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';

// Şema modallarının ortak "Fotoğraflar" alanı: dosya seçme + kamerayla çekme
// (FotoEkleCek), küçük önizlemeler, tam ekran görüntüleme ve tek tek kaldırma.
// Yüklemeyi kendi yapar; liste v-model:fotolar ile üst bileşende tutulur.
const props = withDefaults(defineProps<{ baslik?: string }>(), { baslik: 'Fotoğraflar' });
const fotolar = defineModel<BelgeSlot[]>('fotolar', { default: () => [] });

const { openFile } = useFileViewer();
const fotoUrller = ref<Record<string, string>>({});
const yukleniyor = ref(false);

function urlGetir(foto: BelgeSlot) {
  if (!foto.mimeType?.startsWith('image/') || fotoUrller.value[foto.dosyaAnahtari]) return;
  getDosyaUrl(foto.dosyaAnahtari)
    .then((url) => (fotoUrller.value[foto.dosyaAnahtari] = url))
    .catch(() => { /* önizleme alınamazsa kutuda dosya adı görünür */ });
}

watch(fotolar, (liste) => (liste ?? []).forEach(urlGetir), { immediate: true });

async function ekle(dosyalar: File[]) {
  const resimler = dosyalar.filter((d) => d.type.startsWith('image/'));
  if (!resimler.length) return;
  yukleniyor.value = true;
  try {
    for (const dosya of resimler) {
      const slot = await uploadDosya(dosya);
      fotolar.value = [...(fotolar.value ?? []), slot];
      urlGetir(slot);
    }
  } catch {
    /* yüklenemeyen dosya atlanır */
  } finally {
    yukleniyor.value = false;
  }
}

function sil(i: number) {
  fotolar.value = (fotolar.value ?? []).filter((_, j) => j !== i);
}

async function ac(foto: BelgeSlot) {
  try {
    const [url, downloadUrl] = await Promise.all([
      getDosyaUrl(foto.dosyaAnahtari),
      getDosyaIndirUrl(foto.dosyaAnahtari, foto.dosyaAdi),
    ]);
    const type = fileViewerTypeFromMime(foto.mimeType);
    if (!type) {
      window.open(downloadUrl, '_blank');
      return;
    }
    openFile({ url, downloadUrl, name: foto.dosyaAdi, type });
  } catch {
    /* imzalı URL alınamazsa açılmaz */
  }
}
</script>

<template>
  <div class="space-y-1 border-t border-white/5 pt-2">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-ink-muted">{{ props.baslik }}</span>
      <FotoEkleCek :yukleniyor="yukleniyor" @dosyalar="ekle" />
    </div>
    <div v-if="fotolar?.length" class="flex flex-wrap gap-1.5">
      <span v-for="(foto, i) in fotolar" :key="foto.dosyaAnahtari + i" class="relative">
        <button type="button" @click="ac(foto)"
          class="grid h-16 w-16 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
          <img v-if="fotoUrller[foto.dosyaAnahtari]" :src="fotoUrller[foto.dosyaAnahtari]"
            :alt="foto.dosyaAdi" class="h-full w-full object-cover" />
          <span v-else class="px-1 text-center text-[9px] text-ink-muted/60">{{ foto.dosyaAdi }}</span>
        </button>
        <button type="button" @click="sil(i)" aria-label="Fotoğrafı kaldır"
          class="absolute -right-1 -top-1 grid h-4 w-4 place-items-center bg-red-900 text-[10px] leading-none text-red-100 ring-1 ring-red-500/40">
          ×
        </button>
      </span>
    </div>
  </div>
</template>
