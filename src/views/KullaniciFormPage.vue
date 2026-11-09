<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonFooter } from '@ionic/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  createKullanici, getKullanici, updateKullanici, dogrulamaGonder, cikisaZorla, getKullaniciCihazlari,
  kullaniciDurumu, ROL_ETIKETLERI, OTURUM_SURELERI, type Kullanici, type KullaniciRolu,
} from '@/services/kullaniciService';
import { getKullanicilar } from '@/services/kullaniciService';
import { getDenetciler, type Denetci } from '@/services/denetciService';
import { getDanismanlar, type Danisman } from '@/services/danismanService';
import AramaliSelect from '@/components/AramaliSelect.vue';
import SilmeOnayi from '@/components/SilmeOnayi.vue';
import { blurActive } from '@/utils/blurActive';

const route = useRoute();
const router = useRouter();

const duzenlenenId = computed(() => (route.params.id as string | undefined) ?? '');
const baslik = computed(() => (duzenlenenId.value ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'));

// Tek alan: "İsim Soyisim" — son kelime soyisim, kalanı isim olarak kaydedilir
const form = ref<{ adSoyad: string; rol: KullaniciRolu; email: string; aktif: boolean; oturumSuresiDk: number | null }>({
  adSoyad: '', rol: 'denetci', email: '', aktif: true, oturumSuresiDk: null,
});
const kayit = ref<Kullanici | null>(null);
const yukleniyor = ref(false);
const kaydediliyor = ref(false);
const hata = ref('');
const bilgi = ref('');
const oturumSayisi = ref(0);
const cihazSayisi = ref(0);

// Yeni kullanıcı: önce rol seçilir. Admin için isim yazılır; Denetçi/Danışman için henüz kullanıcı
// olmamış kayıtlar listeden seçilir (kaynakId ile bağlanır)
const yeniMod = computed(() => !duzenlenenId.value);
const denetciler = ref<Denetci[]>([]);
const danismanlar = ref<Danisman[]>([]);
const mevcutKaynaklar = ref<Set<string>>(new Set()); // "rol:kaynakId"
const kaynakId = ref('');
const secimYukleniyor = ref(false);
const kaynakli = computed(() => yeniMod.value && form.value.rol !== 'admin');

const kaynakSecenekleri = computed(() => {
  const rol = form.value.rol;
  const liste: { _id: string; adSoyad: string }[] = rol === 'denetci' ? denetciler.value : rol === 'danisman' ? danismanlar.value : [];
  return liste
    .filter((k) => !mevcutKaynaklar.value.has(`${rol}:${k._id}`))
    .map((k) => ({ label: k.adSoyad, value: k._id }));
});
const kaynakModel = computed<string | number | null>({
  get: () => kaynakId.value || null,
  set(v) {
    kaynakId.value = typeof v === 'string' ? v : '';
    const rol = form.value.rol;
    const k = (rol === 'denetci' ? denetciler.value : danismanlar.value).find((x) => x._id === kaynakId.value);
    form.value.adSoyad = k?.adSoyad ?? '';
    // Danışman kaydında e-posta varsa giriş e-postası olarak önerilir
    if (rol === 'danisman' && k && !form.value.email) form.value.email = (k as Danisman).email ?? '';
  },
});

// Rol değişince seçim sıfırlanır
watch(() => form.value.rol, () => {
  if (!yeniMod.value) return;
  kaynakId.value = '';
  form.value.adSoyad = '';
});

const kelimeler = computed(() => form.value.adSoyad.trim().split(/\s+/).filter(Boolean));
const gecerli = computed(() => kelimeler.value.length >= 1 && (!kaynakli.value || !!kaynakId.value));
const roller = Object.entries(ROL_ETIKETLERI) as [KullaniciRolu, string][];
const durum = computed(() => (kayit.value ? kullaniciDurumu(kayit.value) : null));
// E-posta formda değiştirildi ama henüz kaydedilmedi
const epostaDegisti = computed(() => !!kayit.value && form.value.email.trim().toLowerCase() !== (kayit.value.email ?? ''));

function geri() {
  blurActive();
  router.back();
}

function doldur(k: Kullanici) {
  kayit.value = k;
  form.value = {
    adSoyad: `${k.ad} ${k.soyad}`.trim(), rol: k.rol, email: k.email ?? '', aktif: k.aktif !== false,
    oturumSuresiDk: k.oturumSuresiDk ?? null,
  };
}

async function oturumBilgisi() {
  if (!duzenlenenId.value) return;
  try {
    const r = await getKullaniciCihazlari(duzenlenenId.value);
    oturumSayisi.value = r.oturumSayisi;
    cihazSayisi.value = r.cihazlar.length;
  } catch { /* bilgi alınamazsa gizli kalır */ }
}

onMounted(async () => {
  if (yeniMod.value) {
    secimYukleniyor.value = true;
    try {
      const [d, n, k] = await Promise.all([getDenetciler(), getDanismanlar(), getKullanicilar()]);
      denetciler.value = d;
      danismanlar.value = n;
      mevcutKaynaklar.value = new Set(k.filter((x) => x.kaynakId).map((x) => `${x.rol}:${x.kaynakId}`));
    } catch (e) {
      hata.value = e instanceof Error ? e.message : 'Liste alınamadı';
    } finally {
      secimYukleniyor.value = false;
    }
    return;
  }
  yukleniyor.value = true;
  try {
    doldur(await getKullanici(duzenlenenId.value));
    await oturumBilgisi();
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kayıt yüklenemedi';
  } finally {
    yukleniyor.value = false;
  }
});

function veri() {
  const w = kelimeler.value;
  const { rol, email, aktif, oturumSuresiDk } = form.value;
  const kaynak = kaynakli.value ? { kaynakId: kaynakId.value } : {};
  // tek kelime girilirse yalnız isim olarak kaydedilir
  return w.length > 1
    ? { ad: w.slice(0, -1).join(' '), soyad: w[w.length - 1], rol, email, aktif, oturumSuresiDk, ...kaynak }
    : { ad: w[0], soyad: '', rol, email, aktif, oturumSuresiDk, ...kaynak };
}

async function kaydet() {
  if (!gecerli.value || kaydediliyor.value) return;
  kaydediliyor.value = true;
  hata.value = '';
  try {
    if (duzenlenenId.value) await updateKullanici(duzenlenenId.value, veri());
    else await createKullanici(veri());
    blurActive();
    router.replace('/ayarlar/kullanicilar');
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Kayıt başarısız';
  } finally {
    kaydediliyor.value = false;
  }
}

// E-posta ekle/değiştir → doğrulama gönder: önce form kaydedilir, sonra oturumlar sıfırlanıp yeni adrese e-posta gider
async function dogrulamaGonderTikla() {
  if (!duzenlenenId.value || !gecerli.value || kaydediliyor.value) return;
  if (!form.value.email.trim()) { hata.value = 'Önce bir e-posta adresi girin.'; return; }
  kaydediliyor.value = true;
  hata.value = '';
  bilgi.value = '';
  try {
    await updateKullanici(duzenlenenId.value, veri());
    const r = await dogrulamaGonder(duzenlenenId.value);
    doldur(await getKullanici(duzenlenenId.value));
    await oturumBilgisi();
    bilgi.value = `${r.eposta} adresine doğrulama e-postası gönderildi. Kullanıcı bağlantıya dokunup şifresini belirleyene kadar giriş yapamaz.`;
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'Doğrulama gönderilemedi';
  } finally {
    kaydediliyor.value = false;
  }
}

const zorlaOnayAcik = ref(false);
async function cikisaZorlaOnayla() {
  zorlaOnayAcik.value = false;
  try {
    await cikisaZorla(duzenlenenId.value);
    await oturumBilgisi();
    bilgi.value = 'Kullanıcının tüm oturumları kapatıldı.';
  } catch (e) {
    hata.value = e instanceof Error ? e.message : 'İşlem başarısız';
  }
}

const girdi = 'w-full bg-surface-900 px-2.5 py-1.5 text-xs text-ink ring-1 ring-white/10 outline-none placeholder:text-ink-muted/50 focus:ring-white/30';
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <div class="border-b border-white/5 bg-surface-bar">
        <header class="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button type="button" @click="geri"
            class="grid h-8 w-8 shrink-0 place-items-center bg-surface-800 text-ink ring-1 ring-white/10">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 class="min-w-0 flex-1 truncate text-xl font-bold leading-8 tracking-wide text-ink">{{ baslik }}</h1>
          <span v-if="durum" class="shrink-0 px-2 py-0.5 text-[10px] font-semibold ring-1" :class="durum.sinif">{{ durum.etiket }}</span>
        </header>
      </div>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg">
        <p v-if="hata" class="mx-4 mt-4 bg-red-950/60 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">{{ hata }}</p>
        <p v-if="bilgi" class="mx-4 mt-4 bg-[#223c2d]/60 px-3 py-2 text-xs text-ink ring-1 ring-white/10">{{ bilgi }}</p>
        <p v-if="yukleniyor" class="px-4 py-8 text-center text-sm text-ink-muted">Yükleniyor…</p>

        <form v-else id="kullanici-form" class="space-y-2 px-4 py-4" @submit.prevent="kaydet">
          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Rol *</span>
            <select v-model="form.rol" :class="girdi">
              <option v-for="[k, e] in roller" :key="k" :value="k">{{ e }}</option>
            </select>
          </label>

          <!-- Admin (ve düzenleme): isim yazılır. Yeni Denetçi/Danışman: henüz kullanıcı olmamış kayıtlar listeden seçilir -->
          <label v-if="!kaynakli" class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">İsim Soyisim *</span>
            <input v-model="form.adSoyad" type="text" required :class="girdi" placeholder="İsim Soyisim" />
          </label>
          <div v-else class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">{{ form.rol === 'denetci' ? 'Denetçi' : 'Danışman' }} seçin *</span>
            <AramaliSelect v-model="kaynakModel" :options="kaynakSecenekleri" :disabled="secimYukleniyor"
              :placeholder="secimYukleniyor ? 'Yükleniyor…' : (kaynakSecenekleri.length ? 'Seçiniz' : 'Eklenecek kayıt kalmadı')" />
            <p v-if="!secimYukleniyor && !kaynakSecenekleri.length" class="text-[11px] text-ink-muted">
              Tüm {{ form.rol === 'denetci' ? 'denetçiler' : 'danışmanlar' }} zaten kullanıcı olarak eklenmiş
              (yeni kayıt için Ayarlar > {{ form.rol === 'denetci' ? 'Denetçiler' : 'Danışmanlar' }}).
            </p>
          </div>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">E-posta (giriş kimliği)</span>
            <input v-model="form.email" type="email" inputmode="email" :class="girdi" placeholder="ornek@mail.com" />
          </label>

          <!-- E-posta durumu ve doğrulama -->
          <div v-if="duzenlenenId" class="space-y-1.5 bg-surface-800 p-2.5 ring-1 ring-white/5">
            <p class="text-[11px] text-ink-muted">
              <template v-if="!kayit?.email && !form.email.trim()">Giriş yapabilmesi için bir e-posta adresi girip doğrulama gönderin.</template>
              <template v-else-if="epostaDegisti">E-posta değişti: "Doğrulama gönder" önce kaydeder, kullanıcının oturumlarını kapatır ve yeni adrese doğrulama e-postası yollar.</template>
              <template v-else-if="kayit && !kayit.emailDogrulandi">E-posta doğrulanmadı. Kullanıcı e-postadaki bağlantıyla doğrulayıp şifresini belirleyene kadar giriş yapamaz.</template>
              <template v-else>E-posta doğrulandı{{ kayit?.parolaAyarli ? ' ve şifre belirlendi' : '' }}.</template>
            </p>
            <button type="button" :disabled="kaydediliyor || !form.email.trim()" @click="dogrulamaGonderTikla"
              class="w-full bg-surface-900 px-3 py-2 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#1a2a20] disabled:opacity-50">
              {{ kayit?.emailDogrulandi && !epostaDegisti ? 'Doğrulamayı yeniden gönder (sıfırla)' : 'Doğrulama gönder' }}
            </button>
          </div>

          <label class="block space-y-0.5">
            <span class="text-xs font-medium text-ink-muted">Oturum süresi (sonra yeniden giriş gerekir)</span>
            <select v-model="form.oturumSuresiDk" :class="girdi">
              <option v-for="o in OTURUM_SURELERI" :key="String(o.deger)" :value="o.deger">{{ o.etiket }}</option>
            </select>
          </label>

          <!-- Aktif / Pasif: pasif kullanıcı giriş yapamaz -->
          <label class="flex cursor-pointer items-center justify-between gap-3 bg-surface-800 px-3 py-2.5 ring-1 ring-white/5">
            <span>
              <span class="block text-xs font-semibold text-ink">{{ form.aktif ? 'Aktif' : 'Pasif' }}</span>
              <span class="block text-[11px] text-ink-muted">Pasif yapılırsa oturumları kapanır ve giriş yapamaz.</span>
            </span>
            <input v-model="form.aktif" type="checkbox" class="h-5 w-5 accent-[#2b5c3d]" />
          </label>

          <div v-if="duzenlenenId" class="space-y-1.5 bg-surface-800 p-2.5 ring-1 ring-white/5">
            <p class="text-[11px] text-ink-muted">
              Açık oturum: {{ oturumSayisi }} · Güvenilir cihaz: {{ cihazSayisi }}
              <template v-if="kayit?.sonGiris"> · Son giriş: {{ new Date(kayit.sonGiris).toLocaleString('tr-TR') }}</template>
            </p>
            <button type="button" @click="zorlaOnayAcik = true"
              class="w-full bg-surface-900 px-3 py-2 text-xs font-semibold text-red-300/90 ring-1 ring-red-500/25 active:bg-red-950/40">
              Çıkışa zorla (tüm oturumları kapat)
            </button>
          </div>
        </form>
      </div>
    </ion-content>

    <SilmeOnayi :acik="zorlaOnayAcik" aciklama="Kullanıcının tüm oturumları ve güvenilir cihazları kapatılacak; yeniden giriş yapması gerekecek."
      @vazgec="zorlaOnayAcik = false" @onayla="cikisaZorlaOnayla" />

    <ion-footer class="ion-no-border">
      <div class="border-t border-white/5 bg-surface-bar">
        <div class="mx-auto flex max-w-lg gap-1.5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" @click="geri"
            class="flex-1 bg-surface-800 px-4 py-3 text-xs font-semibold text-ink-muted ring-1 ring-white/10">
            Vazgeç
          </button>
          <button type="submit" form="kullanici-form" :disabled="kaydediliyor || yukleniyor || !gecerli"
            class="flex-1 bg-[#2b5c3d] px-4 py-3 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-50">
            {{ kaydediliyor ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </ion-footer>
  </ion-page>
</template>
