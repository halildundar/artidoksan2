<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import SemaModal from '@/components/SemaModal.vue';

// Halat ve Kasnaklar şeması (artidoksan1'den taşındı): askı tipine göre iki
// sabit diyagramdan biri gösterilir (1:1 → tahrik + sapturma kasnağı,
// diğerleri → tahrik kasnağı + 3 palanga). Daireler ve halat çizgisi
// tıklanarak veri girilir.
type Num = number | '' | null;

const props = defineProps<{
  askiTipi?: string | null;
  // Halat tipi seçenekleri CE kataloğundaki halat sertifikalarının tipler[]
  // listesinden gelir (örn. "6.5mm(8x19 W-IWRC)") — çağıran sayfa sağlar.
  halatTipiSecenekleri?: { label: string; value: string }[];
}>();

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const tahrikKasnagiCapi = defineModel<Num>('tahrikKasnagiCapi', { default: null });
const sapturmaKasnagiCapi = defineModel<Num>('sapturmaKasnagiCapi', { default: null });
const palanga1Capi = defineModel<Num>('palanga1Capi', { default: null });
const palanga2Capi = defineModel<Num>('palanga2Capi', { default: null });
const palanga3Capi = defineModel<Num>('palanga3Capi', { default: null });
const halatSekli = defineModel<string | null>('halatSekli', { default: null });
const halatAdedi = defineModel<Num>('halatAdedi', { default: null });
// 1:1 askıda tahrik–saptırma kasnağı arası halat mesafesi (ayrı girdi).
const halatMesafesi = defineModel<Num>('halatMesafesi', { default: null });
const halatTipi = defineModel<string | null>('halatTipi', { default: null });
// Kasnak merkezleri arası dikey mesafe (B) — 1:1 şemada tıklanabilir ölçü.
const dikeyMesafe = defineModel<Num>('dikeyMesafe', { default: null });
// Kasnak/palanga konumu — yalnız 2:1 ve üzeri askılarda (1:1'de palanga yok).
const palangaKonumu = defineModel<string | null>('palangaKonumu', { default: null });

const birBir = computed(() => props.askiTipi === '1:1');
// Otomatik hesap sonuçları modele geri yazılır (aitest SarimAcisiModal deseni):
// A = halat mesafesi − d1/2 − d2/2, sarım açısı = 90° + atan(B/A).
const yatayMesafe = defineModel<Num>('yatayMesafe', { default: null });
const sarimAcisi = defineModel<Num>('sarimAcisi', { default: null });

const n = (v: Num): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const yatayMesafeHesap = computed(() => {
  const halat = n(halatMesafesi.value);
  const d1 = n(tahrikKasnagiCapi.value);
  const d2 = n(sapturmaKasnagiCapi.value);
  if (!halat || !d1 || !d2) return null;
  return Math.round((halat - d1 / 2 - d2 / 2) * 10) / 10;
});
watch(yatayMesafeHesap, (v) => (yatayMesafe.value = v));

// Sarım açısı yalnız 1:1 askıda hesaplanır; diğer askı oranlarında sabit 180°.
const sarimAcisiHesap = computed(() => {
  if (!birBir.value) return 180;
  const a = yatayMesafeHesap.value;
  const b = n(dikeyMesafe.value);
  if (!a || !b) return null;
  return Math.round((90 + (Math.atan(b / a) * 180) / Math.PI) * 10) / 10;
});
watch(sarimAcisiHesap, (v) => (sarimAcisi.value = v));

const mm = (v: Num, bosluklu = true) =>
  typeof v === 'number' && !Number.isNaN(v) ? `${v}${bosluklu ? ' ' : ''}mm` : 'çap';

const halatSekliOptions = [
  { label: 'Çelik Halat', value: 'celik_halat' },
  { label: 'Kayış (Belt)', value: 'kayis' },
  { label: 'Kompozit Halat', value: 'kompozit_halat' },
];

// Halat şekli/tipi/adedi popover DEĞİL, diyagramın altındaki sabit "Halat
// Bilgileri" bölümünden girilir (popover dar ekranda diyagram içinde
// kırpılıyordu — kullanıcı bildirimi).
type HotspotKey = 'tahrik' | 'sapturma' | 'palanga1' | 'palanga2' | 'palanga3' | 'mesafe' | 'dikey';

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

// 1:1 ve 2:1 diyagramları farklı viewBox/oranda.
const SVG_OLCU_1_1 = { vbW: 340, vbH: 310, w: 310, h: 280 };
const SVG_OLCU_2_1 = { vbW: 700, vbH: 420, w: 420, h: 252 };

