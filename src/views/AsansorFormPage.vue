<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonFooter } from '@ionic/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createAsansor, getAsansor, updateAsansor, type YeniAsansor, type GuvenlikAksami } from '@/services/asansorService';
import { getFirmalar } from '@/services/firmaService';
import { getAksamBelgeleri, type AksamBelgesi } from '@/services/aksamBelgesiService';
import { uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import AdresSecici from '@/components/AdresSecici.vue';
import AramaliSelect from '@/components/AramaliSelect.vue';
import KabinOlculeriModal from '@/components/sema/KabinOlculeriModal.vue';
import HalatKasnaklarModal from '@/components/sema/HalatKasnaklarModal.vue';
import RayOlculeriModal from '@/components/sema/RayOlculeriModal.vue';
import KuyuDipAlaniModal from '@/components/sema/KuyuDipAlaniModal.vue';
import KuyuUstAlaniModal from '@/components/sema/KuyuUstAlaniModal.vue';
import { blurActive } from '@/utils/blurActive';
import { KABIN_RAY_TIPLERI, KARSI_AGIRLIK_RAY_TIPLERI } from '@/utils/rayTipleri';
import { HALAT_TIPI_DEGERLERI } from '@/utils/asansorSecenekler';

const route = useRoute();
const router = useRouter();

const duzenlenenId = computed(() => (route.params.id as string | undefined) ?? '');
const baslik = computed(() => (duzenlenenId.value ? 'Asansörü Düzenle' : 'Yeni Asansör'));

// ---- form durumu (sayısal alanlar input'ta '' olabilir, kayıtta null'a çevrilir) ----
type Sayi = number | '' | null;
const form = ref({
  firmaId: '' as string,
  yapiRuhsatNo: '',
  yapiSahibiAdi: '',
  yapiMuteahhidi: '',
  yapiRuhsatiDosya: undefined as BelgeSlot | undefined,
  seriNo: '',
  montajYili: '' as Sayi,
  abUygunlukBeyaniTarihi: '',
  il: '', ilce: '', mahalle: '', postaKodu: '', adres: '',
  ada: '', parsel: '',
  tahrikTipi: '' as string,
  sinif: '' as string,
  makinaKonumu: '' as string,
  askiTipi: '' as string,
  durakSayisi: '' as Sayi,
  beyanYuku: '' as Sayi,
  kisiSayisi: '' as Sayi,
  hiz: '' as Sayi,
  kabinGenislik: '' as Sayi, kabinDerinlik: '' as Sayi, kabinYukseklik: '' as Sayi,
  halatAdet: '' as Sayi, halatTipi: '',
  tahrikKasnakCapi: '' as Sayi, palangaCaplari: '' as Sayi,
  halatSapturmaKasnagiCapi: '' as Sayi,
  halatPalanga1Capi: '' as Sayi, halatPalanga2Capi: '' as Sayi, halatPalanga3Capi: '' as Sayi,
  halatSekli: null as string | null,
  rayRR: '' as Sayi, rayRK: '' as Sayi,
  kuyuDipBosluk: '' as Sayi, kuyuDipTamponStroke: '' as Sayi,
  kuyuDipKarsiBosluk: '' as Sayi, kuyuDipKarsiStroke: '' as Sayi,
  kuyuDipDurmaAlani: null as string | null,
  kuyuUstKorkulukMesafe: '' as Sayi, kuyuUstKorkulukYuksekligi: '' as Sayi,
  kuyuUstSuspansiyonMesafe: '' as Sayi, kuyuUstKabinUstDurma: '' as Sayi,
  kuyuUstSonKat: '' as Sayi,
  kuyuUstDurmaAlani: null as string | null,
  askiHalatArasiMesafe: '' as Sayi, palangaHalatArasiMesafe: '' as Sayi,
  kasnaklarArasiYatayMesafe: '' as Sayi, kasnaklarArasiDikeyMesafe: '' as Sayi,
  sarimAcisi: '' as Sayi,
  regulatorKonumu: 'sag-arka',
  karsiAgirlikKonumu: 'arka',
  kabinPalangaKonumu: 'yok',
  kabinRayTipi: 'T89/B', kabinRayArasi: '' as Sayi,
  karsiAgirlikRayTipi: 'T50/A', karsiAgirlikRayArasi: '' as Sayi,
  kabinRayDurakKapisiArasi: '' as Sayi,
  kabinRayKarsiAgirlikRayArasi: '' as Sayi,
  karsiAgirlikRayDurakKapisiArasi: '' as Sayi,
  kuyuDipYukseklik: '' as Sayi,
  katYukseklikleri: [] as { kat: Sayi; yukseklik: Sayi }[],
  sonKatYukseklik: '' as Sayi,
  seyirMesafesi: '' as Sayi,
  kuyuGenislik: '' as Sayi, kuyuDerinlik: '' as Sayi,
  karkasAgirligi: '' as Sayi,
  agirlikBloklari: [] as { adet: Sayi; birimAgirlik: Sayi }[],
  kabinGirisTipi: 'tek',
  giris1KapiGenislik: '' as Sayi, giris1KapiYukseklik: '' as Sayi, giris1KapiAdet: '' as Sayi,
  giris1PanelSayisi: '' as Sayi, giris1KapiYonu: '' as string,
  giris2KapiGenislik: '' as Sayi, giris2KapiYukseklik: '' as Sayi, giris2KapiAdet: '' as Sayi,
  giris2PanelSayisi: '' as Sayi, giris2KapiYonu: '' as string, giris2Konum: '' as string,
  giris2Duraklar: [] as number[],
  motorAksamBelgesiId: '' as string,
  motorTip: '', motorSeriNo: '', motorRpm: '' as Sayi, motorGucKw: '' as Sayi, motorTahvilOrani: '',
  halatMarka: '', rayMarka: '', kapiPanelleriMarka: '', kapiPanelleriMarka2: '',
  ekBelgeler: [] as { ad: string; dosya?: BelgeSlot }[],
  kabinTamponAdedi: '' as Sayi, karsiAgirlikTamponAdedi: '' as Sayi,
  kabinIciAydinlatma: '' as Sayi, kabinUstuAydinlatma: '' as Sayi,
  kuyuDibiAydinlatma: '' as Sayi, makineAlaniAydinlatma: '' as Sayi,
  ucmAcopHizRegulatoruFrenIle: false,
});

const yukleniyor = ref(false);
const kaydediliyor = ref(false);
const hata = ref('');
const gecerli = computed(() => form.value.firmaId !== '' && form.value.seriNo.trim() !== '');

// ---- şema modalları (artidoksan1'deki şekil üzerinden veri girişi) ----
const kabinSemaAcik = ref(false);
const halatSemaAcik = ref(false);
const raySemaAcik = ref(false);
const kuyuDipSemaAcik = ref(false);
const kuyuUstSemaAcik = ref(false);

// Ray şeması tipleri '' yerine mevcut değeri korur (string | null köprüsü)
const kabinRayTipiSema = computed<string | null>({
  get: () => form.value.kabinRayTipi || null,
  set(v) { if (v) form.value.kabinRayTipi = v; },
});
const karsiAgirlikRayTipiSema = computed<string | null>({
  get: () => form.value.karsiAgirlikRayTipi || null,
  set(v) { if (v) form.value.karsiAgirlikRayTipi = v; },
});

// ---- akordeon bölümleri ----
const acik = ref<Record<string, boolean>>({ genel: true });
function toggle(b: string) {
  acik.value[b] = !acik.value[b];
}

// ---- firmalar + katalog ----
const firmaSecenekleri = ref<{ label: string; value: string }[]>([]);
const belgeler = ref<AksamBelgesi[]>([]);

const firmaModel = computed<string | number | null>({
  get: () => form.value.firmaId || null,
  set(v) { form.value.firmaId = typeof v === 'string' ? v : ''; },
});

function belgelerKod(kod: string | string[]) {
  const kodlar = Array.isArray(kod) ? kod : [kod];
  return belgeler.value.filter((b) => kodlar.includes(b.bilesenTipiKodu) && b.durum === 'aktif');
}

function markaSecenekleri(kod: string) {
  const markalar = [...new Set(belgelerKod(kod).map((b) => b.marka).filter(Boolean))];
  return markalar.sort((a, b) => a.localeCompare(b, 'tr')).map((m) => ({ label: m, value: m }));
}

function strModel(al: () => string, ata: (v: string) => void) {
  return computed<string | number | null>({
    get: () => al() || null,
    set(v) { ata(typeof v === 'string' ? v : ''); },
  });
}

const halatMarkaModel = strModel(() => form.value.halatMarka, (v) => { form.value.halatMarka = v; form.value.halatTipi = ''; });
const rayMarkaModel = strModel(() => form.value.rayMarka, (v) => (form.value.rayMarka = v));
const kapiPanelModel = strModel(() => form.value.kapiPanelleriMarka, (v) => (form.value.kapiPanelleriMarka = v));
const kapiPanel2Model = strModel(() => form.value.kapiPanelleriMarka2, (v) => (form.value.kapiPanelleriMarka2 = v));
const halatTipiModel = strModel(() => form.value.halatTipi, (v) => (form.value.halatTipi = v));

// Şema modalının halat tipi modeli string|null bekler; form alanı '' tabanlı.
const halatTipiSema = computed<string | null>({
  get: () => form.value.halatTipi || null,
  set: (v) => (form.value.halatTipi = v ?? ''),
});

// Modalda kasnak/palanga konumu yalnız 'kabin-alti'/'kabin-ustu' seçilir;
// formdaki alanın 'yok' değeri modal tarafında null'a eşlenir.
const palangaKonumuSema = computed<string | null>({
  get: () =>
    form.value.kabinPalangaKonumu && form.value.kabinPalangaKonumu !== 'yok'
      ? form.value.kabinPalangaKonumu
      : null,
  set: (v) => (form.value.kabinPalangaKonumu = v ?? 'yok'),
});

const halatTipiSecenekleri = computed(() => {
  const kaynak = belgelerKod('halat').filter((b) => !form.value.halatMarka || b.marka === form.value.halatMarka);
  // Standart halat tipi listesi her zaman sunulur; katalogdan gelenler eklenir.
  const tipler = [...new Set([...HALAT_TIPI_DEGERLERI, ...kaynak.flatMap((b) => b.tipler)])];
  return tipler.map((t) => ({ label: t, value: t }));
});

// Motor: katalogdan sertifika seçilir, tip o sertifikanın tipler listesinden
const motorBelgeSecenekleri = computed(() =>
  belgelerKod(['motor_dislisiz', 'motor_dislili']).map((b) => ({
    label: `${b.marka}${b.bilesenTipiKodu === 'motor_dislili' ? ' (Dişlili)' : ' (Dişlisiz)'}${b.belgeTipi ? ` — ${b.belgeTipi}` : ''}`,
    value: b._id,
  }))
);
const motorModel = strModel(() => form.value.motorAksamBelgesiId, (v) => { form.value.motorAksamBelgesiId = v; form.value.motorTip = ''; });
const seciliMotorBelgesi = computed(() => belgeler.value.find((b) => b._id === form.value.motorAksamBelgesiId) ?? null);
const motorTipSecenekleri = computed(() => (seciliMotorBelgesi.value?.tipler ?? []).map((t) => ({ label: t, value: t })));
const motorTipModel = strModel(() => form.value.motorTip, (v) => (form.value.motorTip = v));
const motorDislili = computed(() => seciliMotorBelgesi.value?.bilesenTipiKodu === 'motor_dislili');

// ---- güvenlik aksamları ----
interface AksamSatiri { slot: string; aksamBelgesiId: string; tip: string; seriNo: string }
const SLOT_TANIMLARI: { slot: string; etiket: string; kod: string; coklu?: boolean; opsiyonel?: boolean; rapor?: boolean }[] = [
  { slot: 'kabin_tamponu', etiket: 'Kabin Tamponu', kod: 'tampon', coklu: true },
  { slot: 'karsi_agirlik_tamponu', etiket: 'Karşı Ağırlık Tamponu', kod: 'tampon', coklu: true },
  { slot: 'durak_kapi_kilidi', etiket: 'Durak Kapı Kilidi', kod: 'durak_kapi_kilidi' },
  { slot: 'kabin_kapi_kilidi', etiket: 'Kabin Kapı Kilidi', kod: 'kabin_kapi_kilidi' },
  { slot: 'sarkac_test_raporu', etiket: 'Sarkaç Test Raporu', kod: 'sarkac_test_raporu', rapor: true },
  { slot: 'yangin_sizdirmazlik_raporu', etiket: 'Yangın Sızdırmazlık Raporu', kod: 'yangin_sizdirmazlik_raporu', rapor: true },
  { slot: 'fren', etiket: 'Fren', kod: 'fren' },
  { slot: 'karsi_agirlik_freni', etiket: 'Karşı Ağırlık Freni', kod: 'fren', opsiyonel: true },
  { slot: 'kontrol_karti', etiket: 'Kontrol Kartı', kod: 'kontrol_karti' },
  { slot: 'hiz_regulatoru', etiket: 'Hız Regülatörü', kod: 'hiz_regulatoru' },
  { slot: 'ucm_acop', etiket: 'UCM/ACOP (Motor Freni)', kod: 'ucm_acop', opsiyonel: true },
];
const aksamSatirlari = ref<AksamSatiri[]>([]);

function slotSatirlari(slot: string) {
  return aksamSatirlari.value.filter((s) => s.slot === slot);
}
function slotEkle(slot: string) {
  aksamSatirlari.value.push({ slot, aksamBelgesiId: '', tip: '', seriNo: '' });
}
function satirSil(satir: AksamSatiri) {
  aksamSatirlari.value = aksamSatirlari.value.filter((s) => s !== satir);
}
function slotToggle(slot: string, aktifMi: boolean) {
  if (aktifMi) slotEkle(slot);
  else aksamSatirlari.value = aksamSatirlari.value.filter((s) => s.slot !== slot);
}
function slotBelgeSecenekleri(kod: string) {
  return belgelerKod(kod).map((b) => ({
    label: [b.marka, b.sertifikaNo].filter(Boolean).join(' — ') || b.bilesenTipiAdi,
    value: b._id,
  }));
}
function satirTipSecenekleri(satir: AksamSatiri) {
  const belge = belgeler.value.find((b) => b._id === satir.aksamBelgesiId);
  return (belge?.tipler ?? []).map((t) => ({ label: t, value: t }));
}
function satirBelgeModel(satir: AksamSatiri) {
  return computed<string | number | null>({
    get: () => satir.aksamBelgesiId || null,
    set(v) { satir.aksamBelgesiId = typeof v === 'string' ? v : ''; satir.tip = ''; },
  });
}
function satirTipModel(satir: AksamSatiri) {
  return computed<string | number | null>({
    get: () => satir.tip || null,
    set(v) { satir.tip = typeof v === 'string' ? v : ''; },
  });
}

// ---- hesaplamalar ----
const sayi = (v: Sayi) => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

const kuyuBoyu = computed(() => {
  const a = sayi(form.value.kuyuDipYukseklik), b = sayi(form.value.seyirMesafesi), c = sayi(form.value.sonKatYukseklik);
  return a !== null && b !== null && c !== null ? Math.round((a + b + c) * 100) / 100 : null;
});

const karsiAgirlik = computed(() => {
  const karkas = sayi(form.value.karkasAgirligi);
  if (karkas === null) return null;
  const bloklar = form.value.agirlikBloklari.reduce((top, blok) => {
    const adet = sayi(blok.adet), birim = sayi(blok.birimAgirlik);
    return top + (adet !== null && birim !== null ? adet * birim : 0);
  }, 0);
  return Math.round((karkas + bloklar) * 100) / 100;
});

const kabinAgirligi = computed(() => {
  const ka = karsiAgirlik.value, beyan = sayi(form.value.beyanYuku);
  return ka !== null && beyan !== null ? Math.round((ka - beyan / 2) * 100) / 100 : null;
});

// Sarım açısı: 1:1 ve 2:1'de geometriden otomatik, 3:1/4:1'de manuel
const sarimOtomatik = computed(() => form.value.askiTipi === '1:1' || form.value.askiTipi === '2:1');
const hesaplananSarimAcisi = computed(() => {
  if (!sarimOtomatik.value) return null;
  const d1 = sayi(form.value.tahrikKasnakCapi), d2 = sayi(form.value.palangaCaplari);
  const A = sayi(form.value.kasnaklarArasiYatayMesafe), B = sayi(form.value.kasnaklarArasiDikeyMesafe);
  if (d1 === null || d2 === null || A === null || B === null) return null;
  const mesafe = Math.sqrt(A * A + B * B);
  if (!mesafe) return null;
  const oran = Math.abs(d2 - d1) / (2 * mesafe);
  if (oran > 1) return null;
  const alfa = (Math.asin(oran) * 180) / Math.PI;
  return Math.round((180 - 2 * alfa) * 100) / 100;
});

watch(hesaplananSarimAcisi, (deger) => {
  if (sarimOtomatik.value) form.value.sarimAcisi = deger ?? '';
});

// ---- kat / ağırlık / ek belge satırları ----
function katEkle() {
  const katlar = form.value.katYukseklikleri.map((k) => sayi(k.kat) ?? 0);
  const sonraki = katlar.length ? Math.max(...katlar) + 1 : 0;
  form.value.katYukseklikleri.push({ kat: sonraki, yukseklik: '' });
}
function bodrumEkle() {
  const katlar = form.value.katYukseklikleri.map((k) => sayi(k.kat) ?? 0);
  const sonraki = katlar.length ? Math.min(...katlar) - 1 : -1;
  form.value.katYukseklikleri.unshift({ kat: sonraki, yukseklik: '' });
}
function katSil(i: number) {
  form.value.katYukseklikleri.splice(i, 1);
}
function blokEkle() {
  form.value.agirlikBloklari.push({ adet: '', birimAgirlik: '' });
}
function blokSil(i: number) {
  form.value.agirlikBloklari.splice(i, 1);
}
function ekBelgeEkle() {
  form.value.ekBelgeler.push({ ad: '' });
}
function ekBelgeSil(i: number) {
  form.value.ekBelgeler.splice(i, 1);
}

const dosyaYukleniyor = ref<Record<string, boolean>>({});
async function dosyaSec(hedef: 'ruhsat' | number, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
    hata.value = 'PDF veya resim dosyası yükleyin';
    return;
  }
  const anahtar = hedef === 'ruhsat' ? 'ruhsat' : `ek-${hedef}`;
  dosyaYukleniyor.value[anahtar] = true;
  try {
    const slot = await uploadDosya(file);
    if (hedef === 'ruhsat') form.value.yapiRuhsatiDosya = slot;
    else form.value.ekBelgeler[hedef].dosya = slot;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    dosyaYukleniyor.value[anahtar] = false;
  }
}

