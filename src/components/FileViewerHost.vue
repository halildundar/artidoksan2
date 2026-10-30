<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useFileViewer } from '@/composables/useFileViewer';
import { usePdfCanvasViewer } from '@/composables/usePdfCanvasViewer';

// artidoksan1 ui-kit'teki FileViewerHost'un taşıması — WhatsApp tarzı tam
// ekran dosya görüntüleyici. App.vue'da BİR KEZ mount edilir; herhangi bir
// component useFileViewer().openFile(...) ile açar.
const { isOpen, file, closeFile } = useFileViewer();

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const SCALE_STEP = 0.5;

// Kullanıcının +/-/sığdır ile kontrol ettiği çarpan (1 = taban sığdırma ölçeği).
const scale = ref(1);
const containerEl = ref<HTMLElement | null>(null);
const stageEl = ref<HTMLElement | null>(null);

// PDF için iki sığdırma modu: 'width' = genişliğe sığdır, 'height' = tüm sayfa ekranda.
const pdfFitMode = ref<'width' | 'height'>('width');

const canZoomIn = computed(() => scale.value < MAX_SCALE);
const canZoomOut = computed(() => scale.value > MIN_SCALE);

function zoomIn() {
  scale.value = Math.min(MAX_SCALE, scale.value + SCALE_STEP);
}

function zoomOut() {
  scale.value = Math.max(MIN_SCALE, scale.value - SCALE_STEP);
}

const canFit = computed(() => scale.value !== 1);

function fitToPage() {
  scale.value = 1;
}

const pdfFitToggleLabel = computed(() => (pdfFitMode.value === 'width' ? 'Sayfaya Sığdır' : 'Genişliğe Sığdır'));

async function togglePdfFit() {
  pdfFitMode.value = pdfFitMode.value === 'width' ? 'height' : 'width';
  scale.value = 1;
  await computePdfBaseScale();
  if (pdfDoc.value) await renderAllPdfPages();
}

const zoomPercent = computed(() => {
  const oran = file.value?.type === 'pdf' ? pdfBaseScale.value * scale.value : scale.value;
  return Math.round(oran * 100);
});

