<script setup lang="ts">
import { computed } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import FotoAlani from '@/components/FotoAlani.vue';
import type { BelgeSlot } from '@/services/dosyaService';
import type { DurakSatiri } from './kapiKilitleriTipleri';

// Duraklar popup'ı: durak sayısı adedince 0,1,2,3… numaralı satırlar — en üst
// durak listede EN ÜSTTE görünür (bina gibi). Her durağın karşısında bir üst
// durağa olan mesafe girilir (varsayılan 3000 mm); en üst durağın mesafesi
// yoktur. "+ Bodrum" eksi durak ekler, "+ Kat" yukarı ekler; satır sayısı ön
// bilgideki durak sayısını geçemez. Altta seyir mesafesi (mesafelerin
// toplamı) ve kuyu yüksekliği (dip + seyir + son kat) bilgi olarak gösterilir.
const props = defineProps<{
  durakSayisi: number | null;
  kuyuDipYukseklik: number | null;
  sonKatYukseklik: number | null;
}>();

const emit = defineEmits<{ iptal: [] }>();

// Kapı yüksekliği 2000 mm altındaki duraklar kırmızı işaretlenir (alçak durak kapıları risk analizi)
const KAPI_ALT_SINIR = 2000;
const kapiDusuk = (v: number | '' | null | undefined) => typeof v === 'number' && Number.isFinite(v) && v < KAPI_ALT_SINIR;
const open = defineModel<boolean>('open', { default: false });
const fotolar = defineModel<BelgeSlot[]>('fotolar', { default: () => [] });
const satirlar = defineModel<DurakSatiri[]>('satirlar', { default: () => [] });

