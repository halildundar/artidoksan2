import type { Content, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import type { Denetim } from '@/services/denetimService';
import type { Firma, CeBelgesi } from '@/services/firmaService';
import type { Asansor } from '@/services/asansorService';
import type { BelgeSlot } from '@/services/dosyaService';
import {
  bilgiTarih,
  firmaKimlikSatirlari, firmaResmiBelgeSatirlari, firmaBelgeSatirlari,
  firmaSmmSatirlari, firmaSmmBelgeSatirlari,
  firmaPersonelSatirlari, MUHENDIS_TUR_ETIKETLERI,
  type Satir, type BelgeSatiri,
} from '@/utils/firmaBilgi';
import {
  AKSAM_SLOT_ETIKETLERI, etiket,
  asansorBolumleri, asansorRiskGruplari, asansorBelgeSatirlari, asansorFotoGruplari,
} from '@/utils/asansorBilgi';

// Denetim PDF raporu — bilgi popup'larının (FirmaBilgiModal/AsansorBilgiModal)
// bölümlerini aynı sırayla kâğıda döker; dosyalar PDF içinde tıklanabilir
// (7 gün geçerli) linkler olarak yer alır.

// Kalibrasyon (firmanın Cihazlar dosyaları) bu modüllerin raporuna girer
const KALIBRASYONLU_MODULLER = ['Modul E', 'Modul H1'];

const YESIL = '#2b5c3d';
const ACIK_YESIL = '#e8f0ea';
const GRI = '#6b7280';
const LINK_RENK = '#0b57d0';

export interface DenetimPdfVeri {
  denetim: Denetim;
  firma: Firma | null;
  asansor: Asansor | null;
  // dosyaAnahtari → 7 gün geçerli indirme linki
  linkler: Record<string, string>;
  // bölüm başlığı → o bölümün tablosu altına girecek şema SVG'leri
  // (utils/semaPdf.ts üretir; başlıklar asansorBolumleri ile birebir)
  semalar?: Record<string, string[]>;
  // Rapor başlığı ("Tescil" gibi) — verilmezse `${modul} Denetimi`;
  // bölüm başlığı ve alt bilgi de bu ada göre kurulur
  baslik?: string;
  // Tescil raporu: firmanın CE belgelerinden tescile seçilenler — üstte
  // "Tescil CE Belgeleri" tablosu olarak yer alır
  tescilCeBelgeleri?: CeBelgesi[];
}

// PDF'e link gömülecek tüm dosya slotları (denetim + firma + asansör)
export function denetimDosyaSlotlari(
  denetim: Denetim,
  firma: Firma | null,
  asansor: Asansor | null
): BelgeSlot[] {
  const slotlar: (BelgeSlot | null | undefined)[] = [
    denetim.ekProje,
    ...(denetim.tipProjeler ?? []),
    ...(denetim.montajSozlesmeleri ?? []),
    ...(denetim.malzemeFaturalari ?? []),
  ];
  if (firma) {
    slotlar.push(
      ...firmaBelgeSatirlari(firma).map((b) => b.slot),
      ...(firma.ceBelgeleri ?? []).map((ce) => ce.dosya),
      ...firmaSmmBelgeSatirlari(firma).map((b) => b.slot),
      ...(firma.muhendisler ?? []).flatMap((m) => m.belgeler ?? []),
      ...(firma.sgkDokumleri ?? []),
      // Modul E / H1: kalibrasyon = firmanın Cihazlar sekmesindeki dosyalar
      ...(KALIBRASYONLU_MODULLER.includes(denetim.modul) ? (firma.cihazDosyalari ?? []) : [])
    );
  }
  if (asansor) {
    slotlar.push(
      ...asansorBelgeSatirlari(asansor).map((b) => b.slot),
      ...asansorRiskGruplari(asansor).flatMap((g) =>
        g.maddeler.flatMap((m) => [m.resim, ...(m.fotolar ?? [])])
      ),
      ...asansorFotoGruplari(asansor).flatMap((g) => g.fotolar)
    );
  }
  return slotlar.filter((s): s is BelgeSlot => !!s);
}

function etiketHucre(metin: string): TableCell {
  return { text: metin, bold: true, color: GRI, fillColor: '#f3f4f6' };
}

function degerHucre(metin: string, colSpan = 1): TableCell {
  return { text: metin || '—', colSpan };
}

function dosyaHucre(
  slot: BelgeSlot | null | undefined,
  linkler: Record<string, string>,
  colSpan = 1
): TableCell {
  if (!slot) return degerHucre('', colSpan);
  const url = linkler[slot.dosyaAnahtari];
  if (!url) return { text: slot.dosyaAdi, colSpan };
  return { text: slot.dosyaAdi, link: url, color: LINK_RENK, decoration: 'underline', colSpan };
}

// Bölüm başlığı + etiket/değer tablosu (popup'taki 2 sütunlu düzen)
function bolumTablosu(baslik: string, satirlar: Satir[]): Content {
  const govde: TableCell[][] = satirlar.map((satir) =>
    satir.length === 1
      ? [etiketHucre(satir[0][0]), degerHucre(satir[0][1], 3), {}, {}]
      : [etiketHucre(satir[0][0]), degerHucre(satir[0][1]), etiketHucre(satir[1][0]), degerHucre(satir[1][1])]
  );
  return {
    table: {
      widths: [95, '*', 95, '*'],
      body: [
        [{ text: baslik.toLocaleUpperCase('tr'), colSpan: 4, bold: true, color: 'white', fillColor: YESIL }, {}, {}, {}],
        ...govde,
      ],
    },
    layout: tabloDuzeni(),
    margin: [0, 0, 0, 10],
  };
}

// Dosya listesi bölümü: etiket + (tıklanabilir) dosya adı
function belgeTablosu(baslik: string, satirlar: BelgeSatiri[], linkler: Record<string, string>): Content {
  return {
    table: {
      widths: [140, '*'],
      body: [
        [{ text: baslik.toLocaleUpperCase('tr'), colSpan: 2, bold: true, color: 'white', fillColor: YESIL }, {}],
        ...satirlar.map((b) => [etiketHucre(b.etiket), dosyaHucre(b.slot, linkler)]),
      ],
    },
    layout: tabloDuzeni(),
    margin: [0, 0, 0, 10],
  };
}

// Büyük ara başlık (Firma / Asansör ayracı) — tek hücreli renkli bant
function araBaslik(metin: string): Content {
  return {
    table: {
      widths: ['*'],
      body: [[{ text: metin.toLocaleUpperCase('tr'), bold: true, fontSize: 11, color: YESIL, fillColor: ACIK_YESIL }]],
    },
    layout: 'noBorders',
    margin: [0, 4, 0, 8],
  };
}

function tabloDuzeni() {
  return {
    hLineColor: () => '#d1d5db',
    vLineColor: () => '#d1d5db',
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    paddingTop: () => 3,
    paddingBottom: () => 3,
    paddingLeft: () => 5,
    paddingRight: () => 5,
  };
}

// Birden çok belgeyi alt alta tıklanabilir adlarıyla tek hücrede listeler
function belgeLinkHucresi(belgeler: BelgeSlot[], linkler: Record<string, string>): TableCell {
  if (!belgeler.length) return degerHucre('');
  return {
    text: belgeler.flatMap((b, i) => {
      const parca = linkler[b.dosyaAnahtari]
        ? { text: b.dosyaAdi, link: linkler[b.dosyaAnahtari], color: LINK_RENK, decoration: 'underline' as const }
        : { text: b.dosyaAdi };
      return i < belgeler.length - 1 ? [parca, { text: '\n' }] : [parca];
    }),
  };
}

function fotoLinkleri(fotolar: BelgeSlot[], linkler: Record<string, string>): Content {
  return {
    text: fotolar.flatMap((foto, i) => {
      const parca = linkler[foto.dosyaAnahtari]
        ? { text: `Fotoğraf ${i + 1}`, link: linkler[foto.dosyaAnahtari], color: LINK_RENK, decoration: 'underline' as const }
        : { text: `Fotoğraf ${i + 1}` };
      return i < fotolar.length - 1 ? [parca, { text: '   ' }] : [parca];
    }),
  };
}

// CE belgeleri tablosu — firma bölümünde ve tescilde (seçilenler) kullanılır
function ceTablosu(baslik: string, celer: CeBelgesi[], linkler: Record<string, string>): Content {
  return {
    table: {
      widths: ['auto', '*', 'auto', '*'],
      body: [
        [{ text: baslik.toLocaleUpperCase('tr'), colSpan: 4, bold: true, color: 'white', fillColor: YESIL }, {}, {}, {}],
        [etiketHucre('Modül'), etiketHucre('Belge No'), etiketHucre('Geçerlilik'), etiketHucre('Dosya')],
        ...celer.map((ce) => [
          degerHucre(ce.modul),
          degerHucre(ce.belgeNo),
          degerHucre(`${bilgiTarih(ce.gecerlilikTarihi)} – ${bilgiTarih(ce.bitisTarihi)}`),
          dosyaHucre(ce.dosya, linkler),
        ]),
      ],
    },
    layout: tabloDuzeni(),
    margin: [0, 0, 0, 10],
  };
}

// Bölüm tablosunun altına yerleşen şema çizimleri
function semaIcerigi(svgler: string[] | undefined): Content[] {
  return (svgler ?? []).map((svg) => ({
    svg,
    width: 300,
    alignment: 'center' as const,
    margin: [0, 0, 0, 10] as [number, number, number, number],
  }));
}

export function denetimPdfTanimi(veri: DenetimPdfVeri): TDocumentDefinitions {
  const { denetim, firma, asansor, linkler, semalar } = veri;
  const icerik: Content[] = [];

  // Rapor adı: denetimlerde "Modul X Denetimi", tescilde "Tescil"
  const raporAdi = veri.baslik ?? `${denetim.modul} Denetimi`;
  const bilgiEtiketi = veri.baslik ?? 'Denetim';

  // Başlık — tarih satırı yalnızca kayıtta tarih varsa (tescilde ayrı tarih yok)
  icerik.push({
    text: raporAdi, fontSize: 16, bold: true, color: YESIL,
    margin: [0, 0, 0, denetim.denetimTarihi ? 0 : 12],
  });
  if (denetim.denetimTarihi) {
    icerik.push({
      text: `${bilgiEtiketi} Tarihi: ${bilgiTarih(denetim.denetimTarihi)}`,
      color: GRI,
      margin: [0, 2, 0, 12],
    });
  }

  // Denetim/tescil bilgileri
  icerik.push(
    bolumTablosu(`${bilgiEtiketi} Bilgileri`, [
      [['AB Uygunluk Beyanı', bilgiTarih(denetim.abUygunlukBeyaniTarihi)], ['Son Kontrol', bilgiTarih(denetim.sonKontrolTarihi)]],
    ]),
    {
      table: {
        widths: [140, '*'],
        body: [[etiketHucre('Uygulama Projesi'), dosyaHucre(denetim.ekProje, linkler)]],
      },
      layout: tabloDuzeni(),
      margin: [0, -10, 0, 10],
    }
  );

  // Modul B: tip projeleri (ZIP) tıklanabilir linklerle listelenir
  if (denetim.tipProjeler?.length) {
    icerik.push(belgeTablosu(
      'Tip Projeler',
      denetim.tipProjeler.map((p, i) => ({ etiket: `Tip Proje ${i + 1}`, slot: p })),
      linkler
    ));
  }

  // Modul B: katalogdan seçilen güvenlik aksamları
  if (denetim.guvenlikAksamlari?.length) {
    icerik.push({
      table: {
        widths: ['auto', '*', '*', '*'],
        body: [
          [{ text: 'SEÇİLEN GÜVENLİK AKSAMLARI', colSpan: 4, bold: true, color: 'white', fillColor: YESIL }, {}, {}, {}],
          [etiketHucre('Komponent'), etiketHucre('Marka'), etiketHucre('Tip'), etiketHucre('Sertifika No')],
          ...denetim.guvenlikAksamlari.map((a) => [
            degerHucre(a.bilesenTipiAdi),
            degerHucre(a.marka),
            degerHucre(a.tip),
            degerHucre(a.sertifikaNo),
          ]),
        ],
      },
      layout: tabloDuzeni(),
      margin: [0, 0, 0, 10],
    });
  }

  // Modul E: montaj sözleşmesi ve malzeme faturaları tıklanabilir linklerle
  if (denetim.montajSozlesmeleri?.length) {
    icerik.push(belgeTablosu(
      'Montaj Sözleşmesi',
      denetim.montajSozlesmeleri.map((s, i) => ({ etiket: `Sözleşme ${i + 1}`, slot: s })),
      linkler
    ));
  }
  if (denetim.malzemeFaturalari?.length) {
    icerik.push(belgeTablosu(
      'Malzeme Faturaları',
      denetim.malzemeFaturalari.map((s, i) => ({ etiket: `Fatura ${i + 1}`, slot: s })),
      linkler
    ));
  }

  // Tescil dosyasına seçilen CE belgeleri — hemen tescil bilgilerinin altında
  if (veri.tescilCeBelgeleri?.length) {
    icerik.push(ceTablosu('Tescil CE Belgeleri', veri.tescilCeBelgeleri, linkler));
  }

  // Firma bölümleri — FirmaBilgiModal ile aynı sıra
  if (firma) {
    icerik.push(araBaslik(`Asansör Firması — ${firma.ad}`));
    icerik.push(bolumTablosu('Firma Bilgileri', firmaKimlikSatirlari(firma)));
    icerik.push(bolumTablosu('Belge Bilgileri', firmaResmiBelgeSatirlari(firma)));
    icerik.push(belgeTablosu('Belgeler', firmaBelgeSatirlari(firma), linkler));

    if (firma.ceBelgeleri?.length) {
      icerik.push(ceTablosu('CE Belgeleri', firma.ceBelgeleri, linkler));
    }

    if (firma.smmFirmaId || firma.smmKisaAd) {
      icerik.push(bolumTablosu('SMM Bilgileri', firmaSmmSatirlari(firma)));
      icerik.push(belgeTablosu('SMM Belgeleri', firmaSmmBelgeSatirlari(firma), linkler));
    }

    // Personel: sabit görevliler + mühendisler (belgeleriyle) + SGK dökümü
    icerik.push(bolumTablosu('Personel', firmaPersonelSatirlari(firma)));

    if (firma.muhendisler?.length) {
      icerik.push({
        table: {
          widths: ['auto', '*', '*'],
          body: [
            [{ text: 'MÜHENDİSLER', colSpan: 3, bold: true, color: 'white', fillColor: YESIL }, {}, {}],
            [etiketHucre('Tür'), etiketHucre('Ad Soyad'), etiketHucre('Belgeler')],
            ...firma.muhendisler.map((m) => [
              degerHucre(MUHENDIS_TUR_ETIKETLERI[m.tur] ?? m.tur),
              degerHucre(m.adSoyad),
              belgeLinkHucresi(m.belgeler ?? [], linkler),
            ]),
          ],
        },
        layout: tabloDuzeni(),
        margin: [0, 0, 0, 10],
      });
    }

    if (firma.sgkDokumleri?.length) {
      icerik.push({
        table: {
          widths: [140, '*'],
          body: [
            [{ text: 'SGK DÖKÜMÜ', colSpan: 2, bold: true, color: 'white', fillColor: YESIL }, {}],
            ...firma.sgkDokumleri.map((s, i) => [etiketHucre(`Döküm ${i + 1}`), dosyaHucre(s, linkler)]),
          ],
        },
        layout: tabloDuzeni(),
        margin: [0, 0, 0, 10],
      });
    }

    // Modul E / H1: firmanın kalibrasyon (Cihazlar) dosyaları linkleriyle
    if (KALIBRASYONLU_MODULLER.includes(denetim.modul) && firma.cihazDosyalari?.length) {
      icerik.push(belgeTablosu(
        'Kalibrasyon (Cihazlar)',
        firma.cihazDosyalari.map((s, i) => ({ etiket: `Dosya ${i + 1}`, slot: s })),
        linkler
      ));
    }
  }

  // Asansör bölümleri — AsansorBilgiModal ile aynı sıra
  if (asansor) {
    icerik.push(araBaslik(`Asansör — ${asansor.seriNo || asansor.yapiRuhsatNo || ''}`));
    for (const bolum of asansorBolumleri(asansor)) {
      icerik.push(bolumTablosu(bolum.baslik, bolum.satirlar));
      // İlgili bölümün şeması (kabin, kapı, halat, ray, kuyu dip/üst) tablonun altına
      icerik.push(...semaIcerigi(semalar?.[bolum.baslik]));
    }

    const katlar = asansor.katYukseklikleri ?? [];
    if (katlar.length) {
      icerik.push(bolumTablosu(
        'Kat Yükseklikleri',
        katlar.map((k): Satir => [[`${k.kat}. Kat`, `${k.yukseklik} mm`]])
      ));
    }

    const aksamlar = asansor.guvenlikAksamlari ?? [];
    if (aksamlar.length) {
      icerik.push({
        table: {
          widths: ['auto', '*', '*', '*', '*', 'auto'],
          body: [
            [{ text: 'GÜVENLİK AKSAMLARI', colSpan: 6, bold: true, color: 'white', fillColor: YESIL }, {}, {}, {}, {}, {}],
            [etiketHucre('Aksam'), etiketHucre('Marka'), etiketHucre('Tip'), etiketHucre('Seri No'), etiketHucre('Sertifika'), etiketHucre('Geçerlilik')],
            ...aksamlar.map((g) => [
              degerHucre(etiket(AKSAM_SLOT_ETIKETLERI, g.slot)),
              degerHucre(g.markaSnapshot ?? ''),
              degerHucre(g.tip ?? ''),
              degerHucre(g.seriNo ?? ''),
              degerHucre(g.sertifikaNo ?? ''),
              degerHucre(`${bilgiTarih(g.gecerlilikBaslangic)} – ${bilgiTarih(g.gecerlilikBitis)}`),
            ]),
          ],
        },
        layout: tabloDuzeni(),
        fontSize: 7.5,
        margin: [0, 0, 0, 10],
      });
    }

    for (const grup of asansorRiskGruplari(asansor)) {
      icerik.push({
        table: {
          widths: ['*'],
          body: [
            [{ text: grup.baslik.toLocaleUpperCase('tr'), bold: true, color: 'white', fillColor: YESIL }],
            ...grup.maddeler.map((m) => {
              const fotolar = [m.resim, ...(m.fotolar ?? [])].filter((s): s is BelgeSlot => !!s);
              const hucre: Content[] = [{ text: m.metin || '—' }];
              if (fotolar.length) hucre.push({ ...fotoLinkleri(fotolar, linkler) as object, margin: [0, 2, 0, 0] } as Content);
              return [hucre as unknown as TableCell];
            }),
          ],
        },
        layout: tabloDuzeni(),
        margin: [0, 0, 0, 10],
      });
    }

    const belgeler = asansorBelgeSatirlari(asansor);
    if (belgeler.length) icerik.push(belgeTablosu('Belgeler', belgeler, linkler));

    const fotoGruplari = asansorFotoGruplari(asansor);
    if (fotoGruplari.length) {
      icerik.push({
        table: {
          widths: [140, '*'],
          body: [
            [{ text: 'FOTOĞRAFLAR', colSpan: 2, bold: true, color: 'white', fillColor: YESIL }, {}],
            ...fotoGruplari.map((g) => [etiketHucre(g.baslik), fotoLinkleri(g.fotolar, linkler) as TableCell]),
          ],
        },
        layout: tabloDuzeni(),
        margin: [0, 0, 0, 10],
      });
    }
  }

  return {
    pageSize: 'A4',
    pageMargins: [32, 36, 32, 40],
    defaultStyle: { fontSize: 8.5 },
    footer: (sayfa, toplam) => ({
      text: [raporAdi, denetim.denetimTarihi ? bilgiTarih(denetim.denetimTarihi) : '']
        .filter(Boolean).join(' — ') + `  •  Sayfa ${sayfa}/${toplam}`,
      alignment: 'center', fontSize: 7.5, color: GRI, margin: [0, 12, 0, 0],
    }),
    content: icerik,
  };
}

interface PdfMakeStatic {
  vfs?: Record<string, string>;
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
  createPdf: (tanim: TDocumentDefinitions) => { getBlob: (cb: (b: Blob) => void) => unknown };
}

// pdfmake yalnız ihtiyaç anında (dinamik import) yüklenir — ana pakete girmez
export async function denetimPdfBlob(veri: DenetimPdfVeri): Promise<Blob> {
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const pdfMake = ((pdfMakeMod as { default?: unknown }).default ?? pdfMakeMod) as PdfMakeStatic;
  const vfsHam = (vfsMod as { default?: unknown }).default ?? vfsMod;
  const vfs = ((vfsHam as { pdfMake?: { vfs?: unknown } }).pdfMake?.vfs ?? vfsHam) as Record<string, string>;
  if (typeof pdfMake.addVirtualFileSystem === 'function') pdfMake.addVirtualFileSystem(vfs);
  else pdfMake.vfs = vfs;

  const pdf = pdfMake.createPdf(denetimPdfTanimi(veri));
  return new Promise<Blob>((resolve, reject) => {
    try {
      // 0.2'de callback, 0.3'te Promise döner — ikisi de karşılanır
      const sonuc = pdf.getBlob((b: Blob) => resolve(b));
      if (sonuc && typeof (sonuc as Promise<Blob>).then === 'function') {
        (sonuc as Promise<Blob>).then(resolve, reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}
