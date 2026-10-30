import type { Asansor } from '@/services/asansorService';
import type { BelgeSlot } from '@/services/dosyaService';
import { bilgiTarih, type Satir, type BelgeSatiri } from '@/utils/firmaBilgi';
import { rayTipiEtiketi } from '@/utils/rayTipleri';
import {
  SINIF_ETIKETLERI,
  MAKINA_KONUMU_ETIKETLERI,
  AGIRLIK_KONUMU_ETIKETLERI,
  GIRIS_TIPI_ETIKETLERI,
  HALAT_SEKLI_ETIKETLERI,
} from '@/utils/asansorSecenekler';

// Asansör bilgi popup'ının (AsansorBilgiModal) bölüm içerikleri — PDF raporu
// da aynı bölümleri kullansın diye saf fonksiyonlar halinde burada tutulur.

function sayi(v: number | null | undefined, birim = '') {
  return v == null ? '' : `${v}${birim}`;
}

function evetHayir(v: boolean | null | undefined) {
  return v ? 'Evet' : 'Hayır';
}

// ---- Enum değer → etiket haritaları ----
const TAHRIK_ETIKETLERI: Record<string, string> = { elektrikli: 'Elektrikli', hidrolik: 'Hidrolik' };
const YON_ETIKETLERI: Record<string, string> = { sag: 'Sağ', sol: 'Sol', merkezi: 'Merkezi' };
const KONUM_ETIKETLERI: Record<string, string> = { on: 'Ön', arka: 'Arka', sol: 'Sol', sag: 'Sağ' };
const PANEL_MALZEME_ETIKETLERI: Record<string, string> = { paslanmaz: 'Paslanmaz', cam: 'Cam' };
const PALANGA_KONUM_ETIKETLERI: Record<string, string> = {
  yok: 'Yok', 'kabin-ustu': 'Kabin Üstü', 'kabin-alti': 'Kabin Altı',
};
const REGULATOR_KONUM_ETIKETLERI: Record<string, string> = {
  'sol-on': 'Sol Ön', 'sol-arka': 'Sol Arka', 'sag-on': 'Sağ Ön', 'sag-arka': 'Sağ Arka',
};
const FREN_KONUM_ETIKETLERI: Record<string, string> = { 'kabin-alti': 'Kabin Altı', 'kabin-ustu': 'Kabin Üstü' };
const KA_FREN_KONUM_ETIKETLERI: Record<string, string> = { alt: 'Alt', ust: 'Üst' };
const MOTOR_DISLI_ETIKETLERI: Record<string, string> = { dislisiz: 'Dişlisiz', dislili: 'Dişlili' };
const UCM_TUR_ETIKETLERI: Record<string, string> = {
  'kart-motor-fren': 'Kontrol Kartı + Motor Freni',
  'kart-reg-fren': 'Kontrol Kartı + Hız Regülatörü + Fren',
};
export const AKSAM_SLOT_ETIKETLERI: Record<string, string> = {
  kabin_tamponu: 'Kabin Tamponu',
  karsi_agirlik_tamponu: 'Karşı Ağırlık Tamponu',
  durak_kapi_kilidi: 'Durak Kapı Kilidi',
  kabin_kapi_kilidi: 'Kabin Kapı Kilidi',
  durak_kapi_kilidi_2: 'Durak Kapı Kilidi (2. Giriş)',
  kabin_kapi_kilidi_2: 'Kabin Kapı Kilidi (2. Giriş)',
  sarkac_test_raporu: 'Sarkaç Test Raporu',
  yangin_sizdirmazlik_raporu: 'Yangın Sızdırmazlık Raporu',
  fren: 'Fren',
  karsi_agirlik_freni: 'Karşı Ağırlık Freni',
  kontrol_karti: 'Kontrol Kartı',
  hiz_regulatoru: 'Hız Regülatörü',
  ucm_acop: 'UCM/ACOP',
};

export function etiket(harita: Record<string, string>, deger: string | null | undefined) {
  return deger ? (harita[deger] ?? deger) : '';
}

export interface BilgiBolumu {
  baslik: string;
  satirlar: Satir[];
}

