<script setup lang="ts">
import { ref } from 'vue';
import SemaModal from '@/components/SemaModal.vue';
import LinkPopup from '@/components/LinkPopup.vue';
import { markaListesiPdfBlob } from '@/utils/markaListesiPdf';
import { uploadDosya, createDosyaLinkleri } from '@/services/dosyaService';
import type { AksamBelgesi } from '@/services/aksamBelgesiService';

// Modül B marka listesi: katalogdaki güncel markalardan boş, onay kutulu form PDF'i
// her tıklamada yeniden oluşturulup indirme linkiyle verilir. Firmanın doldurduğu
// formun yüklenmesi denetim sayfasında, Marka Listesi butonunun altındadır.
const props = defineProps<{ katalog: AksamBelgesi[]; kartRegFren?: boolean }>();
const open = defineModel<boolean>('open', { default: false });

const linkAcik = ref(false);
const linkUrl = ref('');
const linkHata = ref('');

const DOSYA_ADI = 'Modul-B-Marka-Listesi.pdf';

// Her oluşturmada güncel katalogdan boş form üretilir, yüklenir ve 7 gün geçerli link verilir
async function pdfOlustur() {
  linkAcik.value = true;
  linkUrl.value = '';
  linkHata.value = '';
  try {
    const blob = await markaListesiPdfBlob(props.katalog, { kartRegFren: !!props.kartRegFren });
    const slot = await uploadDosya(new File([blob], DOSYA_ADI, { type: 'application/pdf' }));
    const linkler = await createDosyaLinkleri([slot]);
    linkUrl.value = linkler[slot.dosyaAnahtari];
  } catch (e) {
    linkHata.value = e instanceof Error ? e.message : 'PDF oluşturulamadı';
  }
}
</script>

<template>
  <SemaModal v-model:open="open" title="Marka Listesi">
    <div class="space-y-3">
      <!-- 1) Boş form PDF'i -->
      <section class="space-y-2 bg-surface-900/60 p-2.5 ring-1 ring-white/5">
        <h3 class="text-xs font-bold text-ink">1. Boş marka listesini oluştur</h3>
        <p class="text-[11px] leading-relaxed text-ink-muted">
          Katalogdaki markalardan (pasif belgeler "(Pasif)" notuyla), onay kutulu boş form oluşturulur (UCM çözümü Kart + Hız Reg. + Fren ise dişlili motorlar; Kart + Motor Fren ise dişlisiz motorlar ve UCM/ACOP listesi). Firma formu
          yazdırıp işaretler.
          Her oluşturmada aynı boş şablon güncel markalarla yeniden üretilir. İşaretli formun yüklenmesi, Marka Listesi butonunun altındaki alandan yapılır.
        </p>
        <button type="button" @click="pdfOlustur"
          class="flex w-full items-center justify-center gap-1.5 bg-[#2b5c3d] px-3 py-2.5 text-xs font-semibold text-ink ring-1 ring-white/10 active:bg-[#346e4a]">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5M12 11v6M9 14h6" />
          </svg>
          PDF Oluştur ve İndirme Linki Al
        </button>
      </section>
    </div>

    <LinkPopup v-model:acik="linkAcik" :url="linkUrl" :hata="linkHata"
      bekleme-metni="Marka listesi PDF'i oluşturuluyor…"
      aciklama="Boş marka listesi hazır; yazdırıp firmaya işaretletebilirsiniz."
      goruntule-tip="pdf" :goruntule-ad="DOSYA_ADI" />
  </SemaModal>
</template>
