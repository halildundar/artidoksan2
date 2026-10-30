<script setup lang="ts">
import { ref, watch } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import FotoEkleCek from '@/components/FotoEkleCek.vue';
import AramaliSelect from '@/components/AramaliSelect.vue';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import {
  kilitBelgesiBul,
  type KilitBelgeSecenek,
  type FrenKabin,
  type FrenKarsiAgirlik,
} from './kapiKilitleriTipleri';

// Fren popup'ı: Kabin Fren (marka/tip/seri + kabin altı-üstü konum) ve Karşı
// Ağırlık Fren (var/yok radio; varsa marka/tip/seri + alt/üst konum).
// kabinAgirligi (P) ve beyanYuku (Q) Ağırlık Hesabı'ndan gelir — kabin
// tarafında P+Q, karşı ağırlık tarafında P+Q/2 bilgi olarak gösterilir.
const props = defineProps<{
  frenBelgeleri: KilitBelgeSecenek[];
  kabinAgirligi?: number | null;
  beyanYuku?: number | null;
}>();

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const kabin = defineModel<FrenKabin>('kabin', {
  default: () => ({ marka: null, tip: null, seriNo: '', konum: 'kabin-ustu', fotolar: [] }),
});
const karsiAgirlik = defineModel<FrenKarsiAgirlik>('karsiAgirlik', {
  default: () => ({ var: false, marka: null, tip: null, seriNo: '', konum: null, fotolar: [] }),
});

const { openFile } = useFileViewer();

function markalar() {
  return [...new Set(props.frenBelgeleri.map((b) => b.marka).filter(Boolean))];
}

function markaTipleri(marka: string | null) {
  if (!marka) return [];
  return [...new Set(props.frenBelgeleri.filter((b) => b.marka === marka).flatMap((b) => b.tipler))];
}

function belgesi(satir: { marka: string | null; tip: string | null }) {
  return kilitBelgesiBul(props.frenBelgeleri, satir.marka, satir.tip);
}

// ---- Fotoğraflar (KapiKilitleriModal ile aynı desen) ----
const fotoUrller = ref<Record<string, string>>({});
const fotoYukleniyor = ref(false);

async function fotoUrlGetir(foto: BelgeSlot) {
  if (fotoUrller.value[foto.dosyaAnahtari]) return;
  try {
    fotoUrller.value[foto.dosyaAnahtari] = await getDosyaUrl(foto.dosyaAnahtari);
  } catch {
    /* URL alınamazsa önizleme boş kalır, dosya adı görünür */
  }
}

watch(
  open,
  (acik) => {
    if (!acik) return;
    for (const foto of [...kabin.value.fotolar, ...karsiAgirlik.value.fotolar]) fotoUrlGetir(foto);
  },
  { immediate: true }
);

async function fotoEkle(liste: BelgeSlot[], dosyalar: File[]) {
  fotoYukleniyor.value = true;
  try {
    for (const dosya of dosyalar) {
      if (!dosya.type.startsWith('image/')) continue;
      const slot = await uploadDosya(dosya);
      liste.push(slot);
      fotoUrlGetir(slot);
    }
  } catch {
    /* yüklenemeyen dosya atlanır */
  } finally {
    fotoYukleniyor.value = false;
  }
}

function fotoSil(liste: BelgeSlot[], i: number) {
  liste.splice(i, 1);
}

async function fotoAc(foto: BelgeSlot) {
  try {
    const [url, downloadUrl] = await Promise.all([
      getDosyaUrl(foto.dosyaAnahtari),
      getDosyaIndirUrl(foto.dosyaAnahtari, foto.dosyaAdi),
    ]);
    const type = fileViewerTypeFromMime(foto.mimeType);
    if (!type) {
      window.open(downloadUrl, '_blank');
      return;
    }
    openFile({ url, downloadUrl, name: foto.dosyaAdi, type });
  } catch {
    /* imzalı URL alınamazsa açılmaz */
  }
}

