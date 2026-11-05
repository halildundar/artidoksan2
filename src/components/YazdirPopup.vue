<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  baslatTescilYazdir,
  baslatTopluTescilYazdir,
  getTescilYazdir,
  getTescilYazdirIsleri,
  iptalTescilYazdirIsi,
  sifirlaTescilYazdir,
  updateTescil,
  type YazdirIs,
  type YazdirKalemi,
  type YazdirKaynak,
} from '@/services/tescilService';
import { updateDenetim } from '@/services/denetimService';
import { getDosyaUrl, getDosyaIndirUrl, createZipLink, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import LinkPopup from '@/components/LinkPopup.vue';
import SilmeOnayi from '@/components/SilmeOnayi.vue';

// Tam sayfa yazdırma görünümü — tescil dosyası kalem listesi: yüklü dosyalar,
// CE/aksam sertifikaları ve şablondan üretilen DOCX+PDF belgeler. PDF'ler
// görüntülenir+indirilir, doldurulan DOCX'ler yalnız indirilir. Tümünü Yazdır
// tüm şablonları sırayla üretir; Tümünü İndir her şeyi numaralı adlarla tek
// ZIP'te toplar. tescilId verilmezse (denetim sayfası) içerik boş kalır.
const props = defineProps<{ tescilId?: string | null; denetimId?: string | null }>();
// Yazdırma tescile ya da denetime bağlı olabilir; aynı ekran ikisini de kullanır
const kaynak = computed<YazdirKaynak>(() => (props.denetimId ? 'denetimler' : 'tesciller'));
const kayitId = computed(() => props.denetimId ?? props.tescilId ?? null);
const acik = defineModel<boolean>('acik', { default: false });

// Şablon seti seçenekleri — ileride yeni set klasörleri eklendikçe genişler
const SABLON_SETLERI = [{ deger: 'tescil-temp1', etiket: 'Template 1' }];

const kalemler = ref<YazdirKalemi[]>([]);
const sablonSeti = ref('tescil-temp1');
// Denetim: şablon klasörü seçimleri (varsayılan ikisi de seçili)
const DENETIM_SETLERI = {
  teknikDosyaSeti: [{ deger: 'ce-td-temp1', etiket: 'Teknik Dosya 1' }],
  tuvFormsSeti: [{ deger: 'tuv-temp1', etiket: 'Tüv Forms 1' }],
};
const teknikDosyaSeti = ref('ce-td-temp1');
const tuvFormsSeti = ref('tuv-temp1');
const yukleniyor = ref(false);
const hata = ref('');
const listeMesaji = ref('');

async function yukle(sessiz = false) {
  if (!kayitId.value) return;
  if (!sessiz) yukleniyor.value = true;
  hata.value = '';
  try {
    const liste = await getTescilYazdir(kayitId.value!, kaynak.value);
    kalemler.value = liste.kalemler;
    sablonSeti.value = liste.sablonSeti;
    teknikDosyaSeti.value = liste.teknikDosyaSeti ?? 'ce-td-temp1';
    tuvFormsSeti.value = liste.tuvFormsSeti ?? 'tuv-temp1';
    listeMesaji.value = liste.mesaj ?? '';
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Liste yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

watch(acik, (a) => {
  if (a) {
    yukle();
    isleriYenile();
  } else {
    anketiDurdur();
  }
});

onBeforeUnmount(anketiDurdur);

async function setKaydet(event: Event) {
  if (!kayitId.value) return;
  const deger = (event.target as HTMLSelectElement).value;
  sablonSeti.value = deger;
  try {
    await updateTescil(props.tescilId!, { sablonSeti: deger });
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kaydedilemedi';
  }
}

async function denetimSetiKaydet(alan: 'teknikDosyaSeti' | 'tuvFormsSeti', event: Event) {
  if (!props.denetimId) return;
  const deger = (event.target as HTMLSelectElement).value;
  (alan === 'teknikDosyaSeti' ? teknikDosyaSeti : tuvFormsSeti).value = deger;
  try {
    await updateDenetim(props.denetimId, { [alan]: deger });
    yukle(true);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kaydedilemedi';
  }
}

// ---- Yazdırma işleri: üretim SUNUCUDA bir kuyrukta çalışır; burada yalnız
// istek gönderilir ve ilerleme sorgulanır. Sayfadan/uygulamadan çıkılsa da
// iş sürer, geri dönünce ilerleme kaldığı yerden görünür. Tescildeki diğer
// kullanıcıların işleri de aynı panelde görünür. ----
const isler = ref<YazdirIs[]>([]);
const genelBekleyen = ref(0);
const kapatilanIsler = ref<Set<string>>(new Set());
let zamanlayici: ReturnType<typeof setTimeout> | null = null;
let oncekiAktif = new Set<string>();
let oncekiTamamlanan = -1;

function anketiDurdur() {
  if (zamanlayici) clearTimeout(zamanlayici);
  zamanlayici = null;
}

async function isleriYenile() {
  anketiDurdur();
  if (!kayitId.value || !acik.value) return;
  try {
    const r = await getTescilYazdirIsleri(kayitId.value!, kaynak.value);
    isler.value = r.isler;
    genelBekleyen.value = r.genelBekleyen;
    const aktifler = new Set(r.isler.filter((i) => i.durum === 'calisiyor').map((i) => i.id));
    const tamamlanan = r.isler.reduce((t, i) => t + i.tamamlanan, 0);
    // Bir iş bitti ya da yeni belge üretildi: liste tazelenir (hazır belge görünür)
    if (tamamlanan !== oncekiTamamlanan || [...oncekiAktif].some((id) => !aktifler.has(id))) {
      if (oncekiTamamlanan !== -1) await yukle(true);
      oncekiTamamlanan = tamamlanan;
    }
    oncekiAktif = aktifler;
  } catch {
    /* geçici ağ hatası: bir sonraki turda yeniden denenir */
  }
  if (acik.value) {
    zamanlayici = setTimeout(isleriYenile, isler.value.some((i) => i.durum === 'calisiyor') ? 1000 : 4000);
  }
}

const aktifIsler = computed(() => isler.value.filter((i) => i.durum === 'calisiyor'));
const topluAktif = computed(() => aktifIsler.value.find((i) => i.tip === 'toplu') ?? null);

// Panelde gösterilen işler: çalışanlar + yakın zamanda bitenler (kapatılmadıysa)
const gorunenIsler = computed(() =>
  isler.value.filter(
    (i) =>
      !kapatilanIsler.value.has(i.id) &&
      (i.durum === 'calisiyor' || i.durum === 'hatali' || (i.bitisSonra ?? 0) < 90_000)
  )
);

// Panelde gösterilen aşama başlığı: Word dolduruluyor → PDF'e çevriliyor → kaydediliyor
function fazMetni(is: YazdirIs) {
  const toplu = is.tip === 'toplu';
  switch (is.faz) {
    case 'sirada':
      return 'Sırada';
    case 'hazirlaniyor':
      return toplu
        ? `Yazdırılıyor — Word dosyaları hazırlanıyor (${is.wordHazir}/${is.toplam})`
        : 'Yazdırılıyor — Word dosyası hazırlanıyor';
    case 'cevriliyor':
      return toplu ? `PDF'e çevriliyor — LibreOffice (${is.pdfHazir}/${is.toplam})` : "PDF'e çevriliyor — LibreOffice";
    case 'kaydediliyor':
      return 'Kaydediliyor…';
    default:
      return '';
  }
}

function isiKapat(id: string) {
  kapatilanIsler.value = new Set([...kapatilanIsler.value, id]);
}

// Satırdaki belge şu an üretiliyor mu / sırada mı?
function kalemDurumu(kod: string): 'uretiliyor' | 'bekliyor' | null {
  let bekliyor = false;
  for (const is of aktifIsler.value) {
    const k = is.kalemler.find((x) => x.kod === kod);
    if (k && ['uretiliyor', 'hazir', 'cevrildi'].includes(k.durum)) return 'uretiliyor';
    if (k?.durum === 'bekliyor') bekliyor = true;
  }
  return bekliyor ? 'bekliyor' : null;
}

async function uret(kalem: YazdirKalemi) {
  // Devam eden bir yazdırma varken (hangi belgeye ait olursa olsun) yeni yazdırma başlatılmaz
  if (!kayitId.value || aktifIsler.value.length || sifirlaniyor.value) return;
  hata.value = '';
  try {
    // Daha önce üretilmişse "Yeniden Yazdır": girdi değişmese de yeniden üretilir
    await baslatTescilYazdir(kayitId.value!, kalem.kod, !!kalem.uretilen, kaynak.value);
    await isleriYenile();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : `${kalem.ad} sıraya alınamadı`;
  }
}

// Tümünü Yazdır: değişmemiş belgeler atlanır, kalanlar kuyrukta üretilir
async function tumunuYazdir() {
  if (!kayitId.value || aktifIsler.value.length || sifirlaniyor.value) return;
  hata.value = '';
  try {
    await baslatTopluTescilYazdir(kayitId.value!, kaynak.value);
    await isleriYenile();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Toplu yazdırma başlatılamadı';
  }
}

async function isiIptalEt(is: YazdirIs) {
  if (!kayitId.value) return;
  try {
    await iptalTescilYazdirIsi(kayitId.value!, is.id, kaynak.value);
    await isleriYenile();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'İptal edilemedi';
  }
}

// ---- Sıfırla: üretilmiş çıktıları kayıttan + depodan siler ----
const uretilmisVar = computed(() => kalemler.value.some((k) => k.tip === 'sablon' && k.uretilen));
// Eksik dosya sayısı: üretilmemiş/eskimiş şablonlar + dosyası olmayan kalemler
const kalemEksik = (k: YazdirKalemi) =>
  !k.hazirDegil && (k.tip === 'sablon' ? !k.uretilen || !!k.eskimis : !k.dosyalar?.length);
const eksikSayisi = computed(() => kalemler.value.filter(kalemEksik).length);
const sifirlaOnayAcik = ref(false);
const sifirlaniyor = ref(false);
// Yazdırma/sıfırlama sürerken yazdırma düğmeleri ve üretilmiş belge işlemleri pasif
const yazdirmaMesgul = computed(() => aktifIsler.value.length > 0 || sifirlaniyor.value);

async function sifirla() {
  sifirlaOnayAcik.value = false;
  if (!kayitId.value) return;
  sifirlaniyor.value = true;
  hata.value = '';
  try {
    await sifirlaTescilYazdir(kayitId.value!, kaynak.value);
    for (const k of kalemler.value) if (k.tip === 'sablon') k.uretilen = undefined;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Sıfırlanamadı';
  } finally {
    sifirlaniyor.value = false;
  }
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
  // Tescilde "01-Ad", denetimde "1.Ad" / "12.1.Ad" biçimi
  const sayi = typeof kalem.no === 'number';
  const numara = sayi ? String(kalem.no).padStart(2, '0') : String(kalem.no);
  return `${numara}${sayi ? '-' : '.'}${kalem.ad}${ek}${uzanti(slot)}`;
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
    const sonuc = await createZipLink(kaynak.value === 'denetimler' ? 'Denetim Dosyası' : 'Tescil Dosyası', zipIcerigi.value);
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

      <!-- Yazdırma süreçleri: sayfa kaydırılsa da başlığın altında sabit durur -->
      <div v-if="kayitId && gorunenIsler.length"
        class="shrink-0 space-y-1.5 border-b border-white/5 bg-surface-900 px-4 py-2">
        <div v-for="is in gorunenIsler" :key="is.id" class="mx-auto max-w-lg space-y-1 bg-surface-800 p-2 ring-1 ring-white/10">
          <div class="flex items-center justify-between gap-2">
            <span class="min-w-0 truncate text-xs font-semibold text-ink">
              {{ is.tip === 'toplu' ? 'Tümünü Yazdır' : is.ad }}
            </span>
            <span class="shrink-0 text-[11px] font-semibold tabular-nums text-ink-muted">
              {{ is.tamamlanan }}/{{ is.toplam }}
            </span>
            <button v-if="is.iptalEdilebilir" type="button" @click="isiIptalEt(is)"
              class="shrink-0 bg-surface-900 px-2 py-0.5 text-[10px] font-semibold text-red-300/90 ring-1 ring-red-500/25">
              İptal
            </button>
            <button v-if="is.durum !== 'calisiyor'" type="button" @click="isiKapat(is.id)" aria-label="Kapat"
              class="grid h-5 w-5 shrink-0 place-items-center bg-surface-900 text-[10px] text-ink-muted ring-1 ring-white/10">
              ✕
            </button>
          </div>
          <div class="h-1.5 w-full overflow-hidden bg-surface-900 ring-1 ring-white/10">
            <div class="h-full bg-[#6fcf97] transition-all duration-300"
              :class="is.hatali ? '!bg-red-400' : ''"
              :style="{ width: Math.max(is.durum === 'calisiyor' ? 3 : 0, is.yuzde) + '%' }" />
          </div>
          <template v-if="is.durum === 'calisiyor'">
            <p class="text-[11px] font-semibold text-ink">{{ fazMetni(is) }}</p>
            <p class="truncate text-[11px] text-ink-muted">
              <template v-if="is.faz === 'sirada'">
                Sırada bekliyor<template v-if="is.onunde"> — önünüzde {{ is.onunde }} işlem var</template>
              </template>
              <template v-else-if="is.faz === 'hazirlaniyor' && is.calisan.length">
                Word dosyası: <span class="font-medium text-ink">{{ is.calisan.map((c) => `${c.no}-${c.ad}`).join(', ') }}</span>
              </template>
              <template v-else-if="is.tip === 'toplu'">
                Word: {{ is.wordHazir }}/{{ is.toplam }} • PDF: {{ is.pdfHazir }}/{{ is.toplam }}
              </template>
            </p>
          </template>
          <p v-else class="text-[11px] text-ink-muted">
            <template v-if="is.durum === 'iptal'">İptal edildi — {{ is.uretilen }} belge üretildi.</template>
            <template v-else>
              Tamamlandı: {{ is.uretilen }} üretildi<template v-if="is.atlanan">, {{ is.atlanan }} zaten güncel (atlandı)</template><template v-if="is.hatali">, {{ is.hatali }} hata</template>.
            </template>
          </p>
          <p v-for="h in is.hatalar" :key="h.ad" class="text-[11px] text-red-300">{{ h.ad }}: {{ h.mesaj }}</p>
        </div>
        <p v-if="aktifIsler.length && genelBekleyen > aktifIsler.reduce((t, i) => t + i.bekleyen + i.calisan.length, 0)"
          class="mx-auto max-w-lg text-[10px] text-ink-muted/70">
          Sunucuda toplam {{ genelBekleyen }} işlem bekliyor/çalışıyor (diğer kullanıcılar dahil).
        </p>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <div class="mx-auto max-w-lg space-y-2 p-4">
          <template v-if="kayitId">
            <p v-if="hata" class="bg-red-950/60 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/20">
              {{ hata }}
            </p>

            <!-- Şablon seti + toplu işlemler -->
            <div class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
              <div v-if="kaynak === 'denetimler'" class="grid grid-cols-2 gap-1.5">
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Teknik Dosya</span>
                  <select :value="teknikDosyaSeti" :disabled="yazdirmaMesgul" @change="denetimSetiKaydet('teknikDosyaSeti', $event)"
                    class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30 disabled:opacity-60">
                    <option v-for="s in DENETIM_SETLERI.teknikDosyaSeti" :key="s.deger" :value="s.deger">{{ s.etiket }}</option>
                  </select>
                </label>
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Tüv Forms</span>
                  <select :value="tuvFormsSeti" :disabled="yazdirmaMesgul" @change="denetimSetiKaydet('tuvFormsSeti', $event)"
                    class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30 disabled:opacity-60">
                    <option v-for="s in DENETIM_SETLERI.tuvFormsSeti" :key="s.deger" :value="s.deger">{{ s.etiket }}</option>
                  </select>
                </label>
              </div>
              <label v-else class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Şablon Seti</span>
                <select :value="sablonSeti" @change="setKaydet"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option v-for="s in SABLON_SETLERI" :key="s.deger" :value="s.deger">{{ s.etiket }}</option>
                </select>
              </label>
              <div class="flex gap-1.5">
                <button type="button" @click="tumunuYazdir" :disabled="yazdirmaMesgul"
                  class="flex flex-1 items-center justify-center gap-1.5 bg-[#2b5c3d] px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-60">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9V3h12v6" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  {{ topluAktif ? `Yazdırılıyor ${topluAktif.tamamlanan}/${topluAktif.toplam}…` : 'Tümünü Yazdır' }}
                </button>
                <button v-if="zipIcerigi.length && !eksikSayisi" type="button" @click="tumunuIndir" :disabled="yazdirmaMesgul"
                  class="flex items-center justify-center gap-1.5 bg-surface-900 px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20] disabled:opacity-60">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3v12" />
                    <path d="m8 11 4 4 4-4" />
                    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                  </svg>
                  Tümünü İndir
                </button>
                <button v-if="uretilmisVar" type="button" @click="sifirlaOnayAcik = true"
                  :disabled="yazdirmaMesgul"
                  class="flex items-center justify-center gap-1.5 bg-surface-900 px-3 py-2.5 text-xs font-semibold text-red-300/90 ring-1 ring-red-500/25 active:bg-[#1a2a20] disabled:opacity-60">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  {{ sifirlaniyor ? 'Siliniyor…' : 'Sıfırla' }}
                </button>
              </div>
              <p v-if="kalemler.length && !yukleniyor" class="text-[10px] font-semibold"
                :class="eksikSayisi ? 'text-red-400' : 'text-emerald-400'">
                {{ eksikSayisi ? `${eksikSayisi} dosya eksik` : 'Tüm dosyalar tam' }}
              </p>
            </div>

            <p v-if="yukleniyor" class="py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>
            <p v-else-if="!kalemler.length && listeMesaji"
              class="bg-surface-800 px-3 py-4 text-center text-xs text-ink-muted ring-1 ring-white/5">
              {{ listeMesaji }}
            </p>

            <!-- Kalem listesi -->
            <div v-for="kalem in kalemler" :key="kalem.kod"
              class="space-y-1.5 bg-surface-800 p-2.5 ring-1"
              :class="kalemEksik(kalem) ? 'ring-red-500/40' : 'ring-white/5'">
              <div class="flex items-center gap-2">
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-xs font-semibold"
                    :class="kalemEksik(kalem) ? 'text-red-400' : 'text-ink'">
                    {{ kalem.no }}{{ kaynak === 'denetimler' ? '.' : '-' }}{{ kalem.ad }}
                  </span>
                  <span v-if="kalem.altBilgi" class="mt-0.5 block truncate text-[11px] text-ink-muted/80">
                    {{ kalem.altBilgi }}
                  </span>
                </span>

                <!-- Şablon kalemi: üret / görüntüle / indir -->
                <span v-if="kalem.hazirDegil"
                  class="shrink-0 bg-surface-900 px-2 py-0.5 text-[10px] font-semibold text-ink-muted/60 ring-1 ring-white/10">
                  yakında
                </span>
                <template v-else-if="kalem.tip === 'sablon'">
                  <span v-if="!kalem.uretilen"
                    class="shrink-0 bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400 ring-1 ring-red-500/30">
                    eksik
                  </span>
                  <span v-else-if="kalem.uretilen && kalem.eskimis"
                    class="shrink-0 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                    Güncel değil
                  </span>
                  <span v-else-if="kalem.uretilen"
                    class="shrink-0 bg-[#1c2a21] px-1.5 py-0.5 text-[10px] font-semibold text-[#6fcf97] ring-1 ring-white/10">✓</span>
                  <button type="button" @click="uret(kalem)" :disabled="yazdirmaMesgul"
                    class="shrink-0 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-60">
                    {{ kalemDurumu(kalem.kod) === 'uretiliyor' ? 'Üretiliyor…' : kalemDurumu(kalem.kod) === 'bekliyor' ? 'Sırada…' : kalem.uretilen ? 'Yeniden Yazdır' : 'Yazdır' }}
                  </button>
                </template>

                <!-- Dosya/CE/aksam kalemi: durum rozeti -->
                <template v-else>
                  <span v-if="!kalem.dosyalar?.length"
                    class="shrink-0 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 ring-1 ring-red-500/30">
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
                <!-- PDF indirme görüntüleyicinin kendi indir butonundan yapılır -->
                <button v-if="kalem.uretilen.pdf" type="button" @click="goruntule(kalem.uretilen.pdf)"
                  :disabled="yazdirmaMesgul"
                  class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20] disabled:opacity-40">
                  PDF Görüntüle
                </button>
                <button v-if="kalem.uretilen.docx" type="button"
                  @click="indir(kalem.uretilen.docx, kalemDosyaAdi(kalem, kalem.uretilen.docx))"
                  :disabled="yazdirmaMesgul"
                  class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20] disabled:opacity-40">
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

    <SilmeOnayi :acik="sifirlaOnayAcik"
      aciklama="Üretilmiş tüm DOCX/PDF belgeler ve linkleri silinecek (yüklü dosyalar etkilenmez). Emin misiniz?"
      @vazgec="sifirlaOnayAcik = false" @onayla="sifirla" />

    <!-- Tümünü İndir ZIP linki -->
    <LinkPopup v-model:acik="zipAcik" :url="zipUrl" :hata="zipHata"
      bekleme-metni="ZIP oluşturuluyor…"
      aciklama="Tüm dosyalar numaralı adlarla tek ZIP'te toplandı." />
  </Teleport>
</template>
