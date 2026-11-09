<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { KysMotor } from '@/utils/kys/kysMotor';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import KysOnizleme from './KysOnizleme.vue';

// Uygulama kayıtları: eğitim, iç tetkik, YGG, montaj projeleri, DÖF, şikayet, anket, tedarikçi, ekipman,
// personel yetki, hedef, onaylanmış kuruluş denetimi — alanlar motorun tanımlarından (KY_DEF) üretilir
const props = defineProps<{ motor: KysMotor; surum: number }>();
const emit = defineEmits<{ degisti: [] }>();

type Alan = [string, string, string, string?];
type Sutun = [string, string, string];
type Dizi = [string, string, Sutun[], Record<string, unknown>];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Kayit = Record<string, any> & { id: string };

const yil = ref(props.motor.getYil() as string);
const tur = ref<string>('egitim');
const secId = ref('');
const belge = ref('');
const silinecek = ref<Kayit | null>(null);
const mesgul = ref(false);

const turler = computed<[string, string][]>(() =>
  (props.motor.kyAllTypes() as string[]).map((k) => [k, props.motor.KY_TYPES[k] as string]));
const yillar = computed<string[]>(() => { void props.surum; return props.motor.kyYears(); });
const tanim = computed(() => props.motor.KY_DEF[tur.value] as { f: Alan[]; arr: Dizi[]; docs: [string, string][] });
const liste = computed<Kayit[]>(() => {
  void props.surum;
  props.motor.setYil(yil.value);
  return props.motor.kyList(tur.value, yil.value);
});
const kayit = computed<Kayit | null>(() => liste.value.find((r) => r.id === secId.value) ?? liste.value[0] ?? null);
const takvim = computed(() => { void props.surum; props.motor.setYil(yil.value); return props.motor.docTakvim(yil.value) as string; });

watch([tur, yil], () => {
  secId.value = '';
  belge.value = tanim.value?.docs?.[0]?.[0] ?? '';
}, { immediate: true });

const onizleme = computed(() => {
  void props.surum;
  const r = kayit.value;
  if (!r || !tanim.value) return null;
  props.motor.setYil(yil.value);
  const which = belge.value || tanim.value.docs[0][0];
  return {
    html: props.motor.kyDocFor(tur.value, r, which) as string,
    baslik: props.motor.kyTitle(tur.value, r) as string,
    ad: (props.motor.kyDocName(tur.value, r, which) as string).replace(/\.html$/, ''),
  };
});

function degisti() {
  emit('degisti');
}

function yeni() {
  props.motor.setYil(yil.value);
  const r = props.motor.kyNew(tur.value) as Kayit;
  secId.value = r.id;
  degisti();
}

function ornek() {
  props.motor.setYil(yil.value);
  props.motor.kyOrnek(yil.value, true);
  degisti();
}

function alanDegeri(r: Kayit, k: string) {
  return r[k] == null ? '' : r[k];
}

function yaz(r: Kayit, k: string, e: Event) {
  r[k] = (e.target as HTMLInputElement).value;
  degisti();
}

function satirYaz(satir: Record<string, unknown>, k: string, e: Event) {
  satir[k] = (e.target as HTMLInputElement).value;
  degisti();
}

function satirEkle(r: Kayit, d: Dizi) {
  (r[d[0]] ??= []).push({ ...d[3] });
  degisti();
}

function satirSil(r: Kayit, d: Dizi, i: number) {
  r[d[0]].splice(i, 1);
  degisti();
}

function secenekler(tip: string) {
  return tip.slice(7).split('|');
}

function kayitSil() {
  const r = silinecek.value;
  if (!r) return;
  const kayitlar = props.motor.S.kayit as Record<string, Kayit[]>;
  kayitlar[tur.value] = kayitlar[tur.value].filter((x) => x.id !== r.id);
  silinecek.value = null;
  secId.value = '';
  degisti();
}

async function wordYil() {
  mesgul.value = true;
  try { await props.motor.wordAll(yil.value); } finally { mesgul.value = false; }
}

