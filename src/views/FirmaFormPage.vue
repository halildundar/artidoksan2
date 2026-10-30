<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonFooter } from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createFirma, getFirma, updateFirma, type BelgeSlotAnahtar, type FirmaBelgeleri } from '@/services/firmaService';
import { uploadDosya, getDosyaUrl } from '@/services/dosyaService';
import AdresSecici from '@/components/AdresSecici.vue';
import { blurActive } from '@/utils/blurActive';

const route = useRoute();
const router = useRouter();

const duzenlenenId = computed(() => (route.params.id as string | undefined) ?? '');
const baslik = computed(() => (duzenlenenId.value ? 'Firmayı Düzenle' : 'Yeni Firma'));

const form = ref<{
  ad: string; unvan: string; telefon: string; email: string;
  il: string; ilce: string; mahalle: string; postaKodu: string; adres: string;
  yetkili: string; belgeler: FirmaBelgeleri;
}>({ ad: '', unvan: '', telefon: '', email: '', il: '', ilce: '', mahalle: '', postaKodu: '', adres: '', yetkili: '', belgeler: {} });

// Önizlemeli 2 resim yuvası (PNG şart) — artidoksan1'deki IMAGE_SLOTS deseni
const RESIM_SLOTLARI: { anahtar: BelgeSlotAnahtar; etiket: string }[] = [
  { anahtar: 'logo', etiket: 'Logo' },
  { anahtar: 'imzaKase', etiket: 'İmza & Kaşe' },
];
// 4 resmi belge yuvası (PDF veya resim)
const BELGE_SLOTLARI: { anahtar: BelgeSlotAnahtar; etiket: string }[] = [
  { anahtar: 'imzaSirkusu', etiket: 'İmza Sirküsü' },
  { anahtar: 'vergiLevhasi', etiket: 'Vergi Levhası' },
  { anahtar: 'sicilGazetesi', etiket: 'Sicil Gazetesi' },
  { anahtar: 'faaliyetBelgesi', etiket: 'Faaliyet Belgesi' },
];

const onizleme = ref<Partial<Record<BelgeSlotAnahtar, string>>>({});
const slotYukleniyor = ref<Partial<Record<BelgeSlotAnahtar, boolean>>>({});
const slotHata = ref<Partial<Record<BelgeSlotAnahtar, string>>>({});

async function dosyaSecildi(anahtar: BelgeSlotAnahtar, event: Event, sadecePng: boolean) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (sadecePng && file.type !== 'image/png') {
    slotHata.value[anahtar] = 'Sadece PNG dosyası yüklenebilir';
    return;
  }
  if (!sadecePng && file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
    slotHata.value[anahtar] = 'PDF veya resim dosyası yükleyin';
    return;
  }
  slotHata.value[anahtar] = '';
  slotYukleniyor.value[anahtar] = true;
  try {
    const slot = await uploadDosya(file);
    form.value.belgeler[anahtar] = slot;
    if (file.type.startsWith('image/')) onizleme.value[anahtar] = URL.createObjectURL(file);
  } catch (e) {
    slotHata.value[anahtar] = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    slotYukleniyor.value[anahtar] = false;
  }
}
const yukleniyor = ref(false);
const kaydediliyor = ref(false);
const hata = ref('');

function geri() {
  blurActive();
  router.back();
}

