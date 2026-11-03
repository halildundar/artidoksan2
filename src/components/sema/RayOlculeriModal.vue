<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import SemaOlcekle from './SemaOlcekle.vue';
import FotoAlani from '@/components/FotoAlani.vue';
import type { BelgeSlot } from '@/services/dosyaService';
import { KABIN_RAY_TIPLERI, KARSI_AGIRLIK_RAY_TIPLERI } from '@/utils/rayTipleri';

// Ray Ölçüleri şeması (artidoksan1'den taşındı): kuyu ÜSTTEN görünüm.
// Ağırlık konumuna göre iki yerleşim: 'arka' → karşı ağırlık rayları arka
// duvarda; 'sag'/'sol' → yan duvarda (sol, sağ yerleşiminin yatay aynası).
// RR = ray–ray arası, RK = ray–kapı; 1:1 askıda halat arası altta hesaplanır.
type Num = number | '' | null;
const n = (v: Num): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

const props = defineProps<{ agirlikKonumu?: string | null }>();

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const fotolar = defineModel<BelgeSlot[]>('fotolar', { default: () => [] });
const karsiAgirlikRayArasi = defineModel<Num>('karsiAgirlikRayArasi', { default: null });
const kabinRayArasi = defineModel<Num>('kabinRayArasi', { default: null });
const rayRR = defineModel<Num>('rayRR', { default: null });
const rayRK = defineModel<Num>('rayRK', { default: null });
const kuyuGenislik = defineModel<Num>('kuyuGenislik', { default: null });
const kuyuDerinlik = defineModel<Num>('kuyuDerinlik', { default: null });
const kabinRayTipi = defineModel<string | null>('kabinRayTipi', { default: null });
const karsiAgirlikRayTipi = defineModel<string | null>('karsiAgirlikRayTipi', { default: null });

const arka = computed(() => props.agirlikKonumu === 'arka');
const solda = computed(() => props.agirlikKonumu === 'sol');
const konumSecili = computed(
  () => props.agirlikKonumu === 'arka' || props.agirlikKonumu === 'sag' || props.agirlikKonumu === 'sol'
);

// 1:1 askıda halat arası: arkada = RR, sağ/solda = RR + Kabin Ray Arası / 2.
const halatArasi = computed(() => {
  const rr = n(rayRR.value);
  if (rr == null) return null;
  if (arka.value) return rr;
  const kra = n(kabinRayArasi.value);
  if (kra == null) return null;
  return rr + kra / 2;
});

type HotspotKey = 'karsiRay' | 'kabinRay' | 'rr' | 'rk' | 'derinlik' | 'genislik' | 'karsiRayTipi' | 'kabinRayTipi';

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

const VB_W = 560;
const VB_H = 400;
const SVG_W = 448;
const SVG_H = 320;
const OLCEK_X = SVG_W / VB_W;
const OLCEK_Y = SVG_H / VB_H;

// Yatay aynalama — ağırlık solda iken sağ yerleşiminin x'leri kuyu merkezine
// (260) göre aynalanır.
const AYNA = 520;
function m(x: number) {
  return solda.value ? AYNA - x : x;
}
function mrx(x: number, w: number) {
  return solda.value ? AYNA - x - w : x;
}

const POPOVER_KONUM_ARKA: Record<HotspotKey, { left: number; top: number }> = {
  karsiRay: { left: 260, top: 128 },
  kabinRay: { left: 260, top: 218 },
  rr: { left: 135, top: 125 },
  rk: { left: 135, top: 235 },
  derinlik: { left: 390, top: 170 },
  genislik: { left: 260, top: 268 },
  karsiRayTipi: { left: 300, top: 102 },
  kabinRayTipi: { left: 300, top: 212 },
};
const POPOVER_KONUM_YAN: Record<HotspotKey, { left: number; top: number }> = {
  karsiRay: { left: 470, top: 195 },
  kabinRay: { left: 220, top: 205 },
  rr: { left: 380, top: 205 },
  rk: { left: 150, top: 255 },
  derinlik: { left: 120, top: 175 },
  genislik: { left: 260, top: 268 },
  karsiRayTipi: { left: 350, top: 125 },
  kabinRayTipi: { left: 300, top: 210 },
};

function popoverStyle(key: HotspotKey) {
  const k = arka.value ? POPOVER_KONUM_ARKA[key] : POPOVER_KONUM_YAN[key];
  const left = arka.value ? k.left : m(k.left);
  const leftPx = Math.min(Math.max(left * OLCEK_X, 70), SVG_W - 70);
  return {
    left: `${leftPx}px`,
    top: `${k.top * OLCEK_Y}px`,
    transform: 'translateX(-50%)',
  };
}

const mmText = (v: Num) => (n(v) != null ? `${n(v)} mm` : 'ölçü');
</script>

