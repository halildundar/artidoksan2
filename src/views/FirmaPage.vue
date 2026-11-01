<script setup lang="ts">
import { IonPage, IonContent, IonHeader, onIonViewWillEnter } from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getFirmalar, updateFirma,
  type Firma, type YeniFirma, type BelgeSlotAnahtar, type KurumEvrakAnahtar,
  type CeBelgesi, type FirmaPersonel, type Muhendis,
} from '@/services/firmaService';
import { getAsansorler, type Asansor } from '@/services/asansorService';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, createZipLink, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import { getOnayliKurumSecenekleri, type OnayliKurumSecenek } from '@/services/onayliKurumService';
import { getSmmFirmalari, type SmmFirmasi } from '@/services/smmFirmaService';
import { blurActive } from '@/utils/blurActive';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import SmmFirmaSecModal from '@/components/SmmFirmaSecModal.vue';
import FotoCekModal from '@/components/FotoCekModal.vue';
import LinkPopup from '@/components/LinkPopup.vue';
import CeBelgeFormu from '@/components/CeBelgeFormu.vue';
import { MUHENDIS_TUR_ETIKETLERI } from '@/utils/firmaBilgi';

const route = useRoute();
const router = useRouter();

const firmalar = ref<Firma[]>([]);
const yukleniyor = ref(false);
const hata = ref('');

const secili = ref<Firma | null>(null);
const aktifMenu = ref(1);
// Firma detay menüsü — Güvenlik Aksamlar panelindeki gibi ikonlu ızgara
const menuler = [
  { no: 1, etiket: 'Genel Bilgiler', icon: '🏢' },
  { no: 2, etiket: 'Montajlar', icon: '🛠' },
  { no: 3, etiket: 'CE Belgeler', icon: '📜' },
  { no: 4, etiket: 'Cihazlar', icon: '🧰' },
  { no: 5, etiket: 'HYB Belgesi', icon: '📋' },
  { no: 6, etiket: 'Sanayi Sicil Belgesi', icon: '🏭' },
  { no: 7, etiket: 'SMM Bilgileri', icon: '👷' },
  { no: 8, etiket: 'Personel', icon: '👥' },
];

// Genel Bilgiler tablosu: etiket → kayıtlı değer
const genelBilgiler = computed<[string, string][]>(() => {
  const f = secili.value;
  if (!f) return [];
  return [
    ['Firma Adı', f.ad],
    ['Ünvan', f.unvan],
    ['Firma Yetkilisi', f.yetkili],
    ['Telefon', f.telefon],
    ['Email', f.email],
    ['İl', f.il],
    ['İlçe', f.ilce],
    ['Mahalle', f.mahalle],
    ['Posta Kodu', f.postaKodu],
    ['Adres', f.adres],
    ['Kayıt Tarihi', `${tarih(f.createdAt)} ${saat(f.createdAt)}`],
  ];
});

// API, uygulamayla aynı anda açılıyorsa ilk istek erken gidebilir —
// ağ hatasında kısa aralıklarla birkaç kez yeniden denenir.
async function firmalariGetirDenemeli() {
  let sonHata: unknown;
  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      return await getFirmalar();
    } catch (e) {
      sonHata = e;
      const agHatasi = e instanceof Error && e.message.includes('Sunucuya ulaşılamadı');
      if (!agHatasi) throw e;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw sonHata;
}

async function yukle() {
  yukleniyor.value = true;
  hata.value = '';
  try {
    firmalar.value = await firmalariGetirDenemeli();
    // Form sayfasından ?secili=<id> ile dönüldüyse o firmayı seçili aç
    const seciliId = route.query.secili as string | undefined;
    if (seciliId) {
      const firma = firmalar.value.find((f) => f._id === seciliId);
      if (firma) sec(firma);
      router.replace('/firma'); // query'yi temizle
    } else if (secili.value) {
      // açık detay varsa güncel veriyle tazele
      secili.value = firmalar.value.find((f) => f._id === secili.value?._id) ?? null;
      if (secili.value) resimleriYukle(secili.value);
    }
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Firmalar yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

const RESIM_SLOTLARI: { anahtar: BelgeSlotAnahtar; etiket: string }[] = [
  { anahtar: 'logo', etiket: 'Logo' },
  { anahtar: 'imzaKase', etiket: 'İmza & Kaşe' },
];
const EVRAK_SLOTLARI: { anahtar: KurumEvrakAnahtar; etiket: string }[] = [
  { anahtar: 'imzaSirkusu', etiket: 'İmza Sirküsü' },
  { anahtar: 'vergiLevhasi', etiket: 'Vergi Levhası' },
  { anahtar: 'sicilGazetesi', etiket: 'Sicil Gazetesi' },
  { anahtar: 'faaliyetBelgesi', etiket: 'Faaliyet Belgesi' },
];

const resimUrller = ref<Partial<Record<BelgeSlotAnahtar, string>>>({});

function resimleriYukle(f: Firma) {
  resimUrller.value = {};
  for (const s of RESIM_SLOTLARI) {
    const slot = f.belgeler?.[s.anahtar];
    if (slot) {
      getDosyaUrl(slot.dosyaAnahtari)
        .then((url) => (resimUrller.value[s.anahtar] = url))
        .catch(() => { /* önizleme alınamazsa kutu boş görünür */ });
    }
  }
}

const { openFile } = useFileViewer();

// artidoksan1'deki belge görüntüleme sistemi: görüntülenebilir tipler
// (resim/PDF) tam ekran görüntüleyicide açılır, diğerleri indirmeye düşer.
async function dosyaGoruntule(slot: BelgeSlot | null | undefined) {
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
    hata.value = 'Belge açılamadı';
  }
}

function belgeGoruntule(anahtar: BelgeSlotAnahtar) {
  return dosyaGoruntule(secili.value?.belgeler?.[anahtar]);
}

// ---- Belge sekmeleri (Sanayi Sicil / TSE-HYB / ISO / CE): alanlar yerinde
// düzenlenir, her değişiklik anında kaydedilir (kısmi PUT) ----
type BelgeDosyaAlani = 'sanayiSicilDosya' | 'hybDosya' | 'isoDosya' | 'smmSozlesme';
const belgeDosyaYukleniyor = ref<Partial<Record<BelgeDosyaAlani, boolean>>>({});

async function firmaGuncelle(degisiklik: Omit<YeniFirma, 'ad'>) {
  const f = secili.value;
  if (!f) return;
  try {
    const guncel = await updateFirma(f._id, { ad: f.ad, ...degisiklik });
    secili.value = guncel;
    const i = firmalar.value.findIndex((x) => x._id === guncel._id);
    if (i >= 0) firmalar.value[i] = guncel;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kaydedilemedi';
  }
}

type MetinAlani = 'sanayiSicilBelgeNo' | 'hybBelgeNo';

function metinKaydet(alan: MetinAlani, event: Event) {
  firmaGuncelle({ [alan]: (event.target as HTMLInputElement).value });
}

// ---- SMM Bilgileri: SMM firması Ayarlar > SMM Firmaları listesinden
// seçilir; bilgileri olduğu gibi firmaya kopyalanır ----
const smmFirmalar = ref<SmmFirmasi[]>([]);
const smmSecAcik = ref(false);

// Seçim kutusunda görünen etiket: "yıl — kısa ad"
const seciliSmmEtiket = computed(() => {
  const f = secili.value;
  return f ? [f.smmYil, f.smmKisaAd].filter(Boolean).join(' — ') : '';
});

watch([aktifMenu, secili], ([menu]) => {
  if (menu !== 7 || !secili.value || smmFirmalar.value.length) return;
  getSmmFirmalari()
    .then((liste) => (smmFirmalar.value = liste))
    .catch(() => { /* havuz alınamazsa liste boş görünür */ });
});

// Popup'tan seçilen SMM firmasının bilgileri olduğu gibi firmaya kopyalanır
function smmFirmaSec(s: SmmFirmasi) {
  firmaGuncelle({
    smmFirmaId: s._id,
    smmYil: s.yil,
    smmKisaAd: s.kisaAd,
    smmUnvan: s.unvan,
    smmAdres: s.adres,
    smmBuroTescilBelgesi: s.buroTescilBelgesi ?? null,
    smmMakMuhAdSoyad: s.makMuhAdSoyad,
    smmMakMuhOdaSicilNo: s.makMuhOdaSicilNo,
    smmMakMuhTelefon: s.makMuhTelefon,
    smmMakMuhSmmBelgesi: s.makMuhSmmBelgesi ?? null,
    smmMakMuhImzaSirkusu: s.makMuhImzaSirkusu ?? null,
    smmElkMuhAdSoyad: s.elkMuhAdSoyad,
    smmElkMuhOdaSicilNo: s.elkMuhOdaSicilNo,
    smmElkMuhTelefon: s.elkMuhTelefon,
    smmElkMuhSmmBelgesi: s.elkMuhSmmBelgesi ?? null,
    smmElkMuhImzaSirkusu: s.elkMuhImzaSirkusu ?? null,
  });
}

// Mühendis bölümleri tek şablondan çizilir
const SMM_MUHENDISLER = [
  {
    baslik: 'Makine Mühendisi',
    ad: 'smmMakMuhAdSoyad', sicil: 'smmMakMuhOdaSicilNo', telefon: 'smmMakMuhTelefon',
    belgeler: [
      { anahtar: 'smmMakMuhSmmBelgesi', etiket: 'SMM Belgesi' },
      { anahtar: 'smmMakMuhImzaSirkusu', etiket: 'İmza Sirküsü' },
    ],
  },
  {
    baslik: 'Elektrik Mühendisi',
    ad: 'smmElkMuhAdSoyad', sicil: 'smmElkMuhOdaSicilNo', telefon: 'smmElkMuhTelefon',
    belgeler: [
      { anahtar: 'smmElkMuhSmmBelgesi', etiket: 'SMM Belgesi' },
      { anahtar: 'smmElkMuhImzaSirkusu', etiket: 'İmza Sirküsü' },
    ],
  },
] as const;

function tarihKaydet(alan: 'sanayiSicilBelgeTarihi' | 'hybIlkVerilis' | 'hybGecerlilik', event: Event) {
  firmaGuncelle({ [alan]: (event.target as HTMLInputElement).value || null });
}

// ISO 8601 → date input değeri (yyyy-MM-dd)
function tarihInput(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : '';
}

async function belgeDosyaSec(alan: BelgeDosyaAlani, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) return;
  belgeDosyaYukleniyor.value[alan] = true;
  try {
    const slot = await uploadDosya(file);
    await firmaGuncelle({ [alan]: slot });
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    belgeDosyaYukleniyor.value[alan] = false;
  }
}