// Diyagram ekrana sığacak şekilde oranlı küçültülür — modal içinde yatay
// scroll OLUŞMAMALI (kullanıcı isteği). Modal gövdesi max-w-lg + p-4
// olduğundan kullanılabilir genişlik min(pencere, 512) − 32.
const pencereGenislik = ref(window.innerWidth);
function onResize() {
  pencereGenislik.value = window.innerWidth;
}
onMounted(() => window.addEventListener('resize', onResize));
onBeforeUnmount(() => window.removeEventListener('resize', onResize));

const svgOlcu = computed(() => {
  const taban = birBir.value ? SVG_OLCU_1_1 : SVG_OLCU_2_1;
  const kullanilabilir = Math.min(pencereGenislik.value, 512) - 32;
  const oran = Math.min(1, kullanilabilir / taban.w);
  return { vbW: taban.vbW, vbH: taban.vbH, w: Math.round(taban.w * oran), h: Math.round(taban.h * oran) };
});
const svgViewBox = computed(() => `0 0 ${svgOlcu.value.vbW} ${svgOlcu.value.vbH}`);

const OLCEK_X = computed(() => svgOlcu.value.w / svgOlcu.value.vbW);
const OLCEK_Y = computed(() => svgOlcu.value.h / svgOlcu.value.vbH);

const POPOVER_KONUM_1_1: Partial<Record<HotspotKey, { left: number; top: number }>> = {
  tahrik: { left: 100, top: 128 },
  sapturma: { left: 230, top: 170 },
  mesafe: { left: 161, top: 200 },
  dikey: { left: 70, top: 142 },
};
const POPOVER_KONUM_2_1: Partial<Record<HotspotKey, { left: number; top: number }>> = {
  tahrik: { left: 320, top: 182 },
  palanga1: { left: 210, top: 342 },
  palanga2: { left: 430, top: 382 },
  palanga3: { left: 580, top: 382 },
};

function popoverStyle(key: HotspotKey) {
  const k = (birBir.value ? POPOVER_KONUM_1_1 : POPOVER_KONUM_2_1)[key];
  if (!k) return {};
  return {
    left: `${k.left * OLCEK_X.value}px`,
    top: `${k.top * OLCEK_Y.value}px`,
    transform: 'translateX(-50%)',
  };
}
</script>