async function belgeAc(belge: KilitBelgeSecenek | null) {
  const dosya = belge?.dosya;
  if (!dosya) return;
  try {
    const [url, downloadUrl] = await Promise.all([
      getDosyaUrl(dosya.dosyaAnahtari),
      getDosyaIndirUrl(dosya.dosyaAnahtari, dosya.dosyaAdi),
    ]);
    const type = fileViewerTypeFromMime(dosya.mimeType);
    if (!type) {
      window.open(downloadUrl, '_blank');
      return;
    }
    openFile({ url, downloadUrl, name: dosya.dosyaAdi, type });
  } catch {
    /* imzalı URL alınamazsa buton sessizce etkisiz kalır */
  }
}
</script>

<template>
  <SemaModal v-model:open="open" title="Fren" @iptal="emit('iptal')">
    <div class="space-y-3">
      <!-- Kabin Fren -->
      <div class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-xs font-bold text-ink">Kabin Fren</h4>
          <p v-if="props.kabinAgirligi != null" class="shrink-0 text-xs text-ink-muted">
            P + Q = <strong class="font-semibold text-[#6fcf97]">{{ props.kabinAgirligi + (props.beyanYuku ?? 0) }} kg</strong>
          </p>
          <p v-else class="shrink-0 text-xs font-semibold text-red-400">Ağırlık hesabını yapınız</p>
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Marka</span>
            <AramaliSelect :model-value="kabin.marka" placeholder="Seçiniz"
              :options="markalar().map((m) => ({ label: m, value: m }))"
              @update:model-value="kabin.marka = ($event as string | null) || null; kabin.tip = null" />
          </label>
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Tip</span>
            <AramaliSelect :model-value="kabin.tip" placeholder="Tip seçiniz" :disabled="!kabin.marka"
              :options="markaTipleri(kabin.marka).map((t) => ({ label: t, value: t }))"
              @update:model-value="kabin.tip = ($event as string | null) || null" />
          </label>
        </div>

        <button v-if="kabin.tip && belgesi(kabin)?.dosya" type="button" @click="belgeAc(belgesi(kabin))"
          class="flex items-center gap-1 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Belgeyi Görüntüle
        </button>

        <label class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Seri No</span>
          <input v-model="kabin.seriNo" type="text" placeholder="Seri no"
            class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
        </label>

        <!-- Fren konumu -->
        <div class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Fren Konum</span>
          <div class="grid grid-cols-2 gap-1.5">
            <button v-for="o in [['kabin-alti', 'Kabin Altı'], ['kabin-ustu', 'Kabin Üstü']]" :key="o[0]"
              type="button" @click="kabin.konum = o[0] as FrenKabin['konum']"
              class="px-2 py-1.5 text-xs font-semibold ring-1"
              :class="kabin.konum === o[0]
                ? 'bg-[#2b5c3d] text-ink ring-white/10'
                : 'bg-surface-900 text-ink-muted ring-white/10'">
              {{ o[1] }}
            </button>
          </div>
        </div>

        <!-- Montaj fotoğrafları -->
        <div class="space-y-1 border-t border-white/5 pt-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-ink-muted">Fotoğraflar</span>
            <FotoEkleCek :yukleniyor="fotoYukleniyor"
              @dosyalar="fotoEkle(kabin.fotolar, $event)" />
          </div>
          <div v-if="kabin.fotolar.length" class="flex flex-wrap gap-1.5">
            <span v-for="(foto, i) in kabin.fotolar" :key="foto.dosyaAnahtari + i" class="relative">
              <button type="button" @click="fotoAc(foto)"
                class="grid h-16 w-16 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
                <img v-if="fotoUrller[foto.dosyaAnahtari]" :src="fotoUrller[foto.dosyaAnahtari]"
                  :alt="foto.dosyaAdi" class="h-full w-full object-cover" />
                <span v-else class="px-1 text-center text-[9px] text-ink-muted/60">{{ foto.dosyaAdi }}</span>
              </button>
              <button type="button" @click="fotoSil(kabin.fotolar, i)" aria-label="Fotoğrafı kaldır"
                class="absolute -right-1 -top-1 grid h-4 w-4 place-items-center bg-red-900 text-[10px] leading-none text-red-100 ring-1 ring-red-500/40">
                ×
              </button>
            </span>
          </div>
        </div>
      </div>

      <!-- Karşı Ağırlık Fren -->
      <div class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-xs font-bold text-ink">Karşı Ağırlık Fren</h4>
          <p v-if="props.kabinAgirligi != null" class="shrink-0 text-xs text-ink-muted">
            P + Q/2 = <strong class="font-semibold text-[#6fcf97]">{{ props.kabinAgirligi + (props.beyanYuku ?? 0) / 2 }} kg</strong>
          </p>
          <p v-else class="shrink-0 text-xs font-semibold text-red-400">Ağırlık hesabını yapınız</p>
        </div>

        <!-- Var/Yok radio -->
        <div class="flex items-center gap-3">
          <label class="flex cursor-pointer items-center gap-1 text-xs text-ink">
            <input type="radio" :checked="karsiAgirlik.var" @change="karsiAgirlik.var = true"
              name="karsi-agirlik-fren-var" class="accent-[#2b5c3d]" />
            Var
          </label>
          <label class="flex cursor-pointer items-center gap-1 text-xs text-ink">
            <input type="radio" :checked="!karsiAgirlik.var" @change="karsiAgirlik.var = false"
              name="karsi-agirlik-fren-var" class="accent-[#2b5c3d]" />
            Yok
          </label>
        </div>

        <template v-if="karsiAgirlik.var">
          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Marka</span>
              <AramaliSelect :model-value="karsiAgirlik.marka" placeholder="Seçiniz"
                :options="markalar().map((m) => ({ label: m, value: m }))"
                @update:model-value="karsiAgirlik.marka = ($event as string | null) || null; karsiAgirlik.tip = null" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Tip</span>
              <AramaliSelect :model-value="karsiAgirlik.tip" placeholder="Tip seçiniz" :disabled="!karsiAgirlik.marka"
                :options="markaTipleri(karsiAgirlik.marka).map((t) => ({ label: t, value: t }))"
                @update:model-value="karsiAgirlik.tip = ($event as string | null) || null" />
            </label>
          </div>

          <button v-if="karsiAgirlik.tip && belgesi(karsiAgirlik)?.dosya" type="button"
            @click="belgeAc(belgesi(karsiAgirlik))"
            class="flex items-center gap-1 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Belgeyi Görüntüle
          </button>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Seri No</span>
            <input v-model="karsiAgirlik.seriNo" type="text" placeholder="Seri no"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
          </label>

          <div class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Konum</span>
            <div class="grid grid-cols-2 gap-1.5">
              <button v-for="o in [['alt', 'Alt'], ['ust', 'Üst']]" :key="o[0]"
                type="button" @click="karsiAgirlik.konum = o[0] as FrenKarsiAgirlik['konum']"
                class="px-2 py-1.5 text-xs font-semibold ring-1"
                :class="karsiAgirlik.konum === o[0]
                  ? 'bg-[#2b5c3d] text-ink ring-white/10'
                  : 'bg-surface-900 text-ink-muted ring-white/10'">
                {{ o[1] }}
              </button>
            </div>
          </div>

          <!-- Montaj fotoğrafları -->
          <div class="space-y-1 border-t border-white/5 pt-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-ink-muted">Fotoğraflar</span>
              <FotoEkleCek :yukleniyor="fotoYukleniyor"
                @dosyalar="fotoEkle(karsiAgirlik.fotolar, $event)" />
            </div>
            <div v-if="karsiAgirlik.fotolar.length" class="flex flex-wrap gap-1.5">
              <span v-for="(foto, i) in karsiAgirlik.fotolar" :key="foto.dosyaAnahtari + i" class="relative">
                <button type="button" @click="fotoAc(foto)"
                  class="grid h-16 w-16 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
                  <img v-if="fotoUrller[foto.dosyaAnahtari]" :src="fotoUrller[foto.dosyaAnahtari]"
                    :alt="foto.dosyaAdi" class="h-full w-full object-cover" />
                  <span v-else class="px-1 text-center text-[9px] text-ink-muted/60">{{ foto.dosyaAdi }}</span>
                </button>
                <button type="button" @click="fotoSil(karsiAgirlik.fotolar, i)" aria-label="Fotoğrafı kaldır"
                  class="absolute -right-1 -top-1 grid h-4 w-4 place-items-center bg-red-900 text-[10px] leading-none text-red-100 ring-1 ring-red-500/40">
                  ×
                </button>
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </SemaModal>
</template>
