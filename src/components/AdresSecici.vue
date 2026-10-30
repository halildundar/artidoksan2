<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { getIller, getIlceler, getMahalleler, type AdresSecenek } from '@/services/adresService';
import AramaliSelect from '@/components/AramaliSelect.vue';

// artidoksan1'deki AdresSecici ile aynı desen: il/ilce/mahalle İSİM (string)
// olarak dışarı verilir (kayıtta saklanan bu), PTT API'si ise kod bekler —
// seçili isme karşılık gelen kod options listesinden bulunur.
const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });

const il = defineModel<string>('il', { default: '' });
const ilce = defineModel<string>('ilce', { default: '' });
const mahalle = defineModel<string>('mahalle', { default: '' });
const postaKodu = defineModel<string>('postaKodu', { default: '' });
const adres = defineModel<string>('adres', { default: '' });

const illerLoading = ref(false);
const illerOptions = ref<AdresSecenek[]>([]);
const ilceLoading = ref(false);
const ilceOptions = ref<AdresSecenek[]>([]);
const mahalleLoading = ref(false);
const mahalleOptions = ref<string[]>([]);
const postaKoduByMahalle = ref<Record<string, string>>({});
const error = ref('');

const ilKodu = computed<number | null>(() => {
  const found = illerOptions.value.find((o) => o.label === il.value);
  return found ? found.value : null;
});
const ilceKodu = computed<number | null>(() => {
  const found = ilceOptions.value.find((o) => o.label === ilce.value);
  return found ? found.value : null;
});

const ilKoduModel = computed<string | number | null>({
  get: () => ilKodu.value,
  set(kod) {
    const opt = illerOptions.value.find((o) => o.value === kod);
    il.value = opt?.label ?? '';
    ilce.value = '';
    mahalle.value = '';
    postaKodu.value = '';
  },
});
const ilceKoduModel = computed<string | number | null>({
  get: () => ilceKodu.value,
  set(kod) {
    const opt = ilceOptions.value.find((o) => o.value === kod);
    ilce.value = opt?.label ?? '';
    mahalle.value = '';
    postaKodu.value = '';
  },
});
const mahalleSecenekleri = computed(() =>
  mahalleOptions.value.map((ad) => ({ label: ad, value: ad }))
);

const mahalleSecimModel = computed<string | number | null>({
  get: () => mahalle.value || null,
  set(ad) {
    const deger = typeof ad === 'string' ? ad : '';
    mahalle.value = deger;
    postaKodu.value = deger ? (postaKoduByMahalle.value[deger] ?? '') : '';
  },
});

onMounted(async () => {
  illerLoading.value = true;
  try {
    illerOptions.value = await getIller();
  } catch {
    error.value = 'İl listesi yüklenemedi';
  } finally {
    illerLoading.value = false;
  }
});

watch(ilKodu, async (kod) => {
  ilceOptions.value = [];
  mahalleOptions.value = [];
  postaKoduByMahalle.value = {};
  if (!kod) return;
  ilceLoading.value = true;
  error.value = '';
  try {
    ilceOptions.value = await getIlceler(kod);
  } catch {
    error.value = 'İlçe listesi yüklenemedi';
  } finally {
    ilceLoading.value = false;
  }
});

watch(ilceKodu, async (kod) => {
  mahalleOptions.value = [];
  postaKoduByMahalle.value = {};
  if (!kod || !ilKodu.value) return;
  mahalleLoading.value = true;
  error.value = '';
  try {
    const kayitlar = await getMahalleler(ilKodu.value, kod);
    const map: Record<string, string> = {};
    for (const m of kayitlar) map[m.ad] = m.postaKodu;
    postaKoduByMahalle.value = map;
    mahalleOptions.value = kayitlar.map((m) => m.ad);
  } catch {
    error.value = 'Mahalle listesi yüklenemedi';
  } finally {
    mahalleLoading.value = false;
  }
});
</script>

<template>
  <div class="space-y-2">
    <p v-if="error" class="text-xs text-red-300" role="alert">{{ error }}</p>

    <!-- İl + İlçe yan yana (yazarak aranabilir) -->
    <div class="grid grid-cols-2 gap-1.5">
      <label class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">İl</span>
        <AramaliSelect v-model="ilKoduModel" :options="illerOptions"
          :disabled="disabled || illerLoading"
          :placeholder="illerLoading ? 'Yükleniyor...' : 'İl seçiniz'" />
      </label>

      <label class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">İlçe</span>
        <AramaliSelect v-model="ilceKoduModel" :options="ilceOptions"
          :disabled="disabled || !ilKodu || ilceLoading"
          :placeholder="ilceLoading ? 'Yükleniyor...' : 'İlçe seçiniz'" />
      </label>
    </div>

    <!-- Mahalle + Adres yan yana -->
    <div class="grid grid-cols-2 gap-1.5">
      <label class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Mahalle</span>
        <AramaliSelect v-model="mahalleSecimModel" :options="mahalleSecenekleri"
          :disabled="disabled || !ilceKodu || mahalleLoading"
          :placeholder="mahalleLoading ? 'Yükleniyor...' : 'Mahalle seçiniz'" />
      </label>

      <label class="block space-y-0.5">
        <span class="flex items-baseline justify-between">
          <span class="text-xs font-medium text-ink-muted">Adres</span>
          <!-- Mahalle seçilince posta kodu, Adres etiketinin tam karşısında -->
          <span v-if="mahalle && postaKodu" class="text-xs">
            <span class="text-ink-muted">PK:</span>
            <span class="ml-1 font-semibold tracking-wide text-[#6fcf97]">{{ postaKodu }}</span>
          </span>
        </span>
        <input v-model="adres" type="text" :disabled="disabled"
          class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30 disabled:opacity-50"
          placeholder="Sokak, cadde, no..." />
      </label>
    </div>
  </div>
</template>
