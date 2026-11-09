<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import type { Firma } from '@/services/firmaService';
import { getKys, saveKys } from '@/services/kysService';
import {
  eksikKysBilgileri, firmaLogosu, FIRMA_KAYNAKLI_ALANLAR, kysBaglami, kysKayitVerisi, kysMotoruKur, type KysMotor,
} from '@/utils/kys/kysMotor';
import KysKayitlar from './KysKayitlar.vue';
import KysOnizleme from './KysOnizleme.vue';
import KysSablonlar from './KysSablonlar.vue';

// Firma > KYS: Modül E Kalite El Kitabı. Firma bilgileri firma kaydından otomatik gelir; yalnız elle
// girilenler (ve politika, hedef, doküman listesi, revizyon, uygulama kayıtları) KYS verisine kaydedilir.
const props = defineProps<{ firma: Firma }>();
const emit = defineEmits<{ kapat: [] }>();

const SEKMELER = [
  ['bilgiler', 'Bilgiler'], ['politika', 'Politika ve hedefler'], ['dokumanlar', 'Doküman listesi'],
  ['revizyon', 'Revizyon'], ['sablonlar', 'Şablonlar'], ['kayitlar', 'Uygulama kayıtları'], ['elkitabi', 'El kitabı'],
] as const;

const sekme = ref<(typeof SEKMELER)[number][0]>('bilgiler');
const yukleniyor = ref(true);
const hata = ref('');
const durum = ref('');
const surum = ref(0);
const motor = shallowRef<KysMotor | null>(null);
const girilen = ref<Record<string, string>>({});
const firmaAlanlari = ref<Record<string, string>>({});
const logoVar = ref(false);
const durumMesaji = ref('');

let kayitZamani: ReturnType<typeof setTimeout> | null = null;
let kaydedilecek = false;

onMounted(async () => {
  try {
    const [kys, logo, baglam] = await Promise.all([getKys(props.firma._id), firmaLogosu(props.firma), kysBaglami(props.firma)]);
    const kurulum = kysMotoruKur({
      firma: props.firma, kys, logo, baglam,
      onDurum: (tur, mesaj) => { durumMesaji.value = tur === 'err' ? mesaj : ''; },
    });
    motor.value = markRaw(kurulum.motor);
    girilen.value = kurulum.girilen;
    firmaAlanlari.value = kurulum.firmaAlanlari;
    logoVar.value = !!logo;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'KYS verisi alınamadı';
  } finally {
    yukleniyor.value = false;
  }
});

onBeforeUnmount(() => {
  if (kayitZamani) clearTimeout(kayitZamani);
  if (kaydedilecek) void kaydet();
});

async function kaydet() {
  const m = motor.value;
  if (!m) return;
  kaydedilecek = false;
  durum.value = 'Kaydediliyor…';
  try {
    await saveKys(props.firma._id, kysKayitVerisi(m, girilen.value));
    durum.value = 'Kaydedildi';
  } catch (e) {
    durum.value = e instanceof Error ? e.message : 'Kaydedilemedi';
  }
}

function degisti() {
  surum.value++;
  kaydedilecek = true;
  durum.value = 'Kaydedilmemiş değişiklik…';
  if (kayitZamani) clearTimeout(kayitZamani);
  kayitZamani = setTimeout(kaydet, 1200);
}

function kapat() {
  emit('kapat');
}

const eksik = computed(() => {
  void surum.value;
  return motor.value ? eksikKysBilgileri(motor.value, logoVar.value) : [];
});
const doluluk = computed(() => {
  void surum.value;
  const m = motor.value;
  return m ? (m.completeness() as [number, number]) : [0, 1];
});

// ---- Bilgiler ----
type AlanTanimi = [string, string, string, string?, string?];
const gruplar = computed(() => (motor.value?.FIELD_GROUPS ?? []) as { title: string; fields: AlanTanimi[] }[]);

function alanDegeri(k: string) {
  void surum.value;
  return motor.value?.S.v[k] ?? '';
}

