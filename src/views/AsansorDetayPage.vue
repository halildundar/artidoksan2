<script setup lang="ts">
import { IonPage, IonContent, IonHeader, onIonViewWillEnter } from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAsansor, updateAsansor, type Asansor, type AsansorGuncelleme, type GuvenlikAksami } from '@/services/asansorService';
import { getAksamBelgeleri, type AksamBelgesi } from '@/services/aksamBelgesiService';
import { getSmmFirmalari, type SmmFirmasi } from '@/services/smmFirmaService';
import SmmFirmaSecModal from '@/components/SmmFirmaSecModal.vue';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import FotoCekModal from '@/components/FotoCekModal.vue';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import type { AdresKaydi } from '@/services/adresService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import KapiKilitleriModal from '@/components/sema/KapiKilitleriModal.vue';
import TamponlarModal from '@/components/sema/TamponlarModal.vue';
import FrenModal from '@/components/sema/FrenModal.vue';
import AksamModal from '@/components/sema/AksamModal.vue';
import MotorModal from '@/components/sema/MotorModal.vue';
import UcmAcopModal from '@/components/sema/UcmAcopModal.vue';
import DuraklarModal from '@/components/sema/DuraklarModal.vue';
import KapiOlculeriModal from '@/components/sema/KapiOlculeriModal.vue';
import AsansorAdresModal from '@/components/sema/AsansorAdresModal.vue';
import {
  kilitBelgesiBul,
  type KapiGiris,
  type TamponBolum,
  type FrenKabin,
  type FrenKarsiAgirlik,
  type AksamBolum,
  type MotorBilgi,
  type DurakSatiri,
  type KapiOlcum,
} from '@/components/sema/kapiKilitleriTipleri';
import { blurActive } from '@/utils/blurActive';
import { rayTipiEtiketi } from '@/utils/rayTipleri';
import SemaModal from '@/components/SemaModal.vue';
import AgirlikHesabiModal from '@/components/sema/AgirlikHesabiModal.vue';
import KabinOlculeriModal from '@/components/sema/KabinOlculeriModal.vue';
import HalatKasnaklarModal from '@/components/sema/HalatKasnaklarModal.vue';
import RayOlculeriModal from '@/components/sema/RayOlculeriModal.vue';
import KuyuDipAlaniModal from '@/components/sema/KuyuDipAlaniModal.vue';
import KuyuUstAlaniModal from '@/components/sema/KuyuUstAlaniModal.vue';
import MakineDairesiModal from '@/components/sema/MakineDairesiModal.vue';
import RiskAnaliziModal from '@/components/sema/RiskAnaliziModal.vue';
import SecilenRiskMaddeleri from '@/components/sema/SecilenRiskMaddeleri.vue';
import type { RiskMaddesiSecim } from '@/services/riskMaddesiService';
import {
  SINIF_ETIKETLERI,
  MAKINA_KONUMU_ETIKETLERI,
  AGIRLIK_KONUMU_ETIKETLERI,
  GIRIS_TIPI_ETIKETLERI,
  HALAT_SEKLI_ETIKETLERI,
  HALAT_TIPI_DEGERLERI,
} from '@/utils/asansorSecenekler';

// Asansör detay sayfası (artidoksan1 AsansorDetayView'un mobil karşılığı):
// üstte yatay kaydırılabilir BUTON GRUBU — her kutucuk ilgili şema modalını
// açar, modal kapanınca o bölümün alanları otomatik kaydedilir. Altta ön
// bilgi kartı ve her bölümün başlık + metin ÖZET kartları listelenir.
const route = useRoute();
const router = useRouter();

const id = computed(() => route.params.id as string);

const asansor = ref<Asansor | null>(null);
const yukleniyor = ref(false);
const hata = ref('');

// Modal İptal/✕ ile kapatıldıysa kapanış watch'ı kaydetmeden geçer.
const iptalEdildi = ref(false);

type Num = number | '' | null;

interface AgirlikBloguSatiri {
  adet: Num;
  birimAgirlik: Num;
}

function sayi(v: Num): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// CE kataloğunun aktif kayıtları — halat tipleri ve kapı kilidi marka/tip
// seçenekleri buradan türetilir.
const katalogBelgeler = ref<AksamBelgesi[]>([]);

// Halat tipi seçenekleri: standart liste (HALAT_TIPI_DEGERLERI) + katalogdaki
// aktif halat sertifikalarının tipler[] listesi (birleşik).
const halatTipiSecenekleri = computed(() => {
  const katalogTipler = katalogBelgeler.value
    .filter((b) => b.bilesenTipiKodu === 'halat')
    .flatMap((b) => b.tipler);
  return [...new Set([...HALAT_TIPI_DEGERLERI, ...katalogTipler])].map((t) => ({ label: t, value: t }));
});

const durakKilitBelgeleri = computed(() =>
  katalogBelgeler.value.filter((b) => b.bilesenTipiKodu === 'durak_kapi_kilidi')
);
const kabinKilitBelgeleri = computed(() =>
  katalogBelgeler.value.filter((b) => b.bilesenTipiKodu === 'kabin_kapi_kilidi')
);
const tamponBelgeleri = computed(() =>
  katalogBelgeler.value.filter((b) => b.bilesenTipiKodu === 'tampon')
);
const frenBelgeleri = computed(() =>
  katalogBelgeler.value.filter((b) => b.bilesenTipiKodu === 'fren')
);
const hizRegulatoruBelgeleri = computed(() =>
  katalogBelgeler.value.filter((b) => b.bilesenTipiKodu === 'hiz_regulatoru')
);
const kontrolKartiBelgeleri = computed(() =>
  katalogBelgeler.value.filter((b) => b.bilesenTipiKodu === 'kontrol_karti')
);
const motorDislisizBelgeleri = computed(() =>
  katalogBelgeler.value.filter((b) => b.bilesenTipiKodu === 'motor_dislisiz')
);
const motorDisliliBelgeleri = computed(() =>
  katalogBelgeler.value.filter((b) => b.bilesenTipiKodu === 'motor_dislili')
);
const ucmAcopBelgeleri = computed(() =>
  katalogBelgeler.value.filter((b) => b.bilesenTipiKodu === 'ucm_acop')
);
const yanginBelgeleri = computed(() =>
  katalogBelgeler.value.filter((b) => b.bilesenTipiKodu === 'yangin_sizdirmazlik_raporu')
);
const sarkacBelgeleri = computed(() =>
  katalogBelgeler.value.filter((b) => b.bilesenTipiKodu === 'sarkac_test_raporu')
);

async function yukle() {
  yukleniyor.value = true;
  hata.value = '';
  try {
    asansor.value = await getAsansor(id.value);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Asansör yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }

  getAksamBelgeleri({ durum: 'aktif' })
    .then((belgeler) => (katalogBelgeler.value = belgeler))
    .catch(() => { /* katalog çekilemezse sabit listelerle devam edilir */ });

  if (!smmFirmalar.value.length) {
    getSmmFirmalari()
      .then((liste) => (smmFirmalar.value = liste))
      .catch(() => { /* havuz çekilemezse mevcut snapshot gösterilmeye devam eder */ });
  }
}

onIonViewWillEnter(yukle);

async function guncelle(veri: AsansorGuncelleme) {
  try {
    asansor.value = await updateAsansor(id.value, veri);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kaydedilemedi';
  }
}

function git(path: string) {
  blurActive();
  router.push(path);
}

function geri() {
  blurActive();
  router.back();
}

const firmaAdi = computed(() => {
  const f = asansor.value?.firmaId;
  return typeof f === 'object' && f ? f.ad : '';
});

// ---- SMM firması: havuzdan (Ayarlar > SMM Firmaları) seçilir, seçilen
// kaydın bilgileri olduğu gibi asansöre kopyalanır ----
const smmFirmalar = ref<SmmFirmasi[]>([]);
const smmSecAcik = ref(false);

// Seçim kutusunda görünen etiket: "yıl — kısa ad"
const seciliSmmEtiket = computed(() => {
  const a = asansor.value;
  return a ? [a.smmYil, a.smmKisaAd].filter(Boolean).join(' — ') : '';
});

// Popup'tan seçilen SMM firmasının bilgileri olduğu gibi asansöre kopyalanır
function smmFirmaSec(s: SmmFirmasi) {
  guncelle({
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

// Seçimi ve kopyalanan tüm snapshot alanlarını temizler
function smmTemizle() {
  guncelle({
    smmFirmaId: null, smmYil: null, smmKisaAd: '', smmUnvan: '', smmAdres: '',
    smmBuroTescilBelgesi: null,
    smmMakMuhAdSoyad: '', smmMakMuhOdaSicilNo: '', smmMakMuhTelefon: '',
    smmMakMuhSmmBelgesi: null, smmMakMuhImzaSirkusu: null,
    smmElkMuhAdSoyad: '', smmElkMuhOdaSicilNo: '', smmElkMuhTelefon: '',
    smmElkMuhSmmBelgesi: null, smmElkMuhImzaSirkusu: null,
  });
}

// Gösterim satırları — yalnızca dolu mühendis blokları listelenir
const smmMuhendisler = computed(() => {
  const a = asansor.value;
  if (!a) return [];
  return [
    {
      baslik: 'Makine Mühendisi',
      adSoyad: a.smmMakMuhAdSoyad, sicil: a.smmMakMuhOdaSicilNo, telefon: a.smmMakMuhTelefon,
      belgeler: [
        { etiket: 'SMM Belgesi', dosya: a.smmMakMuhSmmBelgesi ?? null },
        { etiket: 'İmza Sirküsü', dosya: a.smmMakMuhImzaSirkusu ?? null },
      ],
    },
    {
      baslik: 'Elektrik Mühendisi',
      adSoyad: a.smmElkMuhAdSoyad, sicil: a.smmElkMuhOdaSicilNo, telefon: a.smmElkMuhTelefon,
      belgeler: [
        { etiket: 'SMM Belgesi', dosya: a.smmElkMuhSmmBelgesi ?? null },
        { etiket: 'İmza Sirküsü', dosya: a.smmElkMuhImzaSirkusu ?? null },
      ],
    },
  ].filter((m) => m.adSoyad || m.sicil || m.telefon || m.belgeler.some((b) => b.dosya));
});

// ---- Bölüm kutucukları (buton grubu) ----
interface Bolum {
  key: string;
  label: string;
  icon: string;
}

// İkinci sıra menüler — ikon ve yazı yan yana; içerikleri daha sonra
// doldurulacak (şimdilik boş placeholder popup açılır).
const altBolumler: Bolum[] = [
  { key: 'kapi', label: 'Kapı', icon: '🚪' },
  { key: 'tamponlar', label: 'Tamponlar', icon: '🔩' },
  { key: 'fren', label: 'Fren', icon: '🛑' },
  { key: 'hiz-regulatoru', label: 'Hız Regülatörü', icon: '⚙' },
  { key: 'kontrol-karti', label: 'Kontrol Kartı', icon: '🎛' },
  { key: 'motor', label: 'Motor', icon: '⚡' },
  { key: 'ucm-acop', label: 'UCM/ACOP', icon: '🛡' },
];

const aktifAltBolum = ref<Bolum | null>(null);
const altBolumAcik = computed({
  get: () => aktifAltBolum.value !== null,
  set: (v: boolean) => {
    if (!v) aktifAltBolum.value = null;
  },
});

function altBolumAc(bolum: Bolum) {
  blurActive();
  if (bolum.key === 'kapi') {
    kapiAc();
    return;
  }
  if (bolum.key === 'tamponlar') {
    tamponAc();
    return;
  }
  if (bolum.key === 'fren') {
    frenAc();
    return;
  }
  if (bolum.key === 'hiz-regulatoru') {
    hizRegAc();
    return;
  }
  if (bolum.key === 'kontrol-karti') {
    kontrolKartiAc();
    return;
  }
  if (bolum.key === 'motor') {
    motorAc();
    return;
  }
  if (bolum.key === 'ucm-acop') {
    ucmAc();
    return;
  }
  aktifAltBolum.value = bolum;
}

// ---- UCM/ACOP ----
const ucmAcik = ref(false);
const ucmTur = ref<'kart-motor-fren' | 'kart-reg-fren'>('kart-reg-fren');
const ucmBolum = ref<AksamBolum>({ marka: null, tip: null, seriNo: '', fotolar: [] });

// Kayıtlı güvenlik aksamı satırının tek satırlık metin özeti (UCM popup'ında
// kart/regülatör/fren bilgisi olarak gösterilir).
function aksamRowBilgi(slot: string): string {
  const r = (asansor.value?.guvenlikAksamlari ?? []).find((x) => x.slot === slot);
  if (!r) return '';
  return [r.markaSnapshot, r.tip, r.seriNo ? `Seri: ${r.seriNo}` : ''].filter(Boolean).join(' — ');
}

const ucmKartBilgi = computed(() => aksamRowBilgi('kontrol_karti'));
const ucmRegulatorBilgi = computed(() => {
  const metin = aksamRowBilgi('hiz_regulatoru');
  const hiz = asansor.value?.regulatorDevreyeGirmeHizi;
  if (!metin) return '';
  return hiz != null ? `${metin} — ${hiz.toFixed(2)} m/s` : metin;
});
const ucmFrenBilgi = computed(() => {
  const metin = aksamRowBilgi('fren');
  const konum = asansor.value?.frenKonumu;
  const konumEtiket = konum === 'kabin-ustu' ? 'Kabin Üstü' : konum === 'kabin-alti' ? 'Kabin Altı' : '';
  return [metin, konumEtiket].filter(Boolean).join(' — ');
});

function ucmAc() {
  const a = asansor.value;
  if (!a) return;
  ucmBolum.value = aksamBolumKur('ucm_acop', a.ucmAcopFotolari);
  // Varsayılan çözüm türü: Kart + Hız Reg. + Fren (kullanıcı isteği)
  ucmTur.value = a.ucmAcopTuru ?? 'kart-reg-fren';
  ucmAcik.value = true;
}

watch(ucmAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  // UCM/ACOP aksam satırı yalnızca Kart + Hız Reg. + Fren çözümünde tutulur
  const row = ucmTur.value === 'kart-reg-fren'
    ? aksamSatiri(ucmAcopBelgeleri.value, 'ucm_acop', ucmBolum.value)
    : null;
  const digerleri = (asansor.value?.guvenlikAksamlari ?? []).filter((r) => r.slot !== 'ucm_acop');
  guncelle({
    guvenlikAksamlari: row ? [...digerleri, row] : digerleri,
    ucmAcopTuru: ucmTur.value,
    ucmAcopHizRegulatoruFrenIle: ucmTur.value === 'kart-reg-fren',
    ucmAcopFotolari: ucmBolum.value.fotolar,
  });
});

// ---- Motor ----
const motorAcik = ref(false);
const motorBilgi = ref<MotorBilgi>({
  disliTipi: 'dislisiz', marka: null, tip: null, seriNo: '',
  gucKw: null, rpm: null, ratio: '', fotolar: [],
});

function motorAc() {
  const a = asansor.value;
  if (!a) return;
  // Dişli tipi: kayıttan; yoksa seçili motor belgesinin kodundan türetilir.
  const kayitliBelge = katalogBelgeler.value.find((b) => b._id === a.motorAksamBelgesiId);
  const disliTipi: MotorBilgi['disliTipi'] =
    a.motorDisliTipi ?? (kayitliBelge?.bilesenTipiKodu === 'motor_dislili' ? 'dislili' : 'dislisiz');
  motorBilgi.value = {
    disliTipi,
    marka: a.motorMarkaSnapshot || kayitliBelge?.marka || null,
    tip: a.motorTip || null,
    seriNo: a.motorSeriNo ?? '',
    gucKw: a.motorGucKw ?? null,
    rpm: a.motorRpm ?? null,
    ratio: a.motorTahvilOrani ?? '',
    fotolar: [...(a.motorFotolari ?? [])],
  };
  motorAcik.value = true;
}

watch(motorAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  const m = motorBilgi.value;
  const belgeler = m.disliTipi === 'dislili' ? motorDisliliBelgeleri.value : motorDislisizBelgeleri.value;
  const belge = kilitBelgesiBul(belgeler, m.marka, m.tip);
  guncelle({
    motorAksamBelgesiId: belge?._id ?? null,
    motorMarkaSnapshot: belge?.marka ?? m.marka ?? '',
    motorTip: m.tip ?? '',
    motorSeriNo: m.seriNo.trim(),
    motorGucKw: sayi(m.gucKw),
    motorRpm: sayi(m.rpm),
    // Ratio yalnız dişlili motorda anlamlıdır
    motorTahvilOrani: m.disliTipi === 'dislili' ? m.ratio.trim() : '',
    motorDisliTipi: m.disliTipi,
    motorFotolari: m.fotolar,
  });
});

// ---- Hız Regülatörü / Kontrol Kartı (tek satırlı aksam bölümleri) ----
// Marka+tip'ten çözülen belgenin tam bilgisiyle güvenlik aksamı satırı kurar.
function aksamSatiri(
  belgeler: AksamBelgesi[],
  slot: string,
  s: { marka: string | null; tip: string | null; seriNo: string }
): GuvenlikAksami | null {
  const belge = kilitBelgesiBul(belgeler, s.marka, s.tip);
  if (!belge) return null;
  return {
    slot,
    aksamBelgesiId: belge._id,
    markaSnapshot: belge.marka,
    tip: s.tip ?? '',
    seriNo: s.seriNo.trim(),
    bilesenTipiAdi: belge.bilesenTipiAdi ?? '',
    sertifikaNo: belge.sertifikaNo ?? '',
    belgeTipi: belge.belgeTipi ?? '',
    gecerlilikBaslangic: belge.gecerlilikBaslangic ?? null,
    gecerlilikBitis: belge.gecerlilikBitis ?? null,
    onayliKurumNobo: belge.onayliKurumNobo ?? '',
    onayliKurumUnvan: belge.onayliKurumUnvan ?? '',
  };
}

// Kayıtlı güvenlik aksamı satırından modal durumunu kurar.
function aksamBolumKur(slot: string, fotolar?: Asansor['frenFotolari']): AksamBolum {
  const row = (asansor.value?.guvenlikAksamlari ?? []).find((r) => r.slot === slot);
  return {
    marka: row?.markaSnapshot || katalogBelgeler.value.find((b) => b._id === row?.aksamBelgesiId)?.marka || null,
    tip: row?.tip || null,
    seriNo: row?.seriNo ?? '',
    fotolar: [...(fotolar ?? [])],
  };
}

const hizRegAcik = ref(false);
const hizRegBolum = ref<AksamBolum>({ marka: null, tip: null, seriNo: '', fotolar: [] });
const devreHiziL = ref<Num>(null);

function hizRegAc() {
  const a = asansor.value;
  if (!a) return;
  hizRegBolum.value = aksamBolumKur('hiz_regulatoru', a.hizRegulatoruFotolari);
  // Varsayılan devreye girme hızı: 1.30 m/s (kullanıcı isteği)
  devreHiziL.value = a.regulatorDevreyeGirmeHizi ?? 1.3;
  hizRegAcik.value = true;
}

watch(hizRegAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  const row = aksamSatiri(hizRegulatoruBelgeleri.value, 'hiz_regulatoru', hizRegBolum.value);
  const digerleri = (asansor.value?.guvenlikAksamlari ?? []).filter((r) => r.slot !== 'hiz_regulatoru');
  guncelle({
    guvenlikAksamlari: row ? [...digerleri, row] : digerleri,
    regulatorDevreyeGirmeHizi: sayi(devreHiziL.value),
    hizRegulatoruFotolari: hizRegBolum.value.fotolar,
  });
});