// ---- Kurum evrakları (Genel Bilgiler): her tür için ÇOKLU dosya/resim —
// yükleme ve fotoğraf çekme listenin sonuna ekler, satırlar görüntülenir ve
// SilmeOnayi ile silinir. belgeler'deki tekil yuva geriye uyum için listenin
// ilk dosyasıyla senkron tutulur ----
const evrakYukleniyor = ref<Partial<Record<KurumEvrakAnahtar, boolean>>>({});
const evrakFotoAnahtar = ref<KurumEvrakAnahtar | null>(null);
const evrakSilinecek = ref<{ anahtar: KurumEvrakAnahtar; i: number } | null>(null);
const evrakFotoAcik = computed({
  get: () => evrakFotoAnahtar.value != null,
  set(v: boolean) {
    if (!v) evrakFotoAnahtar.value = null;
  },
});

function evrakListesi(anahtar: KurumEvrakAnahtar): BelgeSlot[] {
  const f = secili.value;
  if (!f) return [];
  const liste = f.kurumEvrakDosyalari?.[anahtar];
  if (liste?.length) return liste;
  const tekil = f.belgeler?.[anahtar];
  return tekil ? [tekil] : [];
}

async function evrakKaydet(anahtar: KurumEvrakAnahtar, yeniListe: BelgeSlot[]) {
  const f = secili.value;
  if (!f) return;
  const belgelerYeni = { ...f.belgeler };
  if (yeniListe[0]) belgelerYeni[anahtar] = yeniListe[0];
  else delete belgelerYeni[anahtar];
  await firmaGuncelle({
    kurumEvrakDosyalari: { ...f.kurumEvrakDosyalari, [anahtar]: yeniListe },
    belgeler: belgelerYeni,
  });
}

async function evrakEkle(anahtar: KurumEvrakAnahtar, files: File[]) {
  if (!secili.value || !files.length) return;
  evrakYukleniyor.value[anahtar] = true;
  try {
    const slotlar: BelgeSlot[] = [];
    for (const file of files) slotlar.push(await uploadDosya(file));
    await evrakKaydet(anahtar, [...evrakListesi(anahtar), ...slotlar]);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    evrakYukleniyor.value[anahtar] = false;
  }
}

function evrakSec(anahtar: KurumEvrakAnahtar, event: Event) {
  evrakEkle(anahtar, dosyalariSuz(event.target as HTMLInputElement));
}

// Kamera oturumundan dönen tüm kareler listeye eklenir
function evrakFotoCekildi(fotolar: File[]) {
  const anahtar = evrakFotoAnahtar.value;
  evrakFotoAnahtar.value = null;
  if (anahtar) evrakEkle(anahtar, fotolar);
}

async function evrakSilOnayla() {
  const hedef = evrakSilinecek.value;
  evrakSilinecek.value = null;
  if (!hedef) return;
  await evrakKaydet(hedef.anahtar, evrakListesi(hedef.anahtar).filter((_, j) => j !== hedef.i));
}

// ---- Logo / İmza & Kaşe: Kurum Evrakları gibi satırdan yönetilir, ama TEK
// resim (yeni yükleme/çekim eskisinin yerine geçer) ----
const resimYukleniyor = ref<Partial<Record<BelgeSlotAnahtar, boolean>>>({});
const resimFotoAnahtar = ref<BelgeSlotAnahtar | null>(null);
const resimSilinecek = ref<BelgeSlotAnahtar | null>(null);
const resimFotoAcik = computed({
  get: () => resimFotoAnahtar.value != null,
  set(v: boolean) {
    if (!v) resimFotoAnahtar.value = null;
  },
});

async function resimKaydet(anahtar: BelgeSlotAnahtar, slot: BelgeSlot | null) {
  const f = secili.value;
  if (!f) return;
  const belgelerYeni = { ...f.belgeler };
  if (slot) belgelerYeni[anahtar] = slot;
  else delete belgelerYeni[anahtar];
  await firmaGuncelle({ belgeler: belgelerYeni });
  if (secili.value) resimleriYukle(secili.value);
}

async function resimYukle(anahtar: BelgeSlotAnahtar, file: File | undefined) {
  if (!file || !secili.value) return;
  if (!file.type.startsWith('image/')) {
    hata.value = 'Yalnızca resim dosyası yüklenebilir';
    return;
  }
  resimYukleniyor.value[anahtar] = true;
  try {
    await resimKaydet(anahtar, await uploadDosya(file));
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    resimYukleniyor.value[anahtar] = false;
  }
}

function resimSec(anahtar: BelgeSlotAnahtar, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  resimYukle(anahtar, file);
}

// Kamera oturumundan tek resim: son çekilen kare kullanılır
function resimFotoCekildi(fotolar: File[]) {
  const anahtar = resimFotoAnahtar.value;
  resimFotoAnahtar.value = null;
  if (anahtar) resimYukle(anahtar, fotolar[fotolar.length - 1]);
}

async function resimSilOnayla() {
  const anahtar = resimSilinecek.value;
  resimSilinecek.value = null;
  if (anahtar) await resimKaydet(anahtar, null);
}

// ---- CE belgeleri: kart listesi + ortak formla (CeBelgeFormu) ekleme ve
// yerinde düzenleme + SilmeOnayi ile silme ----
const ceEkleAcik = ref(false);

// Kurum, onaylı kurumlar kataloğundan aramalı seçimle alınır (unvan kaydedilir)
const kurumlar = ref<OnayliKurumSecenek[]>([]);
const kurumSecenekleri = computed(() =>
  kurumlar.value.map((k) => ({ label: `${k.nobo} — ${k.unvan}`, value: k.unvan }))
);

async function kurumlariYukle() {
  if (kurumlar.value.length) return;
  try {
    kurumlar.value = await getOnayliKurumSecenekleri();
  } catch {
    /* liste alınamazsa seçenekler boş kalır */
  }
}

watch(ceEkleAcik, (acik) => {
  if (!acik) return;
  ceDuzenleIndex.value = null;
  kurumlariYukle();
});
const ceKaydediliyor = ref(false);
const bosCeForm = (): CeBelgesi => ({
  modul: 'Modul B', kurum: '', belgeNo: '', gecerlilikTarihi: null, bitisTarihi: null, dosya: null,
});
const ceForm = ref<CeBelgesi>(bosCeForm());

