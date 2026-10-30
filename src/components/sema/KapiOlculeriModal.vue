<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import FotoEkleCek from '@/components/FotoEkleCek.vue';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import type { KapiOlcum } from './kapiKilitleriTipleri';

// Kapı ve Ölçüleri popup'ı: giriş başına panel sayısı (2/3/4), kapı tipi
// (teleskopik/merkezi) ve teleskopikte yön (sağ/sol) seçilir. Seçime göre
// üstten görünüş (basamaklı panel şeması) ve önden görünüş (dikey panel
// çizgili kapı) SVG olarak çizilir; Genişlik/Yükseklik ölçüleri tıklanınca
// mm popover'ı ile girilir. Kurallar: tek panel sayısında (3) kapı yalnız
// teleskopik olabilir; merkezi yalnız çift panel sayılarında (2/4) seçilir.
const props = defineProps<{
  // Duraklar bölümünden gelen durak numaraları — düşük kapı durak seçimi için
  duraklar?: number[];
}>();

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const girisler = defineModel<KapiOlcum[]>('girisler', { default: () => [] });

type Num = number | '' | null;
const n = (v: Num): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

function teleskopikMi(g: KapiOlcum) {
  return g.yon !== 'merkezi';
}

// Varsayılan kapı ölçüleri: 2/3 panelde 900x2000, 4 panelde 1100x2100.
// Alan boşsa ya da hâlâ bir varsayılan değerdeyse panel seçimine göre
// güncellenir; kullanıcının elle girdiği farklı değerlere dokunulmaz.
const VARSAYILAN_GENISLIKLER = [900, 1100];
const VARSAYILAN_YUKSEKLIKLER = [2000, 2100];

function varsayilanOlculer(panel: number) {
  return panel === 4 ? { genislik: 1100, yukseklik: 2100 } : { genislik: 900, yukseklik: 2000 };
}

function varsayilanUygula(g: KapiOlcum, yalnizBos = false) {
  const d = varsayilanOlculer(g.panel || 2);
  const genislik = n(g.genislik);
  const yukseklik = n(g.yukseklik);
  if (genislik == null || (!yalnizBos && VARSAYILAN_GENISLIKLER.includes(genislik))) {
    g.genislik = d.genislik;
  }
  if (yukseklik == null || (!yalnizBos && VARSAYILAN_YUKSEKLIKLER.includes(yukseklik))) {
    g.yukseklik = d.yukseklik;
  }
}

function panelSec(g: KapiOlcum, panel: number) {
  g.panel = panel;
  // Tek panel sayısında merkezi olamaz → teleskopik (sol) zorlanır
  if (panel % 2 === 1 && g.yon === 'merkezi') g.yon = 'sol';
  varsayilanUygula(g);
}

function tipSec(g: KapiOlcum, tip: 'teleskopik' | 'merkezi') {
  if (tip === 'merkezi') {
    if (g.panel % 2 === 1) return; // tek sayıda merkezi seçilemez
    g.yon = 'merkezi';
  } else if (g.yon === 'merkezi') {
    g.yon = 'sol';
  }
}

// ---- SVG geometrisi (viewBox 0 0 320 190) ----
// Üstten görünüş: X0..X0+W aralığında basamaklı paneller; önden görünüş:
// FX..FX+FW kutusu, panel sayısı kadar dikey bölme.
const X0 = 20, W = 140, BASE = 78, STEP = 11, KALINLIK = 7;
const FX = 200, FW = 84, FY = 20, FH = 92;

function panelRects(g: KapiOlcum) {
  const N = Math.min(Math.max(g.panel || 2, 2), 4);
  const rects: { x: number; y: number; w: number }[] = [];
  if (g.yon === 'merkezi') {
    // Merkezi: panellerin yarısı soldan, yarısı sağdan merkeze kapanır
    const yarim = N / 2;
    const yarimW = W / 2;
    const pw = yarimW / yarim + 4;
    for (let i = 0; i < yarim; i++) {
      const y = BASE - i * STEP;
      const solX = X0 + i * (yarimW / yarim) - (i ? 4 : 0);
      rects.push({ x: solX, y, w: pw });
      rects.push({ x: X0 + W - (solX - X0) - pw, y, w: pw });
    }
  } else {
    const pw = W / N + 4;
    for (let i = 0; i < N; i++) {
      const y = BASE - i * STEP;
      let x = X0 + i * (W / N) - (i ? 4 : 0);
      if (g.yon === 'sag') x = X0 + W - (x - X0) - pw;
      rects.push({ x, y, w: pw });
    }
  }
  return rects;
}

