<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import SemaModal from '@/components/SemaModal.vue';

// Kuyu Dip Alanı şeması (artidoksan1'den taşındı): kuyu dibi yan görünüm —
// kabin + tampon + boşluk/stroke ölçüleri, sağda kuyu dip yüksekliği, altta
// durma (sığınma) alanı seçimi; ikinci şekilde karşı ağırlık tamponu.
type Num = number | '' | null;
const n = (v: Num): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

const props = defineProps<{ hiz?: number | null }>();

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const kuyuDipYuksekligi = defineModel<Num>('kuyuDipYuksekligi', { default: null });
// Kabin en alt konumdayken kabin alt noktasının kuyu tabanına mesafesi
const kabinEnAltNokta = defineModel<Num>('kabinEnAltNokta', { default: null });
// Kabin eşiği altındaki etek sacı ucunun kuyu tabanına mesafesi
const etekSaciMesafe = defineModel<Num>('etekSaciMesafe', { default: null });
// (iv) ölçüsü: kabin altı ile gergi kasnağı (kuyudaki en yüksek ekipman) arası
const ivOlcusu = defineModel<Num>('ivOlcusu', { default: null });
const bosluk = defineModel<Num>('bosluk', { default: null });
const stroke = defineModel<Num>('stroke', { default: null });
const durmaAlani = defineModel<string | null>('durmaAlani', { default: null });
const karsiBosluk = defineModel<Num>('karsiBosluk', { default: null });
const karsiStroke = defineModel<Num>('karsiStroke', { default: null });

const MIN_DIP_YUKSEKLIK = 1500;

// Geçersiz giriş (1500 altı) uygulanmaz — önceki değer korunur.
const dipYuksekligiInput = computed<number | null>({
  get: () => n(kuyuDipYuksekligi.value),
  set: (deger) => {
    if (typeof deger !== 'number' || Number.isNaN(deger) || deger < MIN_DIP_YUKSEKLIK) return;
    kuyuDipYuksekligi.value = deger;
  },
});

const durmaAlaniOptions = [
  { label: '50 x 70 x 100 cm', value: '50x70x100' },
  { label: '40 x 50 x 200 cm', value: '40x50x200' },
  { label: '70 x 100 x 50 cm', value: '70x100x50' },
];

type HotspotKey =
  | 'bosluk' | 'stroke' | 'dip' | 'kabinAlt' | 'etekSaci' | 'iv'
  | 'durma' | 'karsiBosluk' | 'karsiStroke';

const aktifHotspot = ref<HotspotKey | null>(null);
const diagramWrapRef = ref<HTMLElement | null>(null);
const diagramWrap2Ref = ref<HTMLElement | null>(null);

function toggleHotspot(key: HotspotKey) {
  aktifHotspot.value = aktifHotspot.value === key ? null : key;
}

function onDocumentMousedown(e: MouseEvent) {
  const target = e.target as Node;
  const icinde =
    (diagramWrapRef.value?.contains(target) ?? false) || (diagramWrap2Ref.value?.contains(target) ?? false);
  if (!icinde) aktifHotspot.value = null;
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown));

const VB_W = 500;
const VB_H = 400;
const SVG_W = 400;
const SVG_H = 320;
const OLCEK_X = SVG_W / VB_W;
const OLCEK_Y = SVG_H / VB_H;

