<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

// Fotoğraf çekme oturumu — TAM SAYFA kamera ekranı: cihaz kamerası
// (getUserMedia, arka kamera öncelikli) canlı önizlenir, beyaz deklanşörle
// kare çekilir. Çekilenler alttaki şeritte küçük görünür ve tek tek
// çıkarılabilir. "Tamam" denince tüm kareler "tamam" olayıyla yayılır;
// "Vazgeç" hepsini atar. Kamera açılamazsa (izin yok / kamera yok) sistem
// kamerasına düşen dosya girişi gösterilir.
const acik = defineModel<boolean>('acik', { default: false });
const emit = defineEmits<{ tamam: [fotolar: File[]] }>();

const video = ref<HTMLVideoElement | null>(null);
const fotolar = ref<{ file: File; url: string }[]>([]);
const kameraHatasi = ref('');
let stream: MediaStream | null = null;

watch(acik, (a) => (a ? kameraAc() : kapat()));
onBeforeUnmount(kapat);

async function kameraAc() {
  kameraHatasi.value = '';
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    // video elemanı v-if ile bu watch'tan sonra DOM'a girer
    await nextTick();
    if (video.value) video.value.srcObject = stream;
  } catch {
    kameraHatasi.value = 'Kamera açılamadı. Kamera iznini verdiğinizden emin olun.';
  }
}

// Popup kapanınca oturum sıfırlanır: kamera kapatılır, önizlemeler bırakılır
function kapat() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  if (video.value) video.value.srcObject = null;
  for (const f of fotolar.value) URL.revokeObjectURL(f.url);
  fotolar.value = [];
  kameraHatasi.value = '';
}

function ekle(file: File) {
  fotolar.value.push({ file, url: URL.createObjectURL(file) });
}

// Deklanşör: canlı görüntüden o anki kare canvas üzerinden JPEG'e alınır
function cek() {
  const v = video.value;
  if (!v || !v.videoWidth) return;
  const canvas = document.createElement('canvas');
  canvas.width = v.videoWidth;
  canvas.height = v.videoHeight;
  canvas.getContext('2d')?.drawImage(v, 0, 0);
  canvas.toBlob(
    (blob) => {
      if (blob) ekle(new File([blob], `cihaz-foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    },
    'image/jpeg',
    0.9
  );
}

// Kamera açılamadığında yedek yol: sistem kamera/dosya seçicisi
function dosyadanEkle(event: Event) {
  const input = event.target as HTMLInputElement;
  const ham = input.files?.[0];
  input.value = '';
  if (!ham) return;
  const uzanti = ham.type.split('/')[1] || 'jpg';
  ekle(new File([ham], `cihaz-foto-${Date.now()}.${uzanti}`, { type: ham.type }));
}

function sil(i: number) {
  URL.revokeObjectURL(fotolar.value[i].url);
  fotolar.value.splice(i, 1);
}

function tamam() {
  emit('tamam', fotolar.value.map((f) => f.file));
  acik.value = false;
}
</script>

<template>
  <Teleport to="body">
    <div v-if="acik" class="fixed inset-0 z-50 flex flex-col bg-black">
      <!-- Üst bar -->
      <div
        class="flex shrink-0 items-center justify-between bg-black/80 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 class="truncate text-sm font-bold text-white">Fotoğraf Çek</h2>
        <button type="button" @click="acik = false" aria-label="Kapat"
          class="grid h-8 w-8 shrink-0 place-items-center bg-white/10 text-white ring-1 ring-white/20">
          ✕
        </button>
      </div>

      <!-- Canlı kamera önizlemesi -->
      <div class="relative min-h-0 flex-1">
        <video v-show="!kameraHatasi" ref="video" autoplay playsinline muted
          class="absolute inset-0 h-full w-full object-cover"></video>

        <div v-if="kameraHatasi" class="absolute inset-0 grid place-items-center p-6">
          <div class="space-y-3 text-center">
            <p class="text-xs text-white/70">{{ kameraHatasi }}</p>
            <label
              class="inline-flex cursor-pointer items-center gap-1.5 border border-dashed border-white/30 px-3 py-2 text-xs font-semibold text-white active:border-white/60">
              <input type="file" accept="image/*" capture="environment" class="hidden"
                @change="dosyadanEkle" />
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              Sistem Kamerasını Aç
            </label>
          </div>
        </div>
      </div>

      <!-- Alt panel: çekilenler şeridi + deklanşör + Vazgeç/Tamam -->
      <div class="shrink-0 bg-black/80 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div v-if="fotolar.length" class="flex gap-1.5 overflow-x-auto px-3 pt-3">
          <div v-for="(f, i) in fotolar" :key="f.url"
            class="relative h-16 w-16 shrink-0 overflow-hidden bg-white/5 ring-1 ring-white/20">
            <img :src="f.url" alt="Çekilen fotoğraf" class="h-full w-full object-cover" />
            <button type="button" @click="sil(i)" aria-label="Fotoğrafı çıkar"
              class="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center bg-black/70 text-[11px] text-red-300 ring-1 ring-white/20">
              ✕
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 items-center px-4 py-3">
          <button type="button" @click="acik = false"
            class="justify-self-start px-3 py-2 text-xs font-semibold text-white/70 active:text-white">
            Vazgeç
          </button>

          <!-- Beyaz deklanşör -->
          <button type="button" @click="cek" :disabled="!!kameraHatasi" aria-label="Fotoğraf çek"
            class="h-16 w-16 justify-self-center rounded-full bg-white ring-4 ring-white/30 active:scale-95 active:bg-white/80 disabled:opacity-30">
          </button>

          <button type="button" @click="tamam" :disabled="!fotolar.length"
            class="justify-self-end bg-[#2b5c3d] px-4 py-2.5 text-xs font-semibold text-white ring-1 ring-white/20 disabled:opacity-40">
            Tamam{{ fotolar.length ? ` (${fotolar.length})` : '' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