function onPanelCizgileri(g: KapiOlcum) {
  const N = Math.min(Math.max(g.panel || 2, 2), 4);
  const xler: number[] = [];
  for (let k = 1; k < N; k++) xler.push(FX + (k * FW) / N);
  return xler;
}

function genislikLabel(g: KapiOlcum) {
  return n(g.genislik) != null ? `Genişlik: ${n(g.genislik)} mm` : 'Genişlik';
}

function yukseklikLabel(g: KapiOlcum) {
  return n(g.yukseklik) != null ? `${n(g.yukseklik)} mm` : 'Yükseklik';
}

// ---- Ölçü popover'ları (tek seferde bir tanesi açık) ----
const aktifPopover = ref<{ giris: number; alan: 'genislik' | 'yukseklik' } | null>(null);
const wrapRefs = ref<(HTMLElement | null)[]>([]);

function popoverToggle(giris: number, alan: 'genislik' | 'yukseklik') {
  aktifPopover.value =
    aktifPopover.value?.giris === giris && aktifPopover.value?.alan === alan
      ? null
      : { giris, alan };
}

function onDocumentMousedown(e: MouseEvent) {
  const wrap = aktifPopover.value ? wrapRefs.value[aktifPopover.value.giris] : null;
  if (wrap && !wrap.contains(e.target as Node)) aktifPopover.value = null;
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown));

// viewBox 320x190 → render 300x178 ölçeği
const OLCEK = 300 / 320;
const genislikPopoverStyle = {
  left: `${(X0 + W / 2) * OLCEK}px`,
  top: `${(BASE + KALINLIK + 26) * OLCEK}px`,
  transform: 'translateX(-50%)',
};
const yukseklikPopoverStyle = {
  left: `${(FX - 20) * OLCEK}px`,
  top: `${(FY + FH / 2) * OLCEK - 16}px`,
};

// Yükseklik hiçbir zaman 1800 mm altında olamaz (girilemez); 2000 altı ise
// risk analizi gerekir ve düşük kapının bulunduğu duraklar seçilir.
const MIN_OLCU_MM = 100;
const MIN_KAPI_YUKSEKLIK = 1800;
const RISK_KAPI_YUKSEKLIK = 2000;

function olcuGir(g: KapiOlcum, alan: 'genislik' | 'yukseklik', event: Event) {
  const deger = (event.target as HTMLInputElement).valueAsNumber;
  const alt = alan === 'yukseklik' ? MIN_KAPI_YUKSEKLIK : MIN_OLCU_MM;
  if (!Number.isFinite(deger) || deger < alt) return;
  g[alan] = deger;
}

function yukseklikRiski(g: KapiOlcum) {
  const deger = n(g.yukseklik);
  return deger != null && deger < RISK_KAPI_YUKSEKLIK;
}

function riskDurakToggle(g: KapiOlcum, kat: number) {
  const i = g.riskDuraklar.indexOf(kat);
  if (i >= 0) g.riskDuraklar.splice(i, 1);
  else g.riskDuraklar.push(kat);
}

// ---- Cam belgesi (panel malzemesi cam ise) ----
const { openFile } = useFileViewer();
const belgeYukleniyor = ref(false);

async function camBelgeSec(g: KapiOlcum, event: Event) {
  const input = event.target as HTMLInputElement;
  const dosya = input.files?.[0];
  input.value = '';
  if (!dosya) return;
  if (dosya.type !== 'application/pdf' && !dosya.type.startsWith('image/')) return;
  belgeYukleniyor.value = true;
  try {
    g.camBelgesi = await uploadDosya(dosya);
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

// ---- Fotoğraflar (diğer modallarla aynı desen) ----
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
    for (const g of girisler.value) {
      // Açılışta yalnız boş ölçülere panel sayısına göre varsayılan verilir
      varsayilanUygula(g, true);
      for (const foto of g.fotolar) fotoUrlGetir(foto);
    }
  },
  { immediate: true }
);