// Etiket/değer bölümleri — asansörün tüm şema alanları
export function asansorBolumleri(a: Asansor): BilgiBolumu[] {
  const kabinOlculeri = [a.kabinGenislik, a.kabinDerinlik, a.kabinYukseklik];
  const kabinOlcu = kabinOlculeri.every((v) => v == null)
    ? ''
    : `${kabinOlculeri.map((v) => v ?? '?').join(' × ')} mm`;
  const agirlikBloklari = (a.agirlikBloklari ?? [])
    .map((b) => `${b.adet} × ${b.birimAgirlik} kg`)
    .join(', ');

  const girisSatirlari = (n: 1 | 2): Satir[] => {
    const g = n === 1
      ? {
          genislik: a.giris1KapiGenislik, yukseklik: a.giris1KapiYukseklik,
          adet: a.giris1KapiAdet, panel: a.giris1PanelSayisi, yon: a.giris1KapiYonu,
          konum: a.giris1Konum, malzeme: a.giris1PanelMalzemesi,
          dusuk: a.giris1DusukKapiDuraklari, marka: a.kapiPanelleriMarka, duraklar: null,
        }
      : {
          genislik: a.giris2KapiGenislik, yukseklik: a.giris2KapiYukseklik,
          adet: a.giris2KapiAdet, panel: a.giris2PanelSayisi, yon: a.giris2KapiYonu,
          konum: a.giris2Konum, malzeme: a.giris2PanelMalzemesi,
          dusuk: a.giris2DusukKapiDuraklari, marka: a.kapiPanelleriMarka2, duraklar: a.giris2Duraklar,
        };
    const satirlar: Satir[] = [
      [['Kapı (G×Y)', g.genislik || g.yukseklik ? `${g.genislik ?? '?'} × ${g.yukseklik ?? '?'} mm` : ''],
        ['Kapı Adedi', sayi(g.adet)]],
      [['Panel Sayısı', sayi(g.panel)], ['Açılış Yönü', etiket(YON_ETIKETLERI, g.yon)]],
      [['Konum', etiket(KONUM_ETIKETLERI, g.konum)], ['Panel Malzemesi', etiket(PANEL_MALZEME_ETIKETLERI, g.malzeme)]],
      [['Düşük Kapı Durakları', (g.dusuk ?? []).join(', ')], ['Panel Markası', g.marka]],
    ];
    if (g.duraklar) satirlar.push([['2. Giriş Durakları', g.duraklar.join(', ')]]);
    return satirlar;
  };

  const liste: BilgiBolumu[] = [
    {
      baslik: 'Asansör Bilgileri',
      satirlar: [
        [['Seri No', a.seriNo], ['Ruhsat No', a.yapiRuhsatNo]],
        [['Montaj Yılı', sayi(a.montajYili)], ['AB Uyg. Beyanı', bilgiTarih(a.abUygunlukBeyaniTarihi)]],
        [['Yapı Sahibi', a.yapiSahibiAdi]],
        [['Müteahhit', a.yapiMuteahhidi]],
      ],
    },
    {
      baslik: 'Adres',
      satirlar: [
        [['İl/İlçe', [a.ilce, a.il].filter(Boolean).join('/')], ['Mahalle', a.mahalle]],
        [['Posta Kodu', a.postaKodu], ['Ada/Parsel', [a.ada, a.parsel].filter(Boolean).join('/')]],
        [['Adres', a.adres]],
      ],
    },
    {
      baslik: 'Teknik Özellikler',
      satirlar: [
        [['Tahrik', etiket(TAHRIK_ETIKETLERI, a.tahrikTipi)], ['Sınıf', etiket(SINIF_ETIKETLERI, a.sinif)]],
        [['Makina Konumu', etiket(MAKINA_KONUMU_ETIKETLERI, a.makinaKonumu)], ['Askı Tipi', a.askiTipi ?? '']],
        [['Durak Sayısı', sayi(a.durakSayisi)], ['Kat Sayısı', sayi(a.katSayisi)]],
        [['Beyan Yükü', sayi(a.beyanYuku, ' kg')], ['Kişi Sayısı', sayi(a.kisiSayisi)]],
        [['Hız', sayi(a.hiz, ' m/s')], ['Seyir Mesafesi', sayi(a.seyirMesafesi, ' mm')]],
        [['Son Kat Yüksekliği', sayi(a.sonKatYukseklik, ' mm')], ['Karşı Ağırlık Konumu', etiket(AGIRLIK_KONUMU_ETIKETLERI, a.karsiAgirlikKonumu)]],
      ],
    },
    {
      baslik: 'Kuyu Ölçüleri',
      satirlar: [
        [['Kuyu Boyu', sayi(a.kuyuBoyu, ' mm')], ['Kuyu Genişlik', sayi(a.kuyuGenislik, ' mm')]],
        [['Kuyu Derinlik', sayi(a.kuyuDerinlik, ' mm')], ['Ray–Ray (RR)', sayi(a.rayRR, ' mm')]],
        [['Ray–Kapı (RK)', sayi(a.rayRK, ' mm')]],
      ],
    },
    {
      baslik: 'Kabin & Ağırlıklar',
      satirlar: [
        [['Kabin (G×D×Y)', kabinOlcu]],
        [['Kabin Ağırlığı', sayi(a.kabinAgirligi, ' kg')], ['Karkas Ağırlığı', sayi(a.karkasAgirligi, ' kg')]],
        [['Karşı Ağırlık', sayi(a.karsiAgirlik, ' kg')], ['Ağırlık Blokları', agirlikBloklari]],
        [['Panel Malzemesi', etiket(PANEL_MALZEME_ETIKETLERI, a.kabinPanelMalzemesi)], ['Palanga Konumu', etiket(PALANGA_KONUM_ETIKETLERI, a.kabinPalangaKonumu)]],
        [['Giriş Tipi', etiket(GIRIS_TIPI_ETIKETLERI, a.kabinGirisTipi)]],
      ],
    },
    { baslik: 'Giriş 1 Kapısı', satirlar: girisSatirlari(1) },
  ];

  if (a.kabinGirisTipi === 'cift') {
    liste.push({ baslik: 'Giriş 2 Kapısı', satirlar: girisSatirlari(2) });
  }

  liste.push(
    {
      baslik: 'Halat & Kasnaklar',
      satirlar: [
        [['Halat', [sayi(a.halatAdet), a.halatTipi].filter(Boolean).join(' × ')], ['Halat Şekli', etiket(HALAT_SEKLI_ETIKETLERI, a.halatSekli)]],
        [['Halat Markası', a.halatMarka], ['Tahrik Kasnak Çapı', sayi(a.tahrikKasnakCapi, ' mm')]],
        [['Saptırma Kasnağı Çapı', sayi(a.halatSapturmaKasnagiCapi, ' mm')], ['Palanga 1 Çapı', sayi(a.halatPalanga1Capi, ' mm')]],
        [['Palanga 2 Çapı', sayi(a.halatPalanga2Capi, ' mm')], ['Palanga 3 Çapı', sayi(a.halatPalanga3Capi, ' mm')]],
        [['Askı–Halat Mesafesi', sayi(a.askiHalatArasiMesafe, ' mm')], ['Palanga–Halat Mesafesi', sayi(a.palangaHalatArasiMesafe, ' mm')]],
        [['Kasnaklar Yatay Mesafe', sayi(a.kasnaklarArasiYatayMesafe, ' mm')], ['Kasnaklar Dikey Mesafe', sayi(a.kasnaklarArasiDikeyMesafe, ' mm')]],
        [['Sarım Açısı', sayi(a.sarimAcisi, '°')]],
      ],
    },
    {
      baslik: 'Raylar',
      satirlar: [
        [['Kabin Ray Tipi', rayTipiEtiketi(a.kabinRayTipi)], ['Kabin Ray Arası', sayi(a.kabinRayArasi, ' mm')]],
        [['K.A. Ray Tipi', rayTipiEtiketi(a.karsiAgirlikRayTipi)], ['K.A. Ray Arası', sayi(a.karsiAgirlikRayArasi, ' mm')]],
        [['Kabin Ray–Durak Kapısı', sayi(a.kabinRayDurakKapisiArasi, ' mm')], ['Kabin Ray–K.A. Ray', sayi(a.kabinRayKarsiAgirlikRayArasi, ' mm')]],
        [['K.A. Ray–Durak Kapısı', sayi(a.karsiAgirlikRayDurakKapisiArasi, ' mm')], ['Ray Markası', a.rayMarka]],
        [['Regülatör Konumu', etiket(REGULATOR_KONUM_ETIKETLERI, a.regulatorKonumu)]],
      ],
    },
    {
      baslik: 'Kuyu Dip Alanı',
      satirlar: [
        [['Kabin Boşluk', sayi(a.kuyuDipBosluk, ' mm')], ['Tampon Stroke', sayi(a.kuyuDipTamponStroke, ' mm')]],
        [['K.A. Boşluk', sayi(a.kuyuDipKarsiBosluk, ' mm')], ['K.A. Stroke', sayi(a.kuyuDipKarsiStroke, ' mm')]],
        [['Durma Alanı', a.kuyuDipDurmaAlani ?? ''], ['Kuyu Dip Yüksekliği', sayi(a.kuyuDipYukseklik, ' mm')]],
        [['Kabin En Alt Nokta', sayi(a.kuyuDipKabinEnAltNokta, ' mm')], ['Etek Sacı–Taban', sayi(a.kuyuDipEtekSaciTabanMesafe, ' mm')]],
        [['(iv) Ölçüsü', sayi(a.kuyuDipIvOlcusu, ' mm')]],
      ],
    },
    {
      baslik: 'Kuyu Üst Alanı',
      satirlar: [
        [['Korkuluk Mesafesi', sayi(a.kuyuUstKorkulukMesafe, ' mm')], ['Korkuluk Yüksekliği', sayi(a.kuyuUstKorkulukYuksekligi, ' mm')]],
        [['Süspansiyon Mesafesi', sayi(a.kuyuUstSuspansiyonMesafe, ' mm')], ['Kabin Üstü Durma', sayi(a.kuyuUstKabinUstDurma, ' mm')]],
        [['Son Kat', sayi(a.kuyuUstSonKat, ' mm')], ['Durma Alanı', a.kuyuUstDurmaAlani ?? '']],
      ],
    },
    {
      baslik: 'Makine Dairesi',
      satirlar: [
        [['Çalışma Yüksekliği', sayi(a.makineDairesiCalismaYuksekligi, ' mm')], ['Geçiş Yüksekliği', sayi(a.makineDairesiGecisYuksekligi, ' mm')]],
        [['Kapı Yüksekliği', sayi(a.makineDairesiKapiYuksekligi, ' mm')]],
      ],
    },
    {
      baslik: 'Motor',
      satirlar: [
        [['Marka', a.motorMarkaSnapshot], ['Tip', a.motorTip]],
        [['Seri No', a.motorSeriNo], ['Dişli Tipi', etiket(MOTOR_DISLI_ETIKETLERI, a.motorDisliTipi)]],
        [['Devir', sayi(a.motorRpm, ' rpm')], ['Güç', sayi(a.motorGucKw, ' kW')]],
        [['Tahvil Oranı', a.motorTahvilOrani]],
      ],
    },
    {
      baslik: 'Fren & Hız Regülatörü',
      satirlar: [
        [['Fren Konumu', etiket(FREN_KONUM_ETIKETLERI, a.frenKonumu)], ['K.A. Freni', evetHayir(a.karsiAgirlikFrenVar)]],
        [['K.A. Fren Konumu', etiket(KA_FREN_KONUM_ETIKETLERI, a.karsiAgirlikFrenKonumu)], ['Reg. Devreye Girme Hızı', sayi(a.regulatorDevreyeGirmeHizi, ' m/s')]],
      ],
    },
    {
      baslik: 'Tamponlar & UCM/ACOP',
      satirlar: [
        [['Kabin Tampon Adedi', sayi(a.kabinTamponAdedi)], ['K.A. Tampon Adedi', sayi(a.karsiAgirlikTamponAdedi)]],
        [['UCM/ACOP Türü', etiket(UCM_TUR_ETIKETLERI, a.ucmAcopTuru)], ['Hız Reg. + Fren ile', evetHayir(a.ucmAcopHizRegulatoruFrenIle)]],
      ],
    },
    {
      baslik: 'Aydınlatma',
      satirlar: [
        [['Kabin İçi', sayi(a.kabinIciAydinlatma, ' lx')], ['Kabin Üstü', sayi(a.kabinUstuAydinlatma, ' lx')]],
        [['Kuyu Dibi', sayi(a.kuyuDibiAydinlatma, ' lx')], ['Makine Alanı', sayi(a.makineAlaniAydinlatma, ' lx')]],
      ],
    }
  );

  if (a.smmFirmaId || a.smmKisaAd) {
    liste.push({
      baslik: 'SMM Bilgileri',
      satirlar: [
        [['Yıl', a.smmYil ? String(a.smmYil) : ''], ['Kısa Adı', a.smmKisaAd]],
        [['Ünvan', a.smmUnvan]],
        [['Adres', a.smmAdres]],
        [['Mak. Müh.', a.smmMakMuhAdSoyad], ['Sicil/Tel', [a.smmMakMuhOdaSicilNo, a.smmMakMuhTelefon].filter(Boolean).join(' / ')]],
        [['Elk. Müh.', a.smmElkMuhAdSoyad], ['Sicil/Tel', [a.smmElkMuhOdaSicilNo, a.smmElkMuhTelefon].filter(Boolean).join(' / ')]],
      ],
    });
  }

  return liste;
}

