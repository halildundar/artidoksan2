<script setup lang="ts">
import { ref, watch } from 'vue';
import type { RiskMaddesiSecim } from '@/services/riskMaddesiService';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import FotoEkleCek from '@/components/FotoEkleCek.vue';

// Risk Durumları panelinde seçilen risk maddelerinin listesi: metin + katalog
// resmi (görüntülenebilir) + madde başına eklenebilir/silinebilir fotoğraflar.
// Fotoğraf değişiklikleri `guncelle` ile üst bileşene (asansör kaydına) iletilir.
const props = defineProps<{ maddeler: RiskMaddesiSecim[] }>();
const emit = defineEmits<{ guncelle: [RiskMaddesiSecim[]] }>();

const { openFile } = useFileViewer();

const fotoUrller = ref<Record<string, string>>({});
const fotoYukleniyor = ref(false);

async function fotoUrlGetir(dosya: BelgeSlot) {
  if (fotoUrller.value[dosya.dosyaAnahtari]) return;
  try {
    fotoUrller.value[dosya.dosyaAnahtari] = await getDosyaUrl(dosya.dosyaAnahtari);
  } catch {
    /* URL alınamazsa önizleme boş kalır */
  }
}

watch(
  () => props.maddeler,
  (maddeler) => {
    for (const madde of maddeler ?? []) {
      if (madde.resim) fotoUrlGetir(madde.resim);
      for (const foto of madde.fotolar ?? []) fotoUrlGetir(foto);
    }
  },
  { immediate: true }
);

async function dosyaAc(dosya: BelgeSlot | null | undefined) {
  if (!dosya) return;
  try {
    const [url, downloadUrl] = await Promise.all([
      getDosyaUrl(dosya.dosyaAnahtari),
      getDosyaIndirUrl(dosya.dosyaAnahtari, dosya.dosyaAdi),
    ]);
    const type = fileViewerTypeFromMime(dosya.mimeType);
    if (!type) {
      window.open(downloadUrl, '_blank');
      return;
    }
    openFile({ url, downloadUrl, name: dosya.dosyaAdi, type });
  } catch {
    /* imzalı URL alınamazsa açılmaz */
  }
}

function kopya(): RiskMaddesiSecim[] {
  return props.maddeler.map((m) => ({ ...m, fotolar: [...(m.fotolar ?? [])] }));
}

async function fotoEkle(maddeIndex: number, dosyalar: File[]) {
  fotoYukleniyor.value = true;
  try {
    const liste = kopya();
    for (const dosya of dosyalar) {
      if (!dosya.type.startsWith('image/')) continue;
      const slot = await uploadDosya(dosya);
      liste[maddeIndex].fotolar?.push(slot);
      fotoUrlGetir(slot);
    }
    emit('guncelle', liste);
  } catch {
    /* yüklenemeyen dosya atlanır */
  } finally {
    fotoYukleniyor.value = false;
  }
}

function fotoSil(maddeIndex: number, fotoIndex: number) {
  const liste = kopya();
  liste[maddeIndex].fotolar?.splice(fotoIndex, 1);
  emit('guncelle', liste);
}
</script>

<template>
  <div class="space-y-1.5">
    <div v-for="(madde, mi) in props.maddeler" :key="madde.maddeId ?? mi"
      class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
      <div class="flex items-start gap-2">
        <button v-if="madde.resim" type="button" @click="dosyaAc(madde.resim)"
          class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
          <img v-if="fotoUrller[madde.resim.dosyaAnahtari]" :src="fotoUrller[madde.resim.dosyaAnahtari]"
            :alt="madde.resim.dosyaAdi" class="h-full w-full object-cover" />
          <span v-else class="px-0.5 text-center text-[8px] text-ink-muted/60">{{ madde.resim.dosyaAdi }}</span>
        </button>
        <p class="min-w-0 flex-1 text-xs leading-relaxed text-ink">{{ madde.metin }}</p>
        <FotoEkleCek class="shrink-0" dikey ekle-etiket="+ Resim" :yukleniyor="fotoYukleniyor"
          @dosyalar="fotoEkle(mi, $event)" />
      </div>
      <div v-if="madde.fotolar?.length" class="flex flex-wrap gap-1.5">
        <span v-for="(foto, fi) in madde.fotolar" :key="foto.dosyaAnahtari + fi" class="relative">
          <button type="button" @click="dosyaAc(foto)"
            class="grid h-16 w-16 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
            <img v-if="fotoUrller[foto.dosyaAnahtari]" :src="fotoUrller[foto.dosyaAnahtari]"
              :alt="foto.dosyaAdi" class="h-full w-full object-cover" />
            <span v-else class="px-1 text-center text-[9px] text-ink-muted/60">{{ foto.dosyaAdi }}</span>
          </button>
          <button type="button" @click="fotoSil(mi, fi)" aria-label="Fotoğrafı kaldır"
            class="absolute -right-1 -top-1 grid h-4 w-4 place-items-center bg-red-900 text-[10px] leading-none text-red-100 ring-1 ring-red-500/40">
            ×
          </button>
        </span>
      </div>
    </div>
  </div>
</template>
