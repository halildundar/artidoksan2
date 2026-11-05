<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonFooter } from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  createDenetci, getDenetci, updateDenetci, MUHENDIS_ETIKETLERI, type MuhendisTuru,
} from '@/services/denetciService';
import { uploadDosya, getDosyaUrl, getDosyaIndirUrl, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import FotoCekModal from '@/components/FotoCekModal.vue';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import { blurActive } from '@/utils/blurActive';

// Denetçi formu (Ayarlar > Denetçiler): ad soyad, mühendis türü seçimi ve
// tek resimli imza-kaşe (yükle / fotoğraf çek / görüntüle / kaldır).
const route = useRoute();
const router = useRouter();

const duzenlenenId = computed(() => (route.params.id as string | undefined) ?? '');
const baslik = computed(() => (duzenlenenId.value ? 'Denetçiyi Düzenle' : 'Yeni Denetçi'));

const adSoyad = ref('');
const muhendisTuru = ref<MuhendisTuru>('');
const imzaKase = ref<BelgeSlot | null>(null);
const onizleme = ref('');

const yukleniyor = ref(false);
const kaydediliyor = ref(false);
const resimYukleniyor = ref(false);
const hata = ref('');
const fotoAcik = ref(false);
const silOnayAcik = ref(false);

const gecerli = computed(() => adSoyad.value.trim() !== '');

function geri() {
  blurActive();
  router.back();
}

async function onizlemeYukle() {
  onizleme.value = '';
  if (!imzaKase.value) return;
  try {
    onizleme.value = await getDosyaUrl(imzaKase.value.dosyaAnahtari);
  } catch {
    /* önizleme alınamazsa dosya adı gösterilir */
  }
}

onMounted(async () => {
  if (!duzenlenenId.value) return;
  yukleniyor.value = true;
  try {
    const d = await getDenetci(duzenlenenId.value);
    adSoyad.value = d.adSoyad;
    muhendisTuru.value = d.muhendisTuru ?? '';
    imzaKase.value = d.imzaKase ?? null;
    onizlemeYukle();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kayıt yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
});

async function resimYukle(file: File | undefined) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    hata.value = 'Yalnızca resim dosyası yüklenebilir';
    return;
  }
  resimYukleniyor.value = true;
  hata.value = '';
  try {
    imzaKase.value = await uploadDosya(file);
    await onizlemeYukle();
  } catch (e) {
    hata.value = e instanceof Error ? `İmza-kaşe yüklenemedi: ${e.message}` : 'İmza-kaşe yüklenemedi';
  } finally {
    resimYukleniyor.value = false;
  }
}

function resimSec(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  resimYukle(file);
}

// Kamera oturumundan tek resim: son çekilen kare kullanılır
function fotoCekildi(fotolar: File[]) {
  fotoAcik.value = false;
  resimYukle(fotolar[fotolar.length - 1]);
}

function resimKaldir() {
  silOnayAcik.value = false;
  imzaKase.value = null;
  onizleme.value = '';
}

const { openFile } = useFileViewer();

async function goruntule() {
  const slot = imzaKase.value;
  if (!slot) return;
  try {
    const [url, downloadUrl] = await Promise.all([
      getDosyaUrl(slot.dosyaAnahtari),
      getDosyaIndirUrl(slot.dosyaAnahtari, slot.dosyaAdi),
    ]);
    const type = fileViewerTypeFromMime(slot.mimeType);
    if (!type) {
      window.open(downloadUrl, '_blank');
      return;
    }
    openFile({ url, downloadUrl, name: slot.dosyaAdi, type });
  } catch {
    hata.value = 'Belge açılamadı';
  }
}

async function kaydet() {
  if (!gecerli.value || kaydediliyor.value || resimYukleniyor.value) return;
  kaydediliyor.value = true;
  hata.value = '';
  try {
    const veri = { adSoyad: adSoyad.value.trim(), muhendisTuru: muhendisTuru.value, imzaKase: imzaKase.value };
    if (duzenlenenId.value) await updateDenetci(duzenlenenId.value, veri);
    else await createDenetci(veri);
    blurActive();
    router.replace('/ayarlar/denetciler');
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kayıt başarısız';
  } finally {
    kaydediliyor.value = false;
  }
}

