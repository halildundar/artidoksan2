<script setup lang="ts">
import { ref, watch } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import KomponentIslemleri from './KomponentIslemleri.vue';
import FotoEkleCek from '@/components/FotoEkleCek.vue';
import AramaliSelect from '@/components/AramaliSelect.vue';
import RaporBelgeEkleModal from '@/components/sema/RaporBelgeEkleModal.vue';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import type { AksamBelgesi } from '@/services/aksamBelgesiService';
import { kilitBelgesiBul, type KilitBelgeSecenek, type KapiGiris } from './kapiKilitleriTipleri';

// Kapı popup'ı: her giriş için Durak Kapı Kilidi (marka → tip → birden fazla
// seri no) ve Kabin Kapı Kilidi (marka → tip → tek seri no). Çift girişli
// kabinlerde aynı form 2. Giriş için bir kez daha gelir. Seçilen markanın
// yangın/sarkaç raporları ilgili panelin altında görüntülenebilir.
const props = defineProps<{
  durakBelgeleri: KilitBelgeSecenek[];
  kabinBelgeleri: KilitBelgeSecenek[];
  yanginBelgeleri: KilitBelgeSecenek[];
  sarkacBelgeleri: KilitBelgeSecenek[];
}>();

const emit = defineEmits<{ iptal: []; belgeEklendi: [belge: AksamBelgesi] }>();
const open = defineModel<boolean>('open', { default: false });
// 1 eleman = tek giriş, 2 eleman = çift giriş (parent kabinGirisTipi'ne göre doldurur)
const girisler = defineModel<KapiGiris[]>('girisler', { default: () => [] });

const { openFile } = useFileViewer();

// Aynı marka birden fazla sertifikayla kayıtlı olsa da listede TEK satır görünür
function markalar(belgeler: KilitBelgeSecenek[]) {
  return [...new Set(belgeler.map((b) => b.marka).filter(Boolean))];
}

// Tipler, markanın tüm belgelerinin tipler[] birleşiminden gelir
function markaTipleri(belgeler: KilitBelgeSecenek[], marka: string | null) {
  if (!marka) return [];
  return [...new Set(belgeler.filter((b) => b.marka === marka).flatMap((b) => b.tipler))];
}

// Seçilen markaya ait rapor belgesi (yangın/sarkaç) — marka eşleşmesiyle bulunur
function markaRaporu(raporlar: KilitBelgeSecenek[], marka: string | null) {
  if (!marka) return null;
  return raporlar.find((b) => b.marka === marka) ?? null;
}

// Belgenin dosyasını tam ekran görüntüleyicide açar (FirmaPage deseni)
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

// "Belge Ekle" ile açılan mini rapor formu (yangın/sarkaç) — kaydedilen belge
// parent'a bildirilir, katalog listesi güncellenince satır "Görüntüle"ye döner.
const raporEkleme = ref<{ kod: string; baslik: string; marka: string } | null>(null);
const raporEklemeAcik = ref(false);

function raporEkleAc(kod: string, baslik: string, marka: string | null) {
  if (!marka) return;
  raporEkleme.value = { kod, baslik, marka };
  raporEklemeAcik.value = true;
}

function raporEklendi(belge: AksamBelgesi) {
  emit('belgeEklendi', belge);
}

function seriEkle(g: KapiGiris) {
  g.durakSeriNolar.push({ deger: '' });
}
function seriSil(g: KapiGiris, i: number) {
  g.durakSeriNolar.splice(i, 1);
}

// ---- Kilit montaj fotoğrafları (durak + kabin, giriş başına) ----
// Küçük önizlemeler için imzalı URL'ler anahtara göre önbelleklenir.
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
  [open, girisler],
  () => {
    if (!open.value) return;
    for (const g of girisler.value) {
      for (const foto of [...g.durakFotolar, ...g.kabinFotolar]) fotoUrlGetir(foto);
    }
  },
  { immediate: true, deep: true }
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
</script>

