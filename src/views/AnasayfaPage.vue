<script setup lang="ts">
import { IonPage, IonContent, IonHeader, onIonViewWillEnter } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import KullaniciMenusu from '@/components/KullaniciMenusu.vue';
import { useAuth } from '@/composables/useAuth';
import { getIstatistik, type Istatistik, type KomponentTipSayisi, type SonAsansor, type SonTescil } from '@/services/istatistikService';
import { blurActive } from '@/utils/blurActive';

// Anasayfa: genel durum panelleri — firma / asansör / denetim / tescil sayıları ve
// güvenlik komponentlerinin (CE-aksam belgeleri) aktif–pasif dağılımı
const router = useRouter();
const { kullanici } = useAuth();

const veri = ref<Istatistik | null>(null);
const yukleniyor = ref(false);
const hata = ref('');

async function yukle() {
  yukleniyor.value = true;
  hata.value = '';
  try {
    veri.value = await getIstatistik();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'İstatistikler yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
}
onIonViewWillEnter(yukle);

function git(yol: string) {
  blurActive();
  router.push(yol);
}

const sayi = (n: number | undefined) => (n ?? 0).toLocaleString('tr-TR');
const bugun = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
const selam = computed(() => {
  const s = new Date().getHours();
  return s < 6 ? 'İyi geceler' : s < 12 ? 'Günaydın' : s < 18 ? 'İyi günler' : 'İyi akşamlar';
});

// Üst kutucuklar: tıklayınca ilgili sekmeye gider
const kutular = computed(() => {
  const v = veri.value;
  return [
    { ad: 'Firma', deger: v?.firma, yol: '/firma', ikon: 'firma' },
    { ad: 'Asansör', deger: v?.asansor, yol: '/asansor', ikon: 'asansor' },
    { ad: 'Denetim', deger: v?.denetim, yol: '/denetim', ikon: 'denetim' },
    { ad: 'Tescil', deger: v?.tescil, yol: '/tescil', ikon: 'tescil' },
  ];
});

// Aktif oranı (%)
const oran = (a: number, p: number) => (a + p ? Math.round((a / (a + p)) * 100) : 0);
const toplam = computed(() => veri.value?.komponent.toplam ?? { aktif: 0, pasif: 0 });
const toplamAdet = computed(() => toplam.value.aktif + toplam.value.pasif);

// Bileşen tipleri: belgesi olanlar, toplam adede göre; çubuklar en kalabalık tipe göre ölçeklenir
const tipGrubu = (kat: KomponentTipSayisi['kategori']) =>
  (veri.value?.komponent.tipler ?? [])
    .filter((t) => t.kategori === kat && t.aktif + t.pasif > 0)
    .sort((a, b) => b.aktif + b.pasif - (a.aktif + a.pasif));
const enBuyuk = computed(() => Math.max(1, ...(veri.value?.komponent.tipler ?? []).map((t) => t.aktif + t.pasif)));
const genislik = (n: number) => `${Math.max(0, (n / enBuyuk.value) * 100)}%`;

const gruplar = computed(() => [
  { baslik: 'Güvenlik aksamları', alt: veri.value?.komponent.guvenlik, tipler: tipGrubu('guvenlik_aksami') },
  { baslik: 'Asansör bileşenleri', alt: veri.value?.komponent.bilesen, tipler: tipGrubu('asansor_bileseni') },
]);

// Asansör satırı özellikleri (aralarında nokta): MR/MRL · hız · kapasite · tahrik · askı
const num = (n: number) => String(n).replace('.', ',');
function ozellikler(a: SonAsansor | SonTescil): string[] {
  return [
    a.makinaKonumu ?? '',
    a.hiz ? `${num(a.hiz)} m/s` : '',
    a.beyanYuku ? `${sayi(a.beyanYuku)} kg` : '',
    a.tahrikTipi === 'elektrikli' ? 'Elektrikli' : a.tahrikTipi === 'hidrolik' ? 'Hidrolik' : '',
    a.askiTipi ? `${a.askiTipi} askı` : '',
  ].filter(Boolean);
}
const kisaTarih = (iso: string) => (iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

const AKTIF = '#3fa56d';
const PASIF = '#8a978e';
</script>

<template>
  <ion-page>
    <!-- Header: scroll boyunca üstte sabit -->
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-bar">
        <header class="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <h1 class="text-xl font-bold leading-8 tracking-wide text-ink">Anasayfa</h1>
          <KullaniciMenusu />
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg space-y-4 px-4 pb-8 pt-4">
        <!-- Karşılama -->
        <div>
          <p class="text-lg font-bold text-ink">{{ selam }}<span v-if="kullanici">, {{ kullanici.ad }}</span></p>
          <p class="text-xs capitalize text-ink-muted">{{ bugun }}</p>
        </div>

        <div v-if="hata" class="flex items-center gap-2 bg-red-950/60 px-3 py-2 ring-1 ring-red-500/20">
          <span class="min-w-0 flex-1 text-sm text-red-300">{{ hata }}</span>
          <button type="button" @click="yukle"
            class="shrink-0 bg-surface-800 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-white/10">Tekrar Dene</button>
        </div>

        <!-- Özet kutucukları -->
        <section class="grid grid-cols-2 gap-2" aria-label="Genel sayılar">
          <button v-for="k in kutular" :key="k.ad" type="button" @click="git(k.yol)"
            class="group relative overflow-hidden bg-surface-800 p-3.5 text-left ring-1 ring-white/5 transition active:bg-[#1a2a20]">
            <span class="absolute -right-3 -top-3 grid h-14 w-14 place-items-center rounded-full opacity-[0.12]" style="background: #3fa56d" aria-hidden="true"></span>
            <span class="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <template v-if="k.ikon === 'firma'">
                  <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
                </template>
                <template v-else-if="k.ikon === 'asansor'">
                  <rect x="4" y="3" width="16" height="18" rx="2" /><path d="m9 10 3-3 3 3M9 14l3 3 3-3" />
                </template>
                <template v-else-if="k.ikon === 'denetim'">
                  <rect x="5" y="3" width="14" height="18" rx="2" /><path d="m9 12 2 2 4-4" />
                </template>
                <template v-else>
                  <path d="M14 13V6a2 2 0 0 0-4 0v7" /><path d="M5 13h14v4H5z" /><path d="M4 21h16" />
                </template>
              </svg>
              {{ k.ad }}
            </span>
            <span class="relative mt-2 block text-3xl font-bold leading-none tabular-nums text-ink">
              <template v-if="veri">{{ sayi(k.deger) }}</template>
              <span v-else class="inline-block h-7 w-12 animate-pulse bg-white/10 align-middle"></span>
            </span>
          </button>
        </section>

        <!-- Son asansörler ve denetimler: yan yana paneller, toplam adet + son 10 kayıt -->
        <section class="grid grid-cols-2 gap-2" aria-label="Son kayıtlar">
          <!-- Asansörler -->
          <div class="min-w-0 space-y-2 bg-surface-800 p-3 ring-1 ring-white/5">
            <div class="flex items-start justify-between gap-1">
              <div class="min-w-0">
                <h2 class="truncate text-[11px] font-bold uppercase tracking-wide text-ink">Asansörler</h2>
                <p class="mt-1 text-2xl font-bold leading-none tabular-nums text-ink">{{ veri ? sayi(veri.asansor) : '—' }}</p>
                <p class="mt-0.5 text-[10px] text-ink-muted">toplam · son 10</p>
              </div>
              <button type="button" @click="git('/asansor')" class="shrink-0 text-[10px] font-semibold text-ink-muted underline">Tümü</button>
            </div>
            <p v-if="veri && !veri.sonAsansorler.length" class="text-[11px] text-ink-muted/70">Henüz asansör yok.</p>
            <ul class="divide-y divide-white/5">
              <li v-for="a in veri?.sonAsansorler ?? []" :key="a._id">
                <button type="button" @click="git(`/asansor/${a._id}`)" class="block w-full min-w-0 py-1.5 text-left active:opacity-70">
                  <span class="block truncate text-xs font-semibold text-ink">{{ a.seriNo || a.yapiRuhsatNo || '—' }}</span>
                  <span v-if="a.ilce || a.il" class="block truncate text-[10px] text-ink-muted/80">{{ [a.ilce, a.il].filter(Boolean).join('/') }}</span>
                  <span class="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] leading-tight text-ink-muted">
                    <template v-for="(o, i) in ozellikler(a)" :key="i">
                      <span v-if="i" class="text-ink-muted/50" aria-hidden="true">·</span>
                      <span :class="i === 0 ? 'font-semibold text-[#3fa56d]' : ''">{{ o }}</span>
                    </template>
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <!-- Denetimler -->
          <div class="min-w-0 space-y-2 bg-surface-800 p-3 ring-1 ring-white/5">
            <div class="flex items-start justify-between gap-1">
              <div class="min-w-0">
                <h2 class="truncate text-[11px] font-bold uppercase tracking-wide text-ink">Denetimler</h2>
                <p class="mt-1 text-2xl font-bold leading-none tabular-nums text-ink">{{ veri ? sayi(veri.denetim) : '—' }}</p>
                <p class="mt-0.5 text-[10px] text-ink-muted">toplam · son 10</p>
              </div>
              <button type="button" @click="git('/denetim')" class="shrink-0 text-[10px] font-semibold text-ink-muted underline">Tümü</button>
            </div>
            <p v-if="veri && !veri.sonDenetimler.length" class="text-[11px] text-ink-muted/70">Henüz denetim yok.</p>
            <ul class="divide-y divide-white/5">
              <li v-for="d in veri?.sonDenetimler ?? []" :key="d._id">
                <button type="button" @click="git(`/denetim/${d._id}`)" class="block w-full min-w-0 py-1.5 text-left active:opacity-70">
                  <span class="flex items-center gap-1.5">
                    <span class="shrink-0 bg-[#1c2a21] px-1.5 py-px text-[10px] font-semibold text-[#6fcf97] ring-1 ring-white/10">{{ d.modul.replace('Modul ', 'M ') || '—' }}</span>
                    <span class="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{{ d.asansor || '—' }}</span>
                  </span>
                  <span class="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] leading-tight text-ink-muted">
                    <span v-if="d.firma" class="min-w-0 truncate">{{ d.firma }}</span>
                    <span v-if="d.firma && d.tarih" class="text-ink-muted/50" aria-hidden="true">·</span>
                    <span v-if="d.tarih" class="tabular-nums">{{ kisaTarih(d.tarih) }}</span>
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <!-- Tescil: iki sütunlu düzende alt satıra sarılır -->
          <div class="min-w-0 space-y-2 bg-surface-800 p-3 ring-1 ring-white/5">
            <div class="flex items-start justify-between gap-1">
              <div class="min-w-0">
                <h2 class="truncate text-[11px] font-bold uppercase tracking-wide text-ink">Tescil</h2>
                <p class="mt-1 text-2xl font-bold leading-none tabular-nums text-ink">{{ veri ? sayi(veri.tescil) : '—' }}</p>
                <p class="mt-0.5 text-[10px] text-ink-muted">toplam · son 10</p>
              </div>
              <button type="button" @click="git('/tescil')" class="shrink-0 text-[10px] font-semibold text-ink-muted underline">Tümü</button>
            </div>
            <p v-if="veri && !veri.sonTescilKayitlari.length" class="text-[11px] text-ink-muted/70">Henüz tescil yok.</p>
            <ul class="divide-y divide-white/5">
              <li v-for="t in veri?.sonTescilKayitlari ?? []" :key="t._id">
                <button type="button" @click="git(`/tescil/${t._id}`)" class="block w-full min-w-0 py-1.5 text-left active:opacity-70">
                  <span class="block truncate text-xs font-semibold text-ink">{{ t.asansor || '—' }}</span>
                  <span class="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] leading-tight text-ink-muted/80">
                    <span v-if="t.firma" class="min-w-0 truncate">{{ t.firma }}</span>
                    <span v-if="t.firma && t.belediye" class="text-ink-muted/50" aria-hidden="true">·</span>
                    <span v-if="t.belediye" class="min-w-0 truncate">{{ t.belediye }}</span>
                  </span>
                  <span class="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] leading-tight text-ink-muted">
                    <template v-for="(o, i) in ozellikler(t)" :key="i">
                      <span v-if="i" class="text-ink-muted/50" aria-hidden="true">·</span>
                      <span :class="i === 0 ? 'font-semibold text-[#3fa56d]' : ''">{{ o }}</span>
                    </template>
                    <template v-if="t.tarih">
                      <span v-if="ozellikler(t).length" class="text-ink-muted/50" aria-hidden="true">·</span>
                      <span class="tabular-nums">{{ kisaTarih(t.tarih) }}</span>
                    </template>
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </section>

        <!-- Güvenlik komponentleri: toplam, aktif/pasif -->
        <section class="space-y-3 bg-surface-800 p-4 ring-1 ring-white/5" aria-label="Güvenlik komponentleri">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-xs font-bold uppercase tracking-wide text-ink">Güvenlik komponentleri</h2>
              <p class="mt-0.5 text-[11px] text-ink-muted">CE / aksam sertifika belgeleri</p>
            </div>
            <button type="button" @click="git('/ayarlar/guvenlik-aksamlari')"
              class="shrink-0 text-[11px] font-semibold text-ink-muted underline">Tümü</button>
          </div>

          <div class="flex items-end gap-4">
            <div>
              <p class="text-4xl font-bold leading-none tabular-nums text-ink">{{ veri ? sayi(toplamAdet) : '—' }}</p>
              <p class="mt-1 text-[11px] text-ink-muted">toplam belge</p>
            </div>
            <div class="min-w-0 flex-1 space-y-1.5">
              <!-- Aktif / pasif oranı: 2px yüzey boşluklu iki parça -->
              <div class="flex h-3 gap-[2px] overflow-hidden" role="img"
                :aria-label="`Aktif ${toplam.aktif}, pasif ${toplam.pasif}`">
                <div :style="{ width: `${oran(toplam.aktif, toplam.pasif)}%`, background: AKTIF }" class="min-w-0 transition-all"></div>
                <div v-if="toplam.pasif" :style="{ width: `${100 - oran(toplam.aktif, toplam.pasif)}%`, background: PASIF, opacity: 0.55 }" class="min-w-0 transition-all"></div>
              </div>
              <div class="flex items-center justify-between text-[11px] text-ink-muted">
                <span class="flex items-center gap-1.5"><i class="inline-block h-2.5 w-2.5" :style="{ background: AKTIF }"></i>Aktif <b class="tabular-nums text-ink">{{ sayi(toplam.aktif) }}</b></span>
                <span class="flex items-center gap-1.5"><i class="inline-block h-2.5 w-2.5" :style="{ background: PASIF, opacity: 0.55 }"></i>Pasif <b class="tabular-nums text-ink">{{ sayi(toplam.pasif) }}</b></span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-center">
            <div>
              <p class="text-lg font-bold tabular-nums text-ink">{{ veri ? `%${oran(toplam.aktif, toplam.pasif)}` : '—' }}</p>
              <p class="text-[10px] text-ink-muted">aktif oranı</p>
            </div>
            <div>
              <p class="text-lg font-bold tabular-nums text-ink">{{ veri ? sayi(veri.komponent.guvenlik.aktif) : '—' }}</p>
              <p class="text-[10px] text-ink-muted">aktif güvenlik aksamı</p>
            </div>
            <div>
              <p class="text-lg font-bold tabular-nums" :class="veri?.komponent.yakinda ? 'text-amber-300' : 'text-ink'">{{ veri ? sayi(veri.komponent.yakinda) : '—' }}</p>
              <p class="text-[10px] text-ink-muted">90 gün içinde dolacak</p>
            </div>
          </div>
        </section>

        <!-- Komponent türüne göre dağılım -->
        <section v-for="g in gruplar" :key="g.baslik" class="space-y-2.5 bg-surface-800 p-4 ring-1 ring-white/5">
          <div class="flex items-baseline justify-between gap-2">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink">{{ g.baslik }}</h2>
            <p v-if="g.alt" class="text-[11px] text-ink-muted tabular-nums">
              {{ sayi(g.alt.aktif) }} aktif<span v-if="g.alt.pasif"> · {{ sayi(g.alt.pasif) }} pasif</span>
            </p>
          </div>
          <p v-if="veri && !g.tipler.length" class="text-xs text-ink-muted/70">Henüz belge yok.</p>
          <ul class="space-y-2">
            <li v-for="t in g.tipler" :key="t.kod" :title="`${t.ad}: ${t.aktif} aktif, ${t.pasif} pasif`">
              <div class="flex items-baseline justify-between gap-2 text-xs">
                <span class="min-w-0 truncate text-ink">{{ t.ad }}</span>
                <span class="shrink-0 tabular-nums text-ink-muted">
                  <b class="text-ink">{{ sayi(t.aktif) }}</b><span v-if="t.pasif"> / {{ sayi(t.pasif) }}</span>
                </span>
              </div>
              <!-- Çubuk: en kalabalık türe göre ölçekli, aktif + pasif parçaları 2px boşluklu -->
              <div class="mt-1 flex h-2 gap-[2px]">
                <div :style="{ width: genislik(t.aktif), background: AKTIF }" class="min-w-[2px] transition-all" v-if="t.aktif"></div>
                <div :style="{ width: genislik(t.pasif), background: PASIF, opacity: 0.55 }" class="min-w-[2px] transition-all" v-if="t.pasif"></div>
              </div>
            </li>
          </ul>
        </section>

        <p v-if="yukleniyor && veri" class="text-center text-[11px] text-ink-muted/70">Güncelleniyor…</p>
      </div>
    </ion-content>
  </ion-page>
</template>