const girdi = 'w-full bg-surface-900 px-2 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none focus:ring-white/30';
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-1.5">
      <select v-model="yil" :class="girdi + ' !w-auto'">
        <option v-for="y in yillar" :key="y" :value="y">{{ y }}</option>
      </select>
      <button type="button" :disabled="mesgul" @click="wordYil"
        class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20] disabled:opacity-50">
        {{ mesgul ? 'Hazırlanıyor…' : `${yil} kayıtları — Word (ZIP)` }}
      </button>
      <button type="button" @click="ornek"
        class="bg-surface-900 px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted ring-1 ring-white/10 active:bg-[#1a2a20]">
        Örnek kayıt oluştur
      </button>
    </div>

    <div class="flex flex-wrap gap-1">
      <button v-for="[k, e] in turler" :key="k" type="button" @click="tur = k"
        class="px-2 py-1 text-[11px] font-semibold ring-1 ring-white/10"
        :class="tur === k ? 'bg-[#223c2d] text-ink' : 'bg-surface-900 text-ink-muted'">
        {{ e }}
      </button>
      <button type="button" @click="tur = 'takvim'"
        class="px-2 py-1 text-[11px] font-semibold ring-1 ring-white/10"
        :class="tur === 'takvim' ? 'bg-[#223c2d] text-ink' : 'bg-surface-900 text-ink-muted'">
        Yıllık takvim
      </button>
    </div>

    <KysOnizleme v-if="tur === 'takvim'" :motor="motor" :html="takvim" baslik="Yıllık Faaliyet Takvimi"
      :dosya-adi="`${yil} Yıllık Faaliyet Takvimi`" :alt-bilgi="`${yil} Faaliyet Takvimi`" />

    <template v-else>
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-semibold text-ink">{{ motor.KY_TYPES[tur] }} · {{ yil }} ({{ liste.length }})</p>
        <button type="button" @click="yeni"
          class="bg-[#2b5c3d] px-2.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
          + Ekle
        </button>
      </div>

      <p v-if="!liste.length" class="py-2 text-xs text-ink-muted/60">
        Bu yıl için kayıt yok. "+ Ekle" ile yeni kayıt açın ya da "Örnek kayıt oluştur"u kullanın.
      </p>
      <div class="max-h-40 space-y-1 overflow-auto">
        <button v-for="r in liste" :key="r.id" type="button" @click="secId = r.id; belge = tanim.docs[0][0]"
          class="flex w-full items-center gap-2 p-1.5 text-left ring-1 ring-white/5"
          :class="kayit?.id === r.id ? 'bg-[#223c2d]' : 'bg-surface-900/60'">
          <span class="w-10 shrink-0 text-[11px] font-semibold text-ink-muted">{{ r.tarih ? motor.fmtD(r.tarih).slice(0, 5) : '--.--' }}</span>
          <span class="min-w-0 flex-1 truncate text-[11px] text-ink">{{ motor.kyTitle(tur, r) }}</span>
          <span v-if="r.ornek" class="text-[10px] text-ink-muted/70">örnek</span>
        </button>
      </div>

      <template v-if="kayit">
        <div class="grid grid-cols-1 gap-1.5 bg-surface-900/40 p-2 ring-1 ring-white/5 sm:grid-cols-2">
          <template v-for="f in tanim.f" :key="f[0]">
            <p v-if="f[2] === 'head'" class="pt-1 text-[11px] font-bold uppercase tracking-wide text-ink sm:col-span-2">{{ f[1] }}</p>
            <label v-else class="block space-y-0.5" :class="f[3] === 'wide' ? 'sm:col-span-2' : ''">
              <span class="text-[11px] font-medium text-ink-muted">{{ f[1] }}</span>
              <textarea v-if="f[2] === 'textarea'" rows="3" :value="alanDegeri(kayit, f[0])" :class="girdi"
                @input="yaz(kayit, f[0], $event)"></textarea>
              <select v-else-if="f[2] === 'status'" :value="alanDegeri(kayit, f[0])" :class="girdi" @change="yaz(kayit, f[0], $event)">
                <option v-for="o in motor.KY_STATUS" :key="o">{{ o }}</option>
              </select>
              <select v-else-if="f[2].startsWith('select:')" :value="alanDegeri(kayit, f[0])" :class="girdi" @change="yaz(kayit, f[0], $event)">
                <option v-for="o in secenekler(f[2])" :key="o" :value="o">{{ o || '—' }}</option>
              </select>
              <input v-else :type="f[2] === 'date' ? 'date' : f[2] === 'number' ? 'number' : 'text'"
                :value="alanDegeri(kayit, f[0])" :class="girdi" @input="yaz(kayit, f[0], $event)" />
            </label>
          </template>
        </div>

        <div v-for="d in tanim.arr" :key="d[0]" class="space-y-1 bg-surface-900/40 p-2 ring-1 ring-white/5">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] font-bold text-ink">{{ d[1] }} ({{ (kayit[d[0]] ?? []).length }})</p>
            <button type="button" @click="satirEkle(kayit, d)"
              class="bg-surface-900 px-2 py-1 text-[11px] font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20]">
              + Satır
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[34rem] border-separate border-spacing-y-1">
              <thead>
                <tr>
                  <th v-for="c in d[2]" :key="c[0]" class="px-1 text-left text-[10px] font-medium text-ink-muted">{{ c[1] }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(satir, i) in kayit[d[0]] ?? []" :key="i">
                  <td v-for="c in d[2]" :key="c[0]" class="pr-1 align-top">
                    <select v-if="c[2].startsWith('select:')" :value="satir[c[0]] ?? ''" :class="girdi" @change="satirYaz(satir, c[0], $event)">
                      <option v-for="o in secenekler(c[2])" :key="o" :value="o">{{ o || '—' }}</option>
                    </select>
                    <input v-else :type="c[2] === 'date' ? 'date' : 'text'" :value="satir[c[0]] ?? ''" :class="girdi"
                      @input="satirYaz(satir, c[0], $event)" />
                  </td>
                  <td class="w-7 align-top">
                    <button type="button" @click="satirSil(kayit, d, i)" aria-label="Satırı sil"
                      class="grid h-7 w-7 place-items-center bg-surface-900 text-red-300/80 ring-1 ring-red-500/20">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <button v-for="d in tanim.docs" :key="d[0]" type="button" @click="belge = d[0]"
            class="px-2 py-1 text-[11px] font-semibold ring-1 ring-white/10"
            :class="(belge || tanim.docs[0][0]) === d[0] ? 'bg-[#223c2d] text-ink' : 'bg-surface-900 text-ink-muted'">
            {{ d[1] }}
          </button>
          <button type="button" @click="silinecek = kayit"
            class="ml-auto bg-surface-900 px-2 py-1 text-[11px] font-semibold text-red-300/80 ring-1 ring-red-500/20">
            Kaydı sil
          </button>
        </div>

        <KysOnizleme v-if="onizleme" :motor="motor" :html="onizleme.html" :baslik="onizleme.baslik"
          :dosya-adi="onizleme.ad" :alt-bilgi="`${onizleme.ad} · ${motor.T('unvan') || 'Firma'}`" />
      </template>
    </template>

    <SilmeOnayi :acik="silinecek != null"
      :aciklama="silinecek ? `${motor.kyTitle(tur, silinecek)} kaydı silinecek. Emin misiniz?` : ''"
      @vazgec="silinecek = null" @onayla="kayitSil" />
  </div>
</template>
