<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonFooter } from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createDanisman, getDanisman, updateDanisman } from '@/services/danismanService';
import { getIller, type AdresSecenek } from '@/services/adresService';
import AramaliSelect from '@/components/AramaliSelect.vue';
import { blurActive } from '@/utils/blurActive';

const route = useRoute();
const router = useRouter();

const duzenlenenId = computed(() => (route.params.id as string | undefined) ?? '');
const baslik = computed(() => (duzenlenenId.value ? 'Danışmanı Düzenle' : 'Yeni Danışman'));

const form = ref({ adSoyad: '', il: '', telefon: '', email: '' });
const yukleniyor = ref(false);
const kaydediliyor = ref(false);
const hata = ref('');

// İl, PTT il listesinden seçilir (isim olarak saklanır)
const illerLoading = ref(false);
const illerOptions = ref<AdresSecenek[]>([]);

const gecerli = computed(() => form.value.adSoyad.trim() !== '');

// İl isim olarak saklanır; combobox için {label, value} ikilisine çevrilir
const ilSecenekleri = computed(() => illerOptions.value.map((o) => ({ label: o.label, value: o.label })));
const ilModel = computed<string | number | null>({
  get: () => form.value.il || null,
  set(deger) {
    form.value.il = typeof deger === 'string' ? deger : '';
  },
});

function geri() {
  blurActive();
  router.back();
}

onMounted(async () => {
  illerLoading.value = true;
  getIller()
    .then((iller) => (illerOptions.value = iller))
    .catch(() => { /* il listesi çekilemezse alan boş seçenekli kalır */ })
    .finally(() => (illerLoading.value = false));

  if (!duzenlenenId.value) return;
  yukleniyor.value = true;
  try {
    const danisman = await getDanisman(duzenlenenId.value);
    form.value = {
      adSoyad: danisman.adSoyad,
      il: danisman.il,
      telefon: danisman.telefon,
      email: danisman.email,
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
    if (duzenlenenId.value) {
      await updateDanisman(duzenlenenId.value, form.value);
    } else {
      await createDanisman(form.value);
    }
    blurActive();
    router.replace('/ayarlar/danismanlar');
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

        <form v-else id="danisman-form" class="space-y-2 px-4 py-4" @submit.prevent="kaydet">
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Ad Soyad *</span>
            <input v-model="form.adSoyad" type="text" required
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30"
              placeholder="Ad Soyad" />
          </label>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">İl</span>
            <AramaliSelect v-model="ilModel" :options="ilSecenekleri" :disabled="illerLoading"
              :placeholder="illerLoading ? 'Yükleniyor...' : 'İl seçiniz'" />
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
                placeholder="ornek@mail.com" />
            </label>
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
          <button type="submit" form="danisman-form" :disabled="kaydediliyor || yukleniyor || !gecerli"
            class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </ion-footer>
  </ion-page>
</template>
