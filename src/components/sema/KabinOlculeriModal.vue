<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import FotoEkleCek from '@/components/FotoEkleCek.vue';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import { beyanYukuAraligiBul, insanSayisiAraligiBul } from '@/utils/kabinAlanTablolari';

// Kabin Ölçüleri ve Aydınlatma şeması (artidoksan1'den taşındı): kabin kutusu
// + Genişlik/Derinlik ölçü okları; oklara tıklanınca mm popover'ı açılır,
// kutu girilen orana göre ölçeklenir, alandan kapasite/kişi aralığı bulunur.
type Num = number | '' | null;
const n = (v: Num): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const kabinGenislik = defineModel<Num>('kabinGenislik', { default: null });
const kabinDerinlik = defineModel<Num>('kabinDerinlik', { default: null });
const kabinIciAydinlatma = defineModel<Num>('kabinIciAydinlatma', { default: null });
// Kabin giriş tipi ('tek' | 'cift') — popup'ın en altındaki seçim.
const girisTipi = defineModel<string | null>('girisTipi', { default: null });
// Kabin paneli malzemesi; cam seçilirse cam belgesi yüklenir + montaj fotoğrafları.
const panelMalzemesi = defineModel<'paslanmaz' | 'cam' | null>('panelMalzemesi', { default: null });
const camBelgesi = defineModel<BelgeSlot | null>('camBelgesi', { default: null });
const fotolar = defineModel<BelgeSlot[]>('fotolar', { default: () => [] });

// ---- Cam belgesi ve fotoğraflar (KapiOlculeriModal ile aynı desen) ----
const { openFile } = useFileViewer();
const belgeYukleniyor = ref(false);
const fotoUrller = ref<Record<string, string>>({});
const fotoYukleniyor = ref(false);

async function camBelgeSec(event: Event) {
  const input = event.target as HTMLInputElement;
  const dosya = input.files?.[0];
  input.value = '';
  if (!dosya) return;
  if (dosya.type !== 'application/pdf' && !dosya.type.startsWith('image/')) return;
  belgeYukleniyor.value = true;
  try {
    camBelgesi.value = await uploadDosya(dosya);
  } catch {
    /* yüklenemezse mevcut belge korunur */
  } finally {
    belgeYukleniyor.value = false;
  }
}

async function dosyaAc(dosya: BelgeSlot | null) {
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
    for (const foto of fotolar.value) fotoUrlGetir(foto);
  },
  { immediate: true }
);

async function fotoEkle(dosyalar: File[]) {
  fotoYukleniyor.value = true;
  try {
    for (const dosya of dosyalar) {
      if (!dosya.type.startsWith('image/')) continue;
      const slot = await uploadDosya(dosya);
      fotolar.value.push(slot);
      fotoUrlGetir(slot);
    }
  } catch {
    /* yüklenemeyen dosya atlanır */
  } finally {
    fotoYukleniyor.value = false;
  }
}

function fotoSil(i: number) {
  fotolar.value.splice(i, 1);
}

const genislikLabel = computed(() => (n(kabinGenislik.value) != null ? `Genişlik: ${n(kabinGenislik.value)} mm` : 'Genişlik'));
const derinlikLabel = computed(() => (n(kabinDerinlik.value) != null ? `Derinlik: ${n(kabinDerinlik.value)} mm` : 'Derinlik'));

const MIN_OLCU_MM = 100;

// Geçersiz/çok küçük giriş uygulanmaz — kayıtlı değer korunur.
const genislikInput = computed<number | null>({
  get: () => n(kabinGenislik.value),
  set: (v) => {
    if (typeof v !== 'number' || Number.isNaN(v) || v < MIN_OLCU_MM) return;
    kabinGenislik.value = v;
  },
});

const derinlikInput = computed<number | null>({
  get: () => n(kabinDerinlik.value),
  set: (v) => {
    if (typeof v !== 'number' || Number.isNaN(v) || v < MIN_OLCU_MM) return;
    kabinDerinlik.value = v;
  },
});