<template>
  <SemaModal v-model:open="open" title="Ray Ölçüleri" @iptal="emit('iptal')">
    <p v-if="!konumSecili" class="px-2 py-4 text-sm text-ink-muted">
      Karşı ağırlık konumu seçilmemiş. Ray ölçüleri çizimi için önce formdaki "Konum / Ray" bölümünden
      K. Ağırlık Konumu alanını seçin.
    </p>

    <div v-else class="flex flex-col items-center gap-3 py-1">
      <SemaOlcekle :genislik="SVG_W" :yukseklik="SVG_H"><div ref="diagramWrapRef" class="sema-wrap shrink-0" :style="{ width: `${SVG_W}px`, height: `${SVG_H}px` }"
        @click="aktifHotspot = null">
        <svg :viewBox="`0 0 ${VB_W} ${VB_H}`" :width="SVG_W" :height="SVG_H" class="sema-svg">
          <defs>
            <marker id="ray-olcu-ok" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#9db3a7" />
            </marker>
          </defs>

          <!-- Kuyu (üstten görünüm) -->
          <rect x="80" y="50" width="360" height="250" fill="none" stroke="currentColor" stroke-width="2.5" />

          <template v-if="arka">
            <!-- Karşı Ağırlık Ray Arası -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('karsiRay')">
              <rect x="110" y="58" width="300" height="72" fill="transparent" />
              <line x1="188" y1="80" x2="332" y2="80" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
              <text x="260" y="105" text-anchor="middle" font-size="13" fill="currentColor">Karşı Ağ. Ray Arası</text>
              <text x="260" y="123" text-anchor="middle" font-size="12" fill="currentColor">{{ mmText(karsiAgirlikRayArasi) }}</text>
            </g>

            <!-- Kabin Ray Arası -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('kabinRay')">
              <rect x="100" y="155" width="320" height="66" fill="transparent" />
              <text x="260" y="167" text-anchor="middle" font-size="13" fill="currentColor">Kabin Ray Arası</text>
              <line x1="148" y1="190" x2="372" y2="190" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
              <text x="260" y="213" text-anchor="middle" font-size="12" fill="currentColor">{{ mmText(kabinRayArasi) }}</text>
            </g>

            <!-- RR -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('rr')">
              <rect x="6" y="82" width="72" height="106" fill="transparent" />
              <line x1="48" y1="82" x2="48" y2="188" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
              <text x="24" y="130" text-anchor="middle" font-size="13" fill="currentColor">RR</text>
              <text x="24" y="148" text-anchor="middle" font-size="10" fill="currentColor">{{ mmText(rayRR) }}</text>
            </g>

            <!-- RK -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('rk')">
              <rect x="6" y="190" width="72" height="110" fill="transparent" />
              <line x1="48" y1="192" x2="48" y2="298" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
              <text x="24" y="240" text-anchor="middle" font-size="13" fill="currentColor">RK</text>
              <text x="24" y="258" text-anchor="middle" font-size="10" fill="currentColor">{{ mmText(rayRK) }}</text>
            </g>

            <!-- Kuyu Derinliği -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('derinlik')">
              <rect x="452" y="50" width="104" height="250" fill="transparent" />
              <line x1="472" y1="52" x2="472" y2="298" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
              <text x="516" y="158" text-anchor="middle" font-size="13" fill="currentColor">Kuyu</text>
              <text x="516" y="175" text-anchor="middle" font-size="13" fill="currentColor">Derinliği</text>
              <text x="516" y="196" text-anchor="middle" font-size="11" fill="currentColor">{{ mmText(kuyuDerinlik) }}</text>
            </g>

            <!-- Kuyu Genişliği -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('genislik')">
              <rect x="80" y="306" width="360" height="94" fill="transparent" />
              <line x1="80" y1="304" x2="80" y2="330" stroke="currentColor" stroke-width="1.5" />
              <line x1="440" y1="304" x2="440" y2="330" stroke="currentColor" stroke-width="1.5" />
              <line x1="82" y1="330" x2="438" y2="330" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
              <text x="260" y="356" text-anchor="middle" font-size="13" fill="currentColor">Kuyu Genişliği</text>
              <text x="260" y="376" text-anchor="middle" font-size="12" fill="currentColor">{{ mmText(kuyuGenislik) }}</text>
            </g>

            <!-- Karşı ağırlık RAYLARI (ray tipi seçimi) -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('karsiRayTipi')">
              <rect x="156" y="58" width="28" height="44" fill="transparent" />
              <rect x="336" y="58" width="28" height="44" fill="transparent" />
              <line x1="170" y1="63" x2="170" y2="97" stroke="currentColor" stroke-width="2.5" />
              <line x1="170" y1="80" x2="184" y2="80" stroke="currentColor" stroke-width="2.5" />
              <line x1="350" y1="63" x2="350" y2="97" stroke="currentColor" stroke-width="2.5" />
              <line x1="350" y1="80" x2="336" y2="80" stroke="currentColor" stroke-width="2.5" />
              <text x="362" y="84" text-anchor="start" font-size="11" fill="currentColor">{{ karsiAgirlikRayTipi ?? 'tip' }}</text>
            </g>

            <!-- Kabin RAYLARI (ray tipi seçimi) -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('kabinRayTipi')">
              <rect x="116" y="168" width="28" height="44" fill="transparent" />
              <rect x="376" y="168" width="28" height="44" fill="transparent" />
              <line x1="130" y1="173" x2="130" y2="207" stroke="currentColor" stroke-width="2.5" />
              <line x1="130" y1="190" x2="144" y2="190" stroke="currentColor" stroke-width="2.5" />
              <line x1="390" y1="173" x2="390" y2="207" stroke="currentColor" stroke-width="2.5" />
              <line x1="390" y1="190" x2="376" y2="190" stroke="currentColor" stroke-width="2.5" />
              <text x="398" y="194" text-anchor="start" font-size="11" fill="currentColor">{{ kabinRayTipi ?? 'tip' }}</text>
            </g>
          </template>

          <template v-else>
            <!-- Ağırlık SAĞDA/SOLDA yerleşimi -->
            <circle :cx="m(415)" cy="175" r="3.5" fill="currentColor" />

            <!-- Kabin Ray Arası -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('kabinRay')">
              <rect :x="mrx(109, 222)" y="148" width="222" height="62" fill="transparent" />
              <text :x="m(220)" y="158" text-anchor="middle" font-size="12" fill="currentColor">Kabin Ray Arası</text>
              <line :x1="m(113)" y1="175" :x2="m(327)" y2="175" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
              <text :x="m(220)" y="200" text-anchor="middle" font-size="11" fill="currentColor">{{ mmText(kabinRayArasi) }}</text>
            </g>

            <!-- RR -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('rr')">
              <rect :x="mrx(342, 66)" y="150" width="66" height="58" fill="transparent" />
              <line :x1="m(349)" y1="175" :x2="m(411)" y2="175" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
              <text :x="m(380)" y="162" text-anchor="middle" font-size="12" fill="currentColor">RR</text>
              <text :x="m(380)" y="198" text-anchor="middle" font-size="10" fill="currentColor">{{ mmText(rayRR) }}</text>
            </g>

            <!-- Karşı Ağ. Ray Arası (yan duvarda dikey) -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('karsiRay')">
              <rect :x="mrx(402, 26)" y="115" width="26" height="120" fill="transparent" />
              <rect :x="solda ? 4 : 446" y="148" :width="solda ? 72 : 112" height="52" fill="transparent" />
              <text :x="solda ? 40 : 500" y="160" text-anchor="middle" font-size="11" fill="currentColor">Karşı Ağ.</text>
              <text :x="solda ? 40 : 500" y="174" text-anchor="middle" font-size="11" fill="currentColor">Ray Arası</text>
              <text :x="solda ? 40 : 500" y="191" text-anchor="middle" font-size="10" fill="currentColor">{{ mmText(karsiAgirlikRayArasi) }}</text>
              <line :x1="m(415)" y1="118" :x2="m(415)" y2="232" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
            </g>

            <!-- RK -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('rk')">
              <rect :x="mrx(118, 54)" y="180" width="54" height="116" fill="transparent" />
              <line :x1="m(150)" y1="179" :x2="m(150)" y2="296" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
              <text :x="m(128)" y="230" text-anchor="middle" font-size="12" fill="currentColor">RK</text>
              <text :x="m(128)" y="246" text-anchor="middle" font-size="10" fill="currentColor">{{ mmText(rayRK) }}</text>
            </g>

            <!-- Kuyu Derinliği -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('derinlik')">
              <rect :x="mrx(10, 62)" y="52" width="62" height="246" fill="transparent" />
              <line :x1="m(56)" y1="52" :x2="m(56)" y2="298" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
              <text :x="m(28)" y="158" text-anchor="middle" font-size="11" fill="currentColor">Kuyu</text>
              <text :x="m(28)" y="172" text-anchor="middle" font-size="11" fill="currentColor">Derinliği</text>
              <text :x="m(28)" y="190" text-anchor="middle" font-size="10" fill="currentColor">{{ mmText(kuyuDerinlik) }}</text>
            </g>

            <!-- Kuyu Genişliği -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('genislik')">
              <rect x="80" y="306" width="360" height="94" fill="transparent" />
              <line x1="80" y1="304" x2="80" y2="330" stroke="currentColor" stroke-width="1.5" />
              <line x1="440" y1="304" x2="440" y2="330" stroke="currentColor" stroke-width="1.5" />
              <line x1="82" y1="330" x2="438" y2="330" class="sema-olcu-cizgi" stroke-width="2"
                marker-start="url(#ray-olcu-ok)" marker-end="url(#ray-olcu-ok)" />
              <text x="260" y="356" text-anchor="middle" font-size="13" fill="currentColor">Kuyu Genişliği</text>
              <text x="260" y="376" text-anchor="middle" font-size="12" fill="currentColor">{{ mmText(kuyuGenislik) }}</text>
            </g>

            <!-- Kabin RAYLARI -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('kabinRayTipi')">
              <rect :x="mrx(84, 24)" y="152" width="24" height="46" fill="transparent" />
              <rect :x="mrx(329, 32)" y="140" width="32" height="58" fill="transparent" />
              <line :x1="m(95)" y1="158" :x2="m(95)" y2="192" stroke="currentColor" stroke-width="2.5" />
              <line :x1="m(95)" y1="175" :x2="m(109)" y2="175" stroke="currentColor" stroke-width="2.5" />
              <line :x1="m(345)" y1="158" :x2="m(345)" y2="192" stroke="currentColor" stroke-width="2.5" />
              <line :x1="m(345)" y1="175" :x2="m(331)" y2="175" stroke="currentColor" stroke-width="2.5" />
              <text :x="m(345)" y="150" text-anchor="middle" font-size="10" fill="currentColor">{{ kabinRayTipi ?? 'tip' }}</text>
            </g>

            <!-- Karşı ağırlık RAYLARI -->
            <g class="sema-hotspot" @click.stop="toggleHotspot('karsiRayTipi')">
              <rect :x="mrx(396, 38)" y="84" width="38" height="34" fill="transparent" />
              <rect :x="mrx(396, 38)" y="232" width="38" height="26" fill="transparent" />
              <line :x1="m(400)" y1="100" :x2="m(430)" y2="100" stroke="currentColor" stroke-width="2.5" />
              <line :x1="m(415)" y1="100" :x2="m(415)" y2="114" stroke="currentColor" stroke-width="2.5" />
              <line :x1="m(400)" y1="250" :x2="m(430)" y2="250" stroke="currentColor" stroke-width="2.5" />
              <line :x1="m(415)" y1="250" :x2="m(415)" y2="236" stroke="currentColor" stroke-width="2.5" />
              <text :x="m(415)" y="94" text-anchor="middle" font-size="10" fill="currentColor">{{ karsiAgirlikRayTipi ?? 'tip' }}</text>
            </g>
          </template>
        </svg>

        <div v-if="aktifHotspot === 'karsiRay'" class="sema-popover" :style="popoverStyle('karsiRay')" @click.stop>
          <input v-model.number="karsiAgirlikRayArasi" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'kabinRay'" class="sema-popover" :style="popoverStyle('kabinRay')" @click.stop>
          <input v-model.number="kabinRayArasi" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'rr'" class="sema-popover" :style="popoverStyle('rr')" @click.stop>
          <input v-model.number="rayRR" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'rk'" class="sema-popover" :style="popoverStyle('rk')" @click.stop>
          <input v-model.number="rayRK" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'derinlik'" class="sema-popover" :style="popoverStyle('derinlik')" @click.stop>
          <input v-model.number="kuyuDerinlik" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'genislik'" class="sema-popover" :style="popoverStyle('genislik')" @click.stop>
          <input v-model.number="kuyuGenislik" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'karsiRayTipi'" class="sema-popover sema-popover--genis" :style="popoverStyle('karsiRayTipi')" @click.stop>
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Karşı Ağırlık Ray Tipi</span>
            <select v-model="karsiAgirlikRayTipi"
              class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
              <option :value="null" disabled>Seçiniz</option>
              <option v-for="o in KARSI_AGIRLIK_RAY_TIPLERI" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
        </div>
        <div v-if="aktifHotspot === 'kabinRayTipi'" class="sema-popover sema-popover--genis" :style="popoverStyle('kabinRayTipi')" @click.stop>
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Kabin Ray Tipi</span>
            <select v-model="kabinRayTipi"
              class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
              <option :value="null" disabled>Seçiniz</option>
              <option v-for="o in KABIN_RAY_TIPLERI" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
        </div>
      </div></SemaOlcekle>

      <!-- 1:1 askıda halat arası mesafe -->
      <p class="text-center text-xs text-ink-muted">
        1:1 Askıda Halat Arası
        <span>({{ arka ? 'RR' : 'RR + Kabin Ray Arası / 2' }})</span>:
        <strong class="font-semibold text-[#6fcf97]">{{ halatArasi != null ? `${halatArasi} mm` : '—' }}</strong>
      </p>
    </div>
    <FotoAlani v-model:fotolar="fotolar" />
  </SemaModal>
</template>

<style scoped>
.sema-wrap {
  position: relative;
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
