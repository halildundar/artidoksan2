<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import FotoAlani from '@/components/FotoAlani.vue';
import {
  getRiskMaddeleri,
  createRiskMaddesi,
  updateRiskMaddesi,
  deleteRiskMaddesi,
  type RiskMaddesi,
  type RiskMaddesiSecim,
} from '@/services/riskMaddesiService';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';

// Risk analizi popup'ı: hazır maddeler katalogdan listelenir, dokunarak
// ÇOKTAN SEÇMELİ seçilir/çıkarılır (seçim asansöre snapshot'la kaydedilir).
// Yeni madde bu popup içinden eklenir (metin + resim) ve kataloğa yazılır;
// katalogdan madde silme SilmeOnayi diyaloğuyla yapılır.
const props = defineProps<{
  baslik: string;
  grup: string;
}>();

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const secilen = defineModel<RiskMaddesiSecim[]>('secilen', { default: () => [] });
// Uygulama resimleri: madde bazlı değil, bu risk analizi için genel liste
const resimler = defineModel<BelgeSlot[]>('resimler', { default: () => [] });

const { openFile } = useFileViewer();

const maddeler = ref<RiskMaddesi[]>([]);
const yukleniyor = ref(false);
const hata = ref('');
const formAcik = ref(false);

watch(
  open,
  (acik) => {
    if (!acik) return;
    formAcik.value = false;
    hata.value = '';
    yukle();
  },
  { immediate: true }
);