// Kutu, Genişlik/Derinlik oranına göre sınırlayıcı alana sığdırılır.
const SINIR_GENISLIK = 120;
const SINIR_DERINLIK = 140;
const MERKEZ_X = 110;
const MERKEZ_Y = 90;

const kutuOrani = computed(() => {
  const g = n(kabinGenislik.value), d = n(kabinDerinlik.value);
  if (g && d && g > 0 && d > 0) return g / d;
  return SINIR_GENISLIK / SINIR_DERINLIK;
});

const kutuW = computed(() => {
  const oran = kutuOrani.value;
  return oran >= SINIR_GENISLIK / SINIR_DERINLIK ? SINIR_GENISLIK : SINIR_DERINLIK * oran;
});

const kutuH = computed(() => {
  const oran = kutuOrani.value;
  return oran >= SINIR_GENISLIK / SINIR_DERINLIK ? SINIR_GENISLIK / oran : SINIR_DERINLIK;
});

const kutuX = computed(() => MERKEZ_X - kutuW.value / 2);
const kutuY = computed(() => MERKEZ_Y - kutuH.value / 2);
const kutuSag = computed(() => kutuX.value + kutuW.value);
const kutuAlt = computed(() => kutuY.value + kutuH.value);

const genislikCizgiY = computed(() => kutuAlt.value + 18);
const derinlikCizgiX = computed(() => kutuSag.value + 26);

// SVG viewBox (240x220) → render boyutu (220x200) ölçeği.
const OLCEK_X = 220 / 240;
const OLCEK_Y = 200 / 220;

const genislikPopoverStyle = computed(() => ({
  left: `${(kutuX.value + kutuW.value / 2) * OLCEK_X}px`,
  top: `${(genislikCizgiY.value + 4) * OLCEK_Y}px`,
  transform: 'translateX(-50%)',
}));

const derinlikPopoverStyle = computed(() => ({
  left: `${(derinlikCizgiX.value + 4) * OLCEK_X}px`,
  top: `${(kutuY.value + kutuH.value / 2) * OLCEK_Y - 16}px`,
}));

// TS EN 81-20 Çizelge 6/8'e göre kapasite/kişi sayısı aralığı.
const kabinAlani = computed(() => {
  const g = n(kabinGenislik.value), d = n(kabinDerinlik.value);
  if (!g || !d) return null;
  return (g / 1000) * (d / 1000);
});

const kapasiteAraligi = computed(() => (kabinAlani.value ? beyanYukuAraligiBul(kabinAlani.value) : null));
const kisiSayisiAraligi = computed(() => (kabinAlani.value ? insanSayisiAraligiBul(kabinAlani.value) : null));

const genislikPopoverOpen = ref(false);
const derinlikPopoverOpen = ref(false);
const diagramWrapRef = ref<HTMLElement | null>(null);

function toggleGenislikPopover() {
  derinlikPopoverOpen.value = false;
  genislikPopoverOpen.value = !genislikPopoverOpen.value;
}

function toggleDerinlikPopover() {
  genislikPopoverOpen.value = false;
  derinlikPopoverOpen.value = !derinlikPopoverOpen.value;
}

function onDocumentMousedown(e: MouseEvent) {
  if (!diagramWrapRef.value) return;
  if (!diagramWrapRef.value.contains(e.target as Node)) {
    genislikPopoverOpen.value = false;
    derinlikPopoverOpen.value = false;
  }
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown));
</script>