<template>
  <SemaModal v-model:open="open" title="Halat ve Kasnaklar" @iptal="emit('iptal')">
    <div class="flex justify-center py-1">
      <div ref="diagramWrapRef" class="sema-wrap shrink-0"
        :style="{ width: `${svgOlcu.w}px`, height: `${svgOlcu.h}px` }">
        <svg :viewBox="svgViewBox" :width="svgOlcu.w" :height="svgOlcu.h" class="sema-svg">
          <defs>
            <marker id="halat-olcu-ok" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
            </marker>
          </defs>

          <template v-if="birBir">
            <text x="280" y="25" text-anchor="middle" font-size="15" fill="currentColor">1:1 Askı</text>

            <!-- Halat çizgisi (görsel) -->
            <line x1="113" y1="38" x2="241" y2="96" stroke="currentColor" stroke-width="2" />

            <!-- Halat mesafesi (ayrı tıklanabilir ölçü — 1:1 askıya özel girdi) -->
            <g class="sema-hotspot" @click="toggleHotspot('mesafe')">
              <rect x="46" y="220" width="230" height="52" fill="transparent" />
              <line x1="56" y1="80" x2="56" y2="240" stroke="currentColor" stroke-width="2" />
              <line x1="56" y1="240" x2="266" y2="240" stroke="currentColor" stroke-width="2"
                marker-start="url(#halat-olcu-ok)" marker-end="url(#halat-olcu-ok)" />
              <line x1="266" y1="130" x2="266" y2="240" stroke="currentColor" stroke-width="2" />
              <text x="161" y="262" text-anchor="middle" font-size="14" fill="currentColor">
                Halat mesafesi{{ typeof halatMesafesi === 'number' ? `: ${halatMesafesi} mm` : '' }}
              </text>
            </g>

            <!-- Tahrik Kasnağı -->
            <g class="sema-hotspot" @click="toggleHotspot('tahrik')">
              <circle cx="100" cy="80" r="44" fill="transparent" stroke="currentColor" stroke-width="2.5" />
              <text x="100" y="26" text-anchor="middle" font-size="15" fill="currentColor">Tahrik Kasnağı</text>
              <text x="100" y="85" text-anchor="middle" font-size="15" fill="currentColor">{{ mm(tahrikKasnagiCapi) }}</text>
            </g>

            <!-- Sapturma Kasnağı -->
            <g class="sema-hotspot" @click="toggleHotspot('sapturma')">
              <circle cx="230" cy="130" r="36" fill="transparent" stroke="currentColor" stroke-width="2.5" />
              <text x="296" y="120" text-anchor="middle" font-size="14" fill="currentColor">Sapturma</text>
              <text x="296" y="138" text-anchor="middle" font-size="14" fill="currentColor">Kasnağı</text>
              <text x="230" y="134" text-anchor="middle" font-size="14" fill="currentColor">{{ mm(sapturmaKasnagiCapi) }}</text>
            </g>

            <!-- Kasnak merkezleri yatay hizası (kesikli gri, görsel) -->
            <line x1="24" y1="130" x2="230" y2="130" stroke="#8a9a90" stroke-width="1.5"
              stroke-dasharray="5 4" />
            <!-- Tahrik merkezi hizası uzatma çizgisi (ölçü dışarıda okunsun diye) -->
            <line x1="24" y1="80" x2="100" y2="80" stroke="#8a9a90" stroke-width="1"
              stroke-dasharray="5 4" />

            <!-- Kasnak merkezleri arası DİKEY ölçü (B) — şeklin solunda,
            dışarıda; tıklanabilir girdi, sarım açısı hesabında kullanılır -->
            <g class="sema-hotspot" @click="toggleHotspot('dikey')">
              <rect x="2" y="74" width="40" height="62" fill="transparent" />
              <line x1="24" y1="80" x2="24" y2="130" stroke="currentColor" stroke-width="2"
                marker-start="url(#halat-olcu-ok)" marker-end="url(#halat-olcu-ok)" />
              <text x="14" y="105" text-anchor="middle" font-size="12" fill="currentColor"
                transform="rotate(-90 14 105)">
                {{ typeof dikeyMesafe === 'number' ? `${dikeyMesafe} mm` : 'B' }}
              </text>
              <!-- Etiket, Sapturma Kasnağı yazısı gibi yatay iki satır -->
              <text x="4" y="56" text-anchor="start" font-size="10" fill="currentColor">Çaplar Arası</text>
              <text x="4" y="68" text-anchor="start" font-size="10" fill="currentColor">Dikey Mesafe</text>
            </g>
          </template>

          <template v-else>
            <text x="640" y="40" text-anchor="end" font-size="15" fill="currentColor">{{ askiTipi || '2:1' }} Askı</text>

            <!-- Tahrik Kasnağı -->
            <g class="sema-hotspot" @click="toggleHotspot('tahrik')">
              <circle cx="320" cy="110" r="65" fill="transparent" stroke="currentColor" stroke-width="2.5" />
              <text x="320" y="30" text-anchor="middle" font-size="15" fill="currentColor">Tahrik Kasnağı</text>
              <text x="320" y="110" text-anchor="middle" dominant-baseline="central" font-size="15" fill="currentColor">{{ mm(tahrikKasnagiCapi) }}</text>
            </g>

            <!-- Palanga 1/2/3 -->
            <g class="sema-hotspot" @click="toggleHotspot('palanga1')">
              <circle cx="210" cy="290" r="45" fill="transparent" stroke="currentColor" stroke-width="2.5" />
              <text x="210" y="352" text-anchor="middle" font-size="15" fill="currentColor">palanga1</text>
              <text x="210" y="294" text-anchor="middle" dominant-baseline="central" font-size="14" fill="currentColor">{{ mm(palanga1Capi, false) }}</text>
            </g>
            <g class="sema-hotspot" @click="toggleHotspot('palanga2')">
              <circle cx="430" cy="330" r="45" fill="transparent" stroke="currentColor" stroke-width="2.5" />
              <text x="430" y="392" text-anchor="middle" font-size="15" fill="currentColor">palanga2</text>
              <text x="430" y="334" text-anchor="middle" dominant-baseline="central" font-size="14" fill="currentColor">{{ mm(palanga2Capi, false) }}</text>
            </g>
            <g class="sema-hotspot" @click="toggleHotspot('palanga3')">
              <circle cx="580" cy="330" r="45" fill="transparent" stroke="currentColor" stroke-width="2.5" />
              <text x="580" y="392" text-anchor="middle" font-size="15" fill="currentColor">palanga3</text>
              <text x="580" y="334" text-anchor="middle" dominant-baseline="central" font-size="14" fill="currentColor">{{ mm(palanga3Capi, false) }}</text>
            </g>

            <!-- Halat görseli (dairelerin üstünde) -->
            <g>
              <path
                d="M 165 80 L 165 290 M 255 290 L 255 110 A 65 65 0 0 0 385 110 L 385 330 M 430 375 L 580 375 M 625 330 L 625 80"
                fill="none" stroke="#378ADD" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              <line x1="148" y1="80" x2="182" y2="80" stroke="currentColor" stroke-width="2" />
              <line x1="152" y1="80" x2="146" y2="72" stroke="currentColor" stroke-width="1" />
              <line x1="162" y1="80" x2="156" y2="72" stroke="currentColor" stroke-width="1" />
              <line x1="172" y1="80" x2="166" y2="72" stroke="currentColor" stroke-width="1" />
              <line x1="608" y1="80" x2="642" y2="80" stroke="currentColor" stroke-width="2" />
              <line x1="612" y1="80" x2="606" y2="72" stroke="currentColor" stroke-width="1" />
              <line x1="622" y1="80" x2="616" y2="72" stroke="currentColor" stroke-width="1" />
              <line x1="632" y1="80" x2="626" y2="72" stroke="currentColor" stroke-width="1" />
              <text x="165" y="58" text-anchor="middle" font-size="12" fill="currentColor">askı ucu</text>
              <text x="625" y="58" text-anchor="middle" font-size="12" fill="currentColor">askı ucu</text>
            </g>
          </template>
        </svg>

        <div v-if="aktifHotspot === 'tahrik'" class="sema-popover" :style="popoverStyle('tahrik')" @click.stop>
          <input v-model.number="tahrikKasnagiCapi" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'sapturma'" class="sema-popover" :style="popoverStyle('sapturma')" @click.stop>
          <input v-model.number="sapturmaKasnagiCapi" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'palanga1'" class="sema-popover" :style="popoverStyle('palanga1')" @click.stop>
          <input v-model.number="palanga1Capi" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'palanga2'" class="sema-popover" :style="popoverStyle('palanga2')" @click.stop>
          <input v-model.number="palanga2Capi" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'palanga3'" class="sema-popover" :style="popoverStyle('palanga3')" @click.stop>
          <input v-model.number="palanga3Capi" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'mesafe'" class="sema-popover" :style="popoverStyle('mesafe')" @click.stop>
          <input v-model.number="halatMesafesi" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'dikey'" class="sema-popover" :style="popoverStyle('dikey')" @click.stop>
          <input v-model.number="dikeyMesafe" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
      </div>
    </div>

    <!-- Sarım açısı: 1:1'de A=halat mesafesi−d1/2−d2/2 ve B'den otomatik
    hesaplanır; diğer askı oranlarında sabit 180°. 160° altı kırmızı. -->
    <p class="mt-1 text-center text-sm font-semibold"
      :class="sarimAcisiHesap != null && sarimAcisiHesap < 160 ? 'text-red-500' : 'text-white'">
      Sarım Açısı: {{ sarimAcisiHesap != null ? `${sarimAcisiHesap}°` : '—' }}
    </p>

    <!-- Halat Bilgileri — popover değil, diyagramın altında sabit bölüm
    (popover dar ekranda diyagram içinde kırpılıyordu) -->
    <div class="mt-2 space-y-1.5 border-t border-white/5 pt-3">
      <h3 class="text-xs font-bold text-ink">Halat Bilgileri</h3>
      <div class="grid grid-cols-2 gap-1.5">
        <label class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Halat Şekli</span>
          <select v-model="halatSekli"
            class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
            <option :value="null" disabled>Seçiniz</option>
            <option v-for="o in halatSekliOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
        <label class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Halat Adedi</span>
          <input v-model.number="halatAdedi" type="number"
            class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
        </label>
      </div>
      <!-- Halat değerleri CE kataloğundaki halat sertifikalarından gelir
      (örn. "6.5mm(8x19 W-IWRC)") -->
      <label class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Halat Tipi</span>
        <select v-model="halatTipi"
          class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
          <option :value="null" disabled>Seçiniz</option>
          <option v-for="o in props.halatTipiSecenekleri ?? []" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <!-- Kasnak/palanga konumu yalnız 2:1 ve üzeri askılarda sorulur -->
      <label v-if="!birBir" class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Kasnak Palanga Konum</span>
        <select v-model="palangaKonumu"
          class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
          <option :value="null" disabled>Seçiniz</option>
          <option value="kabin-alti">Kabin Altı</option>
          <option value="kabin-ustu">Kabin Üstü</option>
        </select>
      </label>
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

.sema-hotspot:hover circle,
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
  width: 80px;
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
