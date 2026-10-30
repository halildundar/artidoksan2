<script setup lang="ts">
import { computed, ref } from 'vue';
import AramaliSelect from '@/components/AramaliSelect.vue';
import { uploadDosya } from '@/services/dosyaService';
import type { CeBelgesi } from '@/services/firmaService';

// CE belgesi formu — FirmaPage'in CE sekmesinde hem yeni kayıt eklerken hem
// de kart üzerinde düzenlerken kullanılır. Dosya yüklemesini kendi yapar;
// Kaydet/Vazgeç kararını üst bileşene bırakır.
const props = withDefaults(
  defineProps<{ kurumlar: { label: string; value: string }[]; kaydediliyor?: boolean }>(),
  { kaydediliyor: false }
);
const belge = defineModel<CeBelgesi>('belge', { required: true });
const emit = defineEmits<{ vazgec: []; kaydet: [] }>();

const CE_MODULLER = ['Modul B', 'Modul C', 'Modul D', 'Modul E', 'Modul G', 'Modul H', 'Modul H1'];

// AramaliSelect string|number|null döner; belgeye hep string yazılır
const kurumModel = computed<string | number | null>({
  get: () => belge.value.kurum || null,
  set(v) { belge.value.kurum = typeof v === 'string' ? v : ''; },
});

const dosyaYukleniyor = ref(false);

function tarihInput(iso: string | null) {
  return iso ? iso.slice(0, 10) : '';
}

async function dosyaSec(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) return;
  dosyaYukleniyor.value = true;
  try {
    belge.value.dosya = await uploadDosya(file);
  } catch {
    /* yükleme başarısızsa mevcut dosya korunur */
  } finally {
    dosyaYukleniyor.value = false;
  }
}

const kaydedilebilir = computed(() => !!belge.value.belgeNo.trim() || !!belge.value.kurum.trim());
</script>

<template>
  <div class="space-y-1.5 bg-surface-900/60 p-2.5 ring-1 ring-white/10">
    <label class="block space-y-0.5">
      <span class="text-xs font-medium text-ink-muted">Modül</span>
      <select v-model="belge.modul"
        class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30">
        <option v-for="m in CE_MODULLER" :key="m" :value="m">{{ m }}</option>
      </select>
    </label>
    <label class="block space-y-0.5">
      <span class="text-xs font-medium text-ink-muted">Kurum</span>
      <AramaliSelect v-model="kurumModel" :options="props.kurumlar"
        placeholder="Onaylı kurum seçiniz" />
    </label>
    <label class="block space-y-0.5">
      <span class="text-xs font-medium text-ink-muted">Belge No</span>
      <input v-model="belge.belgeNo" type="text"
        class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30" />
    </label>
    <div class="grid grid-cols-2 gap-1.5">
      <label class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Geçerlilik Tarihi</span>
        <input :value="tarihInput(belge.gecerlilikTarihi)" type="date"
          @change="belge.gecerlilikTarihi = ($event.target as HTMLInputElement).value || null"
          class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
      </label>
      <label class="block space-y-0.5">
        <span class="text-xs font-medium text-ink-muted">Bitiş Tarihi</span>
        <input :value="tarihInput(belge.bitisTarihi)" type="date"
          @change="belge.bitisTarihi = ($event.target as HTMLInputElement).value || null"
          class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
      </label>
    </div>
    <div class="flex items-center gap-1.5">
      <label
        class="shrink-0 cursor-pointer border border-dashed border-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted active:border-white/40 active:text-ink">
        <input type="file" accept="application/pdf,image/*" class="hidden" @change="dosyaSec" />
        {{ dosyaYukleniyor ? 'Yükleniyor…' : belge.dosya ? 'Değiştir' : '+ Belge Yükle' }}
      </label>
      <span class="min-w-0 flex-1 truncate text-xs"
        :class="belge.dosya ? 'text-ink' : 'text-ink-muted/60'">
        {{ belge.dosya?.dosyaAdi ?? 'Belge yüklenmedi' }}
      </span>
    </div>
    <div class="flex gap-1.5 pt-1">
      <button type="button" @click="emit('vazgec')"
        class="flex-1 bg-surface-800 px-3 py-2 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
        Vazgeç
      </button>
      <button type="button" @click="emit('kaydet')"
        :disabled="props.kaydediliyor || dosyaYukleniyor || !kaydedilebilir"
        class="flex-1 bg-[#2b5c3d] px-3 py-2 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
        {{ props.kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
      </button>
    </div>
  </div>
</template>
