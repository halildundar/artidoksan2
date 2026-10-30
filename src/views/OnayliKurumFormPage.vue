<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonFooter } from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createOnayliKurum, getOnayliKurum, updateOnayliKurum } from '@/services/onayliKurumService';
import { blurActive } from '@/utils/blurActive';

const route = useRoute();
const router = useRouter();

const duzenlenenId = computed(() => (route.params.id as string | undefined) ?? '');
const baslik = computed(() => (duzenlenenId.value ? 'Kurumu Düzenle' : 'Yeni Onaylı Kurum'));

// sonOnayTarihi <input type="date"> için YYYY-MM-DD tutulur, kayıtta ISO'ya çevrilir
const form = ref({
  nobo: '',
  unvan: '',
  ulke: '',
  kurumTipi: '',
  telefon: '',
  eposta: '',
  website: '',
  adres: '',
  sonOnayTarihi: '',
});
const yukleniyor = ref(false);
const kaydediliyor = ref(false);
const hata = ref('');

const gecerli = computed(() => form.value.nobo.trim() !== '' && form.value.unvan.trim() !== '');

function geri() {
  blurActive();
  router.back();
}

onMounted(async () => {
  if (!duzenlenenId.value) return;
  yukleniyor.value = true;
  try {
    const kurum = await getOnayliKurum(duzenlenenId.value);
    form.value = {
      nobo: kurum.nobo,
      unvan: kurum.unvan,
      ulke: kurum.ulke,
      kurumTipi: kurum.kurumTipi,
      telefon: kurum.telefon,
      eposta: kurum.eposta,
      website: kurum.website,
      adres: kurum.adres,
      sonOnayTarihi: kurum.sonOnayTarihi ? kurum.sonOnayTarihi.slice(0, 10) : '',
    };
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kayıt yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
});

async function kaydet() {
  if (!gecerli.value || kaydediliyor.value) return;
  kaydediliyor.value = true;
  hata.value = '';
  try {
    const payload = {
      ...form.value,
      sonOnayTarihi: form.value.sonOnayTarihi
        ? new Date(form.value.sonOnayTarihi).toISOString()
        : null,
    };
    if (duzenlenenId.value) {
      await updateOnayliKurum(duzenlenenId.value, payload);
    } else {
      await createOnayliKurum(payload);
    }
    blurActive();
    router.replace('/ayarlar/onayli-kurumlar');
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

        <form v-else id="onayli-kurum-form" class="space-y-2 px-4 py-4" @submit.prevent="kaydet">
          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">NoBo Numarası *</span>
              <input v-model="form.nobo" type="text" required
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
                placeholder="Örn. 1234" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Kurum Tipi</span>
              <input v-model="form.kurumTipi" type="text"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
                placeholder="Örn. Onaylanmış Kuruluş" />
            </label>
          </div>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Ünvan *</span>
            <input v-model="form.unvan" type="text" required
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
              placeholder="Kurum ünvanı" />
          </label>

          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Ülke</span>
              <input v-model="form.ulke" type="text"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
                placeholder="Örn. Türkiye" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Son Onay Tarihi</span>
              <input v-model="form.sonOnayTarihi" type="date"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
          </div>

          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Telefon</span>
              <input v-model="form.telefon" type="tel"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
                placeholder="+90 ..." />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">E-posta</span>
              <input v-model="form.eposta" type="email"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
                placeholder="info@kurum.com" />
            </label>
          </div>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Web Sitesi</span>
            <input v-model="form.website" type="url"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
              placeholder="https://..." />
          </label>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Adres</span>
            <textarea v-model="form.adres" rows="5"
              class="w-full resize-none bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
              placeholder="Kurum adresi"></textarea>
          </label>
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
          <button type="submit" form="onayli-kurum-form" :disabled="kaydediliyor || yukleniyor || !gecerli"
            class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </ion-footer>
  </ion-page>
</template>
