<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getFirma, type Firma } from '@/services/firmaService';
import { getDosyaUrl, getDosyaIndirUrl, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import {
  firmaKimlikSatirlari, firmaResmiBelgeSatirlari, firmaBelgeSatirlari as belgeSatirlariOlustur,
  firmaSmmSatirlari, firmaSmmBelgeSatirlari,
  firmaPersonelSatirlari, MUHENDIS_TUR_ETIKETLERI,
} from '@/utils/firmaBilgi';

// Firma bilgi popup'ı — TAM SAYFA, salt görüntüleme: firmanın tüm bilgileri
// tablo halinde listelenir; dosyalar göz butonuyla, logo/imza-kaşe küçük
// önizlemeyle görüntülenir. Kayıt popup açılınca taze çekilir.
const props = defineProps<{ firmaId: string | null }>();
const acik = defineModel<boolean>('acik', { default: false });

const firma = ref<Firma | null>(null);
const yukleniyor = ref(false);
const hata = ref('');

watch(acik, (v) => {
  if (!v || !props.firmaId) return;
  yukleniyor.value = true;
  hata.value = '';
  firma.value = null;
  resimUrller.value = {};
  getFirma(props.firmaId)
    .then((f) => {
      firma.value = f;
      onizlemeleriYukle(f);
    })
    .catch((e) => (hata.value = e instanceof Error ? e.message : 'Firma yüklenemedi'))
    .finally(() => (yukleniyor.value = false));
});

// Logo ve imza&kaşe küçük önizleme olarak gösterilir
const resimUrller = ref<Record<string, string>>({});

function onizlemeleriYukle(f: Firma) {
  for (const anahtar of ['logo', 'imzaKase'] as const) {
    const slot = f.belgeler?.[anahtar];
    if (slot) {
      getDosyaUrl(slot.dosyaAnahtari)
        .then((url) => (resimUrller.value[anahtar] = url))
        .catch(() => { /* önizleme alınamazsa kutu boş görünür */ });
    }
  }
}

const { openFile } = useFileViewer();

async function dosyaAc(slot: BelgeSlot | null | undefined) {
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
    hata.value = 'Dosya açılamadı';
  }
}

function tarih(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR') : '—';
}

// Tablo satırları utils/firmaBilgi.ts'te — PDF raporuyla ortak kullanılır
const kimlikSatirlari = computed(() => (firma.value ? firmaKimlikSatirlari(firma.value) : []));
const belgeSatirlari = computed(() => (firma.value ? belgeSatirlariOlustur(firma.value) : []));
const resmiBelgeSatirlari = computed(() => (firma.value ? firmaResmiBelgeSatirlari(firma.value) : []));
const smmSatirlari = computed(() => (firma.value ? firmaSmmSatirlari(firma.value) : []));
const smmBelgeSatirlari = computed(() => (firma.value ? firmaSmmBelgeSatirlari(firma.value) : []));
const personelSatirlari = computed(() => (firma.value ? firmaPersonelSatirlari(firma.value) : []));
const muhendisler = computed(() => firma.value?.muhendisler ?? []);
const sgkDokumleri = computed(() => firma.value?.sgkDokumleri ?? []);
</script>

