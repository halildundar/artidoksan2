<script setup lang="ts">
import { IonPage, IonContent, IonHeader, onIonViewWillEnter } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getTescil, updateTescil, type Tescil, type TescilGuncelleme } from '@/services/tescilService';
import type { Denetim, DenetimFirmaOzet, DenetimAsansorOzet } from '@/services/denetimService';
import { uploadDosya, getDosyaUrl, getDosyaIndirUrl, createDosyaLinkleri, type BelgeSlot } from '@/services/dosyaService';
import { getFirma, type Firma, type CeBelgesi } from '@/services/firmaService';
import { getAsansor } from '@/services/asansorService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import { blurActive } from '@/utils/blurActive';
import { bilgiTarih } from '@/utils/firmaBilgi';
import { denetimDosyaSlotlari, denetimPdfBlob } from '@/utils/denetimPdf';
import { asansorSemaCizimleri } from '@/utils/semaPdf';
import FirmaBilgiModal from '@/components/FirmaBilgiModal.vue';
import AsansorBilgiModal from '@/components/AsansorBilgiModal.vue';
import LinkPopup from '@/components/LinkPopup.vue';
import YazdirPopup from '@/components/YazdirPopup.vue';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import FotoCekModal from '@/components/FotoCekModal.vue';

// Tescil detayı — Modul G denetim detayıyla aynı içerik: firma ve asansör
// kısa bilgileri, ek proje dosyası (PDF/ZIP), AB uygunluk beyanı / son
// kontrol tarihleri ve PDF rapor linki. Ek olarak firmanın CE belgelerinden
// tescil dosyasına girecekler seçilir. Alanlar anında kaydedilir.
const route = useRoute();
const router = useRouter();

const id = computed(() => route.params.id as string);

const tescil = ref<Tescil | null>(null);
// CE belge listesi tam firma kaydından gelir (populate edilen özet yetmez)
const tamFirma = ref<Firma | null>(null);
const yukleniyor = ref(false);
const hata = ref('');

