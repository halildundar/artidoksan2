<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import SemaOlcekle from './SemaOlcekle.vue';
import FotoAlani from '@/components/FotoAlani.vue';
import type { BelgeSlot } from '@/services/dosyaService';

// Kuyu Üst Alanı şeması (artidoksan1'den taşındı): kuyu üstü yan görünüm —
// tavan, son katta kabin, süspansiyon kutusu ve korkuluk ölçüleri.
type Num = number | '' | null;
const n = (v: Num): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

const props = defineProps<{ hiz?: number | null; dipBosluk?: number | null; dipStroke?: number | null }>();

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const fotolar = defineModel<BelgeSlot[]>('fotolar', { default: () => [] });
const korkulukMesafe = defineModel<Num>('korkulukMesafe', { default: null });
const korkulukYuksekligi = defineModel<Num>('korkulukYuksekligi', { default: null });
const suspansiyonMesafe = defineModel<Num>('suspansiyonMesafe', { default: null });
const kabinUstDurma = defineModel<Num>('kabinUstDurma', { default: null });
const sonKat = defineModel<Num>('sonKat', { default: null });
const durmaAlani = defineModel<string | null>('durmaAlani', { default: null });

const durmaAlaniOptions = [
  { label: '50 x 70 x 100 cm', value: '50x70x100' },
  { label: '40 x 50 x 100 cm', value: '40x50x100' },
];

type HotspotKey = 'korkulukMesafe' | 'korkulukYuk' | 'susp' | 'durma' | 'sonKat' | 'durmaAlani';

const aktifHotspot = ref<HotspotKey | null>(null);
const diagramWrapRef = ref<HTMLElement | null>(null);

function toggleHotspot(key: HotspotKey) {
  aktifHotspot.value = aktifHotspot.value === key ? null : key;
}

function onDocumentMousedown(e: MouseEvent) {
  if (!diagramWrapRef.value) return;
  if (!diagramWrapRef.value.contains(e.target as Node)) aktifHotspot.value = null;
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown));

const VB_W = 500;
const VB_H = 465;
const SVG_W = 400;
const SVG_H = 372;
const OLCEK_X = SVG_W / VB_W;
const OLCEK_Y = SVG_H / VB_H;

const POPOVER_KONUM: Record<HotspotKey, { left: number; top: number }> = {
  korkulukMesafe: { left: 120, top: 120 },
  korkulukYuk: { left: 95, top: 190 },
  susp: { left: 270, top: 125 },
  durma: { left: 345, top: 135 },
  sonKat: { left: 440, top: 260 },
  durmaAlani: { left: 250, top: 370 },
};

function popoverStyle(key: HotspotKey) {
  const k = POPOVER_KONUM[key];
  const leftPx = Math.min(Math.max(k.left * OLCEK_X, 70), SVG_W - 70);
  return {
    left: `${leftPx}px`,
    top: `${k.top * OLCEK_Y}px`,
    transform: 'translateX(-50%)',
  };
}

const mmText = (v: Num) => (n(v) != null ? `${n(v)} mm` : 'ölçü');

const durmaAlaniLabel = computed(
  () => durmaAlaniOptions.find((o) => o.value === durmaAlani.value)?.label ?? 'seçiniz'
);

// Kuyu dipteki karşı ağırlık tamponu değerlerinden hesaplanan son hareket mesafesi.
const sonHareketMm = computed(() => {
  if (props.dipBosluk == null || props.dipStroke == null || props.hiz == null) return null;
  return props.dipBosluk + props.dipStroke + 0.035 * props.hiz * props.hiz * 1000;
});

const sonHareketMesafesiCm = computed(() =>
  sonHareketMm.value != null ? (Math.round(sonHareketMm.value) / 10).toLocaleString('tr-TR') : null
);

// ---- Kuyu üstü risk kontrolü ----
// Son hareket sonrası: korkuluk mesafesinden min 300 mm, süspansiyon
// mesafesinden min 500 mm kalmalı; kabin üst durma − son hareket − durma
// alanının SON ölçüsü (50x70x100 → 100 cm) 0'dan küçük olmamalı.
const durmaSonMm = computed(() => {
  const parcalar = durmaAlani.value?.split('x') ?? [];
  const son = Number(parcalar[parcalar.length - 1]);
  return Number.isFinite(son) ? son * 10 : null;
});

// Şartı sağlamayan ölçü şemada kırmızı gösterilir, açıklaması altta yazılır.
const korkulukRiski = computed(() => {
  const km = n(korkulukMesafe.value);
  return km != null && sonHareketMm.value != null && km - sonHareketMm.value < 300;
});

const suspRiski = computed(() => {
  const sm = n(suspansiyonMesafe.value);
  return sm != null && sonHareketMm.value != null && sm - sonHareketMm.value < 500;
});

const durmaRiski = computed(() => {
  const kd = n(kabinUstDurma.value);
  return (
    kd != null &&
    sonHareketMm.value != null &&
    durmaSonMm.value != null &&
    kd - sonHareketMm.value - durmaSonMm.value < 0
  );
});