async function yukle() {
  yukleniyor.value = true;
  try {
    maddeler.value = await getRiskMaddeleri(props.grup);
    for (const m of maddeler.value) if (m.resim) resimUrlGetir(m.resim);
    for (const s of secilen.value) if (s.resim) resimUrlGetir(s.resim);
  } catch {
    hata.value = 'Risk maddeleri yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

const standartMaddeler = computed(() => maddeler.value.filter((m) => m.standart));
const digerMaddeler = computed(() => maddeler.value.filter((m) => !m.standart));

function seciliMi(madde: RiskMaddesi) {
  return secilen.value.some((s) => s.maddeId === madde._id);
}

function sec(madde: RiskMaddesi) {
  const i = secilen.value.findIndex((s) => s.maddeId === madde._id);
  if (i >= 0) secilen.value.splice(i, 1);
  else secilen.value.push({ maddeId: madde._id, metin: madde.metin, resim: madde.resim ?? null, fotolar: [] });
}

// ---- Resimler (diğer modallardaki foto deseniyle aynı) ----
const resimUrller = ref<Record<string, string>>({});

async function resimUrlGetir(resim: BelgeSlot) {
  if (resimUrller.value[resim.dosyaAnahtari]) return;
  try {
    resimUrller.value[resim.dosyaAnahtari] = await getDosyaUrl(resim.dosyaAnahtari);
  } catch {
    /* URL alınamazsa önizleme boş kalır */
  }
}

async function resimAc(resim: BelgeSlot | null | undefined) {
  if (!resim) return;
  try {
    const [url, downloadUrl] = await Promise.all([
      getDosyaUrl(resim.dosyaAnahtari),
      getDosyaIndirUrl(resim.dosyaAnahtari, resim.dosyaAdi),
    ]);
    const type = fileViewerTypeFromMime(resim.mimeType);
    if (!type) {
      window.open(downloadUrl, '_blank');
      return;
    }
    openFile({ url, downloadUrl, name: resim.dosyaAdi, type });
  } catch {
    /* imzalı URL alınamazsa açılmaz */
  }
}

// ---- Madde formu (yeni ekleme / düzenleme) ----
const yeniMetin = ref('');
const yeniResim = ref<BelgeSlot | null>(null);
const yeniStandart = ref(false);
const duzenlenenId = ref<string | null>(null);
const resimYukleniyor = ref(false);
const kaydediliyor = ref(false);

function formAc(standart = false) {
  duzenlenenId.value = null;
  yeniStandart.value = standart;
  yeniMetin.value = '';
  yeniResim.value = null;
  hata.value = '';
  formAcik.value = true;
}

// Katalogdaki maddeyi forma doldurarak düzenleme modunda açar
function duzenle(madde: RiskMaddesi) {
  duzenlenenId.value = madde._id;
  yeniStandart.value = !!madde.standart;
  yeniMetin.value = madde.metin;
  yeniResim.value = madde.resim ?? null;
  if (yeniResim.value) resimUrlGetir(yeniResim.value);
  hata.value = '';
  formAcik.value = true;
}

async function resimSec(event: Event) {
  const input = event.target as HTMLInputElement;
  const dosya = input.files?.[0];
  input.value = '';
  if (!dosya || !dosya.type.startsWith('image/')) return;
  resimYukleniyor.value = true;
  try {
    yeniResim.value = await uploadDosya(dosya);
    resimUrlGetir(yeniResim.value);
  } catch {
    /* yüklenemezse mevcut resim korunur */
  } finally {
    resimYukleniyor.value = false;
  }
}

async function maddeKaydet() {
  if (!yeniMetin.value.trim()) {
    hata.value = 'Madde metni giriniz';
    return;
  }
  kaydediliyor.value = true;
  hata.value = '';
  try {
    if (duzenlenenId.value) {
      // Düzenleme: katalog güncellenir; madde seçiliyse seçimdeki snapshot da yenilenir
      const madde = await updateRiskMaddesi(duzenlenenId.value, {
        metin: yeniMetin.value.trim(),
        resim: yeniResim.value,
        standart: yeniStandart.value,
      });
      const i = maddeler.value.findIndex((m) => m._id === madde._id);
      if (i >= 0) maddeler.value[i] = madde;
      const si = secilen.value.findIndex((s) => s.maddeId === madde._id);
      if (si >= 0) {
        secilen.value[si] = { ...secilen.value[si], metin: madde.metin, resim: madde.resim ?? null };
      }
    } else {
      const madde = await createRiskMaddesi({
        grup: props.grup,
        metin: yeniMetin.value.trim(),
        resim: yeniResim.value,
        standart: yeniStandart.value,
      });
      maddeler.value.push(madde);
      if (madde.resim) resimUrlGetir(madde.resim);
    }
    formAcik.value = false;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Madde kaydedilemedi';
  } finally {
    kaydediliyor.value = false;
  }
}

// ---- Katalogdan madde silme (SilmeOnayi ile) ----
const silinecek = ref<RiskMaddesi | null>(null);
const siliniyor = ref(false);

async function silOnayla() {
  const madde = silinecek.value;
  if (!madde) return;
  siliniyor.value = true;
  try {
    await deleteRiskMaddesi(madde._id);
    maddeler.value = maddeler.value.filter((m) => m._id !== madde._id);
    const i = secilen.value.findIndex((s) => s.maddeId === madde._id);
    if (i >= 0) secilen.value.splice(i, 1);
    silinecek.value = null;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Madde silinemedi';
    silinecek.value = null;
  } finally {
    siliniyor.value = false;
  }
}
</script>

<template>
  <SemaModal v-model:open="open" :title="baslik" @iptal="emit('iptal')">
    <div class="space-y-2">
      <p v-if="hata" class="text-xs text-red-300" role="alert">{{ hata }}</p>

      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-ink-muted">
          Maddeler
          <span v-if="secilen.length" class="text-[#6fcf97]">({{ secilen.length }} seçili)</span>
        </span>
        <div class="flex shrink-0 gap-1.5">
          <button type="button" @click="formAc(true)"
            class="bg-[#1d3557] px-2.5 py-1.5 text-[11px] font-semibold text-[#9cc4ff] ring-1 ring-[#2f5d9b] active:bg-[#25457a]">
            + Standart Madde
          </button>
          <button type="button" @click="formAc(false)"
            class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
            + Çözüm Ekle
          </button>
        </div>
      </div>

      <!-- Madde formu: tam sayfa (geri / vazgeç / kaydet) -->
      <Teleport to="body">
        <div v-if="open && formAcik" class="fixed inset-0 z-[60] flex flex-col bg-[#101a14]">
          <div
            class="flex shrink-0 items-center gap-2 border-b border-white/5 bg-surface-bar px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button type="button" @click="formAcik = false" aria-label="Geri"
              class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
              ←
            </button>
            <h2 class="truncate text-sm font-bold text-ink">
              {{ duzenlenenId ? 'Maddeyi Düzenle' : yeniStandart ? 'Yeni Standart Madde' : 'Yeni Çözüm' }}
            </h2>
          </div>
          <div class="min-h-0 flex-1 overflow-auto">
            <div class="mx-auto max-w-lg space-y-3 p-4">
              <p v-if="hata" class="text-xs text-red-300" role="alert">{{ hata }}</p>
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Madde Metni</span>
            <textarea v-model="yeniMetin" rows="10" placeholder="Madde metni..."
              class="w-full resize-none bg-surface-900 px-3 py-2 text-sm text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30"></textarea>
          </label>
          <label class="flex items-center gap-1.5 text-xs font-medium text-[#9cc4ff]">
            <input type="checkbox" v-model="yeniStandart" /> Standart madde (aksi halde uygulanan çözüm)
          </label>
          <div class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Resim</span>
            <div class="flex items-center gap-1.5">
              <label
                class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                <input type="file" accept="image/*" class="hidden" @change="resimSec($event)" />
                {{ resimYukleniyor ? 'Yükleniyor…' : yeniResim ? 'Değiştir' : '+ Resim Ekle' }}
              </label>
              <button v-if="yeniResim" type="button" @click="resimAc(yeniResim)"
                class="grid h-10 w-10 shrink-0 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
                <img v-if="resimUrller[yeniResim.dosyaAnahtari]" :src="resimUrller[yeniResim.dosyaAnahtari]"
                  :alt="yeniResim.dosyaAdi" class="h-full w-full object-cover" />
                <span v-else class="px-0.5 text-center text-[8px] text-ink-muted/60">{{ yeniResim.dosyaAdi }}</span>
              </button>
              <button v-if="yeniResim" type="button" @click="yeniResim = null" aria-label="Resmi kaldır"
                class="grid h-6 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                ✕
              </button>
            </div>
          </div>
            </div>
          </div>
          <div
            class="shrink-0 border-t border-white/5 bg-surface-bar p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div class="mx-auto flex max-w-lg gap-1.5">
              <button type="button" @click="formAcik = false"
                class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
                Vazgeç
              </button>
              <button type="button" @click="maddeKaydet" :disabled="kaydediliyor"
                class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-50">
                {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Madde listesi — dokununca seçilir/çıkarılır (çoktan seçmeli) -->
      <p v-if="yukleniyor" class="text-xs text-ink-muted">Yükleniyor…</p>
      <p v-else-if="!maddeler.length && !formAcik" class="text-xs text-ink-muted">
        Henüz madde yok — "+ Standart Madde" veya "+ Çözüm Ekle" ile ekleyin.
      </p>
      <template v-else>
      <div v-for="grup in [{ t: standartMaddeler, mavi: true }, { t: digerMaddeler, mavi: false }]" :key="String(grup.mavi)"
        v-show="grup.t.length" class="space-y-1.5">
        <p v-if="grup.mavi" class="pt-1 text-[11px] font-semibold text-[#9cc4ff]">Standart Maddeleri</p>
        <p v-else-if="standartMaddeler.length" class="pt-1 text-[11px] font-semibold text-ink-muted">Uygulanan Çözümler</p>
        <div v-for="madde in grup.t" :key="madde._id" role="button" tabindex="0"
          @click="sec(madde)" @keydown.enter="sec(madde)"
          class="flex w-full cursor-pointer items-center gap-2 p-2.5 text-left ring-1"
          :class="seciliMi(madde)
            ? (grup.mavi ? 'bg-[#1d3557] ring-[#2f5d9b]' : 'bg-[#1d3a28] ring-[#2b5c3d]')
            : (grup.mavi ? 'bg-[#16263d]/70 ring-[#2f5d9b]/40 active:bg-[#1d3557]' : 'bg-surface-900/60 ring-white/5 active:bg-[#1a2a20]')">
          <!-- Seçim işareti -->
          <span class="grid h-4 w-4 shrink-0 place-items-center text-[11px] leading-none ring-1"
            :class="seciliMi(madde) ? (grup.mavi ? 'bg-[#2f5d9b] text-ink ring-white/10' : 'bg-[#2b5c3d] text-ink ring-white/10') : 'bg-surface-900 ring-white/15'">
            {{ seciliMi(madde) ? '✓' : '' }}
          </span>
          <!-- Resim önizleme (dokununca tam ekran, seçimi tetiklemez) -->
          <button v-if="madde.resim" type="button" @click.stop="resimAc(madde.resim)"
            class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
            <img v-if="resimUrller[madde.resim.dosyaAnahtari]" :src="resimUrller[madde.resim.dosyaAnahtari]"
              :alt="madde.resim.dosyaAdi" class="h-full w-full object-cover" />
            <span v-else class="px-0.5 text-center text-[8px] text-ink-muted/60">{{ madde.resim.dosyaAdi }}</span>
          </button>
          <p class="min-w-0 flex-1 text-xs leading-relaxed"
            :class="seciliMi(madde) ? 'text-ink' : 'text-ink-muted'">
            {{ madde.metin }}
          </p>
          <!-- Düzenle (seçimi tetiklemeden formu açar) -->
          <span @click.stop="duzenle(madde)" role="button" aria-label="Maddeyi düzenle"
            class="grid h-6 w-7 shrink-0 cursor-pointer place-items-center bg-surface-900 text-ink-muted ring-1 ring-white/10 active:bg-[#1a2a20]">
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </span>
          <!-- Katalogdan sil -->
          <span @click.stop="silinecek = madde" role="button" aria-label="Maddeyi sil"
            class="grid h-6 w-7 shrink-0 cursor-pointer place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
            ✕
          </span>
        </div>
      </div>
      </template>
    </div>

    <!-- Uygulama resimleri: dosya seç / kamerayla çek (risk analiz formunda basılır) -->
    <div class="mt-4">
      <FotoAlani v-model:fotolar="resimler" baslik="Uygulama Resimleri" />
    </div>

    <!-- Silme onayı (kullanıcı kuralı: window.confirm yerine) -->
    <SilmeOnayi :acik="!!silinecek" :aciklama="silinecek?.metin ?? ''" :siliniyor="siliniyor"
      @vazgec="silinecek = null" @onayla="silOnayla" />
  </SemaModal>
</template>