async function ceEkle() {
  const f = secili.value;
  if (!f || ceKaydediliyor.value) return;
  if (!ceForm.value.belgeNo.trim() && !ceForm.value.kurum.trim()) return;
  ceKaydediliyor.value = true;
  try {
    await firmaGuncelle({ ceBelgeleri: [...(f.ceBelgeleri ?? []), ceForm.value] });
    ceForm.value = bosCeForm();
    ceEkleAcik.value = false;
  } finally {
    ceKaydediliyor.value = false;
  }
}

// Düzenleme: kartın yerinde aynı form açılır, Kaydet listedeki satırı değiştirir
const ceDuzenleIndex = ref<number | null>(null);
const ceDuzenleForm = ref<CeBelgesi>(bosCeForm());

function ceDuzenleAc(i: number) {
  const ce = secili.value?.ceBelgeleri?.[i];
  if (!ce) return;
  ceEkleAcik.value = false;
  ceDuzenleForm.value = { ...ce };
  ceDuzenleIndex.value = i;
  kurumlariYukle();
}

async function ceDuzenleKaydet() {
  const f = secili.value;
  const i = ceDuzenleIndex.value;
  if (!f || i == null || ceKaydediliyor.value) return;
  ceKaydediliyor.value = true;
  try {
    const liste = [...(f.ceBelgeleri ?? [])];
    liste[i] = ceDuzenleForm.value;
    await firmaGuncelle({ ceBelgeleri: liste });
    ceDuzenleIndex.value = null;
  } finally {
    ceKaydediliyor.value = false;
  }
}

const ceSilinecek = ref<number | null>(null);

async function ceSilOnayla() {
  const f = secili.value;
  const i = ceSilinecek.value;
  ceSilinecek.value = null;
  if (!f || i == null) return;
  const liste = [...(f.ceBelgeleri ?? [])];
  liste.splice(i, 1);
  await firmaGuncelle({ ceBelgeleri: liste });
}

// ---- Cihazlar: serbest dosya/fotoğraf listesi — "Dosya Yükle" ve
// "Fotoğraf Çek" hep listenin sonuna ekler; satırlar görüntülenebilir ve
// SilmeOnayi ile tek tek silinir ----
const cihazYukleniyor = ref(false);
const fotoCekAcik = ref(false);
const cihazSilinecek = ref<number | null>(null);
// Resim satırlarının küçük önizlemeleri (dosyaAnahtari → url) — Cihazlar ve
// Personel (SGK) sekmelerindeki tüm dosya listeleri için ortak önbellek
const dosyaOnizlemeler = ref<Record<string, string>>({});

watch([aktifMenu, secili], ([menu]) => {
  if (menu === 4 || menu === 8) dosyaOnizlemeleriYukle();
});

function dosyaOnizlemeleriYukle() {
  const f = secili.value;
  if (!f) return;
  const slotlar = [...(f.cihazDosyalari ?? []), ...(f.sgkDokumleri ?? [])];
  for (const slot of slotlar) {
    if (!slot.mimeType.startsWith('image/') || dosyaOnizlemeler.value[slot.dosyaAnahtari]) continue;
    getDosyaUrl(slot.dosyaAnahtari)
      .then((url) => (dosyaOnizlemeler.value[slot.dosyaAnahtari] = url))
      .catch(() => { /* önizleme alınamazsa satırda dosya ikonu kalır */ });
  }
}

// PDF/resim dışındakiler elenir (gizli inputların accept filtresiyle uyumlu)
function dosyalariSuz(input: HTMLInputElement) {
  const files = Array.from(input.files ?? []).filter(
    (f) => f.type === 'application/pdf' || f.type.startsWith('image/')
  );
  input.value = '';
  return files;
}

// Seçilen/çekilen dosyaları sırayla yükleyip ilgili listenin sonuna ekler
async function listeyeDosyaEkle(
  alan: 'cihazDosyalari' | 'sgkDokumleri',
  files: File[],
  yukleniyor: typeof cihazYukleniyor
) {
  const f = secili.value;
  if (!f || !files.length) return;
  yukleniyor.value = true;
  try {
    const slotlar: BelgeSlot[] = [];
    for (const file of files) slotlar.push(await uploadDosya(file));
    await firmaGuncelle({ [alan]: [...(f[alan] ?? []), ...slotlar] });
    dosyaOnizlemeleriYukle();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    yukleniyor.value = false;
  }
}

function cihazlaraEkle(files: File[]) {
  return listeyeDosyaEkle('cihazDosyalari', files, cihazYukleniyor);
}

function cihazDosyaSec(event: Event) {
  cihazlaraEkle(dosyalariSuz(event.target as HTMLInputElement));
}

async function cihazSilOnayla() {
  const f = secili.value;
  const i = cihazSilinecek.value;
  cihazSilinecek.value = null;
  if (!f || i == null) return;
  const liste = [...(f.cihazDosyalari ?? [])];
  liste.splice(i, 1);
  await firmaGuncelle({ cihazDosyalari: liste });
}

// ---- Personel sekmesi: sabit görev sahipleri — her değişiklik anında
// kaydedilir (kısmi PUT) ----
const PERSONEL_ALANLARI: { anahtar: keyof FirmaPersonel; etiket: string }[] = [
  { anahtar: 'genelMudur', etiket: 'Genel Müdür' },
  { anahtar: 'kytTemsilcisi', etiket: 'KYT Temsilcisi' },
  { anahtar: 'montajSorumlusu', etiket: 'Montaj Sorumlusu' },
  { anahtar: 'bakimSorumlusu', etiket: 'Bakım Sorumlusu' },
  { anahtar: 'satinAlmaSorumlusu', etiket: 'Satın Alma Sorumlusu' },
  { anahtar: 'sonKontrolSorumlusu', etiket: 'Son Kontrol Sorumlusu' },
];

function personelKaydet(anahtar: keyof FirmaPersonel, event: Event) {
  const f = secili.value;
  if (!f) return;
  firmaGuncelle({ personel: { ...f.personel, [anahtar]: (event.target as HTMLInputElement).value } });
}

// ---- Mühendisler: tür + ad soyad; her mühendise dosya/foto eklenebilir ----
const MUH_TURLERI = [
  { deger: 'elektrik', etiket: 'Elektrik Mühendisi' },
  { deger: 'makine', etiket: 'Makine Mühendisi' },
] as const;

const muhEkleAcik = ref(false);
const muhKaydediliyor = ref(false);
const bosMuhForm = (): Pick<Muhendis, 'tur' | 'adSoyad'> => ({ tur: 'elektrik', adSoyad: '' });
const muhForm = ref(bosMuhForm());

async function muhendisEkle() {
  const f = secili.value;
  if (!f || muhKaydediliyor.value || !muhForm.value.adSoyad.trim()) return;
  muhKaydediliyor.value = true;
  try {
    await firmaGuncelle({
      muhendisler: [...(f.muhendisler ?? []), { ...muhForm.value, adSoyad: muhForm.value.adSoyad.trim(), belgeler: [] }],
    });
    muhForm.value = bosMuhForm();
    muhEkleAcik.value = false;
  } finally {
    muhKaydediliyor.value = false;
  }
}

// Mühendise belge ekleme: dosya seç veya foto çek — hep listenin sonuna ekler
const muhBelgeYukleniyor = ref<number | null>(null);

async function muhendiseBelgeEkle(mi: number, files: File[]) {
  const f = secili.value;
  if (!f || !files.length) return;
  muhBelgeYukleniyor.value = mi;
  try {
    const slotlar: BelgeSlot[] = [];
    for (const file of files) slotlar.push(await uploadDosya(file));
    const liste = (f.muhendisler ?? []).map((m, i) =>
      i === mi ? { ...m, belgeler: [...(m.belgeler ?? []), ...slotlar] } : m
    );
    await firmaGuncelle({ muhendisler: liste });
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    muhBelgeYukleniyor.value = null;
  }
}

function muhBelgeSec(mi: number, event: Event) {
  muhendiseBelgeEkle(mi, dosyalariSuz(event.target as HTMLInputElement));
}

// Foto çekme oturumu hangi mühendis için açık
const muhFotoIndex = ref<number | null>(null);
const muhFotoAcik = computed({
  get: () => muhFotoIndex.value != null,
  set(v: boolean) { if (!v) muhFotoIndex.value = null; },
});

function muhFotolarEkle(fotolar: File[]) {
  const mi = muhFotoIndex.value;
  if (mi != null) muhendiseBelgeEkle(mi, fotolar);
}

// Silme: mühendisin kendisi (bi null) ya da tek belgesi
const muhSilinecek = ref<{ mi: number; bi: number | null } | null>(null);