const ustRiskVar = computed(() => korkulukRiski.value || suspRiski.value || durmaRiski.value);
</script>

<template>
  <SemaModal v-model:open="open" title="Kuyu Üst Alanı" @iptal="emit('iptal')">
    <div class="flex flex-col items-center gap-3 py-1">
      <p class="text-center text-xs text-ink-muted">
        Son Hareket Mesafesi (Boşluk + Stroke + 0,035 × Hız²):
        <strong class="font-semibold text-[#6fcf97]">{{ sonHareketMesafesiCm != null ? `${sonHareketMesafesiCm} cm` : '—' }}</strong>
      </p>
      <SemaOlcekle :genislik="SVG_W" :yukseklik="SVG_H"><div ref="diagramWrapRef" class="sema-wrap" :style="{ width: `${SVG_W}px`, height: `${SVG_H}px` }"
        @click="aktifHotspot = null">
        <svg :viewBox="`0 0 ${VB_W} ${VB_H}`" :width="SVG_W" :height="SVG_H" class="sema-svg">
          <defs>
            <marker id="ust-olcu-ok" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#9db3a7" />
            </marker>
          </defs>

          <!-- Kuyu tavanı ve duvarlar -->
          <line x1="60" y1="40" x2="440" y2="40" stroke="currentColor" stroke-width="3" />
          <line x1="60" y1="40" x2="60" y2="420" stroke="currentColor" stroke-width="3" />
          <line x1="440" y1="40" x2="440" y2="420" stroke="currentColor" stroke-width="3" />
          <line x1="365" y1="400" x2="395" y2="400" stroke="currentColor" stroke-width="2.5" />
          <line x1="365" y1="400" x2="365" y2="425" stroke="currentColor" stroke-width="2.5" />

          <!-- Son Kat (sağ dış) -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('sonKat')">
            <rect x="444" y="44" width="56" height="380" fill="transparent" />
            <line x1="470" y1="55" x2="470" y2="190" class="sema-olcu-cizgi" stroke-width="2" marker-start="url(#ust-olcu-ok)" />
            <text x="470" y="213" text-anchor="middle" font-size="13" fill="currentColor">Son Kat</text>
            <text x="470" y="231" text-anchor="middle" font-size="10" fill="currentColor">{{ mmText(sonKat) }}</text>
            <line x1="470" y1="244" x2="470" y2="415" class="sema-olcu-cizgi" stroke-width="2" marker-end="url(#ust-olcu-ok)" />
          </g>

          <!-- Kabin + süspansiyon + korkuluk -->
          <rect x="160" y="180" width="180" height="230" fill="none" stroke="currentColor" stroke-width="3" />
          <text x="250" y="305" text-anchor="middle" font-size="17" fill="currentColor">Kabin</text>
          <rect x="225" y="140" width="50" height="40" fill="none" stroke="currentColor" stroke-width="2.5" />
          <line x1="185" y1="180" x2="185" y2="120" stroke="currentColor" stroke-width="2.5" />
          <line x1="176" y1="120" x2="194" y2="120" stroke="currentColor" stroke-width="2.5" />

          <!-- Korkuluk Mesafe -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('korkulukMesafe')"
            :style="korkulukRiski ? { color: '#f87171' } : undefined">
            <rect x="62" y="44" width="80" height="78" fill="transparent" />
            <line x1="130" y1="44" x2="130" y2="116"
              :class="['sema-olcu-cizgi', korkulukRiski ? 'sema-olcu-cizgi--risk' : '']" stroke-width="2"
              marker-start="url(#ust-olcu-ok)" marker-end="url(#ust-olcu-ok)" />
            <text x="95" y="68" text-anchor="middle" font-size="12" fill="currentColor">Korkuluk</text>
            <text x="95" y="82" text-anchor="middle" font-size="12" fill="currentColor">Mesafe</text>
            <text x="95" y="100" text-anchor="middle" font-size="11" fill="currentColor">{{ mmText(korkulukMesafe) }}</text>
          </g>

          <!-- Korkuluk yüksekliği (sol dış) -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('korkulukYuk')">
            <rect x="2" y="116" width="56" height="68" fill="transparent" />
            <line x1="50" y1="122" x2="50" y2="178" class="sema-olcu-cizgi" stroke-width="2"
              marker-start="url(#ust-olcu-ok)" marker-end="url(#ust-olcu-ok)" />
            <text x="25" y="145" text-anchor="middle" font-size="11" fill="currentColor">Korkuluk</text>
            <text x="25" y="162" text-anchor="middle" font-size="10" fill="currentColor">{{ mmText(korkulukYuksekligi) }}</text>
          </g>

          <!-- Süsp. Mesafe -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('susp')"
            :style="suspRiski ? { color: '#f87171' } : undefined">
            <rect x="236" y="44" width="70" height="96" fill="transparent" />
            <line x1="250" y1="44" x2="250" y2="136"
              :class="['sema-olcu-cizgi', suspRiski ? 'sema-olcu-cizgi--risk' : '']" stroke-width="2"
              marker-start="url(#ust-olcu-ok)" marker-end="url(#ust-olcu-ok)" />
            <text x="258" y="78" text-anchor="start" font-size="12" fill="currentColor">Süsp.</text>
            <text x="258" y="92" text-anchor="start" font-size="12" fill="currentColor">Mesafe</text>
            <text x="258" y="110" text-anchor="start" font-size="11" fill="currentColor">{{ mmText(suspansiyonMesafe) }}</text>
          </g>

          <!-- Kabin Üst Durma -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('durma')"
            :style="durmaRiski ? { color: '#f87171' } : undefined">
            <rect x="308" y="44" width="92" height="134" fill="transparent" />
            <line x1="320" y1="44" x2="320" y2="176"
              :class="['sema-olcu-cizgi', durmaRiski ? 'sema-olcu-cizgi--risk' : '']" stroke-width="2"
              marker-start="url(#ust-olcu-ok)" marker-end="url(#ust-olcu-ok)" />
            <text x="330" y="90" text-anchor="start" font-size="12" fill="currentColor">Kabin Üst</text>
            <text x="330" y="104" text-anchor="start" font-size="12" fill="currentColor">Durma</text>
            <text x="330" y="122" text-anchor="start" font-size="11" fill="currentColor">{{ mmText(kabinUstDurma) }}</text>
          </g>

          <!-- Durma Alanı (şeklin altında) -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('durmaAlani')">
            <rect x="90" y="438" width="320" height="26" fill="transparent" />
            <text x="250" y="456" text-anchor="middle" font-size="15" fill="currentColor">
              Durma Alanı: {{ durmaAlaniLabel }}
            </text>
          </g>
        </svg>

        <div v-if="aktifHotspot === 'korkulukMesafe'" class="sema-popover" :style="popoverStyle('korkulukMesafe')" @click.stop>
          <input v-model.number="korkulukMesafe" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'korkulukYuk'" class="sema-popover" :style="popoverStyle('korkulukYuk')" @click.stop>
          <input v-model.number="korkulukYuksekligi" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'susp'" class="sema-popover" :style="popoverStyle('susp')" @click.stop>
          <input v-model.number="suspansiyonMesafe" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'durma'" class="sema-popover" :style="popoverStyle('durma')" @click.stop>
          <input v-model.number="kabinUstDurma" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'sonKat'" class="sema-popover" :style="popoverStyle('sonKat')" @click.stop>
          <input v-model.number="sonKat" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'durmaAlani'" class="sema-popover sema-popover--genis" :style="popoverStyle('durmaAlani')" @click.stop>
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Durma Alanı</span>
            <select v-model="durmaAlani"
              class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
              <option :value="null" disabled>Seçiniz</option>
              <option v-for="o in durmaAlaniOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
        </div>
      </div></SemaOlcekle>

      <div v-if="ustRiskVar" class="space-y-0.5 text-center text-xs font-semibold text-red-400">
        <p v-if="korkulukRiski">
          Korkuluk mesafesi şartı sağlamıyor: son hareket sonrası en az 300 mm kalmalı.
        </p>
        <p v-if="suspRiski">
          Süspansiyon mesafesi şartı sağlamıyor: son hareket sonrası en az 500 mm kalmalı.
        </p>
        <p v-if="durmaRiski">
          Kabin üst durma şartı sağlamıyor: son hareket ve durma alanı çıkarılınca 0'ın altına düşüyor.
        </p>
        <p>Kuyu üstü risk analizi gerekli!</p>
      </div>
    </div>
    <FotoAlani v-model:fotolar="fotolar" />
  </SemaModal>
