<script setup lang="ts">
import { IonPage, IonContent, IonHeader, onIonViewWillEnter } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getDenetim, updateDenetim,
  type Denetim, type DenetimFirmaOzet, type DenetimAsansorOzet, type DenetimGuncelleme,
  type DenetimAksam,
} from '@/services/denetimService';
import { getAksamBelgeleri, getAksamBelgesi, type AksamBelgesi } from '@/services/aksamBelgesiService';
import { uploadDosya, getDosyaUrl, getDosyaIndirUrl, createDosyaLinkleri, type BelgeSlot } from '@/services/dosyaService';
import { getFirma } from '@/services/firmaService';
import FotoCekModal from '@/components/FotoCekModal.vue';
import { getAsansor } from '@/services/asansorService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import { blurActive } from '@/utils/blurActive';
import { denetimDosyaSlotlari, denetimPdfBlob } from '@/utils/denetimPdf';
import { asansorSemaCizimleri } from '@/utils/semaPdf';
import FirmaBilgiModal from '@/components/FirmaBilgiModal.vue';
import AsansorBilgiModal from '@/components/AsansorBilgiModal.vue';
import LinkPopup from '@/components/LinkPopup.vue';
import SilmeOnayi from '@/components/SilmeOnayi.vue';

// Denetim detayı (Modul G): firma ve asansör kısa bilgileri, ek proje
// dosyası (PDF/ZIP) ve AB uygunluk beyanı / son kontrol tarihleri.
// Alanlar yerinde düzenlenir, her değişiklik anında kaydedilir.
const route = useRoute();
const router = useRouter();

const id = computed(() => route.params.id as string);

const denetim = ref<Denetim | null>(null);
const yukleniyor = ref(false);
const hata = ref('');

