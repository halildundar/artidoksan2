import type { Content, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import type { AksamBelgesi } from '@/services/aksamBelgesiService';

// Modül B "Güvenlik Aksamları Örnek Marka Listesi": katalogdaki aktif belgelerin
// markalarından, komponent başına onay kutulu BOŞ form üretilir. Firma formu elle
// işaretleyip yükler (fotoğraf/tarama) — bu yüzden her seferinde aynı boş şablon çıkar.

const BASLIK_RENK = '#7f7f7f';
const TITLE_ARKAPLAN = '#bfe3f5';
const SATIR_ARKAPLAN = '#eef4f7';

interface Sutun { baslik: string; kodlar: string[]; kaynak?: string }
const HIZ: Sutun = { baslik: 'HIZ REGÜLATÖRÜ', kodlar: ['hiz_regulatoru'] };
const FREN: Sutun = { baslik: 'FREN', kodlar: ['fren'] };
const DURAK: Sutun = { baslik: 'DURAK KAPI KİLİT', kodlar: ['durak_kapi_kilidi'] };
const KABIN: Sutun = { baslik: 'KABİN KAPI KİLİT', kodlar: ['kabin_kapi_kilidi'] };
const TAMPON: Sutun = { baslik: 'TAMPON', kodlar: ['tampon'] };
const KART: Sutun = { baslik: 'KART', kodlar: ['kontrol_karti'] };
const UCM: Sutun = { baslik: 'UCM / ACOP', kodlar: ['ucm_acop'] };
// Denetim ekranında motor belgeleri tek "motor" komponentinde toplanır; asıl tür kaynakKod'da durur
const MOTOR_DISLILI: Sutun = { baslik: 'MOTOR (DİŞLİLİ)', kodlar: ['motor'], kaynak: 'motor_dislili' };
const MOTOR_DISLISIZ: Sutun = { baslik: 'MOTOR (DİŞLİSİZ)', kodlar: ['motor'], kaynak: 'motor_dislisiz' };

// Markalar A-Z ve tekil (büyük/küçük harf ve Türkçe i/İ farkı yok sayılır). Pasif belgeler de listelenir:
// yalnızca pasif belgeleri olan marka "(Pasif)" notuyla yazılır — seçim kararı firmaya/denetçiye aittir
function markalar(katalog: AksamBelgesi[], s: Sutun): string[] {
  const kodlar = s.kodlar;
  const harita = new Map<string, { ad: string; aktif: boolean }>();
  for (const b of katalog) {
    if (!kodlar.includes(b.bilesenTipiKodu)) continue;
    if (s.kaynak && (b as { kaynakKod?: string }).kaynakKod !== s.kaynak) continue;
    const ad = (b.marka ?? '').trim();
    if (!ad) continue;
    const anahtar = ad.toLocaleLowerCase('tr');
    const kayit = harita.get(anahtar) ?? { ad: ad.toLocaleUpperCase('tr'), aktif: false };
    if (b.durum !== 'pasif') kayit.aktif = true;
    harita.set(anahtar, kayit);
  }
  return [...harita.values()]
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
    .map((k) => (k.aktif ? k.ad : `${k.ad} (Pasif)`));
}

const onayKutusu = (): TableCell => ({
  canvas: [{ type: 'rect', x: 0, y: 0, w: 5.6, h: 5.6, lineWidth: 0.6, lineColor: '#000000' }],
  alignment: 'center',
  margin: [0, 0.6, 0, 0],
});

function liste(katalog: AksamBelgesi[], s: Sutun): Content {
  const m = markalar(katalog, s);
  const govde: TableCell[][] = [
    [
      { text: 'No', style: 'baslikHucre', alignment: 'center' },
      { text: s.baslik, style: 'baslikHucre' },
      { text: 'Onay', style: 'baslikHucre', alignment: 'center' },
    ],
    ...m.map((ad, i) => [
      { text: String(i + 1), alignment: 'center' as const, fillColor: SATIR_ARKAPLAN },
      { text: ad, bold: true, fillColor: SATIR_ARKAPLAN },
      onayKutusu(),
    ]),
  ];
  return {
    table: { headerRows: 1, widths: [10, '*', 16], body: govde, dontBreakRows: true },
    layout: {
      hLineWidth: () => 0.4, vLineWidth: () => 0.4,
      hLineColor: () => '#555555', vLineColor: () => '#555555',
      paddingTop: () => 0.7, paddingBottom: () => 0.7, paddingLeft: () => 1.5, paddingRight: () => 1.5,
    },
    margin: [0, 0, 0, 5],
  };
}

// kartRegFren (UCM/ACOP çözümü "Kart + Hız Reg. + Fren"): yalnız dişlili motor listesi basılır, UCM/ACOP
// listesi basılmaz. Diğer çözümde (Kart + Motor Fren): dişlisiz motor listesi + UCM/ACOP listesi basılır.
export interface MarkaListesiSecenek { kartRegFren: boolean }

export function markaListesiTanimi(katalog: AksamBelgesi[], secenek: MarkaListesiSecenek = { kartRegFren: false }): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: [14, 18, 14, 18],
    defaultStyle: { fontSize: 5.4, lineHeight: 1 },
    styles: {
      baslikHucre: { bold: true, color: '#ffffff', fillColor: BASLIK_RENK, fontSize: 5.6 },
    },
    content: [
      {
        table: {
          widths: ['*'],
          body: [[{
            text: 'MODÜL B SERTİFİKASI GÜVENLİK AKSAMLARI ÖRNEK MARKA LİSTESİ',
            bold: true, italics: true, fontSize: 13, alignment: 'center', fillColor: TITLE_ARKAPLAN,
            margin: [0, 6, 0, 6],
          }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          { width: '*', stack: [liste(katalog, HIZ), liste(katalog, TAMPON)] },
          { width: '*', stack: [liste(katalog, FREN), liste(katalog, KART)] },
          { width: '*', stack: [liste(katalog, DURAK)] },
          { width: '*', stack: [liste(katalog, KABIN)] },
          { width: '*', stack: secenek.kartRegFren ? [liste(katalog, MOTOR_DISLILI)] : [liste(katalog, UCM), liste(katalog, MOTOR_DISLISIZ)] },
        ],
        columnGap: 6,
      },
      {
        margin: [0, 14, 0, 0],
        unbreakable: true,
        stack: [
          {
            text: [
              'GÜVENLİK AKSAMLARINDAN ', { text: '10 ADET', decoration: 'underline' },
              ' SEÇİP İŞARETLEYİNİZ. İŞARETLİ LİSTENİN FOTOĞRAFINI DENETİM EKİBİNE İLETİNİZ.',
            ],
            bold: true, fontSize: 8.5, alignment: 'center', margin: [0, 0, 0, 6],
          },
          {
            text: 'LİSTEDE YAZILI OLMAYAN MARKALAR İÇİN DENETİM EKİBİNE İLGİLİ MARKALARIN GÜNCEL CE SERTİFİKALARINI ULAŞTIRINIZ',
            bold: true, fontSize: 8.5, alignment: 'center', margin: [0, 0, 0, 18],
          },
          {
            columns: [
              { width: '*', text: '' },
              {
                width: 260,
                stack: [
                  { text: 'FİRMA ADI                  : ________________________________', bold: true, fontSize: 8.5, margin: [0, 0, 0, 12] },
                  { text: 'LİSTEYİ HAZIRLAYAN : ________________________________', bold: true, fontSize: 8.5 },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

interface PdfMakeStatic {
  vfs?: Record<string, string>;
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
  createPdf: (tanim: TDocumentDefinitions) => { getBlob: (cb: (b: Blob) => void) => unknown };
}

// pdfmake yalnız ihtiyaç anında (dinamik import) yüklenir — ana pakete girmez
export async function markaListesiPdfBlob(katalog: AksamBelgesi[], secenek?: MarkaListesiSecenek): Promise<Blob> {
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const pdfMake = ((pdfMakeMod as { default?: unknown }).default ?? pdfMakeMod) as PdfMakeStatic;
  const vfsHam = (vfsMod as { default?: unknown }).default ?? vfsMod;
  const vfs = ((vfsHam as { pdfMake?: { vfs?: unknown } }).pdfMake?.vfs ?? vfsHam) as Record<string, string>;
  if (typeof pdfMake.addVirtualFileSystem === 'function') pdfMake.addVirtualFileSystem(vfs);
  else pdfMake.vfs = vfs;

  const pdf = pdfMake.createPdf(markaListesiTanimi(katalog, secenek));
  return new Promise<Blob>((resolve, reject) => {
    try {
      const sonuc = pdf.getBlob((b: Blob) => resolve(b));
      if (sonuc && typeof (sonuc as Promise<Blob>).then === 'function') {
        (sonuc as Promise<Blob>).then(resolve, reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}
