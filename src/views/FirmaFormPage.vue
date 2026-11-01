<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonFooter } from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createFirma, getFirma, updateFirma, type FirmaBelgeleri } from '@/services/firmaService';
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

// Logo, İmza & Kaşe ve kurum evrakları bu formda DEĞİL — Firmalar > Genel
// Bilgiler'den sonradan yüklenir/görüntülenir (kullanıcı isteği). Mevcut
// belgeler (form.belgeler) güncellemede olduğu gibi geri gönderilir, kaybolmaz.

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
    // Denetim/Tescil'den açıldıysa (geri=1) oraya dön, değilse Firma ekranına
    if (route.query.geri) router.back();
    else router.replace(`/firma?secili=${firma._id}`);
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
      <div class="border-b border-white/5 bg-surface-bar">
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

        </form>
      </div>
    </ion-content>

    <!-- Footer: Vazgeç + Kaydet, scroll boyunca altta sabit (ion-content'in dışında) -->
    <ion-footer class="ion-no-border">
      <div class="border-t border-white/5 bg-surface-bar">
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
