<script setup lang="ts">
import { ref } from 'vue';
import { useFileViewer } from '@/composables/useFileViewer';

// İndirme linki popup'ı — açılır açılmaz parent link üretmeye başlar: url
// boşken `beklemeMetni` gösterilir, dolunca link + Görüntüle (goruntuleTip
// verildiyse, dosya uygulama içi görüntüleyicide açılır) + Kopyala/Paylaş/
// İndir butonları çıkar. Hata parent'ta yakalanıp `hata` ile geçilir.
const props = defineProps<{
  url: string;
  hata: string;
  beklemeMetni: string;
  aciklama?: string;
  // Görüntülenebilir dosyalarda (PDF rapor gibi) Görüntüle butonu açar;
  // ZIP gibi görüntülenemeyenlerde verilmez, buton çıkmaz
  goruntuleTip?: 'pdf' | 'image';
  goruntuleAd?: string;
}>();
const acik = defineModel<boolean>('acik', { default: false });

const { openFile } = useFileViewer();

function goruntule() {
  if (!props.goruntuleTip || !props.url) return;
  openFile({
    url: props.url,
    downloadUrl: props.url,
    name: props.goruntuleAd || 'Dosya',
    type: props.goruntuleTip,
  });
}

const kopyalandi = ref(false);
const kopyaHatasi = ref('');
const paylasilabilir = typeof navigator !== 'undefined' && 'share' in navigator;

async function kopyala() {
  try {
    await navigator.clipboard.writeText(props.url);
    kopyalandi.value = true;
    setTimeout(() => (kopyalandi.value = false), 2000);
  } catch {
    kopyaHatasi.value = 'Kopyalanamadı — linki basılı tutup elle kopyalayın';
  }
}

function paylas() {
  // Tarayıcı paylaşım menüsünü desteklemiyorsa (masaüstü) link kopyalanır
  if (!paylasilabilir) {
    kopyala();
    return;
  }
  navigator.share({ url: props.url }).catch(() => {
    /* kullanıcı paylaşımı iptal ederse sessiz geç */
  });
}
</script>

<template>
  <Teleport to="body">
    <div v-if="acik" class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      @click.self="acik = false">
      <div class="w-full max-w-sm bg-[#101a14] p-4 ring-1 ring-white/10">
        <h2 class="text-sm font-bold text-ink">İndirme Linki</h2>

        <p v-if="hata" class="mt-2 text-xs leading-relaxed text-red-300">{{ hata }}</p>
        <p v-else-if="!url" class="mt-2 text-xs leading-relaxed text-ink-muted">{{ beklemeMetni }}</p>
        <template v-else>
          <p class="mt-2 text-xs leading-relaxed text-ink-muted">
            {{ aciklama || 'Link hazır.' }} Link 7 gün geçerlidir.
          </p>
          <p class="mt-2 max-h-24 select-all overflow-y-auto break-all bg-surface-900 px-2.5 py-2 text-[11px] text-ink ring-1 ring-white/10">
            {{ url }}
          </p>
          <p v-if="kopyaHatasi" class="mt-1.5 text-[11px] text-red-300">{{ kopyaHatasi }}</p>
          <button v-if="goruntuleTip" type="button" @click="goruntule"
            class="mt-3 flex w-full items-center justify-center gap-1.5 bg-[#2b5c3d] px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Görüntüle
          </button>
          <div class="flex gap-1.5" :class="goruntuleTip ? 'mt-1.5' : 'mt-3'">
            <button type="button" @click="kopyala"
              class="flex-1 bg-[#2b5c3d] px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
              {{ kopyalandi ? 'Kopyalandı ✓' : 'Kopyala' }}
            </button>
            <button type="button" @click="paylas"
              class="flex-1 bg-surface-800 px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
              Paylaş
            </button>
            <a :href="url" target="_blank" rel="noopener"
              class="flex-1 bg-surface-800 px-3 py-2.5 text-center text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
              İndir
            </a>
          </div>
        </template>

        <button type="button" @click="acik = false"
          class="mt-3 w-full bg-surface-800 px-4 py-2.5 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
          Kapat
        </button>
      </div>
    </div>
  </Teleport>
</template>
