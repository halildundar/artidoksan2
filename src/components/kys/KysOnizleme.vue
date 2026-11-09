<script setup lang="ts">
import { ref } from 'vue';
import { tarayiciIndir, type KysMotor } from '@/utils/kys/kysMotor';

// Doküman önizlemesi (yazdırılabilir HTML, iframe içinde) + Word / HTML / Yazdır
const props = defineProps<{
  motor: KysMotor;
  html: string;
  baslik: string;
  dosyaAdi: string;
  altBilgi: string;
}>();

const cerceve = ref<HTMLIFrameElement | null>(null);
const mesgul = ref(false);

async function word() {
  mesgul.value = true;
  try {
    await props.motor.wordOne(`${props.motor.safeName(props.dosyaAdi)}.docx`, props.html, props.baslik, props.altBilgi);
  } finally {
    mesgul.value = false;
  }
}

function htmlIndir() {
  tarayiciIndir(`${props.motor.safeName(props.dosyaAdi)}.html`, props.motor.wrapDoc(props.baslik, props.html));
}

function yazdir() {
  cerceve.value?.contentWindow?.print();
}
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex flex-wrap gap-1.5">
      <button type="button" :disabled="mesgul" @click="word"
        class="bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-50">
        {{ mesgul ? 'Hazırlanıyor…' : 'Word indir' }}
      </button>
      <button type="button" @click="htmlIndir"
        class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
        HTML indir
      </button>
      <button type="button" @click="yazdir"
        class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
        Yazdır / PDF
      </button>
    </div>
    <iframe ref="cerceve" :srcdoc="motor.wrapDoc(baslik, html)" title="Doküman önizleme"
      class="h-[62vh] w-full bg-white ring-1 ring-white/10"></iframe>
  </div>
</template>