async function yukle() {
  yukleniyor.value = true;
  hata.value = '';
  try {
    tescil.value = await getTescil(id.value);
    const f = tescil.value.firmaId;
    const firmaIdDeger = f && typeof f === 'object' ? f._id : f;
    tamFirma.value = firmaIdDeger ? await getFirma(firmaIdDeger) : null;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Tescil yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

onIonViewWillEnter(yukle);

function geri() {
  blurActive();
  router.back();
}

async function guncelle(degisiklik: TescilGuncelleme) {
  const t = tescil.value;
  if (!t) return;
  try {
    tescil.value = await updateTescil(t._id, degisiklik);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kaydedilemedi';
  }
}

// Populate edilmiş firma/asansör özetleri
const firma = computed(() => {
  const f = tescil.value?.firmaId;
  return f && typeof f === 'object' ? (f as DenetimFirmaOzet) : null;
});

const asansor = computed(() => {
  const a = tescil.value?.asansorId;
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

function tarihKaydet(
  alan: 'abUygunlukBeyaniTarihi' | 'sonKontrolTarihi' | 'dilekceTarihi'
    | 'garantiTarihi' | 'faturaTarihi' | 'projeHizmetSozlesmeTarihi',
  event: Event
) {
  guncelle({ [alan]: (event.target as HTMLInputElement).value || null });
}

function metinKaydet(alan: 'belediyeAdi' | 'faturaNo', event: Event) {
  const deger = (event.target as HTMLInputElement).value.trim();
  if (deger === (tescil.value?.[alan] ?? '')) return;
  guncelle({ [alan]: deger });
}

// ---- CE belgeleri: "CE Belgesi Seç" popup'ında firmanın listesinden
// işaretlenir; sayfada yalnızca seçilenler metin listesi olarak görünür ----
const ceBelgeleri = computed(() => tamFirma.value?.ceBelgeleri ?? []);
const secilenCeler = computed(() =>
  ceBelgeleri.value.filter((ce) => ce._id && (tescil.value?.ceBelgeIdleri ?? []).includes(ce._id))
);

const ceSecAcik = ref(false);
// Popup içindeki geçici seçim — Tamam'a basılınca kaydedilir
const ceSecim = ref<string[]>([]);
const ceKaydediliyor = ref(false);

function ceSecimAc() {
  ceSecim.value = [...(tescil.value?.ceBelgeIdleri ?? [])];
  ceSecAcik.value = true;
}

function ceSecimde(ceId: string | undefined) {
  return !!ceId && ceSecim.value.includes(ceId);
}

function ceSecimToggle(ceId: string | undefined) {
  if (!ceId) return;
  ceSecim.value = ceSecim.value.includes(ceId)
    ? ceSecim.value.filter((x) => x !== ceId)
    : [...ceSecim.value, ceId];
}

async function ceSecimKaydet() {
  if (ceKaydediliyor.value) return;
  ceKaydediliyor.value = true;
  try {
    await guncelle({ ceBelgeIdleri: ceSecim.value });
    ceSecAcik.value = false;
  } finally {
    ceKaydediliyor.value = false;
  }
}

// Listeden çıkarma SilmeOnayi ile onaylanır
const ceCikarilacak = ref<CeBelgesi | null>(null);

async function ceCikarOnayla() {
  const ce = ceCikarilacak.value;
  ceCikarilacak.value = null;
  if (!ce?._id) return;
  await guncelle({
    ceBelgeIdleri: (tescil.value?.ceBelgeIdleri ?? []).filter((x) => x !== ce._id),
  });
}

// ---- Uygulama projesi (PDF veya ZIP) ----
const ekProjeYukleniyor = ref(false);

// PDF görüntülenir; ZIP görüntülenemediği için indirilir
const ekProjePdf = computed(() => tescil.value?.ekProje?.mimeType === 'application/pdf');

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

// ---- Yeşil etiket raporu (PDF): yüklenir, görüntülenir ----
const yesilEtiketYukleniyor = ref(false);

async function yesilEtiketSec(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  yesilEtiketYukleniyor.value = true;
  hata.value = '';
  try {
    const slot = await uploadDosya(file);
    await guncelle({ yesilEtiketRaporu: slot });
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Dosya yüklenemedi';
  } finally {
    yesilEtiketYukleniyor.value = false;
  }
}

// ---- Faturalar: çoklu dosya yükleme + fotoğraf çekme ----
const faturaYukleniyor = ref(false);
const faturaFotoAcik = ref(false);
const faturaSilinecek = ref<number | null>(null);

// PDF/resim dışındakiler elenir (gizli inputun accept filtresiyle uyumlu)
function dosyalariSuz(input: HTMLInputElement) {
  const files = Array.from(input.files ?? []).filter(
    (f) => f.type === 'application/pdf' || f.type.startsWith('image/')
  );
  input.value = '';
  return files;
}

async function faturaEkle(files: File[]) {
  const t = tescil.value;
  if (!t || !files.length) return;
  faturaYukleniyor.value = true;
  hata.value = '';
  try {
    const slotlar: BelgeSlot[] = [];
    for (const file of files) slotlar.push(await uploadDosya(file));
    await guncelle({ faturalar: [...(t.faturalar ?? []), ...slotlar] });
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    faturaYukleniyor.value = false;
  }
}

function faturaDosyaSec(event: Event) {
  faturaEkle(dosyalariSuz(event.target as HTMLInputElement));
}

function faturaSilOnayla() {
  const i = faturaSilinecek.value;
  faturaSilinecek.value = null;
  const t = tescil.value;
  if (!t || i == null) return;
  const liste = [...(t.faturalar ?? [])];
  liste.splice(i, 1);
  guncelle({ faturalar: liste });
}

// ---- PDF rapor linki: denetim raporuyla aynı içerik, başlık "Tescil" ve
// seçilen CE belgeleri tablosuyla; rapor yüklenip 7 gün geçerli link üretilir ----
const pdfLinkAcik = ref(false);
const pdfLinkUrl = ref('');
const pdfLinkHata = ref('');
const pdfDosyaAdi = ref('');
const yazdirAcik = ref(false);

async function pdfLinkOlustur() {
  const t = tescil.value;
  if (!t) return;
  pdfLinkAcik.value = true;
  pdfLinkUrl.value = '';
  pdfLinkHata.value = '';
  try {
    const [firmaKaydi, tamAsansor] = await Promise.all([
      tamFirma.value
        ? Promise.resolve(tamFirma.value)
        : firma.value ? getFirma(firma.value._id) : Promise.resolve(null),
      asansor.value ? getAsansor(asansor.value._id) : Promise.resolve(null),
    ]);
    // Tescil, PDF üreticisine denetimle aynı alan düzeninde verilir;
    // tescilde ayrı tarih olmadığından başlık tarih satırı boş geçilir
    const pdfKaydi: Denetim = {
      _id: t._id, firmaId: t.firmaId, asansorId: t.asansorId,
      modul: 'Tescil', denetimTarihi: '',
      ekProje: t.ekProje,
      abUygunlukBeyaniTarihi: t.abUygunlukBeyaniTarihi,
      sonKontrolTarihi: t.sonKontrolTarihi,
      createdAt: t.createdAt, updatedAt: t.updatedAt,
    };
    const slotlar = denetimDosyaSlotlari(pdfKaydi, firmaKaydi, tamAsansor);
    const linkler = slotlar.length
      ? await createDosyaLinkleri(slotlar.map((s) => ({ dosyaAnahtari: s.dosyaAnahtari, dosyaAdi: s.dosyaAdi })))
      : {};
    const semalar = tamAsansor ? asansorSemaCizimleri(tamAsansor) : {};
    const secilenCeler = (firmaKaydi?.ceBelgeleri ?? []).filter(
      (ce) => ce._id && (t.ceBelgeIdleri ?? []).includes(ce._id)
    );
    const blob = await denetimPdfBlob({
      denetim: pdfKaydi, firma: firmaKaydi, asansor: tamAsansor, linkler, semalar,
      baslik: 'Tescil', tescilCeBelgeleri: secilenCeler,
    });
    const dosyaAdi = [
      'Tescil',
      tamAsansor?.seriNo || firmaKaydi?.ad.replace(/\s+/g, '-') || '',
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

// PDF/resim görüntüleyicide açılır; diğerleri indirmeye düşer
async function dosyaAc(slot: BelgeSlot) {
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
            Tescil
          </h1>
          <span v-if="tescil?.abUygunlukBeyaniTarihi"
            class="shrink-0 bg-[#1c2a21] px-2 py-0.5 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
            {{ tarih(tescil.abUygunlukBeyaniTarihi) }}
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

        <template v-else-if="tescil">
          <!-- PDF rapor linki + Yazdır: linkte tüm bilgiler + dosya linkleri tek PDF'te -->
          <div class="flex gap-1.5">
            <button type="button" @click="pdfLinkOlustur"
              class="flex flex-1 items-center justify-center gap-1.5 bg-[#2b5c3d] px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Link Oluştur (PDF Rapor)
            </button>
            <button type="button" @click="yazdirAcik = true"
              class="flex items-center justify-center gap-1.5 bg-surface-800 px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9V3h12v6" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Yazdır
            </button>
          </div>

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

          <!-- CE belgeleri: popup ile seçilir, burada seçilenler listelenir -->
          <section class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-xs font-bold uppercase tracking-wide text-ink">
                CE Belgeleri ({{ secilenCeler.length }})
              </h2>
              <button type="button" @click="ceSecimAc"
                class="flex shrink-0 items-center gap-1 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2.5" stroke-linecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                CE Belgesi Seç
              </button>
            </div>

            <p v-if="!secilenCeler.length" class="py-2 text-xs text-ink-muted/60">
              Henüz CE belgesi seçilmedi. "CE Belgesi Seç" ile firmanın belgelerinden ekleyin.
            </p>

            <!-- Seçilen belgeler: bilgileri metin halinde alt alta paneller -->
            <div v-for="ce in secilenCeler" :key="ce._id"
              class="space-y-1 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
              <div class="flex items-start justify-between gap-2">
                <div class="flex min-w-0 flex-1 items-center gap-1.5">
                  <span
                    class="shrink-0 bg-[#1c2a21] px-2 py-0.5 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                    {{ ce.modul || '—' }}
                  </span>
                  <span class="truncate text-xs font-bold text-ink">{{ ce.belgeNo || '—' }}</span>
                </div>
                <div class="flex shrink-0 gap-1">
                  <button v-if="ce.dosya" type="button" @click="dosyaAc(ce.dosya)"
                    aria-label="CE belgesini görüntüle"
                    class="grid h-6.5 w-8 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button type="button" @click="ceCikarilacak = ce"
                    aria-label="CE belgesini tescilden çıkar"
                    class="grid h-6.5 w-8 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                    ✕
                  </button>
                </div>
              </div>
              <p class="text-xs leading-snug text-ink">{{ ce.kurum || '—' }}</p>
              <p class="text-[11px] text-ink-muted/80">
                Geçerlilik: {{ bilgiTarih(ce.gecerlilikTarihi) }} – {{ bilgiTarih(ce.bitisTarihi) }}
              </p>
            </div>
          </section>

          <!-- Uygulama projesi: PDF görüntülenir, ZIP indirilir -->
          <section class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">Uygulama Projesi</h2>
            <div class="flex items-center gap-1.5">
              <label
                class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                <input type="file" class="hidden"
                  accept="application/pdf,application/zip,application/x-zip-compressed,.pdf,.zip"
                  @change="ekProjeSec" />
                {{ ekProjeYukleniyor ? 'Yükleniyor…' : tescil.ekProje ? 'Değiştir' : '+ Proje Yükle (PDF/ZIP)' }}
              </label>
              <span class="min-w-0 flex-1 truncate text-xs"
                :class="tescil.ekProje ? 'text-ink' : 'text-ink-muted/60'">
                {{ tescil.ekProje?.dosyaAdi ?? 'Proje yüklenmedi' }}
              </span>
              <button v-if="tescil.ekProje" type="button" @click="dosyaAc(tescil.ekProje)"
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
              <button v-if="tescil.ekProje" type="button" @click="guncelle({ ekProje: null })"
                aria-label="Projeyi kaldır"
                class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                ✕
              </button>
            </div>
          </section>

          <!-- Yeşil etiket raporu: PDF yüklenir, görüntülenir -->
          <section class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">Yeşil Etiket Raporu</h2>
            <div class="flex items-center gap-1.5">
              <label
                class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                <input type="file" class="hidden" accept="application/pdf,.pdf"
                  @change="yesilEtiketSec" />
                {{ yesilEtiketYukleniyor ? 'Yükleniyor…' : tescil.yesilEtiketRaporu ? 'Değiştir' : '+ Rapor Yükle (PDF)' }}
              </label>
              <span class="min-w-0 flex-1 truncate text-xs"
                :class="tescil.yesilEtiketRaporu ? 'text-ink' : 'text-ink-muted/60'">
                {{ tescil.yesilEtiketRaporu?.dosyaAdi ?? 'Rapor yüklenmedi' }}
              </span>
              <button v-if="tescil.yesilEtiketRaporu" type="button" @click="dosyaAc(tescil.yesilEtiketRaporu)"
                aria-label="Yeşil etiket raporunu görüntüle"
                class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <button v-if="tescil.yesilEtiketRaporu" type="button" @click="guncelle({ yesilEtiketRaporu: null })"
                aria-label="Yeşil etiket raporunu kaldır"
                class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                ✕
              </button>
            </div>
          </section>

          <!-- Faturalar: dosya yükleme + fotoğraf çekme (çoklu) -->
          <section class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-xs font-bold uppercase tracking-wide text-ink">
                Fatura ({{ tescil.faturalar?.length ?? 0 }})
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
            <p v-if="!tescil.faturalar?.length && !faturaYukleniyor"
              class="py-2 text-xs text-ink-muted/60">
              Henüz fatura eklenmedi.
            </p>
            <div v-for="(d, i) in tescil.faturalar ?? []" :key="d.dosyaAnahtari + i"
              class="flex items-center gap-1.5 bg-surface-900/60 p-2 ring-1 ring-white/5">
              <span class="min-w-0 flex-1 truncate text-xs text-ink">{{ d.dosyaAdi }}</span>
              <button type="button" @click="dosyaAc(d)" aria-label="Dosyayı görüntüle"
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

          <!-- Yazdırma bilgileri: şablonlarda kullanılan kalıcı değerler ve
            tescil tarihleri; değişiklik anında kaydedilir -->
          <section class="space-y-2 bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">Yazdırma Bilgileri</h2>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Belediye Adı</span>
                <input :value="tescil.belediyeAdi ?? ''" type="text" placeholder="Belediye adı girin"
                  @change="metinKaydet('belediyeAdi', $event)"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
              </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Dilekçe Tarihi</span>
              <input :value="tarihInput(tescil.dilekceTarihi)" type="date"
                @change="tarihKaydet('dilekceTarihi', $event)"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
              <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">AB Uygunluk Beyanı Tarihi</span>
              <input :value="tarihInput(tescil.abUygunlukBeyaniTarihi)" type="date"
                @change="tarihKaydet('abUygunlukBeyaniTarihi', $event)"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Son Kontrol Tarihi</span>
              <input :value="tarihInput(tescil.sonKontrolTarihi)" type="date"
                @change="tarihKaydet('sonKontrolTarihi', $event)"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Garanti Tarihi</span>
              <input :value="tarihInput(tescil.garantiTarihi)" type="date"
                @change="tarihKaydet('garantiTarihi', $event)"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Proje Hizmet Sözleşme Tarihi</span>
              <input :value="tarihInput(tescil.projeHizmetSozlesmeTarihi)" type="date"
                @change="tarihKaydet('projeHizmetSozlesmeTarihi', $event)"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Fatura No</span>
                <input :value="tescil.faturaNo ?? ''" type="text" placeholder="Fatura no"
                  @change="metinKaydet('faturaNo', $event)"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
              </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Fatura Tarihi</span>
              <input :value="tarihInput(tescil.faturaTarihi)" type="date"
                @change="tarihKaydet('faturaTarihi', $event)"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            </div>
          </section>
        </template>
      </div>
    </ion-content>

    <!-- CE belgesi seçim popup'ı — tam sayfa: firmanın CE belgeleri
      işaretlenir, Tamam ile tescil dosyasına kaydedilir -->
    <Teleport to="body">
      <div v-if="ceSecAcik" class="fixed inset-0 z-50 flex flex-col bg-[#101a14]">
        <div
          class="flex shrink-0 items-center justify-between border-b border-white/5 bg-surface-bar px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 class="truncate text-sm font-bold text-ink">CE Belgesi Seç</h2>
          <button type="button" @click="ceSecAcik = false"
            class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink-muted ring-1 ring-white/10">
            ✕
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-auto">
          <div class="mx-auto max-w-lg space-y-1.5 p-4">
            <p class="text-[11px] text-ink-muted">
              Firmanın CE belgelerinden tescil dosyasına girecekleri işaretleyin.
            </p>
            <p v-if="!ceBelgeleri.length" class="py-6 text-center text-xs text-ink-muted/60">
              Bu firmada kayıtlı CE belgesi yok. Belgeler, Firmalar &gt; CE Belgeleri
              sekmesinden eklenir.
            </p>
            <div v-for="ce in ceBelgeleri" :key="ce._id ?? ce.belgeNo"
              class="flex items-center gap-2 bg-surface-800 p-2.5 ring-1 ring-white/5">
              <button type="button" class="flex min-w-0 flex-1 items-start gap-2 text-left"
                @click="ceSecimToggle(ce._id)">
                <!-- Seçim kutusu -->
                <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center ring-1"
                  :class="ceSecimde(ce._id) ? 'bg-[#2b5c3d] ring-white/20' : 'bg-surface-900 ring-white/15'">
                  <svg v-if="ceSecimde(ce._id)" class="h-3.5 w-3.5 text-ink" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-1.5">
                    <span class="shrink-0 bg-[#1c2a21] px-1.5 py-0.5 text-[10px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                      {{ ce.modul || '—' }}
                    </span>
                    <span class="truncate text-xs font-semibold text-ink">{{ ce.belgeNo || '—' }}</span>
                  </span>
                  <span class="mt-0.5 block text-[11px] leading-snug text-ink-muted">{{ ce.kurum || '—' }}</span>
                  <span class="mt-0.5 block text-[11px] text-ink-muted/80">
                    {{ bilgiTarih(ce.gecerlilikTarihi) }} – {{ bilgiTarih(ce.bitisTarihi) }}
                  </span>
                </span>
              </button>
              <button v-if="ce.dosya" type="button" @click="dosyaAc(ce.dosya)"
                aria-label="CE belgesini görüntüle"
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

        <div
          class="shrink-0 border-t border-white/5 bg-surface-bar p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div class="mx-auto flex max-w-lg gap-1.5">
            <button type="button" @click="ceSecAcik = false"
              class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
              Vazgeç
            </button>
            <button type="button" @click="ceSecimKaydet" :disabled="ceKaydediliyor"
              class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
              {{ ceKaydediliyor ? 'Kaydediliyor…' : `Tamam (${ceSecim.length})` }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Fatura: fotoğraf çekme + silme onayı -->
    <FotoCekModal v-model:acik="faturaFotoAcik" @tamam="faturaEkle" />
    <SilmeOnayi :acik="faturaSilinecek != null"
      :aciklama="faturaSilinecek != null
        ? `${tescil?.faturalar?.[faturaSilinecek]?.dosyaAdi ?? 'Fatura'} silinecek. Emin misiniz?`
        : ''"
      @vazgec="faturaSilinecek = null" @onayla="faturaSilOnayla" />

    <!-- Tescilden çıkarma onayı -->
    <SilmeOnayi :acik="ceCikarilacak != null"
      :aciklama="ceCikarilacak
        ? `${ceCikarilacak.modul || 'CE belgesi'} (${ceCikarilacak.belgeNo || '—'}) tescil dosyasından çıkarılacak. Emin misiniz?`
        : ''"
      @vazgec="ceCikarilacak = null" @onayla="ceCikarOnayla" />

    <!-- Firma / asansör tüm bilgiler popup'ları -->
    <FirmaBilgiModal v-model:acik="firmaBilgiAcik" :firma-id="firma?._id ?? null" />
    <AsansorBilgiModal v-model:acik="asansorBilgiAcik" :asansor-id="asansor?._id ?? null" />

    <!-- PDF rapor linki popup'ı: açılır açılmaz oluşturulur -->
    <LinkPopup v-model:acik="pdfLinkAcik" :url="pdfLinkUrl" :hata="pdfLinkHata"
      bekleme-metni="Tescil raporu PDF'i oluşturuluyor…"
      aciklama="Tüm tescil bilgileri, seçilen CE belgeleri ve dosya linkleri PDF raporda toplandı."
      goruntule-tip="pdf" :goruntule-ad="pdfDosyaAdi || 'Tescil Raporu.pdf'" />

    <!-- Yazdır tam sayfası: tescil dosyası kalem listesi -->
    <YazdirPopup v-model:acik="yazdirAcik" :tescil-id="tescil?._id ?? null" />
  </ion-page>
</template>
