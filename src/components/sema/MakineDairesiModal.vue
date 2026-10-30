<script setup lang="ts">
import { computed } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import FotoAlani from '@/components/FotoAlani.vue';
import type { BelgeSlot } from '@/services/dosyaService';

// Makine Dairesi popup'ı (yalnız makine daireli — MR — asansörlerde): çalışma
// alanı, geçiş alanı ve giriş kapısı yükseklikleri girilir. Sınırlar: çalışma
// alanı min 2100, geçiş alanı min 1800, giriş kapısı min 2000 mm — altına
// düşen alan kırmızı gösterilir ve risk analizi uyarısı çıkar.
type Num = number | '' | null;
const n = (v: Num): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const fotolar = defineModel<BelgeSlot[]>('fotolar', { default: () => [] });
const calismaYuksekligi = defineModel<Num>('calismaYuksekligi', { default: null });
const gecisYuksekligi = defineModel<Num>('gecisYuksekligi', { default: null });
const kapiYuksekligi = defineModel<Num>('kapiYuksekligi', { default: null });

const alanlar = computed(() => [
  {
    etiket: 'Çalışma Alanı Yüksekliği (mm)',
    model: calismaYuksekligi,
    min: 2100,
    risk: n(calismaYuksekligi.value) != null && (n(calismaYuksekligi.value) as number) < 2100,
  },
  {
    etiket: 'Geçiş Alanı Yüksekliği (mm)',
    model: gecisYuksekligi,
    min: 1800,
    risk: n(gecisYuksekligi.value) != null && (n(gecisYuksekligi.value) as number) < 1800,
  },
  {
    etiket: 'Makine Dairesi Giriş Kapısı Yüksekliği (mm)',
    model: kapiYuksekligi,
    min: 2000,
    risk: n(kapiYuksekligi.value) != null && (n(kapiYuksekligi.value) as number) < 2000,
  },
]);

const riskVar = computed(() => alanlar.value.some((a) => a.risk));
</script>

<template>
  <SemaModal v-model:open="open" title="Makine Dairesi" @iptal="emit('iptal')">
    <div class="space-y-2">
      <label v-for="alan in alanlar" :key="alan.etiket" class="block space-y-0.5">
        <span class="text-xs font-medium" :class="alan.risk ? 'text-red-400' : 'text-ink-muted'">
          {{ alan.etiket }}
        </span>
        <input v-model.number="alan.model.value" type="number" min="0" inputmode="numeric"
          placeholder="mm"
          class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink outline-none placeholder:text-ink-muted/40"
          :class="alan.risk ? 'ring-1 ring-red-500/60 focus:ring-red-400' : 'ring-1 ring-white/10 focus:ring-white/30'" />
        <span v-if="alan.risk" class="block text-[11px] font-semibold text-red-400">
          En az {{ alan.min }} mm olmalı.
        </span>
      </label>

      <p v-if="riskVar" class="pt-1 text-center text-xs font-semibold text-red-400">
        Makine dairesi risk analizi gerekli!
      </p>
    </div>
    <FotoAlani v-model:fotolar="fotolar" />
  </SemaModal>
</template>