// ---- Risk analizleri: seçilen maddeler + fotoğrafları ----
export function asansorRiskGruplari(a: Asansor) {
  return [
    { baslik: 'Kuyu Dibi Risk Analizi', maddeler: a.kuyuDibiRiskMaddeleri ?? [] },
    { baslik: 'Kuyu Üstü Risk Analizi', maddeler: a.kuyuUstuRiskMaddeleri ?? [] },
    { baslik: 'Makine Dairesi Risk Analizi', maddeler: a.makineDairesiRiskMaddeleri ?? [] },
  ].filter((g) => g.maddeler.length);
}

// ---- Belgeler (dosyası olanlar) ----
export function asansorBelgeSatirlari(a: Asansor): BelgeSatiri[] {
  return [
    { etiket: 'Yapı Ruhsatı', slot: a.yapiRuhsatiDosya ?? null },
    { etiket: 'Giriş 1 Cam Belgesi', slot: a.giris1CamBelgesi ?? null },
    { etiket: 'Giriş 2 Cam Belgesi', slot: a.giris2CamBelgesi ?? null },
    { etiket: 'Kabin Cam Belgesi', slot: a.kabinCamBelgesi ?? null },
    ...(a.ekBelgeler ?? []).map((e) => ({ etiket: e.ad, slot: e.dosya ?? null })),
  ].filter((b) => b.slot);
}

