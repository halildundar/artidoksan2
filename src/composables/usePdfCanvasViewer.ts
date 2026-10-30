import { nextTick, onBeforeUnmount, ref, shallowRef, type Ref } from 'vue';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
// Vite'ın `?url` import'u worker dosyasını bundle'a asset olarak dahil edip
// çalışma zamanı URL'ini verir — pdf.js PDF ayrıştırmayı bu worker'da yapar.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export type PdfFitMode = 'width' | 'height';

/**
 * artidoksan1 ui-kit'teki usePdfCanvasViewer'ın taşıması. Native iframe/embed
 * yerine pdf.js canvas render'ı kullanılır — presigned URL'lerde tarayıcının
 * yerleşik PDF görüntüleyicisi güvenilir çalışmaz. Zoom/toolbar state'i
 * (scale, fitMode) ve ölçüm container'ları tüketiciye aittir.
 */
export function usePdfCanvasViewer(opts: {
  scale: Ref<number>;
  fitMode: Ref<PdfFitMode>;
  stageEl: Ref<HTMLElement | null>;
  pdfStageEl: Ref<HTMLElement | null>;
}) {
  const { scale, fitMode, stageEl, pdfStageEl } = opts;

  const pdfDoc = shallowRef<PDFDocumentProxy | null>(null);
  const pdfPageCount = ref(0);
  const pdfCanvases = ref<(HTMLCanvasElement | null)[]>([]);
  const pdfLoading = ref(false);
  const pdfError = ref('');
  // Sayfayı stage'e sığdıran taban ölçek — `scale` bunun üzerine çarpandır.
  const pdfBaseScale = ref(1);
  let pdfRenderTasks: (RenderTask | null)[] = [];
  // pdfjs 6.x'te destroy() doküman üzerinde değil, yükleme görevi üzerinde.
  let pdfLoadingTask: PDFDocumentLoadingTask | null = null;
  // Yarışan loadPdf çağrılarında eski çağrının sonucu es geçilir.
  let pdfLoadGeneration = 0;

  function setCanvasRef(pageNumber: number, el: Element | null) {
    pdfCanvases.value[pageNumber - 1] = el as HTMLCanvasElement | null;
  }

  async function computePdfBaseScale() {
    if (!pdfDoc.value) return;
    const page = await pdfDoc.value.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    if (fitMode.value === 'height') {
      const containerHeight = stageEl.value?.clientHeight ?? viewport.height;
      pdfBaseScale.value = Math.max(containerHeight / viewport.height, 0.1);
    } else {
      const containerWidth = pdfStageEl.value?.clientWidth ?? viewport.width;
      pdfBaseScale.value = Math.max(containerWidth / viewport.width, 0.1);
    }
  }

  async function renderPdfPage(pageNumber: number) {
    const doc = pdfDoc.value;
    const canvas = pdfCanvases.value[pageNumber - 1];
    if (!doc || !canvas) return;
    pdfRenderTasks[pageNumber - 1]?.cancel();
    const page = await doc.getPage(pageNumber);
    // Piksel arabelleği devicePixelRatio ile çarpılır (yüksek DPI'da net),
    // CSS boyutu çarpansız viewport'a sabitlenir.
    const dpr = window.devicePixelRatio || 1;
    const renderScale = pdfBaseScale.value * scale.value;
    const viewport = page.getViewport({ scale: renderScale });
    const scaledViewport = page.getViewport({ scale: renderScale * dpr });
    canvas.width = Math.ceil(scaledViewport.width);
    canvas.height = Math.ceil(scaledViewport.height);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const task = page.render({ canvas, viewport: scaledViewport });
    pdfRenderTasks[pageNumber - 1] = task;
    try {
      await task.promise;
    } catch {
      // Hızlı zoom'da önceki render cancel edilince beklenen istisna.
    }
  }

  async function renderAllPdfPages() {
    for (let i = 1; i <= pdfPageCount.value; i++) {
      await renderPdfPage(i);
    }
  }

  async function loadPdf(url: string) {
    const generation = ++pdfLoadGeneration;
    pdfLoading.value = true;
    pdfError.value = '';
    pdfDoc.value = null;
    pdfPageCount.value = 0;
    pdfCanvases.value = [];
    pdfRenderTasks = [];
    try {
      // wasmUrl: taranmış PDF'lerdeki JBIG2/CCITTFax görüntüleri WASM ile
      // çözülür; dosyalar public/pdfjs-wasm/ altından servis edilir
      // (node_modules/pdfjs-dist/wasm kopyası). Verilmezse taranmış sayfalar
      // sessizce bembeyaz render olur.
      const loadingTask = getDocument({ url, wasmUrl: '/pdfjs-wasm/' });
      const doc = await loadingTask.promise;
      if (generation !== pdfLoadGeneration) {
        loadingTask.destroy();
        return;
      }
      pdfLoadingTask = loadingTask;
      pdfDoc.value = doc;
      pdfPageCount.value = doc.numPages;
      pdfLoading.value = false;
      await nextTick(); // canvas'lar DOM'a şimdi bağlandı
      if (generation !== pdfLoadGeneration) return;
      await computePdfBaseScale();
      if (generation !== pdfLoadGeneration) return;
      await renderAllPdfPages();
    } catch {
      if (generation !== pdfLoadGeneration) return;
      pdfError.value = 'PDF yüklenemedi.';
      pdfLoading.value = false;
    }
  }

  function teardownPdf() {
    pdfLoadGeneration++;
    pdfRenderTasks.forEach((t) => t?.cancel());
    pdfRenderTasks = [];
    pdfLoadingTask?.destroy();
    pdfLoadingTask = null;
    pdfDoc.value = null;
    pdfPageCount.value = 0;
    pdfCanvases.value = [];
    pdfLoading.value = false;
    pdfError.value = '';
  }

  onBeforeUnmount(teardownPdf);

  return {
    pdfDoc,
    pdfPageCount,
    pdfCanvases,
    pdfLoading,
    pdfError,
    pdfBaseScale,
    setCanvasRef,
    computePdfBaseScale,
    renderAllPdfPages,
    loadPdf,
    teardownPdf,
  };
}
