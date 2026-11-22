import { ref } from 'vue';
import type { Asansor } from '@/services/asansorService';
import { getFirma } from '@/services/firmaService';
import { uploadDosya, createDosyaLinkleri } from '@/services/dosyaService';
import { asansorPdfBlob, asansorDosyaSlotlari } from '@/utils/denetimPdf';
import { asansorSemaCizimleri } from '@/utils/semaPdf';

// Asansör bilgi raporu: asansörün tüm bilgileri tablo düzeniyle PDF'e dökülür, yüklenir ve paylaşılabilir
// (7 gün geçerli) indirme linki popup'ı (LinkPopup) için durum üretilir — asansör bilgi popup'ı ve
// asansör detay sayfası ortak kullanır.
export function useAsansorPdf() {
  const pdfAcik = ref(false);
  const pdfUrl = ref('');
  const pdfHata = ref('');
  const pdfDosyaAdi = ref('Asansor-Bilgileri.pdf');

  async function pdfOlustur(a: Asansor | null) {
    if (!a) return;
    pdfAcik.value = true;
    pdfUrl.value = '';
    pdfHata.value = '';
    try {
      // Asansörün firması (firma + SMM bilgileri) raporda yer alır; alınamazsa firmasız devam edilir
      const firmaId = typeof a.firmaId === 'object' && a.firmaId ? a.firmaId._id : (a.firmaId as string | null);
      const firma = firmaId ? await getFirma(firmaId).catch(() => null) : null;
      const slotlar = asansorDosyaSlotlari(a, firma);
      const linkler = slotlar.length
        ? await createDosyaLinkleri(slotlar.map((s) => ({ dosyaAnahtari: s.dosyaAnahtari, dosyaAdi: s.dosyaAdi })))
        : {};
      const blob = await asansorPdfBlob({ asansor: a, firma, linkler, semalar: asansorSemaCizimleri(a) });
      const ad = `Asansor-${(a.seriNo || a.yapiRuhsatNo || 'Bilgileri').replace(/[\/:*?"<>|\s]+/g, '-')}.pdf`;
      pdfDosyaAdi.value = ad;
      const slot = await uploadDosya(new File([blob], ad, { type: 'application/pdf' }));
      const pdfLinkler = await createDosyaLinkleri([slot]);
      pdfUrl.value = pdfLinkler[slot.dosyaAnahtari];
    } catch (e) {
      pdfHata.value = e instanceof Error ? e.message : 'PDF oluşturulamadı';
    }
  }

  return { pdfAcik, pdfUrl, pdfHata, pdfDosyaAdi, pdfOlustur };
}