// Firma kaydından gelen alanlar salt okunur metin; geri kalanı form
const firmadanMi = (k: string) => k in FIRMA_KAYNAKLI_ALANLAR;
// CE belgesinden türeyen alanlar: firmada hiç CE belgesi yoksa "Yok" yazılır
const CE_ALANLARI = ['tipSertNo', 'tipSertTarih', 'tipKurulus', 'tipKurulusNo', 'meKurulus', 'meBelgeNo', 'meBelgeTarih'];
const ceBelgeleri = computed(() => props.firma.ceBelgeleri ?? []);
const ceYok = (k: string) => CE_ALANLARI.includes(k) && !ceBelgeleri.value.length;
const tarihYaz = (iso?: string | null) => (iso && motor.value ? (motor.value.fmtD(String(iso).slice(0, 10)) as string) : '');
const gosterim = (a: AlanTanimi, k = a[0]) => {
  const v = String(alanDegeri(k) ?? '');
  return a[2] === 'date' ? (motor.value?.fmtD(v) as string) : v;
};

function alanYaz(k: string, e: Event) {
  const m = motor.value;
  if (!m) return;
  const deger = (e.target as HTMLInputElement).value;
  if (deger.trim()) {
    girilen.value[k] = deger;
    m.S.v[k] = deger;
  } else {
    delete girilen.value[k];
    m.S.v[k] = firmaAlanlari.value[k] ?? '';
  }
  degisti();
}

// ---- Liste düzenleyiciler (politika, hedef, doküman, revizyon) ----
function liste(ad: string) {
  void surum.value;
  return (motor.value?.S[ad] ?? []) as Record<string, string>[];
}

function hucreYaz(satir: Record<string, string>, k: string, e: Event) {
  satir[k] = (e.target as HTMLInputElement).value;
  degisti();
}

function politikaYaz(i: number, e: Event) {
  motor.value!.S.politika[i] = (e.target as HTMLTextAreaElement).value;
  degisti();
}

function politikaEkle() {
  motor.value!.S.politika.push('');
  degisti();
}

function listedenSil(ad: string, i: number) {
  motor.value!.S[ad].splice(i, 1);
  degisti();
}

function listeEkle(ad: string, bos: Record<string, string>) {
  motor.value!.S[ad].push({ ...bos });
  degisti();
}

const dokumanArama = ref('');
const dokumanSatirlari = computed(() => {
  const q = dokumanArama.value.trim().toLocaleLowerCase('tr');
  return liste('dokumanlar')
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => !q || `${d.kod} ${d.ad}`.toLocaleLowerCase('tr').includes(q));
});

// ---- El kitabı ----
const elKitabi = computed(() => {
  void surum.value;
  return motor.value ? (motor.value.manualHTML() as string) : '';
});
const tumuMesgul = ref(false);

async function tumunuIndir() {
  tumuMesgul.value = true;
  try { await motor.value?.wordAll(); } finally { tumuMesgul.value = false; }
}