async function fotoEkle(g: KapiOlcum, dosyalar: File[]) {
  fotoYukleniyor.value = true;
  try {
    for (const dosya of dosyalar) {
      if (!dosya.type.startsWith('image/')) continue;
      const slot = await uploadDosya(dosya);
      g.fotolar.push(slot);
      fotoUrlGetir(slot);
    }
  } catch {
    /* yüklenemeyen dosya atlanır */
  } finally {
    fotoYukleniyor.value = false;
  }
}

function fotoSil(g: KapiOlcum, i: number) {
  g.fotolar.splice(i, 1);
}
</script>

<template>
  <SemaModal v-model:open="open" title="Kapı ve Ölçüleri" @iptal="emit('iptal')">
    <div class="space-y-3">
      <div v-for="(g, gi) in girisler" :key="gi"
        class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
        <h4 v-if="girisler.length > 1" class="text-xs font-bold text-ink">{{ gi + 1 }}. Giriş Kapısı</h4>

        <!-- Panel sayısı -->
        <div class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Panel Sayısı</span>
          <div class="grid grid-cols-3 gap-1.5">
            <button v-for="p in [2, 3, 4]" :key="p" type="button" @click="panelSec(g, p)"
              class="px-2 py-1.5 text-xs font-semibold ring-1"
              :class="g.panel === p
                ? 'bg-[#2b5c3d] text-ink ring-white/10'
                : 'bg-surface-900 text-ink-muted ring-white/10'">
              {{ p }} Panel
            </button>
          </div>
        </div>

        <!-- Kapı tipi: tek panel sayısında teleskopik kilitli gelir -->
        <div class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Kapı Tipi</span>
          <div class="grid grid-cols-2 gap-1.5">
            <button type="button" @click="tipSec(g, 'teleskopik')"
              class="px-2 py-1.5 text-xs font-semibold ring-1"
              :class="teleskopikMi(g)
                ? 'bg-[#2b5c3d] text-ink ring-white/10'
                : 'bg-surface-900 text-ink-muted ring-white/10'">
              Teleskopik
            </button>
            <button type="button" @click="tipSec(g, 'merkezi')" :disabled="g.panel % 2 === 1"
              class="px-2 py-1.5 text-xs font-semibold ring-1 disabled:opacity-30"
              :class="!teleskopikMi(g)
                ? 'bg-[#2b5c3d] text-ink ring-white/10'
                : 'bg-surface-900 text-ink-muted ring-white/10'">
              Merkezi
            </button>
          </div>
        </div>

        <!-- Teleskopikte yön -->
        <div v-if="teleskopikMi(g)" class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Yön</span>
          <div class="grid grid-cols-2 gap-1.5">
            <button v-for="o in ([['sol', 'Sol'], ['sag', 'Sağ']] as const)" :key="o[0]"
              type="button" @click="g.yon = o[0]"
              class="px-2 py-1.5 text-xs font-semibold ring-1"
              :class="g.yon === o[0]
                ? 'bg-[#2b5c3d] text-ink ring-white/10'
                : 'bg-surface-900 text-ink-muted ring-white/10'">
              {{ o[1] }}
            </button>
          </div>
        </div>

        <!-- Şema: üstten görünüş (basamaklı paneller) + önden görünüş -->
        <div class="flex justify-center pt-1">
          <div :ref="(el) => (wrapRefs[gi] = el as HTMLElement | null)" class="sema-wrap"
            style="width: 300px; height: 178px">
            <svg viewBox="0 0 320 190" width="300" height="178" class="sema-svg">
              <defs>
                <marker :id="`kapi-olcu-ok-${gi}`" viewBox="0 0 10 10" refX="10" refY="5"
                  markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
                </marker>
              </defs>

              <!-- Üstten görünüş: basamaklı paneller -->
              <rect v-for="(r, i) in panelRects(g)" :key="i" :x="r.x" :y="r.y" :width="r.w"
                :height="KALINLIK" fill="none" stroke="currentColor" stroke-width="1.6" />

              <!-- Genişlik ölçüsü (altta, tıklanabilir) -->
              <g class="sema-hotspot" @click="popoverToggle(gi, 'genislik')">
                <rect :x="X0 - 8" :y="BASE + KALINLIK + 2" :width="W + 16" height="34" fill="transparent" />
                <line :x1="X0" :y1="BASE + KALINLIK + 2" :x2="X0" :y2="BASE + KALINLIK + 16"
                  stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" />
                <line :x1="X0 + W" :y1="BASE + KALINLIK + 2" :x2="X0 + W" :y2="BASE + KALINLIK + 16"
                  stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" />
                <line :x1="X0" :y1="BASE + KALINLIK + 12" :x2="X0 + W" :y2="BASE + KALINLIK + 12"
                  stroke="currentColor" stroke-width="1.5"
                  :marker-start="`url(#kapi-olcu-ok-${gi})`" :marker-end="`url(#kapi-olcu-ok-${gi})`" />
                <text :x="X0 + W / 2" :y="BASE + KALINLIK + 28" text-anchor="middle" font-size="12"
                  fill="currentColor">{{ genislikLabel(g) }}</text>
              </g>

              <!-- Önden görünüş: panel sayısı kadar dikey bölme -->
              <rect :x="FX" :y="FY" :width="FW" :height="FH" fill="none" stroke="currentColor" stroke-width="2" />
              <line v-for="(cx, i) in onPanelCizgileri(g)" :key="i" :x1="cx" :y1="FY" :x2="cx" :y2="FY + FH"
                stroke="currentColor" stroke-width="1.2" />

              <!-- Yükseklik ölçüsü (sağda, tıklanabilir; 2000 altı kırmızı) -->
              <g class="sema-hotspot" @click="popoverToggle(gi, 'yukseklik')"
                :style="yukseklikRiski(g) ? { color: '#f87171' } : undefined">
                <rect :x="FX + FW" :y="FY - 6" width="36" :height="FH + 12" fill="transparent" />
                <line :x1="FX + FW + 2" :y1="FY" :x2="FX + FW + 14" :y2="FY"
                  stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" />
                <line :x1="FX + FW + 2" :y1="FY + FH" :x2="FX + FW + 14" :y2="FY + FH"
                  stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" />
                <line :x1="FX + FW + 10" :y1="FY" :x2="FX + FW + 10" :y2="FY + FH"
                  stroke="currentColor" stroke-width="1.5"
                  :marker-start="`url(#kapi-olcu-ok-${gi})`" :marker-end="`url(#kapi-olcu-ok-${gi})`" />
                <text :x="FX + FW + 24" :y="FY + FH / 2" text-anchor="middle" font-size="12" fill="currentColor"
                  :transform="`rotate(90 ${FX + FW + 24} ${FY + FH / 2})`">
                  {{ yukseklikLabel(g) }}
                </text>
              </g>
            </svg>

            <div v-if="aktifPopover?.giris === gi && aktifPopover?.alan === 'genislik'"
              class="sema-popover" :style="genislikPopoverStyle" @click.stop>
              <input :value="n(g.genislik)" type="number" class="sema-popover__input" placeholder="mm"
                autofocus @input="olcuGir(g, 'genislik', $event)" @keydown.enter="aktifPopover = null" />
              <span class="sema-popover__unit">mm</span>
            </div>
            <div v-if="aktifPopover?.giris === gi && aktifPopover?.alan === 'yukseklik'"
              class="sema-popover" :style="yukseklikPopoverStyle" @click.stop>
              <input :value="n(g.yukseklik)" type="number" :min="1800" class="sema-popover__input"
                placeholder="mm" autofocus @input="olcuGir(g, 'yukseklik', $event)"
                @keydown.enter="aktifPopover = null" />
              <span class="sema-popover__unit">mm (min 1800)</span>
            </div>
          </div>
        </div>

        <!-- Kapı yüksekliği 2000 altındaysa risk notu + düşük kapının
        bulunduğu durakların seçimi -->
        <template v-if="yukseklikRiski(g)">
          <p class="text-xs font-semibold text-red-400">
            Kapı yüksekliği 2000 mm altında — risk analizi gerekli!
          </p>
          <div class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Düşük kapının bulunduğu duraklar</span>
            <div v-if="props.duraklar?.length" class="flex flex-wrap gap-1.5">
              <button v-for="kat in props.duraklar" :key="kat" type="button"
                @click="riskDurakToggle(g, kat)"
                class="min-w-9 px-2 py-1.5 text-xs font-semibold ring-1"
                :class="g.riskDuraklar.includes(kat)
                  ? 'bg-[#2b5c3d] text-ink ring-white/10'
                  : 'bg-surface-900 text-ink-muted ring-white/10'">
                {{ kat }}
              </button>
            </div>
            <p v-else class="text-xs text-ink-muted">
              Durak seçimi için önce Duraklar bölümünü doldurun.
            </p>
          </div>
        </template>

        <!-- Panel malzemesi -->
        <div class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Panel Malzemesi</span>
          <div class="grid grid-cols-2 gap-1.5">
            <button v-for="o in ([['paslanmaz', 'Paslanmaz Çelik'], ['cam', 'Cam']] as const)" :key="o[0]"
              type="button" @click="g.panelMalzemesi = o[0]"
              class="px-2 py-1.5 text-xs font-semibold ring-1"
              :class="g.panelMalzemesi === o[0]
                ? 'bg-[#2b5c3d] text-ink ring-white/10'
                : 'bg-surface-900 text-ink-muted ring-white/10'">
              {{ o[1] }}
            </button>
          </div>
        </div>

        <!-- Cam seçilirse cam belgesi yükleme/görüntüleme -->
        <div v-if="g.panelMalzemesi === 'cam'" class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Cam Belgesi</span>
          <div class="flex items-center gap-1.5">
            <label
              class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
              <input type="file" accept="application/pdf,image/*" class="hidden"
                @change="camBelgeSec(g, $event)" />
              {{ belgeYukleniyor ? 'Yükleniyor…' : g.camBelgesi ? 'Değiştir' : '+ Belge Yükle' }}
            </label>
            <span class="min-w-0 flex-1 truncate text-xs"
              :class="g.camBelgesi ? 'text-ink' : 'text-ink-muted/60'">
              {{ g.camBelgesi?.dosyaAdi ?? 'Belge yüklenmedi' }}
            </span>
            <button v-if="g.camBelgesi" type="button" @click="dosyaAc(g.camBelgesi)"
              aria-label="Belgeyi görüntüle"
              class="grid h-[26px] w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button v-if="g.camBelgesi" type="button" @click="g.camBelgesi = null"
              aria-label="Belgeyi kaldır"
              class="grid h-[26px] w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
              ✕
            </button>
          </div>
        </div>

        <!-- Montaj fotoğrafları -->
        <div class="space-y-1 border-t border-white/5 pt-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-ink-muted">Fotoğraflar</span>
            <FotoEkleCek :yukleniyor="fotoYukleniyor" @dosyalar="fotoEkle(g, $event)" />
          </div>
          <div v-if="g.fotolar.length" class="flex flex-wrap gap-1.5">
            <span v-for="(foto, i) in g.fotolar" :key="foto.dosyaAnahtari + i" class="relative">
              <button type="button" @click="dosyaAc(foto)"
                class="grid h-16 w-16 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
                <img v-if="fotoUrller[foto.dosyaAnahtari]" :src="fotoUrller[foto.dosyaAnahtari]"
                  :alt="foto.dosyaAdi" class="h-full w-full object-cover" />
                <span v-else class="px-1 text-center text-[9px] text-ink-muted/60">{{ foto.dosyaAdi }}</span>
              </button>
              <button type="button" @click="fotoSil(g, i)" aria-label="Fotoğrafı kaldır"
                class="absolute -right-1 -top-1 grid h-4 w-4 place-items-center bg-red-900 text-[10px] leading-none text-red-100 ring-1 ring-red-500/40">
                ×
              </button>
            </span>
          </div>
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