const POPOVER_KONUM: Record<HotspotKey, { left: number; top: number }> = {
  bosluk: { left: 240, top: 225 },
  stroke: { left: 240, top: 268 },
  dip: { left: 390, top: 280 },
  kabinAlt: { left: 110, top: 300 },
  etekSaci: { left: 245, top: 345 },
  iv: { left: 135, top: 255 },
  durma: { left: 240, top: 305 },
  karsiBosluk: { left: 250, top: 242 },
  karsiStroke: { left: 250, top: 295 },
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

// Son hareket mesafesi: Boşluk + Stroke + 0,035×hız² (mm hesaplanıp cm gösterilir).
function sonHareket(b: Num, s: Num) {
  const bd = n(b), sd = n(s);
  if (bd == null || sd == null || props.hiz == null) return null;
  const mm = bd + sd + 0.035 * props.hiz * props.hiz * 1000;
  return (Math.round(mm) / 10).toLocaleString('tr-TR');
}
const sonHareketMesafesiCm = computed(() => sonHareket(bosluk.value, stroke.value));
const karsiSonHareketMesafesiCm = computed(() => sonHareket(karsiBosluk.value, karsiStroke.value));

// ---- Kuyu dibi risk kontrolü ----
// Kabin en alt noktası ölçüsünden son hareket mesafesi çıkarılır; kalan
// yükseklik durma alanının SON ölçüsünden (50x70x100 → 100 cm) küçükse
// kuyu dibi risk analizi gerekir. Etek sacı ucu için yalnızca kalan 0'ın
// altına düşerse (sac son harekette tabana değerse) risk gerekir.
const durmaSonCm = computed(() => {
  const parcalar = durmaAlani.value?.split('x') ?? [];
  const son = Number(parcalar[parcalar.length - 1]);
  return Number.isFinite(son) ? son : null;
});

const dipSonHareketMm = computed(() => {
  const b = n(bosluk.value), s = n(stroke.value);
  if (b == null || s == null || props.hiz == null) return null;
  return b + s + 0.035 * props.hiz * props.hiz * 1000;
});

// Şartı sağlamayan ölçü şemada kırmızı gösterilir, açıklaması altta yazılır.
const kabinAltRiski = computed(() => {
  const kabinAlt = n(kabinEnAltNokta.value);
  if (kabinAlt == null || dipSonHareketMm.value == null || durmaSonCm.value == null) return false;
  return (kabinAlt - dipSonHareketMm.value) / 10 < durmaSonCm.value;
});

const etekRiski = computed(() => {
  const etek = n(etekSaciMesafe.value);
  return etek != null && dipSonHareketMm.value != null && etek - dipSonHareketMm.value < 0;
});

// (iv) ölçüsünden son hareket mesafesi çıkarılınca 0'dan küçük olamaz
const ivRiski = computed(() => {
  const iv = n(ivOlcusu.value);
  return iv != null && dipSonHareketMm.value != null && iv - dipSonHareketMm.value < 0;
});

const dipRiskVar = computed(() => kabinAltRiski.value || etekRiski.value || ivRiski.value);
</script>

<template>
  <SemaModal v-model:open="open" title="Kuyu Dip Alanı" @iptal="emit('iptal')">
    <div class="flex flex-col items-center gap-3 py-1">
      <h4 class="text-xs font-semibold text-ink">Kabin En Alt Konum</h4>
      <div ref="diagramWrapRef" class="sema-wrap" :style="{ width: `${SVG_W}px`, height: `${SVG_H}px` }"
        @click="aktifHotspot = null">
        <svg :viewBox="`0 0 ${VB_W} ${VB_H}`" :width="SVG_W" :height="SVG_H" class="sema-svg">
          <defs>
            <marker id="dip-olcu-ok" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#9db3a7" />
            </marker>
          </defs>

          <!-- Kuyu duvarları -->
          <line x1="60" y1="40" x2="60" y2="355" stroke="currentColor" stroke-width="3" />
          <line x1="60" y1="355" x2="325" y2="355" stroke="currentColor" stroke-width="3" />
          <line x1="300" y1="355" x2="300" y2="190" stroke="currentColor" stroke-width="3" />
          <line x1="300" y1="190" x2="330" y2="190" stroke="currentColor" stroke-width="3" />
          <line x1="300" y1="40" x2="300" y2="58" stroke="currentColor" stroke-width="2.5" />
          <line x1="300" y1="58" x2="322" y2="58" stroke="currentColor" stroke-width="2.5" />
          <text x="395" y="115" text-anchor="middle" font-size="15" fill="currentColor">En Alt Durak</text>

          <!-- Kabin -->
          <line x1="110" y1="60" x2="110" y2="175" stroke="currentColor" stroke-width="3.5" />
          <line x1="110" y1="175" x2="270" y2="175" stroke="currentColor" stroke-width="3.5" />
          <line x1="270" y1="60" x2="270" y2="175" stroke="currentColor" stroke-width="3.5" />
          <text x="190" y="122" text-anchor="middle" font-size="17" fill="currentColor">Kabin</text>

          <!-- Tampon -->
          <rect x="160" y="245" width="35" height="40" fill="none" stroke="currentColor" stroke-width="2.5" />
          <line x1="148" y1="285" x2="207" y2="285" stroke="currentColor" stroke-width="3" />
          <line x1="177" y1="285" x2="177" y2="348" stroke="currentColor" stroke-width="5" />
          <line x1="152" y1="348" x2="202" y2="348" stroke="currentColor" stroke-width="3" />

          <!-- Boşluk -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('bosluk')">
            <rect x="192" y="176" width="100" height="66" fill="transparent" />
            <line x1="205" y1="180" x2="205" y2="243" class="sema-olcu-cizgi" stroke-width="2"
              marker-start="url(#dip-olcu-ok)" marker-end="url(#dip-olcu-ok)" />
            <text x="220" y="203" text-anchor="start" font-size="14" fill="currentColor">Boşluk</text>
            <text x="220" y="220" text-anchor="start" font-size="12" fill="currentColor">{{ mmText(bosluk) }}</text>
          </g>

          <!-- Stroke -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('stroke')">
            <rect x="192" y="244" width="100" height="44" fill="transparent" />
            <line x1="205" y1="247" x2="205" y2="283" class="sema-olcu-cizgi" stroke-width="2"
              marker-start="url(#dip-olcu-ok)" marker-end="url(#dip-olcu-ok)" />
            <text x="220" y="259" text-anchor="start" font-size="14" fill="currentColor">Stroke</text>
            <text x="220" y="276" text-anchor="start" font-size="12" fill="currentColor">{{ mmText(stroke) }}</text>
          </g>

          <!-- Kuyu Dip Yüksekliği -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('dip')">
            <rect x="306" y="186" width="150" height="172" fill="transparent" />
            <line x1="318" y1="195" x2="318" y2="352" class="sema-olcu-cizgi" stroke-width="2"
              marker-start="url(#dip-olcu-ok)" marker-end="url(#dip-olcu-ok)" />
            <text x="390" y="233" text-anchor="middle" font-size="14" fill="currentColor">Kuyu Dip</text>
            <text x="390" y="250" text-anchor="middle" font-size="14" fill="currentColor">Yüksekliği</text>
            <text x="390" y="270" text-anchor="middle" font-size="12" fill="currentColor">{{ mmText(kuyuDipYuksekligi) }}</text>
          </g>

          <!-- Etek sacı: kabin eşiğinin (sağ kenar) altına sarkan sac -->
          <line x1="270" y1="175" x2="270" y2="238" stroke="currentColor" stroke-width="3" />
          <line x1="270" y1="238" x2="263" y2="245" stroke="currentColor" stroke-width="2.5" />

          <!-- Etek Sacı Taban Mesafesi: sac ucundan kuyu tabanına -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('etekSaci')"
            :style="etekRiski ? { color: '#f87171' } : undefined">
            <!-- Boşluk/Stroke tıklama alanlarını örtmemek için alt bölgede -->
            <rect x="212" y="292" width="86" height="62" fill="transparent" />
            <line x1="284" y1="242" x2="284" y2="352"
              :class="['sema-olcu-cizgi', etekRiski ? 'sema-olcu-cizgi--risk' : '']" stroke-width="2"
              marker-start="url(#dip-olcu-ok)" marker-end="url(#dip-olcu-ok)" />
            <text x="243" y="308" text-anchor="middle" font-size="11" fill="currentColor">Etek Sacı</text>
            <text x="243" y="321" text-anchor="middle" font-size="11" fill="currentColor">Taban Mesafesi</text>
            <text x="243" y="337" text-anchor="middle" font-size="11" fill="currentColor">{{ mmText(etekSaciMesafe) }}</text>
          </g>

          <!-- Kabin En Alt Noktası: kabin altından kuyu tabanına (solda) -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('kabinAlt')"
            :style="kabinAltRiski ? { color: '#f87171' } : undefined">
            <rect x="0" y="178" width="106" height="180" fill="transparent" />
            <line x1="85" y1="180" x2="85" y2="352"
              :class="['sema-olcu-cizgi', kabinAltRiski ? 'sema-olcu-cizgi--risk' : '']" stroke-width="2"
              marker-start="url(#dip-olcu-ok)" marker-end="url(#dip-olcu-ok)" />
            <text x="38" y="245" text-anchor="middle" font-size="13" fill="currentColor">Kabin</text>
            <text x="38" y="261" text-anchor="middle" font-size="13" fill="currentColor">En Alt</text>
            <text x="38" y="277" text-anchor="middle" font-size="13" fill="currentColor">Noktası</text>
            <text x="38" y="296" text-anchor="middle" font-size="12" fill="currentColor">{{ mmText(kabinEnAltNokta) }}</text>
          </g>

          <!-- Gergi kasnağı: kuyudaki en yüksek ekipman (kabin altında) -->
          <circle cx="130" cy="300" r="15" fill="none" stroke="currentColor" stroke-width="2.5" />
          <rect x="126" y="315" width="8" height="33" fill="currentColor" />
          <rect x="112" y="348" width="36" height="7" fill="currentColor" opacity="0.5" />

          <!-- (iv): kabin altı ile gergi kasnağı arası dikey mesafe -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('iv')"
            :style="ivRiski ? { color: '#f87171' } : undefined">
            <rect x="106" y="178" width="52" height="106" fill="transparent" />
            <line x1="113" y1="180" x2="113" y2="283"
              :class="['sema-olcu-cizgi', ivRiski ? 'sema-olcu-cizgi--risk' : '']" stroke-width="2"
              marker-start="url(#dip-olcu-ok)" marker-end="url(#dip-olcu-ok)" />
            <text x="121" y="214" text-anchor="start" font-size="11" fill="currentColor">Gergi Kasnağı</text>
            <text x="121" y="227" text-anchor="start" font-size="11" fill="currentColor">Mesafe</text>
            <text x="121" y="242" text-anchor="start" font-size="11" fill="currentColor">{{ mmText(ivOlcusu) }}</text>
          </g>

          <!-- Durma Alanı -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('durma')">
            <rect x="90" y="368" width="300" height="30" fill="transparent" />
            <text x="240" y="388" text-anchor="middle" font-size="15" fill="currentColor">
              Durma Alanı: {{ durmaAlaniLabel }}
            </text>
          </g>
        </svg>

        <div v-if="aktifHotspot === 'bosluk'" class="sema-popover" :style="popoverStyle('bosluk')" @click.stop>
          <input v-model.number="bosluk" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'stroke'" class="sema-popover" :style="popoverStyle('stroke')" @click.stop>
          <input v-model.number="stroke" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'dip'" class="sema-popover" :style="popoverStyle('dip')" @click.stop>
          <input v-model.number="dipYuksekligiInput" type="number" :min="MIN_DIP_YUKSEKLIK"
            class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm (min {{ MIN_DIP_YUKSEKLIK }})</span>
        </div>
        <div v-if="aktifHotspot === 'kabinAlt'" class="sema-popover" :style="popoverStyle('kabinAlt')" @click.stop>
          <input v-model.number="kabinEnAltNokta" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'iv'" class="sema-popover" :style="popoverStyle('iv')" @click.stop>
          <input v-model.number="ivOlcusu" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'etekSaci'" class="sema-popover" :style="popoverStyle('etekSaci')" @click.stop>
          <input v-model.number="etekSaciMesafe" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'durma'" class="sema-popover sema-popover--genis" :style="popoverStyle('durma')" @click.stop>
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Durma Alanı</span>
            <select v-model="durmaAlani"
              class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
              <option :value="null" disabled>Seçiniz</option>
              <option v-for="o in durmaAlaniOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
        </div>
      </div>

      <p class="text-center text-xs text-ink-muted">
        Son Hareket Mesafesi (Boşluk + Stroke + 0,035 × Hız²):
        <strong class="font-semibold text-[#6fcf97]">{{ sonHareketMesafesiCm != null ? `${sonHareketMesafesiCm} cm` : '—' }}</strong>
      </p>
      <div v-if="dipRiskVar" class="space-y-0.5 text-center text-xs font-semibold text-red-400">
        <p v-if="kabinAltRiski">
          Kabin en alt noktası şartı sağlamıyor: son hareket sonrası kalan mesafe durma alanı
          yüksekliğinden küçük.
        </p>
        <p v-if="etekRiski">
          Etek sacı ucu şartı sağlamıyor: son harekette kuyu tabanına ulaşıyor (kalan &lt; 0).
        </p>
        <p v-if="ivRiski">
          Gergi kasnağı mesafesi şartı sağlamıyor: son hareket mesafesi çıkarılınca 0'ın altına düşüyor.
        </p>
        <p>Kuyu dibi risk analizi gerekli!</p>
      </div>

      <div class="mt-1 flex w-full justify-center border-t border-white/5 pt-4">
        <h4 class="text-xs font-semibold text-ink">Kabin En Üst Konum</h4>
      </div>
      <div ref="diagramWrap2Ref" class="sema-wrap" :style="{ width: `${SVG_W}px`, height: `${SVG_H}px` }"
        @click="aktifHotspot = null">
        <svg :viewBox="`0 0 ${VB_W} ${VB_H}`" :width="SVG_W" :height="SVG_H" class="sema-svg">
          <defs>
            <marker id="dip-olcu-ok2" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#9db3a7" />
            </marker>
          </defs>

          <line x1="60" y1="30" x2="60" y2="355" stroke="currentColor" stroke-width="3" />
          <line x1="60" y1="355" x2="440" y2="355" stroke="currentColor" stroke-width="3" />

          <!-- Karşı ağırlık -->
          <line x1="120" y1="40" x2="120" y2="195" stroke="currentColor" stroke-width="3.5" />
          <line x1="120" y1="195" x2="230" y2="195" stroke="currentColor" stroke-width="3.5" />
          <line x1="230" y1="40" x2="230" y2="195" stroke="currentColor" stroke-width="3.5" />
          <text x="330" y="120" text-anchor="middle" font-size="15" fill="currentColor">Karşı Ağırlık</text>

          <!-- Karşı ağırlık tamponu -->
          <rect x="155" y="258" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.5" />
          <line x1="143" y1="298" x2="207" y2="298" stroke="currentColor" stroke-width="3" />
          <line x1="175" y1="298" x2="175" y2="348" stroke="currentColor" stroke-width="5" />
          <line x1="150" y1="348" x2="200" y2="348" stroke="currentColor" stroke-width="3" />

          <!-- Boşluk -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('karsiBosluk')">
            <rect x="192" y="196" width="110" height="60" fill="transparent" />
            <line x1="205" y1="200" x2="205" y2="255" class="sema-olcu-cizgi" stroke-width="2"
              marker-start="url(#dip-olcu-ok2)" marker-end="url(#dip-olcu-ok2)" />
            <text x="220" y="220" text-anchor="start" font-size="14" fill="currentColor">Boşluk</text>
            <text x="220" y="237" text-anchor="start" font-size="12" fill="currentColor">{{ mmText(karsiBosluk) }}</text>
          </g>

          <!-- Stroke -->
          <g class="sema-hotspot" @click.stop="toggleHotspot('karsiStroke')">
            <rect x="192" y="258" width="110" height="42" fill="transparent" />
            <line x1="205" y1="261" x2="205" y2="295" class="sema-olcu-cizgi" stroke-width="2"
              marker-start="url(#dip-olcu-ok2)" marker-end="url(#dip-olcu-ok2)" />
            <text x="220" y="272" text-anchor="start" font-size="14" fill="currentColor">Stroke</text>
            <text x="220" y="290" text-anchor="start" font-size="12" fill="currentColor">{{ mmText(karsiStroke) }}</text>
          </g>
        </svg>

        <div v-if="aktifHotspot === 'karsiBosluk'" class="sema-popover" :style="popoverStyle('karsiBosluk')" @click.stop>
          <input v-model.number="karsiBosluk" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
        <div v-if="aktifHotspot === 'karsiStroke'" class="sema-popover" :style="popoverStyle('karsiStroke')" @click.stop>
          <input v-model.number="karsiStroke" type="number" class="sema-popover__input" placeholder="mm" autofocus />
          <span class="sema-popover__unit">mm</span>
        </div>
      </div>

      <p class="text-center text-xs text-ink-muted">
        Son Hareket Mesafesi (Boşluk + Stroke + 0,035 × Hız²):
        <strong class="font-semibold text-[#6fcf97]">{{ karsiSonHareketMesafesiCm != null ? `${karsiSonHareketMesafesiCm} cm` : '—' }}</strong>
      </p>
    </div>
  </SemaModal>
</template>

<style scoped>
.sema-wrap {
  position: relative;
  max-width: 100%;
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

.sema-olcu-cizgi {
  stroke: #9db3a7;
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
  background: #141e17;
  border: 1px solid rgba(255, 255, 255, 0.15);
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