</template>

<style scoped>
.sema-wrap {
  position: relative;
  max-width: 100%;
}

.sema-svg {
  color: var(--color-ink);
}

.sema-hotspot {
  cursor: pointer;
}

.sema-hotspot:hover text {
  fill: var(--sema-vurgu);
}

.sema-hotspot:hover line {
  stroke: var(--sema-vurgu);
}

.sema-olcu-cizgi {
  stroke: var(--color-ink-muted);
  stroke-dasharray: 1.5 4.5;
  stroke-linecap: round;
}

/* Şartı sağlamayan ölçünün çizgisi kırmızı gösterilir */
.sema-olcu-cizgi--risk {
  stroke: #f87171;
}

.sema-popover {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: var(--sema-popup);
  border: 1px solid var(--sema-kenar);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 5;
}

.sema-popover--genis {
  flex-direction: column;
  align-items: stretch;
  width: 230px;
}

.sema-popover__input {
  width: 80px;
  padding: 4px 6px;
  font-size: 13px;
  border: 1px solid var(--sema-kenar);
  background: var(--color-surface-900);
  color: var(--color-ink);
  -moz-appearance: textfield;
}

.sema-popover__input::-webkit-outer-spin-button,
.sema-popover__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.sema-popover__unit {
  font-size: 12px;
  color: var(--color-ink-muted);
}
</style>