<template>
  <SemaModal v-model:open="open" title="Kabin Ölçüleri ve Aydınlatma" @iptal="emit('iptal')">
    <div class="flex flex-col gap-4 py-1">
      <div class="flex justify-center">
        <div ref="diagramWrapRef" class="sema-wrap" style="width: 220px; height: 200px">
          <svg viewBox="0 0 240 220" width="220" height="200" class="sema-svg">
            <defs>
              <marker id="kabin-olcu-ok" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
              </marker>
            </defs>

            <rect :x="kutuX" :y="kutuY" :width="kutuW" :height="kutuH" fill="none" stroke="currentColor" stroke-width="2" />
            <text :x="MERKEZ_X" :y="MERKEZ_Y + 5" text-anchor="middle" font-size="16" fill="currentColor">Kabin</text>

            <!-- Genişlik (alt) — tıklanınca mm popover'ı -->
            <g class="sema-hotspot" @click="toggleGenislikPopover">
              <rect :x="kutuX - 10" :y="kutuAlt" :width="kutuW + 20" height="42" fill="transparent" />
              <line :x1="kutuX" :y1="kutuAlt" :x2="kutuX" :y2="genislikCizgiY + 4" stroke="currentColor" stroke-width="1" />
              <line :x1="kutuSag" :y1="kutuAlt" :x2="kutuSag" :y2="genislikCizgiY + 4" stroke="currentColor" stroke-width="1" />
              <line :x1="kutuX" :y1="genislikCizgiY" :x2="kutuSag" :y2="genislikCizgiY" stroke="currentColor" stroke-width="1.5"
                marker-start="url(#kabin-olcu-ok)" marker-end="url(#kabin-olcu-ok)" />
              <text :x="MERKEZ_X" :y="genislikCizgiY + 20" text-anchor="middle" font-size="13" fill="currentColor">{{ genislikLabel }}</text>
            </g>

            <!-- Derinlik (sağ) — tıklanınca mm popover'ı -->
            <g class="sema-hotspot" @click="toggleDerinlikPopover">
              <rect :x="kutuSag" :y="kutuY - 10" width="56" :height="kutuH + 20" fill="transparent" />
              <line :x1="kutuSag" :y1="kutuY" :x2="derinlikCizgiX + 4" :y2="kutuY" stroke="currentColor" stroke-width="1" />
              <line :x1="kutuSag" :y1="kutuAlt" :x2="derinlikCizgiX + 4" :y2="kutuAlt" stroke="currentColor" stroke-width="1" />
              <line :x1="derinlikCizgiX" :y1="kutuY" :x2="derinlikCizgiX" :y2="kutuAlt" stroke="currentColor" stroke-width="1.5"
                marker-start="url(#kabin-olcu-ok)" marker-end="url(#kabin-olcu-ok)" />
              <text :x="derinlikCizgiX + 18" :y="MERKEZ_Y" text-anchor="middle" font-size="13" fill="currentColor"
                :transform="`rotate(90 ${derinlikCizgiX + 18} ${MERKEZ_Y})`">
                {{ derinlikLabel }}
              </text>
            </g>
          </svg>

          <div v-if="genislikPopoverOpen" class="sema-popover" :style="genislikPopoverStyle" @click.stop>
            <input v-model.number="genislikInput" type="number" class="sema-popover__input" placeholder="mm" autofocus
              @keydown.enter="genislikPopoverOpen = false" />
            <span class="sema-popover__unit">mm</span>
          </div>
          <div v-if="derinlikPopoverOpen" class="sema-popover" :style="derinlikPopoverStyle" @click.stop>
            <input v-model.number="derinlikInput" type="number" class="sema-popover__input" placeholder="mm" autofocus
              @keydown.enter="derinlikPopoverOpen = false" />
            <span class="sema-popover__unit">mm</span>
          </div>
        </div>
      </div>

      <div v-if="kabinAlani" class="space-y-1 bg-surface-900/60 p-2.5 text-xs text-ink-muted ring-1 ring-white/5">
        <p class="font-semibold text-ink">Kabin Alanı: {{ kabinAlani.toFixed(2) }} m²</p>
        <p>
          Kapasite Aralığı:
          <strong class="font-semibold text-[#6fcf97]">{{ kapasiteAraligi?.alt != null ? `${kapasiteAraligi.alt} – ` : '≤ ' }}{{ kapasiteAraligi?.ust }} kg</strong>
        </p>
        <p>
          Kişi Sayısı Aralığı:
          <strong class="font-semibold text-[#6fcf97]">{{ kisiSayisiAraligi?.alt != null ? `${kisiSayisiAraligi.alt} – ` : '≤ ' }}{{ kisiSayisiAraligi?.ust }} kişi</strong>
        </p>
      </div>

      <label class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Kabin Aydınlatma (lüx)</span>
        <input v-model.number="kabinIciAydinlatma" type="number"
          class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
      </label>

      <!-- Giriş tipi seçimi — tek / çift -->
      <label class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Giriş Tipi</span>
        <select v-model="girisTipi"
          class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
          <option :value="null" disabled>Seçiniz</option>
          <option value="tek">Tek Giriş</option>
          <option value="cift">Çift Giriş</option>
        </select>
      </label>

      <!-- Panel malzemesi -->
      <div class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Panel Malzemesi</span>
        <div class="grid grid-cols-2 gap-1.5">
          <button v-for="o in ([['paslanmaz', 'Paslanmaz Çelik'], ['cam', 'Cam']] as const)" :key="o[0]"
            type="button" @click="panelMalzemesi = o[0]"
            class="px-2 py-1.5 text-xs font-semibold ring-1"
            :class="panelMalzemesi === o[0]
              ? 'bg-[#2b5c3d] text-ink ring-white/10'
              : 'bg-surface-900 text-ink-muted ring-white/10'">
            {{ o[1] }}
          </button>
        </div>
      </div>

      <!-- Cam seçilirse cam belgesi yükleme/görüntüleme -->
      <div v-if="panelMalzemesi === 'cam'" class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Cam Belgesi</span>
        <div class="flex items-center gap-1.5">
          <label
            class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
            <input type="file" accept="application/pdf,image/*" class="hidden" @change="camBelgeSec($event)" />
            {{ belgeYukleniyor ? 'Yükleniyor…' : camBelgesi ? 'Değiştir' : '+ Belge Yükle' }}
          </label>
          <span class="min-w-0 flex-1 truncate text-xs"
            :class="camBelgesi ? 'text-ink' : 'text-ink-muted/60'">
            {{ camBelgesi?.dosyaAdi ?? 'Belge yüklenmedi' }}
          </span>
          <button v-if="camBelgesi" type="button" @click="dosyaAc(camBelgesi)" aria-label="Belgeyi görüntüle"
            class="grid h-[26px] w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button v-if="camBelgesi" type="button" @click="camBelgesi = null" aria-label="Belgeyi kaldır"
            class="grid h-[26px] w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
            ✕
          </button>
        </div>
      </div>

      <!-- Montaj fotoğrafları -->
      <div class="space-y-1 border-t border-white/5 pt-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-ink-muted">Fotoğraflar</span>
          <FotoEkleCek :yukleniyor="fotoYukleniyor" @dosyalar="fotoEkle($event)" />
        </div>
        <div v-if="fotolar.length" class="flex flex-wrap gap-1.5">
          <span v-for="(foto, i) in fotolar" :key="foto.dosyaAnahtari + i" class="relative">
            <button type="button" @click="dosyaAc(foto)"
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

<style scoped>
.sema-wrap {
  position: relative;
}

.sema-svg {
  color: #e6ede8;
}

.sema-hotspot {
  cursor: pointer;
}

.sema-hotspot:hover text {
  fill: #6fcf97;
}

.sema-hotspot:hover line {
  stroke: #6fcf97;
}

.sema-popover {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: #141e17;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 5;
}

.sema-popover__input {
  width: 70px;
  padding: 4px 6px;
  font-size: 13px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #0d1612;
  color: #e6ede8;
  -moz-appearance: textfield;
}

.sema-popover__input::-webkit-outer-spin-button,
.sema-popover__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.sema-popover__unit {
  font-size: 12px;
  color: #9db3a7;
}
</style>
