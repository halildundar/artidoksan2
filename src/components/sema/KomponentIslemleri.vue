<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { AksamBelgesi } from '@/services/aksamBelgesiService';
import KomponentFormModal from './KomponentFormModal.vue';
import { kilitBelgesiBul, type KilitBelgeSecenek } from './kapiKilitleriTipleri';

// Aksam popup'larında Marka/Tip seçiminin altındaki iki buton: "Yeni
// Komponent" (katalogda yeni belge ekler) ve "Seçiliyi Düzenle" (seçili
// marka+tip belgesini günceller). Form popup'ı açılır; Kaydet/Güncelle ile
// kayıt yapılır, popup kapanır, asansör popup'ına dönülür ve kaydedilen
// komponent seçili olur. Sayfadaki katalog listesi `komponentKaydedildi`
// (sayfanın provide ettiği) ile tazelenir.
const props = defineProps<{
  kod: string;
  belgeler: KilitBelgeSecenek[];
  marka: string | null;
  tip: string | null;
  // Kompakt: başlık satırının sağında yer alan küçük "Yeni" / "Düzenle" düğmeleri
  kompakt?: boolean;
}>();
const emit = defineEmits<{ sec: [secim: { marka: string; tip: string | null }] }>();

const kaydedildi = inject<((b: AksamBelgesi) => void) | null>('komponentKaydedildi', null);

const formAcik = ref(false);
const duzenlenenId = ref<string | null>(null);

const seciliBelge = computed(() =>
  props.marka && props.tip ? kilitBelgesiBul(props.belgeler, props.marka, props.tip) : null
);

function yeni() {
  duzenlenenId.value = null;
  formAcik.value = true;
}

function duzenle() {
  if (!seciliBelge.value) return;
  duzenlenenId.value = seciliBelge.value._id;
  formAcik.value = true;
}

function kaydedilen(belge: AksamBelgesi) {
  kaydedildi?.(belge);
  // Yeni/güncellenen komponent popup'ta seçili gelir (tip: seçili tip korunur
  // — hâlâ varsa — yoksa ilk tip)
  const korunan = props.tip && belge.tipler.includes(props.tip) ? props.tip : null;
  emit('sec', { marka: belge.marka, tip: korunan ?? belge.tipler[0] ?? null });
}
</script>

<template>
  <div class="flex shrink-0 gap-1" :class="kompakt ? '' : 'flex-wrap gap-1.5'">
    <button type="button" @click="yeni"
      class="flex items-center gap-1 bg-surface-900 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]"
      :class="kompakt ? 'px-2' : 'px-2.5'">
      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {{ kompakt ? 'Yeni' : 'Yeni Komponent' }}
    </button>
    <button type="button" :disabled="!seciliBelge" @click="duzenle"
      class="flex items-center gap-1 bg-surface-900 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20] disabled:opacity-40"
      :class="kompakt ? 'px-2' : 'px-2.5'">
      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.17 6.83a2.85 2.85 0 0 0-4-4L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
        <path d="m15 5 4 4" />
      </svg>
      {{ kompakt ? 'Düzenle' : 'Seçiliyi Düzenle' }}
    </button>
    <KomponentFormModal v-model:open="formAcik" :bilesen-tipi-kodu="kod" :belge-id="duzenlenenId"
      @kaydedildi="kaydedilen" />
  </div>
</template>
