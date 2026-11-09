<script setup lang="ts">
import { IonPage, IonContent, IonHeader, onIonViewWillEnter } from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getDenetim, updateDenetim, getAnnexSecenekleri,
  type Denetim, type DenetimFirmaOzet, type DenetimAsansorOzet, type DenetimGuncelleme,
  type DenetimAksam,
} from '@/services/denetimService';
import { getAksamBelgeleri, getAksamBelgesi, type AksamBelgesi } from '@/services/aksamBelgesiService';
import { uploadDosya, getDosyaUrl, getDosyaIndirUrl, createDosyaLinkleri, type BelgeSlot } from '@/services/dosyaService';
import { getFirma, type CeBelgesi } from '@/services/firmaService';
import FotoCekModal from '@/components/FotoCekModal.vue';
import AramaliSelect from '@/components/AramaliSelect.vue';
import { getDenetciler, MUHENDIS_ETIKETLERI, type Denetci } from '@/services/denetciService';
import { getAsansor } from '@/services/asansorService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import { blurActive } from '@/utils/blurActive';
import { denetimDosyaSlotlari, denetimPdfBlob } from '@/utils/denetimPdf';
import { asansorSemaCizimleri } from '@/utils/semaPdf';
import FirmaBilgiModal from '@/components/FirmaBilgiModal.vue';
import AsansorBilgiModal from '@/components/AsansorBilgiModal.vue';
import LinkPopup from '@/components/LinkPopup.vue';
import YazdirPopup from '@/components/YazdirPopup.vue';
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
    if (denetim.value?.modul === 'Modul B') {
      katalogYukle();
      getAnnexSecenekleri().then((l) => (annexSecenekleri.value = l)).catch(() => { /* seçenek listesi boş kalır */ });
    }
    // Modul E / H1: firmanın kalibrasyon (Cihazlar sekmesi) dosyaları çekilir
    if (MONTAJLI_MODULLER.includes(denetim.value?.modul ?? '')) {
      const f = denetim.value.firmaId;
      const firmaIdDeger = f && typeof f === 'object' ? f._id : f;
      if (firmaIdDeger) {
        getFirma(firmaIdDeger)
          .then((tam) => {
            firmaKalibrasyon.value = tam.cihazDosyalari ?? [];
            firmaCeler.value = tam.ceBelgeleri ?? [];
          })
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

// Asansör kartı özeti: kişi · makine dairesi · askı · hız · durak (dolu olanlar, aralarında nokta)
function temelOzet(a: { kisiSayisi?: number | null; beyanYuku?: number | null; makinaKonumu?: string | null; askiTipi?: string | null; hiz?: number | null; durakSayisi?: number | null } | null) {
  if (!a) return '';
  return [
    a.kisiSayisi ? `${a.kisiSayisi} kişi` : '',
    a.beyanYuku ? `${a.beyanYuku} kg` : '',
    a.makinaKonumu === 'MR' ? 'Makine Daireli' : a.makinaKonumu === 'MRL' ? 'Makine Dairesiz' : '',
    a.askiTipi ?? '',
    a.hiz ? `${a.hiz} m/s` : '',
    a.durakSayisi ? `${a.durakSayisi} durak` : '',
  ].filter(Boolean).join(' · ');
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

// ---- Modül G: denetçi (Ayarlar > Denetçiler) — bilgileri ve imza-kaşesi gösterilir,
// değiştirilebilir; yazdırılan belgelere ad soyad ve imza-kaşe olarak basılır ----
// Denetçi ve onaylı kuruluş alanları Modül G, B, E ve H1'de aynıdır
const denetciModulu = computed(() => ['Modul G', 'Modul B', 'Modul E', 'Modul H1'].includes(denetim.value?.modul ?? ''));
const denetciler = ref<Denetci[]>([]);
const denetciOzeti = computed(() => {
  const d = denetim.value?.denetciId;
  return d && typeof d === 'object' ? d : null;
});
const denetciModel = computed<string | number | null>({
  get: () => {
    const d = denetim.value?.denetciId;
    return (d && typeof d === 'object' ? d._id : d) || null;
  },
  set: (v) => { guncelle({ denetciId: typeof v === 'string' ? v : null }); },
});
const denetciSecenekleri = computed(() =>
  denetciler.value.map((d) => ({
    label: [d.adSoyad, d.muhendisTuru ? MUHENDIS_ETIKETLERI[d.muhendisTuru] : ''].filter(Boolean).join(' — '),
    value: d._id,
  }))
);
const denetciImzaUrl = ref('');

watch(
  () => denetciOzeti.value?.imzaKase?.dosyaAnahtari,
  async (anahtar) => {
    denetciImzaUrl.value = '';
    if (!anahtar) return;
    try {
      denetciImzaUrl.value = await getDosyaUrl(anahtar);
    } catch {
      /* önizleme alınamazsa yalnız ad gösterilir */
    }
  },
  { immediate: true }
);

// Modül E: onaylı kurum, firmanın CE belgelerinden işaretlenir (hiçbiri seçili değilse
// yazdırmada modüle uyan belgeler otomatik kullanılır)
const firmaCeler = ref<CeBelgesi[]>([]);
const seciliCeIdleri = computed(() => denetim.value?.ceBelgeIdleri ?? []);
function ceToggle(ceId: string | undefined) {
  if (!ceId) return;
  const mevcut = seciliCeIdleri.value;
  guncelle({
    ceBelgeIdleri: mevcut.includes(ceId) ? mevcut.filter((x) => x !== ceId) : [...mevcut, ceId],
  });
}

watch(denetciModulu, (g) => {
  if (g && !denetciler.value.length) {
    getDenetciler().then((l) => (denetciler.value = l)).catch(() => { /* seçenek listesi boş kalır */ });
  }
}, { immediate: true });

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

// ---- Modul B: Tip Projeler — Certificate Annex formu seçimi (şablon dosya adlarındaki parantez içi:
// "800 kg 1.6 ms 1-1 askı"); seçilenler yazdırma listesine ek form olarak girer ----
const annexSecenekleri = ref<{ etiket: string }[]>([]);
const annexSecilen = computed(() => denetim.value?.certificateAnnexler ?? []);
// Asansörün askı tipine (1:1 / 2:1) uyan formlar listelenir; askı tipi yoksa hepsi
const annexSecimListesi = computed(() => {
  const aski = asansor.value?.askiTipi?.replace(':', '-');
  return annexSecenekleri.value
    .filter((o) => !aski || !/\d-\d\s*askı/i.test(o.etiket) || o.etiket.includes(`${aski} askı`))
    .map((o) => ({ label: o.etiket, value: o.etiket }));
});
// Seçim kutuda görünür kalır; yeniden tıklanıp başka bir form seçilebilir
const annexModel = computed<string | number | null>({
  get: () => annexSecilen.value[0] ?? null,
  set: (v) => {
    if (typeof v === 'string' && v !== annexSecilen.value[0]) guncelle({ certificateAnnexler: [v] });
  },
});

// ---- Modul B: komponentler — katalogdaki (Ayarlar > Güvenlik Aksamları) belgeler; her
// komponent için tam sayfa popup'ta arama + onay kutularıyla seçilir, Kaydet ile denetime
// yazılır; seçilenler panelde komponent başlığı altında (accordion) listelenir ----
// Komponent başına en çok 10 farklı marka seçilebilir (aynı markanın sertifika sayısı sınırsız)
const AKSAM_MAX = 10;
// Hangi komponentin seçim popup'ının açık olduğu (null: kapalı)
const aksamSecKod = ref<string | null>(null);
const katalog = ref<AksamBelgesi[]>([]);
const katalogYukleniyor = ref(false);
const aksamKaydediliyor = ref(false);

// Rapor tipleri (sarkaç, yangın) bu alanın kapsamı dışındadır
const HARIC_KODLAR = ['sarkac_test_raporu', 'yangin_sizdirmazlik_raporu'];

function katalogYukle() {
  if (katalog.value.length || katalogYukleniyor.value) return;
  katalogYukleniyor.value = true;
  Promise.all([
    getAksamBelgeleri({ kategori: 'guvenlik_aksami', durum: 'aktif' }),
    getAksamBelgeleri({ kategori: 'asansor_bileseni', durum: 'aktif' }),
  ])
    .then(([aksamlar, bilesenlerListesi]) => {
      // Dişlili / dişlisiz motor belgeleri tek "Motor" komponentinde toplanır
      const motorlar = bilesenlerListesi
        .filter((b) => b.bilesenTipiKodu.startsWith('motor'))
        .map((b) => ({ ...b, bilesenTipiKodu: 'motor', bilesenTipiAdi: 'Motor' }));
      katalog.value = [...aksamlar.filter((b) => !HARIC_KODLAR.includes(b.bilesenTipiKodu)), ...motorlar];
    })
    .catch(() => { /* katalog alınamazsa komponent butonları boş kalır */ })
    .finally(() => (katalogYukleniyor.value = false));
}

// Komponent butonları katalogdan türetilir
const bilesenler = computed(() => {
  const gorulen = new Map<string, string>();
  for (const b of katalog.value) {
    if (!gorulen.has(b.bilesenTipiKodu)) gorulen.set(b.bilesenTipiKodu, b.bilesenTipiAdi);
  }
  const liste = [...gorulen].map(([kod, ad]) => ({ kod, ad }));
  // Durak kapı kilidi ile kabin kapı kilidi yan yana (ardışık) gösterilir
  const kabin = liste.findIndex((b) => b.kod === 'kabin_kapi_kilidi');
  const durak = liste.findIndex((b) => b.kod === 'durak_kapi_kilidi');
  if (kabin !== -1 && durak !== -1) {
    const [k] = liste.splice(kabin, 1);
    liste.splice(liste.findIndex((b) => b.kod === 'durak_kapi_kilidi') + 1, 0, k);
  }
  // Motor, alfabetik sırada Kontrol Kartı ile Tampon arasında yer alır
  const motor = liste.findIndex((b) => b.kod === 'motor');
  if (motor !== -1) {
    const [m] = liste.splice(motor, 1);
    const tampon = liste.findIndex((b) => b.kod === 'tampon');
    liste.splice(tampon === -1 ? liste.length : tampon, 0, m);
  }
  return liste;
});

// Aynı sertifika numaralı belge/tip satırları tek seçenek olarak birleşir (sertifika
// numarası aynıysa birlikte seçilir); numarası olmayan satır kendi başına kalır
interface AksamSatir {
  bilesenTipiKodu: string;
  bilesenTipiAdi: string;
  belgeId: string;
  marka: string;
  tip: string;
  sertifikaNo: string;
  dosya?: AksamBelgesi['dosya'];
}
interface AksamGrup {
  anahtar: string;
  markalar: string[];
  tipler: string[];
  sertifikaNo: string;
  uyeler: AksamSatir[];
  dosya?: AksamBelgesi['dosya'];
}
const satirAnahtari = (a: { belgeId: string; tip: string }) => `${a.belgeId}|${a.tip}`;
const grupAnahtari = (a: { sertifikaNo?: string; belgeId: string; tip: string }) =>
  a.sertifikaNo?.trim() ? `sert:${a.sertifikaNo.trim().toLocaleLowerCase('tr')}` : satirAnahtari(a);

function satirlariGrupla(satirlar: AksamSatir[]): AksamGrup[] {
  const gruplar = new Map<string, AksamGrup>();
  for (const sat of satirlar) {
    const anahtar = grupAnahtari(sat);
    let g = gruplar.get(anahtar);
    if (!g) {
      g = { anahtar, markalar: [], tipler: [], sertifikaNo: sat.sertifikaNo ?? '', uyeler: [], dosya: undefined };
      gruplar.set(anahtar, g);
    }
    g.uyeler.push(sat);
    if (sat.marka && !g.markalar.includes(sat.marka)) g.markalar.push(sat.marka);
    if (sat.tip && !g.tipler.includes(sat.tip)) g.tipler.push(sat.tip);
    if (!g.dosya && sat.dosya) g.dosya = sat.dosya;
  }
  return [...gruplar.values()];
}
const grupBaslik = (g: AksamGrup) =>
  [g.markalar.join(', '), g.tipler.join(', ')].filter(Boolean).join(' — ') || '—';

// Denetimde seçili satırlar (komponent bazında) — adet, birleşik sertifika sayısıdır
function secilenGruplar(kod: string | null): AksamGrup[] {
  if (!kod) return [];
  return satirlariGrupla((denetim.value?.guvenlikAksamlari ?? []).filter((a) => a.bilesenTipiKodu === kod));
}
function aksamAdet(kod: string | null) {
  return secilenGruplar(kod).length;
}

// Panelde yalnız seçili belgesi olan komponentler listelenir
const secilenBilesenler = computed(() => bilesenler.value.filter((b) => aksamAdet(b.kod) > 0));

// Popup seçenekleri: açık komponentin katalog belgeleri, sertifika numarasına göre birleşik;
// katalogdan kalkmış ama denetimde seçili kalmış satırlar da (işaretini kaldırabilmek için) listelenir
const aksamSecenekleri = computed<AksamGrup[]>(() => {
  const kod = aksamSecKod.value;
  if (!kod) return [];
  const satirlar: AksamSatir[] = [];
  for (const belge of katalog.value) {
    if (belge.bilesenTipiKodu !== kod) continue;
    // Tipi olmayan belge tek satır olarak sunulur
    for (const tip of (belge.tipler.length ? belge.tipler : [''])) {
      satirlar.push({
        bilesenTipiKodu: belge.bilesenTipiKodu, bilesenTipiAdi: belge.bilesenTipiAdi, belgeId: belge._id,
        marka: belge.marka, tip, sertifikaNo: belge.sertifikaNo, dosya: belge.dosya,
      });
    }
  }
  const varOlanlar = new Set(satirlar.map(satirAnahtari));
  for (const a of denetim.value?.guvenlikAksamlari ?? []) {
    if (a.bilesenTipiKodu === kod && !varOlanlar.has(satirAnahtari(a))) satirlar.push({ ...a });
  }
  return satirlariGrupla(satirlar);
});

// Popup içi arama: marka, tip ve sertifika no üzerinde filtreler
const aksamArama = ref('');
const suzulmusSecenekler = computed(() => {
  const arama = aksamArama.value.trim().toLocaleLowerCase('tr');
  if (!arama) return aksamSecenekleri.value;
  return aksamSecenekleri.value.filter((g) =>
    [...g.markalar, ...g.tipler, g.sertifikaNo].some((alan) => (alan ?? '').toLocaleLowerCase('tr').includes(arama))
  );
});
const aksamBaslik = computed(() => bilesenler.value.find((b) => b.kod === aksamSecKod.value)?.ad ?? 'Komponent');

// Kaydedilene kadar taslak seçim (birleşik grup anahtarları)
const taslakSecim = ref<Set<string>>(new Set());

function aksamSecimAc(kod: string) {
  aksamArama.value = '';
  taslakSecim.value = new Set(secilenGruplar(kod).map((g) => g.anahtar));
  aksamSecKod.value = kod;
}

const markaAnahtari = (m: string) => m.trim().toLocaleLowerCase('tr');

// Taslakta seçili grupların farklı marka kümesi
const taslakMarkalari = computed(() => {
  const markalar = new Set<string>();
  for (const g of aksamSecenekleri.value) {
    if (taslakSecim.value.has(g.anahtar)) for (const m of g.markalar) markalar.add(markaAnahtari(m));
  }
  return markalar;
});

// Bu grup eklenirse farklı marka sayısı sınırı aşılır mı? (zaten seçili grup etkilenmez)
function markaSiniriAsilir(g: AksamGrup) {
  if (taslakSecim.value.has(g.anahtar)) return false;
  const markalar = new Set(taslakMarkalari.value);
  for (const m of g.markalar) markalar.add(markaAnahtari(m));
  return markalar.size > AKSAM_MAX;
}

function taslakToggle(g: AksamGrup) {
  const yeni = new Set(taslakSecim.value);
  if (yeni.has(g.anahtar)) yeni.delete(g.anahtar);
  else if (!markaSiniriAsilir(g)) yeni.add(g.anahtar);
  taslakSecim.value = yeni;
}

async function aksamKaydet() {
  const d = denetim.value;
  const kod = aksamSecKod.value;
  if (!d || !kod || aksamKaydediliyor.value) return;
  aksamKaydediliyor.value = true;
  try {
    const mevcut = d.guvenlikAksamlari ?? [];
    const diger = mevcut.filter((a) => a.bilesenTipiKodu !== kod);
    // Seçili birleşik grubun tüm belge/tip satırları yazılır (var olan satır korunur)
    const bu: DenetimAksam[] = aksamSecenekleri.value
      .filter((g) => taslakSecim.value.has(g.anahtar))
      .flatMap((g) => g.uyeler)
      .map((u) => mevcut.find((a) => a.bilesenTipiKodu === kod && satirAnahtari(a) === satirAnahtari(u)) ?? {
        bilesenTipiKodu: u.bilesenTipiKodu, bilesenTipiAdi: u.bilesenTipiAdi, belgeId: u.belgeId,
        marka: u.marka, tip: u.tip, sertifikaNo: u.sertifikaNo,
      });
    await guncelle({ guvenlikAksamlari: [...diger, ...bu] });
    aksamSecKod.value = null;
  } finally {
    aksamKaydediliyor.value = false;
  }
}

// Panel: komponent grupları açılır/kapanır (varsayılan kapalı)
const acikGruplar = ref<Record<string, boolean>>({});

function grupAcik(kod: string) {
  return !!acikGruplar.value[kod];
}

function grupToggle(kod: string) {
  acikGruplar.value[kod] = !grupAcik(kod);
}

// Birleşik satırın sertifika belgesi katalogdan bulunarak görüntülenir
async function aksamBelgeAc(g: AksamGrup) {
  const belgeId = g.uyeler.find((u) => u.belgeId)?.belgeId;
  if (!belgeId) return;
  try {
    const belge = katalog.value.find((b) => b._id === belgeId) ?? await getAksamBelgesi(belgeId);
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
const yazdirAcik = ref(false);

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
          <!-- PDF rapor linki + Dosyalar (yazdırma ekranı): linkte tüm bilgiler + dosya linkleri tek PDF'te -->
          <div class="flex gap-1.5">
            <button type="button" @click="pdfLinkOlustur"
              class="flex flex-1 items-center justify-center gap-1.5 bg-[#2b5c3d] px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              PDF Rapor
            </button>
            <button type="button" @click="yazdirAcik = true"
              class="flex flex-1 items-center justify-center gap-1.5 bg-surface-800 px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              Dosyalar
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
              <span v-if="temelOzet(asansor)" class="mt-0.5 block text-[11px] text-ink-muted">{{ temelOzet(asansor) }}</span>
            </span>
            <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <button v-if="asansor?.asansorProjesiDosya" type="button" @click="ekProjeAc(asansor.asansorProjesiDosya)"
            class="flex w-full items-center justify-between gap-2 bg-surface-800 p-3 text-left ring-1 ring-white/5 active:bg-[#1a2a20]">
            <span class="min-w-0">
              <span class="block text-xs font-bold uppercase tracking-wide text-ink">Asansör Projesi</span>
              <span class="mt-0.5 block truncate text-[11px] text-ink-muted">{{ asansor.asansorProjesiDosya.dosyaAdi }}</span>
            </span>
            <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          <!-- Modül G: denetçi bilgileri + imza-kaşe; seçimle değiştirilir -->
          <section v-if="denetciModulu" class="space-y-2 bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">Denetçi</h2>
            <AramaliSelect v-model="denetciModel" :options="denetciSecenekleri"
              :placeholder="denetciler.length ? 'Denetçi seçiniz' : 'Önce Ayarlar > Denetçiler\'den ekleyin'" />
            <div v-if="denetciOzeti" class="flex items-center gap-2.5 bg-surface-900/60 p-2 ring-1 ring-white/5">
              <span class="grid h-14 w-14 shrink-0 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/5">
                <img v-if="denetciImzaUrl" :src="denetciImzaUrl" alt="İmza kaşe" class="h-full w-full object-contain p-0.5" />
                <span v-else class="text-[9px] text-ink-muted/50">{{ denetciOzeti.imzaKase ? '…' : 'Yok' }}</span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-xs font-semibold text-ink">{{ denetciOzeti.adSoyad }}</span>
                <span class="block truncate text-[11px] text-ink-muted">
                  {{ [denetciOzeti.muhendisTuru ? MUHENDIS_ETIKETLERI[denetciOzeti.muhendisTuru] : '', denetciOzeti.imzaKase ? 'İmza-kaşe yüklü' : 'İmza-kaşe yok'].filter(Boolean).join(' • ') }}
                </span>
                <span class="block truncate text-[11px] text-ink-muted">
                  Onaylı Kuruluş: {{ denetciOzeti.onayliKurumUnvan ? `${denetciOzeti.onayliKurumNobo} — ${denetciOzeti.onayliKurumUnvan}` : 'Seçilmemiş (Ayarlar > Denetçiler)' }}
                </span>
              </span>
            </div>
          </section>

          <!-- Modül E: firmanın CE belgeleri — onay kutusuyla seçilir -->
          <section v-if="denetim.modul === 'Modul E'" class="space-y-2 bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">CE Belgeleri</h2>
            <p v-if="!firmaCeler.length" class="text-[11px] text-ink-muted">
              Firmada kayıtlı CE belgesi yok. Firmalar &gt; CE Belgeleri bölümünden ekleyin.
            </p>
            <button v-for="ce in firmaCeler" :key="ce._id" type="button" @click="ceToggle(ce._id)"
              class="flex w-full items-center gap-2.5 bg-surface-900/60 p-2 text-left ring-1 ring-white/5">
              <span class="grid h-5 w-5 shrink-0 place-items-center ring-1"
                :class="ce._id && seciliCeIdleri.includes(ce._id) ? 'bg-[#2b5c3d] ring-white/20' : 'bg-surface-900 ring-white/15'">
                <svg v-if="ce._id && seciliCeIdleri.includes(ce._id)" class="h-3.5 w-3.5 text-ink" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m5 12 5 5L20 7" />
                </svg>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-xs font-semibold text-ink">{{ ce.modul || 'CE belgesi' }} — {{ ce.kurum || '—' }}</span>
                <span class="block truncate text-[11px] text-ink-muted">Belge No: {{ ce.belgeNo || '—' }}</span>
              </span>
            </button>
            <p v-if="firmaCeler.length && !seciliCeIdleri.length" class="text-[11px] text-ink-muted">
              Seçim yapılmazsa yazdırmada denetim modülüne uyan belgeler otomatik kullanılır.
            </p>
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

            <!-- Certificate Annex seçimi: seçilen form yazdırmada ek olarak basılır -->
            <div class="space-y-1.5 bg-surface-900/40 p-2 ring-1 ring-white/5">
              <span class="block text-[11px] font-semibold text-ink-muted">Certificate Annex For Modul B (yazdırılacak form)</span>
              <AramaliSelect v-model="annexModel" :options="annexSecimListesi"
                :placeholder="annexSecenekleri.length ? 'Kapasite / hız / askı seçiniz' : 'Annex şablonu bulunamadı'" />
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

          <!-- Modul B komponentleri: butonlar tam sayfa seçim popup'ını açar; seçilenler
            komponent başlığı altında açılır/kapanır liste olarak gösterilir -->
          <section v-if="modulB" class="space-y-2 bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">
              Modul B Komponentler ({{ denetim.guvenlikAksamlari?.length ?? 0 }})
            </h2>

            <p v-if="katalogYukleniyor && !bilesenler.length" class="py-1 text-[11px] text-ink-muted">
              Katalog yükleniyor…
            </p>
            <p v-else-if="!bilesenler.length" class="py-1 text-[11px] text-ink-muted/60">
              Katalogda aktif güvenlik aksamı belgesi yok. Belgeler,
              Ayarlar &gt; Güvenlik Aksamları'ndan eklenir.
            </p>

            <!-- Komponent menü butonları -->
            <div class="grid grid-cols-2 gap-1.5">
              <button v-for="b in bilesenler" :key="b.kod" type="button" @click="aksamSecimAc(b.kod)"
                :class="b.kod === 'durak_kapi_kilidi' ? 'col-start-1' : ''"
                class="flex items-center gap-1.5 bg-surface-900/60 px-2.5 py-2 text-left ring-1 ring-white/10 active:bg-[#1a2a20]">
                <span class="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink">{{ b.ad }}</span>
                <span v-if="aksamAdet(b.kod)"
                  class="shrink-0 bg-[#2b5c3d] px-1.5 py-0.5 text-[10px] font-bold text-ink">
                  {{ aksamAdet(b.kod) }}
                </span>
              </button>
            </div>

            <!-- Seçilenler: komponent başlığı altında accordion -->
            <div v-for="b in secilenBilesenler" :key="'sec-' + b.kod" class="bg-surface-900/40 ring-1 ring-white/5">
              <button type="button" @click="grupToggle(b.kod)"
                class="flex w-full items-center gap-1.5 p-2 text-left">
                <svg class="h-4 w-4 shrink-0 text-ink-muted/60 transition-transform"
                  :class="grupAcik(b.kod) ? 'rotate-180' : ''" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
                <span class="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-wide text-ink">
                  {{ b.ad }}
                  <span class="font-semibold normal-case text-ink-muted/80">({{ aksamAdet(b.kod) }})</span>
                </span>
              </button>
              <div v-if="grupAcik(b.kod)" class="space-y-1 px-2 pb-2">
                <div v-for="g in secilenGruplar(b.kod)" :key="g.anahtar"
                  class="flex items-center gap-1.5 bg-surface-900/60 p-2 ring-1 ring-white/5">
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-xs font-semibold text-ink">{{ grupBaslik(g) }}</span>
                    <span v-if="g.sertifikaNo" class="mt-0.5 block truncate text-[11px] text-ink-muted/80">
                      Sertifika: {{ g.sertifikaNo }}
                    </span>
                  </span>
                  <button v-if="g.uyeler.some((u) => u.belgeId)" type="button" @click="aksamBelgeAc(g)"
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

          <!-- Onaylı kuruluş bilgileri (denetçiden) — metin olarak -->
          <section v-if="denetciModulu" class="space-y-1 bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">Onaylı Kuruluş</h2>
            <template v-if="denetciOzeti?.onayliKurumUnvan">
              <p class="text-xs text-ink"><span class="text-ink-muted">Ünvan: </span>{{ denetciOzeti.onayliKurumUnvan }}</p>
              <p class="text-xs text-ink"><span class="text-ink-muted">NoBo: </span>{{ denetciOzeti.onayliKurumNobo || '—' }}</p>
              <p class="text-xs text-ink"><span class="text-ink-muted">Adres: </span>{{ denetciOzeti.onayliKurumAdres || '—' }}</p>
            </template>
            <p v-else class="text-[11px] text-ink-muted">
              Denetçi seçilmedi ya da denetçinin onaylı kuruluşu yok (Ayarlar &gt; Denetçiler).
            </p>
          </section>
        </template>
      </div>
    </ion-content>

    <!-- Komponent seçim popup'ı — tam sayfa: komponentin katalog belgeleri onay kutularıyla
      seçilir (marka/tip/sertifika aramasıyla); Kaydet denetime yazar ve kapatır, Vazgeç yazmadan kapatır -->
    <Teleport to="body">
      <div v-if="aksamSecKod != null" class="fixed inset-0 z-50 flex flex-col bg-[#101a14]">
        <div
          class="flex shrink-0 items-center justify-between border-b border-white/5 bg-surface-bar px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 class="truncate text-sm font-bold text-ink">
            {{ aksamBaslik }}
            <span class="font-semibold text-ink-muted/80">({{ taslakMarkalari.size }}/{{ AKSAM_MAX }} marka)</span>
          </h2>
          <button type="button" @click="aksamSecKod = null" aria-label="Vazgeç"
            class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink-muted ring-1 ring-white/10">
            ✕
          </button>
        </div>

        <!-- Arama: marka / tip / sertifika no -->
        <div class="shrink-0 border-b border-white/5 bg-surface-bar px-4 pb-3">
          <div class="mx-auto flex max-w-lg items-center gap-1.5">
            <input v-model="aksamArama" type="search" placeholder="Marka, tip veya sertifika ara…"
              class="min-w-0 flex-1 bg-surface-800 px-3 py-2 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
            <button type="button" @click="taslakSecim = new Set()" :disabled="!taslakSecim.size"
              class="shrink-0 bg-red-950/60 px-2.5 py-2 text-[11px] font-semibold text-red-300 ring-1 ring-red-500/30 active:bg-red-950 disabled:opacity-40">
              Seçilenleri Kaldır
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-auto">
          <div class="mx-auto max-w-lg space-y-1.5 p-4">
            <p v-if="katalogYukleniyor" class="py-6 text-center text-xs text-ink-muted">
              Katalog yükleniyor…
            </p>
            <p v-else-if="!aksamSecenekleri.length" class="py-6 text-center text-xs text-ink-muted/60">
              Bu komponent için katalogda belge yok.
            </p>
            <template v-else>
              <p class="text-[11px] text-ink-muted">
                Belgeleri onay kutusuyla seçin. En çok {{ AKSAM_MAX }} farklı marka seçilebilir (aynı markadan istediğiniz kadar sertifika); Kaydet'e basınca listeye eklenir.
              </p>
              <p v-if="!suzulmusSecenekler.length" class="py-2 text-xs text-ink-muted/60">
                Aramayla eşleşen belge yok.
              </p>
              <div v-for="g in suzulmusSecenekler" :key="g.anahtar"
                class="flex items-center gap-1.5 bg-surface-800 p-2 ring-1 ring-white/5">
                <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left"
                  :disabled="markaSiniriAsilir(g)"
                  :class="markaSiniriAsilir(g) ? 'opacity-40' : ''"
                  @click="taslakToggle(g)">
                  <span class="grid h-5 w-5 shrink-0 place-items-center ring-1"
                    :class="taslakSecim.has(g.anahtar) ? 'bg-[#2b5c3d] ring-white/20' : 'bg-surface-900 ring-white/15'">
                    <svg v-if="taslakSecim.has(g.anahtar)" class="h-3.5 w-3.5 text-ink" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
                      stroke-linejoin="round">
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-xs font-semibold text-ink">{{ grupBaslik(g) }}</span>
                    <span v-if="g.sertifikaNo" class="mt-0.5 block truncate text-[11px] text-ink-muted/80">
                      Sertifika: {{ g.sertifikaNo }}
                      <span v-if="g.uyeler.length > 1">({{ g.uyeler.length }} kayıt)</span>
                    </span>
                  </span>
                </button>
                <button v-if="g.dosya" type="button" @click="ekProjeAc(g.dosya!)"
                  aria-label="Sertifika belgesini görüntüle"
                  class="grid h-6.5 w-8 shrink-0 place-items-center bg-surface-900 text-ink-muted ring-1 ring-white/10 active:text-ink">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </template>
          </div>
        </div>

        <div
          class="shrink-0 border-t border-white/5 bg-surface-bar p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div class="mx-auto flex max-w-lg gap-1.5">
            <button type="button" @click="aksamSecKod = null"
              class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
              Vazgeç
            </button>
            <button type="button" @click="aksamKaydet" :disabled="aksamKaydediliyor"
              class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-50">
              {{ aksamKaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
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

    <!-- Silme onayı: tip projesi -->
    <SilmeOnayi :acik="tipProjeSilinecek != null"
      :aciklama="tipProjeSilinecek != null
        ? `${denetim?.tipProjeler?.[tipProjeSilinecek]?.dosyaAdi ?? 'Tip projesi'} silinecek. Emin misiniz?`
        : ''"
      @vazgec="tipProjeSilinecek = null" @onayla="tipProjeSilOnayla" />

    <!-- Firma / asansör tüm bilgiler popup'ları -->
    <FirmaBilgiModal v-model:acik="firmaBilgiAcik" :firma-id="firma?._id ?? null" />
    <AsansorBilgiModal v-model:acik="asansorBilgiAcik" :asansor-id="asansor?._id ?? null" />

    <!-- PDF rapor linki popup'ı: açılır açılmaz oluşturulur -->
    <LinkPopup v-model:acik="pdfLinkAcik" :url="pdfLinkUrl" :hata="pdfLinkHata"
      bekleme-metni="Denetim raporu PDF'i oluşturuluyor…"
      aciklama="Tüm denetim bilgileri ve dosya linkleri PDF raporda toplandı."
      goruntule-tip="pdf" :goruntule-ad="pdfDosyaAdi || 'Denetim Raporu.pdf'" />

    <!-- Yazdır popup'ı — içeriği henüz boş, kullanıcı tarifiyle doldurulacak -->
    <YazdirPopup v-model:acik="yazdirAcik" :denetim-id="denetim?._id ?? null"
      :kys-firma-id="denetim?.modul === 'Modul E' ? (firma?._id ?? null) : null" />
  </ion-page>
</template>
