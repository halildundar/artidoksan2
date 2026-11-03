<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  createAksamBelgesi, getAksamBelgesi, updateAksamBelgesi, getBilesenTipleri,
  type AksamBelgesi, type BilesenTipi,
} from '@/services/aksamBelgesiService';
import { getOnayliKurumSecenekleri, type OnayliKurumSecenek } from '@/services/onayliKurumService';
import { uploadDosya, getDosyaUrl, getDosyaIndirUrl, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import AramaliSelect from '@/components/AramaliSelect.vue';

// Güvenlik aksamı / bileşen komponenti (katalog belgesi) EKLE/DÜZENLE popup'ı:
// asansör popup'larından (Hız Regülatörü, Fren, Tampon…) ayrılmadan açılır.
// Bileşen tipi popup'ı açan yerden gelir ve değiştirilemez. Kaydet: belgeId
// verilmişse günceller, yoksa yeni ekler; sonra "kaydedildi" ile kaydı geri
// verip kapanır. Vazgeç hiçbir şey kaydetmeden kapatır.
const props = defineProps<{ bilesenTipiKodu: string; belgeId?: string | null }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ kaydedildi: [belge: AksamBelgesi] }>();

const duzenleme = computed(() => !!props.belgeId);

const form = ref({
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
const tipSatirlari = ref<{ deger: string }[]>([]);
const tipler = ref<BilesenTipi[]>([]);
const kurumlar = ref<OnayliKurumSecenek[]>([]);
const yukleniyor = ref(false);
const kaydediliyor = ref(false);
const dosyaYukleniyor = ref(false);
const hata = ref('');

const tip = computed(() => tipler.value.find((t) => t.kod === props.bilesenTipiKodu) ?? null);
const guvenlikAksamiMi = computed(() => tip.value?.kategori !== 'asansor_bileseni');
const gecerli = computed(() => !guvenlikAksamiMi.value || form.value.marka.trim() !== '');

const kurumSecenekleri = computed(() =>
  kurumlar.value.map((k) => ({ label: `${k.nobo} — ${k.unvan}`, value: k._id }))
);
const kurumModel = computed<string | number | null>({
  get: () => form.value.onayliKurumId || null,
  set(v) { form.value.onayliKurumId = typeof v === 'string' ? v : ''; },
});

function bosForm() {
  form.value = {
    marka: '', sertifikaNo: '', gecerlilikBaslangic: '', gecerlilikBitis: '', modulKodu: '',
    onayliKurumId: '', belgeTipi: '', aciklama: '', durum: 'aktif', dosya: undefined,
  };
  tipSatirlari.value = [{ deger: '' }];
}

// Her açılışta temiz başlanır. Yeni eklemede form HEMEN görünür (tip/kurum
// listeleri arkada yüklenir); düzenlemede kayıt sunucudan okunana dek beklenir.
watch(open, async (acik) => {
  if (!acik) return;
  hata.value = '';
  bosForm();
  yukleniyor.value = !!props.belgeId;
  try {
    const listeler = Promise.all([getBilesenTipleri(), getOnayliKurumSecenekleri()]).then(([t, k]) => {
      tipler.value = t;
      kurumlar.value = k;
    });
    if (props.belgeId) {
      const [b] = await Promise.all([getAksamBelgesi(props.belgeId), listeler]);
      tipSatirlari.value = b.tipler.map((t) => ({ deger: t }));
      form.value = {
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
    } else {
      await listeler;
    }
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Veriler yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
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
    form.value.dosya = await uploadDosya(file);
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Yükleme başarısız';
  } finally {
    dosyaYukleniyor.value = false;
  }
}

const { openFile } = useFileViewer();

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

async function kaydet() {
  if (!gecerli.value || kaydediliyor.value || dosyaYukleniyor.value) return;
  kaydediliyor.value = true;
  hata.value = '';
  try {
    const kurum = kurumlar.value.find((k) => k._id === form.value.onayliKurumId);
    const payload = {
      bilesenTipiKodu: props.bilesenTipiKodu,
      marka: form.value.marka.trim(),
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
    const belge = props.belgeId
      ? await updateAksamBelgesi(props.belgeId, payload)
      : await createAksamBelgesi(payload);
    emit('kaydedildi', belge);
    open.value = false;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kayıt başarısız';
  } finally {
    kaydediliyor.value = false;
  }
}

const girdiSinifi =
  'w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30';
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[60] flex flex-col bg-[#101a14]">
      <div
        class="flex shrink-0 items-center justify-between border-b border-white/5 bg-surface-bar px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 class="truncate text-sm font-bold text-ink">
          {{ duzenleme ? 'Komponenti Düzenle' : 'Yeni Komponent' }}<template v-if="tip"> — {{ tip.ad }}</template>
        </h2>
        <button type="button" @click="open = false"
          class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink-muted ring-1 ring-white/10">
          ✕
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <div class="mx-auto max-w-lg space-y-2 p-4">
          <p v-if="hata" class="bg-red-950/60 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/20">{{ hata }}</p>
          <p v-if="yukleniyor" class="py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>

          <form v-else id="komponent-form" class="space-y-2" @submit.prevent="kaydet">
            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Marka {{ guvenlikAksamiMi ? '*' : '' }}</span>
                <input v-model="form.marka" type="text" placeholder="Örn. Wittur" :class="girdiSinifi" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Sertifika No</span>
                <input v-model="form.sertifikaNo" type="text" :class="girdiSinifi" />
              </label>
            </div>

            <div class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Tipler</span>
              <div class="flex flex-wrap items-center gap-1.5">
                <span v-for="(satir, i) in tipSatirlari" :key="i"
                  class="inline-flex items-center gap-1 bg-surface-900 py-1 pl-2 pr-1 ring-1 ring-white/10 focus-within:ring-white/30">
                  <input v-model="satir.deger" type="text" placeholder="örn. RV-30"
                    class="w-24 bg-transparent text-xs text-ink outline-none placeholder:text-ink-muted/40" />
                  <button type="button" @click="tipSatirlari.splice(i, 1)" aria-label="Kaldır"
                    class="grid h-5 w-5 shrink-0 place-items-center text-sm leading-none text-ink-muted active:text-red-400">
                    ×
                  </button>
                </span>
                <button type="button" @click="tipSatirlari.push({ deger: '' })"
                  class="border border-dashed border-white/20 px-3 py-1.5 text-xs text-ink-muted active:border-white/40 active:text-ink">
                  + Tip ekle
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-1.5">
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Geçerlilik Başlangıç</span>
                <input v-model="form.gecerlilikBaslangic" type="date" :class="girdiSinifi" />
              </label>
              <label class="block space-y-0.5">
                <span class="text-xs font-medium text-ink-muted">Geçerlilik Bitiş</span>
                <input v-model="form.gecerlilikBitis" type="date" :class="girdiSinifi" />
              </label>
            </div>

            <template v-if="guvenlikAksamiMi">
              <div class="grid grid-cols-2 gap-1.5">
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Modül Kodu</span>
                  <input v-model="form.modulKodu" type="text" placeholder="Örn. Modül B" :class="girdiSinifi" />
                </label>
                <label class="block space-y-0.5">
                  <span class="text-xs font-medium text-ink-muted">Durum</span>
                  <select v-model="form.durum" :class="girdiSinifi">
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
              <input v-model="form.belgeTipi" type="text" placeholder="Örn. Tip Test Raporu" :class="girdiSinifi" />
            </label>

            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Açıklama</span>
              <textarea v-model="form.aciklama" rows="2" :class="girdiSinifi + ' resize-none'"></textarea>
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
              <button v-if="form.dosya" type="button" @click="belgeGoruntule" aria-label="Görüntüle"
                class="grid h-7 w-7 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div
        class="shrink-0 border-t border-white/5 bg-surface-bar p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div class="mx-auto flex max-w-lg gap-1.5">
          <button type="button" @click="open = false"
            class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Vazgeç
          </button>
          <button type="submit" form="komponent-form" :disabled="kaydediliyor || yukleniyor || dosyaYukleniyor || !gecerli"
            class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a] disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : duzenleme ? 'Güncelle' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