function sayi(v: number | '' | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// Satırlar artan sırada tutulur; görünüm ters çevrilir (en üst durak üstte).
// reverse kopyası aynı nesneleri taşıdığı için v-model doğrudan çalışır.
const gosterilen = computed(() => [...satirlar.value].reverse());

const enUstKat = computed(() => {
  const katlar = satirlar.value.map((s) => sayi(s.kat)).filter((k): k is number => k !== null);
  return katlar.length ? Math.max(...katlar) : null;
});

const enAltKat = computed(() => {
  const katlar = satirlar.value.map((s) => sayi(s.kat)).filter((k): k is number => k !== null);
  return katlar.length ? Math.min(...katlar) : null;
});

// Seyir mesafesi: en üst durağın mesafesi hariç, durak arası mesafelerin toplamı
const seyirMesafesi = computed(() =>
  satirlar.value.reduce((toplam, s) => {
    const kat = sayi(s.kat);
    if (kat === null || kat === enUstKat.value) return toplam;
    return toplam + (sayi(s.yukseklik) ?? 0);
  }, 0)
);

// Kuyu yüksekliği = kuyu dip yüksekliği + seyir mesafesi + son kat yüksekliği
const kuyuYuksekligi = computed(() =>
  satirlar.value.length > 0 && props.kuyuDipYukseklik != null && props.sonKatYukseklik != null
    ? props.kuyuDipYukseklik + seyirMesafesi.value + props.sonKatYukseklik
    : null
);

// Bodrum/Kat butonları numaralandırmayı KAYDIRIR (satır eklemez): Bodrum tüm
// durakları 1 aşağı alır (en üst durak 0'a inene kadar), Kat tüm durakları 1
// yukarı alır (en alt durak 0'a çıkana kadar) — durak sayısı değişmez.
const bodrumKilitli = computed(() => enUstKat.value === null || enUstKat.value <= 0);
const katKilitli = computed(() => enAltKat.value === null || enAltKat.value >= 0);

function asagiKaydir() {
  if (bodrumKilitli.value) return;
  for (const s of satirlar.value) {
    const kat = sayi(s.kat);
    if (kat !== null) s.kat = kat - 1;
  }
}

function yukariKaydir() {
  if (katKilitli.value) return;
  for (const s of satirlar.value) {
    const kat = sayi(s.kat);
    if (kat !== null) s.kat = kat + 1;
  }
}

</script>

<template>
  <SemaModal v-model:open="open" title="Duraklar" @iptal="emit('iptal')">
    <div class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-xs font-bold text-ink">Duraklar</h4>
          <p class="text-[11px] text-ink-muted">
            Durak Sayısı:
            <strong class="font-semibold text-ink">{{ props.durakSayisi ?? '—' }}</strong>
          </p>
        </div>
        <div class="flex gap-1.5">
          <button type="button" @click="asagiKaydir" :disabled="bodrumKilitli"
            class="flex items-center gap-1 bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted ring-1 ring-white/10 active:bg-[#1a2a20] disabled:opacity-30">
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
            Bodrum
          </button>
          <button type="button" @click="yukariKaydir" :disabled="katKilitli"
            class="flex items-center gap-1 bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted ring-1 ring-white/10 active:bg-[#1a2a20] disabled:opacity-30">
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m18 15-6-6-6 6" />
            </svg>
            Kat
          </button>
        </div>
      </div>

      <div v-if="satirlar.length" class="flex items-center gap-1.5">
        <span class="w-12 text-xs font-medium text-ink-muted">Durak</span>
        <span class="flex-1 text-xs font-medium text-ink-muted">Durak Arası Mesafe (mm)</span>
        <span class="flex-1 text-xs font-medium text-ink-muted">Kapı Yüksekliği (mm)</span>
      </div>

      <div v-for="(satir, i) in gosterilen" :key="i" class="flex items-center gap-1.5">
        <!-- Durak numarası salt okunur — Bodrum/Kat butonlarıyla kaydırılır -->
        <input :value="satir.kat" readonly tabindex="-1"
          class="w-12 bg-surface-900/50 px-2 py-1.5 text-xs text-ink-muted ring-1 ring-white/5 outline-none" />
        <input v-model.number="satir.yukseklik" type="number" min="0" inputmode="numeric"
          placeholder="3000"
          class="min-w-0 flex-1 bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
        <!-- Kapı yüksekliği: 2000 mm altı kırmızı (risk analizi gerekir) -->
        <input v-model.number="satir.kapiYukseklik" type="number" min="0" inputmode="numeric" placeholder="2000"
          class="min-w-0 flex-1 px-2 py-1.5 text-xs outline-none ring-1"
          :class="kapiDusuk(satir.kapiYukseklik)
            ? 'bg-red-950/60 font-semibold text-red-300 ring-red-500/50'
            : 'bg-surface-900 text-ink ring-white/10 placeholder:text-ink-muted/40 focus:ring-white/30'" />
      </div>

      <p v-if="satirlar.some((s) => kapiDusuk(s.kapiYukseklik))"
        class="bg-red-950/60 px-2.5 py-2 text-[11px] font-semibold text-red-300 ring-1 ring-red-500/30">
        Kapı yüksekliği 2000 mm altında olan durak var — "Alçak durak kapıları" risk analizi gerekli (Risk Durumları bölümünden yapılır).
      </p>

      <!-- Hesaplanan değerler -->
      <div v-if="satirlar.length" class="space-y-0.5 border-t border-white/5 pt-2 text-xs">
        <p class="text-ink-muted">
          Seyir Mesafesi:
          <strong class="font-semibold text-[#6fcf97]">{{ seyirMesafesi }} mm</strong>
        </p>
        <p v-if="kuyuYuksekligi != null" class="text-ink-muted">
          Kuyu Yüksekliği:
          <strong class="font-semibold text-[#6fcf97]">{{ kuyuYuksekligi }} mm</strong>
          <span class="text-ink-muted/60"> (dip {{ props.kuyuDipYukseklik }} + seyir {{ seyirMesafesi }} + son kat {{ props.sonKatYukseklik }})</span>
        </p>
        <p v-else class="font-semibold text-red-400">
          Kuyu yüksekliği için kuyu dip ve son kat yüksekliğini giriniz.
        </p>
      </div>
    </div>
    <FotoAlani v-model:fotolar="fotolar" />
  </SemaModal>
</template>
