<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getAsansor, type Asansor } from '@/services/asansorService';
import { getAksamBelgesi } from '@/services/aksamBelgesiService';
import { getDosyaUrl, getDosyaIndirUrl, type BelgeSlot } from '@/services/dosyaService';
import { useFileViewer, fileViewerTypeFromMime } from '@/composables/useFileViewer';
import {
  asansorBolumleri, asansorRiskGruplari, asansorBelgeSatirlari, asansorFotoGruplari,
  asansorAksamGruplari,
} from '@/utils/asansorBilgi';

// Asansör bilgi popup'ı — TAM SAYFA, salt görüntüleme: asansöre daha önce
// girilen TÜM alanlar (şema bölümleri, güvenlik aksamları, risk analizleri,
// belgeler, fotoğraflar, SMM) tablo halinde listelenir; dosya ve görseller
// görüntülenebilir. Kayıt popup açılınca taze çekilir.
const props = defineProps<{ asansorId: string | null }>();
const acik = defineModel<boolean>('acik', { default: false });

const asansor = ref<Asansor | null>(null);
const yukleniyor = ref(false);
const hata = ref('');

watch(acik, (v) => {
  if (!v || !props.asansorId) return;
  yukleniyor.value = true;
  hata.value = '';
  asansor.value = null;
  fotoUrller.value = {};
  getAsansor(props.asansorId)
    .then((a) => {
      asansor.value = a;
      onizlemeleriYukle();
    })
    .catch((e) => (hata.value = e instanceof Error ? e.message : 'Asansör yüklenemedi'))
    .finally(() => (yukleniyor.value = false));
});

const { openFile } = useFileViewer();

async function dosyaAc(slot: BelgeSlot | null | undefined) {
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
    hata.value = 'Dosya açılamadı';
  }
}

function tarih(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR') : '—';
}

// Bölüm içerikleri ve etiket haritaları utils/asansorBilgi.ts'te —
// PDF raporuyla ortak kullanılır.

// Etiket/değer bölümleri — asansörün tüm şema alanları (utils/asansorBilgi.ts)
const bolumler = computed(() => (asansor.value ? asansorBolumleri(asansor.value) : []));

// ---- Risk analizleri: seçilen maddeler + fotoğrafları ----
const riskGruplari = computed(() => (asansor.value ? asansorRiskGruplari(asansor.value) : []));

// ---- Belgeler (dosyası olanlar) ----
const belgeSatirlari = computed(() => (asansor.value ? asansorBelgeSatirlari(asansor.value) : []));

// ---- Fotoğraflar: grup grup küçük önizlemeler ----
const fotoGruplari = computed(() => (asansor.value ? asansorFotoGruplari(asansor.value) : []));

// Küçük önizleme URL'leri (dosyaAnahtari → url); resim olmayanlar atlanır
const fotoUrller = ref<Record<string, string>>({});

function onizlemeleriYukle() {
  const a = asansor.value;
  if (!a) return;
  const resimler: BelgeSlot[] = [
    ...fotoGruplari.value.flatMap((g) => g.fotolar ?? []),
    ...riskGruplari.value.flatMap((g) =>
      g.maddeler.flatMap((m) => [m.resim, ...(m.fotolar ?? [])])
    ),
  ].filter((s): s is BelgeSlot => !!s && (s.mimeType?.startsWith('image/') ?? false));
  for (const slot of resimler) {
    getDosyaUrl(slot.dosyaAnahtari)
      .then((url) => (fotoUrller.value[slot.dosyaAnahtari] = url))
      .catch(() => { /* önizleme alınamazsa kutu boş görünür */ });
  }
}

// ---- Güvenlik aksamları: tekilleştirilmiş gruplar (seri nolar birleşik,
// montaj fotoğraflarıyla) ----
const aksamGruplari = computed(() => (asansor.value ? asansorAksamGruplari(asansor.value) : []));

// Sertifika no'ya dokununca katalogdaki belge dosyası açılır
async function sertifikaAc(belgeId: string) {
  if (!belgeId) return;
  try {
    const belge = await getAksamBelgesi(belgeId);
    if (belge.dosya) await dosyaAc(belge.dosya);
    else hata.value = 'Bu sertifikanın dosyası katalogda yüklü değil';
  } catch {
    hata.value = 'Sertifika belgesi açılamadı';
  }
}

