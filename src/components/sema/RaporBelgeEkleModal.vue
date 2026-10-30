<script setup lang="ts">
import { ref, watch } from 'vue';
import { createAksamBelgesi, type AksamBelgesi } from '@/services/aksamBelgesiService';
import { uploadDosya, type BelgeSlot } from '@/services/dosyaService';

// Kapı modalındaki "Belge Ekle" ile açılan mini form: seçilen markaya yangın
// dayanım/sızdırmazlık belgesi veya sarkaç test raporu ekler. Kayıt normal CE
// kataloğuna (Ayarlar → Güvenlik Aksamlar) düşer, oradan da güncellenebilir.
const props = defineProps<{
  baslik: string;
  kod: string; // 'yangin_sizdirmazlik_raporu' | 'sarkac_test_raporu'
  marka: string;
}>();

const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ eklendi: [belge: AksamBelgesi] }>();

const markaL = ref('');
const sertifikaNo = ref('');
const baslangic = ref('');
const bitis = ref('');
const dosya = ref<BelgeSlot | undefined>(undefined);
const dosyaYukleniyor = ref(false);
const kaydediliyor = ref(false);
const hata = ref('');

watch(open, (acik) => {
  if (!acik) return;
  markaL.value = props.marka;
  sertifikaNo.value = '';
  baslangic.value = '';
  bitis.value = '';
  dosya.value = undefined;
  hata.value = '';
});

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
    dosya.value = await uploadDosya(file);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    dosyaYukleniyor.value = false;
  }
}

async function kaydet() {
  if (kaydediliyor.value || !markaL.value.trim()) return;
  kaydediliyor.value = true;
  hata.value = '';
  try {
    const belge = await createAksamBelgesi({
      bilesenTipiKodu: props.kod,
      marka: markaL.value.trim(),
      tipler: [],
      sertifikaNo: sertifikaNo.value.trim(),
      gecerlilikBaslangic: baslangic.value ? new Date(baslangic.value).toISOString() : null,
      gecerlilikBitis: bitis.value ? new Date(bitis.value).toISOString() : null,
      modulKodu: '',
      onayliKurumId: null,
      onayliKurumNobo: '',
      onayliKurumUnvan: '',
      belgeTipi: '',
      aciklama: '',
      durum: 'aktif',
      dosya: dosya.value,
    });
    emit('eklendi', belge);
    open.value = false;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kayıt başarısız';
  } finally {
    kaydediliyor.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4"
      @click.self="open = false">
      <div class="w-full max-w-sm bg-[#101a14] p-4 ring-1 ring-white/10">
        <h2 class="text-sm font-bold text-ink">{{ baslik }} Ekle</h2>

        <p v-if="hata" class="mt-2 bg-red-950/60 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/20">
          {{ hata }}
        </p>

        <div class="mt-3 space-y-2">
          <!-- Marka kilit seçiminden gelir — burada değiştirilmez (salt okunur) -->
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Marka</span>
            <input :value="markaL" type="text" readonly tabindex="-1"
              class="w-full cursor-default bg-surface-800 px-2.5 py-1.5 text-xs text-ink-muted ring-1 ring-white/5 outline-none" />
          </label>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Sertifika No</span>
            <input v-model="sertifikaNo" type="text"
              class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
          </label>

          <div class="grid grid-cols-2 gap-1.5">
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Geçerlilik Başlangıç</span>
              <input v-model="baslangic" type="date"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Geçerlilik Bitiş</span>
              <input v-model="bitis" type="date"
                class="w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30" />
            </label>
          </div>

          <label class="flex cursor-pointer items-center gap-2 bg-surface-900 px-2.5 py-2 ring-1 ring-white/10">
            <input type="file" accept="application/pdf,image/*" class="hidden" @change="dosyaSec" />
            <span class="w-24 shrink-0 text-xs font-medium text-ink-muted">Belge Dosyası</span>
            <span class="min-w-0 flex-1 truncate text-xs" :class="dosya ? 'text-ink' : 'text-ink-muted/50'">
              {{ dosyaYukleniyor ? 'Yükleniyor…' : (dosya?.dosyaAdi || 'Dosya seç (PDF / Resim)') }}
            </span>
            <svg class="h-4 w-4 shrink-0 text-ink-muted" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" />
            </svg>
          </label>
        </div>

        <div class="mt-4 flex gap-1.5">
          <button type="button" @click="open = false"
            class="flex-1 bg-surface-800 px-4 py-2.5 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Vazgeç
          </button>
          <button type="button" :disabled="kaydediliyor || dosyaYukleniyor || !markaL.trim()" @click="kaydet"
            class="flex-1 bg-[#2b5c3d] px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
