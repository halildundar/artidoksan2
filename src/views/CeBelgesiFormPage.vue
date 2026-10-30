<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonFooter } from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  createAksamBelgesi, getAksamBelgesi, updateAksamBelgesi, getBilesenTipleri, type BilesenTipi,
} from '@/services/aksamBelgesiService';
import { getOnayliKurumSecenekleri, type OnayliKurumSecenek } from '@/services/onayliKurumService';
import { uploadDosya, getDosyaUrl, getDosyaIndirUrl, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import AramaliSelect from '@/components/AramaliSelect.vue';
import { blurActive } from '@/utils/blurActive';

const route = useRoute();
const router = useRouter();

const duzenlenenId = computed(() => (route.params.id as string | undefined) ?? '');
const baslik = computed(() => (duzenlenenId.value ? 'Güvenlik Aksamını Düzenle' : 'Yeni Güvenlik Aksamı'));

const form = ref({
  bilesenTipiKodu: '',
  marka: '',
  sertifikaNo: '',
  gecerlilikBaslangic: '',
  gecerlilikBitis: '',
  modulKodu: '',
  onayliKurumId: '',
  belgeTipi: '',
  aciklama: '',
  durum: 'aktif' as 'aktif' | 'pasif',
  dosya: undefined as BelgeSlot | undefined,
});

const tipler = ref<BilesenTipi[]>([]);
// Tipler, aitest'teki chip listesi deseniyle tek tek eklenip çıkarılır
// (virgüllü metin yerine); kayıtta boşlar/tekrarlar ayıklanır.
const tipSatirlari = ref<{ deger: string }[]>([]);

function tipEkle() {
  tipSatirlari.value.push({ deger: '' });
}
function tipSil(i: number) {
  tipSatirlari.value.splice(i, 1);
}

const kurumlar = ref<OnayliKurumSecenek[]>([]);
const yukleniyor = ref(false);
const kaydediliyor = ref(false);
const dosyaYukleniyor = ref(false);
const hata = ref('');

const seciliTip = computed(() => tipler.value.find((t) => t.kod === form.value.bilesenTipiKodu) ?? null);
const guvenlikAksamiMi = computed(() => seciliTip.value?.kategori === 'guvenlik_aksami');
const gecerli = computed(() => form.value.bilesenTipiKodu !== '' && (!guvenlikAksamiMi.value || form.value.marka.trim() !== ''));

const tipSecenekleri = computed(() =>
  tipler.value.map((t) => ({
    label: `${t.ad} (${t.kategori === 'guvenlik_aksami' ? 'Güvenlik Aksamı' : 'Bileşen'})`,
    value: t.kod,
  }))
);
const tipModel = computed<string | number | null>({
  get: () => form.value.bilesenTipiKodu || null,
  set(v) { form.value.bilesenTipiKodu = typeof v === 'string' ? v : ''; },
});

const kurumSecenekleri = computed(() =>
  kurumlar.value.map((k) => ({ label: `${k.nobo} — ${k.unvan}`, value: k._id }))
);
const kurumModel = computed<string | number | null>({
  get: () => form.value.onayliKurumId || null,
  set(v) { form.value.onayliKurumId = typeof v === 'string' ? v : ''; },
});

function geri() {
  blurActive();
  router.back();
}

async function dosyaSec(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
    hata.value = 'PDF veya resim dosyası yükleyin';
    return;
  }
  dosyaYukleniyor.value = true;
  try {
    form.value.dosya = await uploadDosya(file);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    dosyaYukleniyor.value = false;
  }
}

const { openFile } = useFileViewer();

