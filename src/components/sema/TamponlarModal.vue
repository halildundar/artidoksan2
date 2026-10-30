<script setup lang="ts">
import { ref, watch } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import FotoEkleCek from '@/components/FotoEkleCek.vue';
import AramaliSelect from '@/components/AramaliSelect.vue';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import { kilitBelgesiBul, type KilitBelgeSecenek, type TamponBolum } from './kapiKilitleriTipleri';

// Tamponlar popup'ı: Kabin Tamponu ve Karşı Ağırlık Tamponu bölümleri. Her
// bölümde adet girilir; adet kadar Marka/Tip/Seri No satırı oluşur. Altta
// montaj fotoğrafları (birden fazla, görüntülenebilir). kabinAgirligi (P) ve
// beyanYuku (Q) Ağırlık Hesabı'ndan gelir — kabin tarafında P+Q, karşı
// ağırlık tarafında P+Q/2 bilgi olarak gösterilir.
const props = defineProps<{
  tamponBelgeleri: KilitBelgeSecenek[];
  kabinAgirligi?: number | null;
  beyanYuku?: number | null;
}>();

const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const kabin = defineModel<TamponBolum>('kabin', {
  default: () => ({ adet: null, satirlar: [], fotolar: [] }),
});
const karsiAgirlik = defineModel<TamponBolum>('karsiAgirlik', {
  default: () => ({ adet: null, satirlar: [], fotolar: [] }),
});

const { openFile } = useFileViewer();

function markalar() {
  return [...new Set(props.tamponBelgeleri.map((b) => b.marka).filter(Boolean))];
}

function markaTipleri(marka: string | null) {
  if (!marka) return [];
  return [...new Set(props.tamponBelgeleri.filter((b) => b.marka === marka).flatMap((b) => b.tipler))];
}

// Satırın marka+tip seçimine karşılık gelen sertifika (görüntüleme için)
function satirBelgesi(satir: { marka: string | null; tip: string | null }) {
  return kilitBelgesiBul(props.tamponBelgeleri, satir.marka, satir.tip);
}

// Seçilen belgenin dosyasını tam ekran görüntüleyicide açar
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

// Adet değişince satır sayısı ona uydurulur (mevcut girişler korunur)
function satirlariUydur(bolum: TamponBolum) {
  const hedef = typeof bolum.adet === 'number' && bolum.adet > 0 ? Math.min(bolum.adet, 10) : 0;
  while (bolum.satirlar.length < hedef) bolum.satirlar.push({ marka: null, tip: null, seriNo: '' });
  if (bolum.satirlar.length > hedef) bolum.satirlar.splice(hedef);
}

watch(() => kabin.value.adet, () => satirlariUydur(kabin.value));
watch(() => karsiAgirlik.value.adet, () => satirlariUydur(karsiAgirlik.value));

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

const bolumler = [
  { baslik: 'Kabin Tamponu', model: kabin, yarimQ: false },
  { baslik: 'Karşı Ağırlık Tamponu', model: karsiAgirlik, yarimQ: true },
];
</script>

<template>
  <SemaModal v-model:open="open" title="Tamponlar" @iptal="emit('iptal')">
    <div class="space-y-3">
      <div v-for="bolum in bolumler" :key="bolum.baslik"
        class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-xs font-bold text-ink">{{ bolum.baslik }}</h4>
          <!-- Ağırlık hesabından P+Q (kabin) / P+Q/2 (karşı ağırlık) bilgisi -->
          <p v-if="props.kabinAgirligi != null" class="min-w-0 flex-1 text-right text-xs text-ink-muted">
            {{ bolum.yarimQ ? 'P + Q/2' : 'P + Q' }} =
            <strong class="font-semibold text-[#6fcf97]">
              {{ props.kabinAgirligi + (bolum.yarimQ ? (props.beyanYuku ?? 0) / 2 : (props.beyanYuku ?? 0)) }} kg
            </strong>
          </p>
          <p v-else class="min-w-0 flex-1 text-right text-xs font-semibold text-red-400">Ağırlık hesabını yapınız</p>
          <label class="flex shrink-0 items-center gap-1.5">
            <span class="text-xs font-medium text-ink-muted">Adet</span>
            <select v-model.number="bolum.model.value.adet"
              class="w-16 bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
              <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
        </div>

        <!-- Adet kadar Marka / Tip / Seri No satırı + tipe göre belge görüntüleme -->
        <div v-for="(satir, i) in bolum.model.value.satirlar" :key="i"
          class="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-1.5">
          <label class="block space-y-0.5">
            <span v-if="i === 0" class="text-xs font-medium text-ink-muted">Marka</span>
            <AramaliSelect :model-value="satir.marka" placeholder="Seçiniz"
              :options="markalar().map((m) => ({ label: m, value: m }))"
              @update:model-value="satir.marka = ($event as string | null) || null; satir.tip = null" />
          </label>
          <label class="block space-y-0.5">
            <span v-if="i === 0" class="text-xs font-medium text-ink-muted">Tip</span>
            <AramaliSelect :model-value="satir.tip" placeholder="Tip seçiniz" :disabled="!satir.marka"
              :options="markaTipleri(satir.marka).map((t) => ({ label: t, value: t }))"
              @update:model-value="satir.tip = ($event as string | null) || null" />
          </label>
          <label class="block space-y-0.5">
            <span v-if="i === 0" class="text-xs font-medium text-ink-muted">Seri No</span>
            <input v-model="satir.seriNo" type="text" placeholder="Seri no"
              class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
          </label>
          <!-- Tip seçilince o tipe ait sertifika görüntülenebilir -->
          <button type="button" :disabled="!satir.tip || !satirBelgesi(satir)?.dosya"
            @click="belgeAc(satirBelgesi(satir))" aria-label="Belgeyi görüntüle"
            class="grid h-[26px] w-8 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-30">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
        <p v-if="!bolum.model.value.satirlar.length" class="text-xs text-ink-muted">
          Adet girince satırlar burada oluşur.
        </p>

        <!-- Montaj fotoğrafları -->
        <div class="space-y-1 border-t border-white/5 pt-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-ink-muted">Fotoğraflar</span>
            <FotoEkleCek :yukleniyor="fotoYukleniyor"
              @dosyalar="fotoEkle(bolum.model.value.fotolar, $event)" />
          </div>
          <div v-if="bolum.model.value.fotolar.length" class="flex flex-wrap gap-1.5">
            <span v-for="(foto, i) in bolum.model.value.fotolar" :key="foto.dosyaAnahtari + i" class="relative">
              <button type="button" @click="fotoAc(foto)"
                class="grid h-16 w-16 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
                <img v-if="fotoUrller[foto.dosyaAnahtari]" :src="fotoUrller[foto.dosyaAnahtari]"
                  :alt="foto.dosyaAdi" class="h-full w-full object-cover" />
                <span v-else class="px-1 text-center text-[9px] text-ink-muted/60">{{ foto.dosyaAdi }}</span>
              </button>
              <button type="button" @click="fotoSil(bolum.model.value.fotolar, i)" aria-label="Fotoğrafı kaldır"
                class="absolute -right-1 -top-1 grid h-4 w-4 place-items-center bg-red-900 text-[10px] leading-none text-red-100 ring-1 ring-red-500/40">
                ×
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  </SemaModal>
</template>
