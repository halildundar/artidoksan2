<script setup lang="ts">
import { IonPage, IonContent, IonHeader, onIonViewWillEnter } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  getKullanicilar, deleteKullanici, kullaniciDurumu, ROL_ETIKETLERI,
  type Kullanici, type KullaniciRolu,
} from '@/services/kullaniciService';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import { blurActive } from '@/utils/blurActive';

const router = useRouter();

const kullanicilar = ref<Kullanici[]>([]);
const yukleniyor = ref(false);
const hata = ref('');

async function yukle() {
  yukleniyor.value = true;
  hata.value = '';
  try {
    kullanicilar.value = await getKullanicilar();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kullanıcılar yüklenemedi';
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

// Roller sırayla gruplanır
const ROL_SIRASI: KullaniciRolu[] = ['admin', 'denetci', 'danisman'];
const gruplar = computed(() =>
  ROL_SIRASI.map((rol) => ({ rol, liste: kullanicilar.value.filter((k) => k.rol === rol) })).filter((g) => g.liste.length)
);

// Silme onayı uygulama içi diyalogla sorulur (proje kuralı — window.confirm yok)
const silinecek = ref<Kullanici | null>(null);
const siliniyor = ref(false);

async function silmeyiOnayla() {
  const k = silinecek.value;
  if (!k || siliniyor.value) return;
  siliniyor.value = true;
  try {
    await deleteKullanici(k._id);
    silinecek.value = null;
    await yukle();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Silinemedi';
    silinecek.value = null;
  } finally {
    siliniyor.value = false;
  }
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
            <h1 class="truncate text-base font-bold leading-8 tracking-wide text-ink">Kullanıcılar</h1>
          </div>
          <button type="button" @click="git('/ayarlar/kullanicilar/yeni')"
            class="flex shrink-0 items-center gap-1.5 bg-[#2b5c3d] px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
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

        <section class="space-y-3 px-4 pb-6 pt-4">
          <p v-if="yukleniyor" class="py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>
          <p v-else-if="!kullanicilar.length" class="py-8 text-center text-sm text-ink-muted">
            Henüz kullanıcı yok. "Yeni Ekle" ile ekleyin.
          </p>

          <div v-for="g in gruplar" :key="g.rol" class="space-y-2">
            <p class="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
              {{ ROL_ETIKETLERI[g.rol] }} ({{ g.liste.length }})
            </p>
            <div v-for="k in g.liste" :key="k._id"
              class="flex items-center gap-3 bg-surface-800 p-3 ring-1 ring-white/5">
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold text-ink">{{ `${k.ad} ${k.soyad}`.trim() }}</span>
                <span v-if="k.email" class="block truncate text-[11px] text-ink-muted">{{ k.email }}</span>
                <span class="mt-0.5 flex flex-wrap items-center gap-1">
                  <span class="inline-block bg-[#1c2a21] px-2 py-0.5 text-[10px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                    {{ ROL_ETIKETLERI[k.rol] }}
                  </span>
                  <span class="inline-block px-2 py-0.5 text-[10px] font-semibold ring-1" :class="kullaniciDurumu(k).sinif">
                    {{ kullaniciDurumu(k).etiket }}
                  </span>
                </span>
              </span>
              <button type="button" @click="git(`/ayarlar/kullanicilar/${k._id}/duzenle`)"
                class="grid h-8 w-8 shrink-0 place-items-center bg-surface-900 text-ink-muted ring-1 ring-white/10 active:bg-[#1a2a20]"
                aria-label="Düzenle">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21.17 6.83a2.85 2.85 0 0 0-4-4L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
                  <path d="m15 5 4 4" />
                </svg>
              </button>
              <button type="button" @click="silinecek = k"
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
          </div>
        </section>
      </div>
    </ion-content>

    <SilmeOnayi :acik="!!silinecek" :siliniyor="siliniyor"
      :aciklama="silinecek ? `${silinecek.ad} ${silinecek.soyad}`.trim() : ''"
      @vazgec="silinecek = null" @onayla="silmeyiOnayla" />
  </ion-page>
</template>
