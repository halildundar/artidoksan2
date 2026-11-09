<script setup lang="ts">
import { computed, ref } from 'vue';
import type { KysMotor } from '@/utils/kys/kysMotor';
import KysOnizleme from './KysOnizleme.vue';

// Şablonlar: doküman listesindeki her prosedür/talimat/form için firma bilgisiyle dolu doküman
const props = defineProps<{ motor: KysMotor; surum: number }>();

const arama = ref('');
const tur = ref('');
const secili = ref('PR-04.01');

const liste = computed(() => {
  void props.surum;
  const q = arama.value.trim().toLocaleLowerCase('tr');
  return (props.motor.S.dokumanlar as { kod: string; ad: string }[]).filter((d) =>
    (!tur.value || (d.kod || '').startsWith(tur.value)) &&
    (!q || `${d.kod} ${d.ad}`.toLocaleLowerCase('tr').includes(q)));
});
const doc = computed(() => {
  void props.surum;
  return props.motor.docOf(secili.value) ?? props.motor.S.dokumanlar[0] ?? null;
});
const html = computed(() => {
  void props.surum;
  return doc.value ? props.motor.tplDocHTML(doc.value.kod) : '';
});
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-1.5">
      <input v-model="arama" type="search" placeholder="Kod veya ad ara"
        class="min-w-0 flex-1 bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
      <button v-for="t in ['', 'PR', 'TL', 'FR']" :key="t" type="button" @click="tur = t"
        class="px-2.5 py-1.5 text-[11px] font-semibold ring-1 ring-white/10"
        :class="tur === t ? 'bg-[#223c2d] text-ink' : 'bg-surface-900 text-ink-muted'">
        {{ t || 'Tümü' }}
      </button>
    </div>
    <div class="max-h-44 space-y-1 overflow-auto">
      <button v-for="d in liste" :key="d.kod" type="button" @click="secili = d.kod"
        class="flex w-full items-center gap-2 p-1.5 text-left ring-1 ring-white/5"
        :class="doc?.kod === d.kod ? 'bg-[#223c2d]' : 'bg-surface-900/60'">
        <span class="w-16 shrink-0 text-[11px] font-semibold text-ink">{{ d.kod }}</span>
        <span class="min-w-0 flex-1 truncate text-[11px] text-ink-muted">{{ d.ad }}</span>
      </button>
      <p v-if="!liste.length" class="p-2 text-xs text-ink-muted/60">Sonuç yok.</p>
    </div>
    <KysOnizleme v-if="doc" :motor="motor" :html="html" :baslik="doc.ad"
      :dosya-adi="`${doc.kod} ${doc.ad}`" :alt-bilgi="motor.tplFoot(doc.kod)" />
  </div>
</template>