onMounted(async () => {
  if (!duzenlenenId.value) return;
  yukleniyor.value = true;
  try {
    const firma = await getFirma(duzenlenenId.value);
    form.value = {
      ad: firma.ad,
      unvan: firma.unvan,
      telefon: firma.telefon,
      email: firma.email,
      il: firma.il,
      ilce: firma.ilce,
      mahalle: firma.mahalle,
      postaKodu: firma.postaKodu,
      adres: firma.adres,
      yetkili: firma.yetkili,
      belgeler: firma.belgeler ?? {},
    };
    // mevcut resimlerin önizlemesi için kısa ömürlü URL al
    for (const s of RESIM_SLOTLARI) {
      const slot = form.value.belgeler[s.anahtar];
      if (slot) {
        getDosyaUrl(slot.dosyaAnahtari)
          .then((url) => (onizleme.value[s.anahtar] = url))
          .catch(() => { /* önizleme alınamazsa yuva boş görünür */ });
      }
    }
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Firma yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
});

async function kaydet() {
  if (!form.value.ad.trim() || kaydediliyor.value) return;
  kaydediliyor.value = true;
  hata.value = '';
  try {
    const firma = duzenlenenId.value
      ? await updateFirma(duzenlenenId.value, form.value)
      : await createFirma(form.value);
    // kayıttan sonra Firma ekranına dön; eklenen/düzenlenen firma seçili gelsin
    blurActive();
    router.replace(`/firma?secili=${firma._id}`);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kayıt başarısız';
  } finally {
    kaydediliyor.value = false;
  }
}
</script>

<template>
  <ion-page>
    <!-- Header: scroll boyunca üstte sabit (ion-content'in dışında) -->
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
          <!-- leading-8 = geri butonunun yüksekliği (h-8): ikisi aynı yatay eksende ortalanır -->
          <h1 class="text-xl font-bold leading-8 tracking-wide text-ink">{{ baslik }}</h1>
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg">

        <p v-if="hata" class="mx-4 mb-3 bg-red-950/60 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
          {{ hata }}
        </p>

        <p v-if="yukleniyor" class="px-4 py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>

        <form v-else id="firma-form" class="space-y-2 px-4 py-4" @submit.prevent="kaydet">
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Firma Adı *</span>
            <input v-model="form.ad" type="text" required
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
              placeholder="Örn. XYZ Asansör" />
          </label>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Ünvan</span>
            <input v-model="form.unvan" type="text"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
              placeholder="Örn. XYZ Ltd.Şti." />
          </label>

          <!-- Telefon + Email yan yana -->
          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Telefon</span>
              <input v-model="form.telefon" type="tel"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
                placeholder="05xx xxx xx xx" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Email</span>
              <input v-model="form.email" type="email"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
                placeholder="info@xyz.com" />
            </label>
          </div>

          <AdresSecici
            v-model:il="form.il"
            v-model:ilce="form.ilce"
            v-model:mahalle="form.mahalle"
            v-model:posta-kodu="form.postaKodu"
            v-model:adres="form.adres" />

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Firma Yetkilisi</span>
            <input v-model="form.yetkili" type="text"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
              placeholder="Ad Soyad" />
          </label>

          <!-- Logo + İmza & Kaşe: PNG, önizlemeli, yan yana -->
          <div class="grid grid-cols-2 gap-1.5">
            <div v-for="s in RESIM_SLOTLARI" :key="s.anahtar" class="space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">{{ s.etiket }} (PNG)</span>
              <label class="block cursor-pointer bg-surface-900 ring-1 ring-white/10">
                <input type="file" accept="image/png" class="hidden"
                  @change="dosyaSecildi(s.anahtar, $event, true)" />
                <span class="grid aspect-4/3 place-items-center overflow-hidden">
                  <img v-if="onizleme[s.anahtar]" :src="onizleme[s.anahtar]" :alt="s.etiket"
                    class="h-full w-full object-contain p-1" />
                  <span v-else-if="slotYukleniyor[s.anahtar]" class="text-xs text-ink-muted">Yükleniyor…</span>
                  <span v-else class="flex flex-col items-center gap-1 text-xs text-ink-muted/70">
                    <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
                    </svg>
                    PNG seç
                  </span>
                </span>
              </label>
              <p v-if="slotHata[s.anahtar]" class="text-[11px] text-red-300">{{ slotHata[s.anahtar] }}</p>
            </div>
          </div>

          <!-- Resmi belgeler: PDF veya resim, alt alta -->
          <div class="space-y-1.5">
            <div v-for="s in BELGE_SLOTLARI" :key="s.anahtar" class="space-y-0.5">
              <label class="flex cursor-pointer items-center gap-2 bg-surface-900 px-2.5 py-2 ring-1 ring-white/10">
                <input type="file" accept="application/pdf,image/*" class="hidden"
                  @change="dosyaSecildi(s.anahtar, $event, false)" />
                <span class="w-28 shrink-0 text-xs font-medium text-ink-muted">{{ s.etiket }}</span>
                <span class="min-w-0 flex-1 truncate text-xs"
                  :class="form.belgeler[s.anahtar] ? 'text-ink' : 'text-ink-muted/50'">
                  {{ slotYukleniyor[s.anahtar] ? 'Yükleniyor…' : (form.belgeler[s.anahtar]?.dosyaAdi || 'Dosya seç (PDF / Resim)') }}
                </span>
                <svg class="h-4 w-4 shrink-0 text-ink-muted" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 15V3" />
                  <path d="m7 8 5-5 5 5" />
                  <path d="M5 21h14" />
                </svg>
              </label>
              <p v-if="slotHata[s.anahtar]" class="text-[11px] text-red-300">{{ slotHata[s.anahtar] }}</p>
            </div>
          </div>
        </form>
      </div>
    </ion-content>

    <!-- Footer: Vazgeç + Kaydet, scroll boyunca altta sabit (ion-content'in dışında) -->
    <ion-footer class="ion-no-border">
      <div class="border-t border-white/5 bg-surface-900">
        <div class="mx-auto flex max-w-lg gap-1.5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" @click="geri"
            class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Vazgeç
          </button>
          <button type="submit" form="firma-form" :disabled="kaydediliyor || yukleniyor || !form.ad.trim()"
            class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </ion-footer>
  </ion-page>
</template>
