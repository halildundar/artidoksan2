<script setup lang="ts">
import { computed, markRaw, onMounted, ref, shallowRef } from 'vue';
import { getFirma } from '@/services/firmaService';
import { getKys } from '@/services/kysService';
import { eksikKysBilgileri, firmaLogosu, kysBaglami, kysMotoruKur, tarayiciIndir, type KysMotor } from '@/utils/kys/kysMotor';

// Modül E denetimi yazdırma alanı: firmanın KYS dokümanları. Eksik bilgi varsa uyarı gösterilir;
// üretim engellenmez (eksik alanlar belgede [köşeli parantez] olarak basılır).
const props = defineProps<{ firmaId: string }>();

const yukleniyor = ref(true);
const hata = ref('');
const motor = shallowRef<KysMotor | null>(null);
const eksik = ref<string[]>([]);
const mesgul = ref('');

onMounted(async () => {
  try {
    const firma = await getFirma(props.firmaId);
    const [kys, logo, baglam] = await Promise.all([getKys(props.firmaId), firmaLogosu(firma), kysBaglami(firma)]);
    const { motor: m } = kysMotoruKur({ firma, kys, logo, baglam });
    motor.value = markRaw(m);
    eksik.value = eksikKysBilgileri(m, !!logo);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'KYS bilgisi alınamadı';
  } finally {
    yukleniyor.value = false;
  }
});

const dosyaAdi = computed(() => {
  const m = motor.value;
  return m ? m.safeName(`${m.T('kisaKod') || 'Firma'} ${m.T('dokKod') || 'KEK-01'} Kalite El Kitabi`) : 'Kalite El Kitabi';
});

async function elKitabiWord() {
  const m = motor.value;
  if (!m) return;
  mesgul.value = 'word';
  try {
    await m.wordOne(`${dosyaAdi.value}.docx`, m.manualHTML(), 'Kalite El Kitabı', m.kekFoot());
  } finally {
    mesgul.value = '';
  }
}

function elKitabiHtml() {
  const m = motor.value;
  if (m) tarayiciIndir(`${dosyaAdi.value}.html`, m.standaloneHTML());
}

// PDF: yazdırma penceresi açılır (tarayıcıdan "PDF olarak kaydet")
function elKitabiPdf() {
  const m = motor.value;
  if (!m) return;
  const w = window.open('', '_blank');
  if (!w) { hata.value = 'Açılır pencere engellendi'; return; }
  w.document.open();
  w.document.write(m.standaloneHTML());
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

async function tumu() {
  mesgul.value = 'zip';
  try {
    await motor.value?.wordAll();
  } finally {
    mesgul.value = '';
  }
}

const dugme = 'bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20] disabled:opacity-60';
</script>

<template>
  <section class="space-y-2 bg-surface-800 p-2.5 ring-1" :class="eksik.length ? 'ring-amber-500/40' : 'ring-white/5'">
    <p class="text-xs font-semibold text-ink">KYS — Modül E Kalite El Kitabı</p>
    <p v-if="yukleniyor" class="text-[11px] text-ink-muted">Hazırlanıyor…</p>
    <p v-else-if="hata" class="text-[11px] text-red-300">{{ hata }}</p>
    <template v-else-if="motor">
      <div v-if="eksik.length" class="space-y-0.5 bg-amber-500/10 p-2 ring-1 ring-amber-500/30">
        <p class="text-[11px] font-semibold text-amber-200">
          {{ eksik.length }} eksik bilgi var — Firma &gt; KYS &gt; Bilgiler'den tamamlayın
        </p>
        <p class="text-[11px] text-amber-100/80">{{ eksik.join(' · ') }}</p>
        <p class="text-[10px] text-amber-100/60">Yine de yazdırabilirsiniz; eksik alanlar belgede [köşeli parantez] olarak görünür.</p>
      </div>
      <p v-else class="text-[11px] font-semibold text-emerald-400">Tüm KYS bilgileri tam</p>
      <div class="flex flex-wrap gap-1.5">
        <button type="button" :class="dugme" :disabled="mesgul !== ''" @click="elKitabiWord">
          {{ mesgul === 'word' ? 'Hazırlanıyor…' : 'El Kitabı — Word' }}
        </button>
        <button type="button" :class="dugme" @click="elKitabiPdf">El Kitabı — PDF</button>
        <button type="button" :class="dugme" @click="elKitabiHtml">El Kitabı — HTML</button>
        <button type="button" :class="dugme" :disabled="mesgul !== ''" @click="tumu">
          {{ mesgul === 'zip' ? 'Hazırlanıyor…' : 'Tüm KYS dokümanları — Word (ZIP)' }}
        </button>
      </div>
    </template>
  </section>
</template>