const TURLER = Object.entries(MUHENDIS_ETIKETLERI) as ['elektrik' | 'makine', string][];
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-bar">
        <header class="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button type="button" @click="geri"
            class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 class="truncate text-xl font-bold leading-8 tracking-wide text-ink">{{ baslik }}</h1>
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg">
        <p v-if="hata" class="mx-4 mt-4 bg-red-950/60 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
          {{ hata }}
        </p>
        <p v-if="yukleniyor" class="px-4 py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>

        <form v-else id="denetci-form" class="space-y-3 px-4 py-4" @submit.prevent="kaydet">
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Ad Soyad *</span>
            <input v-model="adSoyad" type="text" required placeholder="Ad Soyad"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
          </label>

          <!-- Mühendis türü: iki seçenekli segment -->
          <div class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Mühendis Türü</span>
            <div class="grid grid-cols-2 gap-1.5">
              <button v-for="[kod, etiket] in TURLER" :key="kod" type="button"
                @click="muhendisTuru = muhendisTuru === kod ? '' : kod"
                class="px-2 py-2 text-xs font-semibold ring-1"
                :class="muhendisTuru === kod
                  ? 'bg-[#2b5c3d] text-ink ring-white/10'
                  : 'bg-surface-900 text-ink-muted ring-white/10'">
                {{ etiket }}
              </button>
            </div>
          </div>

          <!-- İmza-kaşe: tek resim — yükle / fotoğraf çek / görüntüle / kaldır -->
          <div class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">İmza Kaşe</span>
            <div class="flex items-center gap-1.5 bg-surface-900/60 p-2 ring-1 ring-white/5">
              <button type="button" :disabled="!imzaKase" @click="goruntule" aria-label="İmza-kaşeyi görüntüle"
                class="grid h-14 w-14 shrink-0 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/5">
                <img v-if="onizleme" :src="onizleme" alt="İmza kaşe" class="h-full w-full object-contain p-0.5" />
                <span v-else class="text-[9px] text-ink-muted/50">{{ imzaKase ? '…' : 'Yok' }}</span>
              </button>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[11px]" :class="imzaKase ? 'text-ink' : 'text-ink-muted/50'">
                  {{ resimYukleniyor ? 'Yükleniyor…' : imzaKase?.dosyaAdi || 'Yüklenmemiş' }}
                </span>
              </span>
              <label aria-label="İmza-kaşe için resim yükle"
                class="grid h-7 w-8 shrink-0 cursor-pointer place-items-center border border-dashed border-white/20 text-ink-muted active:border-white/40 active:text-ink">
                <input type="file" accept="image/*" class="hidden" @change="resimSec" />
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="m17 8-5-5-5 5" />
                  <path d="M12 3v12" />
                </svg>
              </label>
              <button type="button" @click="fotoAcik = true" aria-label="İmza-kaşe için fotoğraf çek"
                class="grid h-7 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </button>
              <button v-if="imzaKase" type="button" @click="silOnayAcik = true" aria-label="İmza-kaşeyi kaldır"
                class="grid h-7 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                ✕
              </button>
            </div>
          </div>
        </form>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border">
      <div class="border-t border-white/5 bg-surface-bar">
        <div class="mx-auto flex max-w-lg gap-1.5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" @click="geri"
            class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Vazgeç
          </button>
          <button type="submit" form="denetci-form" :disabled="kaydediliyor || yukleniyor || resimYukleniyor || !gecerli"
            class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </ion-footer>

    <FotoCekModal v-model:acik="fotoAcik" @tamam="fotoCekildi" />
    <SilmeOnayi :acik="silOnayAcik" aciklama="İmza-kaşe resmi"
      @vazgec="silOnayAcik = false" @onayla="resimKaldir" />
  </ion-page>
</template>