const kontrolKartiAcik = ref(false);
const kontrolKartiBolum = ref<AksamBolum>({ marka: null, tip: null, seriNo: '', fotolar: [] });

function kontrolKartiAc() {
  const a = asansor.value;
  if (!a) return;
  kontrolKartiBolum.value = aksamBolumKur('kontrol_karti', a.kontrolKartiFotolari);
  kontrolKartiAcik.value = true;
}

watch(kontrolKartiAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  const row = aksamSatiri(kontrolKartiBelgeleri.value, 'kontrol_karti', kontrolKartiBolum.value);
  const digerleri = (asansor.value?.guvenlikAksamlari ?? []).filter((r) => r.slot !== 'kontrol_karti');
  guncelle({
    guvenlikAksamlari: row ? [...digerleri, row] : digerleri,
    kontrolKartiFotolari: kontrolKartiBolum.value.fotolar,
  });
});

// ---- Fren ----
const FREN_SLOTLARI = ['fren', 'karsi_agirlik_freni'];
const frenAcik = ref(false);
const frenKabin = ref<FrenKabin>({ marka: null, tip: null, seriNo: '', konum: 'kabin-ustu', fotolar: [] });
const frenKarsi = ref<FrenKarsiAgirlik>({ var: false, marka: null, tip: null, seriNo: '', konum: null, fotolar: [] });

function frenAc() {
  const a = asansor.value;
  if (!a) return;
  const satirMarka = (belgeId: string | undefined, snapshot: string | undefined) =>
    snapshot || katalogBelgeler.value.find((b) => b._id === belgeId)?.marka || null;
  const kabinRow = (a.guvenlikAksamlari ?? []).find((r) => r.slot === 'fren');
  const karsiRow = (a.guvenlikAksamlari ?? []).find((r) => r.slot === 'karsi_agirlik_freni');
  frenKabin.value = {
    marka: satirMarka(kabinRow?.aksamBelgesiId, kabinRow?.markaSnapshot),
    tip: kabinRow?.tip || null,
    seriNo: kabinRow?.seriNo ?? '',
    // Varsayılan konum: Kabin Üstü (kullanıcı isteği)
    konum: a.frenKonumu ?? 'kabin-ustu',
    fotolar: [...(a.frenFotolari ?? [])],
  };
  frenKarsi.value = {
    var: a.karsiAgirlikFrenVar ?? !!karsiRow,
    marka: satirMarka(karsiRow?.aksamBelgesiId, karsiRow?.markaSnapshot),
    tip: karsiRow?.tip || null,
    seriNo: karsiRow?.seriNo ?? '',
    konum: a.karsiAgirlikFrenKonumu ?? null,
    fotolar: [...(a.karsiAgirlikFrenFotolari ?? [])],
  };
  frenAcik.value = true;
}

watch(frenAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  const satirKur = (slot: string, s: { marka: string | null; tip: string | null; seriNo: string }): GuvenlikAksami | null => {
    const belge = kilitBelgesiBul(frenBelgeleri.value, s.marka, s.tip);
    if (!belge) return null;
    return {
      slot,
      aksamBelgesiId: belge._id,
      markaSnapshot: belge.marka,
      tip: s.tip ?? '',
      seriNo: s.seriNo.trim(),
      bilesenTipiAdi: belge.bilesenTipiAdi ?? '',
      sertifikaNo: belge.sertifikaNo ?? '',
      belgeTipi: belge.belgeTipi ?? '',
      gecerlilikBaslangic: belge.gecerlilikBaslangic ?? null,
      gecerlilikBitis: belge.gecerlilikBitis ?? null,
      onayliKurumNobo: belge.onayliKurumNobo ?? '',
      onayliKurumUnvan: belge.onayliKurumUnvan ?? '',
    };
  };
  const rows: GuvenlikAksami[] = [];
  const kabinRow = satirKur('fren', frenKabin.value);
  if (kabinRow) rows.push(kabinRow);
  if (frenKarsi.value.var) {
    const karsiRow = satirKur('karsi_agirlik_freni', frenKarsi.value);
    if (karsiRow) rows.push(karsiRow);
  }
  const digerleri = (asansor.value?.guvenlikAksamlari ?? []).filter((r) => !FREN_SLOTLARI.includes(r.slot));
  guncelle({
    guvenlikAksamlari: [...digerleri, ...rows],
    frenKonumu: frenKabin.value.konum,
    karsiAgirlikFrenVar: frenKarsi.value.var,
    karsiAgirlikFrenKonumu: frenKarsi.value.var ? frenKarsi.value.konum : null,
    frenFotolari: frenKabin.value.fotolar,
    karsiAgirlikFrenFotolari: frenKarsi.value.fotolar,
  });
});

// ---- Tamponlar ----
const TAMPON_SLOTLARI = ['kabin_tamponu', 'karsi_agirlik_tamponu'];
const tamponAcik = ref(false);
const tamponKabin = ref<TamponBolum>({ adet: null, satirlar: [], fotolar: [] });
const tamponKarsi = ref<TamponBolum>({ adet: null, satirlar: [], fotolar: [] });

function tamponAc() {
  const a = asansor.value;
  if (!a) return;
  const bolumKur = (slot: string, adetKayit: number | null, fotolar: typeof a.kabinTamponFotolari): TamponBolum => {
    const rows = (a.guvenlikAksamlari ?? []).filter((r) => r.slot === slot);
    const satirlar = rows.map((r) => ({
      marka: r.markaSnapshot || katalogBelgeler.value.find((b) => b._id === r.aksamBelgesiId)?.marka || null,
      tip: r.tip || null,
      seriNo: r.seriNo,
    }));
    // Adet 1–10 arası seçimdir; kayıt yoksa satır sayısı, o da yoksa 1 gelir
    const adet = Math.min(Math.max(adetKayit ?? satirlar.length ?? 0, 1), 10);
    return { adet, satirlar, fotolar: [...(fotolar ?? [])] };
  };
  tamponKabin.value = bolumKur('kabin_tamponu', a.kabinTamponAdedi, a.kabinTamponFotolari);
  tamponKarsi.value = bolumKur('karsi_agirlik_tamponu', a.karsiAgirlikTamponAdedi, a.karsiAgirlikTamponFotolari);
  tamponAcik.value = true;
}

watch(tamponAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  const rows: GuvenlikAksami[] = [];
  const bolumSatirlari = (slot: string, bolum: TamponBolum) => {
    for (const satir of bolum.satirlar) {
      const belge = kilitBelgesiBul(tamponBelgeleri.value, satir.marka, satir.tip);
      if (!belge) continue;
      rows.push({
        slot,
        aksamBelgesiId: belge._id,
        markaSnapshot: belge.marka,
        tip: satir.tip ?? '',
        seriNo: satir.seriNo.trim(),
        bilesenTipiAdi: belge.bilesenTipiAdi ?? '',
        sertifikaNo: belge.sertifikaNo ?? '',
        belgeTipi: belge.belgeTipi ?? '',
        gecerlilikBaslangic: belge.gecerlilikBaslangic ?? null,
        gecerlilikBitis: belge.gecerlilikBitis ?? null,
        onayliKurumNobo: belge.onayliKurumNobo ?? '',
        onayliKurumUnvan: belge.onayliKurumUnvan ?? '',
      });
    }
  };
  bolumSatirlari('kabin_tamponu', tamponKabin.value);
  bolumSatirlari('karsi_agirlik_tamponu', tamponKarsi.value);
  const digerleri = (asansor.value?.guvenlikAksamlari ?? []).filter((r) => !TAMPON_SLOTLARI.includes(r.slot));
  guncelle({
    guvenlikAksamlari: [...digerleri, ...rows],
    kabinTamponAdedi: typeof tamponKabin.value.adet === 'number' ? tamponKabin.value.adet : null,
    karsiAgirlikTamponAdedi: typeof tamponKarsi.value.adet === 'number' ? tamponKarsi.value.adet : null,
    kabinTamponFotolari: tamponKabin.value.fotolar,
    karsiAgirlikTamponFotolari: tamponKarsi.value.fotolar,
  });
});

