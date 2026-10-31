<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  getTescilYazdir,
  updateTescil,
  uretTescilBelgesi,
  type YazdirKalemi,
} from '@/services/tescilService';
import { getDosyaUrl, getDosyaIndirUrl, createZipLink, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import LinkPopup from '@/components/LinkPopup.vue';

// Tam sayfa yazdırma görünümü — tescil dosyası kalem listesi: yüklü dosyalar,
// CE/aksam sertifikaları ve şablondan üretilen DOCX+PDF belgeler. PDF'ler
// görüntülenir+indirilir, doldurulan DOCX'ler yalnız indirilir. Tümünü Yazdır
// tüm şablonları sırayla üretir; Tümünü İndir her şeyi numaralı adlarla tek
// ZIP'te toplar. tescilId verilmezse (denetim sayfası) içerik boş kalır.
const props = defineProps<{ tescilId?: string | null }>();
const acik = defineModel<boolean>('acik', { default: false });

// Şablon seti seçenekleri — ileride yeni set klasörleri eklendikçe genişler
const SABLON_SETLERI = [{ deger: 'tescil-temp1', etiket: 'Template 1' }];

const kalemler = ref<YazdirKalemi[]>([]);
const sablonSeti = ref('tescil-temp1');
const yukleniyor = ref(false);
const hata = ref('');

async function yukle() {
  if (!props.tescilId) return;
  yukleniyor.value = true;
  hata.value = '';
  try {
    const liste = await getTescilYazdir(props.tescilId);
    kalemler.value = liste.kalemler;
    sablonSeti.value = liste.sablonSeti;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Liste yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

watch(acik, (a) => {
  if (a) yukle();
});

async function setKaydet(event: Event) {
  if (!props.tescilId) return;
  const deger = (event.target as HTMLSelectElement).value;
  sablonSeti.value = deger;
  try {
    await updateTescil(props.tescilId, { sablonSeti: deger });
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kaydedilemedi';
  }
}

// ---- Tekli üretim (Yazdır / Yeniden Yazdır) ----
const uretilenKodlar = ref<Set<string>>(new Set());

async function uret(kalem: YazdirKalemi) {
  if (!props.tescilId || uretilenKodlar.value.has(kalem.kod)) return;
  uretilenKodlar.value = new Set([...uretilenKodlar.value, kalem.kod]);
  hata.value = '';
  try {
    const sonuc = await uretTescilBelgesi(props.tescilId, kalem.kod);
    const satir = kalemler.value.find((k) => k.kod === kalem.kod);
    if (satir) satir.uretilen = sonuc;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : `${kalem.ad} üretilemedi`;
  } finally {
    const yeni = new Set(uretilenKodlar.value);
    yeni.delete(kalem.kod);
    uretilenKodlar.value = yeni;
  }
}

// ---- Tümünü Yazdır: şablon kalemleri sırayla üretilir (LibreOffice
// dönüşümü belge başına birkaç saniye sürer, ilerleme gösterilir) ----
const topluUretim = ref<{ sira: number; toplam: number } | null>(null);

async function tumunuYazdir() {
  if (!props.tescilId || topluUretim.value) return;
  const sablonlar = kalemler.value.filter((k) => k.tip === 'sablon');
  for (let i = 0; i < sablonlar.length; i++) {
    topluUretim.value = { sira: i + 1, toplam: sablonlar.length };
    await uret(sablonlar[i]);
    if (hata.value) break;
  }
  topluUretim.value = null;
}

// ---- Görüntüle / indir ----
const { openFile } = useFileViewer();

async function goruntule(slot: BelgeSlot) {
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

async function indir(slot: BelgeSlot, ad?: string) {
  try {
    window.open(await getDosyaIndirUrl(slot.dosyaAnahtari, ad || slot.dosyaAdi), '_blank');
  } catch {
    hata.value = 'İndirme linki alınamadı';
  }
}

// ---- Numaralı dosya adları (ZIP içeriği ve tekli indirmeler) ----
function uzanti(slot: BelgeSlot) {
  const m = /\.[A-Za-z0-9]+$/.exec(slot.dosyaAdi);
  if (m) return m[0];
  if (slot.mimeType === 'application/pdf') return '.pdf';
  if (slot.mimeType?.startsWith('image/')) return '.' + slot.mimeType.slice(6);
  return '';
}

function kalemDosyaAdi(kalem: YazdirKalemi, slot: BelgeSlot, sira?: number) {
  const ek = sira !== undefined ? ` (${sira + 1})` : '';
  return `${String(kalem.no).padStart(2, '0')}-${kalem.ad}${ek}${uzanti(slot)}`;
}

// ---- Tümünü İndir: tüm kalem dosyaları + üretilen PDF/DOCX'ler tek ZIP ----
const zipAcik = ref(false);
const zipUrl = ref('');
const zipHata = ref('');

const zipIcerigi = computed(() => {
  const dosyalar: { dosyaAnahtari: string; dosyaAdi: string }[] = [];
  for (const kalem of kalemler.value) {
    if (kalem.tip === 'sablon') {
      if (kalem.uretilen?.pdf) {
        dosyalar.push({
          dosyaAnahtari: kalem.uretilen.pdf.dosyaAnahtari,
          dosyaAdi: kalemDosyaAdi(kalem, kalem.uretilen.pdf),
        });
      }
      if (kalem.uretilen?.docx) {
        dosyalar.push({
          dosyaAnahtari: kalem.uretilen.docx.dosyaAnahtari,
          dosyaAdi: kalemDosyaAdi(kalem, kalem.uretilen.docx),
        });
      }
    } else {
      (kalem.dosyalar ?? []).forEach((slot, i) => {
        dosyalar.push({
          dosyaAnahtari: slot.dosyaAnahtari,
          dosyaAdi: kalemDosyaAdi(kalem, slot, (kalem.dosyalar?.length ?? 0) > 1 ? i : undefined),
        });
      });
    }
  }
  return dosyalar;
});

async function tumunuIndir() {
  if (!zipIcerigi.value.length) {
    hata.value = 'İndirilecek dosya yok — önce belgeleri üretin/yükleyin.';
    return;
  }
  zipAcik.value = true;
  zipUrl.value = '';
  zipHata.value = '';
  try {
    const sonuc = await createZipLink('Tescil Dosyası', zipIcerigi.value);
    zipUrl.value = sonuc.url;
  } catch (e) {
    zipHata.value = e instanceof Error ? e.message : 'ZIP oluşturulamadı';
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="acik" class="fixed inset-0 z-50 flex flex-col bg-[#101a14]">
      <div
        class="flex shrink-0 items-center justify-between border-b border-white/5 bg-surface-bar px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 class="truncate text-sm font-bold text-ink">Yazdır</h2>
        <button type="button" @click="acik = false"
          class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink-muted ring-1 ring-white/10">
          ✕
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <div class="mx-auto max-w-lg space-y-2 p-4">
          <template v-if="tescilId">
            <p v-if="hata" class="bg-red-950/60 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/20">
              {{ hata }}
            </p>

            <!-- Şablon seti + toplu işlemler -->
            <div class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Şablon Seti</span>
                <select :value="sablonSeti" @change="setKaydet"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option v-for="s in SABLON_SETLERI" :key="s.deger" :value="s.deger">{{ s.etiket }}</option>
                </select>
              </label>
              <div class="flex gap-1.5">
                <button type="button" @click="tumunuYazdir" :disabled="topluUretim != null"
                  class="flex flex-1 items-center justify-center gap-1.5 bg-[#2b5c3d] px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-60">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9V3h12v6" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  {{ topluUretim ? `Üretiliyor ${topluUretim.sira}/${topluUretim.toplam}…` : 'Tümünü Yazdır' }}
                </button>
                <button type="button" @click="tumunuIndir"
                  class="flex flex-1 items-center justify-center gap-1.5 bg-surface-900 px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3v12" />
                    <path d="m8 11 4 4 4-4" />
                    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                  </svg>
                  Tümünü İndir (ZIP)
                </button>
              </div>
            </div>

            <p v-if="yukleniyor" class="py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>

            <!-- Kalem listesi -->
            <div v-for="kalem in kalemler" :key="kalem.kod"
              class="space-y-1.5 bg-surface-800 p-2.5 ring-1 ring-white/5">
              <div class="flex items-center gap-2">
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-xs font-semibold text-ink">
                    {{ kalem.no }}-{{ kalem.ad }}
                  </span>
                  <span v-if="kalem.altBilgi" class="mt-0.5 block truncate text-[11px] text-ink-muted/80">
                    {{ kalem.altBilgi }}
                  </span>
                </span>

                <!-- Şablon kalemi: üret / görüntüle / indir -->
                <template v-if="kalem.tip === 'sablon'">
                  <span v-if="kalem.uretilen"
                    class="shrink-0 bg-[#1c2a21] px-1.5 py-0.5 text-[10px] font-semibold text-[#6fcf97] ring-1 ring-white/10">✓</span>
                  <button type="button" @click="uret(kalem)" :disabled="uretilenKodlar.has(kalem.kod)"
                    class="shrink-0 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-60">
                    {{ uretilenKodlar.has(kalem.kod) ? 'Üretiliyor…' : kalem.uretilen ? 'Yeniden Yazdır' : 'Yazdır' }}
                  </button>
                </template>

                <!-- Dosya/CE/aksam kalemi: durum rozeti -->
                <template v-else>
                  <span v-if="!kalem.dosyalar?.length"
                    class="shrink-0 bg-surface-900 px-2 py-0.5 text-[10px] font-semibold text-ink-muted/60 ring-1 ring-white/10">
                    eksik
                  </span>
                  <span v-else
                    class="shrink-0 bg-[#1c2a21] px-1.5 py-0.5 text-[10px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                    {{ kalem.dosyalar.length > 1 ? kalem.dosyalar.length : '✓' }}
                  </span>
                </template>
              </div>

              <!-- Şablon: üretilmiş PDF/DOCX aksiyonları (DOCX yalnız indirilir) -->
              <div v-if="kalem.tip === 'sablon' && kalem.uretilen" class="flex flex-wrap gap-1.5">
                <button v-if="kalem.uretilen.pdf" type="button" @click="goruntule(kalem.uretilen.pdf)"
                  class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                  PDF Görüntüle
                </button>
                <button v-if="kalem.uretilen.pdf" type="button"
                  @click="indir(kalem.uretilen.pdf, kalemDosyaAdi(kalem, kalem.uretilen.pdf))"
                  class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                  PDF İndir
                </button>
                <button v-if="kalem.uretilen.docx" type="button"
                  @click="indir(kalem.uretilen.docx, kalemDosyaAdi(kalem, kalem.uretilen.docx))"
                  class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                  DOCX İndir
                </button>
              </div>

              <!-- Dosya kalemi: her dosya için görüntüle + indir -->
              <div v-if="kalem.tip !== 'sablon' && kalem.dosyalar?.length" class="space-y-1">
                <div v-for="(slot, i) in kalem.dosyalar" :key="slot.dosyaAnahtari + i"
                  class="flex items-center gap-1.5 bg-surface-900/60 p-1.5 ring-1 ring-white/5">
                  <span class="min-w-0 flex-1 truncate text-[11px] text-ink">{{ slot.dosyaAdi }}</span>
                  <button type="button" @click="goruntule(slot)" aria-label="Görüntüle"
                    class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button type="button"
                    @click="indir(slot, kalemDosyaAdi(kalem, slot, (kalem.dosyalar?.length ?? 0) > 1 ? i : undefined))"
                    aria-label="İndir"
                    class="grid h-6.5 w-8 shrink-0 place-items-center bg-surface-900 text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 3v12" />
                      <path d="m8 11 4 4 4-4" />
                      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Tümünü İndir ZIP linki -->
    <LinkPopup v-model:acik="zipAcik" :url="zipUrl" :hata="zipHata"
      bekleme-metni="Tescil dosyası ZIP'i oluşturuluyor…"
      aciklama="Tüm tescil dosyası belgeleri numaralı adlarla tek ZIP'te toplandı." />
  </Teleport>
</template>