// ---- Fotoğraflar: grup grup ----
export function asansorFotoGruplari(a: Asansor): { baslik: string; fotolar: BelgeSlot[] }[] {
  return [
    { baslik: 'Giriş 1 Kapı', fotolar: a.giris1KapiFotolari },
    { baslik: 'Giriş 2 Kapı', fotolar: a.giris2KapiFotolari },
    { baslik: 'Kabin', fotolar: a.kabinFotolari },
    { baslik: 'Durak Kapı Kilidi', fotolar: a.durakKilitFotolari },
    { baslik: 'Durak Kapı Kilidi (2. Giriş)', fotolar: a.durakKilitFotolari2 },
    { baslik: 'Kabin Kapı Kilidi', fotolar: a.kabinKilitFotolari },
    { baslik: 'Kabin Kapı Kilidi (2. Giriş)', fotolar: a.kabinKilitFotolari2 },
    { baslik: 'Kabin Tamponu', fotolar: a.kabinTamponFotolari },
    { baslik: 'Karşı Ağırlık Tamponu', fotolar: a.karsiAgirlikTamponFotolari },
    { baslik: 'Fren', fotolar: a.frenFotolari },
    { baslik: 'Karşı Ağırlık Freni', fotolar: a.karsiAgirlikFrenFotolari },
    { baslik: 'Hız Regülatörü', fotolar: a.hizRegulatoruFotolari },
    { baslik: 'Kontrol Kartı', fotolar: a.kontrolKartiFotolari },
    { baslik: 'Motor', fotolar: a.motorFotolari },
    { baslik: 'UCM/ACOP', fotolar: a.ucmAcopFotolari },
  ]
    .map((g) => ({ baslik: g.baslik, fotolar: g.fotolar ?? [] }))
    .filter((g) => g.fotolar.length);
}