// ---- Kapı Kilitleri ----
const KAPI_SLOTLARI = [
  'durak_kapi_kilidi', 'kabin_kapi_kilidi', 'durak_kapi_kilidi_2', 'kabin_kapi_kilidi_2',
  'yangin_sizdirmazlik_raporu', 'sarkac_test_raporu',
];
const kapiAcik = ref(false);
const kapiGirisler = ref<KapiGiris[]>([]);

function kapiAc() {
  const a = asansor.value;
  if (!a) return;
  // Kayıtlı satırın markası snapshot'tan, yoksa katalogdaki belgeden bulunur
  const markaBul = (belgeId: string | undefined, snapshot: string | undefined) =>
    snapshot || katalogBelgeler.value.find((b) => b._id === belgeId)?.marka || null;
  const girisKur = (slotDurak: string, slotKabin: string, girisNo: 1 | 2): KapiGiris => {
    const durakRows = (a.guvenlikAksamlari ?? []).filter((r) => r.slot === slotDurak);
    const kabinRow = (a.guvenlikAksamlari ?? []).find((r) => r.slot === slotKabin);
    return {
      durakMarka: markaBul(durakRows[0]?.aksamBelgesiId, durakRows[0]?.markaSnapshot),
      durakTip: durakRows[0]?.tip || null,
      durakSeriNolar: durakRows.length ? durakRows.map((r) => ({ deger: r.seriNo })) : [{ deger: '' }],
      durakFotolar: [...((girisNo === 1 ? a.durakKilitFotolari : a.durakKilitFotolari2) ?? [])],
      kabinMarka: markaBul(kabinRow?.aksamBelgesiId, kabinRow?.markaSnapshot),
      kabinTip: kabinRow?.tip || null,
      kabinSeriNo: kabinRow?.seriNo ?? '',
      kabinFotolar: [...((girisNo === 1 ? a.kabinKilitFotolari : a.kabinKilitFotolari2) ?? [])],
    };
  };
  kapiGirisler.value =
    a.kabinGirisTipi === 'cift'
      ? [girisKur('durak_kapi_kilidi', 'kabin_kapi_kilidi', 1), girisKur('durak_kapi_kilidi_2', 'kabin_kapi_kilidi_2', 2)]
      : [girisKur('durak_kapi_kilidi', 'kabin_kapi_kilidi', 1)];
  kapiAcik.value = true;
}

watch(kapiAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  // Kayıtta id'ye ek olarak belgenin tam bilgisi de saklanır (kullanıcı isteği)
  const tamSatir = (
    slot: string,
    belgeler: AksamBelgesi[],
    belgeId: string,
    tip: string,
    seriNo: string
  ): GuvenlikAksami => {
    const belge = belgeler.find((b) => b._id === belgeId);
    return {
      slot,
      aksamBelgesiId: belgeId,
      markaSnapshot: belge?.marka ?? '',
      tip,
      seriNo,
      bilesenTipiAdi: belge?.bilesenTipiAdi ?? '',
      sertifikaNo: belge?.sertifikaNo ?? '',
      belgeTipi: belge?.belgeTipi ?? '',
      gecerlilikBaslangic: belge?.gecerlilikBaslangic ?? null,
      gecerlilikBitis: belge?.gecerlilikBitis ?? null,
      onayliKurumNobo: belge?.onayliKurumNobo ?? '',
      onayliKurumUnvan: belge?.onayliKurumUnvan ?? '',
    };
  };

  const rows: GuvenlikAksami[] = [];
  const secilenMarkalar = new Set<string>();
  kapiGirisler.value.forEach((g, i) => {
    const slotDurak = i === 0 ? 'durak_kapi_kilidi' : 'durak_kapi_kilidi_2';
    const slotKabin = i === 0 ? 'kabin_kapi_kilidi' : 'kabin_kapi_kilidi_2';
    // Marka + tip'ten belge çözülür (markanın tipi içeren ilk sertifikası)
    const durakBelge = kilitBelgesiBul(durakKilitBelgeleri.value, g.durakMarka, g.durakTip);
    if (durakBelge) {
      secilenMarkalar.add(durakBelge.marka);
      const seriler = g.durakSeriNolar.map((s) => s.deger.trim()).filter(Boolean);
      for (const seri of seriler.length ? seriler : ['']) {
        rows.push(tamSatir(slotDurak, durakKilitBelgeleri.value, durakBelge._id, g.durakTip ?? '', seri));
      }
    }
    const kabinBelge = kilitBelgesiBul(kabinKilitBelgeleri.value, g.kabinMarka, g.kabinTip);
    if (kabinBelge) {
      secilenMarkalar.add(kabinBelge.marka);
      rows.push(tamSatir(slotKabin, kabinKilitBelgeleri.value, kabinBelge._id, g.kabinTip ?? '', g.kabinSeriNo.trim()));
    }
  });
  // Seçilen markaların yangın/sarkaç raporları otomatik eklenir
  const eklenenRapor = new Set<string>();
  for (const marka of secilenMarkalar) {
    const yangin = yanginBelgeleri.value.find((b) => b.marka === marka);
    if (yangin && !eklenenRapor.has(yangin._id)) {
      eklenenRapor.add(yangin._id);
      rows.push(tamSatir('yangin_sizdirmazlik_raporu', yanginBelgeleri.value, yangin._id, '', ''));
    }
    const sarkac = sarkacBelgeleri.value.find((b) => b.marka === marka);
    if (sarkac && !eklenenRapor.has(sarkac._id)) {
      eklenenRapor.add(sarkac._id);
      rows.push(tamSatir('sarkac_test_raporu', sarkacBelgeleri.value, sarkac._id, '', ''));
    }
  }
  const digerleri = (asansor.value?.guvenlikAksamlari ?? []).filter((r) => !KAPI_SLOTLARI.includes(r.slot));
  guncelle({
    guvenlikAksamlari: [...digerleri, ...rows],
    durakKilitFotolari: kapiGirisler.value[0]?.durakFotolar ?? [],
    durakKilitFotolari2: kapiGirisler.value[1]?.durakFotolar ?? [],
    kabinKilitFotolari: kapiGirisler.value[0]?.kabinFotolar ?? [],
    kabinKilitFotolari2: kapiGirisler.value[1]?.kabinFotolar ?? [],
  });
});

// Makine Dairesi kutucuğu yalnız makine daireli (MR) asansörlerde görünür.
const bolumler = computed<Bolum[]>(() => [
  { key: 'kapi-olculeri', label: 'Kapı ve Ölçüleri', icon: '🚪' },
  { key: 'duraklar', label: 'Duraklar', icon: '🏢' },
  { key: 'kabin-olculeri', label: 'Kabin', icon: '' },
  { key: 'kuyu-dip-alani', label: 'Kuyu Dip Alanı', icon: '' },
  { key: 'ray-olculeri', label: 'Ray Ölçüleri', icon: '📏' },
  { key: 'kuyu-ust-alani', label: 'Kuyu Üst Alanı', icon: '🔝' },
  { key: 'agirlik-hesabi', label: 'Ağırlık Hesabı', icon: '⚖' },
  { key: 'halat-kasnaklar', label: 'Halat ve Kasnaklar', icon: '🔗' },
  { key: 'kurum-evraklari', label: 'Kurum Evrakları', icon: '📄' },
  ...(asansor.value?.makinaKonumu === 'MR'
    ? [{ key: 'makine-dairesi', label: 'Makine Dairesi', icon: '🏠' }]
    : []),
]);

// ---- Makine Dairesi ----
const makineAcik = ref(false);
const makineCalismaL = ref<Num>(null);
const makineGecisL = ref<Num>(null);
const makineKapiL = ref<Num>(null);

watch(makineAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  guncelle({
    makineDairesiCalismaYuksekligi: sayi(makineCalismaL.value),
    makineDairesiGecisYuksekligi: sayi(makineGecisL.value),
    makineDairesiKapiYuksekligi: sayi(makineKapiL.value),
  });
});

// ---- Ağırlık Hesabı ----
const agirlikAcik = ref(false);
const karkasAgirligiL = ref<Num>(null);
const bloklarL = ref<AgirlikBloguSatiri[]>([]);

const agirlikKarsiAgirlik = computed(
  () =>
    (sayi(karkasAgirligiL.value) ?? 0) +
    bloklarL.value.reduce((top, b) => top + (sayi(b.adet) ?? 0) * (sayi(b.birimAgirlik) ?? 0), 0)
);
const agirlikKabinAgirligi = computed(
  () => agirlikKarsiAgirlik.value - (asansor.value?.beyanYuku ?? 0) / 2
);

// ---- Kabin Ölçüleri ----
const kabinAcik = ref(false);
const kabinGenislikL = ref<Num>(null);
const kabinDerinlikL = ref<Num>(null);
const kabinIciAydinlatmaL = ref<Num>(null);
const kabinGirisTipiL = ref<string | null>(null);
const kabinPanelMalzemesiL = ref<'paslanmaz' | 'cam' | null>(null);
const kabinCamBelgesiL = ref<BelgeSlot | null>(null);
const kabinFotolariL = ref<BelgeSlot[]>([]);

// ---- Halat ve Kasnaklar ----
const halatAcik = ref(false);
const tahrikKasnagiL = ref<Num>(null);
const sapturmaKasnagiL = ref<Num>(null);
const palanga1L = ref<Num>(null);
const palanga2L = ref<Num>(null);
const palanga3L = ref<Num>(null);
const halatSekliL = ref<string | null>(null);
const halatAdediL = ref<Num>(null);
const halatMesafesiL = ref<Num>(null);
const halatTipiL = ref<string | null>(null);
const dikeyMesafeL = ref<Num>(null);
const yatayMesafeL = ref<Num>(null);
const sarimAcisiL = ref<Num>(null);
const palangaKonumuL = ref<string | null>(null);

// ---- Ray Ölçüleri ----
const rayAcik = ref(false);
const karsiAgirlikRayArasiL = ref<Num>(null);
const kabinRayArasiL = ref<Num>(null);
const rayRRL = ref<Num>(null);
const rayRKL = ref<Num>(null);
const kuyuGenislikL = ref<Num>(null);
const kuyuDerinlikL = ref<Num>(null);
const kabinRayTipiL = ref<string | null>(null);
const karsiAgirlikRayTipiL = ref<string | null>(null);

// ---- Kuyu Dip Alanı ----
const kuyuDipAcik = ref(false);
const kuyuDipYuksekligiL = ref<Num>(null);
const kuyuDipKabinEnAltL = ref<Num>(null);
const kuyuDipEtekSaciL = ref<Num>(null);
const kuyuDipIvL = ref<Num>(null);
const kuyuDipBoslukL = ref<Num>(null);
const kuyuDipStrokeL = ref<Num>(null);
const kuyuDipDurmaAlaniL = ref<string | null>(null);
const kuyuDipKarsiBoslukL = ref<Num>(null);
const kuyuDipKarsiStrokeL = ref<Num>(null);

// ---- Duraklar ----
const duraklarAcik = ref(false);
const durakSatirlariL = ref<DurakSatiri[]>([]);

// ---- Kapı ve Ölçüleri ----
const kapiOlcumAcik = ref(false);
const kapiOlcumleriL = ref<KapiOlcum[]>([]);

// ---- Asansör Adresi ----
// Adresler ayrı koleksiyonda tutulur; popup'ta kayıtlardan seçilir ve seçilen
// kaydın verileri asansöre olduğu gibi kopyalanır.
const adresAcik = ref(false);
const secilenAdresL = ref<AdresKaydi | null>(null);

function adresAc() {
  blurActive();
  if (!asansor.value) return;
  secilenAdresL.value = null;
  adresAcik.value = true;
}

watch(adresAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  const k = secilenAdresL.value;
  if (!k) return; // seçim yapılmadan kapatıldıysa mevcut adres korunur
  guncelle({
    il: k.il,
    ilce: k.ilce,
    mahalle: k.mahalle,
    postaKodu: k.postaKodu,
    adres: k.adres,
    ada: k.ada,
    parsel: k.parsel,
    yapiRuhsatiDosya: k.yapiRuhsatiDosya ?? null,
  });
});

// Adres paneli — tam adres tek satırda: "mahalle, adres, İlçe/İl";
// altında "PK · Ada · Parsel" detay satırı.
const adresYeri = computed(() => {
  const a = asansor.value;
  if (!a) return '';
  return [a.mahalle, a.adres, [a.ilce, a.il].filter(Boolean).join('/')]
    .filter(Boolean)
    .join(', ');
});