const girdi = 'w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/40 focus:ring-white/30';
const dugme = 'bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]';
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex flex-col bg-[#101a14]">
      <div
        class="flex shrink-0 items-center gap-2 border-b border-white/5 bg-surface-bar px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" @click="kapat" aria-label="Geri"
          class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-sm font-bold text-ink">KYS — Modül E Kalite El Kitabı</h2>
          <p class="truncate text-[11px] text-ink-muted">{{ firma.unvan || firma.ad }}<span v-if="durum"> · {{ durum }}</span></p>
        </div>
      </div>

      <div v-if="yukleniyor" class="p-4 text-xs text-ink-muted">Yükleniyor…</div>
      <div v-else-if="hata" class="p-4 text-xs text-red-300">{{ hata }}</div>

      <template v-else-if="motor">
        <div class="flex shrink-0 gap-1 overflow-x-auto border-b border-white/5 px-2 py-1.5">
          <button v-for="[k, e] in SEKMELER" :key="k" type="button" @click="sekme = k"
            class="shrink-0 px-2.5 py-1.5 text-[11px] font-semibold ring-1 ring-white/10"
            :class="sekme === k ? 'bg-[#223c2d] text-ink' : 'bg-surface-900 text-ink-muted'">
            {{ e }}
          </button>
        </div>

        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <p v-if="durumMesaji" class="bg-red-500/10 p-2 text-[11px] text-red-300 ring-1 ring-red-500/20">{{ durumMesaji }}</p>

          <!-- Eksik bilgi uyarısı: üretim engellenmez, eksik alanlar belgede [..] olarak görünür -->
          <div v-if="eksik.length" class="space-y-1 bg-amber-500/10 p-2.5 ring-1 ring-amber-500/30">
            <p class="text-xs font-semibold text-amber-200">
              {{ eksik.length }} eksik bilgi var — belgelerde [köşeli parantez] olarak görünür
            </p>
            <p class="text-[11px] text-amber-100/80">{{ eksik.join(' · ') }}</p>
            <button v-if="sekme !== 'bilgiler'" type="button" @click="sekme = 'bilgiler'"
              class="text-[11px] font-semibold text-amber-200 underline">Bilgileri tamamla</button>
          </div>

          <!-- ===== Bilgiler ===== -->
          <div v-if="sekme === 'bilgiler'" class="space-y-3">
            <p class="text-[11px] text-ink-muted">
              Doluluk: {{ doluluk[0] }}/{{ doluluk[1] }}. Firma kaydından gelen bilgiler metin olarak gösterilir; eksik olanlar
              firmada ilgili bölümden girilmelidir. Aşağıdaki formlar KYS'ye özgü bilgilerdir.
            </p>
            <section v-for="g in gruplar" :key="g.title" class="space-y-2 bg-surface-800 p-3 ring-1 ring-white/5">
              <h3 class="text-xs font-bold uppercase tracking-wide text-ink">{{ g.title }}</h3>

              <!-- Firma kaydından: salt okunur metin, girilmemişse eksik -->
              <!-- CE belgeleri listesi (tip inceleme ve Modül E kuruluşları grubunda) -->
              <div v-if="g.fields.some((f) => f[0] === 'tipSertNo')" class="space-y-1">
                <p class="text-[11px] font-semibold text-ink-muted">Firmanın CE belgeleri ({{ ceBelgeleri.length }})</p>
                <p v-if="!ceBelgeleri.length" class="bg-surface-900/50 px-2 py-1.5 text-xs font-semibold text-red-400 ring-1 ring-white/5">Yok</p>
                <p v-for="(c, i) in ceBelgeleri" :key="i" class="bg-surface-900/50 px-2 py-1.5 text-xs text-ink ring-1 ring-white/5">
                  <span class="font-semibold">{{ c.modul || '—' }}</span> · {{ c.kurum || '—' }} · Belge No: {{ c.belgeNo || '—' }}
                  <span v-if="c.bitisTarihi || c.gecerlilikTarihi" class="text-ink-muted"> · {{ tarihYaz(c.bitisTarihi || c.gecerlilikTarihi) }}</span>
                </p>
              </div>

              <dl v-if="g.fields.some((f) => firmadanMi(f[0]))" class="space-y-1">
                <div v-for="f in g.fields.filter((x) => firmadanMi(x[0]))" :key="f[0]"
                  class="flex flex-wrap items-baseline gap-x-2 bg-surface-900/50 px-2 py-1.5 ring-1 ring-white/5">
                  <dt class="w-40 shrink-0 text-[11px] text-ink-muted">{{ f[1] }}</dt>
                  <dd v-if="gosterim(f)" class="min-w-0 flex-1 break-words text-xs font-medium text-ink">{{ gosterim(f) }}</dd>
                  <dd v-else-if="ceYok(f[0])" class="min-w-0 flex-1 text-xs font-semibold text-red-400">Yok</dd>
                  <dd v-else class="min-w-0 flex-1 text-xs font-semibold text-red-400">
                    Eksik <span class="font-normal text-ink-muted">— {{ FIRMA_KAYNAKLI_ALANLAR[f[0]] }} bölümünden girin</span>
                  </dd>
                </div>
              </dl>

              <!-- KYS'ye özgü bilgiler: form -->
              <div v-if="g.fields.some((f) => !firmadanMi(f[0]))" class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <label v-for="f in g.fields.filter((x) => !firmadanMi(x[0]))" :key="f[0]" class="block space-y-0.5"
                  :class="f[4] === 'wide' ? 'sm:col-span-2' : ''">
                  <span class="text-[11px] font-medium text-ink-muted">{{ f[1] }}</span>
                  <textarea v-if="f[2] === 'textarea'" rows="3" :value="alanDegeri(f[0])" :placeholder="f[3]" :class="girdi"
                    @input="alanYaz(f[0], $event)"></textarea>
                  <input v-else :type="f[2] === 'date' ? 'date' : f[2] === 'number' ? 'number' : 'text'"
                    :value="alanDegeri(f[0])" :placeholder="f[3]" :class="girdi" @input="alanYaz(f[0], $event)" />
                </label>
              </div>
            </section>
            <p class="text-[11px]" :class="logoVar ? 'text-ink-muted' : 'font-semibold text-red-400'">
              Firma logosu: {{ logoVar ? 'firma kaydından kullanılıyor' : "Eksik — Firma > Genel Bilgiler'den yükleyin" }}
            </p>
          </div>

          <!-- ===== Politika ve hedefler ===== -->
          <div v-else-if="sekme === 'politika'" class="space-y-3">
            <section class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xs font-bold uppercase tracking-wide text-ink">Kalite politikası</h3>
                <button type="button" :class="dugme" @click="politikaEkle">+ Madde</button>
              </div>
              <div v-for="(m, i) in motor.S.politika" :key="i" class="flex items-start gap-1.5">
                <span class="w-5 shrink-0 pt-1.5 text-[11px] text-ink-muted">{{ i + 1 }}.</span>
                <textarea rows="2" :value="m" :class="girdi" @input="politikaYaz(i, $event)"></textarea>
                <button type="button" aria-label="Maddeyi sil" @click="listedenSil('politika', i)"
                  class="grid h-7 w-7 shrink-0 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">✕</button>
              </div>
            </section>
            <section class="space-y-1.5 bg-surface-800 p-3 ring-1 ring-white/5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xs font-bold uppercase tracking-wide text-ink">Kalite hedefleri</h3>
                <button type="button" :class="dugme"
                  @click="listeEkle('hedefler', { hedef: '', gosterge: '', deger: '', siklik: '', sorumlu: '' })">+ Hedef</button>
              </div>
              <div v-for="(h, i) in liste('hedefler')" :key="i" class="grid grid-cols-2 gap-1 bg-surface-900/40 p-2 ring-1 ring-white/5">
                <input :value="h.hedef" placeholder="Hedef" :class="girdi + ' col-span-2'" @input="hucreYaz(h, 'hedef', $event)" />
                <input :value="h.gosterge" placeholder="Gösterge / formül" :class="girdi + ' col-span-2'" @input="hucreYaz(h, 'gosterge', $event)" />
                <input :value="h.deger" placeholder="Hedef değer" :class="girdi" @input="hucreYaz(h, 'deger', $event)" />
                <input :value="h.siklik" placeholder="Ölçüm sıklığı" :class="girdi" @input="hucreYaz(h, 'siklik', $event)" />
                <input :value="h.sorumlu" placeholder="Sorumlu" :class="girdi" @input="hucreYaz(h, 'sorumlu', $event)" />
                <button type="button" @click="listedenSil('hedefler', i)"
                  class="bg-surface-900 px-2 py-1.5 text-[11px] font-semibold text-red-300/80 ring-1 ring-red-500/20">Sil</button>
              </div>
            </section>
          </div>

          <!-- ===== Doküman listesi ===== -->
          <div v-else-if="sekme === 'dokumanlar'" class="space-y-1.5">
            <div class="flex gap-1.5">
              <input v-model="dokumanArama" type="search" placeholder="Kod veya ad ara" :class="girdi" />
              <button type="button" :class="dugme + ' shrink-0'"
                @click="listeEkle('dokumanlar', { kod: '', ad: '', bolum: '', rev: '00', tarih: '', durum: 'Taslak' })">+ Doküman</button>
            </div>
            <div v-for="{ d, i } in dokumanSatirlari" :key="i" class="grid grid-cols-6 gap-1 bg-surface-800 p-2 ring-1 ring-white/5">
              <input :value="d.kod" placeholder="Kod" :class="girdi + ' col-span-2'" @input="hucreYaz(d, 'kod', $event)" />
              <input :value="d.ad" placeholder="Doküman adı" :class="girdi + ' col-span-4'" @input="hucreYaz(d, 'ad', $event)" />
              <input :value="d.bolum" placeholder="Bölüm" :class="girdi" @input="hucreYaz(d, 'bolum', $event)" />
              <input :value="d.rev" placeholder="Rev." :class="girdi" @input="hucreYaz(d, 'rev', $event)" />
              <input type="date" :value="d.tarih" :class="girdi + ' col-span-2'" @input="hucreYaz(d, 'tarih', $event)" />
              <select :value="d.durum" :class="girdi + ' col-span-2'" @change="hucreYaz(d, 'durum', $event)">
                <option>Taslak</option><option>Yürürlükte</option><option>İptal</option>
              </select>
              <button type="button" @click="listedenSil('dokumanlar', i)"
                class="col-span-6 bg-surface-900 px-2 py-1 text-[11px] font-semibold text-red-300/80 ring-1 ring-red-500/20">Satırı sil</button>
            </div>
          </div>

          <!-- ===== Revizyon ===== -->
          <div v-else-if="sekme === 'revizyon'" class="space-y-1.5">
            <button type="button" :class="dugme"
              @click="listeEkle('revizyonlar', { rev: '', tarih: '', bolum: '', aciklama: '', onay: '' })">+ Revizyon</button>
            <div v-for="(r, i) in liste('revizyonlar')" :key="i" class="grid grid-cols-2 gap-1 bg-surface-800 p-2 ring-1 ring-white/5">
              <input :value="r.rev" placeholder="Rev." :class="girdi" @input="hucreYaz(r, 'rev', $event)" />
              <input type="date" :value="r.tarih" :class="girdi" @input="hucreYaz(r, 'tarih', $event)" />
              <input :value="r.bolum" placeholder="Değişen bölüm" :class="girdi" @input="hucreYaz(r, 'bolum', $event)" />
              <input :value="r.onay" placeholder="Onaylayan" :class="girdi" @input="hucreYaz(r, 'onay', $event)" />
              <textarea rows="2" :value="r.aciklama" placeholder="Değişiklik açıklaması" :class="girdi + ' col-span-2'"
                @input="hucreYaz(r, 'aciklama', $event)"></textarea>
              <button type="button" @click="listedenSil('revizyonlar', i)"
                class="col-span-2 bg-surface-900 px-2 py-1 text-[11px] font-semibold text-red-300/80 ring-1 ring-red-500/20">Satırı sil</button>
            </div>
          </div>

          <KysSablonlar v-else-if="sekme === 'sablonlar'" :motor="motor" :surum="surum" />
          <KysKayitlar v-else-if="sekme === 'kayitlar'" :motor="motor" :surum="surum" @degisti="degisti" />

          <!-- ===== El kitabı ===== -->
          <div v-else-if="sekme === 'elkitabi'" class="space-y-2">
            <button type="button" :disabled="tumuMesgul" :class="dugme" @click="tumunuIndir">
              {{ tumuMesgul ? 'Hazırlanıyor…' : 'Tüm dokümanlar ve kayıtlar — Word (ZIP)' }}
            </button>
            <KysOnizleme :motor="motor" :html="elKitabi" baslik="Modül E Kalite Güvence Sistemi El Kitabı"
              :dosya-adi="`${motor.T('kisaKod') || 'Firma'} ${motor.T('dokKod') || 'KEK-01'} Kalite El Kitabı`"
              :alt-bilgi="motor.kekFoot()" />
          </div>
        </div>
      </template>
    </div>
  </Teleport>
</template>
