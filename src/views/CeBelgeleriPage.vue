<script setup lang="ts">
import { IonPage, IonContent, IonHeader, onIonViewWillEnter } from '@ionic/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getAksamBelgeleri, deleteAksamBelgesi, type AksamBelgesi } from '@/services/aksamBelgesiService';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import { blurActive } from '@/utils/blurActive';

const router = useRouter();

const belgeler = ref<AksamBelgesi[]>([]);
const yukleniyor = ref(false);
const hata = ref('');
const arama = ref('');
const kategori = ref<'' | 'guvenlik_aksami' | 'asansor_bileseni'>('');

async function yukle() {
  yukleniyor.value = true;
  hata.value = '';
  try {
    belgeler.value = await getAksamBelgeleri({
      search: arama.value.trim() || undefined,
      kategori: kategori.value || undefined,
    });
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Belgeler yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}

function geri() {
  blurActive();
  router.back();
}

function git(path: string) {
  blurActive();
  router.push(path);
}

function kategoriSec(k: '' | 'guvenlik_aksami' | 'asansor_bileseni') {
  kategori.value = k;
  yukle();
}

// Silme onayı tarayıcının confirm'i yerine temaya uygun uygulama içi
// diyalogla sorulur (kullanıcı isteği).
const silinecek = ref<AksamBelgesi | null>(null);
const siliniyor = ref(false);

function sil(belge: AksamBelgesi) {
  blurActive();
  silinecek.value = belge;
}

async function silmeyiOnayla() {
  const belge = silinecek.value;
  if (!belge || siliniyor.value) return;
  siliniyor.value = true;
  hata.value = '';
  try {
    await deleteAksamBelgesi(belge._id);
    silinecek.value = null;
    await yukle();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Silinemedi';
    silinecek.value = null;
  } finally {
    siliniyor.value = false;
  }
}

function tarih(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR') : '';
}

onIonViewWillEnter(yukle);
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-bar">
        <header class="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <button type="button" @click="geri"
              class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <h1 class="truncate text-base font-bold leading-8 tracking-wide text-ink">Güvenlik Aksamlar</h1>
          </div>
          <button type="button" @click="git('/ayarlar/guvenlik-aksamlari/yeni')"
            class="flex shrink-0 items-center gap-1.5 bg-[#2b5c3d] px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Yeni Ekle
          </button>
        </header>

        <div class="mx-auto max-w-lg space-y-2 px-4 pb-3">
          <div class="flex gap-1">
            <button v-for="k in [['', 'Tümü'], ['guvenlik_aksami', 'Güvenlik Aksamı'], ['asansor_bileseni', 'Asansör Bileşeni']] as const"
              :key="k[0]" type="button" @click="kategoriSec(k[0])"
              class="px-3 py-1.5 text-[11px] font-semibold ring-1"
              :class="kategori === k[0] ? 'bg-[#223c2d] text-ink ring-white/10' : 'bg-surface-800 text-ink-muted ring-white/5'">
              {{ k[1] }}
            </button>
          </div>
          <div class="flex items-center gap-2 bg-surface-900 px-2.5 ring-1 ring-white/10 focus-within:ring-white/30">
            <svg class="h-4 w-4 shrink-0 text-ink-muted/60" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input v-model="arama" type="search" @keyup.enter="yukle" @input="!arama && yukle()"
              class="w-full bg-transparent py-1.5 text-xs text-ink outline-none placeholder:text-ink-muted/50"
              placeholder="Marka, sertifika no veya bileşen ara (Enter)" />
          </div>
        </div>
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

        <section class="space-y-2 px-4 pb-6 pt-4">
          <p v-if="yukleniyor" class="py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>
          <p v-else-if="!belgeler.length" class="py-8 text-center text-sm text-ink-muted">
            Kayıt yok. Sağ üstteki "Yeni Ekle" ile ekleyin.
          </p>

          <div v-for="belge in belgeler" :key="belge._id"
            class="flex items-center gap-3 bg-surface-800 p-3 ring-1 ring-white/5">
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm font-semibold text-ink">{{ belge.bilesenTipiAdi }}</span>
                <span v-if="belge.durum === 'pasif'"
                  class="shrink-0 bg-red-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/20">Pasif</span>
              </span>
              <span class="block truncate text-xs text-ink-muted">
                {{ [belge.marka, belge.sertifikaNo, belge.belgeTipi].filter(Boolean).join(' • ') || 'Bilgi girilmedi' }}
              </span>
              <span v-if="belge.gecerlilikBitis" class="mt-0.5 block text-[11px] text-ink-muted/80">
                Geçerlilik: {{ tarih(belge.gecerlilikBaslangic) }} — {{ tarih(belge.gecerlilikBitis) }}
              </span>
            </span>
            <button type="button" @click="git(`/ayarlar/guvenlik-aksamlari/${belge._id}/duzenle`)"
              class="grid h-8 w-8 shrink-0 place-items-center bg-surface-900 text-ink-muted ring-1 ring-white/10 active:bg-[#1a2a20]"
              aria-label="Düzenle">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.17 6.83a2.85 2.85 0 0 0-4-4L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <button type="button" @click="sil(belge)"
              class="grid h-8 w-8 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20 active:bg-red-950/40"
              aria-label="Sil">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        </section>
      </div>
    </ion-content>

    <!-- Silme onayı diyaloğu -->
    <SilmeOnayi :acik="!!silinecek" :siliniyor="siliniyor"
      :aciklama="silinecek ? [silinecek.bilesenTipiAdi, silinecek.marka, silinecek.sertifikaNo ? `(${silinecek.sertifikaNo})` : ''].filter(Boolean).join(' — ') : ''"
      @vazgec="silinecek = null" @onayla="silmeyiOnayla" />
  </ion-page>
</template>