async function yukle() {
  yukleniyor.value = true;
  hata.value = '';
  try {
    denetim.value = await getDenetim(id.value);
    // Modul B: komponent butonları için katalog baştan yüklenir
    if (denetim.value?.modul === 'Modul B') katalogYukle();
    // Modul E / H1: firmanın kalibrasyon (Cihazlar sekmesi) dosyaları çekilir
    if (MONTAJLI_MODULLER.includes(denetim.value?.modul ?? '')) {
      const f = denetim.value.firmaId;
      const firmaIdDeger = f && typeof f === 'object' ? f._id : f;
      if (firmaIdDeger) {
        getFirma(firmaIdDeger)
          .then((tam) => (firmaKalibrasyon.value = tam.cihazDosyalari ?? []))
          .catch(() => { /* alınamazsa kalibrasyon bölümü boş görünür */ });
      }
    }
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Denetim yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

onIonViewWillEnter(yukle);

function geri() {
  blurActive();
  router.back();
}

async function guncelle(degisiklik: DenetimGuncelleme) {
  const d = denetim.value;
  if (!d) return;
  try {
    denetim.value = await updateDenetim(d._id, degisiklik);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kaydedilemedi';
  }
}

// Populate edilmiş firma/asansör özetleri
const firma = computed(() => {
  const f = denetim.value?.firmaId;
  return f && typeof f === 'object' ? (f as DenetimFirmaOzet) : null;
});

const asansor = computed(() => {
  const a = denetim.value?.asansorId;
  return a && typeof a === 'object' ? (a as DenetimAsansorOzet) : null;
});

function konum(v: { il?: string; ilce?: string } | null) {
  return v ? [v.ilce, v.il].filter(Boolean).join('/') : '';
}

// Kartlara dokununca tüm bilgiler popup'ta görüntülenir
const firmaBilgiAcik = ref(false);
const asansorBilgiAcik = ref(false);

function tarih(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR') : '—';
}

// ISO 8601 → date input değeri (yyyy-MM-dd)
function tarihInput(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : '';
}

function tarihKaydet(alan: 'abUygunlukBeyaniTarihi' | 'sonKontrolTarihi', event: Event) {
  guncelle({ [alan]: (event.target as HTMLInputElement).value || null });
}

// ---- Uygulama projesi (PDF veya ZIP) ----
const ekProjeYukleniyor = ref(false);

// PDF görüntülenir; ZIP görüntülenemediği için indirilir
const ekProjePdf = computed(() => denetim.value?.ekProje?.mimeType === 'application/pdf');

async function ekProjeSec(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  ekProjeYukleniyor.value = true;
  hata.value = '';
  try {
    const slot = await uploadDosya(file);
    await guncelle({ ekProje: slot });
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Dosya yüklenemedi';
  } finally {
    ekProjeYukleniyor.value = false;
  }
}

// ---- Modul B: tip projeleri (ZIP) — yükleme hep listenin sonuna ekler ----
const modulB = computed(() => denetim.value?.modul === 'Modul B');
const tipProjeYukleniyor = ref(false);
const tipProjeSilinecek = ref<number | null>(null);

async function tipProjeSec(event: Event) {
  const input = event.target as HTMLInputElement;
  const dosyalar = Array.from(input.files ?? []);
  input.value = '';
  const d = denetim.value;
  if (!d || !dosyalar.length) return;
  tipProjeYukleniyor.value = true;
  hata.value = '';
  try {
    const yeni = [...(d.tipProjeler ?? [])];
    for (const dosya of dosyalar) {
      yeni.push(await uploadDosya(dosya));
    }
    await guncelle({ tipProjeler: yeni });
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Dosya yüklenemedi';
  } finally {
    tipProjeYukleniyor.value = false;
  }
}

async function tipProjeSilOnayla() {
  const d = denetim.value;
  const i = tipProjeSilinecek.value;
  tipProjeSilinecek.value = null;
  if (!d || i == null) return;
  const yeni = [...(d.tipProjeler ?? [])];
  yeni.splice(i, 1);
  await guncelle({ tipProjeler: yeni });
}

// ---- Modul B: güvenlik aksamı seçimi — katalogdan (Ayarlar > Güvenlik
// Aksamları) komponent başına en çok 10 satır eklenir ----
const AKSAM_MAX = 10;
// Hangi komponentin ekleme popup'ının açık olduğu (null: kapalı)
const aksamSecKod = ref<string | null>(null);
const katalog = ref<AksamBelgesi[]>([]);
const katalogYukleniyor = ref(false);
const aksamKaydediliyor = ref(false);

// Rapor tipleri (sarkaç, yangın) bu alanın kapsamı dışındadır
const HARIC_KODLAR = ['sarkac_test_raporu', 'yangin_sizdirmazlik_raporu'];

function katalogYukle() {
  if (katalog.value.length || katalogYukleniyor.value) return;
  katalogYukleniyor.value = true;
  getAksamBelgeleri({ kategori: 'guvenlik_aksami', durum: 'aktif' })
    .then((liste) => (katalog.value = liste.filter((b) => !HARIC_KODLAR.includes(b.bilesenTipiKodu))))
    .catch(() => { /* katalog alınamazsa komponent alanları boş kalır */ })
    .finally(() => (katalogYukleniyor.value = false));
}

// Komponent ekleme butonları katalogdan türetilir
const bilesenler = computed(() => {
  const gorulen = new Map<string, string>();
  for (const b of katalog.value) {
    if (!gorulen.has(b.bilesenTipiKodu)) gorulen.set(b.bilesenTipiKodu, b.bilesenTipiAdi);
  }
  return [...gorulen].map(([kod, ad]) => ({ kod, ad }));
});

function aksamSecimAc(kod: string) {
  aksamArama.value = '';
  aksamSecKod.value = kod;
}

// Popup içi arama: marka, tip ve sertifika no üzerinde filtreler
const aksamArama = ref('');

function aksamAdet(kod: string | null) {
  if (!kod) return 0;
  return (denetim.value?.guvenlikAksamlari ?? []).filter((a) => a.bilesenTipiKodu === kod).length;
}

// Popup: katalog, komponent başlıkları altında marka+tip satırlarına açılır.
// Eklenmiş satırlar listeden düşer (tekrar eklenemez); üst sınıra ulaşan
// komponentin kalan seçenekleri gizlenir.
interface AksamSecenek { belge: AksamBelgesi; tip: string }

const katalogGruplari = computed(() => {
  const eklenmis = new Set(
    (denetim.value?.guvenlikAksamlari ?? []).map((a) => `${a.belgeId}|${a.tip}`)
  );
  const gruplar: { kod: string; ad: string; adet: number; secenekler: AksamSecenek[] }[] = [];
  for (const belge of katalog.value) {
    let grup = gruplar.find((g) => g.kod === belge.bilesenTipiKodu);
    if (!grup) {
      grup = {
        kod: belge.bilesenTipiKodu, ad: belge.bilesenTipiAdi,
        adet: aksamAdet(belge.bilesenTipiKodu), secenekler: [],
      };
      gruplar.push(grup);
    }
    // Tipi olmayan belge tek satır olarak sunulur
    for (const tip of (belge.tipler.length ? belge.tipler : [''])) {
      if (!eklenmis.has(`${belge._id}|${tip}`)) grup.secenekler.push({ belge, tip });
    }
  }
  return gruplar;
});

// Açık popup'ın komponent grubu + arama filtresi uygulanmış seçenekleri
const seciliGrup = computed(
  () => katalogGruplari.value.find((g) => g.kod === aksamSecKod.value) ?? null
);

const suzulmusSecenekler = computed(() => {
  const grup = seciliGrup.value;
  if (!grup) return [];
  const arama = aksamArama.value.trim().toLocaleLowerCase('tr');
  if (!arama) return grup.secenekler;
  return grup.secenekler.filter((s) =>
    [s.belge.marka, s.tip, s.belge.sertifikaNo]
      .some((alan) => alan.toLocaleLowerCase('tr').includes(arama))
  );
});

async function aksamEkle(secenek: AksamSecenek) {
  const d = denetim.value;
  const belge = secenek.belge;
  if (!d || aksamKaydediliyor.value) return;
  if (aksamAdet(belge.bilesenTipiKodu) >= AKSAM_MAX) return;
  aksamKaydediliyor.value = true;
  try {
    await guncelle({
      guvenlikAksamlari: [...(d.guvenlikAksamlari ?? []), {
        bilesenTipiKodu: belge.bilesenTipiKodu,
        bilesenTipiAdi: belge.bilesenTipiAdi,
        belgeId: belge._id,
        marka: belge.marka,
        tip: secenek.tip,
        sertifikaNo: belge.sertifikaNo,
      }],
    });
  } finally {
    aksamKaydediliyor.value = false;
  }
}

// Bir komponentin eklenmiş satırları (dizideki asıl index korunur)
function grupSatirlari(kod: string) {
  const satirlar: { aksam: DenetimAksam; i: number }[] = [];
  (denetim.value?.guvenlikAksamlari ?? []).forEach((aksam, i) => {
    if (aksam.bilesenTipiKodu === kod) satirlar.push({ aksam, i });
  });
  return satirlar;
}

// Seçilenler: komponent grupları açılır/kapanır (varsayılan açık)
const kapaliGruplar = ref<Record<string, boolean>>({});

function grupAcik(kod: string) {
  return !kapaliGruplar.value[kod];
}

function grupToggle(kod: string) {
  kapaliGruplar.value[kod] = grupAcik(kod);
}

// Çoklu seçim (guvenlikAksamlari dizisindeki indexler) + toplu silme
const aksamIsaretliler = ref<Set<number>>(new Set());
const aksamTopluSilOnay = ref(false);

function aksamIsaretToggle(i: number) {
  const yeni = new Set(aksamIsaretliler.value);
  if (yeni.has(i)) yeni.delete(i);
  else yeni.add(i);
  aksamIsaretliler.value = yeni;
}

async function aksamTopluSilOnayla() {
  const d = denetim.value;
  aksamTopluSilOnay.value = false;
  if (!d || !aksamIsaretliler.value.size) return;
  const yeni = (d.guvenlikAksamlari ?? []).filter((_, i) => !aksamIsaretliler.value.has(i));
  await guncelle({ guvenlikAksamlari: yeni });
  aksamIsaretliler.value = new Set();
}

// Satırın sertifika belgesi katalogdan bulunarak görüntülenir
async function aksamBelgeAc(aksam: DenetimAksam) {
  if (!aksam.belgeId) return;
  try {
    const belge = katalog.value.find((b) => b._id === aksam.belgeId)
      ?? await getAksamBelgesi(aksam.belgeId);
    if (belge.dosya) await ekProjeAc(belge.dosya);
  } catch {
    hata.value = 'Belge açılamadı';
  }
}

// ---- Modul E ve Modul H1: montaj sözleşmesi + malzeme faturası (dosya
// yükleme ve fotoğraf çekme, hep listenin sonuna ekler) + firmanın
// kalibrasyon (Cihazlar) dosyalarının salt görüntülenmesi ----
const MONTAJLI_MODULLER = ['Modul E', 'Modul H1'];
const modulE = computed(() => MONTAJLI_MODULLER.includes(denetim.value?.modul ?? ''));
const montajYukleniyor = ref(false);
const faturaYukleniyor = ref(false);
const montajFotoAcik = ref(false);
const faturaFotoAcik = ref(false);
const montajSilinecek = ref<number | null>(null);
const faturaSilinecek = ref<number | null>(null);
const firmaKalibrasyon = ref<BelgeSlot[]>([]);

// PDF/resim dışındakiler elenir (gizli inputların accept filtresiyle uyumlu)
function dosyalariSuz(input: HTMLInputElement) {
  const files = Array.from(input.files ?? []).filter(
    (f) => f.type === 'application/pdf' || f.type.startsWith('image/')
  );
  input.value = '';
  return files;
}

async function denetimListeyeEkle(
  alan: 'montajSozlesmeleri' | 'malzemeFaturalari',
  files: File[],
  yukleniyor: typeof montajYukleniyor
) {
  const d = denetim.value;
  if (!d || !files.length) return;
  yukleniyor.value = true;
  hata.value = '';
  try {
    const slotlar: BelgeSlot[] = [];
    for (const file of files) slotlar.push(await uploadDosya(file));
    await guncelle({ [alan]: [...(d[alan] ?? []), ...slotlar] });
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    yukleniyor.value = false;
  }
}

function montajEkle(files: File[]) {
  return denetimListeyeEkle('montajSozlesmeleri', files, montajYukleniyor);
}

function montajDosyaSec(event: Event) {
  montajEkle(dosyalariSuz(event.target as HTMLInputElement));
}

function faturaEkle(files: File[]) {
  return denetimListeyeEkle('malzemeFaturalari', files, faturaYukleniyor);
}

function faturaDosyaSec(event: Event) {
  faturaEkle(dosyalariSuz(event.target as HTMLInputElement));
}

async function denetimListedenSil(
  alan: 'montajSozlesmeleri' | 'malzemeFaturalari',
  i: number | null
) {
  const d = denetim.value;
  if (!d || i == null) return;
  const liste = [...(d[alan] ?? [])];
  liste.splice(i, 1);
  await guncelle({ [alan]: liste });
}

function montajSilOnayla() {
  const i = montajSilinecek.value;
  montajSilinecek.value = null;
  denetimListedenSil('montajSozlesmeleri', i);
}

function faturaSilOnayla() {
  const i = faturaSilinecek.value;
  faturaSilinecek.value = null;
  denetimListedenSil('malzemeFaturalari', i);
}

// ---- PDF rapor linki: popup açılır açılmaz sayfadaki tüm bilgiler
// (popup'lardaki tam firma + asansör içerikleriyle) PDF'e dökülür, dosya
// linkleri PDF içine tıklanabilir gömülür, rapor yüklenip paylaşılabilir
// (7 gün geçerli) indirme linki üretilir ----
const pdfLinkAcik = ref(false);
const pdfLinkUrl = ref('');
const pdfLinkHata = ref('');
const pdfDosyaAdi = ref('');

async function pdfLinkOlustur() {
  const d = denetim.value;
  if (!d) return;
  pdfLinkAcik.value = true;
  pdfLinkUrl.value = '';
  pdfLinkHata.value = '';
  try {
    // Özet yerine popup'lardaki tam kayıtlar çekilir
    const [tamFirma, tamAsansor] = await Promise.all([
      firma.value ? getFirma(firma.value._id) : Promise.resolve(null),
      asansor.value ? getAsansor(asansor.value._id) : Promise.resolve(null),
    ]);
    const slotlar = denetimDosyaSlotlari(d, tamFirma, tamAsansor);
    const linkler = slotlar.length
      ? await createDosyaLinkleri(slotlar.map((s) => ({ dosyaAnahtari: s.dosyaAnahtari, dosyaAdi: s.dosyaAdi })))
      : {};
    // Şema çizimleri (kabin, kapı, halat, ray, kuyu dip/üst) ölçüleriyle PDF'e girer
    const semalar = tamAsansor ? asansorSemaCizimleri(tamAsansor) : {};
    const blob = await denetimPdfBlob({ denetim: d, firma: tamFirma, asansor: tamAsansor, linkler, semalar });
    const dosyaAdi = [
      d.modul.replace(/\s+/g, ''),
      'Denetimi',
      tamAsansor?.seriNo || tamFirma?.ad.replace(/\s+/g, '-') || '',
    ].filter(Boolean).join('-') + '.pdf';
    pdfDosyaAdi.value = dosyaAdi;
    const slot = await uploadDosya(new File([blob], dosyaAdi, { type: 'application/pdf' }));
    const pdfLinkler = await createDosyaLinkleri([slot]);
    pdfLinkUrl.value = pdfLinkler[slot.dosyaAnahtari];
  } catch (e) {
    pdfLinkHata.value = e instanceof Error ? e.message : 'PDF oluşturulamadı';
  }
}

const { openFile } = useFileViewer();

// PDF görüntüleyicide açılır; ZIP görüntülenemediği için indirmeye düşer
async function ekProjeAc(slot: BelgeSlot) {
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
</script>

<template>
  <ion-page>
    <!-- Header: scroll boyunca üstte sabit -->
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-bar">
        <header class="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <button type="button" @click="geri"
            class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 class="min-w-0 flex-1 truncate text-base font-bold leading-8 tracking-wide text-ink">
            {{ denetim?.modul || 'Denetim' }} Denetimi
          </h1>
          <span v-if="denetim"
            class="shrink-0 bg-[#1c2a21] px-2 py-0.5 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
            {{ tarih(denetim.denetimTarihi) }}
          </span>
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg space-y-2 px-4 py-4">
        <div v-if="hata"
          class="flex items-center gap-2 bg-red-950/60 px-3 py-2 ring-1 ring-red-500/20">
          <span class="min-w-0 flex-1 text-sm text-red-300">{{ hata }}</span>
          <button type="button" @click="yukle"
            class="shrink-0 bg-surface-800 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-white/10">
            Tekrar Dene
          </button>
        </div>

        <p v-if="yukleniyor" class="py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>

        <template v-else-if="denetim">
          <!-- PDF rapor linki: tüm bilgiler + dosya linkleri tek PDF'te -->
          <button type="button" @click="pdfLinkOlustur"
            class="flex w-full items-center justify-center gap-1.5 bg-[#2b5c3d] px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Link Oluştur (PDF Rapor)
          </button>

          <!-- Firma kısa bilgileri — dokununca tüm bilgiler popup'ta açılır -->
          <button type="button" @click="firmaBilgiAcik = true"
            class="flex w-full items-center gap-2 bg-surface-800 p-3 text-left ring-1 ring-white/5 active:bg-[#1a2a20]">
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-bold uppercase tracking-wide text-ink">Asansör Firması</span>
              <span class="mt-1 block text-xs font-semibold text-ink">{{ firma?.ad || '—' }}</span>
              <span v-if="firma?.unvan" class="mt-0.5 block text-[11px] text-ink-muted">{{ firma.unvan }}</span>
              <span v-if="firma?.telefon || konum(firma)"
                class="mt-0.5 block text-[11px] text-ink-muted/80">
                {{ [firma?.telefon, konum(firma)].filter(Boolean).join(' • ') }}
              </span>
            </span>
            <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <!-- Asansör kısa bilgisi — dokununca tüm bilgiler popup'ta açılır -->
          <button type="button" @click="asansorBilgiAcik = true"
            class="flex w-full items-center gap-2 bg-surface-800 p-3 text-left ring-1 ring-white/5 active:bg-[#1a2a20]">
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-bold uppercase tracking-wide text-ink">Asansör</span>
              <span class="mt-1 block text-xs font-semibold text-ink">
                {{ asansor?.seriNo || asansor?.yapiRuhsatNo || '—' }}
              </span>
              <span v-if="asansor?.yapiRuhsatNo && asansor?.seriNo"
                class="mt-0.5 block text-[11px] text-ink-muted">
                Ruhsat No: {{ asansor.yapiRuhsatNo }}
              </span>
              <span v-if="konum(asansor)" class="mt-0.5 block text-[11px] text-ink-muted/80">{{ konum(asansor) }}</span>
            </span>
            <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <!-- Uygulama projesi: PDF görüntülenir, ZIP indirilir -->
          <section class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">Uygulama Projesi</h2>
            <div class="flex items-center gap-1.5">
              <label
                class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                <input type="file" class="hidden"
                  accept="application/pdf,application/zip,application/x-zip-compressed,.pdf,.zip"
                  @change="ekProjeSec" />
                {{ ekProjeYukleniyor ? 'Yükleniyor…' : denetim.ekProje ? 'Değiştir' : '+ Proje Yükle (PDF/ZIP)' }}
              </label>
              <span class="min-w-0 flex-1 truncate text-xs"
                :class="denetim.ekProje ? 'text-ink' : 'text-ink-muted/60'">
                {{ denetim.ekProje?.dosyaAdi ?? 'Proje yüklenmedi' }}
              </span>
              <button v-if="denetim.ekProje" type="button" @click="ekProjeAc(denetim.ekProje)"
                :aria-label="ekProjePdf ? 'Projeyi görüntüle' : 'Projeyi indir'"
                class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                <!-- PDF: göz (görüntüle) — ZIP: ok (indir) -->
                <svg v-if="ekProjePdf" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3v12" />
                  <path d="m8 11 4 4 4-4" />
                  <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
              </button>
              <button v-if="denetim.ekProje" type="button" @click="guncelle({ ekProje: null })"
                aria-label="Projeyi kaldır"
                class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                ✕
              </button>
            </div>
          </section>

          <!-- Modul B: tip projeleri (ZIP) — yükleme hep listenin sonuna ekler -->
          <section v-if="modulB" class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-xs font-bold uppercase tracking-wide text-ink">
                Tip Projeler ({{ denetim.tipProjeler?.length ?? 0 }})
              </h2>
              <label
                class="flex shrink-0 cursor-pointer items-center gap-1 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                <input type="file" multiple class="hidden"
                  accept="application/zip,application/x-zip-compressed,.zip"
                  @change="tipProjeSec" />
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="m17 8-5-5-5 5" />
                  <path d="M12 3v12" />
                </svg>
                {{ tipProjeYukleniyor ? 'Yükleniyor…' : '+ ZIP Yükle' }}
              </label>
            </div>

            <p v-if="!denetim.tipProjeler?.length" class="py-2 text-xs text-ink-muted/60">
              Henüz tip projesi yüklenmedi. "+ ZIP Yükle" ile ekleyin; her yükleme listeye eklenir.
            </p>
            <div v-for="(proje, i) in denetim.tipProjeler ?? []" :key="proje.dosyaAnahtari + i"
              class="flex items-center gap-1.5 bg-surface-900/60 p-2 ring-1 ring-white/5">
              <span class="min-w-0 flex-1 truncate text-xs text-ink">{{ proje.dosyaAdi }}</span>
              <button type="button" @click="ekProjeAc(proje)" aria-label="Tip projesini indir"
                class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3v12" />
                  <path d="m8 11 4 4 4-4" />
                  <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
              </button>
              <button type="button" @click="tipProjeSilinecek = i" aria-label="Tip projesini sil"
                class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                ✕
              </button>
            </div>
          </section>

          <!-- Modul B: güvenlik aksamı seçimleri — komponent başına en çok 10 -->
          <section v-if="modulB" class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-xs font-bold uppercase tracking-wide text-ink">
                Güvenlik Aksamları ({{ denetim.guvenlikAksamlari?.length ?? 0 }})
              </h2>
              <button v-if="aksamIsaretliler.size" type="button" @click="aksamTopluSilOnay = true"
                class="shrink-0 bg-red-950/60 px-2.5 py-1.5 text-[11px] font-semibold text-red-300 ring-1 ring-red-500/30 active:bg-red-950">
                Listeden Çıkar ({{ aksamIsaretliler.size }})
              </button>
            </div>

            <p v-if="katalogYukleniyor && !bilesenler.length" class="py-1 text-[11px] text-ink-muted">
              Katalog yükleniyor…
            </p>
            <p v-else-if="!bilesenler.length" class="py-1 text-[11px] text-ink-muted/60">
              Katalogda aktif güvenlik aksamı belgesi yok. Belgeler,
              Ayarlar &gt; Güvenlik Aksamları'ndan eklenir.
            </p>

            <!-- Her komponent kendi alanında: başlık (açılır/kapanır) + kendi
              Ekle butonu + eklenen satırları -->
            <div v-for="b in bilesenler" :key="b.kod" class="bg-surface-900/40 ring-1 ring-white/5">
              <div class="flex items-center gap-1.5 p-2">
                <button type="button" @click="grupToggle(b.kod)"
                  class="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                  <svg class="h-4 w-4 shrink-0 text-ink-muted/60 transition-transform"
                    :class="grupAcik(b.kod) ? 'rotate-180' : ''" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                  <span class="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-wide text-ink">
                    {{ b.ad }}
                    <span class="font-semibold normal-case text-ink-muted/80">
                      ({{ aksamAdet(b.kod) }}/{{ AKSAM_MAX }})
                    </span>
                  </span>
                </button>
                <button type="button" @click="aksamSecimAc(b.kod)"
                  :disabled="aksamAdet(b.kod) >= AKSAM_MAX"
                  class="flex shrink-0 items-center gap-1 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-40">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2.5" stroke-linecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Ekle
                </button>
              </div>

              <div v-if="grupAcik(b.kod)" class="space-y-1 px-2 pb-2">
                <p v-if="!grupSatirlari(b.kod).length" class="text-[11px] text-ink-muted/50">
                  Henüz eklenmedi.
                </p>
                <div v-for="{ aksam, i } in grupSatirlari(b.kod)" :key="aksam._id ?? i"
                  class="flex items-center gap-1.5 bg-surface-900/60 p-2 ring-1 ring-white/5">
                  <!-- Satıra dokununca işaretlenir (çoklu seçim) -->
                  <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left"
                    @click="aksamIsaretToggle(i)">
                    <span class="grid h-5 w-5 shrink-0 place-items-center ring-1"
                      :class="aksamIsaretliler.has(i) ? 'bg-[#2b5c3d] ring-white/20' : 'bg-surface-900 ring-white/15'">
                      <svg v-if="aksamIsaretliler.has(i)" class="h-3.5 w-3.5 text-ink"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-xs font-semibold text-ink">
                        {{ [aksam.marka, aksam.tip].filter(Boolean).join(' — ') || '—' }}
                      </span>
                      <span v-if="aksam.sertifikaNo"
                        class="mt-0.5 block truncate text-[11px] text-ink-muted/80">
                        Sertifika: {{ aksam.sertifikaNo }}
                      </span>
                    </span>
                  </button>
                  <button v-if="aksam.belgeId" type="button" @click="aksamBelgeAc(aksam)"
                    aria-label="Sertifika belgesini görüntüle"
                    class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

          </section>

          <!-- Modul E: montaj sözleşmesi — dosya yükleme + fotoğraf çekme -->
          <section v-if="modulE" class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-xs font-bold uppercase tracking-wide text-ink">
                Montaj Sözleşmesi ({{ denetim.montajSozlesmeleri?.length ?? 0 }})
              </h2>
              <div class="flex shrink-0 gap-1.5">
                <label
                  class="flex cursor-pointer items-center gap-1 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                  <input type="file" multiple accept="application/pdf,image/*" class="hidden"
                    @change="montajDosyaSec" />
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m17 8-5-5-5 5" />
                    <path d="M12 3v12" />
                  </svg>
                  Dosya Yükle
                </label>
                <button type="button" @click="montajFotoAcik = true"
                  class="flex items-center gap-1 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  Fotoğraf Çek
                </button>
              </div>
            </div>

            <p v-if="montajYukleniyor" class="py-1 text-center text-[11px] text-ink-muted">Yükleniyor…</p>
            <p v-if="!denetim.montajSozlesmeleri?.length && !montajYukleniyor"
              class="py-2 text-xs text-ink-muted/60">
              Henüz montaj sözleşmesi eklenmedi.
            </p>
            <div v-for="(d, i) in denetim.montajSozlesmeleri ?? []" :key="d.dosyaAnahtari + i"
              class="flex items-center gap-1.5 bg-surface-900/60 p-2 ring-1 ring-white/5">
              <span class="min-w-0 flex-1 truncate text-xs text-ink">{{ d.dosyaAdi }}</span>
              <button type="button" @click="ekProjeAc(d)" aria-label="Dosyayı görüntüle"
                class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <button type="button" @click="montajSilinecek = i" aria-label="Dosyayı sil"
                class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                ✕
              </button>
            </div>
          </section>

          <!-- Modul E: malzeme faturaları — dosya yükleme + fotoğraf çekme -->
          <section v-if="modulE" class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-xs font-bold uppercase tracking-wide text-ink">
                Malzeme Fatura ({{ denetim.malzemeFaturalari?.length ?? 0 }})
              </h2>
              <div class="flex shrink-0 gap-1.5">
                <label
                  class="flex cursor-pointer items-center gap-1 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                  <input type="file" multiple accept="application/pdf,image/*" class="hidden"
                    @change="faturaDosyaSec" />
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m17 8-5-5-5 5" />
                    <path d="M12 3v12" />
                  </svg>
                  Dosya Yükle
                </label>
                <button type="button" @click="faturaFotoAcik = true"
                  class="flex items-center gap-1 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  Fotoğraf Çek
                </button>
              </div>
            </div>

            <p v-if="faturaYukleniyor" class="py-1 text-center text-[11px] text-ink-muted">Yükleniyor…</p>
            <p v-if="!denetim.malzemeFaturalari?.length && !faturaYukleniyor"
              class="py-2 text-xs text-ink-muted/60">
              Henüz malzeme faturası eklenmedi.
            </p>
            <div v-for="(d, i) in denetim.malzemeFaturalari ?? []" :key="d.dosyaAnahtari + i"
              class="flex items-center gap-1.5 bg-surface-900/60 p-2 ring-1 ring-white/5">
              <span class="min-w-0 flex-1 truncate text-xs text-ink">{{ d.dosyaAdi }}</span>
              <button type="button" @click="ekProjeAc(d)" aria-label="Dosyayı görüntüle"
                class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <button type="button" @click="faturaSilinecek = i" aria-label="Dosyayı sil"
                class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                ✕
              </button>
            </div>
          </section>

          <!-- Modul E: firmanın kalibrasyon cihaz dosya ve resimleri (salt
            görüntüleme; yönetimi Firmalar > Cihazlar sekmesinde) -->
          <section v-if="modulE" class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">
              Firma Kalibrasyon — Cihazlar ({{ firmaKalibrasyon.length }})
            </h2>
            <p class="text-[11px] text-ink-muted">
              Dosyalar firmanın Cihazlar sekmesinden gelir; ekleme/silme
              Firmalar &gt; Cihazlar'dan yapılır.
            </p>
            <p v-if="!firmaKalibrasyon.length" class="py-2 text-xs text-ink-muted/60">
              Firmada kayıtlı kalibrasyon dosyası yok.
            </p>
            <div v-for="(d, i) in firmaKalibrasyon" :key="d.dosyaAnahtari + i"
              class="flex items-center gap-1.5 bg-surface-900/60 p-2 ring-1 ring-white/5">
              <span class="min-w-0 flex-1 truncate text-xs text-ink">{{ d.dosyaAdi }}</span>
              <button type="button" @click="ekProjeAc(d)" aria-label="Dosyayı görüntüle"
                class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </section>

          <!-- Tarihler: değişiklik anında kaydedilir -->
          <section class="space-y-2 bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">Tarihler</h2>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">AB Uygunluk Beyanı Tarihi</span>
              <input :value="tarihInput(denetim.abUygunlukBeyaniTarihi)" type="date"
                @change="tarihKaydet('abUygunlukBeyaniTarihi', $event)"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Son Kontrol Tarihi</span>
              <input :value="tarihInput(denetim.sonKontrolTarihi)" type="date"
                @change="tarihKaydet('sonKontrolTarihi', $event)"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
          </section>
        </template>
      </div>
    </ion-content>

    <!-- Aksam seçim popup'ı — tam sayfa, tek komponent: o komponentin katalog
      belgeleri (marka — tip) listelenir; dokununca eklenir ve listeden düşer.
      Üstteki arama marka/tip/sertifika üzerinde filtreler -->
    <Teleport to="body">
      <div v-if="aksamSecKod != null" class="fixed inset-0 z-50 flex flex-col bg-[#101a14]">
        <div
          class="flex shrink-0 items-center justify-between border-b border-white/5 bg-surface-bar px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 class="truncate text-sm font-bold text-ink">
            {{ seciliGrup?.ad ?? 'Güvenlik Aksamı' }} Ekle
            <span v-if="seciliGrup" class="font-semibold text-ink-muted/80">
              ({{ seciliGrup.adet }}/{{ AKSAM_MAX }})
            </span>
          </h2>
          <button type="button" @click="aksamSecKod = null"
            class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink-muted ring-1 ring-white/10">
            ✕
          </button>
        </div>

        <!-- Arama: marka / tip / sertifika no -->
        <div class="shrink-0 border-b border-white/5 bg-surface-bar px-4 pb-3">
          <div class="mx-auto max-w-lg">
            <input v-model="aksamArama" type="search" placeholder="Marka veya tip ara…"
              class="w-full bg-surface-800 px-3 py-2 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-auto">
          <div class="mx-auto max-w-lg space-y-1.5 p-4">
            <p v-if="katalogYukleniyor" class="py-6 text-center text-xs text-ink-muted">
              Katalog yükleniyor…
            </p>

            <template v-else-if="seciliGrup">
              <p class="text-[11px] text-ink-muted">
                Satıra dokununca listeye eklenir; eklenenler buradan düşer, tekrar eklenemez.
              </p>

              <p v-if="seciliGrup.adet >= AKSAM_MAX" class="py-2 text-xs text-red-300">
                Bu komponent için üst sınıra ({{ AKSAM_MAX }}) ulaşıldı.
              </p>
              <p v-else-if="!seciliGrup.secenekler.length" class="py-2 text-xs text-ink-muted/60">
                Bu komponentin tüm belgeleri eklendi.
              </p>
              <p v-else-if="!suzulmusSecenekler.length" class="py-2 text-xs text-ink-muted/60">
                Aramayla eşleşen belge yok.
              </p>
              <template v-else>
                <div v-for="s in suzulmusSecenekler" :key="s.belge._id + s.tip"
                  class="flex items-center gap-1.5 bg-surface-800 p-2 ring-1 ring-white/5">
                  <button type="button" class="min-w-0 flex-1 text-left"
                    :disabled="aksamKaydediliyor" @click="aksamEkle(s)">
                    <span class="block truncate text-xs font-semibold text-ink">
                      {{ [s.belge.marka, s.tip].filter(Boolean).join(' — ') || '—' }}
                    </span>
                    <span v-if="s.belge.sertifikaNo"
                      class="mt-0.5 block truncate text-[11px] text-ink-muted/80">
                      Sertifika: {{ s.belge.sertifikaNo }}
                    </span>
                  </button>
                  <button v-if="s.belge.dosya" type="button" @click="ekProjeAc(s.belge.dosya!)"
                    aria-label="Sertifika belgesini görüntüle"
                    class="grid h-6.5 w-8 shrink-0 place-items-center bg-surface-900 text-ink-muted ring-1 ring-white/10 active:text-ink">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button type="button" :disabled="aksamKaydediliyor" @click="aksamEkle(s)"
                    aria-label="Aksamı ekle"
                    class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-50">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2.5" stroke-linecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              </template>
            </template>

            <p v-else class="py-6 text-center text-xs text-ink-muted/60">
              Bu komponent için katalogda belge yok.
            </p>
          </div>
        </div>

        <div
          class="shrink-0 border-t border-white/5 bg-surface-bar p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div class="mx-auto max-w-lg">
            <button type="button" @click="aksamSecKod = null"
              class="w-full bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
              Kapat
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modul E: montaj sözleşmesi ve malzeme faturası foto çekme oturumları -->
    <FotoCekModal v-model:acik="montajFotoAcik" @tamam="montajEkle" />
    <FotoCekModal v-model:acik="faturaFotoAcik" @tamam="faturaEkle" />

    <SilmeOnayi :acik="montajSilinecek != null"
      :aciklama="montajSilinecek != null
        ? `${denetim?.montajSozlesmeleri?.[montajSilinecek]?.dosyaAdi ?? 'Montaj sözleşmesi'} silinecek. Emin misiniz?`
        : ''"
      @vazgec="montajSilinecek = null" @onayla="montajSilOnayla" />
    <SilmeOnayi :acik="faturaSilinecek != null"
      :aciklama="faturaSilinecek != null
        ? `${denetim?.malzemeFaturalari?.[faturaSilinecek]?.dosyaAdi ?? 'Malzeme faturası'} silinecek. Emin misiniz?`
        : ''"
      @vazgec="faturaSilinecek = null" @onayla="faturaSilOnayla" />

    <!-- Silme onayları: tip projesi ve güvenlik aksamı -->
    <SilmeOnayi :acik="tipProjeSilinecek != null"
      :aciklama="tipProjeSilinecek != null
        ? `${denetim?.tipProjeler?.[tipProjeSilinecek]?.dosyaAdi ?? 'Tip projesi'} silinecek. Emin misiniz?`
        : ''"
      @vazgec="tipProjeSilinecek = null" @onayla="tipProjeSilOnayla" />
    <SilmeOnayi :acik="aksamTopluSilOnay"
      :aciklama="`İşaretli ${aksamIsaretliler.size} güvenlik aksamı bu denetimin listesinden çıkarılacak (katalogdan silinmez). Emin misiniz?`"
      @vazgec="aksamTopluSilOnay = false" @onayla="aksamTopluSilOnayla" />

    <!-- Firma / asansör tüm bilgiler popup'ları -->
    <FirmaBilgiModal v-model:acik="firmaBilgiAcik" :firma-id="firma?._id ?? null" />
    <AsansorBilgiModal v-model:acik="asansorBilgiAcik" :asansor-id="asansor?._id ?? null" />

    <!-- PDF rapor linki popup'ı: açılır açılmaz oluşturulur -->
    <LinkPopup v-model:acik="pdfLinkAcik" :url="pdfLinkUrl" :hata="pdfLinkHata"
      bekleme-metni="Denetim raporu PDF'i oluşturuluyor…"
      aciklama="Tüm denetim bilgileri ve dosya linkleri PDF raporda toplandı."
      goruntule-tip="pdf" :goruntule-ad="pdfDosyaAdi || 'Denetim Raporu.pdf'" />
  </ion-page>
</template>