// Yüklü belgeyi tam ekran görüntüleyicide açar (resim/PDF); görüntülenemeyen
// tipler indirmeye düşer — FirmaPage belgeGoruntule ile aynı desen.
async function belgeGoruntule() {
  const slot = form.value.dosya;
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

async function belgeIndir() {
  const slot = form.value.dosya;
  if (!slot) return;
  try {
    window.open(await getDosyaIndirUrl(slot.dosyaAnahtari, slot.dosyaAdi), '_blank');
  } catch {
    hata.value = 'Belge indirilemedi';
  }
}

onMounted(async () => {
  yukleniyor.value = true;
  try {
    const [tipListesi, kurumListesi] = await Promise.all([getBilesenTipleri(), getOnayliKurumSecenekleri()]);
    tipler.value = tipListesi;
    kurumlar.value = kurumListesi;

    if (duzenlenenId.value) {
      const b = await getAksamBelgesi(duzenlenenId.value);
      tipSatirlari.value = b.tipler.map((t) => ({ deger: t }));
      form.value = {
        bilesenTipiKodu: b.bilesenTipiKodu,
        marka: b.marka,
        sertifikaNo: b.sertifikaNo,
        gecerlilikBaslangic: b.gecerlilikBaslangic ? b.gecerlilikBaslangic.slice(0, 10) : '',
        gecerlilikBitis: b.gecerlilikBitis ? b.gecerlilikBitis.slice(0, 10) : '',
        modulKodu: b.modulKodu,
        onayliKurumId: b.onayliKurumId ?? '',
        belgeTipi: b.belgeTipi,
        aciklama: b.aciklama,
        durum: b.durum,
        dosya: b.dosya,
      };
    }
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Veriler yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
});

async function kaydet() {
  if (!gecerli.value || kaydediliyor.value) return;
  kaydediliyor.value = true;
  hata.value = '';
  try {
    const kurum = kurumlar.value.find((k) => k._id === form.value.onayliKurumId);
    const payload = {
      bilesenTipiKodu: form.value.bilesenTipiKodu,
      marka: form.value.marka,
      tipler: [...new Set(tipSatirlari.value.map((s) => s.deger.trim()).filter(Boolean))],
      sertifikaNo: form.value.sertifikaNo,
      gecerlilikBaslangic: form.value.gecerlilikBaslangic ? new Date(form.value.gecerlilikBaslangic).toISOString() : null,
      gecerlilikBitis: form.value.gecerlilikBitis ? new Date(form.value.gecerlilikBitis).toISOString() : null,
      modulKodu: form.value.modulKodu,
      onayliKurumId: form.value.onayliKurumId || null,
      onayliKurumNobo: kurum?.nobo ?? '',
      onayliKurumUnvan: kurum?.unvan ?? '',
      belgeTipi: form.value.belgeTipi,
      aciklama: form.value.aciklama,
      durum: form.value.durum,
      dosya: form.value.dosya,
    };
    if (duzenlenenId.value) await updateAksamBelgesi(duzenlenenId.value, payload);
    else await createAksamBelgesi(payload);
    blurActive();
    router.replace('/ayarlar/guvenlik-aksamlari');
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
      <div class="border-b border-white/5 bg-surface-900">
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

        <form v-else id="ce-belgesi-form" class="space-y-2 px-4 py-4" @submit.prevent="kaydet">
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Bileşen Tipi *</span>
            <AramaliSelect v-model="tipModel" :options="tipSecenekleri" placeholder="Bileşen tipi seçiniz" />
          </label>

          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Marka {{ guvenlikAksamiMi ? '*' : '' }}</span>
              <input v-model="form.marka" type="text"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
                placeholder="Örn. Wittur" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Sertifika No</span>
              <input v-model="form.sertifikaNo" type="text"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
            </label>
          </div>

          <!-- Tipler: aitest'teki chip deseni — her tip kaldırılabilir küçük
          kutu, "+ Tip ekle" ile yeni satır (flat tasarım, radius yok) -->
          <div class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Tipler</span>
            <div class="flex flex-wrap items-center gap-1.5">
              <span v-for="(satir, i) in tipSatirlari" :key="i"
                class="inline-flex items-center gap-1 bg-surface-900 py-1 pl-2 pr-1 ring-1 ring-white/10 focus-within:ring-white/30">
                <input v-model="satir.deger" type="text" placeholder="örn. RV-30"
                  class="w-24 bg-transparent text-xs text-ink outline-none placeholder:text-ink-muted/40" />
                <button type="button" @click="tipSil(i)" aria-label="Kaldır"
                  class="grid h-5 w-5 shrink-0 place-items-center text-sm leading-none text-ink-muted active:text-red-400">
                  ×
                </button>
              </span>
              <button type="button" @click="tipEkle"
                class="border border-dashed border-white/20 px-3 py-1.5 text-xs text-ink-muted active:border-white/40 active:text-ink">
                + Tip ekle
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Geçerlilik Başlangıç</span>
              <input v-model="form.gecerlilikBaslangic" type="date"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Geçerlilik Bitiş</span>
              <input v-model="form.gecerlilikBitis" type="date"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
          </div>

          <template v-if="guvenlikAksamiMi">
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Modül Kodu</span>
                <input v-model="form.modulKodu" type="text"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
                  placeholder="Örn. Modül B" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Durum</span>
                <select v-model="form.durum"
                  class="w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                  <option value="aktif">Aktif</option>
                  <option value="pasif">Pasif</option>
                </select>
              </label>
            </div>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Onaylı Kurum (NoBo)</span>
              <AramaliSelect v-model="kurumModel" :options="kurumSecenekleri" placeholder="Onaylı kurum seçiniz" />
            </label>
          </template>

          <label v-else class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Belge Tipi</span>
            <input v-model="form.belgeTipi" type="text"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
              placeholder="Örn. Tip Test Raporu" />
          </label>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Açıklama</span>
            <textarea v-model="form.aciklama" rows="2"
              class="w-full resize-none bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"></textarea>
          </label>

          <div class="flex items-center gap-1.5 bg-surface-900 px-2.5 py-2 ring-1 ring-white/10">
            <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
              <input type="file" accept="application/pdf,image/*" class="hidden" @change="dosyaSec" />
              <span class="w-24 shrink-0 text-xs font-medium text-ink-muted">Belge Dosyası</span>
              <span class="min-w-0 flex-1 truncate text-xs" :class="form.dosya ? 'text-ink' : 'text-ink-muted/50'">
                {{ dosyaYukleniyor ? 'Yükleniyor…' : (form.dosya?.dosyaAdi || 'Dosya seç (PDF / Resim)') }}
              </span>
              <svg class="h-4 w-4 shrink-0 text-ink-muted" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" />
              </svg>
            </label>
            <!-- Yüklü belge varsa görüntüle + indir -->
            <template v-if="form.dosya">
              <button type="button" @click="belgeGoruntule" aria-label="Görüntüle"
                class="grid h-7 w-7 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <button type="button" @click="belgeIndir" aria-label="İndir"
                class="grid h-7 w-7 shrink-0 place-items-center bg-surface-800 text-ink-muted ring-1 ring-white/10 active:bg-[#1a2a20]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
                </svg>
              </button>
            </template>
          </div>
        </form>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border">
      <div class="border-t border-white/5 bg-surface-900">
        <div class="mx-auto flex max-w-lg gap-1.5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" @click="geri"
            class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Vazgeç
          </button>
          <button type="submit" form="ce-belgesi-form" :disabled="kaydediliyor || yukleniyor || !gecerli"
            class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </ion-footer>
  </ion-page>
</template>
