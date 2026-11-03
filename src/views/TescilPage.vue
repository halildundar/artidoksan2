<script setup lang="ts">
import { IonPage, IonContent, IonHeader, onIonViewWillEnter } from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { getTesciller, createTescil, deleteTescil, type Tescil } from '@/services/tescilService';
import type { DenetimFirmaOzet, DenetimAsansorOzet } from '@/services/denetimService';
import { getFirmalar, type Firma } from '@/services/firmaService';
import { getAsansorler, type Asansor } from '@/services/asansorService';
import AramaliSelect from '@/components/AramaliSelect.vue';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import { blurActive } from '@/utils/blurActive';
import { useRouter } from 'vue-router';

// Tescil listesi — Modul G denetim akışıyla aynı düzen: firma + asansör +
// tarih ile kayıt açılır, satıra dokununca tescil detayına geçilir.
const router = useRouter();

const tesciller = ref<Tescil[]>([]);
const yukleniyor = ref(false);
const hata = ref('');

async function yukle() {
  yukleniyor.value = true;
  hata.value = '';
  try {
    tesciller.value = await getTesciller();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Tesciller yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

onIonViewWillEnter(yukle);

// Populate edilmiş firma/asansör özetleri (liste gösterimi)
function firmaAdi(t: Tescil): string {
  const f = t.firmaId as DenetimFirmaOzet | null;
  return f && typeof f === 'object' ? f.ad : '—';
}

function asansorOzeti(t: Tescil): string {
  const a = t.asansorId as DenetimAsansorOzet | null;
  if (!a || typeof a !== 'object') return '—';
  const konum = [a.ilce, a.il].filter(Boolean).join('/');
  return [a.seriNo || a.yapiRuhsatNo || '—', konum].filter(Boolean).join(' • ');
}

function tarih(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR') : '—';
}

function detayAc(t: Tescil) {
  blurActive();
  router.push(`/tescil/${t._id}`);
}

// ---- Yeni tescil popup'ı (tam sayfa): yalnız firma + asansör; tarihler
// tescil detayındaki Yazdırma Bilgileri'nden girilir ----
const ekleAcik = ref(false);
const kaydediliyor = ref(false);
const form = ref<{
  firmaId: string | null; asansorId: string | null;
}>({ firmaId: null, asansorId: null });

const firmalar = ref<Firma[]>([]);
const firmaSecenekleri = computed(() => firmalar.value.map((f) => ({ label: f.ad, value: f._id })));

const asansorler = ref<Asansor[]>([]);
const asansorlerYukleniyor = ref(false);
const asansorSecenekleri = computed(() =>
  asansorler.value.map((a) => {
    const konum = [a.ilce, a.il].filter(Boolean).join('/');
    return { label: [a.seriNo || a.yapiRuhsatNo || a._id, konum].filter(Boolean).join(' • '), value: a._id };
  })
);

function ekleAc() {
  blurActive();
  form.value = { firmaId: null, asansorId: null };
  asansorler.value = [];
  ekleAcik.value = true;
  if (!firmalar.value.length) {
    getFirmalar()
      .then((liste) => (firmalar.value = liste))
      .catch(() => { /* liste alınamazsa seçenekler boş kalır */ });
  }
}

// Firma değişince o firmanın asansörleri yüklenir, asansör seçimi sıfırlanır
watch(() => form.value.firmaId, async (firmaId) => {
  form.value.asansorId = null;
  asansorler.value = [];
  if (!firmaId) return;
  asansorlerYukleniyor.value = true;
  try {
    asansorler.value = await getAsansorler({ firmaId });
  } catch {
    asansorler.value = [];
  } finally {
    asansorlerYukleniyor.value = false;
  }
});

const kaydedilebilir = computed(() => !!form.value.firmaId && !!form.value.asansorId);

async function kaydet() {
  if (!kaydedilebilir.value || kaydediliyor.value) return;
  kaydediliyor.value = true;
  hata.value = '';
  try {
    await createTescil({
      firmaId: form.value.firmaId!,
      asansorId: form.value.asansorId!,
    });
    ekleAcik.value = false;
    await yukle();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Tescil kaydedilemedi';
  } finally {
    kaydediliyor.value = false;
  }
}

// ---- Silme (SilmeOnayi ile) ----
const silinecek = ref<Tescil | null>(null);
const siliniyor = ref(false);

async function silOnayla() {
  const t = silinecek.value;
  if (!t) return;
  siliniyor.value = true;
  try {
    await deleteTescil(t._id);
    tesciller.value = tesciller.value.filter((x) => x._id !== t._id);
    silinecek.value = null;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Tescil silinemedi';
    silinecek.value = null;
  } finally {
    siliniyor.value = false;
  }
}
</script>

<template>
  <ion-page>
    <!-- Header: scroll boyunca üstte sabit -->
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-bar">
        <header class="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <h1 class="text-xl font-bold leading-8 tracking-wide text-ink">Tescil</h1>
          <button type="button" @click="ekleAc"
            class="flex items-center gap-1.5 bg-[#2b5c3d] px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Yeni Ekle
          </button>
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg">
        <div v-if="hata"
          class="mx-4 mt-4 flex items-center gap-2 bg-red-950/60 px-3 py-2 ring-1 ring-red-500/20">
          <span class="min-w-0 flex-1 text-sm text-red-300">{{ hata }}</span>
          <button type="button" @click="yukle"
            class="shrink-0 bg-surface-800 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-white/10">
            Tekrar Dene
          </button>
        </div>

        <!-- Tescil listesi -->
        <section class="space-y-2 px-4 pb-6 pt-4">
          <p v-if="yukleniyor" class="py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>
          <p v-else-if="!tesciller.length" class="py-8 text-center text-sm text-ink-muted">
            Henüz tescil yok. Sağ üstteki "Yeni Ekle" ile ilk tescili ekleyin.
          </p>

          <div v-for="t in tesciller" :key="t._id"
            class="flex w-full items-center gap-3 bg-surface-800 p-3 ring-1 ring-white/5">
            <!-- Satıra dokununca tescil detayı açılır -->
            <button type="button" class="min-w-0 flex-1 text-left" @click="detayAc(t)">
              <span class="flex items-center gap-2">
                <span class="shrink-0 bg-[#1c2a21] px-2 py-0.5 text-[11px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                  Tescil
                </span>
                <span class="truncate text-xs font-semibold text-ink">{{ firmaAdi(t) }}</span>
              </span>
              <span class="mt-1 block truncate text-[11px] text-ink-muted">{{ asansorOzeti(t) }}</span>
              <span class="mt-0.5 block text-[11px] text-ink-muted/80">
                AB Uygunluk: {{ tarih(t.abUygunlukBeyaniTarihi) }} • Son Kontrol: {{ tarih(t.sonKontrolTarihi) }}
              </span>
            </button>
            <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <button type="button" @click="silinecek = t" aria-label="Tescili sil"
              class="grid h-7 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">
              ✕
            </button>
          </div>
        </section>
      </div>
    </ion-content>

    <!-- Yeni tescil popup'ı — tam sayfa -->
    <Teleport to="body">
      <div v-if="ekleAcik" class="fixed inset-0 z-50 flex flex-col bg-[#101a14]">
        <div
          class="flex shrink-0 items-center justify-between border-b border-white/5 bg-surface-bar px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 class="truncate text-sm font-bold text-ink">Yeni Tescil</h2>
          <button type="button" @click="ekleAcik = false"
            class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink-muted ring-1 ring-white/10">
            ✕
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-auto">
          <div class="mx-auto max-w-lg space-y-2 p-4">
            <!-- Önce firma, ardından o firmanın asansörü seçilir -->
            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Asansör Firması *</span>
              <AramaliSelect v-model="form.firmaId" :options="firmaSecenekleri"
                placeholder="Firma seçiniz" />
            </label>

            <label class="block space-y-0.5">
              <span class="text-xs font-medium text-ink-muted">Asansör *</span>
              <AramaliSelect v-model="form.asansorId" :options="asansorSecenekleri"
                :disabled="!form.firmaId || asansorlerYukleniyor"
                :placeholder="!form.firmaId
                  ? 'Önce firma seçiniz'
                  : asansorlerYukleniyor
                    ? 'Yükleniyor…'
                    : asansorler.length ? 'Asansör seçiniz' : 'Bu firmada asansör yok'" />
            </label>
          </div>
        </div>

        <div
          class="shrink-0 border-t border-white/5 bg-surface-bar p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div class="mx-auto flex max-w-lg gap-1.5">
            <button type="button" @click="ekleAcik = false"
              class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
              Vazgeç
            </button>
            <button type="button" @click="kaydet" :disabled="!kaydedilebilir || kaydediliyor"
              class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
              {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <SilmeOnayi :acik="silinecek != null" :siliniyor="siliniyor"
      :aciklama="silinecek
        ? `Tescil — ${firmaAdi(silinecek)} (${asansorOzeti(silinecek)}) kaydı silinecek. Emin misiniz?`
        : ''"
      @vazgec="silinecek = null" @onayla="silOnayla" />
  </ion-page>
</template>
