<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import KomponentIslemleri from './KomponentIslemleri.vue';
import FotoEkleCek from '@/components/FotoEkleCek.vue';
import AramaliSelect from '@/components/AramaliSelect.vue';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import { kilitBelgesiBul, type KilitBelgeSecenek, type MotorBilgi } from './kapiKilitleriTipleri';

// Motor popup'ı: Dişlisiz/Dişlili seçimi — seçime göre marka/tip, katalogdaki
// motor_dislisiz / motor_dislili belgelerinden gelir. Ortak alanlar: seri no,
// güç (kW), rpm ve montaj fotoğrafları; dişlilide ek Ratio (tahvil oranı).
const props = defineProps<{
  dislisizBelgeleri: KilitBelgeSecenek[];
  disliliBelgeleri: KilitBelgeSecenek[];
}>();

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const motor = defineModel<MotorBilgi>('motor', {
  default: () => ({
    disliTipi: 'dislisiz', marka: null, tip: null, seriNo: '',
    gucKw: null, rpm: null, ratio: '', fotolar: [],
  }),
});

const { openFile } = useFileViewer();

const dislili = computed(() => motor.value.disliTipi === 'dislili');
const aktifBelgeler = computed(() => (dislili.value ? props.disliliBelgeleri : props.dislisizBelgeleri));

// Dişli tipi değişince marka/tip sıfırlanır (seçenek listeleri farklıdır)
function disliTipiSec(tip: MotorBilgi['disliTipi']) {
  if (motor.value.disliTipi === tip) return;
  motor.value.disliTipi = tip;
  motor.value.marka = null;
  motor.value.tip = null;
}

function markalar() {
  return [...new Set(aktifBelgeler.value.map((b) => b.marka).filter(Boolean))];
}

function markaTipleri(marka: string | null) {
  if (!marka) return [];
  return [...new Set(aktifBelgeler.value.filter((b) => b.marka === marka).flatMap((b) => b.tipler))];
}

function belgesi() {
  return kilitBelgesiBul(aktifBelgeler.value, motor.value.marka, motor.value.tip);
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
    for (const foto of motor.value.fotolar) fotoUrlGetir(foto);
  },
  { immediate: true }
);

async function fotoEkle(dosyalar: File[]) {
  fotoYukleniyor.value = true;
  try {
    for (const dosya of dosyalar) {
      if (!dosya.type.startsWith('image/')) continue;
      const slot = await uploadDosya(dosya);
      motor.value.fotolar.push(slot);
      fotoUrlGetir(slot);
    }
  } catch {
    /* yüklenemeyen dosya atlanır */
  } finally {
    fotoYukleniyor.value = false;
  }
}

function fotoSil(i: number) {
  motor.value.fotolar.splice(i, 1);
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
  <SemaModal v-model:open="open" title="Motor" @iptal="emit('iptal')">
    <div class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
      <!-- Dişlisiz / Dişlili seçimi -->
      <div class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Motor Tipi</span>
        <div class="grid grid-cols-2 gap-1.5">
          <button v-for="o in [['dislisiz', 'Dişlisiz'], ['dislili', 'Dişlili']] as const" :key="o[0]"
            type="button" @click="disliTipiSec(o[0])"
            class="px-2 py-1.5 text-xs font-semibold ring-1"
            :class="motor.disliTipi === o[0]
              ? 'bg-[#2b5c3d] text-ink ring-white/10'
              : 'bg-surface-900 text-ink-muted ring-white/10'">
            {{ o[1] }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-1.5">
        <label class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Marka</span>
          <AramaliSelect :model-value="motor.marka" placeholder="Seçiniz"
            :options="markalar().map((m) => ({ label: m, value: m }))"
            @update:model-value="motor.marka = ($event as string | null) || null; motor.tip = null" />
        </label>
        <label class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Tip</span>
          <AramaliSelect :model-value="motor.tip" placeholder="Tip seçiniz" :disabled="!motor.marka"
            :options="markaTipleri(motor.marka).map((t) => ({ label: t, value: t }))"
            @update:model-value="motor.tip = ($event as string | null) || null" />
        </label>
      </div>
      <KomponentIslemleri :kod="dislili ? 'motor_dislili' : 'motor_dislisiz'" :belgeler="aktifBelgeler"
        :marka="motor.marka" :tip="motor.tip"
        @sec="motor.marka = $event.marka; motor.tip = $event.tip" />


      <button v-if="motor.tip && belgesi()?.dosya" type="button" @click="belgeAc(belgesi())"
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
        <input v-model="motor.seriNo" type="text" placeholder="Seri no"
          class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
      </label>

      <div class="grid gap-1.5" :class="dislili ? 'grid-cols-3' : 'grid-cols-2'">
        <label class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Güç (kW)</span>
          <input v-model.number="motor.gucKw" type="number" step="0.1" min="0" inputmode="decimal"
            placeholder="kW"
            class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
        </label>
        <label class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">RPM</span>
          <input v-model.number="motor.rpm" type="number" min="0" inputmode="numeric"
            placeholder="rpm"
            class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
        </label>
        <!-- Yalnız dişlili motorda: tahvil (ratio) oranı -->
        <label v-if="dislili" class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Ratio</span>
          <input v-model="motor.ratio" type="text" placeholder="örn. 2/59"
            class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
        </label>
      </div>

      <!-- Montaj fotoğrafları -->
      <div class="space-y-1 border-t border-white/5 pt-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-ink-muted">Fotoğraflar</span>
          <FotoEkleCek :yukleniyor="fotoYukleniyor" @dosyalar="fotoEkle($event)" />
        </div>
        <div v-if="motor.fotolar.length" class="flex flex-wrap gap-1.5">
          <span v-for="(foto, i) in motor.fotolar" :key="foto.dosyaAnahtari + i" class="relative">
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
