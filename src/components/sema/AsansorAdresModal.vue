<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import AdresSecici from '@/components/AdresSecici.vue';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import {
  getAdresKayitlari,
  createAdresKaydi,
  updateAdresKaydi,
  deleteAdresKaydi,
  type AdresKaydi,
} from '@/services/adresService';
import { getDosyaUrl, getDosyaIndirUrl, uploadDosya, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';

// Asansör Adresi popup'ı: adresler ayrı koleksiyonda tutulur — burada kayıtlı
// adresler aranıp seçilir; seçilen kaydın verileri asansöre olduğu gibi
// kopyalanır (kapanışta detay sayfası kaydeder). Aranan adres yoksa
// "+ Yeni Adres Ekle" ile form açılır, kaydedilen adres koleksiyona eklenir
// ve otomatik seçili gelir.
// mevcut: asansörün şu anki adres alanları — düzenlenen kayıt bunlarla aynıysa
// (asansör o adresi kullanıyorsa) düzenleme asansöre de yansıtılır
const props = defineProps<{ mevcut?: Partial<Record<'il' | 'ilce' | 'mahalle' | 'postaKodu' | 'adres' | 'ada' | 'parsel', string | null | undefined>> }>();
const emit = defineEmits<{ iptal: [] }>();
const open = defineModel<boolean>('open', { default: false });
const secilen = defineModel<AdresKaydi | null>('secilen', { default: null });

const { openFile } = useFileViewer();

const kayitlar = ref<AdresKaydi[]>([]);
const yukleniyor = ref(false);
const hata = ref('');
const formAcik = ref(false);

watch(
  open,
  (acik) => {
    if (!acik) return;
    secilen.value = null;
    formAcik.value = false;
    hata.value = '';
    arama.value = '';
    yukle();
  },
  { immediate: true }
);

async function yukle() {
  yukleniyor.value = true;
  try {
    kayitlar.value = await getAdresKayitlari();
  } catch {
    hata.value = 'Adres kayıtları yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

// Arama kutusu: tüm adres alanlarında TR-duyarsız arar
const arama = ref('');
const filtreli = computed(() => {
  const q = arama.value.trim().toLocaleLowerCase('tr');
  if (!q) return kayitlar.value;
  return kayitlar.value.filter((k) =>
    [k.il, k.ilce, k.mahalle, k.adres, k.postaKodu, k.ada, k.parsel]
      .join(' ')
      .toLocaleLowerCase('tr')
      .includes(q)
  );
});

function kayitYeri(k: AdresKaydi): string {
  return [k.mahalle, [k.ilce, k.il].filter(Boolean).join('/')].filter(Boolean).join(', ') || 'Adres';
}

function kayitDetayi(k: AdresKaydi): string {
  return [
    k.postaKodu ? `PK: ${k.postaKodu}` : '',
    k.ada ? `Ada: ${k.ada}` : '',
    k.parsel ? `Parsel: ${k.parsel}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

// ---- Adres formu (yeni ekleme / düzenleme) ----
const yeni = ref({
  il: '', ilce: '', mahalle: '', postaKodu: '', adres: '', ada: '', parsel: '',
  yapiBelgeNo: '', yapiSahibi: '', muteahhitFirma: '',
});
const yeniRuhsat = ref<BelgeSlot | null>(null);
const duzenlenenId = ref<string | null>(null);
const kaydediliyor = ref(false);
const belgeYukleniyor = ref(false);

function formAc() {
  duzenlenenId.value = null;
  yeni.value = {
  il: '', ilce: '', mahalle: '', postaKodu: '', adres: '', ada: '', parsel: '',
  yapiBelgeNo: '', yapiSahibi: '', muteahhitFirma: '',
};
  yeniRuhsat.value = null;
  hata.value = '';
  formAcik.value = true;
}

// Listedeki kaydı forma doldurarak düzenleme modunda açar
function duzenle(k: AdresKaydi) {
  duzenlenenId.value = k._id;
  yeni.value = {
    il: k.il, ilce: k.ilce, mahalle: k.mahalle, postaKodu: k.postaKodu,
    adres: k.adres, ada: k.ada, parsel: k.parsel,
    yapiBelgeNo: k.yapiBelgeNo ?? '', yapiSahibi: k.yapiSahibi ?? '', muteahhitFirma: k.muteahhitFirma ?? '',
  };
  yeniRuhsat.value = k.yapiRuhsatiDosya ?? null;
  hata.value = '';
  formAcik.value = true;
}

async function yeniKaydet() {
  if (!yeni.value.il || !yeni.value.ilce) {
    hata.value = 'İl ve ilçe seçiniz';
    return;
  }
  kaydediliyor.value = true;
  hata.value = '';
  try {
    const veri = { ...yeni.value, yapiRuhsatiDosya: yeniRuhsat.value };
    if (duzenlenenId.value) {
      // Düzenleme: kayıt güncellenir, listeye dönülür. Asansör bu adresi
      // kullanıyorsa (eski değerler asansörünkiyle aynı) güncel kayıt seçilir —
      // Tamam'da asansöre de yazılır; aksi halde seçim yapılmaz
      const onceki = kayitlar.value.find((k) => k._id === duzenlenenId.value);
      const kayit = await updateAdresKaydi(duzenlenenId.value, veri);
      const alanlar = ['il', 'ilce', 'mahalle', 'postaKodu', 'adres', 'ada', 'parsel'] as const;
      if (onceki && props.mevcut && alanlar.every((a) => (onceki[a] ?? '') === (props.mevcut?.[a] ?? ''))) {
        secilen.value = kayit;
      }
      const i = kayitlar.value.findIndex((k) => k._id === kayit._id);
      if (i >= 0) kayitlar.value[i] = kayit;
      formAcik.value = false;
    } else {
      // Yeni kayıt: eklenen adres seçilir ve popup kapanıp asansöre kaydedilir
      const kayit = await createAdresKaydi(veri);
      kayitlar.value.unshift(kayit);
      secilen.value = kayit;
      formAcik.value = false;
      open.value = false;
    }
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Adres kaydedilemedi';
  } finally {
    kaydediliyor.value = false;
  }
}

// ---- Silme (SilmeOnayi diyaloğu ile) ----
const silinecek = ref<AdresKaydi | null>(null);
const siliniyor = ref(false);

async function silOnayla() {
  const k = silinecek.value;
  if (!k) return;
  siliniyor.value = true;
  try {
    await deleteAdresKaydi(k._id);
    kayitlar.value = kayitlar.value.filter((x) => x._id !== k._id);
    if (secilen.value?._id === k._id) secilen.value = null;
    silinecek.value = null;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Adres silinemedi';
    silinecek.value = null;
  } finally {
    siliniyor.value = false;
  }
}

async function ruhsatSec(event: Event) {
  const input = event.target as HTMLInputElement;
  const dosya = input.files?.[0];
  input.value = '';
  if (!dosya) return;
  if (dosya.type !== 'application/pdf' && !dosya.type.startsWith('image/')) return;
  belgeYukleniyor.value = true;
  try {
    yeniRuhsat.value = await uploadDosya(dosya);
  } catch (e) {
    // Yüklenemezse mevcut belge korunur; hata kullanıcıya gösterilir
    hata.value = e instanceof Error ? `Yapı ruhsatı yüklenemedi: ${e.message}` : 'Yapı ruhsatı yüklenemedi';
  } finally {
    belgeYukleniyor.value = false;
  }
}

async function dosyaAc(dosya: BelgeSlot | null | undefined) {
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
  } catch (e) {
    hata.value = e instanceof Error ? `Belge açılamadı: ${e.message}` : 'Belge açılamadı';
  }
}
</script>

<template>
  <SemaModal v-model:open="open" title="Asansör Adresi" @iptal="emit('iptal')">
    <div class="space-y-2">
      <p v-if="hata" class="text-xs text-red-300" role="alert">{{ hata }}</p>

      <!-- Arama kutusu + yeni adres -->
      <div v-if="!formAcik" class="flex items-end gap-1.5">
        <label class="block min-w-0 flex-1 space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Adres Ara</span>
          <input v-model="arama" type="search" placeholder="İl, ilçe, mahalle, ada, parsel..."
            class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
        </label>
        <button type="button" @click="formAc"
          class="shrink-0 bg-surface-900 px-2.5 py-[7px] text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
          + Yeni Adres Ekle
        </button>
      </div>

      <!-- Adres listesi — tıklanınca seçilir ve popup kapanıp kaydedilir -->
      <div v-if="!formAcik" class="space-y-1.5">
        <p v-if="yukleniyor" class="text-xs text-ink-muted">Yükleniyor…</p>
        <p v-else-if="!kayitlar.length" class="text-xs text-ink-muted">
          Kayıtlı adres yok — "+ Yeni Adres Ekle" ile ekleyin.
        </p>
        <p v-else-if="!filtreli.length" class="text-xs text-ink-muted">
          Aramayla eşleşen adres yok.
        </p>
        <button v-for="k in filtreli" :key="k._id" type="button"
          @click="secilen = k; open = false"
          class="flex w-full items-center gap-2 bg-surface-900/60 p-2.5 text-left ring-1 ring-white/5 active:bg-[#1a2a20]">
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-semibold text-ink">{{ kayitYeri(k) }}</p>
            <p v-if="k.adres" class="truncate text-[11px] text-ink-muted">{{ k.adres }}</p>
            <p v-if="kayitDetayi(k)" class="text-[10px] text-ink-muted/80">{{ kayitDetayi(k) }}</p>
          </div>
          <!-- Yapı ruhsatı görüntüleme (seçimi tetiklemeden) -->
          <span v-if="k.yapiRuhsatiDosya" @click.stop="dosyaAc(k.yapiRuhsatiDosya)"
            role="button" aria-label="Yapı ruhsatını görüntüle"
            class="grid h-6 w-7 shrink-0 cursor-pointer place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <!-- Düzenle (seçimi tetiklemeden formu açar) -->
          <span @click.stop="duzenle(k)" role="button" aria-label="Adresi düzenle"
            class="grid h-6 w-7 shrink-0 cursor-pointer place-items-center bg-surface-900 text-ink-muted ring-1 ring-white/10 active:bg-[#1a2a20]">
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </span>
          <!-- Sil (emin misiniz diyaloğu ile) -->
          <span @click.stop="silinecek = k" role="button" aria-label="Adresi sil"
            class="grid h-6 w-7 shrink-0 cursor-pointer place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
            ✕
          </span>
        </button>
      </div>

      <!-- Yeni adres formu -->
      <div v-if="formAcik" class="space-y-2 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
        <h4 class="text-xs font-bold text-ink">{{ duzenlenenId ? 'Adresi Düzenle' : 'Yeni Adres' }}</h4>
        <AdresSecici v-model:il="yeni.il" v-model:ilce="yeni.ilce" v-model:mahalle="yeni.mahalle"
          v-model:posta-kodu="yeni.postaKodu" v-model:adres="yeni.adres" />

        <div class="grid grid-cols-2 gap-1.5">
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Ada</span>
            <input v-model="yeni.ada" type="text" placeholder="Ada"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
          </label>
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Parsel</span>
            <input v-model="yeni.parsel" type="text" placeholder="Parsel"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
          </label>
        </div>

        <!-- Yapı bilgileri: yapı ruhsatının hemen üstünde -->
        <div class="grid grid-cols-2 gap-1.5">
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Yapı Belge No</span>
            <input v-model="yeni.yapiBelgeNo" type="text" placeholder="Yapı belge no"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
          </label>
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Yapı Sahibi</span>
            <input v-model="yeni.yapiSahibi" type="text" placeholder="Yapı sahibi"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
          </label>
        </div>
        <label class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Müteahhit Firma</span>
          <input v-model="yeni.muteahhitFirma" type="text" placeholder="Müteahhit firma"
            class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30" />
        </label>

        <!-- Yapı ruhsatı belgesi -->
        <div class="block space-y-0.5">
          <span class="text-xs font-medium text-ink-muted">Yapı Ruhsatı</span>
          <div class="flex items-center gap-1.5">
            <label
              class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
              <input type="file" accept="application/pdf,image/*" class="hidden" @change="ruhsatSec($event)" />
              {{ belgeYukleniyor ? 'Yükleniyor…' : yeniRuhsat ? 'Değiştir' : '+ Belge Yükle' }}
            </label>
            <span class="min-w-0 flex-1 truncate text-xs"
              :class="yeniRuhsat ? 'text-ink' : 'text-ink-muted/60'">
              {{ yeniRuhsat?.dosyaAdi ?? 'Belge yüklenmedi' }}
            </span>
            <button v-if="yeniRuhsat" type="button" @click="dosyaAc(yeniRuhsat)" aria-label="Belgeyi görüntüle"
              class="grid h-[26px] w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button v-if="yeniRuhsat" type="button" @click="yeniRuhsat = null" aria-label="Belgeyi kaldır"
              class="grid h-[26px] w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
              ✕
            </button>
          </div>
        </div>

        <div class="flex gap-1.5">
          <button type="button" @click="formAcik = false"
            class="flex-1 bg-surface-900 px-2.5 py-2 text-xs font-semibold text-ink-muted ring-1 ring-white/10 active:bg-[#1a2a20]">
            Vazgeç
          </button>
          <button type="button" @click="yeniKaydet" :disabled="kaydediliyor"
            class="flex-1 bg-[#2b5c3d] px-2.5 py-2 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Silme onayı (kullanıcı kuralı: window.confirm yerine) -->
    <SilmeOnayi :acik="!!silinecek" :aciklama="silinecek ? kayitYeri(silinecek) : ''"
      :siliniyor="siliniyor" @vazgec="silinecek = null" @onayla="silOnayla" />
  </SemaModal>
</template>