const downloadName = computed(() => {
  if (!file.value) return 'dosya';
  if (file.value.name) return file.value.name;
  const clean = file.value.url.split(/[?#]/)[0];
  try {
    return decodeURIComponent(clean.split('/').pop() || 'dosya');
  } catch {
    return clean.split('/').pop() || 'dosya';
  }
});

const pdfStageEl = ref<HTMLElement | null>(null);

const {
  pdfDoc,
  pdfPageCount,
  pdfLoading,
  pdfError,
  pdfBaseScale,
  setCanvasRef,
  computePdfBaseScale,
  renderAllPdfPages,
  loadPdf,
  teardownPdf,
} = usePdfCanvasViewer({ scale, fitMode: pdfFitMode, stageEl, pdfStageEl });

watch(
  () => (isOpen.value && file.value?.type === 'pdf' ? file.value.url : null),
  (url) => {
    teardownPdf();
    if (url) loadPdf(url);
  },
);

watch(scale, () => {
  if (file.value?.type === 'pdf') renderAllPdfPages();
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeFile();
  } else if (e.key === '+' || e.key === '=') {
    e.preventDefault();
    zoomIn();
  } else if (e.key === '-') {
    e.preventDefault();
    zoomOut();
  }
}

watch(isOpen, async (open) => {
  if (open) {
    scale.value = 1;
    pdfFitMode.value = 'width';
    document.body.style.overflow = 'hidden';
    await nextTick();
    containerEl.value?.focus();
  } else {
    document.body.style.overflow = '';
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen && file"
      ref="containerEl"
      class="file-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Dosya görüntüleyici"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="file-viewer__toolbar">
        <span class="file-viewer__name">{{ downloadName }}</span>
        <div class="file-viewer__actions">
          <button type="button" class="file-viewer__btn" aria-label="Uzaklaştır" :disabled="!canZoomOut" @click="zoomOut">
            −
          </button>
          <span class="file-viewer__zoom-label">{{ zoomPercent }}%</span>
          <button type="button" class="file-viewer__btn" aria-label="Yakınlaştır" :disabled="!canZoomIn" @click="zoomIn">
            +
          </button>
          <button
            v-if="file.type === 'pdf'"
            type="button"
            class="file-viewer__btn"
            :aria-label="pdfFitToggleLabel"
            :title="pdfFitToggleLabel"
            @click="togglePdfFit"
          >
            ⛶
          </button>
          <button v-else type="button" class="file-viewer__btn" aria-label="Sayfaya sığdır" :disabled="!canFit" @click="fitToPage">
            ⛶
          </button>
          <a
            class="file-viewer__btn"
            :href="file.downloadUrl ?? file.url"
            :download="downloadName"
            aria-label="İndir"
            target="_blank"
            rel="noopener"
          >
            ⭳
          </a>
          <button type="button" class="file-viewer__btn" aria-label="Kapat" @click="closeFile">✕</button>
        </div>
      </div>

      <div ref="stageEl" class="file-viewer__stage" @click.self="closeFile">
        <img
          v-if="file.type === 'image'"
          :src="file.url"
          :alt="downloadName"
          class="file-viewer__media file-viewer__media--image"
          :style="{ transform: `scale(${scale})` }"
        />
        <video
          v-else-if="file.type === 'video'"
          :src="file.url"
          class="file-viewer__media file-viewer__media--video"
          :style="{ transform: `scale(${scale})` }"
          controls
          autoplay
        />
        <div v-else ref="pdfStageEl" class="file-viewer__pdf-wrap">
          <p v-if="pdfLoading" class="file-viewer__status">Yükleniyor...</p>
          <div v-else-if="pdfError" class="file-viewer__status">
            {{ pdfError }}
            <a :href="file.downloadUrl ?? file.url" target="_blank" rel="noopener" class="file-viewer__status-link">İndirmeyi dene</a>
          </div>
          <div v-else class="file-viewer__pdf">
            <canvas
              v-for="i in pdfPageCount"
              :key="i"
              class="file-viewer__pdf-page"
              :ref="(el) => setCanvasRef(i, el as Element | null)"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* artidoksan1'den taşınan, kendi içinde kapalı overlay stilleri. */
.file-viewer {
  position: fixed;
  inset: 0;
  z-index: 20000000;
  display: flex;
  flex-direction: column;
  background: #000;
  outline: none;
}

.file-viewer__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
  padding: 10px 16px;
  padding-top: calc(10px + env(safe-area-inset-top));
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}

.file-viewer__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  opacity: 0.85;
}

.file-viewer__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}

.file-viewer__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.file-viewer__btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.file-viewer__btn:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 2px;
}

.file-viewer__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.file-viewer__zoom-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 36px;
  padding: 0 4px;
  color: #fff;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
  user-select: none;
}

.file-viewer__stage {
  flex: 1 1 auto;
  overflow: auto;
  padding: 16px;
  /* İçerik taşarsa scroll üstten başlasın, taşmazsa ortalansın. */
  display: flex;
  align-items: center;
  justify-content: center;
  align-items: safe center;
  justify-content: safe center;
}

.file-viewer__media {
  display: block;
  margin: 0 auto;
  transition: transform 0.15s ease;
}

.file-viewer__media--image,
.file-viewer__media--video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.file-viewer__status {
  color: #fff;
  text-align: center;
  margin-top: 40px;
  opacity: 0.8;
}

.file-viewer__status-link {
  color: #fff;
  text-decoration: underline;
  margin-left: 6px;
}

.file-viewer__pdf-wrap {
  width: 100%;
  min-height: 100%;
}

.file-viewer__pdf {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.file-viewer__pdf-page {
  display: block;
  background: #fff;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
</style>