// giriş 2 durakları: kat listesindeki katlardan çoklu seçim
const durakSecenekleri = computed(() =>
  form.value.katYukseklikleri.map((k) => sayi(k.kat)).filter((k): k is number => k !== null)
);
function durakToggle(kat: number) {
  const i = form.value.giris2Duraklar.indexOf(kat);
  if (i >= 0) form.value.giris2Duraklar.splice(i, 1);
  else form.value.giris2Duraklar.push(kat);
}

// ---- yükleme / kayıt ----
function geri() {
  blurActive();
  router.back();
}

onMounted(async () => {
  yukleniyor.value = true;
  try {
    const [firmalar, katalog] = await Promise.all([getFirmalar(), getAksamBelgeleri()]);
    firmaSecenekleri.value = firmalar.map((f) => ({ label: f.ad, value: f._id }));
    belgeler.value = katalog;

    const onFirma = route.query.firma as string | undefined;
    if (onFirma) form.value.firmaId = onFirma;

    if (duzenlenenId.value) {
      const a = await getAsansor(duzenlenenId.value);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- forma kopyalanmayacak alanlar destructure ile atılır
      const { _id, createdAt, updatedAt, guvenlikAksamlari, firmaId, abUygunlukBeyaniTarihi, ...geriKalan } = a as never as Record<string, unknown>;
      Object.assign(form.value, geriKalan);
      form.value.firmaId = typeof a.firmaId === 'object' && a.firmaId ? a.firmaId._id : (a.firmaId as string);
      form.value.abUygunlukBeyaniTarihi = a.abUygunlukBeyaniTarihi ? a.abUygunlukBeyaniTarihi.slice(0, 10) : '';
      form.value.motorAksamBelgesiId = (a.motorAksamBelgesiId as string | null) ?? '';
      // null sayısal alanlar input'ta '' olarak gösterilir
      // (null kalması gereken seçim alanları hariç)
      const nullKalabilir = ['halatSekli', 'kuyuDipDurmaAlani', 'kuyuUstDurmaAlani'];
      for (const [k, v] of Object.entries(form.value)) {
        if (v === null && !nullKalabilir.includes(k)) (form.value as Record<string, unknown>)[k] = '';
      }
      aksamSatirlari.value = (a.guvenlikAksamlari ?? []).map((g: GuvenlikAksami) => ({
        slot: g.slot, aksamBelgesiId: g.aksamBelgesiId, tip: g.tip, seriNo: g.seriNo,
      }));
    }
    // tekil zorunlu slotlar için boş satırları hazırla
    for (const t of SLOT_TANIMLARI) {
      if (!t.coklu && !t.opsiyonel && !slotSatirlari(t.slot).length) slotEkle(t.slot);
    }
    if (!slotSatirlari('kabin_tamponu').length) slotEkle('kabin_tamponu');
    if (!slotSatirlari('karsi_agirlik_tamponu').length) slotEkle('karsi_agirlik_tamponu');
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Veriler yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
});

function kayitVerisi(): YeniAsansor {
  const f = form.value;
  const s = (v: Sayi) => sayi(v);
  const veri: Record<string, unknown> = { ...f };
  // sayısal '' → null
  for (const [k, v] of Object.entries(veri)) {
    if (v === '') veri[k] = null;
  }
  veri.abUygunlukBeyaniTarihi = f.abUygunlukBeyaniTarihi ? new Date(f.abUygunlukBeyaniTarihi).toISOString() : null;
  veri.katYukseklikleri = f.katYukseklikleri
    .filter((k) => s(k.kat) !== null && s(k.yukseklik) !== null)
    .map((k) => ({ kat: s(k.kat), yukseklik: s(k.yukseklik) }));
  veri.agirlikBloklari = f.agirlikBloklari
    .filter((b) => s(b.adet) !== null && s(b.birimAgirlik) !== null)
    .map((b) => ({ adet: s(b.adet), birimAgirlik: s(b.birimAgirlik) }));
  veri.kuyuBoyu = kuyuBoyu.value;
  veri.karsiAgirlik = karsiAgirlik.value;
  veri.kabinAgirligi = kabinAgirligi.value;
  veri.ekBelgeler = f.ekBelgeler.filter((b) => b.ad.trim());
  veri.motorAksamBelgesiId = f.motorAksamBelgesiId || null;
  veri.motorMarkaSnapshot = seciliMotorBelgesi.value?.marka ?? '';
  // Id'ye ek olarak belgenin tam bilgisi de kaydedilir (belge sonradan
  // değişse de kayıt kendi kopyasını taşır — kullanıcı isteği)
  veri.guvenlikAksamlari = aksamSatirlari.value
    .filter((satir) => satir.aksamBelgesiId)
    .map((satir) => {
      const belge = belgeler.value.find((b) => b._id === satir.aksamBelgesiId);
      return {
        slot: satir.slot,
        aksamBelgesiId: satir.aksamBelgesiId,
        markaSnapshot: belge?.marka ?? '',
        tip: satir.tip,
        seriNo: satir.seriNo,
        bilesenTipiAdi: belge?.bilesenTipiAdi ?? '',
        sertifikaNo: belge?.sertifikaNo ?? '',
        belgeTipi: belge?.belgeTipi ?? '',
        gecerlilikBaslangic: belge?.gecerlilikBaslangic ?? null,
        gecerlilikBitis: belge?.gecerlilikBitis ?? null,
        onayliKurumNobo: belge?.onayliKurumNobo ?? '',
        onayliKurumUnvan: belge?.onayliKurumUnvan ?? '',
      };
    });
  // enum alanlarında '' yerine null
  for (const k of ['tahrikTipi', 'sinif', 'makinaKonumu', 'askiTipi', 'giris1KapiYonu', 'giris2KapiYonu', 'giris2Konum', 'giris1PanelSayisi', 'giris2PanelSayisi', 'hiz', 'halatSekli', 'kuyuDipDurmaAlani', 'kuyuUstDurmaAlani']) {
    if (veri[k] === '' || veri[k] === undefined) veri[k] = null;
  }
  return veri as YeniAsansor;
}

async function kaydet() {
  if (!gecerli.value || kaydediliyor.value) return;
  kaydediliyor.value = true;
  hata.value = '';
  try {
    const veri = kayitVerisi();
    if (duzenlenenId.value) await updateAsansor(duzenlenenId.value, veri);
    else await createAsansor(veri);
    blurActive();
    router.back();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kayıt başarısız';
  } finally {
    kaydediliyor.value = false;
  }
}
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-bar">
        <header class="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button type="button" @click="geri"
            class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 class="truncate text-xl font-bold leading-8 tracking-wide text-ink">{{ baslik }}</h1>
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg">
        <p v-if="hata" class="mx-4 mt-4 bg-red-950/60 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
          {{ hata }}
        </p>
        <p v-if="yukleniyor" class="px-4 py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>

        <form v-else id="asansor-form" class="space-y-2 px-4 py-4" @submit.prevent="kaydet">
          <!-- ====== GENEL BİLGİLER ====== -->
          <button type="button" @click="toggle('genel')"
            class="flex w-full items-center justify-between bg-[#223c2d] px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-white/10">
            Genel Bilgiler
            <span class="text-ink-muted">{{ acik.genel ? '−' : '+' }}</span>
          </button>
          <div v-if="acik.genel" class="space-y-2 bg-surface-800/40 p-2 ring-1 ring-white/5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Firma *</span>
              <AramaliSelect v-model="firmaModel" :options="firmaSecenekleri" placeholder="Firma seçiniz" />
            </label>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Yapı Ruhsat No</span>
                <input v-model="form.yapiRuhsatNo" type="text"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Seri No *</span>
                <input v-model="form.seriNo" type="text" required
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Yapı Sahibi</span>
                <input v-model="form.yapiSahibiAdi" type="text"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Yapı Müteahhidi</span>
                <input v-model="form.yapiMuteahhidi" type="text"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Montaj Yılı</span>
                <input v-model.number="form.montajYili" type="number"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">AB Uyg. Beyanı Tarihi</span>
                <input v-model="form.abUygunlukBeyaniTarihi" type="date"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Ada</span>
                <input v-model="form.ada" type="text"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Parsel</span>
                <input v-model="form.parsel" type="text"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
            <AdresSecici v-model:il="form.il" v-model:ilce="form.ilce" v-model:mahalle="form.mahalle"
              v-model:posta-kodu="form.postaKodu" v-model:adres="form.adres" />
            <label class="flex cursor-pointer items-center gap-2 bg-surface-900 px-2.5 py-2 ring-1 ring-white/10">
              <input type="file" accept="application/pdf,image/*" class="hidden" @change="dosyaSec('ruhsat', $event)" />
              <span class="w-28 shrink-0 text-xs font-medium text-ink-muted">Yapı Ruhsatı</span>
              <span class="min-w-0 flex-1 truncate text-xs"
                :class="form.yapiRuhsatiDosya ? 'text-ink' : 'text-ink-muted/50'">
                {{ dosyaYukleniyor['ruhsat'] ? 'Yükleniyor…' : (form.yapiRuhsatiDosya?.dosyaAdi || 'Dosya seç (PDF / Resim)') }}
              </span>
              <svg class="h-4 w-4 shrink-0 text-ink-muted" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" />
              </svg>
            </label>
          </div>

          <!-- ====== TAHRİK / ASKI ====== -->
          <button type="button" @click="toggle('tahrik')"
            class="flex w-full items-center justify-between bg-[#223c2d] px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-white/10">
            Tahrik / Askı / Kabin
            <span class="text-ink-muted">{{ acik.tahrik ? '−' : '+' }}</span>
          </button>
          <div v-if="acik.tahrik" class="space-y-2 bg-surface-800/40 p-2 ring-1 ring-white/5">
            <!-- Şekil üzerinden veri girişi -->
            <div class="grid grid-cols-2 gap-1.5">
              <button type="button" @click="kabinSemaAcik = true"
                class="flex items-center justify-center gap-1.5 bg-surface-900 px-2 py-2 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10 active:bg-[#1a2a20]">
                📐 Kabin Ölçüleri Şeması
              </button>
              <button type="button" @click="halatSemaAcik = true"
                class="flex items-center justify-center gap-1.5 bg-surface-900 px-2 py-2 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10 active:bg-[#1a2a20]">
                📐 Halat ve Kasnaklar Şeması
              </button>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Tahrik Tipi</span>
                <select v-model="form.tahrikTipi"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option value="" disabled>Seçiniz</option>
                  <option value="elektrikli">Elektrikli</option>
                  <option value="hidrolik">Hidrolik</option>
                </select>
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Sınıf</span>
                <select v-model="form.sinif"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option value="" disabled>Seçiniz</option>
                  <option value="insan_ve_yuk">İnsan ve Yük</option>
                  <option value="yuk">Yük</option>
                </select>
              </label>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Makina Konumu</span>
                <select v-model="form.makinaKonumu"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option value="" disabled>Seçiniz</option>
                  <option value="MR">MR (Makine Dairesi Var)</option>
                  <option value="MRL">MRL (Makine Dairesiz)</option>
                </select>
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Askı Tipi</span>
                <select v-model="form.askiTipi"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option value="" disabled>Seçiniz</option>
                  <option v-for="a in ['1:1', '2:1', '3:1', '4:1']" :key="a" :value="a">{{ a }}</option>
                </select>
              </label>
            </div>
            <div class="grid grid-cols-4 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Durak</span>
                <input v-model.number="form.durakSayisi" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Yük (kg)</span>
                <input v-model.number="form.beyanYuku" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kişi</span>
                <input v-model.number="form.kisiSayisi" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Hız (m/s)</span>
                <select v-model.number="form.hiz"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option value="" disabled>Seç</option>
                  <!-- Hızlar iki ondalık haneyle gösterilir (örn. 1.00, 0.63) -->
                  <option v-for="h in [0.3, 0.4, 0.5, 0.6, 0.63, 0.8, 1.0, 1.2, 1.25, 1.6, 2.0, 2.5, 3.0]" :key="h" :value="h">
                    {{ h.toFixed(2) }}
                  </option>
                </select>
              </label>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kabin Gen. (mm)</span>
                <input v-model.number="form.kabinGenislik" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kabin Der. (mm)</span>
                <input v-model.number="form.kabinDerinlik" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kabin Yük. (mm)</span>
                <input v-model.number="form.kabinYukseklik" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Halat Adedi</span>
                <input v-model.number="form.halatAdet" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kasnak Çapı (mm)</span>
                <input v-model.number="form.tahrikKasnakCapi" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Palanga Çapı (mm)</span>
                <input v-model.number="form.palangaCaplari" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <label v-if="form.askiTipi === '1:1'" class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Askı-Halat Arası (mm)</span>
                <input v-model.number="form.askiHalatArasiMesafe" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label v-else-if="form.askiTipi" class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Palanga-Halat Arası (mm)</span>
                <input v-model.number="form.palangaHalatArasiMesafe" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
            <!-- Sarım açısı -->
            <div class="space-y-1.5 bg-surface-900/50 p-2 ring-1 ring-white/5">
              <p class="text-xs font-semibold text-ink">Sarım Açısı</p>
              <div v-if="sarimOtomatik" class="grid grid-cols-3 gap-1.5">
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Yatay A (mm)</span>
                  <input v-model.number="form.kasnaklarArasiYatayMesafe" type="number"
                    class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
                </label>
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Dikey B (mm)</span>
                  <input v-model.number="form.kasnaklarArasiDikeyMesafe" type="number"
                    class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
                </label>
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Açı (otomatik)</span>
                  <input :value="hesaplananSarimAcisi ?? ''" type="number" disabled
                    class="w-full bg-surface-900 px-2 py-1.5 text-xs text-[#6fcf97] ring-1 ring-white/10 outline-none disabled:opacity-80" />
                </label>
              </div>
              <label v-else class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Sarım Açısı (°) — manuel</span>
                <input v-model.number="form.sarimAcisi" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
          </div>

          <!-- ====== KONUM / RAY ====== -->
          <button type="button" @click="toggle('ray')"
            class="flex w-full items-center justify-between bg-[#223c2d] px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-white/10">
            Konum / Ray
            <span class="text-ink-muted">{{ acik.ray ? '−' : '+' }}</span>
          </button>
          <div v-if="acik.ray" class="space-y-2 bg-surface-800/40 p-2 ring-1 ring-white/5">
            <button type="button" @click="raySemaAcik = true"
              class="flex w-full items-center justify-center gap-1.5 bg-surface-900 px-2 py-2 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10 active:bg-[#1a2a20]">
              📐 Ray Ölçüleri Şeması (üstten görünüm)
            </button>
            <div class="grid grid-cols-3 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Regülatör Konumu</span>
                <select v-model="form.regulatorKonumu"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option v-for="o in [['sol-on', 'Sol Ön'], ['sol-arka', 'Sol Arka'], ['sag-on', 'Sağ Ön'], ['sag-arka', 'Sağ Arka']]" :key="o[0]" :value="o[0]">{{ o[1] }}</option>
                </select>
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">K. Ağırlık Konumu</span>
                <select v-model="form.karsiAgirlikKonumu"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option v-for="o in [['arka', 'Arka'], ['sol', 'Sol'], ['sag', 'Sağ']]" :key="o[0]" :value="o[0]">{{ o[1] }}</option>
                </select>
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kabin Palanga</span>
                <select v-model="form.kabinPalangaKonumu"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option v-for="o in [['yok', 'Yok'], ['kabin-ustu', 'Kabin Üstü'], ['kabin-alti', 'Kabin Altı']]" :key="o[0]" :value="o[0]">{{ o[1] }}</option>
                </select>
              </label>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kabin Ray Tipi</span>
                <select v-model="form.kabinRayTipi"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option v-for="r in KABIN_RAY_TIPLERI" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kabin Ray Arası (mm)</span>
                <input v-model.number="form.kabinRayArasi" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">K. Ağırlık Ray Tipi</span>
                <select v-model="form.karsiAgirlikRayTipi"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option v-for="r in KARSI_AGIRLIK_RAY_TIPLERI" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">K. Ağırlık Ray Arası (mm)</span>
                <input v-model.number="form.karsiAgirlikRayArasi" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kabin Rayı - Durak Kapısı (mm)</span>
                <input v-model.number="form.kabinRayDurakKapisiArasi" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label v-if="form.karsiAgirlikKonumu === 'arka'" class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kabin Rayı - K.A. Rayı (mm)</span>
                <input v-model.number="form.kabinRayKarsiAgirlikRayArasi" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label v-else class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">K.A. Rayı - Durak Kapısı (mm)</span>
                <input v-model.number="form.karsiAgirlikRayDurakKapisiArasi" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
          </div>

          <!-- ====== KUYU / KATLAR ====== -->
          <button type="button" @click="toggle('kuyu')"
            class="flex w-full items-center justify-between bg-[#223c2d] px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-white/10">
            Kuyu / Katlar
            <span class="text-ink-muted">{{ acik.kuyu ? '−' : '+' }}</span>
          </button>
          <div v-if="acik.kuyu" class="space-y-2 bg-surface-800/40 p-2 ring-1 ring-white/5">
            <div class="grid grid-cols-2 gap-1.5">
              <button type="button" @click="kuyuDipSemaAcik = true"
                class="flex items-center justify-center gap-1.5 bg-surface-900 px-2 py-2 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10 active:bg-[#1a2a20]">
                📐 Kuyu Dip Alanı Şeması
              </button>
              <button type="button" @click="kuyuUstSemaAcik = true"
                class="flex items-center justify-center gap-1.5 bg-surface-900 px-2 py-2 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10 active:bg-[#1a2a20]">
                📐 Kuyu Üst Alanı Şeması
              </button>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kuyu Dip (mm)</span>
                <input v-model.number="form.kuyuDipYukseklik" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Seyir Mesafesi (mm)</span>
                <input v-model.number="form.seyirMesafesi" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Son Kat Yük. (mm)</span>
                <input v-model.number="form.sonKatYukseklik" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kuyu Boyu (oto)</span>
                <input :value="kuyuBoyu ?? ''" type="number" disabled
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-[#6fcf97] ring-1 ring-white/10 outline-none disabled:opacity-80" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kuyu Gen. (mm)</span>
                <input v-model.number="form.kuyuGenislik" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kuyu Der. (mm)</span>
                <input v-model.number="form.kuyuDerinlik" type="number"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
              </label>
            </div>
            <div class="space-y-1.5 bg-surface-900/50 p-2 ring-1 ring-white/5">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-ink">Kat Yükseklikleri</p>
                <div class="flex gap-1.5">
                  <button type="button" @click="bodrumEkle"
                    class="bg-surface-800 px-2.5 py-1 text-[11px] font-semibold text-ink-muted ring-1 ring-white/10">+ Bodrum</button>
                  <button type="button" @click="katEkle"
                    class="bg-surface-800 px-2.5 py-1 text-[11px] font-semibold text-ink-muted ring-1 ring-white/10">+ Kat</button>
                </div>
              </div>
              <div v-for="(kat, i) in form.katYukseklikleri" :key="i" class="flex items-center gap-1.5">
                <input v-model.number="kat.kat" type="number" placeholder="Kat"
                  class="w-16 bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
                <input v-model.number="kat.yukseklik" type="number" placeholder="Yükseklik (mm)"
                  class="flex-1 bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
                <button type="button" @click="katSil(i)"
                  class="grid h-7 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">✕</button>
              </div>
            </div>
          </div>

          <!-- ====== AĞIRLIK HESABI ====== -->
          <button type="button" @click="toggle('agirlik')"
            class="flex w-full items-center justify-between bg-[#223c2d] px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-white/10">
            Ağırlık Hesabı
            <span class="text-ink-muted">{{ acik.agirlik ? '−' : '+' }}</span>
          </button>
          <div v-if="acik.agirlik" class="space-y-2 bg-surface-800/40 p-2 ring-1 ring-white/5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Karkas Ağırlığı (kg)</span>
              <input v-model.number="form.karkasAgirligi" type="number"
                class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <div class="space-y-1.5 bg-surface-900/50 p-2 ring-1 ring-white/5">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-ink">Ağırlık Blokları</p>
                <button type="button" @click="blokEkle"
                  class="bg-surface-800 px-2.5 py-1 text-[11px] font-semibold text-ink-muted ring-1 ring-white/10">+ Blok</button>
              </div>
              <div v-for="(blok, i) in form.agirlikBloklari" :key="i" class="flex items-center gap-1.5">
                <input v-model.number="blok.adet" type="number" placeholder="Adet"
                  class="w-20 bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
                <span class="text-xs text-ink-muted">×</span>
                <input v-model.number="blok.birimAgirlik" type="number" placeholder="Birim ağırlık (kg)"
                  class="flex-1 bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
                <button type="button" @click="blokSil(i)"
                  class="grid h-7 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">✕</button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Karşı Ağırlık (oto)</span>
                <input :value="karsiAgirlik ?? ''" type="number" disabled
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-[#6fcf97] ring-1 ring-white/10 outline-none disabled:opacity-80" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kabin Ağırlığı (oto)</span>
                <input :value="kabinAgirligi ?? ''" type="number" disabled
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-[#6fcf97] ring-1 ring-white/10 outline-none disabled:opacity-80" />
              </label>
            </div>
          </div>

          <!-- ====== KABİN GİRİŞİ ====== -->
          <button type="button" @click="toggle('giris')"
            class="flex w-full items-center justify-between bg-[#223c2d] px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-white/10">
            Kabin Girişi
            <span class="text-ink-muted">{{ acik.giris ? '−' : '+' }}</span>
          </button>
          <div v-if="acik.giris" class="space-y-2 bg-surface-800/40 p-2 ring-1 ring-white/5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Giriş Tipi</span>
              <select v-model="form.kabinGirisTipi"
                class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                <option value="tek">Tek Giriş</option>
                <option value="cift">Çift Giriş</option>
              </select>
            </label>
            <p class="text-xs font-semibold text-ink">Giriş 1 (Ön)</p>
            <div class="grid grid-cols-3 gap-1.5">
              <input v-model.number="form.giris1KapiGenislik" type="number" placeholder="Kapı Gen. (mm)"
                class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
              <input v-model.number="form.giris1KapiYukseklik" type="number" placeholder="Kapı Yük. (mm)"
                class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
              <input v-model.number="form.giris1KapiAdet" type="number" placeholder="Kapı Adedi"
                class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <select v-model.number="form.giris1PanelSayisi"
                class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                <option value="" disabled>Panel Sayısı</option>
                <option v-for="p in [2, 3, 4, 5]" :key="p" :value="p">{{ p }} Panel</option>
              </select>
              <select v-model="form.giris1KapiYonu"
                class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                <option value="" disabled>Kapı Yönü</option>
                <option value="sag">Sağ</option>
                <option value="sol">Sol</option>
                <option value="merkezi">Merkezi</option>
              </select>
            </div>

            <template v-if="form.kabinGirisTipi === 'cift'">
              <p class="text-xs font-semibold text-ink">Giriş 2</p>
              <div class="grid grid-cols-3 gap-1.5">
                <input v-model.number="form.giris2KapiGenislik" type="number" placeholder="Kapı Gen. (mm)"
                  class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
                <input v-model.number="form.giris2KapiYukseklik" type="number" placeholder="Kapı Yük. (mm)"
                  class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
                <input v-model.number="form.giris2KapiAdet" type="number" placeholder="Kapı Adedi"
                  class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
              </div>
              <div class="grid grid-cols-3 gap-1.5">
                <select v-model.number="form.giris2PanelSayisi"
                  class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option value="" disabled>Panel Sayısı</option>
                  <option v-for="p in [2, 3, 4, 5]" :key="p" :value="p">{{ p }} Panel</option>
                </select>
                <select v-model="form.giris2KapiYonu"
                  class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option value="" disabled>Kapı Yönü</option>
                  <option value="sag">Sağ</option>
                  <option value="sol">Sol</option>
                  <option value="merkezi">Merkezi</option>
                </select>
                <select v-model="form.giris2Konum"
                  class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option value="" disabled>Konum</option>
                  <option value="arka">Arka</option>
                  <option value="sol">Sol</option>
                  <option value="sag">Sağ</option>
                </select>
              </div>
              <div v-if="durakSecenekleri.length" class="space-y-1">
                <span class="text-xs font-medium text-ink-muted">Giriş 2'nin bulunduğu duraklar</span>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="kat in durakSecenekleri" :key="kat" type="button" @click="durakToggle(kat)"
                    class="px-2.5 py-1 text-[11px] font-semibold ring-1"
                    :class="form.giris2Duraklar.includes(kat)
                      ? 'bg-[#2b5c3d] text-ink ring-white/20'
                      : 'bg-surface-900 text-ink-muted ring-white/10'">
                    Kat {{ kat }}
                  </button>
                </div>
              </div>
            </template>
          </div>

          <!-- ====== BİLEŞENLER ====== -->
          <button type="button" @click="toggle('bilesen')"
            class="flex w-full items-center justify-between bg-[#223c2d] px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-white/10">
            Asansör Bileşenleri
            <span class="text-ink-muted">{{ acik.bilesen ? '−' : '+' }}</span>
          </button>
          <div v-if="acik.bilesen" class="space-y-2 bg-surface-800/40 p-2 ring-1 ring-white/5">
            <template v-if="form.tahrikTipi !== 'hidrolik'">
              <p class="text-xs font-semibold text-ink">Motor</p>
              <div class="grid grid-cols-2 gap-1.5">
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Marka (katalogdan)</span>
                  <AramaliSelect v-model="motorModel" :options="motorBelgeSecenekleri" placeholder="Motor belgesi seç" />
                </label>
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Tip</span>
                  <AramaliSelect v-model="motorTipModel" :options="motorTipSecenekleri"
                    :disabled="!form.motorAksamBelgesiId" placeholder="Tip seç" />
                </label>
              </div>
              <div class="grid grid-cols-3 gap-1.5">
                <input v-model="form.motorSeriNo" type="text" placeholder="Seri No"
                  class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
                <input v-model.number="form.motorRpm" type="number" placeholder="RPM"
                  class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
                <input v-model.number="form.motorGucKw" type="number" step="0.1" placeholder="Güç (kW)"
                  class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
              </div>
              <input v-if="motorDislili" v-model="form.motorTahvilOrani" type="text" placeholder="Tahvil Oranı (örn. 49/2)"
                class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
            </template>

            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Halat Markası</span>
                <AramaliSelect v-model="halatMarkaModel" :options="markaSecenekleri('halat')" placeholder="Marka seç" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Halat Tipi</span>
                <AramaliSelect v-model="halatTipiModel" :options="halatTipiSecenekleri" placeholder="Tip seç" />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Ray Markası</span>
                <AramaliSelect v-model="rayMarkaModel" :options="markaSecenekleri('ray')" placeholder="Marka seç" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Kapı Paneli Markası</span>
                <AramaliSelect v-model="kapiPanelModel" :options="markaSecenekleri('kapi_panel')" placeholder="Marka seç" />
              </label>
            </div>
            <label v-if="form.kabinGirisTipi === 'cift'" class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Kapı Paneli Markası (Giriş 2)</span>
              <AramaliSelect v-model="kapiPanel2Model" :options="markaSecenekleri('kapi_panel')" placeholder="Marka seç" />
            </label>

            <div class="space-y-1.5 bg-surface-900/50 p-2 ring-1 ring-white/5">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-ink">Ek Belgeler</p>
                <button type="button" @click="ekBelgeEkle"
                  class="bg-surface-800 px-2.5 py-1 text-[11px] font-semibold text-ink-muted ring-1 ring-white/10">+ Belge</button>
              </div>
              <div v-for="(belge, i) in form.ekBelgeler" :key="i" class="flex items-center gap-1.5">
                <input v-model="belge.ad" type="text" placeholder="Belge adı"
                  class="w-32 bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
                <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 bg-surface-900 px-2 py-1.5 ring-1 ring-white/10">
                  <input type="file" accept="application/pdf,image/*" class="hidden" @change="dosyaSec(i, $event)" />
                  <span class="min-w-0 flex-1 truncate text-xs" :class="belge.dosya ? 'text-ink' : 'text-ink-muted/50'">
                    {{ dosyaYukleniyor[`ek-${i}`] ? 'Yükleniyor…' : (belge.dosya?.dosyaAdi || 'Dosya seç') }}
                  </span>
                </label>
                <button type="button" @click="ekBelgeSil(i)"
                  class="grid h-7 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">✕</button>
              </div>
            </div>
          </div>

          <!-- ====== GÜVENLİK AKSAMLARI (elektrikli) ====== -->
          <template v-if="form.tahrikTipi === 'elektrikli'">
            <button type="button" @click="toggle('aksam')"
              class="flex w-full items-center justify-between bg-[#223c2d] px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-white/10">
              Güvenlik Aksamları
              <span class="text-ink-muted">{{ acik.aksam ? '−' : '+' }}</span>
            </button>
            <div v-if="acik.aksam" class="space-y-2 bg-surface-800/40 p-2 ring-1 ring-white/5">
              <div v-for="tanim in SLOT_TANIMLARI" :key="tanim.slot" class="space-y-1.5 bg-surface-900/50 p-2 ring-1 ring-white/5">
                <div class="flex items-center justify-between">
                  <label v-if="tanim.opsiyonel" class="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-ink">
                    <input type="checkbox" :checked="slotSatirlari(tanim.slot).length > 0"
                      @change="slotToggle(tanim.slot, ($event.target as HTMLInputElement).checked)"
                      class="h-3.5 w-3.5 accent-[#2b5c3d]" />
                    {{ tanim.etiket }}
                  </label>
                  <p v-else class="text-xs font-semibold text-ink">{{ tanim.etiket }}</p>
                  <button v-if="tanim.coklu" type="button" @click="slotEkle(tanim.slot)"
                    class="bg-surface-800 px-2.5 py-1 text-[11px] font-semibold text-ink-muted ring-1 ring-white/10">+ Ekle</button>
                </div>
                <div v-for="(satir, i) in slotSatirlari(tanim.slot)" :key="i" class="space-y-1">
                  <div class="flex items-center gap-1.5">
                    <div class="min-w-0 flex-1">
                      <AramaliSelect :model-value="satirBelgeModel(satir).value"
                        @update:model-value="(v: string | number | null) => (satirBelgeModel(satir).value = v)"
                        :options="slotBelgeSecenekleri(tanim.kod)" placeholder="Sertifika seç (marka)" />
                    </div>
                    <button v-if="tanim.coklu && slotSatirlari(tanim.slot).length > 1" type="button" @click="satirSil(satir)"
                      class="grid h-7 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">✕</button>
                  </div>
                  <div v-if="!tanim.rapor" class="grid grid-cols-2 gap-1.5">
                    <AramaliSelect :model-value="satirTipModel(satir).value"
                      @update:model-value="(v: string | number | null) => (satirTipModel(satir).value = v)"
                      :options="satirTipSecenekleri(satir)" :disabled="!satir.aksamBelgesiId" placeholder="Tip" />
                    <input v-model="satir.seriNo" type="text" placeholder="Seri No"
                      class="bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
                  </div>
                </div>
                <label v-if="tanim.slot === 'ucm_acop'" class="flex cursor-pointer items-center gap-1.5 text-[11px] text-ink-muted">
                  <input type="checkbox" v-model="form.ucmAcopHizRegulatoruFrenIle" class="h-3.5 w-3.5 accent-[#2b5c3d]" />
                  UCM/ACOP, Hız Regülatörü + Fren ile sağlanıyor
                </label>
              </div>

              <div class="grid grid-cols-2 gap-1.5">
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Kabin Tampon Adedi</span>
                  <input v-model.number="form.kabinTamponAdedi" type="number"
                    class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
                </label>
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">K. Ağırlık Tampon Adedi</span>
                  <input v-model.number="form.karsiAgirlikTamponAdedi" type="number"
                    class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
                </label>
              </div>
            </div>
          </template>

          <!-- ====== AYDINLATMA ====== -->
          <button type="button" @click="toggle('aydinlatma')"
            class="flex w-full items-center justify-between bg-[#223c2d] px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-white/10">
            Aydınlatma Ölçümleri (lux)
            <span class="text-ink-muted">{{ acik.aydinlatma ? '−' : '+' }}</span>
          </button>
          <div v-if="acik.aydinlatma" class="grid grid-cols-2 gap-1.5 bg-surface-800/40 p-2 ring-1 ring-white/5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Kabin İçi</span>
              <input v-model.number="form.kabinIciAydinlatma" type="number"
                class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Kabin Üstü</span>
              <input v-model.number="form.kabinUstuAydinlatma" type="number"
                class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Kuyu Dibi</span>
              <input v-model.number="form.kuyuDibiAydinlatma" type="number"
                class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Makine Alanı</span>
              <input v-model.number="form.makineAlaniAydinlatma" type="number"
                class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
          </div>
        </form>
      </div>

      <!-- Şema modalları (body'ye teleport edilir) -->
      <KabinOlculeriModal
        v-model:open="kabinSemaAcik"
        v-model:kabin-genislik="form.kabinGenislik"
        v-model:kabin-derinlik="form.kabinDerinlik"
        v-model:kabin-ici-aydinlatma="form.kabinIciAydinlatma"
        v-model:giris-tipi="form.kabinGirisTipi" />

      <HalatKasnaklarModal
        v-model:open="halatSemaAcik"
        v-model:tahrik-kasnagi-capi="form.tahrikKasnakCapi"
        v-model:sapturma-kasnagi-capi="form.halatSapturmaKasnagiCapi"
        v-model:palanga1-capi="form.halatPalanga1Capi"
        v-model:palanga2-capi="form.halatPalanga2Capi"
        v-model:palanga3-capi="form.halatPalanga3Capi"
        v-model:halat-sekli="form.halatSekli"
        v-model:halat-adedi="form.halatAdet"
        v-model:halat-mesafesi="form.askiHalatArasiMesafe"
        v-model:halat-tipi="halatTipiSema"
        v-model:palanga-konumu="palangaKonumuSema"
        :aski-tipi="form.askiTipi || null"
        :halat-tipi-secenekleri="halatTipiSecenekleri" />

      <RayOlculeriModal
        v-model:open="raySemaAcik"
        v-model:karsi-agirlik-ray-arasi="form.karsiAgirlikRayArasi"
        v-model:kabin-ray-arasi="form.kabinRayArasi"
        v-model:ray-r-r="form.rayRR"
        v-model:ray-r-k="form.rayRK"
        v-model:kuyu-genislik="form.kuyuGenislik"
        v-model:kuyu-derinlik="form.kuyuDerinlik"
        v-model:kabin-ray-tipi="kabinRayTipiSema"
        v-model:karsi-agirlik-ray-tipi="karsiAgirlikRayTipiSema"
        :agirlik-konumu="form.karsiAgirlikKonumu || null" />

      <KuyuDipAlaniModal
        v-model:open="kuyuDipSemaAcik"
        v-model:kuyu-dip-yuksekligi="form.kuyuDipYukseklik"
        v-model:bosluk="form.kuyuDipBosluk"
        v-model:stroke="form.kuyuDipTamponStroke"
        v-model:durma-alani="form.kuyuDipDurmaAlani"
        v-model:karsi-bosluk="form.kuyuDipKarsiBosluk"
        v-model:karsi-stroke="form.kuyuDipKarsiStroke"
        :hiz="sayi(form.hiz)" />

      <KuyuUstAlaniModal
        v-model:open="kuyuUstSemaAcik"
        v-model:korkuluk-mesafe="form.kuyuUstKorkulukMesafe"
        v-model:korkuluk-yuksekligi="form.kuyuUstKorkulukYuksekligi"
        v-model:suspansiyon-mesafe="form.kuyuUstSuspansiyonMesafe"
        v-model:kabin-ust-durma="form.kuyuUstKabinUstDurma"
        v-model:son-kat="form.kuyuUstSonKat"
        v-model:durma-alani="form.kuyuUstDurmaAlani"
        :hiz="sayi(form.hiz)"
        :dip-bosluk="sayi(form.kuyuDipKarsiBosluk)"
        :dip-stroke="sayi(form.kuyuDipKarsiStroke)" />
    </ion-content>

    <ion-footer class="ion-no-border">
      <div class="border-t border-white/5 bg-surface-bar">
        <div class="mx-auto flex max-w-lg gap-1.5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" @click="geri"
            class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Vazgeç
          </button>
          <button type="submit" form="asansor-form" :disabled="kaydediliyor || yukleniyor || !gecerli"
            class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </ion-footer>
  </ion-page>
</template>