const muhSilAciklama = computed(() => {
  const h = muhSilinecek.value;
  const m = h != null ? secili.value?.muhendisler?.[h.mi] : null;
  if (!h || !m) return '';
  return h.bi == null
    ? `${m.adSoyad || 'Mühendis'} (${MUHENDIS_TUR_ETIKETLERI[m.tur] ?? m.tur})`
    : m.belgeler?.[h.bi]?.dosyaAdi ?? 'Belge';
});

async function muhSilOnayla() {
  const f = secili.value;
  const h = muhSilinecek.value;
  muhSilinecek.value = null;
  if (!f || !h) return;
  const liste = [...(f.muhendisler ?? [])];
  if (h.bi == null) {
    liste.splice(h.mi, 1);
  } else {
    const m = liste[h.mi];
    if (!m) return;
    const belgeler = [...(m.belgeler ?? [])];
    belgeler.splice(h.bi, 1);
    liste[h.mi] = { ...m, belgeler };
  }
  await firmaGuncelle({ muhendisler: liste });
}

// ---- SGK Dökümü: cihazlardaki dosya/foto akışının aynısı ----
const sgkYukleniyor = ref(false);
const sgkFotoAcik = ref(false);
const sgkSilinecek = ref<number | null>(null);

function sgkEkle(files: File[]) {
  return listeyeDosyaEkle('sgkDokumleri', files, sgkYukleniyor);
}

function sgkDosyaSec(event: Event) {
  sgkEkle(dosyalariSuz(event.target as HTMLInputElement));
}

async function sgkSilOnayla() {
  const f = secili.value;
  const i = sgkSilinecek.value;
  sgkSilinecek.value = null;
  if (!f || i == null) return;
  const liste = [...(f.sgkDokumleri ?? [])];
  liste.splice(i, 1);
  await firmaGuncelle({ sgkDokumleri: liste });
}

// ---- Cihaz dosyaları için ZIP linki: popup açılır açılmaz tüm dosyalar
// sunucuda tek ZIP'te toplanır ve paylaşılabilir indirme linki üretilir ----
const zipAcik = ref(false);
const zipUrl = ref('');
const zipHata = ref('');

async function zipLinkOlustur() {
  const f = secili.value;
  if (!f?.cihazDosyalari?.length) return;
  zipAcik.value = true;
  zipUrl.value = '';
  zipHata.value = '';
  try {
    const zipAdi = `${f.ad.trim().replace(/\s+/g, '-') || 'firma'}-cihazlar.zip`;
    const { url } = await createZipLink(
      zipAdi,
      f.cihazDosyalari.map((d) => ({ dosyaAnahtari: d.dosyaAnahtari, dosyaAdi: d.dosyaAdi }))
    );
    zipUrl.value = url;
  } catch (e) {
    zipHata.value = e instanceof Error ? e.message : 'Link oluşturulamadı';
  }
}

// Montajlar sekmesi: seçili firmanın asansörleri
const montajlar = ref<Asansor[]>([]);
const montajlarYukleniyor = ref(false);

async function montajlariYukle(firmaIdDegeri: string) {
  montajlarYukleniyor.value = true;
  try {
    montajlar.value = await getAsansorler({ firmaId: firmaIdDegeri });
  } catch {
    montajlar.value = [];
  } finally {
    montajlarYukleniyor.value = false;
  }
}

function sec(firma: Firma) {
  secili.value = firma;
  aktifMenu.value = 1;
  resimleriYukle(firma);
  montajlariYukle(firma._id);
}

function git(path: string) {
  blurActive();
  router.push(path);
}

function tarih(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR');
}

function saat(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR');
}

onIonViewWillEnter(yukle);
</script>

