<script setup lang="ts">
import { computed } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import FotoAlani from '@/components/FotoAlani.vue';
import type { BelgeSlot } from '@/services/dosyaService';

type Num = number | '' | null;

interface AgirlikBloguSatiri {
  adet: Num;
  birimAgirlik: Num;
}

// beyanYuku sadece okunur — kabin ağırlığı hesabında kullanılır, bu popup
// içinden değiştirilmez (ön bilgi formundaki alanla aynı kaynak).
const props = defineProps<{ beyanYuku?: number | null }>();

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const fotolar = defineModel<BelgeSlot[]>('fotolar', { default: () => [] });
const karkasAgirligi = defineModel<Num>('karkasAgirligi', { default: null });
const bloklar = defineModel<AgirlikBloguSatiri[]>('bloklar', { default: () => [] });

function n(v: Num): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function blokEkle() {
  bloklar.value = [...bloklar.value, { adet: 1, birimAgirlik: 0 }];
}

function blokSil(i: number) {
  bloklar.value = bloklar.value.filter((_, idx) => idx !== i);
}

// Toplam karşı ağırlık = karkas (palanga dahil) + Σ(adet × birim ağırlık);
// kabin ağırlığı (P) standart %50 dengeleme formülünün tersinden hesaplanır:
// karşı ağırlık = P + Q/2  →  P = karşı ağırlık − Q/2.
const toplamBlok = computed(() =>
  bloklar.value.reduce((top, b) => top + n(b.adet) * n(b.birimAgirlik), 0)
);
const karsiAgirlik = computed(() => n(karkasAgirligi.value) + toplamBlok.value);
const kabinAgirligi = computed(() => karsiAgirlik.value - (props.beyanYuku ?? 0) / 2);
const pArtiQ = computed(() => kabinAgirligi.value + (props.beyanYuku ?? 0));
</script>

<template>
  <SemaModal v-model:open="open" title="Ağırlık Hesabı" @iptal="emit('iptal')">
    <div class="space-y-3">
      <label class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Karşı Ağırlık Karkas Ağırlığı (kg, palanga dahil)</span>
        <input v-model.number="karkasAgirligi" type="number"
          class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
      </label>

      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-ink">Ağırlık Blokları</h3>
          <button type="button" @click="blokEkle"
            class="bg-surface-800 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
            + Blok Ekle
          </button>
        </div>

        <p v-if="!bloklar.length" class="text-xs text-ink-muted">Henüz blok eklenmedi.</p>

        <div v-else class="flex items-center gap-1.5 text-[10px] text-ink-muted">
          <span class="w-5 shrink-0">#</span>
          <span class="flex-1">Adet</span>
          <span class="w-3 shrink-0"></span>
          <span class="flex-1">Birim Ağırlık (kg)</span>
          <span class="w-7 shrink-0"></span>
        </div>
        <div v-for="(blok, i) in bloklar" :key="i" class="flex items-center gap-1.5">
          <span class="w-5 shrink-0 text-xs text-ink-muted">{{ i + 1 }}</span>
          <input v-model.number="blok.adet" type="number"
            class="w-full min-w-0 flex-1 bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
          <span class="w-3 shrink-0 text-center text-xs text-ink-muted">×</span>
          <input v-model.number="blok.birimAgirlik" type="number"
            class="w-full min-w-0 flex-1 bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
          <button type="button" @click="blokSil(i)" aria-label="Bloğu kaldır"
            class="grid h-7 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20 active:bg-red-950/40">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Sonuçlar — beyan yükü (Q) bilgi amaçlı, buradan değiştirilmez -->
      <div class="ring-1 ring-white/10">
        <div class="flex items-center justify-between border-b border-white/5 px-3 py-2">
          <span class="text-xs text-ink-muted">Toplam Karşı Ağırlık</span>
          <span class="text-xs font-semibold text-ink">{{ karsiAgirlik }} kg</span>
        </div>
        <div class="flex items-center justify-between border-b border-white/5 px-3 py-2">
          <span class="text-xs text-ink-muted">Beyan Yükü (Q)</span>
          <span class="text-xs font-semibold text-ink">{{ beyanYuku ?? 0 }} kg</span>
        </div>
        <div class="flex items-center justify-between border-b border-white/5 px-3 py-2">
          <span class="text-xs text-ink-muted">Kabin Ağırlığı (P)</span>
          <span class="text-xs font-semibold text-ink">{{ kabinAgirligi }} kg</span>
        </div>
        <div class="flex items-center justify-between px-3 py-2">
          <span class="text-xs text-ink-muted">P + Q</span>
          <span class="text-xs font-semibold text-[#6fcf97]">{{ pArtiQ }} kg</span>
        </div>
      </div>
    </div>
    <FotoAlani v-model:fotolar="fotolar" />
  </SemaModal>
</template>
