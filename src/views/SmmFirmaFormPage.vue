<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonFooter } from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  createSmmFirmasi, getSmmFirmalari, updateSmmFirmasi, type YeniSmmFirmasi,
} from '@/services/smmFirmaService';
import { uploadDosya, getDosyaUrl, getDosyaIndirUrl, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import { blurActive } from '@/utils/blurActive';

const route = useRoute();
const router = useRouter();

const duzenlenenId = computed(() => (route.params.id as string | undefined) ?? '');
const baslik = computed(() => (duzenlenenId.value ? 'SMM Firmasını Düzenle' : 'Yeni SMM Firması'));

// Yıl yalnız seçimle girilir
const YILLAR = Array.from({ length: 9 }, (_, i) => 2024 + i); // 2024-2032

type BelgeAnahtari =
  | 'buroTescilBelgesi'
  | 'makMuhSmmBelgesi' | 'makMuhImzaSirkusu'
  | 'elkMuhSmmBelgesi' | 'elkMuhImzaSirkusu';

const form = ref<Required<Omit<YeniSmmFirmasi, '_id'>>>({
  yil: null, kisaAd: '', unvan: '', adres: '',
  buroTescilBelgesi: null,
  makMuhAdSoyad: '', makMuhOdaSicilNo: '', makMuhTelefon: '',
  makMuhSmmBelgesi: null, makMuhImzaSirkusu: null,
  elkMuhAdSoyad: '', elkMuhOdaSicilNo: '', elkMuhTelefon: '',
  elkMuhSmmBelgesi: null, elkMuhImzaSirkusu: null,
});

const yukleniyor = ref(false);
const kaydediliyor = ref(false);
const hata = ref('');

onMounted(async () => {
  if (!duzenlenenId.value) return;
  yukleniyor.value = true;
  try {
    // Tek kayıt endpoint'i yok — listeden bulunur (havuz küçük)
    const liste = await getSmmFirmalari();
    const f = liste.find((x) => x._id === duzenlenenId.value);
    if (!f) throw new Error('SMM firması bulunamadı');
    form.value = {
      yil: f.yil, kisaAd: f.kisaAd, unvan: f.unvan, adres: f.adres,
      buroTescilBelgesi: f.buroTescilBelgesi ?? null,
      makMuhAdSoyad: f.makMuhAdSoyad, makMuhOdaSicilNo: f.makMuhOdaSicilNo,
      makMuhTelefon: f.makMuhTelefon,
      makMuhSmmBelgesi: f.makMuhSmmBelgesi ?? null,
      makMuhImzaSirkusu: f.makMuhImzaSirkusu ?? null,
      elkMuhAdSoyad: f.elkMuhAdSoyad, elkMuhOdaSicilNo: f.elkMuhOdaSicilNo,
      elkMuhTelefon: f.elkMuhTelefon,
      elkMuhSmmBelgesi: f.elkMuhSmmBelgesi ?? null,
      elkMuhImzaSirkusu: f.elkMuhImzaSirkusu ?? null,
    };
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'SMM firması yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
});

// ---- Belge yuvaları ----
const { openFile } = useFileViewer();
const belgeYukleniyor = ref<Partial<Record<BelgeAnahtari, boolean>>>({});

async function belgeSec(anahtar: BelgeAnahtari, event: Event) {
  const input = event.target as HTMLInputElement;
  const dosya = input.files?.[0];
  input.value = '';
  if (!dosya) return;
  if (dosya.type !== 'application/pdf' && !dosya.type.startsWith('image/')) return;
  belgeYukleniyor.value[anahtar] = true;
  try {
    form.value[anahtar] = await uploadDosya(dosya);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    belgeYukleniyor.value[anahtar] = false;
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
  } catch {
    hata.value = 'Belge açılamadı';
  }
}

// Mühendis bölümleri tek şablondan çizilir
const MUHENDISLER = [
  {
    baslik: 'Makine Mühendisi',
    ad: 'makMuhAdSoyad', sicil: 'makMuhOdaSicilNo', telefon: 'makMuhTelefon',
    belgeler: [
      { anahtar: 'makMuhSmmBelgesi', etiket: 'SMM Belgesi' },
      { anahtar: 'makMuhImzaSirkusu', etiket: 'İmza Sirküsü' },
    ],
  },
  {
    baslik: 'Elektrik Mühendisi',
    ad: 'elkMuhAdSoyad', sicil: 'elkMuhOdaSicilNo', telefon: 'elkMuhTelefon',
    belgeler: [
      { anahtar: 'elkMuhSmmBelgesi', etiket: 'SMM Belgesi' },
      { anahtar: 'elkMuhImzaSirkusu', etiket: 'İmza Sirküsü' },
    ],
  },
] as const;

function geri() {
  blurActive();
  router.back();
}

async function kaydet() {
  if (!form.value.kisaAd.trim() || kaydediliyor.value) return;
  kaydediliyor.value = true;
  hata.value = '';
  try {
    if (duzenlenenId.value) await updateSmmFirmasi(duzenlenenId.value, form.value);
    else await createSmmFirmasi(form.value);
    blurActive();
    router.replace('/ayarlar/smm-firmalari');
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kayıt başarısız';
  } finally {
    kaydediliyor.value = false;
  }
}
</script>

<template>
  <ion-page>
    <!-- Header: scroll boyunca üstte sabit -->
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
          <h1 class="text-xl font-bold leading-8 tracking-wide text-ink">{{ baslik }}</h1>
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg">
        <p v-if="hata" class="mx-4 mb-3 mt-3 bg-red-950/60 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
          {{ hata }}
        </p>

        <p v-if="yukleniyor" class="px-4 py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>

        <form v-else id="smm-firma-form" class="space-y-2 px-4 py-4" @submit.prevent="kaydet">
          <!-- Yıl: yalnız seçim (2024-2032) -->
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Yıl</span>
            <select v-model="form.yil"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
              <option :value="null">Seçiniz</option>
              <option v-for="y in YILLAR" :key="y" :value="y">{{ y }}</option>
            </select>
          </label>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Kısa Adı *</span>
            <input v-model="form.kisaAd" type="text" required placeholder="Örn. BERKO MÜHENDİSLİK"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
          </label>
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Ünvan</span>
            <input v-model="form.unvan" type="text"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
          </label>
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Adres</span>
            <input v-model="form.adres" type="text"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
          </label>

          <!-- Büro tescil belgesi -->
          <div class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Büro Tescil Belgesi</span>
            <div class="flex items-center gap-1.5">
              <label
                class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                <input type="file" accept="application/pdf,image/*" class="hidden"
                  @change="belgeSec('buroTescilBelgesi', $event)" />
                {{ belgeYukleniyor.buroTescilBelgesi ? 'Yükleniyor…' : form.buroTescilBelgesi ? 'Değiştir' : '+ Belge Yükle' }}
              </label>
              <span class="min-w-0 flex-1 truncate text-xs"
                :class="form.buroTescilBelgesi ? 'text-ink' : 'text-ink-muted/60'">
                {{ form.buroTescilBelgesi?.dosyaAdi ?? 'Belge yüklenmedi' }}
              </span>
              <button v-if="form.buroTescilBelgesi" type="button" @click="dosyaAc(form.buroTescilBelgesi)"
                aria-label="Belgeyi görüntüle"
                class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <button v-if="form.buroTescilBelgesi" type="button" @click="form.buroTescilBelgesi = null"
                aria-label="Belgeyi kaldır"
                class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                ✕
              </button>
            </div>
          </div>

          <!-- Makine / Elektrik mühendisi bölümleri -->
          <div v-for="m in MUHENDISLER" :key="m.baslik" class="space-y-1.5 border-t border-white/5 pt-2">
            <p class="text-xs font-semibold text-ink">{{ m.baslik }}</p>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Ad/Soyad</span>
              <input v-model="form[m.ad]" type="text"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
            </label>
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Oda Sicil No</span>
                <input v-model="form[m.sicil]" type="text"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Telefon</span>
                <input v-model="form[m.telefon]" type="tel" placeholder="0(xxx)xxxxxxx"
                  class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
              </label>
            </div>
            <div v-for="b in m.belgeler" :key="b.anahtar" class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">{{ b.etiket }}</span>
              <div class="flex items-center gap-1.5">
                <label
                  class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
                  <input type="file" accept="application/pdf,image/*" class="hidden"
                    @change="belgeSec(b.anahtar, $event)" />
                  {{ belgeYukleniyor[b.anahtar] ? 'Yükleniyor…' : form[b.anahtar] ? 'Değiştir' : '+ Belge Yükle' }}
                </label>
                <span class="min-w-0 flex-1 truncate text-xs"
                  :class="form[b.anahtar] ? 'text-ink' : 'text-ink-muted/60'">
                  {{ form[b.anahtar]?.dosyaAdi ?? 'Belge yüklenmedi' }}
                </span>
                <button v-if="form[b.anahtar]" type="button" @click="dosyaAc(form[b.anahtar])"
                  aria-label="Belgeyi görüntüle"
                  class="grid h-6.5 w-8 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button v-if="form[b.anahtar]" type="button" @click="form[b.anahtar] = null"
                  aria-label="Belgeyi kaldır"
                  class="grid h-6.5 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
                  ✕
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </ion-content>

    <!-- Footer: Vazgeç + Kaydet, scroll boyunca altta sabit -->
    <ion-footer class="ion-no-border">
      <div class="border-t border-white/5 bg-surface-bar">
        <div class="mx-auto flex max-w-lg gap-1.5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" @click="geri"
            class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Vazgeç
          </button>
          <button type="submit" form="smm-firma-form" :disabled="kaydediliyor || yukleniyor || !form.kisaAd.trim()"
            class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </ion-footer>
  </ion-page>
</template>
