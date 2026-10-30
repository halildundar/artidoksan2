<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonFooter } from '@ionic/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createAsansor, getAsansor, updateAsansor } from '@/services/asansorService';
import { getFirmalar } from '@/services/firmaService';
import AramaliSelect from '@/components/AramaliSelect.vue';
import { blurActive } from '@/utils/blurActive';
import {
  SINIF_SECENEKLERI,
  MAKINA_KONUMU_SECENEKLERI,
  askiTipiSecenekleriFor,
  HIZ_DEGERLERI,
  AGIRLIK_KONUMU_SECENEKLERI,
  GIRIS_TIPI_SECENEKLERI,
} from '@/utils/asansorSecenekler';

// Asansör ÖN BİLGİ formu (artidoksan1'deki create/edit popup'ının mobil tam
// sayfa karşılığı): yeni kayıtta önce bu form doldurulur, kaydedince detay
// sayfasına (buton grubu + özetler) geçilir. Teknik bölümler detaydaki şema
// modallarından girilir.
const route = useRoute();
const router = useRouter();

const duzenlenenId = computed(() => (route.params.id as string | undefined) ?? '');
const baslik = computed(() => (duzenlenenId.value ? 'Asansör Bilgileri' : 'Yeni Asansör'));

type Sayi = number | '' | null;

// Yeni kayıtta varsayılan seçili değerler (artidoksan1 ile aynı); düzenlemede
// onMounted içinde gerçek kayıt değerleriyle ezilir.
const firmaId = ref<string | null>((route.query.firma as string | undefined) ?? null);
const seriNo = ref('');
const sinif = ref<string | null>('insan_ve_yuk');
const hiz = ref<number | null>(1.0);
const makinaKonumu = ref<string | null>('MR');
const askiTipi = ref<string | null>('1:1');
const beyanYuku = ref<Sayi>(null);
const kisiSayisi = ref<Sayi>(null);
const agirlikKonumu = ref<string | null>('arka');
const girisTipi = ref<string>('tek');
const durakSayisi = ref<Sayi>(null);
const katSayisi = ref<Sayi>(null);

const askiTipiSecenekleri = computed(() => askiTipiSecenekleriFor(makinaKonumu.value));

// MRL seçilince 1:1 askı kurulamaz — seçiliyse 2:1'e çekilir.
watch(makinaKonumu, (yeni) => {
  if (yeni === 'MRL' && askiTipi.value === '1:1') askiTipi.value = '2:1';
});

const firmaSecenekleri = ref<{ label: string; value: string }[]>([]);
const firmalarYukleniyor = ref(false);

const yukleniyor = ref(false);
const kaydediliyor = ref(false);
const hata = ref('');

const gecerli = computed(() => !!firmaId.value && seriNo.value.trim() !== '');

function sayi(v: Sayi): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function geri() {
  blurActive();
  router.back();
}