// Duraklar binadaki gibi yüksekten alçağa sıralanır (en üst kat en üstte)
const katYukseklikleri = computed(() =>
  [...(asansor.value?.katYukseklikleri ?? [])].sort((a, b) => b.kat - a.kat)
);
</script>

<template>
  <Teleport to="body">
    <div v-if="acik" class="fixed inset-0 z-50 flex flex-col bg-[#101a14]">
      <div
        class="flex shrink-0 items-center justify-between border-b border-white/5 bg-surface-900 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2 class="truncate text-sm font-bold text-ink">
          {{ asansor?.seriNo || asansor?.yapiRuhsatNo || 'Asansör Bilgileri' }}
        </h2>
        <button type="button" @click="acik = false"
          class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink-muted ring-1 ring-white/10">
          ✕
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <div class="mx-auto max-w-lg space-y-2 p-4">
          <p v-if="hata" class="bg-red-950/60 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
            {{ hata }}
          </p>
          <p v-if="yukleniyor" class="py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>

          <template v-else-if="asansor">
            <!-- Etiket/değer bölümleri -->
            <div v-for="bolum in bolumler" :key="bolum.baslik" class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                {{ bolum.baslik }}
              </p>
              <table class="w-full text-left text-[11px]">
                <tbody>
                  <tr v-for="(satir, i) in bolum.satirlar" :key="i" class="border-t border-white/5">
                    <template v-for="(hucre, j) in satir" :key="j">
                      <th class="w-24 bg-surface-900 px-2 py-1.5 align-top font-medium text-ink-muted">
                        {{ hucre[0] }}
                      </th>
                      <td class="px-2 py-1.5 text-ink" :colspan="satir.length === 1 ? 3 : 1">
                        {{ hucre[1] || '—' }}
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Kat yükseklikleri -->
            <div v-if="katYukseklikleri.length" class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                Kat Yükseklikleri
              </p>
              <table class="w-full text-left text-[11px]">
                <tbody>
                  <tr v-for="k in katYukseklikleri" :key="k.kat" class="border-t border-white/5">
                    <th class="w-24 bg-surface-900 px-2 py-1.5 font-medium text-ink-muted">{{ k.kat }}. Kat</th>
                    <td class="px-2 py-1.5 text-ink">{{ k.yukseklik }} mm</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Güvenlik aksamları: aksam başına panel — aynı aksamın seri
              noları virgülle tek satırda, altında montaj fotoğrafları -->
            <div v-if="aksamGruplari.length" class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                Güvenlik Aksamları
              </p>
              <div v-for="(g, i) in aksamGruplari" :key="i" class="border-t border-white/5 px-2.5 py-2">
                <div class="flex items-start justify-between gap-2">
                  <span
                    class="shrink-0 bg-surface-900 px-2 py-0.5 text-[10px] font-semibold text-[#6fcf97] ring-1 ring-white/10">
                    {{ g.etiket }}
                  </span>
                  <span class="whitespace-nowrap text-[10px] text-ink-muted/80">
                    {{ tarih(g.gecerlilikBaslangic) }} – {{ tarih(g.gecerlilikBitis) }}
                  </span>
                </div>
                <p class="mt-1.5 text-xs font-bold text-ink">
                  {{ [g.marka, g.tip].filter(Boolean).join(' — ') || '—' }}
                </p>
                <p v-if="g.seriNolar.length" class="mt-0.5 text-[11px] text-ink-muted">
                  Seri No: <span class="text-ink">{{ g.seriNolar.join(', ') }}</span>
                </p>
                <p v-if="g.sertifikaNo" class="mt-0.5 text-[11px] text-ink-muted">
                  Sertifika:
                  <button v-if="g.belgeId" type="button" @click="sertifikaAc(g.belgeId)"
                    class="font-semibold text-[#6fcf97] underline decoration-dotted underline-offset-2 active:text-ink">
                    {{ g.sertifikaNo }}
                  </button>
                  <span v-else class="text-ink">{{ g.sertifikaNo }}</span>
                </p>
                <div v-if="g.fotolar.length" class="mt-1.5 flex gap-1.5 overflow-x-auto">
                  <button v-for="foto in g.fotolar" :key="foto.dosyaAnahtari" type="button"
                    @click="dosyaAc(foto)" class="h-14 w-14 shrink-0 bg-surface-900 ring-1 ring-white/10">
                    <img v-if="fotoUrller[foto.dosyaAnahtari]" :src="fotoUrller[foto.dosyaAnahtari]"
                      :alt="foto.dosyaAdi" class="h-full w-full object-cover" />
                    <span v-else class="grid h-full place-items-center text-[10px] text-ink-muted/60">…</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Risk analizleri: seçilen maddeler + fotoğrafları -->
            <div v-for="grup in riskGruplari" :key="grup.baslik" class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                {{ grup.baslik }}
              </p>
              <div v-for="(m, i) in grup.maddeler" :key="i" class="border-t border-white/5 px-2.5 py-2">
                <p class="text-[11px] text-ink">{{ m.metin || '—' }}</p>
                <div v-if="m.resim || m.fotolar?.length" class="mt-1.5 flex gap-1.5 overflow-x-auto">
                  <button v-for="foto in [m.resim, ...(m.fotolar ?? [])].filter(Boolean)"
                    :key="foto!.dosyaAnahtari" type="button" @click="dosyaAc(foto)"
                    class="h-14 w-14 shrink-0 bg-surface-900 ring-1 ring-white/10">
                    <img v-if="fotoUrller[foto!.dosyaAnahtari]" :src="fotoUrller[foto!.dosyaAnahtari]"
                      :alt="foto!.dosyaAdi" class="h-full w-full object-cover" />
                    <span v-else class="grid h-full place-items-center text-[10px] text-ink-muted/60">…</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Belgeler: dosyası olanlar göz ile görüntülenir -->
            <div v-if="belgeSatirlari.length" class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                Belgeler
              </p>
              <table class="w-full text-left text-[11px]">
                <tbody>
                  <tr v-for="b in belgeSatirlari" :key="b.etiket" class="border-t border-white/5">
                    <th class="w-36 bg-surface-900 px-2 py-1.5 font-medium text-ink-muted">{{ b.etiket }}</th>
                    <td class="px-2 py-1">
                      <div class="flex items-center justify-between gap-2">
                        <span class="min-w-0 truncate text-ink">{{ b.slot?.dosyaAdi }}</span>
                        <button type="button" @click="dosyaAc(b.slot)" aria-label="Belgeyi görüntüle"
                          class="grid h-6 w-7 shrink-0 place-items-center bg-[#2b5c3d] text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
                          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.24 7.26 5 12 5s8.58 3.24 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.76 16.74 19 12 19s-8.58-3.24-9.94-6.65" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Fotoğraflar: grup grup önizlemeler, dokununca tam ekran -->
            <div v-if="fotoGruplari.length" class="overflow-hidden ring-1 ring-white/10">
              <p class="bg-[#1c2a21] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6fcf97]">
                Fotoğraflar
              </p>
              <div v-for="grup in fotoGruplari" :key="grup.baslik" class="border-t border-white/5 px-2.5 py-2">
                <p class="text-[10px] font-medium text-ink-muted">{{ grup.baslik }}</p>
                <div class="mt-1 flex gap-1.5 overflow-x-auto">
                  <button v-for="foto in grup.fotolar" :key="foto.dosyaAnahtari" type="button"
                    @click="dosyaAc(foto)"
                    class="h-14 w-14 shrink-0 bg-surface-900 ring-1 ring-white/10">
                    <img v-if="fotoUrller[foto.dosyaAnahtari]" :src="fotoUrller[foto.dosyaAnahtari]"
                      :alt="foto.dosyaAdi" class="h-full w-full object-cover" />
                    <span v-else class="grid h-full place-items-center text-[10px] text-ink-muted/60">…</span>
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div
        class="shrink-0 border-t border-white/5 bg-surface-900 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div class="mx-auto max-w-lg">
          <button type="button" @click="acik = false"
            class="w-full bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Kapat
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
