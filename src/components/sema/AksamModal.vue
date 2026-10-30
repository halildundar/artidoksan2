<script setup lang="ts">
import { ref, watch } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import FotoEkleCek from '@/components/FotoEkleCek.vue';
import AramaliSelect from '@/components/AramaliSelect.vue';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import { kilitBelgesiBul, type KilitBelgeSecenek, type AksamBolum } from './kapiKilitleriTipleri';

// Tek satırlı aksam popup'ı (Hız Regülatörü, Kontrol Kartı): Marka/Tip seçimi
// (aramalı), tipe göre belge görüntüleme, seri no ve montaj fotoğrafları.
// devreHiziGoster açıksa (Hız Regülatörü) ek olarak devreye girme hızı girilir.
const props = defineProps<{
  baslik: string;
  belgeler: KilitBelgeSecenek[];
  devreHiziGoster?: boolean;
}>();

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const bolum = defineModel<AksamBolum>('bolum', {
  default: () => ({ marka: null, tip: null, seriNo: '', fotolar: [] }),
});
const devreHizi = defineModel<number | '' | null>('devreHizi', { default: null });

const { openFile } = useFileViewer();

// Devreye girme hızı metin olarak gösterilir ("1.30" biçiminde, number input
// 1.3'e kırptığı için); kayda sayıya çevrilerek yazılır.
const devreHiziMetin = ref('');

watch(
  open,
  (acik) => {
    if (!acik || !props.devreHiziGoster) return;
    const v = devreHizi.value;
    devreHiziMetin.value = typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : '';
  },
  { immediate: true }
);

function devreHiziGirdi(event: Event) {
  const metin = (event.target as HTMLInputElement).value;
  devreHiziMetin.value = metin;
  const sayi = Number.parseFloat(metin.replace(',', '.'));
  devreHizi.value = Number.isFinite(sayi) ? sayi : null;
}

function markalar() {
  return [...new Set(props.belgeler.map((b) => b.marka).filter(Boolean))];
}

function markaTipleri(marka: string | null) {
  if (!marka) return [];
  return [...new Set(props.belgeler.filter((b) => b.marka === marka).flatMap((b) => b.tipler))];
}

function belgesi() {
  return kilitBelgesiBul(props.belgeler, bolum.value.marka, bolum.value.tip);
}

async function belgeAc(belge: KilitBelgeSecenek | null) {
  const dosya = belge?.dosya;
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
    /* imzalı URL alınamazsa buton sessizce etkisiz kalır */
  }
}

// ---- Fotoğraflar (KapiKilitleriModal ile aynı desen) ----
const fotoUrller = ref<Record<string, string>>({});
const fotoYukleniyor = ref(false);

async function fotoUrlGetir(foto: BelgeSlot) {
  if (fotoUrller.value[foto.dosyaAnahtari]) return;
  try {
    fotoUrller.value[foto.dosyaAnahtari] = await getDosyaUrl(foto.dosyaAnahtari);
  } catch {
    /* URL alınamazsa önizleme boş kalır, dosya adı görünür */
  }
}

watch(
  open,
  (acik) => {
    if (!acik) return;
    for (const foto of bolum.value.fotolar) fotoUrlGetir(foto);
  },
  { immediate: true }
);

async function fotoEkle(dosyalar: File[]) {
  fotoYukleniyor.value = true;
  try {
    for (const dosya of dosyalar) {
      if (!dosya.type.startsWith('image/')) continue;
      const slot = await uploadDosya(dosya);
      bolum.value.fotolar.push(slot);
      fotoUrlGetir(slot);
    }
  } catch {
    /* yüklenemeyen dosya atlanır */
  } finally {
    fotoYukleniyor.value = false;
  }
}

function fotoSil(i: number) {
  bolum.value.fotolar.splice(i, 1);
}

async function fotoAc(foto: BelgeSlot) {
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
  <SemaModal v-model:open="open" :title="baslik" @iptal="emit('iptal')">
    <div class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
      <div class="grid grid-cols-2 gap-1.5">
        <label class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Marka</span>
          <AramaliSelect :model-value="bolum.marka" placeholder="Seçiniz"
            :options="markalar().map((m) => ({ label: m, value: m }))"
            @update:model-value="bolum.marka = ($event as string | null) || null; bolum.tip = null" />
        </label>
        <label class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Tip</span>
          <AramaliSelect :model-value="bolum.tip" placeholder="Tip seçiniz" :disabled="!bolum.marka"
            :options="markaTipleri(bolum.marka).map((t) => ({ label: t, value: t }))"
            @update:model-value="bolum.tip = ($event as string | null) || null" />
        </label>
      </div>

      <button v-if="bolum.tip && belgesi()?.dosya" type="button" @click="belgeAc(belgesi())"
        class="flex items-center gap-1 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Belgeyi Görüntüle
      </button>

      <label class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Seri No</span>
        <input v-model="bolum.seriNo" type="text" placeholder="Seri no"
          class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
      </label>

      <!-- Hız Regülatörü: devreye girme hızı (m/s) -->
      <label v-if="props.devreHiziGoster" class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Devreye Girme Hızı (m/s)</span>
        <input :value="devreHiziMetin" @input="devreHiziGirdi" type="text" inputmode="decimal"
          placeholder="1.30"
          class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
      </label>

      <!-- Montaj fotoğrafları -->
      <div class="space-y-1 border-t border-white/5 pt-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-ink-muted">Fotoğraflar</span>
          <FotoEkleCek :yukleniyor="fotoYukleniyor" @dosyalar="fotoEkle($event)" />
        </div>
        <div v-if="bolum.fotolar.length" class="flex flex-wrap gap-1.5">
          <span v-for="(foto, i) in bolum.fotolar" :key="foto.dosyaAnahtari + i" class="relative">
            <button type="button" @click="fotoAc(foto)"
              class="grid h-16 w-16 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
              <img v-if="fotoUrller[foto.dosyaAnahtari]" :src="fotoUrller[foto.dosyaAnahtari]"
                :alt="foto.dosyaAdi" class="h-full w-full object-cover" />
              <span v-else class="px-1 text-center text-[9px] text-ink-muted/60">{{ foto.dosyaAdi }}</span>
            </button>
            <button type="button" @click="fotoSil(i)" aria-label="Fotoğrafı kaldır"
              class="absolute -right-1 -top-1 grid h-4 w-4 place-items-center bg-red-900 text-[10px] leading-none text-red-100 ring-1 ring-red-500/40">
              ×
            </button>
          </span>
        </div>
      </div>
    </div>
  </SemaModal>
</template>