onMounted(async () => {
  firmalarYukleniyor.value = true;
  getFirmalar()
    .then((firmalar) => (firmaSecenekleri.value = firmalar.map((f) => ({ label: f.ad, value: f._id }))))
    .catch(() => { /* firma listesi çekilemezse seçenekler boş kalır */ })
    .finally(() => (firmalarYukleniyor.value = false));

  if (!duzenlenenId.value) return;
  yukleniyor.value = true;
  try {
    const a = await getAsansor(duzenlenenId.value);
    firmaId.value = typeof a.firmaId === 'object' && a.firmaId ? a.firmaId._id : (a.firmaId as string);
    seriNo.value = a.seriNo ?? '';
    sinif.value = a.sinif ?? null;
    hiz.value = a.hiz ?? null;
    makinaKonumu.value = a.makinaKonumu ?? null;
    askiTipi.value = a.askiTipi ?? null;
    beyanYuku.value = a.beyanYuku ?? null;
    kisiSayisi.value = a.kisiSayisi ?? null;
    agirlikKonumu.value = a.karsiAgirlikKonumu || 'arka';
    girisTipi.value = a.kabinGirisTipi ?? 'tek';
    durakSayisi.value = a.durakSayisi ?? null;
    katSayisi.value = a.katSayisi ?? null;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Asansör yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
});

async function kaydet() {
  if (!gecerli.value || kaydediliyor.value) return;
  kaydediliyor.value = true;
  hata.value = '';
  try {
    const veri = {
      firmaId: firmaId.value as string,
      seriNo: seriNo.value.trim(),
      sinif: (sinif.value as 'insan_ve_yuk' | 'yuk' | null) ?? null,
      hiz: hiz.value,
      makinaKonumu: (makinaKonumu.value as 'MR' | 'MRL' | null) ?? null,
      askiTipi: (askiTipi.value as '1:1' | '2:1' | '3:1' | '4:1' | null) ?? null,
      beyanYuku: sayi(beyanYuku.value),
      kisiSayisi: sayi(kisiSayisi.value),
      karsiAgirlikKonumu: agirlikKonumu.value ?? '',
      kabinGirisTipi: girisTipi.value as 'tek' | 'cift',
      durakSayisi: sayi(durakSayisi.value),
      katSayisi: sayi(katSayisi.value),
    };
    blurActive();
    if (duzenlenenId.value) {
      await updateAsansor(duzenlenenId.value, veri);
      router.back();
    } else {
      const yeni = await createAsansor(veri);
      router.replace(`/asansor/${yeni._id}`);
    }
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kayıt başarısız';
  } finally {
    kaydediliyor.value = false;
  }
}
</script>

<template>
  <ion-page>
    <!-- Header: geri butonu başlıktan önce, scroll boyunca sabit -->
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

        <form v-else id="asansor-on-bilgi-form" class="space-y-2 px-4 py-4" @submit.prevent="kaydet">
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Firma *</span>
            <AramaliSelect v-model="firmaId" :options="firmaSecenekleri" :disabled="firmalarYukleniyor"
              :placeholder="firmalarYukleniyor ? 'Yükleniyor...' : 'Firma seçiniz'" />
          </label>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Seri No *</span>
            <input v-model="seriNo" type="text" required
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
              placeholder="Örn. ASD-2024-001" />
          </label>

          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Sınıf</span>
              <select v-model="sinif"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                <option v-for="o in SINIF_SECENEKLERI" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Hız (m/s)</span>
              <select v-model.number="hiz"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                <option v-for="h in HIZ_DEGERLERI" :key="h" :value="h">{{ h.toFixed(2) }}</option>
              </select>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Makine Konumu</span>
              <select v-model="makinaKonumu"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                <option v-for="o in MAKINA_KONUMU_SECENEKLERI" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Askı Oranı</span>
              <select v-model="askiTipi"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
                <option v-for="o in askiTipiSecenekleri" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Kapasite (kg)</span>
              <input v-model.number="beyanYuku" type="number" min="0"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Kişi Sayısı</span>
              <input v-model.number="kisiSayisi" type="number" min="0"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
          </div>

          <!-- Ağırlık konumu / giriş tipi: mobilde radyo yerine segment butonlar -->
          <div class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Ağırlık Konumu</span>
            <div class="grid grid-cols-3 gap-1.5">
              <button v-for="o in AGIRLIK_KONUMU_SECENEKLERI" :key="o.value" type="button"
                @click="agirlikKonumu = o.value"
                class="px-2 py-1.5 text-xs font-semibold ring-1"
                :class="agirlikKonumu === o.value
                  ? 'bg-[#2b5c3d] text-ink ring-white/10'
                  : 'bg-surface-900 text-ink-muted ring-white/10'">
                {{ o.label }}
              </button>
            </div>
          </div>

          <div class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Giriş Tipi</span>
            <div class="grid grid-cols-2 gap-1.5">
              <button v-for="o in GIRIS_TIPI_SECENEKLERI" :key="o.value" type="button"
                @click="girisTipi = o.value"
                class="px-2 py-1.5 text-xs font-semibold ring-1"
                :class="girisTipi === o.value
                  ? 'bg-[#2b5c3d] text-ink ring-white/10'
                  : 'bg-surface-900 text-ink-muted ring-white/10'">
                {{ o.label }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Durak Sayısı</span>
              <input v-model.number="durakSayisi" type="number" min="0"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Kat Sayısı</span>
              <input v-model.number="katSayisi" type="number" min="0"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
          </div>
        </form>
      </div>
    </ion-content>

    <!-- Footer: Vazgeç + Kaydet, scroll boyunca altta sabit -->
    <ion-footer class="ion-no-border">
      <div class="border-t border-white/5 bg-surface-900">
        <div class="mx-auto flex max-w-lg gap-1.5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" @click="geri"
            class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Vazgeç
          </button>
          <button type="submit" form="asansor-on-bilgi-form" :disabled="kaydediliyor || yukleniyor || !gecerli"
            class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </ion-footer>
  </ion-page>
</template>