<template>
  <ion-page>
    <!-- Header: scroll boyunca üstte sabit -->
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-bar">
        <header class="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <button v-if="secili" type="button" @click="secili = null"
              class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <!-- Detayda küçük font + truncate: uzun firma adları taşmaz -->
            <h1 class="truncate font-bold leading-8 tracking-wide text-ink"
              :class="secili ? 'text-base' : 'text-xl'">
              {{ secili ? secili.ad : 'Firma' }}
            </h1>
          </div>

          <button v-if="!secili" type="button" @click="git('/firma/yeni')"
            class="flex items-center gap-1.5 bg-[#2b5c3d] px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Yeni Ekle
          </button>
          <!-- Düzenle butonu header'da değil, yalnız Genel Bilgiler bölümünde -->
        </header>

      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg">
        <!-- Hata -->
        <div v-if="hata"
          class="mx-4 mt-4 flex items-center gap-2 bg-red-950/60 px-3 py-2 ring-1 ring-red-500/20">
          <span class="min-w-0 flex-1 text-sm text-red-300">{{ hata }}</span>
          <button type="button" @click="yukle"
            class="shrink-0 bg-surface-800 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-white/10">
            Tekrar Dene
          </button>
        </div>

        <!-- Firma detayı içeriği -->
        <section v-if="secili" class="space-y-2 px-2 pb-6 pt-2">
          <!-- Menü ızgarası — Güvenlik Aksamlar panelindeki görünümün aynısı:
          ikon + yazı yan yana kutucuklar, seçili olan vurgulu -->
          <div class="grid grid-cols-2 gap-1.5 px-1">
            <button v-for="m in menuler" :key="m.no" type="button" @click="aktifMenu = m.no"
              class="flex w-full items-center gap-2 px-2.5 py-2.5 ring-1 ring-white/10"
              :class="aktifMenu === m.no
                ? 'bg-[#223c2d] text-ink'
                : 'bg-surface-900 active:bg-[#1a2a20]'">
              <span class="text-base leading-none" aria-hidden="true">{{ m.icon }}</span>
              <span class="min-w-0 truncate text-left text-[11px] font-medium"
                :class="aktifMenu === m.no ? 'text-ink' : 'text-ink-muted'">
                {{ m.etiket }}
              </span>
            </button>
          </div>

          <div class="min-h-48 bg-[#223c2d]/40 p-3 ring-1 ring-white/10">
            <div v-if="aktifMenu === 1" class="space-y-3">
              <!-- Düzenle yalnız bu bölümde görünür (kullanıcı isteği) -->
              <div class="flex justify-end">
                <button type="button" @click="git(`/firma/${secili._id}/duzenle`)"
                  class="flex shrink-0 items-center gap-1.5 bg-surface-800 px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21.17 6.83a2.85 2.85 0 0 0-4-4L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  Düzenle
                </button>
              </div>
              <!-- Genel Bilgiler: kayıtlı firma bilgileri tablosu -->
              <table class="w-full border-collapse text-xs">
                <tbody class="divide-y divide-white/5">
                  <tr v-for="[etiket, deger] in genelBilgiler" :key="etiket" class="even:bg-white/2">
                    <td class="w-32 py-2 pr-2 pl-1 align-top font-medium text-ink-muted">{{ etiket }}</td>
                    <td class="py-2 pr-1 text-ink" :class="{ 'text-ink-muted/50': !deger }">{{ deger || '—' }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Logo + İmza & Kaşe: tek resim — yükle / fotoğraf çek / görüntüle / sil -->
              <div class="space-y-1.5">
                <p class="text-xs font-semibold text-ink">Logo ve İmza & Kaşe</p>
                <div v-for="s in RESIM_SLOTLARI" :key="s.anahtar"
                  class="flex items-center gap-1.5 bg-surface-900/60 p-2 ring-1 ring-white/5">
                  <button type="button" :disabled="!secili.belgeler?.[s.anahtar]"
                    @click="belgeGoruntule(s.anahtar)" :aria-label="`${s.etiket} görüntüle`"
                    class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/5">
                    <img v-if="resimUrller[s.anahtar]" :src="resimUrller[s.anahtar]" :alt="s.etiket"
                      class="h-full w-full object-contain p-0.5" />
                    <span v-else class="text-[9px] text-ink-muted/50">
                      {{ secili.belgeler?.[s.anahtar] ? '…' : 'Yok' }}
                    </span>
                  </button>
                  <span class="min-w-0 flex-1">
                    <span class="block text-xs font-medium text-ink-muted">{{ s.etiket }}</span>
                    <span class="block truncate text-[11px]"
                      :class="secili.belgeler?.[s.anahtar] ? 'text-ink' : 'text-ink-muted/50'">
                      {{ resimYukleniyor[s.anahtar] ? 'Yükleniyor…' : secili.belgeler?.[s.anahtar]?.dosyaAdi || 'Yüklenmemiş' }}
                    </span>
                  </span>
                  <label :aria-label="`${s.etiket} için resim yükle`"
                    class="grid h-6.5 w-8 shrink-0 cursor-pointer place-items-center border border-dashed border-white/20 text-ink-muted active:border-white/40 active:text-ink">
                    <input type="file" accept="image/*" class="hidden" @change="resimSec(s.anahtar, $event)" />
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="m17 8-5-5-5 5" />
                      <path d="M12 3v12" />
                    </svg>
                  </label>
                  <button type="button" @click="resimFotoAnahtar = s.anahtar"
                    :aria-label="`${s.etiket} için fotoğraf çek`"
                    class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                  </button>
                  <button v-if="secili.belgeler?.[s.anahtar]" type="button"
                    @click="belgeGoruntule(s.anahtar)" :aria-label="`${s.etiket} görüntüle`"
                    class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button v-if="secili.belgeler?.[s.anahtar]" type="button"
                    @click="resimSilinecek = s.anahtar" :aria-label="`${s.etiket} sil`"
                    class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                    ✕
                  </button>
                </div>
              </div>

              <!-- Kurum evrakları: her tür için çoklu dosya/resim — yükleme ve
                fotoğraf çekme listeye ekler; satırlar görüntülenir ve silinir -->
              <div class="space-y-1.5">
                <p class="text-xs font-semibold text-ink">Kurum Evrakları</p>
                <div v-for="s in EVRAK_SLOTLARI" :key="s.anahtar"
                  class="space-y-1 bg-surface-900/60 p-2 ring-1 ring-white/5">
                  <div class="flex items-center justify-between gap-1.5">
                    <span class="min-w-0 flex-1 truncate text-xs font-medium text-ink-muted">
                      {{ s.etiket }} ({{ evrakListesi(s.anahtar).length }})
                    </span>
                    <label :aria-label="`${s.etiket} için dosya yükle`"
                      class="grid h-6.5 w-8 shrink-0 cursor-pointer place-items-center border border-dashed border-white/20 text-ink-muted active:border-white/40 active:text-ink">
                      <input type="file" multiple accept="application/pdf,image/*" class="hidden"
                        @change="evrakSec(s.anahtar, $event)" />
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <path d="m17 8-5-5-5 5" />
                        <path d="M12 3v12" />
                      </svg>
                    </label>
                    <button type="button" @click="evrakFotoAnahtar = s.anahtar"
                      :aria-label="`${s.etiket} için fotoğraf çek`"
                      class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                    </button>
                  </div>

                  <p v-if="evrakYukleniyor[s.anahtar]" class="text-center text-[11px] text-ink-muted">
                    Yükleniyor…
                  </p>
                  <p v-if="!evrakListesi(s.anahtar).length && !evrakYukleniyor[s.anahtar]"
                    class="text-[11px] text-ink-muted/50">
                    Yüklenmemiş
                  </p>

                  <div v-for="(d, i) in evrakListesi(s.anahtar)" :key="d.dosyaAnahtari + i"
                    class="flex items-center gap-1.5 bg-surface-900 px-2 py-1.5 ring-1 ring-white/5">
                    <span class="min-w-0 flex-1 truncate text-xs text-ink">{{ d.dosyaAdi }}</span>
                    <button type="button" @click="dosyaGoruntule(d)" aria-label="Evrakı görüntüle"
                      class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button type="button" @click="evrakSilinecek = { anahtar: s.anahtar, i }"
                      aria-label="Evrakı sil"
                      class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- Montajlar: firmanın asansörleri -->
            <div v-else-if="aktifMenu === 2" class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-ink">Montajlar ({{ montajlar.length }})</p>
                <button type="button" @click="git(`/asansor/yeni?firma=${secili._id}`)"
                  class="flex items-center gap-1 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2.5" stroke-linecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Yeni Asansör
                </button>
              </div>
              <p v-if="montajlarYukleniyor" class="py-4 text-center text-xs text-ink-muted">Yükleniyor…</p>
              <p v-else-if="!montajlar.length" class="py-4 text-center text-xs text-ink-muted">
                Bu firmaya kayıtlı asansör yok.
              </p>
              <button v-for="montaj in montajlar" :key="montaj._id" type="button"
                @click="git(`/asansor/${montaj._id}`)"
                class="flex w-full items-center gap-2 bg-surface-900/60 px-2.5 py-2 text-left ring-1 ring-white/5 active:bg-[#1a2a20]">
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-xs font-semibold text-ink">Seri: {{ montaj.seriNo || montaj.yapiRuhsatNo || '—' }}</span>
                  <span class="block truncate text-[11px] text-ink-muted">
                    {{ [[montaj.ilce, montaj.il].filter(Boolean).join('/'), montaj.yapiRuhsatNo ? `Ruhsat: ${montaj.yapiRuhsatNo}` : ''].filter(Boolean).join(' • ') || '—' }}
                  </span>
                </span>
                <svg class="h-3.5 w-3.5 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
            <!-- CE Belgeleri: modül/kurum/belge no/tarih tablosu + ekle/sil -->
            <div v-else-if="aktifMenu === 3" class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-ink">CE Belgeleri ({{ secili.ceBelgeleri?.length ?? 0 }})</p>
                <button type="button" @click="ceEkleAcik = !ceEkleAcik"
                  class="flex items-center gap-1 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2.5" stroke-linecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Ekle
                </button>
              </div>

              <!-- Yeni CE belgesi formu -->
              <CeBelgeFormu v-if="ceEkleAcik" v-model:belge="ceForm" :kurumlar="kurumSecenekleri"
                :kaydediliyor="ceKaydediliyor"
                @vazgec="ceEkleAcik = false; ceForm = bosCeForm()" @kaydet="ceEkle" />

              <p v-if="!secili.ceBelgeleri?.length && !ceEkleAcik" class="py-4 text-center text-xs text-ink-muted">
                Henüz CE belgesi eklenmedi.
              </p>

              <!-- Kart listesi: her belge alt alta bir panel; kalemle yerinde düzenlenir -->
              <template v-for="(ce, i) in secili.ceBelgeleri ?? []" :key="ce._id ?? i">
                <CeBelgeFormu v-if="ceDuzenleIndex === i" v-model:belge="ceDuzenleForm"
                  :kurumlar="kurumSecenekleri" :kaydediliyor="ceKaydediliyor"
                  @vazgec="ceDuzenleIndex = null" @kaydet="ceDuzenleKaydet" />
                <div v-else class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex min-w-0 flex-1 items-center gap-1.5">
                      <span
                        class="shrink-0 bg-[#1c2a21] px-2 py-0.5 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                        {{ ce.modul || '—' }}
                      </span>
                      <span class="truncate text-xs font-bold text-ink">{{ ce.belgeNo || '—' }}</span>
                    </div>
                    <div class="flex shrink-0 gap-1">
                      <button type="button" @click="ceDuzenleAc(i)" aria-label="CE belgesini düzenle"
                        class="grid h-6.5 w-8 place-items-center bg-surface-900 text-ink-muted ring-1 ring-white/10 active:text-ink">
                        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21.17 6.83a2.83 2.83 0 0 0-4-4L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                      <button type="button" @click="ceSilinecek = i" aria-label="CE belgesini sil"
                        class="grid h-6.5 w-8 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                        ✕
                      </button>
                    </div>
                  </div>

                  <p class="text-xs leading-snug text-ink">{{ ce.kurum || '—' }}</p>

                  <div class="grid grid-cols-2 gap-1.5">
                    <div class="bg-surface-900 px-2 py-1 ring-1 ring-white/5">
                      <span class="block text-[10px] text-ink-muted/70">Geçerlilik Tarihi</span>
                      <span class="text-[11px] font-semibold text-ink">
                        {{ ce.gecerlilikTarihi ? tarih(ce.gecerlilikTarihi) : '—' }}
                      </span>
                    </div>
                    <div class="bg-surface-900 px-2 py-1 ring-1 ring-white/5">
                      <span class="block text-[10px] text-ink-muted/70">Bitiş Tarihi</span>
                      <span class="text-[11px] font-semibold text-ink">
                        {{ ce.bitisTarihi ? tarih(ce.bitisTarihi) : '—' }}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 border-t border-white/5 pt-1.5">
                    <button v-if="ce.dosya" type="button" @click="dosyaGoruntule(ce.dosya)"
                      aria-label="Belgeyi görüntüle"
                      class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <span class="min-w-0 flex-1 truncate text-[11px]"
                      :class="ce.dosya ? 'text-ink' : 'text-ink-muted/60'">
                      {{ ce.dosya?.dosyaAdi ?? 'Belge yüklenmedi' }}
                    </span>
                  </div>
                </div>
              </template>
            </div>

            <!-- Cihazlar: serbest dosya/fotoğraf listesi — yükleme hep sona ekler -->
            <div v-else-if="aktifMenu === 4" class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-semibold text-ink">Cihazlar ({{ secili.cihazDosyalari?.length ?? 0 }})</p>
                <div class="flex shrink-0 gap-1.5">
                  <label
                    class="flex cursor-pointer items-center gap-1 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                    <input type="file" multiple accept="application/pdf,image/*" class="hidden"
                      @change="cihazDosyaSec" />
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="m17 8-5-5-5 5" />
                      <path d="M12 3v12" />
                    </svg>
                    Dosya Yükle
                  </label>
                  <button type="button" @click="fotoCekAcik = true"
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

              <!-- Tüm dosyaları tek ZIP'te toplayan paylaşılabilir link -->
              <button v-if="secili.cihazDosyalari?.length" type="button" @click="zipLinkOlustur"
                class="flex w-full items-center justify-center gap-1.5 bg-surface-800 px-3 py-2 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Tüm Dosyalar İçin İndirme Linki Oluştur
              </button>

              <p v-if="cihazYukleniyor" class="py-1 text-center text-[11px] text-ink-muted">Yükleniyor…</p>

              <p v-if="!secili.cihazDosyalari?.length && !cihazYukleniyor"
                class="py-4 text-center text-xs text-ink-muted">
                Henüz dosya eklenmedi. "Dosya Yükle" veya "Fotoğraf Çek" ile ekleyin.
              </p>

              <div v-for="(d, i) in secili.cihazDosyalari" :key="d.dosyaAnahtari"
                class="flex items-center gap-2 bg-surface-900/60 px-2 py-1.5 ring-1 ring-white/5">
                <button type="button" @click="dosyaGoruntule(d)" aria-label="Dosyayı görüntüle"
                  class="grid h-11 w-11 shrink-0 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
                  <img v-if="dosyaOnizlemeler[d.dosyaAnahtari]" :src="dosyaOnizlemeler[d.dosyaAnahtari]"
                    :alt="d.dosyaAdi" class="h-full w-full object-cover" />
                  <svg v-else class="h-5 w-5 text-ink-muted" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  </svg>
                </button>
                <button type="button" @click="dosyaGoruntule(d)" class="min-w-0 flex-1 text-left">
                  <span class="block truncate text-xs font-medium text-ink">{{ d.dosyaAdi }}</span>
                  <span class="block text-[11px] text-ink-muted">
                    {{ tarih(d.yuklenmeTarihi) }} {{ saat(d.yuklenmeTarihi) }}
                  </span>
                </button>
                <button type="button" @click="dosyaGoruntule(d)" aria-label="Dosyayı görüntüle"
                  class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button type="button" @click="cihazSilinecek = i" aria-label="Dosyayı sil"
                  class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                  ✕
                </button>
              </div>
            </div>

            <!-- TSE-HYB Belgesi: belge no + ilk veriliş + geçerlilik + dosya -->
            <div v-else-if="aktifMenu === 5" class="space-y-2">
              <p class="text-xs font-semibold text-ink">TSE-HYB Belgesi</p>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Belge No</span>
                <input :value="secili.hybBelgeNo" type="text" placeholder="Örn. 01-HYB-4315"
                  @change="metinKaydet('hybBelgeNo', $event)"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
              </label>
              <div class="grid grid-cols-2 gap-1.5">
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">İlk Veriliş</span>
                  <input :value="tarihInput(secili.hybIlkVerilis)" type="date"
                    @change="tarihKaydet('hybIlkVerilis', $event)"
                    class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
                </label>
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Geçerlilik Tarihi</span>
                  <input :value="tarihInput(secili.hybGecerlilik)" type="date"
                    @change="tarihKaydet('hybGecerlilik', $event)"
                    class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
                </label>
              </div>
              <div class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Belge</span>
                <div class="flex items-center gap-1.5">
                  <label
                    class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                    <input type="file" accept="application/pdf,image/*" class="hidden"
                      @change="belgeDosyaSec('hybDosya', $event)" />
                    {{ belgeDosyaYukleniyor.hybDosya ? 'Yükleniyor…' : secili.hybDosya ? 'Değiştir' : '+ Belge Yükle' }}
                  </label>
                  <span class="min-w-0 flex-1 truncate text-xs"
                    :class="secili.hybDosya ? 'text-ink' : 'text-ink-muted/60'">
                    {{ secili.hybDosya?.dosyaAdi ?? 'Belge yüklenmedi' }}
                  </span>
                  <button v-if="secili.hybDosya" type="button" @click="dosyaGoruntule(secili.hybDosya)"
                    aria-label="Belgeyi görüntüle"
                    class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button v-if="secili.hybDosya" type="button" @click="firmaGuncelle({ hybDosya: null })"
                    aria-label="Belgeyi kaldır"
                    class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <!-- Sanayi Sicil Belgesi: belge no + tarih + dosya; altında ISO belgesi -->
            <div v-else-if="aktifMenu === 6" class="space-y-2">
              <p class="text-xs font-semibold text-ink">Sanayi Sicil Belgesi</p>
              <div class="grid grid-cols-2 gap-1.5">
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Belge No</span>
                  <input :value="secili.sanayiSicilBelgeNo" type="text" placeholder="Örn. 839080"
                    @change="metinKaydet('sanayiSicilBelgeNo', $event)"
                    class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
                </label>
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Belge Tarihi</span>
                  <input :value="tarihInput(secili.sanayiSicilBelgeTarihi)" type="date"
                    @change="tarihKaydet('sanayiSicilBelgeTarihi', $event)"
                    class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
                </label>
              </div>
              <div class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Belge</span>
                <div class="flex items-center gap-1.5">
                  <label
                    class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                    <input type="file" accept="application/pdf,image/*" class="hidden"
                      @change="belgeDosyaSec('sanayiSicilDosya', $event)" />
                    {{ belgeDosyaYukleniyor.sanayiSicilDosya ? 'Yükleniyor…' : secili.sanayiSicilDosya ? 'Değiştir' : '+ Belge Yükle' }}
                  </label>
                  <span class="min-w-0 flex-1 truncate text-xs"
                    :class="secili.sanayiSicilDosya ? 'text-ink' : 'text-ink-muted/60'">
                    {{ secili.sanayiSicilDosya?.dosyaAdi ?? 'Belge yüklenmedi' }}
                  </span>
                  <button v-if="secili.sanayiSicilDosya" type="button"
                    @click="dosyaGoruntule(secili.sanayiSicilDosya)" aria-label="Belgeyi görüntüle"
                    class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button v-if="secili.sanayiSicilDosya" type="button"
                    @click="firmaGuncelle({ sanayiSicilDosya: null })" aria-label="Belgeyi kaldır"
                    class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                    ✕
                  </button>
                </div>
              </div>

              <p class="border-t border-white/5 pt-3 text-xs font-semibold text-ink">ISO Belgesi</p>
              <div class="flex items-center gap-1.5">
                <label
                  class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                  <input type="file" accept="application/pdf,image/*" class="hidden"
                    @change="belgeDosyaSec('isoDosya', $event)" />
                  {{ belgeDosyaYukleniyor.isoDosya ? 'Yükleniyor…' : secili.isoDosya ? 'Değiştir' : '+ Belge Yükle' }}
                </label>
                <span class="min-w-0 flex-1 truncate text-xs"
                  :class="secili.isoDosya ? 'text-ink' : 'text-ink-muted/60'">
                  {{ secili.isoDosya?.dosyaAdi ?? 'Belge yüklenmedi' }}
                </span>
                <button v-if="secili.isoDosya" type="button" @click="dosyaGoruntule(secili.isoDosya)"
                  aria-label="Belgeyi görüntüle"
                  class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button v-if="secili.isoDosya" type="button" @click="firmaGuncelle({ isoDosya: null })"
                  aria-label="Belgeyi kaldır"
                  class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                  ✕
                </button>
              </div>
            </div>

            <!-- SMM Bilgileri: SMM firması seçilir, bilgileri olduğu gibi
            kopyalanıp tablo halinde gösterilir (kayıt düzenlemesi Ayarlar >
            SMM Firmaları'nda yapılır) -->
            <div v-else-if="aktifMenu === 7" class="space-y-2">
              <div class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">SMM Firması</span>
                <div class="flex items-center gap-1.5">
                  <span class="min-w-0 flex-1 truncate bg-surface-900 px-2.5 py-2 text-xs ring-1 ring-white/10"
                    :class="seciliSmmEtiket ? 'text-ink' : 'text-ink-muted/60'">
                    {{ seciliSmmEtiket || 'SMM firması seçilmedi' }}
                  </span>
                  <button type="button" @click="smmSecAcik = true"
                    class="shrink-0 bg-[#2b5c3d] px-3 py-2 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                    {{ seciliSmmEtiket ? 'Değiştir' : 'Seç' }}
                  </button>
                </div>
              </div>

              <p v-if="!secili.smmFirmaId && !secili.smmKisaAd" class="text-xs text-ink-muted">
                SMM firması seçin; bilgileri burada görüntülenir.
              </p>
              <div v-else class="overflow-hidden ring-1 ring-white/10">
                  <table class="w-full text-left text-xs">
                    <tbody>
                      <tr class="border-b border-white/5">
                        <th class="w-28 bg-surface-900 px-2.5 py-2 text-[11px] font-medium text-ink-muted">Yıl</th>
                        <td class="px-2.5 py-2">
                          <span v-if="secili.smmYil"
                            class="bg-[#1c2a21] px-2 py-0.5 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                            {{ secili.smmYil }}
                          </span>
                          <span v-else class="text-ink-muted/60">—</span>
                        </td>
                      </tr>
                      <tr class="border-b border-white/5">
                        <th class="w-28 bg-surface-900 px-2.5 py-2 text-[11px] font-medium text-ink-muted">Kısa Adı</th>
                        <td class="px-2.5 py-2 font-semibold text-ink">{{ secili.smmKisaAd || '—' }}</td>
                      </tr>
                      <tr class="border-b border-white/5">
                        <th class="w-28 bg-surface-900 px-2.5 py-2 text-[11px] font-medium text-ink-muted">Ünvan</th>
                        <td class="px-2.5 py-2 text-ink">{{ secili.smmUnvan || '—' }}</td>
                      </tr>
                      <tr class="border-b border-white/5">
                        <th class="w-28 bg-surface-900 px-2.5 py-2 text-[11px] font-medium text-ink-muted">Adres</th>
                        <td class="px-2.5 py-2 text-ink">{{ secili.smmAdres || '—' }}</td>
                      </tr>
                      <tr class="border-b border-white/5">
                        <th class="w-28 bg-surface-900 px-2.5 py-2 text-[11px] font-medium text-ink-muted">Büro Tescil Belgesi</th>
                        <td class="px-2.5 py-1.5">
                          <div class="flex items-center justify-between gap-2">
                            <span class="min-w-0 truncate"
                              :class="secili.smmBuroTescilBelgesi ? 'text-ink' : 'text-ink-muted/60'">
                              {{ secili.smmBuroTescilBelgesi?.dosyaAdi ?? '—' }}
                            </span>
                            <button v-if="secili.smmBuroTescilBelgesi" type="button"
                              @click="dosyaGoruntule(secili.smmBuroTescilBelgesi)" aria-label="Belgeyi görüntüle"
                              class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      <template v-for="m in SMM_MUHENDISLER" :key="m.baslik">
                        <tr>
                          <td colspan="2"
                            class="border-b border-white/5 bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                            {{ m.baslik }}
                          </td>
                        </tr>
                        <tr class="border-b border-white/5">
                          <th class="w-28 bg-surface-900 px-2.5 py-2 text-[11px] font-medium text-ink-muted">Ad/Soyad</th>
                          <td class="px-2.5 py-2 font-medium text-ink">{{ secili[m.ad] || '—' }}</td>
                        </tr>
                        <tr class="border-b border-white/5">
                          <th class="w-28 bg-surface-900 px-2.5 py-2 text-[11px] font-medium text-ink-muted">Oda Sicil No</th>
                          <td class="px-2.5 py-2 text-ink">{{ secili[m.sicil] || '—' }}</td>
                        </tr>
                        <tr class="border-b border-white/5">
                          <th class="w-28 bg-surface-900 px-2.5 py-2 text-[11px] font-medium text-ink-muted">Telefon</th>
                          <td class="px-2.5 py-2 text-ink">{{ secili[m.telefon] || '—' }}</td>
                        </tr>
                        <tr v-for="b in m.belgeler" :key="b.anahtar" class="border-b border-white/5 last:border-b-0">
                          <th class="w-28 bg-surface-900 px-2.5 py-2 text-[11px] font-medium text-ink-muted">{{ b.etiket }}</th>
                          <td class="px-2.5 py-1.5">
                            <div class="flex items-center justify-between gap-2">
                              <span class="min-w-0 truncate"
                                :class="secili[b.anahtar] ? 'text-ink' : 'text-ink-muted/60'">
                                {{ secili[b.anahtar]?.dosyaAdi ?? '—' }}
                              </span>
                              <button v-if="secili[b.anahtar]" type="button"
                                @click="dosyaGoruntule(secili[b.anahtar])" aria-label="Belgeyi görüntüle"
                                class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>

              <!-- SMM sözleşmesi (PDF veya resim) -->
              <p class="border-t border-white/5 pt-3 text-xs font-semibold text-ink">Sözleşme</p>
              <div class="flex items-center gap-1.5">
                <label
                  class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                  <input type="file" accept="application/pdf,image/*" class="hidden"
                    @change="belgeDosyaSec('smmSozlesme', $event)" />
                  {{ belgeDosyaYukleniyor.smmSozlesme ? 'Yükleniyor…' : secili.smmSozlesme ? 'Değiştir' : '+ Sözleşme Yükle' }}
                </label>
                <span class="min-w-0 flex-1 truncate text-xs"
                  :class="secili.smmSozlesme ? 'text-ink' : 'text-ink-muted/60'">
                  {{ secili.smmSozlesme?.dosyaAdi ?? 'Sözleşme yüklenmedi' }}
                </span>
                <button v-if="secili.smmSozlesme" type="button" @click="dosyaGoruntule(secili.smmSozlesme)"
                  aria-label="Sözleşmeyi görüntüle"
                  class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button v-if="secili.smmSozlesme" type="button"
                  @click="firmaGuncelle({ smmSozlesme: null })" aria-label="Sözleşmeyi kaldır"
                  class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                  ✕
                </button>
              </div>
            </div>

            <!-- Personel: sabit görev sahipleri + mühendisler + SGK dökümü -->
            <div v-else-if="aktifMenu === 8" class="space-y-3">
              <p class="text-xs font-semibold text-ink">Personel</p>
              <div class="space-y-1.5">
                <label v-for="p in PERSONEL_ALANLARI" :key="p.anahtar" class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">{{ p.etiket }}</span>
                  <input :value="secili.personel?.[p.anahtar] ?? ''" type="text" placeholder="Ad Soyad"
                    @change="personelKaydet(p.anahtar, $event)"
                    class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
                </label>
              </div>

              <!-- Mühendisler -->
              <div class="flex items-center justify-between border-t border-white/5 pt-3">
                <p class="text-xs font-semibold text-ink">Mühendisler ({{ secili.muhendisler?.length ?? 0 }})</p>
                <button type="button" @click="muhEkleAcik = !muhEkleAcik"
                  class="flex items-center gap-1 bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2.5" stroke-linecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Mühendis Ekle
                </button>
              </div>

              <!-- Yeni mühendis formu -->
              <div v-if="muhEkleAcik" class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/10">
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Mühendis Türü</span>
                  <select v-model="muhForm.tur"
                    class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                    <option v-for="t in MUH_TURLERI" :key="t.deger" :value="t.deger">{{ t.etiket }}</option>
                  </select>
                </label>
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Ad Soyad</span>
                  <input v-model="muhForm.adSoyad" type="text"
                    class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
                </label>
                <div class="flex gap-1.5 pt-1">
                  <button type="button" @click="muhEkleAcik = false; muhForm = bosMuhForm()"
                    class="flex-1 bg-surface-800 px-3 py-2 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
                    Vazgeç
                  </button>
                  <button type="button" @click="muhendisEkle"
                    :disabled="muhKaydediliyor || !muhForm.adSoyad.trim()"
                    class="flex-1 bg-[#2b5c3d] px-3 py-2 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
                    {{ muhKaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
                  </button>
                </div>
              </div>

              <p v-if="!secili.muhendisler?.length && !muhEkleAcik"
                class="py-2 text-center text-xs text-ink-muted">
                Henüz mühendis eklenmedi.
              </p>

              <div v-for="(m, mi) in secili.muhendisler" :key="m._id ?? mi"
                class="bg-surface-900/60 ring-1 ring-white/5">
                <div class="flex items-center gap-2 px-2.5 py-2">
                  <span class="shrink-0 bg-[#1c2a21] px-2 py-0.5 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                    {{ MUHENDIS_TUR_ETIKETLERI[m.tur] ?? m.tur }}
                  </span>
                  <span class="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{{ m.adSoyad }}</span>
                  <button type="button" @click="muhSilinecek = { mi, bi: null }" aria-label="Mühendisi sil"
                    class="grid h-6 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                    ✕
                  </button>
                </div>

                <!-- Mühendisin belgeleri -->
                <div v-for="(b, bi) in m.belgeler" :key="b.dosyaAnahtari"
                  class="flex items-center gap-2 border-t border-white/5 px-2.5 py-1.5">
                  <span class="min-w-0 flex-1 truncate text-[11px] text-ink">{{ b.dosyaAdi }}</span>
                  <button type="button" @click="dosyaGoruntule(b)" aria-label="Belgeyi görüntüle"
                    class="grid h-6 w-7 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button type="button" @click="muhSilinecek = { mi, bi }" aria-label="Belgeyi sil"
                    class="grid h-6 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                    ✕
                  </button>
                </div>

                <!-- Belge ekleme: dosya seç veya foto çek -->
                <div class="flex gap-1.5 border-t border-white/5 px-2.5 py-2">
                  <label
                    class="flex flex-1 cursor-pointer items-center justify-center gap-1 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                    <input type="file" multiple accept="application/pdf,image/*" class="hidden"
                      @change="muhBelgeSec(mi, $event)" />
                    {{ muhBelgeYukleniyor === mi ? 'Yükleniyor…' : '+ Belge Ekle' }}
                  </label>
                  <button type="button" @click="muhFotoIndex = mi"
                    class="flex flex-1 items-center justify-center gap-1 bg-surface-800 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    Foto Çek
                  </button>
                </div>
              </div>

              <!-- SGK Dökümü -->
              <div class="flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                <p class="text-xs font-semibold text-ink">SGK Dökümü ({{ secili.sgkDokumleri?.length ?? 0 }})</p>
                <div class="flex shrink-0 gap-1.5">
                  <label
                    class="flex cursor-pointer items-center gap-1 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                    <input type="file" multiple accept="application/pdf,image/*" class="hidden"
                      @change="sgkDosyaSec" />
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="m17 8-5-5-5 5" />
                      <path d="M12 3v12" />
                    </svg>
                    Dosya Yükle
                  </label>
                  <button type="button" @click="sgkFotoAcik = true"
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

              <p v-if="sgkYukleniyor" class="py-1 text-center text-[11px] text-ink-muted">Yükleniyor…</p>

              <p v-if="!secili.sgkDokumleri?.length && !sgkYukleniyor"
                class="py-2 text-center text-xs text-ink-muted">
                Henüz SGK dökümü eklenmedi.
              </p>

              <div v-for="(d, i) in secili.sgkDokumleri" :key="d.dosyaAnahtari"
                class="flex items-center gap-2 bg-surface-900/60 px-2 py-1.5 ring-1 ring-white/5">
                <button type="button" @click="dosyaGoruntule(d)" aria-label="Dosyayı görüntüle"
                  class="grid h-11 w-11 shrink-0 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
                  <img v-if="dosyaOnizlemeler[d.dosyaAnahtari]" :src="dosyaOnizlemeler[d.dosyaAnahtari]"
                    :alt="d.dosyaAdi" class="h-full w-full object-cover" />
                  <svg v-else class="h-5 w-5 text-ink-muted" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  </svg>
                </button>
                <button type="button" @click="dosyaGoruntule(d)" class="min-w-0 flex-1 text-left">
                  <span class="block truncate text-xs font-medium text-ink">{{ d.dosyaAdi }}</span>
                  <span class="block text-[11px] text-ink-muted">
                    {{ tarih(d.yuklenmeTarihi) }} {{ saat(d.yuklenmeTarihi) }}
                  </span>
                </button>
                <button type="button" @click="sgkSilinecek = i" aria-label="Dosyayı sil"
                  class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                  ✕
                </button>
              </div>
            </div>

          </div>
        </section>

        <!-- Firma listesi -->
        <section v-else class="space-y-2 px-4 pb-6 pt-4">
          <p v-if="yukleniyor" class="py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>
          <p v-else-if="!firmalar.length" class="py-8 text-center text-sm text-ink-muted">
            Henüz firma yok. Sağ üstteki "Yeni Ekle" ile ilk firmayı ekleyin.
          </p>

          <button v-for="firma in firmalar" :key="firma._id" type="button" @click="sec(firma)"
            class="flex w-full items-center gap-3 bg-surface-800 p-3 text-left ring-1 ring-white/5 active:bg-[#1a2a20]">
            <span class="grid h-12 w-12 shrink-0 place-items-center bg-[#1c2a21] ring-1 ring-white/10">
              <svg class="h-6 w-6 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-semibold text-ink">{{ firma.ad }}</span>
              <span class="block truncate text-xs text-ink-muted">
                {{ [[firma.ilce, firma.il].filter(Boolean).join('/'), firma.telefon].filter(Boolean).join(' • ') || 'Bilgi girilmedi' }}
              </span>
              <span class="mt-1 flex gap-4 text-[11px] text-ink-muted/80">
                <span>{{ tarih(firma.createdAt) }}</span>
                <span>{{ saat(firma.createdAt) }}</span>
              </span>
            </span>
            <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </section>
      </div>
    </ion-content>

    <!-- SMM firması seçim popup'ı — satıra dokununca bilgiler kopyalanır -->
    <SmmFirmaSecModal v-model:acik="smmSecAcik" :firmalar="smmFirmalar"
      :secili-id="secili?.smmFirmaId" @sec="smmFirmaSec" />

    <!-- Fotoğraf çekme oturumu — "Tamam" ile tüm kareler cihaz listesine eklenir -->
    <FotoCekModal v-model:acik="fotoCekAcik" @tamam="cihazlaraEkle" />

    <!-- Personel: mühendis belgesi ve SGK dökümü foto çekme oturumları -->
    <FotoCekModal v-model:acik="muhFotoAcik" @tamam="muhFotolarEkle" />
    <FotoCekModal v-model:acik="sgkFotoAcik" @tamam="sgkEkle" />
    <FotoCekModal v-model:acik="evrakFotoAcik" @tamam="evrakFotoCekildi" />
    <FotoCekModal v-model:acik="resimFotoAcik" @tamam="resimFotoCekildi" />

    <SilmeOnayi :acik="resimSilinecek != null"
      :aciklama="resimSilinecek
        ? `${RESIM_SLOTLARI.find((r) => r.anahtar === resimSilinecek)?.etiket ?? 'Resim'} silinecek. Emin misiniz?`
        : ''"
      @vazgec="resimSilinecek = null" @onayla="resimSilOnayla" />

    <SilmeOnayi :acik="evrakSilinecek != null"
      :aciklama="evrakSilinecek != null
        ? `${evrakListesi(evrakSilinecek.anahtar)[evrakSilinecek.i]?.dosyaAdi || 'Evrak'}`
        : ''"
      @vazgec="evrakSilinecek = null" @onayla="evrakSilOnayla" />

    <SilmeOnayi :acik="muhSilinecek != null" :aciklama="muhSilAciklama"
      @vazgec="muhSilinecek = null" @onayla="muhSilOnayla" />

    <SilmeOnayi :acik="sgkSilinecek != null"
      :aciklama="sgkSilinecek != null
        ? `${secili?.sgkDokumleri?.[sgkSilinecek]?.dosyaAdi || 'SGK dökümü'}`
        : ''"
      @vazgec="sgkSilinecek = null" @onayla="sgkSilOnayla" />

    <!-- ZIP link popup'ı: açılır açılmaz link oluşturulur -->
    <LinkPopup v-model:acik="zipAcik" :url="zipUrl" :hata="zipHata"
      :bekleme-metni="`${secili?.cihazDosyalari?.length ?? 0} dosya zipleniyor, link oluşturuluyor…`"
      aciklama="Tüm cihaz dosyaları tek ZIP'te toplandı." />

    <SilmeOnayi :acik="cihazSilinecek != null"
      :aciklama="cihazSilinecek != null
        ? `${secili?.cihazDosyalari?.[cihazSilinecek]?.dosyaAdi || 'Dosya'} silinecek. Emin misiniz?`
        : ''"
      @vazgec="cihazSilinecek = null" @onayla="cihazSilOnayla" />

    <SilmeOnayi :acik="ceSilinecek != null"
      :aciklama="ceSilinecek != null
        ? `${secili?.ceBelgeleri?.[ceSilinecek]?.modul || 'CE belgesi'} (${secili?.ceBelgeleri?.[ceSilinecek]?.belgeNo || '—'}) silinecek. Emin misiniz?`
        : ''"
      @vazgec="ceSilinecek = null" @onayla="ceSilOnayla" />
  </ion-page>
</template>