<template>
  <Teleport to="body">
    <div v-if="acik" class="fixed inset-0 z-50 flex flex-col bg-[#101a14]">
      <div
        class="flex shrink-0 items-center justify-between border-b border-white/5 bg-surface-bar px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 class="truncate text-sm font-bold text-ink">{{ firma?.ad || 'Firma Bilgileri' }}</h2>
        <button type="button" @click="acik = false"
          class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink-muted ring-1 ring-white/10">
          ✕
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <div class="mx-auto max-w-lg space-y-2 p-4">
          <p v-if="hata" class="bg-red-950/60 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
            {{ hata }}
          </p>
          <p v-if="yukleniyor" class="py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>

          <template v-else-if="firma">
            <!-- Kimlik bilgileri -->
            <div class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                Firma Bilgileri
              </p>
              <table class="w-full text-left text-[11px]">
                <tbody>
                  <tr v-for="(satir, i) in kimlikSatirlari" :key="i" class="border-t border-white/5">
                    <template v-for="(hucre, j) in satir" :key="j">
                      <th class="w-24 bg-surface-900 px-2 py-1.5 align-top font-medium text-ink-muted">
                        {{ hucre[0] }}
                      </th>
                      <td class="px-2 py-1.5 text-ink" :colspan="satir.length === 1 ? 3 : 1">
                        {{ hucre[1] || '—' }}
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Logo + imza&kaşe önizlemeleri -->
            <div v-if="firma.belgeler?.logo || firma.belgeler?.imzaKase"
              class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                Görseller
              </p>
              <div class="grid grid-cols-2 gap-2 p-2">
                <button v-for="g in (['logo', 'imzaKase'] as const)" :key="g" type="button"
                  v-show="firma.belgeler?.[g]" @click="dosyaAc(firma.belgeler?.[g])"
                  class="bg-surface-900 p-1.5 ring-1 ring-white/10">
                  <span class="block text-[10px] text-ink-muted">{{ g === 'logo' ? 'Logo' : 'İmza & Kaşe' }}</span>
                  <img v-if="resimUrller[g]" :src="resimUrller[g]" :alt="g"
                    class="mt-1 h-16 w-full object-contain" />
                  <span v-else class="mt-1 grid h-16 place-items-center text-[10px] text-ink-muted/60">…</span>
                </button>
              </div>
            </div>

            <!-- Resmî belge no/tarihleri -->
            <div class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                Belge Bilgileri
              </p>
              <table class="w-full text-left text-[11px]">
                <tbody>
                  <tr v-for="(satir, i) in resmiBelgeSatirlari" :key="i" class="border-t border-white/5">
                    <template v-for="(hucre, j) in satir" :key="j">
                      <th class="w-24 bg-surface-900 px-2 py-1.5 align-top font-medium text-ink-muted">
                        {{ hucre[0] }}
                      </th>
                      <td class="px-2 py-1.5 text-ink" :colspan="satir.length === 1 ? 3 : 1">
                        {{ hucre[1] || '—' }}
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Belgeler: dosyası olanlar göz ile görüntülenir -->
            <div class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                Belgeler
              </p>
              <table class="w-full text-left text-[11px]">
                <tbody>
                  <tr v-for="b in belgeSatirlari" :key="b.etiket" class="border-t border-white/5">
                    <th class="w-36 bg-surface-900 px-2 py-1.5 font-medium text-ink-muted">{{ b.etiket }}</th>
                    <td class="px-2 py-1">
                      <div class="flex items-center justify-between gap-2">
                        <span class="min-w-0 truncate" :class="b.slot ? 'text-ink' : 'text-ink-muted/60'">
                          {{ b.slot?.dosyaAdi ?? '—' }}
                        </span>
                        <button v-if="b.slot" type="button" @click="dosyaAc(b.slot)"
                          aria-label="Belgeyi görüntüle"
                          class="grid h-6 w-7 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- CE belgeleri -->
            <div v-if="firma.ceBelgeleri?.length" class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                CE Belgeleri
              </p>
              <table class="w-full text-left text-[11px]">
                <thead>
                  <tr class="bg-surface-900 text-[10px] uppercase tracking-wide text-ink-muted">
                    <th class="px-2 py-1 font-medium">Modül</th>
                    <th class="px-2 py-1 font-medium">Belge No</th>
                    <th class="px-2 py-1 font-medium">Geçerlilik</th>
                    <th class="px-2 py-1 font-medium"><span class="sr-only">Dosya</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(ce, i) in firma.ceBelgeleri" :key="ce._id ?? i" class="border-t border-white/5">
                    <td class="px-2 py-1.5 font-medium text-ink">{{ ce.modul || '—' }}</td>
                    <td class="px-2 py-1.5 text-ink">{{ ce.belgeNo || '—' }}</td>
                    <td class="px-2 py-1.5 text-ink-muted">
                      {{ tarih(ce.gecerlilikTarihi) }} – {{ tarih(ce.bitisTarihi) }}
                    </td>
                    <td class="px-2 py-1 text-right">
                      <button v-if="ce.dosya" type="button" @click="dosyaAc(ce.dosya)"
                        aria-label="Belgeyi görüntüle"
                        class="inline-grid h-6 w-7 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- SMM bilgileri -->
            <div v-if="firma.smmFirmaId || firma.smmKisaAd" class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                SMM Bilgileri
              </p>
              <table class="w-full text-left text-[11px]">
                <tbody>
                  <tr v-for="(satir, i) in smmSatirlari" :key="i" class="border-t border-white/5">
                    <template v-for="(hucre, j) in satir" :key="j">
                      <th class="w-24 bg-surface-900 px-2 py-1.5 align-top font-medium text-ink-muted">
                        {{ hucre[0] }}
                      </th>
                      <td class="px-2 py-1.5 text-ink" :colspan="satir.length === 1 ? 3 : 1">
                        {{ hucre[1] || '—' }}
                      </td>
                    </template>
                  </tr>
                  <tr v-for="b in smmBelgeSatirlari" :key="b.etiket" class="border-t border-white/5">
                    <th class="w-36 bg-surface-900 px-2 py-1.5 font-medium text-ink-muted">{{ b.etiket }}</th>
                    <td class="px-2 py-1" colspan="3">
                      <div class="flex items-center justify-between gap-2">
                        <span class="min-w-0 truncate" :class="b.slot ? 'text-ink' : 'text-ink-muted/60'">
                          {{ b.slot?.dosyaAdi ?? '—' }}
                        </span>
                        <button v-if="b.slot" type="button" @click="dosyaAc(b.slot)"
                          aria-label="Belgeyi görüntüle"
                          class="grid h-6 w-7 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Personel: sabit görev sahipleri -->
            <div class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                Personel
              </p>
              <table class="w-full text-left text-[11px]">
                <tbody>
                  <tr v-for="(satir, i) in personelSatirlari" :key="i" class="border-t border-white/5">
                    <template v-for="(hucre, j) in satir" :key="j">
                      <th class="w-24 bg-surface-900 px-2 py-1.5 align-top font-medium text-ink-muted">
                        {{ hucre[0] }}
                      </th>
                      <td class="px-2 py-1.5 text-ink" :colspan="satir.length === 1 ? 3 : 1">
                        {{ hucre[1] || '—' }}
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mühendisler: tür + ad soyad + belgeleri -->
            <div v-if="muhendisler.length" class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                Mühendisler
              </p>
              <div v-for="(m, i) in muhendisler" :key="m._id ?? i" class="border-t border-white/5 px-2.5 py-2">
                <p class="flex items-center gap-2">
                  <span class="shrink-0 bg-surface-900 px-2 py-0.5 text-[10px] font-semibold text-ink-muted ring-1 ring-white/10">
                    {{ MUHENDIS_TUR_ETIKETLERI[m.tur] ?? m.tur }}
                  </span>
                  <span class="min-w-0 truncate text-[11px] font-semibold text-ink">{{ m.adSoyad || '—' }}</span>
                </p>
                <div v-for="b in m.belgeler" :key="b.dosyaAnahtari"
                  class="mt-1.5 flex items-center justify-between gap-2">
                  <span class="min-w-0 truncate text-[11px] text-ink">{{ b.dosyaAdi }}</span>
                  <button type="button" @click="dosyaAc(b)" aria-label="Belgeyi görüntüle"
                    class="grid h-6 w-7 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- SGK dökümleri -->
            <div v-if="sgkDokumleri.length" class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                SGK Dökümü
              </p>
              <div v-for="d in sgkDokumleri" :key="d.dosyaAnahtari"
                class="flex items-center justify-between gap-2 border-t border-white/5 px-2.5 py-1.5">
                <span class="min-w-0 truncate text-[11px] text-ink">{{ d.dosyaAdi }}</span>
                <button type="button" @click="dosyaAc(d)" aria-label="Dökümü görüntüle"
                  class="grid h-6 w-7 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

          </template>
        </div>
      </div>

      <div
        class="shrink-0 border-t border-white/5 bg-surface-bar p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div class="mx-auto max-w-lg">
          <button type="button" @click="acik = false"
            class="w-full bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Kapat
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
