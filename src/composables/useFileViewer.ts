import { ref } from 'vue';

// artidoksan1 ui-kit'teki useFileViewer'ın birebir taşıması.
export type FileViewerType = 'image' | 'video' | 'pdf';

export interface FileViewerFile {
  /** Render için kullanılır (img/video/pdf.js fetch) — inline disposition URL'i olmalı. */
  url: string;
  /** Verilmezse indir butonu `url`'i kullanır; ayrı attachment URL'i varsa buraya verilir. */
  downloadUrl?: string;
  name?: string;
  type?: FileViewerType;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|ogv?|mov|m4v)$/i;
const PDF_EXT = /\.pdf$/i;

function detectType(url: string): FileViewerType {
  const clean = url.split(/[?#]/)[0];
  if (VIDEO_EXT.test(clean)) return 'video';
  if (PDF_EXT.test(clean)) return 'pdf';
  if (IMAGE_EXT.test(clean)) return 'image';
  return 'image';
}

/**
 * Uzantısız/imzalı URL'lerde uzantı tahmini işe yaramaz — sunucudan gelen
 * mimeType kullanılır. Görüntülenemeyen tiplerde (Word/Excel vb.) null döner;
 * çağıran taraf bu durumda düz indirmeye düşmelidir.
 */
export function fileViewerTypeFromMime(mimeType?: string | null): FileViewerType | null {
  if (!mimeType) return null;
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  return null;
}

const isOpen = ref(false);
const file = ref<FileViewerFile | null>(null);

/**
 * Uygulama genelinde tek bir FileViewerHost (bkz. App.vue) tarafından render
 * edilen, WhatsApp tarzı tam ekran dosya görüntüleyici. Herhangi bir component
 * openFile(...) çağırarak resim/video/PDF'i tam ekran açar.
 */
export function useFileViewer() {
  function openFile(input: FileViewerFile | string) {
    const opts = typeof input === 'string' ? { url: input } : input;
    file.value = { ...opts, type: opts.type ?? detectType(opts.url) };
    isOpen.value = true;
  }

  function closeFile() {
    isOpen.value = false;
  }

  return { isOpen, file, openFile, closeFile };
}