const adresDetayi = computed(() => {
  const a = asansor.value;
  if (!a) return '';
  return [
    a.postaKodu ? `PK: ${a.postaKodu}` : '',
    a.ada ? `Ada: ${a.ada}` : '',
    a.parsel ? `Parsel: ${a.parsel}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
});

// ---- Kuyu Üst Alanı ----
const kuyuUstAcik = ref(false);
const korkulukMesafeL = ref<Num>(null);
const korkulukYuksekligiL = ref<Num>(null);
const suspansiyonMesafeL = ref<Num>(null);
const kabinUstDurmaL = ref<Num>(null);
const sonKatL = ref<Num>(null);
const kuyuUstDurmaAlaniL = ref<string | null>(null);

function bolumAc(bolum: Bolum) {
  blurActive();
  const a = asansor.value;
  if (!a) return;

  if (bolum.key === 'kurum-evraklari') {
    kurumEvrakOnizlemeleriYukle();
    kurumEvrakAcik.value = true;
    return;
  }

  if (bolum.key === 'agirlik-hesabi') {
    karkasAgirligiL.value = a.karkasAgirligi ?? null;
    // Değer girilmemiş yeni kayıtlarda varsayılan blok: 30 × 40 kg.
    bloklarL.value = a.agirlikBloklari?.length
      ? a.agirlikBloklari.map((b) => ({ adet: b.adet, birimAgirlik: b.birimAgirlik }))
      : [{ adet: 30, birimAgirlik: 40 }];
    agirlikAcik.value = true;
    return;
  }
  if (bolum.key === 'kabin-olculeri') {
    // Varsayılan 1350×1350 mm (kare kabin).
    kabinGenislikL.value = a.kabinGenislik ?? 1350;
    kabinDerinlikL.value = a.kabinDerinlik ?? 1350;
    kabinIciAydinlatmaL.value = a.kabinIciAydinlatma ?? null;
    kabinGirisTipiL.value = a.kabinGirisTipi ?? 'tek';
    kabinPanelMalzemesiL.value = a.kabinPanelMalzemesi ?? 'paslanmaz';
    kabinCamBelgesiL.value = a.kabinCamBelgesi ?? null;
    kabinFotolariL.value = [...(a.kabinFotolari ?? [])];
    kabinAcik.value = true;
    return;
  }
  if (bolum.key === 'halat-kasnaklar') {
    // Varsayılanlar askı tipine göre: 1:1'de tahrik 480 / saptırma 400;
    // diğer oranlarda tahrik ve palangalar 240 mm.
    const birBir = a.askiTipi === '1:1';
    tahrikKasnagiL.value = a.tahrikKasnakCapi ?? (birBir ? 480 : 240);
    sapturmaKasnagiL.value = a.halatSapturmaKasnagiCapi ?? 400;
    palanga1L.value = a.halatPalanga1Capi ?? 240;
    palanga2L.value = a.halatPalanga2Capi ?? 240;
    palanga3L.value = a.halatPalanga3Capi ?? 240;
    halatSekliL.value = a.halatSekli ?? null;
    halatAdediL.value = a.halatAdet ?? null;
    // Varsayılanlar (kullanıcı isteği): halat mesafesi 700, dikey mesafe 900.
    halatMesafesiL.value = a.askiHalatArasiMesafe ?? 700;
    halatTipiL.value = a.halatTipi || null;
    dikeyMesafeL.value = a.kasnaklarArasiDikeyMesafe ?? 900;
    yatayMesafeL.value = a.kasnaklarArasiYatayMesafe ?? null;
    sarimAcisiL.value = a.sarimAcisi ?? null;
    palangaKonumuL.value = a.kabinPalangaKonumu && a.kabinPalangaKonumu !== 'yok' ? a.kabinPalangaKonumu : null;
    halatAcik.value = true;
    return;
  }
  if (bolum.key === 'ray-olculeri') {
    karsiAgirlikRayArasiL.value = a.karsiAgirlikRayArasi ?? null;
    kabinRayArasiL.value = a.kabinRayArasi ?? null;
    // Ağırlık sağda/solda RR varsayılanı 280 mm; arkada varsayılan yok.
    const yanda = a.karsiAgirlikKonumu === 'sag' || a.karsiAgirlikKonumu === 'sol';
    rayRRL.value = a.rayRR ?? (yanda ? 280 : null);
    rayRKL.value = a.rayRK ?? null;
    kuyuGenislikL.value = a.kuyuGenislik ?? null;
    kuyuDerinlikL.value = a.kuyuDerinlik ?? null;
    // Varsayılan ray tipleri: kabin T89/B, karşı ağırlık T50/B.
    kabinRayTipiL.value = a.kabinRayTipi || 'T89/B';
    karsiAgirlikRayTipiL.value = a.karsiAgirlikRayTipi || 'T50/B';
    rayAcik.value = true;
    return;
  }
  if (bolum.key === 'kuyu-dip-alani') {
    // Varsayılanlar: dip yüksekliği 1500 (minimum), boşluk 150, stroke 100;
    // karşı ağırlık tamponu boşluk 100, stroke 100.
    kuyuDipYuksekligiL.value = a.kuyuDipYukseklik ?? 1500;
    // Varsayılanlar: kabin en alt noktası 1350, etek sacı taban mesafesi 350.
    kuyuDipKabinEnAltL.value = a.kuyuDipKabinEnAltNokta ?? 1350;
    kuyuDipEtekSaciL.value = a.kuyuDipEtekSaciTabanMesafe ?? 350;
    // Varsayılan gergi kasnağı mesafesi: 300 mm
    kuyuDipIvL.value = a.kuyuDipIvOlcusu ?? 300;
    kuyuDipBoslukL.value = a.kuyuDipBosluk ?? 150;
    kuyuDipStrokeL.value = a.kuyuDipTamponStroke ?? 100;
    // Varsayılan durma alanı: 50 x 70 x 100 cm
    kuyuDipDurmaAlaniL.value = a.kuyuDipDurmaAlani ?? '50x70x100';
    kuyuDipKarsiBoslukL.value = a.kuyuDipKarsiBosluk ?? 100;
    kuyuDipKarsiStrokeL.value = a.kuyuDipKarsiStroke ?? 100;
    kuyuDipAcik.value = true;
    return;
  }
  if (bolum.key === 'duraklar') {
    // Kayıt yoksa durak sayısı adedince 0,1,2… duraklar; mesafe 3000 mm.
    durakSatirlariL.value = a.katYukseklikleri?.length
      ? a.katYukseklikleri.map((k) => ({ kat: k.kat, yukseklik: k.yukseklik }))
      : Array.from({ length: Math.max(a.durakSayisi ?? 0, 0) }, (_, i) => ({ kat: i, yukseklik: 3000 }));
    duraklarAcik.value = true;
    return;
  }
  if (bolum.key === 'kuyu-ust-alani') {
    // Varsayılanlar: korkuluk mesafe 600, korkuluk 1100, süspansiyon 800,
    // kabin üst durma 1250, son kat 4250.
    korkulukMesafeL.value = a.kuyuUstKorkulukMesafe ?? 600;
    korkulukYuksekligiL.value = a.kuyuUstKorkulukYuksekligi ?? 1100;
    suspansiyonMesafeL.value = a.kuyuUstSuspansiyonMesafe ?? 800;
    kabinUstDurmaL.value = a.kuyuUstKabinUstDurma ?? 1250;
    sonKatL.value = a.kuyuUstSonKat ?? 4250;
    // Varsayılan durma alanı: 50 x 70 x 100 cm
    kuyuUstDurmaAlaniL.value = a.kuyuUstDurmaAlani ?? '50x70x100';
    kuyuUstAcik.value = true;
    return;
  }
  if (bolum.key === 'makine-dairesi') {
    makineCalismaL.value = a.makineDairesiCalismaYuksekligi ?? null;
    makineGecisL.value = a.makineDairesiGecisYuksekligi ?? null;
    makineKapiL.value = a.makineDairesiKapiYuksekligi ?? null;
    makineAcik.value = true;
    return;
  }
  if (bolum.key === 'kapi-olculeri') {
    // Varsayılan: 2 panel teleskopik sol, paslanmaz çelik; çift girişte iki bölüm.
    const girisKur = (girisNo: 1 | 2): KapiOlcum => {
      const [panel, yon, genislik, yukseklik, malzeme, camBelgesi, fotolar, riskDuraklar] =
        girisNo === 1
          ? [a.giris1PanelSayisi, a.giris1KapiYonu, a.giris1KapiGenislik, a.giris1KapiYukseklik,
             a.giris1PanelMalzemesi, a.giris1CamBelgesi, a.giris1KapiFotolari, a.giris1DusukKapiDuraklari] as const
          : [a.giris2PanelSayisi, a.giris2KapiYonu, a.giris2KapiGenislik, a.giris2KapiYukseklik,
             a.giris2PanelMalzemesi, a.giris2CamBelgesi, a.giris2KapiFotolari, a.giris2DusukKapiDuraklari] as const;
      return {
        panel: Math.min(Math.max(panel ?? 2, 2), 4),
        yon: (yon as KapiOlcum['yon']) ?? 'sol',
        genislik: genislik ?? null,
        yukseklik: yukseklik ?? null,
        riskDuraklar: [...(riskDuraklar ?? [])],
        panelMalzemesi: malzeme ?? 'paslanmaz',
        camBelgesi: camBelgesi ?? null,
        fotolar: [...(fotolar ?? [])],
      };
    };
    kapiOlcumleriL.value = a.kabinGirisTipi === 'cift' ? [girisKur(1), girisKur(2)] : [girisKur(1)];
    kapiOlcumAcik.value = true;
    return;
  }
  git(`/asansor/${id.value}/duzenle`);
}

// Modal KAPANINCA ilgili bölümün alanları otomatik kaydedilir (artidoksan1
// deseni) — açılışta değil, yalnızca açıkken kapanınca.
watch(agirlikAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  guncelle({
    karkasAgirligi: sayi(karkasAgirligiL.value),
    agirlikBloklari: bloklarL.value.map((b) => ({
      adet: sayi(b.adet) ?? 0,
      birimAgirlik: sayi(b.birimAgirlik) ?? 0,
    })),
    karsiAgirlik: agirlikKarsiAgirlik.value,
    kabinAgirligi: agirlikKabinAgirligi.value,
  });
});

watch(kabinAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  guncelle({
    kabinGenislik: sayi(kabinGenislikL.value),
    kabinDerinlik: sayi(kabinDerinlikL.value),
    kabinIciAydinlatma: sayi(kabinIciAydinlatmaL.value),
    kabinGirisTipi: (kabinGirisTipiL.value as 'tek' | 'cift' | null) ?? 'tek',
    kabinPanelMalzemesi: kabinPanelMalzemesiL.value,
    // Cam belgesi yalnız cam panelde saklanır
    kabinCamBelgesi: kabinPanelMalzemesiL.value === 'cam' ? kabinCamBelgesiL.value : null,
    kabinFotolari: kabinFotolariL.value,
  });
});

watch(halatAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  guncelle({
    tahrikKasnakCapi: sayi(tahrikKasnagiL.value),
    halatSapturmaKasnagiCapi: sayi(sapturmaKasnagiL.value),
    halatPalanga1Capi: sayi(palanga1L.value),
    halatPalanga2Capi: sayi(palanga2L.value),
    halatPalanga3Capi: sayi(palanga3L.value),
    halatSekli: (halatSekliL.value as Asansor['halatSekli']) ?? null,
    halatAdet: sayi(halatAdediL.value),
    askiHalatArasiMesafe: sayi(halatMesafesiL.value),
    halatTipi: halatTipiL.value ?? '',
    kasnaklarArasiDikeyMesafe: sayi(dikeyMesafeL.value),
    kasnaklarArasiYatayMesafe: sayi(yatayMesafeL.value),
    sarimAcisi: sayi(sarimAcisiL.value),
    kabinPalangaKonumu: palangaKonumuL.value ?? 'yok',
  });
});

watch(rayAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  guncelle({
    karsiAgirlikRayArasi: sayi(karsiAgirlikRayArasiL.value),
    kabinRayArasi: sayi(kabinRayArasiL.value),
    rayRR: sayi(rayRRL.value),
    rayRK: sayi(rayRKL.value),
    kuyuGenislik: sayi(kuyuGenislikL.value),
    kuyuDerinlik: sayi(kuyuDerinlikL.value),
    kabinRayTipi: kabinRayTipiL.value ?? '',
    karsiAgirlikRayTipi: karsiAgirlikRayTipiL.value ?? '',
  });
});

watch(kuyuDipAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  guncelle({
    kuyuDipYukseklik: sayi(kuyuDipYuksekligiL.value),
    kuyuDipKabinEnAltNokta: sayi(kuyuDipKabinEnAltL.value),
    kuyuDipEtekSaciTabanMesafe: sayi(kuyuDipEtekSaciL.value),
    kuyuDipIvOlcusu: sayi(kuyuDipIvL.value),
    kuyuDipBosluk: sayi(kuyuDipBoslukL.value),
    kuyuDipTamponStroke: sayi(kuyuDipStrokeL.value),
    kuyuDipDurmaAlani: kuyuDipDurmaAlaniL.value,
    kuyuDipKarsiBosluk: sayi(kuyuDipKarsiBoslukL.value),
    kuyuDipKarsiStroke: sayi(kuyuDipKarsiStrokeL.value),
  });
});

watch(duraklarAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  // Seyir mesafesi, EN ÜST durağın mesafesi hariç durak arası mesafelerin
  // toplamıdır; kuyu boyu = dip + seyir + son kat.
  const kayit = durakSatirlariL.value
    .filter((s) => sayi(s.kat) !== null)
    .map((s) => ({ kat: sayi(s.kat) ?? 0, yukseklik: sayi(s.yukseklik) ?? 0 }))
    .sort((x, y) => x.kat - y.kat);
  const seyir = kayit.slice(0, -1).reduce((toplam, s) => toplam + s.yukseklik, 0);
  const veri: AsansorGuncelleme = {
    katYukseklikleri: kayit,
    seyirMesafesi: kayit.length ? seyir : null,
  };
  // Kuyu dip girilmemişse Kuyu Dip Alanı popup'ının varsayılanı (1500) kullanılır
  const dip = asansor.value?.kuyuDipYukseklik ?? 1500;
  // Son kat yüksekliği Kuyu Üst Alanı popup'ından (kuyuUstSonKat) da girilebilir
  const sonKat = asansor.value?.sonKatYukseklik ?? asansor.value?.kuyuUstSonKat;
  if (kayit.length && dip != null && sonKat != null) veri.kuyuBoyu = dip + seyir + sonKat;
  guncelle(veri);
});

watch(kapiOlcumAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  const [g1, g2] = kapiOlcumleriL.value;
  const veri: AsansorGuncelleme = {
    giris1PanelSayisi: g1?.panel ?? null,
    giris1KapiYonu: g1?.yon ?? null,
    giris1KapiGenislik: g1 ? sayi(g1.genislik) : null,
    giris1KapiYukseklik: g1 ? sayi(g1.yukseklik) : null,
    // Düşük kapı durakları yalnız yükseklik 2000 altındayken saklanır
    giris1DusukKapiDuraklari:
      g1 && sayi(g1.yukseklik) != null && (sayi(g1.yukseklik) as number) < 2000 ? g1.riskDuraklar : [],
    giris1PanelMalzemesi: g1?.panelMalzemesi ?? null,
    // Cam belgesi yalnız cam panelde saklanır
    giris1CamBelgesi: g1?.panelMalzemesi === 'cam' ? g1.camBelgesi : null,
    giris1KapiFotolari: g1?.fotolar ?? [],
  };
  if (g2) {
    veri.giris2PanelSayisi = g2.panel;
    veri.giris2KapiYonu = g2.yon;
    veri.giris2KapiGenislik = sayi(g2.genislik);
    veri.giris2KapiYukseklik = sayi(g2.yukseklik);
    veri.giris2DusukKapiDuraklari =
      sayi(g2.yukseklik) != null && (sayi(g2.yukseklik) as number) < 2000 ? g2.riskDuraklar : [];
    veri.giris2PanelMalzemesi = g2.panelMalzemesi;
    veri.giris2CamBelgesi = g2.panelMalzemesi === 'cam' ? g2.camBelgesi : null;
    veri.giris2KapiFotolari = g2.fotolar;
  }
  guncelle(veri);
});

watch(kuyuUstAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  guncelle({
    kuyuUstKorkulukMesafe: sayi(korkulukMesafeL.value),
    kuyuUstKorkulukYuksekligi: sayi(korkulukYuksekligiL.value),
    kuyuUstSuspansiyonMesafe: sayi(suspansiyonMesafeL.value),
    kuyuUstKabinUstDurma: sayi(kabinUstDurmaL.value),
    kuyuUstSonKat: sayi(sonKatL.value),
    kuyuUstDurmaAlani: kuyuUstDurmaAlaniL.value,
  });
});

// ---- Güvenlik aksamları özet tablosu ----
// Panel altında, seçildikçe dolan tablo: slot sırası bu haritadaki sıradır.
const GUVENLIK_SLOT_ETIKETLERI: Record<string, string> = {
  durak_kapi_kilidi: 'Durak Kapı Kilidi',
  durak_kapi_kilidi_2: 'Durak Kapı Kilidi (2. Giriş)',
  kabin_kapi_kilidi: 'Kabin Kapı Kilidi',
  kabin_kapi_kilidi_2: 'Kabin Kapı Kilidi (2. Giriş)',
  yangin_sizdirmazlik_raporu: 'Yangın/Sızdırmazlık Raporu',
  sarkac_test_raporu: 'Sarkaç Test Raporu',
  kabin_tamponu: 'Kabin Tamponu',
  karsi_agirlik_tamponu: 'Karşı Ağırlık Tamponu',
  fren: 'Kabin Fren',
  karsi_agirlik_freni: 'Karşı Ağırlık Fren',
  hiz_regulatoru: 'Hız Regülatörü',
  kontrol_karti: 'Kontrol Kartı',
  ucm_acop: 'UCM/ACOP',
};

const guvenlikOzetSatirlari = computed(() => {
  const a = asansor.value;
  if (!a) return [];
  const satirlar: { bolum: string; marka: string; tip: string; seriNo: string; belgeId: string | null }[] = [];
  for (const [slot, etiket] of Object.entries(GUVENLIK_SLOT_ETIKETLERI)) {
    const rows = (a.guvenlikAksamlari ?? []).filter((r) => r.slot === slot);
    // Aynı slotta marka+tip aynıysa seri no'lar tek satırda birleştirilir
    // (örn. birden fazla durak kilidi serisi / tampon adedi)
    const gruplar = new Map<string, { marka: string; tip: string; seriler: string[]; belgeId: string | null }>();
    for (const r of rows) {
      const anahtar = `${r.markaSnapshot}|${r.tip}`;
      const grup =
        gruplar.get(anahtar) ??
        { marka: r.markaSnapshot, tip: r.tip, seriler: [], belgeId: r.aksamBelgesiId || null };
      if (r.seriNo) grup.seriler.push(r.seriNo);
      gruplar.set(anahtar, grup);
    }
    for (const g of gruplar.values()) {
      satirlar.push({
        bolum: etiket,
        marka: g.marka || '—',
        tip: g.tip || '—',
        seriNo: g.seriler.join(', ') || '—',
        belgeId: g.belgeId,
      });
    }
  }
  // Motor ayrı alanlarda tutulur — tabloya en sona eklenir
  if (a.motorMarkaSnapshot || a.motorTip || a.motorSeriNo) {
    satirlar.push({
      bolum: a.motorDisliTipi === 'dislili' ? 'Motor (Dişlili)' : 'Motor (Dişlisiz)',
      marka: a.motorMarkaSnapshot || '—',
      tip: a.motorTip || '—',
      seriNo: a.motorSeriNo || '—',
      belgeId: a.motorAksamBelgesiId || null,
    });
  }
  return satirlar;
});

// Özet tablosundaki göz butonu: satırın belgesini tam ekran görüntüler
const { openFile } = useFileViewer();

function ozetBelgeDosyasi(belgeId: string | null) {
  if (!belgeId) return null;
  return katalogBelgeler.value.find((b) => b._id === belgeId)?.dosya ?? null;
}

async function ozetBelgeAc(belgeId: string | null) {
  await dosyaSlotAc(ozetBelgeDosyasi(belgeId));
}

// ---- Kurum Evrakları: dosya/foto listesi — yükleme ve fotoğraf çekme hep
// listenin sonuna ekler; satırlar görüntülenir, SilmeOnayi ile silinir ----
const kurumEvrakAcik = ref(false);
const kurumEvrakYukleniyor = ref(false);
const kurumFotoAcik = ref(false);
const kurumEvrakSilinecek = ref<number | null>(null);
// Resim satırlarının küçük önizlemeleri (dosyaAnahtari → url)
const kurumEvrakOnizlemeler = ref<Record<string, string>>({});

function kurumEvrakOnizlemeleriYukle() {
  for (const slot of asansor.value?.kurumEvraklari ?? []) {
    if (!slot.mimeType?.startsWith('image/') || kurumEvrakOnizlemeler.value[slot.dosyaAnahtari]) continue;
    getDosyaUrl(slot.dosyaAnahtari)
      .then((url) => (kurumEvrakOnizlemeler.value[slot.dosyaAnahtari] = url))
      .catch(() => { /* önizleme alınamazsa satırda dosya ikonu kalır */ });
  }
}

async function kurumEvrakEkle(files: File[]) {
  const a = asansor.value;
  if (!a || !files.length) return;
  kurumEvrakYukleniyor.value = true;
  try {
    const slotlar: BelgeSlot[] = [];
    for (const file of files) slotlar.push(await uploadDosya(file));
    await guncelle({ kurumEvraklari: [...(a.kurumEvraklari ?? []), ...slotlar] });
    kurumEvrakOnizlemeleriYukle();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    kurumEvrakYukleniyor.value = false;
  }
}

// PDF/resim dışındakiler elenir (gizli inputun accept filtresiyle uyumlu)
function kurumEvrakSec(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []).filter(
    (f) => f.type === 'application/pdf' || f.type.startsWith('image/')
  );
  input.value = '';
  kurumEvrakEkle(files);
}

async function kurumEvrakSilOnayla() {
  const a = asansor.value;
  const i = kurumEvrakSilinecek.value;
  kurumEvrakSilinecek.value = null;
  if (!a || i == null) return;
  const liste = [...(a.kurumEvraklari ?? [])];
  liste.splice(i, 1);
  await guncelle({ kurumEvraklari: liste });
}

// Herhangi bir dosya slotunu tam ekran görüntüleyicide açar
async function dosyaSlotAc(dosya: { dosyaAdi: string; dosyaAnahtari: string; mimeType: string } | null) {
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

// ---- Risk durumları ----
// Kuyu dibi riski: kabin en alt noktası − son hareket mesafesi, durma
// alanının SON ölçüsünden (50x70x100 → 100 cm) küçükse kuyu dibi risk
// analizi gerekir; etek sacı ucu için yalnızca kalan 0'ın altına düşerse
// risk gerekir (modal içindeki hesapla aynı).
const kuyuDipRiskVar = computed(() => {
  const a = asansor.value;
  if (!a) return false;
  const kabinAlt = a.kuyuDipKabinEnAltNokta;
  const b = a.kuyuDipBosluk, s = a.kuyuDipTamponStroke;
  const parcalar = a.kuyuDipDurmaAlani?.split('x') ?? [];
  const durmaSonCm = Number(parcalar[parcalar.length - 1]);
  if (kabinAlt == null || b == null || s == null || a.hiz == null || !Number.isFinite(durmaSonCm)) {
    return false;
  }
  const sonHareketMm = b + s + 0.035 * a.hiz * a.hiz * 1000;
  const etek = a.kuyuDipEtekSaciTabanMesafe;
  const etekRiski = etek != null && etek - sonHareketMm < 0;
  const iv = a.kuyuDipIvOlcusu;
  const ivRiski = iv != null && iv - sonHareketMm < 0;
  return (kabinAlt - sonHareketMm) / 10 < durmaSonCm || etekRiski || ivRiski;
});

// Kuyu üstü riski: son hareket (karşı ağırlık tamponu boşluk + stroke +
// 0,035×hız²) sonrası korkuluk mesafesinden min 300 mm, süspansiyon
// mesafesinden min 500 mm kalmalı; kabin üst durma − son hareket − durma
// alanının SON ölçüsü 0'dan küçük olmamalı (modal içindeki hesapla aynı).
const kuyuUstRiskVar = computed(() => {
  const a = asansor.value;
  if (!a || a.kuyuDipKarsiBosluk == null || a.kuyuDipKarsiStroke == null || a.hiz == null) {
    return false;
  }
  const sh = a.kuyuDipKarsiBosluk + a.kuyuDipKarsiStroke + 0.035 * a.hiz * a.hiz * 1000;
  const parcalar = a.kuyuUstDurmaAlani?.split('x') ?? [];
  const durmaSonMm = Number(parcalar[parcalar.length - 1]) * 10;
  const korkulukRiski = a.kuyuUstKorkulukMesafe != null && a.kuyuUstKorkulukMesafe - sh < 300;
  const suspRiski = a.kuyuUstSuspansiyonMesafe != null && a.kuyuUstSuspansiyonMesafe - sh < 500;
  const durmaRiski =
    a.kuyuUstKabinUstDurma != null &&
    Number.isFinite(durmaSonMm) &&
    a.kuyuUstKabinUstDurma - sh - durmaSonMm < 0;
  return korkulukRiski || suspRiski || durmaRiski;
});

// Makine dairesi riski: çalışma alanı < 2100, geçiş alanı < 1800 veya giriş
// kapısı < 2000 mm ise risk analizi gerekir (modal içindeki kontrolle aynı).
const makineDairesiRiskVar = computed(() => {
  const a = asansor.value;
  if (!a || a.makinaKonumu !== 'MR') return false;
  const c = a.makineDairesiCalismaYuksekligi;
  const g = a.makineDairesiGecisYuksekligi;
  const k = a.makineDairesiKapiYuksekligi;
  return (c != null && c < 2100) || (g != null && g < 1800) || (k != null && k < 2000);
});

// Kapı riski: giriş kapısı yüksekliği 2000 mm altındaysa risk analizi gerekir
const kapiRiskVar = computed(() => {
  const a = asansor.value;
  if (!a) return false;
  const dusuk = (y: number | null) => y != null && y < 2000;
  return dusuk(a.giris1KapiYukseklik) || (a.kabinGirisTipi === 'cift' && dusuk(a.giris2KapiYukseklik));
});

// Risk satırlarının alt listeleri açılır/kapanır (varsayılan kapalı)
const acikRiskler = ref<Record<string, boolean>>({});
function riskToggle(key: string) {
  acikRiskler.value[key] = !acikRiskler.value[key];
}

// Risk analizi popup'ları — içerikleri daha sonra doldurulacak
const ustRiskAnaliziAcik = ref(false);
const kapiRiskAnaliziAcik = ref(false);

// Makine dairesi risk analizi: hazır maddeler katalogdan çoktan seçmeli
// seçilir; seçim snapshot'la asansöre kaydedilir.
const makineRiskAnaliziAcik = ref(false);
const makineRiskSecimL = ref<RiskMaddesiSecim[]>([]);

function makineRiskAnaliziAc() {
  blurActive();
  const a = asansor.value;
  if (!a) return;
  makineRiskSecimL.value = (a.makineDairesiRiskMaddeleri ?? []).map((s) => ({
    maddeId: s.maddeId,
    metin: s.metin,
    resim: s.resim ?? null,
    fotolar: [...(s.fotolar ?? [])],
  }));
  makineRiskAnaliziAcik.value = true;
}

// ---- Kuyu üstü risk analizi (aynı madde sistemi, grup: kuyu-ustu) ----
const ustRiskSecimL = ref<RiskMaddesiSecim[]>([]);

function ustRiskAnaliziAc() {
  blurActive();
  const a = asansor.value;
  if (!a) return;
  ustRiskSecimL.value = (a.kuyuUstuRiskMaddeleri ?? []).map((s) => ({
    maddeId: s.maddeId,
    metin: s.metin,
    resim: s.resim ?? null,
    fotolar: [...(s.fotolar ?? [])],
  }));
  ustRiskAnaliziAcik.value = true;
}

// ---- Kuyu dibi risk analizi (aynı madde sistemi, grup: kuyu-dibi) ----
const dipRiskAnaliziAcik = ref(false);
const dipRiskSecimL = ref<RiskMaddesiSecim[]>([]);

function dipRiskAnaliziAc() {
  blurActive();
  const a = asansor.value;
  if (!a) return;
  dipRiskSecimL.value = (a.kuyuDibiRiskMaddeleri ?? []).map((s) => ({
    maddeId: s.maddeId,
    metin: s.metin,
    resim: s.resim ?? null,
    fotolar: [...(s.fotolar ?? [])],
  }));
  dipRiskAnaliziAcik.value = true;
}

watch(dipRiskAnaliziAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  guncelle({ kuyuDibiRiskMaddeleri: dipRiskSecimL.value });
});

watch(ustRiskAnaliziAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  guncelle({ kuyuUstuRiskMaddeleri: ustRiskSecimL.value });
});

watch(makineRiskAnaliziAcik, (acik, onceki) => {
  if (acik || !onceki) return;
  if (iptalEdildi.value) {
    iptalEdildi.value = false;
    return;
  }
  guncelle({ makineDairesiRiskMaddeleri: makineRiskSecimL.value });
});

// ---- Özet yardımcıları ----
function mm(v: number | null | undefined): string {
  return v != null ? `${v} mm` : '—';
}

// Ön bilgi kartındaki etiket/değer çiftleri
const onBilgi = computed(() => {
  const a = asansor.value;
  if (!a) return [];
  return [
    ['Sınıf', SINIF_ETIKETLERI[a.sinif ?? ''] ?? '—'],
    ['Hız', a.hiz != null ? `${a.hiz.toFixed(2)} m/s` : '—'],
    ['Makine Konumu', MAKINA_KONUMU_ETIKETLERI[a.makinaKonumu ?? ''] ?? '—'],
    ['Askı Oranı', a.askiTipi ?? '—'],
    ['Kapasite', a.beyanYuku != null ? `${a.beyanYuku} kg` : '—'],
    ['Kişi Sayısı', a.kisiSayisi != null ? String(a.kisiSayisi) : '—'],
    ['Ağırlık Konumu', AGIRLIK_KONUMU_ETIKETLERI[a.karsiAgirlikKonumu ?? ''] ?? '—'],
    ['Giriş Tipi', GIRIS_TIPI_ETIKETLERI[a.kabinGirisTipi ?? ''] ?? '—'],
    [
      'Kat/Durak',
      a.katSayisi != null || a.durakSayisi != null
        ? `${a.katSayisi ?? '—'} kat / ${a.durakSayisi ?? '—'} durak`
        : '—',
    ],
  ] as [string, string][];
});

// Her bölümün özet satırları — başlık altında "Etiket: değer" metinleri.
// Hiç veri yoksa boş dizi döner ve kartta "Henüz bilgi girilmedi." yazar.
const bolumOzetleri = computed<Record<string, [string, string][]>>(() => {
  const a = asansor.value;
  if (!a) return {};
  const o: Record<string, [string, string][]> = {};

  o['agirlik-hesabi'] =
    a.karsiAgirlik != null
      ? [
          ['Karşı Ağırlık', `${a.karsiAgirlik} kg`],
          ['Kapasite (Q)', `${a.beyanYuku ?? 0} kg`],
          ['Kabin Ağırlığı (P)', `${a.kabinAgirligi ?? '—'} kg`],
          ['P + Q', `${(a.kabinAgirligi ?? 0) + (a.beyanYuku ?? 0)} kg`],
        ]
      : [];

  o['kabin-olculeri'] =
    a.kabinGenislik != null || a.kabinDerinlik != null || a.kabinIciAydinlatma != null
      ? [
          ['Genişlik', mm(a.kabinGenislik)],
          ['Derinlik', mm(a.kabinDerinlik)],
          ['Kabin Aydınlatma', a.kabinIciAydinlatma != null ? `${a.kabinIciAydinlatma} lüx` : '—'],
          ['Giriş Tipi', GIRIS_TIPI_ETIKETLERI[a.kabinGirisTipi ?? ''] ?? '—'],
        ]
      : [];

  const birBir = a.askiTipi === '1:1';
  o['halat-kasnaklar'] =
    a.tahrikKasnakCapi != null || a.halatSekli != null || a.halatAdet != null
      ? [
          ['Tahrik Kasnağı', mm(a.tahrikKasnakCapi)],
          ...(birBir
            ? ([['Saptırma Kasnağı', mm(a.halatSapturmaKasnagiCapi)]] as [string, string][])
            : ([
                [
                  'Palangalar',
                  `${a.halatPalanga1Capi ?? '—'} / ${a.halatPalanga2Capi ?? '—'} / ${a.halatPalanga3Capi ?? '—'} mm`,
                ],
              ] as [string, string][])),
          ...(birBir && a.askiHalatArasiMesafe != null
            ? ([['Halat Mesafesi', mm(a.askiHalatArasiMesafe)]] as [string, string][])
            : []),
          ['Halat Şekli', HALAT_SEKLI_ETIKETLERI[a.halatSekli ?? ''] ?? '—'],
          ['Halat Tipi', a.halatTipi || '—'],
          ['Halat Adedi', a.halatAdet != null ? String(a.halatAdet) : '—'],
          ...(!birBir
            ? ([
                [
                  'Palanga Konumu',
                  a.kabinPalangaKonumu === 'kabin-ustu' ? 'Kabin Üstü' : a.kabinPalangaKonumu === 'kabin-alti' ? 'Kabin Altı' : '—',
                ],
              ] as [string, string][])
            : []),
          ['Sarım Açısı', a.sarimAcisi != null ? `${a.sarimAcisi}°` : '—'],
        ]
      : [];

  o['ray-olculeri'] =
    a.karsiAgirlikRayArasi != null || a.kabinRayArasi != null || a.rayRR != null || a.kuyuGenislik != null
      ? [
          ['Kabin Ray', rayTipiEtiketi(a.kabinRayTipi) || '—'],
          ['Karşı Ağ. Ray', rayTipiEtiketi(a.karsiAgirlikRayTipi) || '—'],
          ['Karşı Ağ. Ray Arası', mm(a.karsiAgirlikRayArasi)],
          ['Kabin Ray Arası', mm(a.kabinRayArasi)],
          ['RR', mm(a.rayRR)],
          ['RK', mm(a.rayRK)],
          ['Kuyu', `${a.kuyuGenislik ?? '—'} × ${a.kuyuDerinlik ?? '—'} mm`],
        ]
      : [];

  o['duraklar'] = a.katYukseklikleri?.length
    ? [
        ['Duraklar', a.katYukseklikleri.map((k) => k.kat).join(', ')],
        ['Durak Arası', `${a.katYukseklikleri.map((k) => k.yukseklik ?? '—').join(' / ')} mm`],
      ]
    : [];

  o['kuyu-dip-alani'] =
    a.kuyuDipYukseklik != null || a.kuyuDipBosluk != null || a.kuyuDipDurmaAlani != null
      ? [
          ['Kuyu Dip Yüksekliği', mm(a.kuyuDipYukseklik)],
          ['Kabin En Alt Noktası', mm(a.kuyuDipKabinEnAltNokta)],
          ['Etek Sacı Taban Mesafesi', mm(a.kuyuDipEtekSaciTabanMesafe)],
          ['Gergi Kasnağı Mesafe', mm(a.kuyuDipIvOlcusu)],
          ['Boşluk', mm(a.kuyuDipBosluk)],
          ['Stroke', mm(a.kuyuDipTamponStroke)],
          ['Karşı Ağ. Boşluk', mm(a.kuyuDipKarsiBosluk)],
          ['Karşı Ağ. Stroke', mm(a.kuyuDipKarsiStroke)],
          ['Durma Alanı', a.kuyuDipDurmaAlani ?? '—'],
        ]
      : [];

  o['kuyu-ust-alani'] =
    a.kuyuUstKorkulukMesafe != null || a.kuyuUstSuspansiyonMesafe != null || a.kuyuUstKabinUstDurma != null
      ? [
          ['Korkuluk Mesafe', mm(a.kuyuUstKorkulukMesafe)],
          ['Korkuluk', mm(a.kuyuUstKorkulukYuksekligi)],
          ['Süsp. Mesafe', mm(a.kuyuUstSuspansiyonMesafe)],
          ['Kabin Üst Durma', mm(a.kuyuUstKabinUstDurma)],
          ['Son Kat', mm(a.kuyuUstSonKat)],
          ['Durma Alanı', a.kuyuUstDurmaAlani ?? '—'],
        ]
      : [];

  const kapiTipi = (yon: string | null) =>
    yon === 'merkezi' ? 'Merkezi' : yon === 'sag' ? 'Teleskopik Sağ' : yon === 'sol' ? 'Teleskopik Sol' : '—';
  o['kapi-olculeri'] =
    a.giris1KapiGenislik != null || a.giris1KapiYukseklik != null
      ? [
          ['Giriş 1 Kapı', `${a.giris1KapiGenislik ?? '—'} × ${a.giris1KapiYukseklik ?? '—'} mm`],
          ['Panel Sayısı', a.giris1PanelSayisi != null ? String(a.giris1PanelSayisi) : '—'],
          ['Kapı Tipi', kapiTipi(a.giris1KapiYonu)],
          ...(a.kabinGirisTipi === 'cift'
            ? ([['Giriş 2 Kapı', `${a.giris2KapiGenislik ?? '—'} × ${a.giris2KapiYukseklik ?? '—'} mm`]] as [
                string,
                string,
              ][])
            : []),
        ]
      : [];

  o['makine-dairesi'] =
    a.makineDairesiCalismaYuksekligi != null ||
    a.makineDairesiGecisYuksekligi != null ||
    a.makineDairesiKapiYuksekligi != null
      ? [
          ['Çalışma Alanı', mm(a.makineDairesiCalismaYuksekligi)],
          ['Geçiş Alanı', mm(a.makineDairesiGecisYuksekligi)],
          ['Giriş Kapısı', mm(a.makineDairesiKapiYuksekligi)],
        ]
      : [];

  return o;
});
</script>

<template>
  <ion-page>
    <!-- Header: geri + başlık + buton grubu, scroll boyunca sabit -->
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-900">
        <header class="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button type="button" @click="geri"
            class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-base font-bold tracking-wide text-ink">
              {{ asansor ? `Seri: ${asansor.seriNo || asansor.yapiRuhsatNo || '—'}` : 'Asansör' }}
            </h1>
            <p v-if="firmaAdi" class="truncate text-[11px] text-ink-muted">{{ firmaAdi }}</p>
          </div>
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg">
        <div v-if="hata"
          class="mx-4 mt-4 flex items-center gap-2 bg-red-950/60 px-3 py-2 ring-1 ring-red-500/20">
          <span class="min-w-0 flex-1 text-sm text-red-300">{{ hata }}</span>
          <button type="button" @click="yukle"
            class="shrink-0 bg-surface-800 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-white/10">
            Tekrar Dene
          </button>
        </div>

        <p v-if="yukleniyor && !asansor" class="px-4 py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>

        <div v-else-if="asansor" class="space-y-2 px-4 pb-6 pt-4">
          <!-- Ön bilgi kartı — sayfanın en üstünde -->
          <section class="bg-surface-800 p-3 ring-1 ring-white/5">
            <div class="mb-2 flex items-center justify-between gap-2">
              <h2 class="text-xs font-bold uppercase tracking-wide text-ink">Asansör Bilgileri</h2>
              <div class="flex gap-1.5">
                <button type="button" @click="git(`/asansor/${id}/on-bilgi`)"
                  class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                  Düzenle
                </button>
                <button type="button" @click="git(`/asansor/${id}/duzenle`)"
                  class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted ring-1 ring-white/10 active:bg-[#1a2a20]">
                  Tam Form
                </button>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-x-3 gap-y-1.5">
              <div v-for="[etiket, deger] in onBilgi" :key="etiket">
                <span class="block text-[10px] text-ink-muted">{{ etiket }}</span>
                <span class="block text-xs font-medium text-ink">{{ deger }}</span>
              </div>
            </div>
          </section>

          <!-- Adres bilgileri paneli — girilenler metin olarak, yapı ruhsatı
          görüntülenebilir -->
          <section class="bg-surface-800 p-3 ring-1 ring-white/5">
            <div class="mb-2 flex items-center justify-between gap-2">
              <h2 class="text-xs font-bold uppercase tracking-wide text-ink">Adres Bilgileri</h2>
              <button type="button" @click="adresAc"
                class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                Adres Bilgisi
              </button>
            </div>
            <p v-if="!adresYeri && !adresDetayi && !asansor.adres && !asansor.yapiRuhsatiDosya"
              class="text-xs text-ink-muted">
              Henüz adres girilmedi.
            </p>
            <template v-else>
              <div>
                <p v-if="adresYeri" class="text-xs font-normal text-ink-muted">{{ adresYeri }}</p>
                <p v-if="adresDetayi" class="text-[10px] text-ink-muted/80">{{ adresDetayi }}</p>
              </div>
              <div v-if="asansor.yapiRuhsatiDosya"
                class="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                <div class="min-w-0">
                  <span class="block text-[10px] text-ink-muted">Yapı Ruhsatı</span>
                  <span class="block truncate text-xs font-medium text-ink">{{ asansor.yapiRuhsatiDosya.dosyaAdi }}</span>
                </div>
                <button type="button" @click="dosyaSlotAc(asansor.yapiRuhsatiDosya)"
                  aria-label="Yapı ruhsatını görüntüle"
                  class="grid h-6 w-7 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
              <p v-else class="mt-2 border-t border-white/5 pt-2 text-xs font-semibold text-red-400">
                Yapı ruhsatı eklenmedi
              </p>
            </template>
          </section>

          <!-- Buton grubu: sarmalı (wrap) kutucuklar — tıklayınca ilgili şema
          modalı açılır, kapanınca otomatik kaydedilir -->
          <div class="grid grid-cols-4 gap-1.5">
            <button v-for="bolum in bolumler" :key="bolum.key" type="button" @click="bolumAc(bolum)"
              class="flex flex-col items-center justify-start gap-1 bg-surface-800 px-1 py-2 ring-1 ring-white/10 active:bg-[#1a2a20]">
              <span class="grid h-8 place-items-center text-xl leading-none" aria-hidden="true">
                <!-- Kabin Ölçüleri: kabin biçiminde özel mini ikon (çerçeve +
                çift kapı + üstte yön okları) -->
                <svg v-if="bolum.key === 'kabin-olculeri'" width="26" height="26" viewBox="0 0 28 28"
                  class="text-ink">
                  <rect x="3.5" y="4.5" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" />
                  <rect x="7" y="8" width="6" height="17.5" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <rect x="15" y="8" width="6" height="17.5" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path d="M 9 3 L 11.5 0.5 L 14 3 Z" fill="currentColor" />
                  <path d="M 15 0.5 L 17.5 3 L 20 0.5 Z" fill="currentColor" />
                </svg>
                <!-- Kuyu Dip Alanı: aşağı oklu kırmızı BOTTOM rozeti -->
                <svg v-else-if="bolum.key === 'kuyu-dip-alani'" width="26" height="26" viewBox="0 0 28 28">
                  <rect x="1.5" y="1.5" width="25" height="25" fill="#e03131" stroke="#000" stroke-width="1.5" />
                  <text x="14" y="11" text-anchor="middle" font-size="6" font-weight="bold" fill="#fff">BOTTOM</text>
                  <line x1="14" y1="14" x2="14" y2="20" stroke="#fff" stroke-width="2.6" />
                  <path d="M 9.5 19 L 18.5 19 L 14 25.5 Z" fill="#fff" />
                </svg>
                <template v-else>{{ bolum.icon }}</template>
              </span>
              <span class="text-center text-[10px] leading-tight text-ink-muted">{{ bolum.label }}</span>
            </button>
          </div>

          <!-- Güvenlik Aksamlar paneli: ikon + yazı yan yana menüler, tam
          genişlik; içerikleri daha sonra doldurulacak -->
          <section class="bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="mb-2 text-xs font-bold uppercase tracking-wide text-ink">Güvenlik Aksamlar</h2>
            <div class="grid grid-cols-2 gap-1.5">
              <button v-for="bolum in altBolumler" :key="bolum.key" type="button" @click="altBolumAc(bolum)"
                class="flex w-full items-center gap-2 bg-surface-900 px-2.5 py-2.5 ring-1 ring-white/10 active:bg-[#1a2a20]">
                <span class="text-base leading-none" aria-hidden="true">{{ bolum.icon }}</span>
                <span class="min-w-0 truncate text-left text-[11px] font-medium text-ink-muted">{{ bolum.label }}</span>
              </button>
            </div>

            <!-- Seçilen güvenlik aksamları tablosu — bölümler dolduruldukça
            satırlar burada görünür -->
            <div v-if="guvenlikOzetSatirlari.length" class="mt-2 overflow-x-auto border-t border-white/5 pt-2">
              <table class="w-full text-left text-[11px]">
                <thead>
                  <tr class="text-[10px] uppercase tracking-wide text-ink-muted">
                    <th class="py-1 pr-2 font-medium">Aksam</th>
                    <th class="py-1 pr-2 font-medium">Marka</th>
                    <th class="py-1 pr-2 font-medium">Tip</th>
                    <th class="py-1 pr-2 font-medium">Seri No</th>
                    <th class="py-1 font-medium"><span class="sr-only">Belge</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="satir in guvenlikOzetSatirlari" :key="satir.bolum + satir.marka + satir.tip"
                    class="border-t border-white/5">
                    <td class="py-1 pr-2 text-ink-muted">{{ satir.bolum }}</td>
                    <td class="py-1 pr-2 font-medium text-ink">{{ satir.marka }}</td>
                    <td class="py-1 pr-2 text-ink">{{ satir.tip }}</td>
                    <td class="py-1 pr-2 text-ink">{{ satir.seriNo }}</td>
                    <td class="py-0.5 text-right">
                      <!-- Belgeyi görüntüle (dosyası olan satırlarda) -->
                      <button v-if="ozetBelgeDosyasi(satir.belgeId)" type="button"
                        @click="ozetBelgeAc(satir.belgeId)" aria-label="Belgeyi görüntüle"
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
          </section>

          <!-- SMM Bilgileri: havuzdan firma seçilir, bilgileri olduğu gibi
          kopyalanır ve burada gösterilir -->
          <section class="space-y-2 bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">SMM Bilgileri</h2>

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

            <template v-if="asansor.smmFirmaId || asansor.smmKisaAd">
              <div class="flex items-start justify-between gap-2 border-t border-white/5 pt-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span v-if="asansor.smmYil"
                      class="shrink-0 bg-[#1c2a21] px-2 py-0.5 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                      {{ asansor.smmYil }}
                    </span>
                    <span class="truncate text-xs font-semibold text-ink">{{ asansor.smmKisaAd }}</span>
                  </div>
                  <p v-if="asansor.smmUnvan" class="mt-1 text-[11px] text-ink-muted">{{ asansor.smmUnvan }}</p>
                  <p v-if="asansor.smmAdres" class="mt-0.5 text-[11px] text-ink-muted/80">{{ asansor.smmAdres }}</p>
                </div>
                <button type="button" @click="smmTemizle" aria-label="SMM firması seçimini kaldır"
                  class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                  ✕
                </button>
              </div>

              <!-- Büro tescil belgesi (varsa görüntülenebilir) -->
              <div v-if="asansor.smmBuroTescilBelgesi"
                class="flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                <div class="min-w-0">
                  <span class="block text-[10px] text-ink-muted">Büro Tescil Belgesi</span>
                  <span class="block truncate text-xs font-medium text-ink">{{ asansor.smmBuroTescilBelgesi.dosyaAdi }}</span>
                </div>
                <button type="button" @click="dosyaSlotAc(asansor.smmBuroTescilBelgesi)"
                  aria-label="Büro tescil belgesini görüntüle"
                  class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>

              <!-- Mühendis bilgileri (yalnızca dolu bloklar) -->
              <div v-for="m in smmMuhendisler" :key="m.baslik"
                class="border-t border-white/5 pt-2">
                <h3 class="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{{ m.baslik }}</h3>
                <p class="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                  <span v-if="m.adSoyad">Ad Soyad: <strong class="font-semibold text-ink">{{ m.adSoyad }}</strong></span>
                  <span v-if="m.sicil">Oda Sicil No: <strong class="font-semibold text-ink">{{ m.sicil }}</strong></span>
                  <span v-if="m.telefon">Telefon: <strong class="font-semibold text-ink">{{ m.telefon }}</strong></span>
                </p>
                <div class="mt-1 flex flex-wrap gap-1.5">
                  <template v-for="b in m.belgeler" :key="b.etiket">
                    <button v-if="b.dosya" type="button" @click="dosyaSlotAc(b.dosya)"
                      class="flex items-center gap-1.5 bg-surface-900 px-2 py-1 text-[11px] font-medium text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                      <svg class="h-3 w-3 text-[#6fcf97]" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {{ b.etiket }}
                    </button>
                  </template>
                </div>
              </div>
            </template>
            <p v-else class="text-xs text-ink-muted">Henüz SMM firması seçilmedi.</p>
          </section>

          <!-- Risk durumları paneli: şema verilerinden türeyen uyarılar -->
          <section class="bg-surface-800 p-3 ring-1 ring-white/5">
            <h2 class="mb-2 text-xs font-bold uppercase tracking-wide text-ink">Risk Durumları</h2>
            <!-- Maddeler seçildiyse (risk analizi yapıldıysa) satır açık yeşile döner -->
            <div v-if="kuyuDipRiskVar" @click="riskToggle('dip')"
              class="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 ring-1"
              :class="asansor.kuyuDibiRiskMaddeleri?.length
                ? 'bg-[#1d3a28] ring-[#2b5c3d]'
                : 'bg-red-950/60 ring-red-500/20'">
              <span class="min-w-0 flex-1 text-xs font-semibold"
                :class="asansor.kuyuDibiRiskMaddeleri?.length ? 'text-[#6fcf97]' : 'text-red-300'">
                Kuyu dibi risk analizi gerekli
              </span>
              <svg class="h-3.5 w-3.5 shrink-0 transition-transform"
                :class="[
                  acikRiskler['dip'] ? 'rotate-180' : '',
                  asansor.kuyuDibiRiskMaddeleri?.length ? 'text-[#6fcf97]' : 'text-red-300',
                ]" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <button type="button" @click.stop="dipRiskAnaliziAc"
                class="shrink-0 bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                Risk Analizi
              </button>
            </div>

            <!-- Kuyu dibi seçilen risk maddeleri (satırdan açılır/kapanır) -->
            <SecilenRiskMaddeleri
              v-if="acikRiskler['dip'] && asansor.kuyuDibiRiskMaddeleri?.length"
              class="mt-1.5" :maddeler="asansor.kuyuDibiRiskMaddeleri"
              @guncelle="guncelle({ kuyuDibiRiskMaddeleri: $event })" />
            <!-- Maddeler seçildiyse (risk analizi yapıldıysa) satır açık yeşile döner -->
            <div v-if="kuyuUstRiskVar" @click="riskToggle('ust')"
              class="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 ring-1"
              :class="[
                kuyuDipRiskVar ? 'mt-1.5' : '',
                asansor.kuyuUstuRiskMaddeleri?.length
                  ? 'bg-[#1d3a28] ring-[#2b5c3d]'
                  : 'bg-red-950/60 ring-red-500/20',
              ]">
              <span class="min-w-0 flex-1 text-xs font-semibold"
                :class="asansor.kuyuUstuRiskMaddeleri?.length ? 'text-[#6fcf97]' : 'text-red-300'">
                Kuyu üstü risk analizi gerekli
              </span>
              <svg class="h-3.5 w-3.5 shrink-0 transition-transform"
                :class="[
                  acikRiskler['ust'] ? 'rotate-180' : '',
                  asansor.kuyuUstuRiskMaddeleri?.length ? 'text-[#6fcf97]' : 'text-red-300',
                ]" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <button type="button" @click.stop="ustRiskAnaliziAc"
                class="shrink-0 bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                Risk Analizi
              </button>
            </div>

            <!-- Kuyu üstü seçilen risk maddeleri (satırdan açılır/kapanır) -->
            <SecilenRiskMaddeleri
              v-if="acikRiskler['ust'] && asansor.kuyuUstuRiskMaddeleri?.length"
              class="mt-1.5" :maddeler="asansor.kuyuUstuRiskMaddeleri"
              @guncelle="guncelle({ kuyuUstuRiskMaddeleri: $event })" />
            <!-- Maddeler seçildiyse (risk analizi yapıldıysa) satır açık yeşile döner -->
            <div v-if="makineDairesiRiskVar" @click="riskToggle('makine')"
              class="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 ring-1"
              :class="[
                kuyuDipRiskVar || kuyuUstRiskVar ? 'mt-1.5' : '',
                asansor.makineDairesiRiskMaddeleri?.length
                  ? 'bg-[#1d3a28] ring-[#2b5c3d]'
                  : 'bg-red-950/60 ring-red-500/20',
              ]">
              <span class="min-w-0 flex-1 text-xs font-semibold"
                :class="asansor.makineDairesiRiskMaddeleri?.length ? 'text-[#6fcf97]' : 'text-red-300'">
                Makine dairesi risk analizi gerekli
              </span>
              <svg class="h-3.5 w-3.5 shrink-0 transition-transform"
                :class="[
                  acikRiskler['makine'] ? 'rotate-180' : '',
                  asansor.makineDairesiRiskMaddeleri?.length ? 'text-[#6fcf97]' : 'text-red-300',
                ]" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <button type="button" @click.stop="makineRiskAnaliziAc"
                class="shrink-0 bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                Risk Analizi
              </button>
            </div>

            <!-- Makine dairesi seçilen risk maddeleri (satırdan açılır/kapanır) -->
            <SecilenRiskMaddeleri
              v-if="acikRiskler['makine'] && asansor.makineDairesiRiskMaddeleri?.length"
              class="mt-1.5" :maddeler="asansor.makineDairesiRiskMaddeleri"
              @guncelle="guncelle({ makineDairesiRiskMaddeleri: $event })" />
            <div v-if="kapiRiskVar" @click="riskToggle('kapi')"
              class="flex cursor-pointer items-center justify-between gap-2 bg-red-950/60 px-3 py-2 ring-1 ring-red-500/20"
              :class="kuyuDipRiskVar || kuyuUstRiskVar || makineDairesiRiskVar ? 'mt-1.5' : ''">
              <span class="min-w-0 flex-1 text-xs font-semibold text-red-300">
                Kapı yüksekliği risk analizi gerekli
              </span>
              <svg class="h-3.5 w-3.5 shrink-0 text-red-300 transition-transform"
                :class="acikRiskler['kapi'] ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <button type="button" @click.stop="kapiRiskAnaliziAcik = true"
                class="shrink-0 bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
                Risk Analizi
              </button>
            </div>
            <p v-if="!kuyuDipRiskVar && !kuyuUstRiskVar && !makineDairesiRiskVar && !kapiRiskVar
              && !asansor.makineDairesiRiskMaddeleri?.length && !asansor.kuyuUstuRiskMaddeleri?.length
              && !asansor.kuyuDibiRiskMaddeleri?.length"
              class="text-xs text-ink-muted">
              Risk durumu tespit edilmedi.
            </p>
          </section>

          <!-- Bölüm özetleri: başlık altında metin olarak; karta dokununca da
          ilgili şema modalı açılır -->
          <button v-for="bolum in bolumler" :key="bolum.key" type="button" @click="bolumAc(bolum)"
            class="block w-full bg-surface-800 p-3 text-left ring-1 ring-white/5 active:bg-[#17211b]">
            <h3 class="text-xs font-bold text-ink">{{ bolum.label }}</h3>
            <p v-if="!bolumOzetleri[bolum.key]?.length" class="mt-0.5 text-xs text-ink-muted">
              Henüz bilgi girilmedi.
            </p>
            <p v-else class="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
              <span v-for="[etiket, deger] in bolumOzetleri[bolum.key]" :key="etiket">
                {{ etiket }}: <strong class="font-semibold text-ink">{{ deger }}</strong>
              </span>
            </p>
          </button>
        </div>
      </div>
    </ion-content>

    <!-- İkinci sıra menülerin placeholder popup'ı — içerik daha sonra -->
    <SemaModal v-model:open="altBolumAcik" :title="aktifAltBolum?.label ?? ''">
      <p class="py-4 text-center text-xs text-ink-muted">Bu bölümün içeriği daha sonra eklenecek.</p>
    </SemaModal>

    <!-- SMM firması seçim popup'ı — satıra dokununca bilgiler kopyalanır -->
    <SmmFirmaSecModal v-model:acik="smmSecAcik" :firmalar="smmFirmalar"
      :secili-id="asansor?.smmFirmaId" @sec="smmFirmaSec" />

    <!-- Kuyu dibi risk analizi — hazır maddelerden çoktan seçmeli;
    kapanınca seçim asansöre kaydedilir -->
    <RiskAnaliziModal v-model:open="dipRiskAnaliziAcik" @iptal="iptalEdildi = true"
      v-model:secilen="dipRiskSecimL"
      baslik="Kuyu Dibi Risk Analizi" grup="kuyu-dibi" />

    <!-- Kuyu üstü risk analizi — hazır maddelerden çoktan seçmeli;
    kapanınca seçim asansöre kaydedilir -->
    <RiskAnaliziModal v-model:open="ustRiskAnaliziAcik" @iptal="iptalEdildi = true"
      v-model:secilen="ustRiskSecimL"
      baslik="Kuyu Üstü Risk Analizi" grup="kuyu-ustu" />

    <!-- Makine dairesi risk analizi — hazır maddelerden çoktan seçmeli;
    kapanınca seçim asansöre kaydedilir -->
    <RiskAnaliziModal v-model:open="makineRiskAnaliziAcik" @iptal="iptalEdildi = true"
      v-model:secilen="makineRiskSecimL"
      baslik="Makine Dairesi Risk Analizi" grup="makine-dairesi" />

    <!-- Kapı yüksekliği risk analizi popup'ı — içeriği daha sonra doldurulacak -->
    <SemaModal v-model:open="kapiRiskAnaliziAcik" title="Kapı Yüksekliği Risk Analizi">
      <p class="py-4 text-center text-xs text-ink-muted">Bu bölümün içeriği daha sonra eklenecek.</p>
    </SemaModal>

    <!-- Makine Dairesi — çalışma/geçiş/kapı yükseklikleri (yalnız MR);
    kapanınca kaydedilir -->
    <MakineDairesiModal v-model:open="makineAcik" @iptal="iptalEdildi = true"
      v-model:calisma-yuksekligi="makineCalismaL" v-model:gecis-yuksekligi="makineGecisL"
      v-model:kapi-yuksekligi="makineKapiL" />

    <!-- Tamponlar — kabin + karşı ağırlık, adete göre satırlar;
    kapanınca güvenlik aksamlarına kaydedilir -->
    <TamponlarModal v-model:open="tamponAcik" @iptal="iptalEdildi = true"
      v-model:kabin="tamponKabin" v-model:karsi-agirlik="tamponKarsi"
      :tampon-belgeleri="tamponBelgeleri"
      :kabin-agirligi="asansor?.kabinAgirligi ?? null" :beyan-yuku="asansor?.beyanYuku ?? null" />

    <!-- Fren — kabin freni + karşı ağırlık freni (var/yok);
    kapanınca güvenlik aksamlarına kaydedilir -->
    <FrenModal v-model:open="frenAcik" @iptal="iptalEdildi = true"
      v-model:kabin="frenKabin" v-model:karsi-agirlik="frenKarsi"
      :fren-belgeleri="frenBelgeleri"
      :kabin-agirligi="asansor?.kabinAgirligi ?? null" :beyan-yuku="asansor?.beyanYuku ?? null" />

    <!-- Hız Regülatörü — marka/tip/seri + devreye girme hızı + fotoğraflar;
    kapanınca güvenlik aksamlarına kaydedilir -->
    <AksamModal v-model:open="hizRegAcik" @iptal="iptalEdildi = true"
      v-model:bolum="hizRegBolum" v-model:devre-hizi="devreHiziL"
      baslik="Hız Regülatörü" :belgeler="hizRegulatoruBelgeleri" devre-hizi-goster />

    <!-- Kontrol Kartı — marka/tip/seri + fotoğraflar;
    kapanınca güvenlik aksamlarına kaydedilir -->
    <AksamModal v-model:open="kontrolKartiAcik" @iptal="iptalEdildi = true"
      v-model:bolum="kontrolKartiBolum"
      baslik="Kontrol Kartı" :belgeler="kontrolKartiBelgeleri" />

    <!-- Motor — dişlisiz/dişlili; marka/tip/seri + güç/rpm (+ ratio) +
    fotoğraflar; kapanınca motor alanlarına kaydedilir -->
    <MotorModal v-model:open="motorAcik" @iptal="iptalEdildi = true"
      v-model:motor="motorBilgi"
      :dislisiz-belgeleri="motorDislisizBelgeleri" :dislili-belgeleri="motorDisliliBelgeleri" />

    <!-- UCM/ACOP — çözüm türü seçimi; Kart + Hız Reg. + Fren'de aksam formu,
    diğerinde kart/regülatör/fren bilgileri; kapanınca kaydedilir -->
    <UcmAcopModal v-model:open="ucmAcik" @iptal="iptalEdildi = true"
      v-model:tur="ucmTur" v-model:bolum="ucmBolum"
      :belgeler="ucmAcopBelgeleri" :kart-bilgi="ucmKartBilgi"
      :regulator-bilgi="ucmRegulatorBilgi" :fren-bilgi="ucmFrenBilgi" />

    <!-- Kapı Kilitleri — giriş başına durak + kabin kapı kilidi;
    kapanınca güvenlik aksamlarına kaydedilir -->
    <KapiKilitleriModal v-model:open="kapiAcik" @iptal="iptalEdildi = true"
      v-model:girisler="kapiGirisler"
      @belge-eklendi="katalogBelgeler.push($event)"
      :durak-belgeleri="durakKilitBelgeleri" :kabin-belgeleri="kabinKilitBelgeleri"
      :yangin-belgeleri="yanginBelgeleri" :sarkac-belgeleri="sarkacBelgeleri" />

    <!-- Şema modalları — kapanınca ilgili bölüm otomatik kaydedilir -->
    <AgirlikHesabiModal v-model:open="agirlikAcik" @iptal="iptalEdildi = true"
      v-model:karkas-agirligi="karkasAgirligiL"
      v-model:bloklar="bloklarL" :beyan-yuku="asansor?.beyanYuku ?? null" />

    <KabinOlculeriModal v-model:open="kabinAcik" @iptal="iptalEdildi = true"
      v-model:kabin-genislik="kabinGenislikL"
      v-model:kabin-derinlik="kabinDerinlikL" v-model:kabin-ici-aydinlatma="kabinIciAydinlatmaL"
      v-model:giris-tipi="kabinGirisTipiL" v-model:panel-malzemesi="kabinPanelMalzemesiL"
      v-model:cam-belgesi="kabinCamBelgesiL" v-model:fotolar="kabinFotolariL" />

    <HalatKasnaklarModal v-model:open="halatAcik" @iptal="iptalEdildi = true"
      v-model:tahrik-kasnagi-capi="tahrikKasnagiL"
      v-model:sapturma-kasnagi-capi="sapturmaKasnagiL" v-model:palanga1-capi="palanga1L"
      v-model:palanga2-capi="palanga2L" v-model:palanga3-capi="palanga3L"
      v-model:halat-sekli="halatSekliL" v-model:halat-adedi="halatAdediL"
      v-model:halat-mesafesi="halatMesafesiL" v-model:halat-tipi="halatTipiL"
      v-model:dikey-mesafe="dikeyMesafeL" v-model:yatay-mesafe="yatayMesafeL"
      v-model:sarim-acisi="sarimAcisiL" v-model:palanga-konumu="palangaKonumuL"
      :aski-tipi="asansor?.askiTipi ?? null" :halat-tipi-secenekleri="halatTipiSecenekleri" />

    <RayOlculeriModal v-model:open="rayAcik" @iptal="iptalEdildi = true"
      v-model:karsi-agirlik-ray-arasi="karsiAgirlikRayArasiL"
      v-model:kabin-ray-arasi="kabinRayArasiL" v-model:ray-r-r="rayRRL" v-model:ray-r-k="rayRKL"
      v-model:kuyu-genislik="kuyuGenislikL" v-model:kuyu-derinlik="kuyuDerinlikL"
      v-model:kabin-ray-tipi="kabinRayTipiL" v-model:karsi-agirlik-ray-tipi="karsiAgirlikRayTipiL"
      :agirlik-konumu="asansor?.karsiAgirlikKonumu || null" />

    <KuyuDipAlaniModal v-model:open="kuyuDipAcik" @iptal="iptalEdildi = true"
      v-model:kuyu-dip-yuksekligi="kuyuDipYuksekligiL"
      v-model:kabin-en-alt-nokta="kuyuDipKabinEnAltL"
      v-model:etek-saci-mesafe="kuyuDipEtekSaciL"
      v-model:iv-olcusu="kuyuDipIvL"
      v-model:bosluk="kuyuDipBoslukL" v-model:stroke="kuyuDipStrokeL"
      v-model:durma-alani="kuyuDipDurmaAlaniL" v-model:karsi-bosluk="kuyuDipKarsiBoslukL"
      v-model:karsi-stroke="kuyuDipKarsiStrokeL" :hiz="asansor?.hiz ?? null" />

    <!-- Asansör Adresi — kayıtlı adreslerden seçim (yoksa yeni adres ekleme);
    kapanınca seçilen kaydın verileri adres alanlarına kopyalanır -->
    <AsansorAdresModal v-model:open="adresAcik" @iptal="iptalEdildi = true"
      v-model:secilen="secilenAdresL" />

    <!-- Kapı ve Ölçüleri — panel sayısı/tip/yön + şema üzerinden ölçüler;
    kapanınca giriş kapı alanlarına kaydedilir -->
    <KapiOlculeriModal v-model:open="kapiOlcumAcik" @iptal="iptalEdildi = true"
      v-model:girisler="kapiOlcumleriL"
      :duraklar="(asansor?.katYukseklikleri ?? []).map((k) => k.kat)" />

    <!-- Duraklar — durak numaraları + durak arası mesafeler;
    kapanınca katYukseklikleri'ne kaydedilir -->
    <DuraklarModal v-model:open="duraklarAcik" @iptal="iptalEdildi = true"
      v-model:satirlar="durakSatirlariL" :durak-sayisi="asansor?.durakSayisi ?? null"
      :kuyu-dip-yukseklik="asansor?.kuyuDipYukseklik ?? 1500"
      :son-kat-yukseklik="asansor?.sonKatYukseklik ?? asansor?.kuyuUstSonKat ?? null" />

    <KuyuUstAlaniModal v-model:open="kuyuUstAcik" @iptal="iptalEdildi = true"
      v-model:korkuluk-mesafe="korkulukMesafeL"
      v-model:korkuluk-yuksekligi="korkulukYuksekligiL" v-model:suspansiyon-mesafe="suspansiyonMesafeL"
      v-model:kabin-ust-durma="kabinUstDurmaL" v-model:son-kat="sonKatL"
      v-model:durma-alani="kuyuUstDurmaAlaniL" :hiz="asansor?.hiz ?? null"
      :dip-bosluk="asansor?.kuyuDipKarsiBosluk ?? null" :dip-stroke="asansor?.kuyuDipKarsiStroke ?? null" />

    <!-- Kurum Evrakları — dosya/foto listesi: görüntüleme, dosya yükleme,
    fotoğraf çekme; her değişiklik anında kaydedilir -->
    <SemaModal v-model:open="kurumEvrakAcik" title="Kurum Evrakları">
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-semibold text-ink">
            Evraklar ({{ asansor?.kurumEvraklari?.length ?? 0 }})
          </p>
          <div class="flex shrink-0 gap-1.5">
            <label
              class="flex cursor-pointer items-center gap-1 border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
              <input type="file" multiple accept="application/pdf,image/*" class="hidden"
                @change="kurumEvrakSec" />
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="m17 8-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
              Dosya Yükle
            </label>
            <button type="button" @click="kurumFotoAcik = true"
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

        <p v-if="kurumEvrakYukleniyor" class="py-1 text-center text-[11px] text-ink-muted">Yükleniyor…</p>
        <p v-if="!asansor?.kurumEvraklari?.length && !kurumEvrakYukleniyor"
          class="py-2 text-center text-xs text-ink-muted">
          Henüz kurum evrakı eklenmedi.
        </p>

        <div v-for="(d, i) in asansor?.kurumEvraklari ?? []" :key="d.dosyaAnahtari"
          class="flex items-center gap-2 bg-surface-900/60 px-2 py-1.5 ring-1 ring-white/5">
          <button type="button" @click="dosyaSlotAc(d)" aria-label="Evrakı görüntüle"
            class="grid h-11 w-11 shrink-0 place-items-center overflow-hidden bg-surface-900 ring-1 ring-white/10">
            <img v-if="kurumEvrakOnizlemeler[d.dosyaAnahtari]" :src="kurumEvrakOnizlemeler[d.dosyaAnahtari]"
              :alt="d.dosyaAdi" class="h-full w-full object-cover" />
            <svg v-else class="h-5 w-5 text-ink-muted" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            </svg>
          </button>
          <button type="button" @click="dosyaSlotAc(d)" class="min-w-0 flex-1 text-left">
            <span class="block truncate text-xs font-medium text-ink">{{ d.dosyaAdi }}</span>
          </button>
          <button type="button" @click="kurumEvrakSilinecek = i" aria-label="Evrakı sil"
            class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
            ✕
          </button>
        </div>
      </div>
    </SemaModal>

    <FotoCekModal v-model:acik="kurumFotoAcik" @tamam="kurumEvrakEkle" />

    <SilmeOnayi :acik="kurumEvrakSilinecek != null"
      :aciklama="kurumEvrakSilinecek != null
        ? `${asansor?.kurumEvraklari?.[kurumEvrakSilinecek]?.dosyaAdi || 'Kurum evrakı'}`
        : ''"
      @vazgec="kurumEvrakSilinecek = null" @onayla="kurumEvrakSilOnayla" />
  </ion-page>
</template>