<template>
  <SemaModal v-model:open="open" title="Kapı Kilitleri" @iptal="emit('iptal')">
    <div class="space-y-4">
      <section v-for="(g, gi) in girisler" :key="gi"
        class="space-y-2" :class="gi > 0 ? 'border-t border-white/10 pt-3' : ''">
        <h3 v-if="girisler.length > 1" class="text-xs font-bold uppercase tracking-wide text-[#6fcf97]">
          {{ gi + 1 }}. Giriş
        </h3>

        <!-- Durak Kapı Kilidi -->
        <div class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
          <div class="flex items-center justify-between gap-2">
            <h4 class="min-w-0 truncate text-xs font-bold text-ink">Durak Kapı Kilidi</h4>
            <KomponentIslemleri kompakt kod="durak_kapi_kilidi" :belgeler="props.durakBelgeleri" :marka="g.durakMarka"
              :tip="g.durakTip" @sec="g.durakMarka = $event.marka; g.durakTip = $event.tip" />
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Marka</span>
              <AramaliSelect :model-value="g.durakMarka" placeholder="Seçiniz"
                :options="markalar(props.durakBelgeleri).map((m) => ({ label: m, value: m }))"
                @update:model-value="g.durakMarka = ($event as string | null) || null; g.durakTip = null" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Tip</span>
              <AramaliSelect :model-value="g.durakTip" placeholder="Tip seçiniz" :disabled="!g.durakMarka"
                :options="markaTipleri(props.durakBelgeleri, g.durakMarka).map((t) => ({ label: t, value: t }))"
                @update:model-value="g.durakTip = ($event as string | null) || null" />
            </label>
          </div>


          <!-- CE belgesi — tip de seçildikten sonra görüntülenebilir -->
          <button v-if="g.durakTip && kilitBelgesiBul(props.durakBelgeleri, g.durakMarka, g.durakTip)?.dosya"
            type="button" @click="belgeAc(kilitBelgesiBul(props.durakBelgeleri, g.durakMarka, g.durakTip))"
            class="flex items-center gap-1 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Belgeyi Görüntüle
          </button>

          <!-- Seri numaraları: Tipler alanındaki chip deseniyle -->
          <div class="space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Seri No</span>
            <div class="flex flex-wrap items-center gap-1.5">
              <span v-for="(satir, i) in g.durakSeriNolar" :key="i"
                class="inline-flex items-center gap-1 bg-surface-900 py-1 pl-2 pr-1 ring-1 ring-white/10 focus-within:ring-white/30">
                <input v-model="satir.deger" type="text" placeholder="örn. 2024-001"
                  class="w-24 bg-transparent text-xs text-ink outline-none placeholder:text-ink-muted/40" />
                <button v-if="g.durakSeriNolar.length > 1" type="button" @click="seriSil(g, i)" aria-label="Kaldır"
                  class="grid h-5 w-5 shrink-0 place-items-center text-sm leading-none text-ink-muted active:text-red-400">
                  ×
                </button>
              </span>
              <button type="button" @click="seriEkle(g)"
                class="border border-dashed border-white/20 px-3 py-1.5 text-xs text-ink-muted active:border-white/40 active:text-ink">
                + Seri No Ekle
              </button>
            </div>
          </div>

          <!-- Seçilen markanın yangın/sarkaç raporları panelin altında;
          markaya ait belge (veya dosyası) yoksa "Belge yok!" uyarısı -->
          <div v-if="g.durakMarka" class="space-y-1.5 border-t border-white/5 pt-2">
            <div class="flex items-center justify-between gap-2">
              <span class="min-w-0 flex-1 text-[11px] font-medium text-ink">Yangına Dayanım ve Sızdırmazlık Belgesi</span>
              <button v-if="markaRaporu(props.yanginBelgeleri, g.durakMarka)?.dosya" type="button"
                @click="belgeAc(markaRaporu(props.yanginBelgeleri, g.durakMarka))"
                class="shrink-0 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                Belgeyi Görüntüle
              </button>
              <button v-else type="button"
                @click="raporEkleAc('yangin_sizdirmazlik_raporu', 'Yangına Dayanım ve Sızdırmazlık Belgesi', g.durakMarka)"
                class="shrink-0 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                + Belge Ekle
              </button>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="min-w-0 flex-1 text-[11px] font-medium text-ink">Sarkaç Test Raporu</span>
              <button v-if="markaRaporu(props.sarkacBelgeleri, g.durakMarka)?.dosya" type="button"
                @click="belgeAc(markaRaporu(props.sarkacBelgeleri, g.durakMarka))"
                class="shrink-0 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                Belgeyi Görüntüle
              </button>
              <button v-else type="button"
                @click="raporEkleAc('sarkac_test_raporu', 'Sarkaç Test Raporu', g.durakMarka)"
                class="shrink-0 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                + Belge Ekle
              </button>
            </div>
          </div>

          <!-- Montaj fotoğrafları: birden fazla eklenebilir, dokununca açılır -->
          <div class="space-y-1 border-t border-white/5 pt-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-ink-muted">Fotoğraflar</span>
              <FotoEkleCek :yukleniyor="fotoYukleniyor"
                @dosyalar="fotoEkle(g.durakFotolar, $event)" />
            </div>
            <div v-if="g.durakFotolar.length" class="flex flex-wrap gap-1.5">
              <span v-for="(foto, i) in g.durakFotolar" :key="foto.dosyaAnahtari + i" class="relative">
                <button type="button" @click="fotoAc(foto)"
                  class="grid h-16 w-16 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
                  <img v-if="fotoUrller[foto.dosyaAnahtari]" :src="fotoUrller[foto.dosyaAnahtari]"
                    :alt="foto.dosyaAdi" class="h-full w-full object-cover" />
                  <span v-else class="px-1 text-center text-[9px] text-ink-muted/60">{{ foto.dosyaAdi }}</span>
                </button>
                <button type="button" @click="fotoSil(g.durakFotolar, i)" aria-label="Fotoğrafı kaldır"
                  class="absolute -right-1 -top-1 grid h-4 w-4 place-items-center bg-red-900 text-[10px] leading-none text-red-100 ring-1 ring-red-500/40">
                  ×
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- Kabin Kapı Kilidi -->
        <div class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
          <div class="flex items-center justify-between gap-2">
            <h4 class="min-w-0 truncate text-xs font-bold text-ink">Kabin Kapı Kilidi</h4>
            <KomponentIslemleri kompakt kod="kabin_kapi_kilidi" :belgeler="props.kabinBelgeleri" :marka="g.kabinMarka"
              :tip="g.kabinTip" @sec="g.kabinMarka = $event.marka; g.kabinTip = $event.tip" />
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Marka</span>
              <AramaliSelect :model-value="g.kabinMarka" placeholder="Seçiniz"
                :options="markalar(props.kabinBelgeleri).map((m) => ({ label: m, value: m }))"
                @update:model-value="g.kabinMarka = ($event as string | null) || null; g.kabinTip = null" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Tip</span>
              <AramaliSelect :model-value="g.kabinTip" placeholder="Tip seçiniz" :disabled="!g.kabinMarka"
                :options="markaTipleri(props.kabinBelgeleri, g.kabinMarka).map((t) => ({ label: t, value: t }))"
                @update:model-value="g.kabinTip = ($event as string | null) || null" />
            </label>
          </div>


          <button v-if="g.kabinTip && kilitBelgesiBul(props.kabinBelgeleri, g.kabinMarka, g.kabinTip)?.dosya"
            type="button" @click="belgeAc(kilitBelgesiBul(props.kabinBelgeleri, g.kabinMarka, g.kabinTip))"
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
            <input v-model="g.kabinSeriNo" type="text" placeholder="Seri no"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
          </label>

          <!-- Seçilen markanın yangın/sarkaç raporları panelin altında;
          markaya ait belge (veya dosyası) yoksa "Belge yok!" uyarısı -->
          <div v-if="g.kabinMarka" class="space-y-1.5 border-t border-white/5 pt-2">
            <div class="flex items-center justify-between gap-2">
              <span class="min-w-0 flex-1 text-[11px] font-medium text-ink">Yangına Dayanım ve Sızdırmazlık Belgesi</span>
              <button v-if="markaRaporu(props.yanginBelgeleri, g.kabinMarka)?.dosya" type="button"
                @click="belgeAc(markaRaporu(props.yanginBelgeleri, g.kabinMarka))"
                class="shrink-0 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                Belgeyi Görüntüle
              </button>
              <button v-else type="button"
                @click="raporEkleAc('yangin_sizdirmazlik_raporu', 'Yangına Dayanım ve Sızdırmazlık Belgesi', g.kabinMarka)"
                class="shrink-0 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                + Belge Ekle
              </button>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="min-w-0 flex-1 text-[11px] font-medium text-ink">Sarkaç Test Raporu</span>
              <button v-if="markaRaporu(props.sarkacBelgeleri, g.kabinMarka)?.dosya" type="button"
                @click="belgeAc(markaRaporu(props.sarkacBelgeleri, g.kabinMarka))"
                class="shrink-0 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                Belgeyi Görüntüle
              </button>
              <button v-else type="button"
                @click="raporEkleAc('sarkac_test_raporu', 'Sarkaç Test Raporu', g.kabinMarka)"
                class="shrink-0 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                + Belge Ekle
              </button>
            </div>
          </div>

          <!-- Montaj fotoğrafları: birden fazla eklenebilir, dokununca açılır -->
          <div class="space-y-1 border-t border-white/5 pt-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-ink-muted">Fotoğraflar</span>
              <FotoEkleCek :yukleniyor="fotoYukleniyor"
                @dosyalar="fotoEkle(g.kabinFotolar, $event)" />
            </div>
            <div v-if="g.kabinFotolar.length" class="flex flex-wrap gap-1.5">
              <span v-for="(foto, i) in g.kabinFotolar" :key="foto.dosyaAnahtari + i" class="relative">
                <button type="button" @click="fotoAc(foto)"
                  class="grid h-16 w-16 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
                  <img v-if="fotoUrller[foto.dosyaAnahtari]" :src="fotoUrller[foto.dosyaAnahtari]"
                    :alt="foto.dosyaAdi" class="h-full w-full object-cover" />
                  <span v-else class="px-1 text-center text-[9px] text-ink-muted/60">{{ foto.dosyaAdi }}</span>
                </button>
                <button type="button" @click="fotoSil(g.kabinFotolar, i)" aria-label="Fotoğrafı kaldır"
                  class="absolute -right-1 -top-1 grid h-4 w-4 place-items-center bg-red-900 text-[10px] leading-none text-red-100 ring-1 ring-red-500/40">
                  ×
                </button>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Rapor belgesi ekleme mini formu (yangın/sarkaç) -->
    <RaporBelgeEkleModal v-if="raporEkleme" v-model:open="raporEklemeAcik"
      :baslik="raporEkleme.baslik" :kod="raporEkleme.kod" :marka="raporEkleme.marka"
      @eklendi="raporEklendi" />
  </SemaModal>
</template>
