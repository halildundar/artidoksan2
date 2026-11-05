import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { Denetim } from './denetim.js';
import { Denetci } from './denetciler.js';
import { AksamBelgesi } from './katalog.js';
import { buildObjectKey, putObject } from './storage.js';
import {
  isBaslat, aktifTopluIs, tescildeAktifIsVar, isIptal, tescilIsleri,
} from './yazdirKuyruk.js';
import {
  sablonDoldur, convertDocxToPdf, topluPdfCevir, kaynakOzeti, sablonVerisi, anahtarlariSil,
  slotOlustur, aksamGrubu, bos, tarihStr, ceModulKodu, MODUL_METIN, MAKINA_KONUMU_ETIKET,
  TEMPLATES_DIR, DOCX_MIME, isaretlenecekCheckboxTagleri,
} from './yazdir.js';

// Denetim > Yazdır: Modül G dosya listesi. Tescil Yazdır'ın altyapısı
// (kuyruk, iki aşamalı toplu üretim, kaynak özeti ile atlama, ilerleme
// paneli) aynen kullanılır; kalem listesi ve şablon verisi denetime özgüdür.
// Şablonlar: templates/tuv-temp1 (TÜV formları) ve templates/ce-td-temp1
// (CE teknik dosya). `hazir: false` olan şablonların alan eşlemesi sonraki
// adımda eklenecek (listede görünür, yazdırılamaz).
const TUV = 'tuv-temp1';
const CE = 'ce-td-temp1';
// Seçilebilir şablon setleri (değer = templates/ altındaki klasör)
export const TEKNIK_DOSYA_SETLERI = [{ deger: 'ce-td-temp1', etiket: 'Teknik Dosya 1' }];
export const TUV_FORMS_SETLERI = [{ deger: 'tuv-temp1', etiket: 'Tüv Forms 1' }];
const setSecimi = (secim, setler, varsayilan) => (setler.some((s) => s.deger === secim) ? secim : varsayilan);

// Beyan şablonu denetimin modülüne göre seçilir (tescildeki abBeyaniSablonu ile aynı kural)
function abBeyaniDosyasi({ denetim }) {
  const kod = ceModulKodu(denetim.modul);
  return kod === 'G' || kod === 'H1' ? '7.1-AB UYGUNLUK BEYANI G VE H.docx' : '7-AB UYGUNLUK BEYANI B VE E.docx';
}

export const DENETIM_G_KALEMLERI = [
  { no: '1', kod: 'application-form', ad: 'Application Form', tip: 'sablon', klasor: TUV, dosya: '1.APPLICATION FROM.docx' },
  { no: '2', kod: 'building-permit', ad: 'Building Permit', tip: 'dosya' },
  { no: '3', kod: 'checklist', ad: 'Checklist', tip: 'sablon', klasor: TUV, dosya: '3.CHECKLIST.docx' },
  { no: '4', kod: 'inspection-report', ad: 'Elevator Inspectation Report', tip: 'sablon', klasor: TUV, dosya: '4.ELEVATOR INSPECTION REPORT.docx' },
  { no: '5', kod: 'calculations', ad: 'Calculations and Constructions', tip: 'dosya' },
  // Tescildeki AB Uygunluk Beyanı ile aynı şablon/doldurma: G ve H1 için 7.1, diğerleri için 7
  { no: '6', kod: 'declaration', ad: 'Declaration of Confirmity', tip: 'sablon', klasor: 'tescil-temp1', dosyaFn: abBeyaniDosyasi },
  { no: '7', kod: 'photo', ad: 'Photo', tip: 'sablon', klasor: CE, dosya: '7.Photo.docx' },
  { no: '8', kod: 'technical-descriptions', ad: 'Technical Descriptions and Manuals', tip: 'sablon', klasor: CE, dosya: '8.Technical Descriptions and Manuals.docx' },
  { no: '9.1', kod: 'project-service-contract', ad: 'Project Service Contract', tip: 'dosya', altBilgi: 'SMM firması belgeleri' },
  { no: '9.2', kod: 'engineers-competency', ad: 'Engineers Competency Certificates', tip: 'dosya' },
  // 9.3 Type Projects Calculations and Constructions: Modül B denetimine özel; Modül G listesinde yok
  // (Modül B tasarlanınca eklenecek — dosya kaynağı denetim.tipProjeler, bkz. dosyaKalemi)
  { no: '10', kod: 'contract', ad: 'Contract', tip: 'sablon', klasor: TUV, dosya: '10.CONTRACT.docx' },
  { no: '11', kod: 'technical-file-report', ad: 'Technical File Report For Elevator', tip: 'sablon', klasor: TUV, dosya: '11.TECHNICAL FILE REPORT FOR ELEVATOR.docx' },
  { no: '12.1', kod: 'sc-car-buffer', ad: 'Safety Comp. CAR BUFFER', tip: 'aksam', slotlar: ['kabin_tamponu'] },
  { no: '12.2', kod: 'sc-cw-buffer', ad: 'Safety Comp. COUNTER WEIGHT BUFFER', tip: 'aksam', slotlar: ['karsi_agirlik_tamponu'] },
  { no: '12.3', kod: 'sc-wire-ropes', ad: 'Safety Comp. WIRE ROPES', tip: 'aksam', halat: true },
  { no: '12.4', kod: 'sc-main-board', ad: 'Safety Comp. MAIN BOARD', tip: 'aksam', slotlar: ['kontrol_karti'] },
  { no: '12.5', kod: 'sc-safety-gear', ad: 'Safety Comp. SAFETY GEAR', tip: 'aksam', slotlar: ['fren'] },
  { no: '12.6', kod: 'sc-governor', ad: 'Safety Comp. OVERSPEED GOVERNER', tip: 'aksam', slotlar: ['hiz_regulatoru'] },
  { no: '12.7', kod: 'sc-landing-lock', ad: 'Safety Comp. Landing DOOR LOCKING DEVICE', tip: 'aksam', slotlar: ['durak_kapi_kilidi', 'durak_kapi_kilidi_2'] },
  { no: '12.8', kod: 'sc-car-lock', ad: 'Safety Comp. CAR Door LOCKING DEVICE', tip: 'aksam', slotlar: ['kabin_kapi_kilidi', 'kabin_kapi_kilidi_2'] },
  { no: '12.11', kod: 'sc-ucm', ad: 'Safety Comp. ASCENDING OVERSPEED PROTECTION', tip: 'aksam', slotlar: ['ucm_acop'] },
  { no: '13', kod: 'sample-table', ad: 'SAMPLE TABLE. NEEDED DETAILS FOR CERTIFICATION', tip: 'sablon', klasor: CE, dosya: '13.Sample Table,Needed Details For Certification.docx' },
];

const taban = (k) => `${String(k.no).includes('.') ? k.no : String(k.no).padStart(2, '0')}-${k.ad}`;

async function denetimYukle(id) {
  const denetim = await Denetim.findById(id);
  if (!denetim) return null;
  const Firma = mongoose.model('Firma');
  const Asansor = mongoose.model('Asansor');
  const [firma, asansor, denetci] = await Promise.all([
    denetim.firmaId ? Firma.findById(denetim.firmaId) : null,
    denetim.asansorId ? Asansor.findById(denetim.asansorId) : null,
    denetim.denetciId ? Denetci.findById(denetim.denetciId) : null,
  ]);
  // Denetçinin imza-kaşesi, görsel etiketi ({%denetci_imza}) için firma
  // görsellerinin yanına eklenir (sablonDoldur firma.belgeler'den okur)
  const firmaDuz = firma ? firma.toObject() : null;
  const firmaGorsel = firmaDuz && { ...firmaDuz, belgeler: { ...(firmaDuz.belgeler ?? {}), denetciImza: denetci?.imzaKase ?? undefined } };
  return { denetim, firma: firmaGorsel, asansor, denetci };
}

const gKodu = (denetim) => ceModulKodu(denetim.modul) === 'G';

// ---- Şablon verisi: tescildeki firma/asansör verisi + bu şablonlardaki
// (artidoksan1 kökenli) etiket adları ----
const ceUygunModuller = (modul) => {
  const kod = ceModulKodu(modul);
  return kod === 'E' ? ['E', 'B'] : kod ? [kod] : [];
};

// Aksam satırı sayısı = tampon adedi
const aksamAdedi = (asansor, slot) => (asansor?.guvenlikAksamlari ?? []).filter((s) => s.slot === slot).length || '';

// Aynı marka+tip tek satırda adetle toplanır; farklı olanlar alt alta listelenir
function tamponSatirlari(asansor, slot) {
  const harita = new Map();
  for (const s of (asansor?.guvenlikAksamlari ?? []).filter((x) => x.slot === slot)) {
    const marka = bos(s.markaSnapshot), tip = bos(s.tip);
    const anahtar = `${marka}|${tip}`;
    const kayit = harita.get(anahtar) ?? { adet: 0, marka, tip };
    kayit.adet += 1;
    harita.set(anahtar, kayit);
  }
  return harita.size ? [...harita.values()] : [{ adet: '', marka: '', tip: '' }];
}

// "T89/B" -> sınıf B, ölçü 89x62x16 (TS ISO 7465 T-profil tablosu)
const RAY_OLCULERI = {
  'T140/B': '140x108x19', 'T140-2/B': '140x102x28,6', 'T127/B': '127x89x16', 'T125/B': '125x82x16',
  'T90/B': '90x75x16', 'T89/B': '89x62x16', 'T82/B': '82x68x9', 'T70/B': '70x65x9', 'T50/B': '50x50x5',
  'T90/A': '90x75x16', 'T89/A': '89x62x16', 'T82/A': '82x68x9', 'T70/A': '70x65x9', 'T50/A': '50x50x5',
};
const rayTuru = (kod) => (kod ? String(kod).split('/')[1] ?? '' : '');
const rayOlcusu = (kod) => (kod ? `${kod} ${RAY_OLCULERI[kod] ?? ''}`.trim() : '');

// mm -> m (örn. 1100 -> 1.1)
const mmToM = (mm) => (mm === null || mm === undefined || mm === '' || Number.isNaN(Number(mm))
  ? '' : String(Math.round(Number(mm)) / 1000));

// Denetime göre sabit "rastgele" sayı: aynı denetim her yazdırmada aynı değeri alır
function tohumluAralik(tohum, ad, min, max) {
  let h = 2166136261;
  for (const c of `${tohum}:${ad}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return min + (Math.abs(h) % (max - min + 1));
}

// Sarım açısı: kayıtlıysa o; 1:1 dışı askıda 180°; 1:1'de halat/kasnak ölçülerinden
function sarimAcisi(asansor) {
  if (asansor?.sarimAcisi) return String(asansor.sarimAcisi);
  if (asansor?.askiTipi && asansor.askiTipi !== '1:1') return '180';
  const a = Number(asansor?.askiHalatArasiMesafe) - Number(asansor?.tahrikKasnakCapi) / 2 - Number(asansor?.halatSapturmaKasnagiCapi) / 2;
  const b = Number(asansor?.kasnaklarArasiDikeyMesafe);
  return a > 0 && b > 0 ? String(Math.round((90 + (Math.atan(b / a) * 180) / Math.PI) * 10) / 10) : '';
}

function durakListesi(asansor) {
  const katlar = [...new Set((asansor?.katYukseklikleri ?? []).map((k) => k.kat))].sort((a, b) => a - b);
  if (katlar.length) return katlar.join(', ');
  const n = Number(asansor?.durakSayisi);
  return n > 0 ? Array.from({ length: n }, (_, i) => i).join(', ') : '';
}

// Kalemin kendine özgü etiketleri (aynı adlı etiketler kalemlerde farklı birimde olabilir)
function kalemVerisi(veri, kalem, baglam) {
  const { asansor, denetim, denetci } = baglam;
  if (kalem.kod === 'checklist') return { ...veri, ...checklistVerisi(asansor, String(denetim._id)) };
  if (kalem.kod === 'sample-table') return { ...veri, ...teknikVerisi(asansor, denetim, denetci), ...ornekTabloVerisi(asansor) };
  if (kalem.kod === 'technical-descriptions') return { ...veri, ...teknikVerisi(asansor, denetim, denetci) };
  return veri;
}

// 13.Sample Table: kabin ve kapı ölçüleri metre; tripping hızı kayıtlı değil (boş)
function ornekTabloVerisi(asansor) {
  return {
    kat_sayisi: bos(asansor?.katSayisi),
    tripped_hiz: '',
    kabin_giris_adet: asansor?.kabinGirisTipi === 'cift' ? '2' : '1',
    kabin_genislik: mmToM(asansor?.kabinGenislik ?? 1350),
    kabin_derinlik: mmToM(asansor?.kabinDerinlik ?? 1350),
    ana_kapi_genislik: mmToM(asansor?.giris1KapiGenislik),
    ana_kapi_yukseklik: mmToM(asansor?.giris1KapiYukseklik),
    tahrik_kasnak_cap: bos(asansor?.tahrikKasnakCapi),
  };
}

// 8.Technical Descriptions and Manuals: aksam tablosu + temel özellikler
function teknikVerisi(asansor, denetim, denetci) {
  const satirlar = (slot) => (asansor?.guvenlikAksamlari ?? []).filter((s) => s.slot === slot);
  const alanlar = (onEk, s) => ({
    [`${onEk}_marka`]: bos(s?.markaSnapshot), [`${onEk}_tip`]: bos(s?.tip), [`${onEk}_nobo`]: bos(s?.onayliKurumNobo),
    [`${onEk}_cert_no`]: bos(s?.sertifikaNo), [`${onEk}_seri_no`]: bos(s?.seriNo), [`${onEk}_serino`]: bos(s?.seriNo),
  });
  const tampon = (onEk, slot) => {
    const l = satirlar(slot);
    return {
      ...alanlar(onEk, l[0]),
      ...[1, 2, 3].reduce((o, i) => ({ ...o, ...alanlar(`${onEk}_${i}`, l[i]) }), {}),
    };
  };
  const tek = (onEk, slotlar) => alanlar(onEk, slotlar.flatMap(satirlar)[0]);
  return {
    proje_no: bos(asansor?.seriNo),
    beyan_hiz: bos(asansor?.hiz),
    direkt_endirekt: bos(asansor?.askiTipi),
    beyan_yuk: bos(asansor?.beyanYuku),
    kapi_main_adet: bos(asansor?.giris1KapiAdet),
    kapi_diger_adet: bos(asansor?.giris2KapiAdet),
    kabin_ag: bos(asansor?.kabinAgirligi),
    karsi_ag_ag: bos(asansor?.karsiAgirlik),
    motor_ratio: bos(asansor?.motorTahvilOrani),
    kuyu_genislik: bos(asansor?.kuyuGenislik),
    kuyu_derinlik: bos(asansor?.kuyuDerinlik),
    ana_kapi_genislik: bos(asansor?.giris1KapiGenislik),
    kabin_genislik: bos(asansor?.kabinGenislik),
    kabin_derinlik: bos(asansor?.kabinDerinlik),
    son_kontrolcu: bos(denetci?.adSoyad),
    son_kon_tarih: tarihStr(denetim.sonKontrolTarihi),
    ...tek('hiz_reg', ['hiz_regulatoru']),
    ...tek('fren', ['fren']),
    ...tek('kart', ['kontrol_karti']),
    ...tek('ucm_acop', ['ucm_acop']),
    ...tek('durak_kapi_kilit', ['durak_kapi_kilidi', 'durak_kapi_kilidi_2']),
    ...tek('kabin_kapi_kilit', ['kabin_kapi_kilidi', 'kabin_kapi_kilidi_2']),
    ...tampon('kab_tamp', 'kabin_tamponu'),
    ...tampon('kar_tamp', 'karsi_agirlik_tamponu'),
  };
}

function checklistVerisi(asansor, tohum) {
  const g = (slotlar) => aksamGrubu(asansor, slotlar);
  const kart = g(['kontrol_karti']), dKilit = g(['durak_kapi_kilidi', 'durak_kapi_kilidi_2']);
  const kKilit = g(['kabin_kapi_kilidi', 'kabin_kapi_kilidi_2']), fren = g(['fren']), reg = g(['hiz_regulatoru']);
  const kabTamp = g(['kabin_tamponu']), karTamp = g(['karsi_agirlik_tamponu']);
  return {
    il_adi: bos(asansor?.il),
    as_seyir_mes: bos(asansor?.seyirMesafesi),
    beyan_hiz: bos(asansor?.hiz),
    motor_ad: bos(asansor?.motorMarkaSnapshot),
    kart_ad: kart?.marka ?? '', kart_tip: kart?.tip ?? '', kart_seri_no: kart?.seriNo ?? '',
    kap_genislik: bos(asansor?.giris1KapiGenislik),
    kap_yukseklik: bos(asansor?.giris1KapiYukseklik),
    kilit_ad: dKilit?.marka ?? '', kilit_tip: dKilit?.tip ?? '',
    kab_kilit_ad: kKilit?.marka ?? '', kab_kilit_tip: kKilit?.tip ?? '',
    // Kayıtta yoksa uygulamadaki varsayılanlar (1350 x 1350; yükseklik 2200 mm)
    kabin_genislik: mmToM(asansor?.kabinGenislik ?? 1350),
    kabin_derinlik: mmToM(asansor?.kabinDerinlik ?? 1350),
    kabin_yukseklik: mmToM(asansor?.kabinYukseklik ?? 2200),
    kabin_ray_arasi: bos(asansor?.kabinRayArasi),
    kar_ray_arasi: bos(asansor?.karsiAgirlikRayArasi),
    // Aydınlatma (lux): ölçüm kaydı yok; denetime göre sabit aralıktan değer
    kab_lux: String(tohumluAralik(tohum, 'kab', 100, 162)),
    kab_ust_lux: String(tohumluAralik(tohum, 'ust', 50, 84)),
    kuyu_dibi_lux: String(tohumluAralik(tohum, 'pit', 50, 84)),
    mak_alani_lux: String(tohumluAralik(tohum, 'mak', 200, 280)),
    durak_listesi: durakListesi(asansor),
    kabin_ray_turu: rayTuru(asansor?.kabinRayTipi), kabin_ray_olcu: rayOlcusu(asansor?.kabinRayTipi),
    kar_ray_turu: rayTuru(asansor?.karsiAgirlikRayTipi), kar_ray_olcu: rayOlcusu(asansor?.karsiAgirlikRayTipi),
    kab_tamponlar: tamponSatirlari(asansor, 'kabin_tamponu'),
    kar_tamponlar: tamponSatirlari(asansor, 'karsi_agirlik_tamponu'),
    tah_kasnak_cap: bos(asansor?.tahrikKasnakCapi),
    palanga_cap: bos(asansor?.palangaCaplari),
    sarim_acisi: sarimAcisi(asansor),
    aski_oran_1or2: bos(asansor?.askiTipi),
    fren_ad: fren?.marka ?? '', fren_tip: fren?.tip ?? '', fren_seri_no: fren?.seriNo ?? '',
    hiz_reg_ad: reg?.marka ?? '', hiz_reg_tip: reg?.tip ?? '',
    kabin_ray_tip: bos(asansor?.kabinRayTipi),
    kar_ray_tip: bos(asansor?.karsiAgirlikRayTipi),
    kab_tamp_adet: aksamAdedi(asansor, 'kabin_tamponu'),
    kab_tamp_ad: kabTamp?.marka ?? '', kab_tamp_tip: kabTamp?.tip ?? '',
    kar_tamp_adet: aksamAdedi(asansor, 'karsi_agirlik_tamponu'),
    kar_tamp_ad: karTamp?.marka ?? '', kar_tamp_tip: karTamp?.tip ?? '',
  };
}

async function denetimVerisi({ denetim, firma, asansor, denetci }) {
  const sahteTescil = {
    abUygunlukBeyaniTarihi: denetim.abUygunlukBeyaniTarihi,
    sonKontrolTarihi: denetim.sonKontrolTarihi,
    // Tescildeki gibi CE bilgisi (onaylı kurum, NoBo, belge no): firmanın bu modüle
    // ait CE belgeleri otomatik seçili sayılır (E beyanı B tip incelemesine de dayanır)
    // Denetimde elle seçilen onaylı kurum/CE belgeleri varsa onlar kullanılır
    ceBelgeIdleri: (denetim.ceBelgeIdleri ?? []).length
      ? denetim.ceBelgeIdleri.map(String)
      : (firma?.ceBelgeleri ?? [])
        .filter((ce) => ce._id && ceUygunModuller(denetim.modul).includes(ceModulKodu(ce.modul)))
        .map((ce) => String(ce._id)),
    uretilenBelgeler: [],
  };
  const t = await sablonVerisi({ tescil: sahteTescil, firma, asansor });
  const modul = ceModulKodu(denetim.modul);
  const metin = MODUL_METIN[modul] ?? { annex: '', name: '', nameEn: '' };
  const isaret = (kod) => (modul === kod ? '√' : '');
  return {
    ...t,
    // Başvuru formu
    as_firma_adi: t.unvan,
    as_firma_adresi: t.adres,
    as_firma_posta_kod: bos(firma?.postaKodu),
    as_firma_tel: bos(firma?.telefon),
    as_firma_email: bos(firma?.email),
    as_firma_telefon: bos(firma?.telefon),
    yapi_sahibi_adi: t.yapi_sahibi,
    montaj_adresi: t.montaj_adres,
    beyan_yuku: t.kapasite,
    B: isaret('B'), E: isaret('E'), G: isaret('G'), H1: isaret('H1'),
    // Denetim raporu / teknik dosya raporu
    denetim_tarih: tarihStr(denetim.denetimTarihi),
    // Denetçi (Ayarlar > Denetçiler): ad soyad, mühendis türü
    denetci_adi: bos(denetci?.adSoyad),
    denetci: bos(denetci?.adSoyad),
    // Denetçinin bağlı olduğu onaylı kuruluş: varsa CE belgesinden gelen kurum
    // bilgilerinin yerine geçer (Ayarlar > Denetçiler'de kayıtlı)
    ...(denetci?.onayliKurumUnvan ? {
      ce_kurum: denetci.onayliKurumUnvan,
      ce_nobo: bos(denetci.onayliKurumNobo),
      ce_adres: bos(denetci.onayliKurumAdres),
    } : {}),
    // 3.CHECKLIST: aksam / ölçü etiketleri (aksam satırlarından ve asansör kaydından)
    ok_unvan: bos(denetci?.onayliKurumUnvan),
    ok_nobo: bos(denetci?.onayliKurumNobo),
    ok_adres: bos(denetci?.onayliKurumAdres),
    denetci_turu: denetci?.muhendisTuru ? (MUHENDIS_ETIKET[denetci.muhendisTuru] ?? '') : '',
    as_firma_muhendis: bos(firma?.personel?.montajSorumlusu),
    as_firma_sahibi: t.sirket_muduru,
    yapi_ruhsat_no: bos(asansor?.yapiRuhsatNo),
    tam_yil: bos(asansor?.montajYili),
    montaj_yili: bos(asansor?.montajYili),
    elek_hidrolik: t.tahrik_tip,
    makine_konum: asansor?.makinaKonumu ? MAKINA_KONUMU_ETIKET[asansor.makinaKonumu] ?? asansor.makinaKonumu : '',
    // Uygunluk beyanı (modül metinleri)
    mod_ul: bos(modul),
    modul_annex: metin.annex,
    modul_name: metin.name,
    modul_name_en: metin.nameEn,
  };
}

const MUHENDIS_ETIKET = { elektrik: 'Elektrik Mühendisi', makine: 'Makine Mühendisi' };

// Beyan formundaki modül onay kutuları denetimin modülüne göre işaretlenir
const doldurmaSecenegi = ({ denetim }) => ({
  checkboxTagleri: isaretlenecekCheckboxTagleri(ceModulKodu(denetim.modul)),
  xmlYama: (xml) => icindekilerSayfaKirilimi(wordSayfaKirilimlari(hucreIciKonumlariDuzelt(birlesikSatirlariTekle(bosDolguTablolariniKaldir(checklistYamasi(xml)))))),
});

// 3.CHECKLIST: şablondaki sabit metinler etiketli satırlarla değiştirilir
// (duraklar, ray ölçüleri, tamponlar için tekrarlı satır). Eski metin
// bulunmazsa (şablon güncellenmişse) hiçbir şey yapılmaz.
function paragrafiDegistir(xml, parca, yeni) {
  return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (p) => {
    if (!p.replace(/<[^>]+>/g, '').includes(parca)) return p;
    if (yeni === null) return '';
    const acilis = /^<w:p[^>]*>/.exec(p)[0];
    const ppr = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(p)?.[0] ?? '';
    const run = (p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []).find((r) => r.includes('<w:t'));
    const rpr = run ? (/<w:rPr>[\s\S]*?<\/w:rPr>/.exec(run)?.[0] ?? '') : '';
    return `${acilis}${ppr}<w:r>${rpr}<w:t xml:space="preserve">${yeni}</w:t></w:r></w:p>`;
  });
}

// Tablo hücresindeki ("layoutInCell") metin kutuları Word'de hücreye göre konumlanır,
// LibreOffice ise sayfa konumu verilmişse sayfanın sol üstüne koyar ve kutu başlık/başka
// alanların üzerine kayar. Sayfa konumlu kutular hücrede sütun/paragraf konumuna çevrilir.
function hucreIciKonumlariDuzelt(xml) {
  const tcAralik = [];
  const acik = [];
  for (const m of xml.matchAll(/<w:tc[ >]|<\/w:tc>/g)) {
    if (m[0].startsWith('</')) { const b = acik.pop(); if (b !== undefined) tcAralik.push([b, m.index]); } else acik.push(m.index);
  }
  const hucredeMi = (i) => tcAralik.some(([b, s]) => b < i && i < s);
  return xml.replace(/<wp:anchor [^>]*layoutInCell="1"[\s\S]*?<\/wp:anchor>/g, (a, i) => {
    if (!hucredeMi(i)) return a;
    return a
      .replace(/<wp:positionH relativeFrom="page">/, '<wp:positionH relativeFrom="column">')
      .replace(/<wp:positionV relativeFrom="page">/, '<wp:positionV relativeFrom="paragraph">');
  });
}

// Tüm metin ilk hücrede olan, altındaki satırları boş "dikey birleşik" (vMerge) devam
// hücreleri olan tek sütunlu tablolar (kutu içinde uzun metin): LibreOffice bunları
// sayfalara bölerken sayfa başlarına büyük boşluk bırakıyor. Tek satırlı tabloya çevrilir.
function birlesikSatirlariTekle(xml) {
  return xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, (t) => {
    if (t.indexOf('<w:tbl>', 1) !== -1 || !t.includes('<w:vMerge w:val="restart"/>')) return t;
    const satirlar = t.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? [];
    if (!satirlar.every((r) => (r.match(/<w:tc>/g) ?? []).length === 1)) return t;
    const devam = (r) => r.includes('<w:vMerge/>');
    if (satirlar.some((r) => devam(r) && /<w:t[ >]|<w:drawing>|<w:pict>/.test(r))) return t;
    const bas = t.indexOf(satirlar[0]);
    const govde = satirlar
      .filter((r) => !devam(r))
      .map((r) => r.replace('<w:vMerge w:val="restart"/>', ''))
      .join('');
    return t.slice(0, bas) + govde + '</w:tbl>';
  });
}

// İÇİNDEKİLER tablosu Word'de yeni sayfada başlar (içinde metin kutusu olan paragraf
// genel kuralın dışında kalır); LibreOffice başlık satırını kapağın altına sığdırıp böler.
function icindekilerSayfaKirilimi(xml) {
  const i = xml.indexOf('<w:t>İÇİNDEKİLER</w:t>');
  if (i === -1) return xml;
  const satir = xml.lastIndexOf('<w:tr ', i);
  const ppr = xml.indexOf('<w:pPr>', satir);
  if (satir === -1 || ppr === -1 || ppr > i || xml.slice(ppr, i).includes('pageBreakBefore')) return xml;
  return `${xml.slice(0, ppr + 7)}<w:pageBreakBefore/>${xml.slice(ppr + 7)}`;
}

// Word'ün sayfa başı işaretli paragrafının hemen öncesindeki tablonun içi boş son satırı yalnız
// yer doldurur; LibreOffice'te sayfanın sonuna sığmayıp neredeyse boş bir sayfa açıyor.
function bosDolguTablolariniKaldir(xml) {
  return xml.replace(
    /<w:tbl>(?:(?!<w:tbl>)[\s\S])*?<\/w:tbl>(?=<w:p[ >](?:(?!<\/w:p>)[\s\S])*?<w:lastRenderedPageBreak\/>)/g,
    (t) => {
      const satirlar = t.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? [];
      const son = satirlar[satirlar.length - 1];
      if (satirlar.length < 2 || /<w:t[ >]|<w:drawing>|<w:pict>|<w:object/.test(son)) return t;
      return t.slice(0, t.lastIndexOf(son)) + '</w:tbl>';
    }
  );
}

// Word, sayfanın başladığı yere <w:lastRenderedPageBreak/> yazar. LibreOffice satır
// yüksekliklerini biraz farklı hesapladığı için başlık/tablo satırları sayfa altına
// kayıp içerikten ayrılıyor. Word'ün sayfa başlattığı paragraflar (ve tabloların ilk
// satırı) gerçek sayfa sonuna çevrilir: sayfalar Word'deki gibi başlar.
function wordSayfaKirilimlari(xml) {
  const BASLA = '<w:pageBreakBefore/>';
  return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (p, i) => {
    const m = p.indexOf('<w:lastRenderedPageBreak/>');
    if (m === -1 || p.includes('pageBreakBefore') || p.indexOf('<w:p ', 1) !== -1) return p;
    if (/<w:t[ >]/.test(p.slice(0, m))) return p; // sayfa paragrafın ortasında başlıyor
    const once = xml.slice(0, i);
    if (!once.includes('<w:p ') && !once.includes('<w:p>')) return p; // belgenin ilk paragrafı
    const tablo = once.lastIndexOf('<w:tbl>');
    const tabloKapanis = once.lastIndexOf('</w:tbl>');
    if (tablo > tabloKapanis) {
      // tablo içinde: yalnız tablonun ilk satırının ilk paragrafı
      const tabloOnu = once.slice(tablo);
      if (/<w:p[ >]/.test(tabloOnu) || tabloOnu.includes('</w:tr>')) return p;
    }
    if (/^<w:p[^>]*>\s*<w:pPr>/.test(p)) {
      return p.replace(/(<w:pPr>(?:<w:pStyle[^>]*\/>)?(?:<w:keepNext\/>)?(?:<w:keepLines\/>)?)/, `$1${BASLA}`);
    }
    return p.replace(/^(<w:p[^>]*>)/, `$1<w:pPr>${BASLA}</w:pPr>`);
  });
}

function checklistYamasi(xml) {
  const y = [
    ['{durak_sayisi}  (-2', '{durak_sayisi}  ({durak_listesi})  /   {as_seyir_mes} m / {makine_konum}'],
    ['Car: Number of Rails', 'Car: Number of Rails 2 Type {kabin_ray_turu} Dimensions {kabin_ray_olcu} mm'],
    ['Counterweight: Number of Rails', 'Counterweight: Number of Rails 2 Type {kar_ray_turu} Dimensions {kar_ray_olcu} mm'],
    ['Car: Number: {kab_tamp_adet}', '{#kab_tamponlar}Car: Number: {adet} Manufacturer: {marka} Type: {tip}{/kab_tamponlar}'],
    [' Type: {kab_tamp_tip}', null],
    ['Counterweight: Number: {kar_tamp_adet}', '{#kar_tamponlar}Counterweight: Number: {adet} Manufacturer: {marka} Type: {tip}{/kar_tamponlar}'],
  ];
  const yamali = y.reduce((x, [parca, yeni]) => paragrafiDegistir(x, parca, yeni), xml);
  // Denetçi imza kutusu sayfanın sol üstüne sabitlenmiş; SIGNATURE satırının
  // yanına (son sayfada sayfaya göre sabit) alınır
  return yamali.replace('layoutInCell="1" allowOverlap="1" wp14:anchorId="04CAB736"', 'layoutInCell="0" allowOverlap="1" wp14:anchorId="04CAB736"').replace(
    '<wp:positionH relativeFrom="page"><wp:posOffset>-592709</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>98679</wp:posOffset></wp:positionV>',
    '<wp:positionH relativeFrom="page"><wp:posOffset>5143500</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>6223000</wp:posOffset></wp:positionV>'
  );
}

const sablonDosyasi = (kalem, baglam) => (kalem.dosyaFn ? kalem.dosyaFn(baglam) : kalem.dosya);
// Teknik dosya / Tüv forms şablonları denetimde seçilen sete göre klasörlenir
function sablonKlasoru(kalem, baglam) {
  if (kalem.klasor === CE) return setSecimi(baglam.denetim.teknikDosyaSeti, TEKNIK_DOSYA_SETLERI, CE);
  if (kalem.klasor === TUV) return setSecimi(baglam.denetim.tuvFormsSeti, TUV_FORMS_SETLERI, TUV);
  return kalem.klasor;
}
const sablonYolu = (kalem, baglam) => path.join(TEMPLATES_DIR, sablonKlasoru(kalem, baglam), sablonDosyasi(kalem, baglam));

// ---- Dosya kalemleri (liste ucu) ----
async function aksamBelgeleri(asansor, kalem) {
  if (kalem.halat) {
    // Halat belgesi: asansörde seçili halat markası + tipine uyan katalog belgesi
    if (!asansor?.halatMarka) return { dosyalar: [], altBilgi: '' };
    const belgeler = await AksamBelgesi.find({ bilesenTipiKodu: 'halat', marka: asansor.halatMarka }).lean();
    const uygun = belgeler.filter((b) => !asansor.halatTipi || (b.tipler ?? []).includes(asansor.halatTipi));
    const secilen = (uygun.length ? uygun : belgeler).filter((b) => b.dosya);
    return {
      dosyalar: secilen.map((b) => b.dosya),
      altBilgi: [asansor.halatMarka, asansor.halatTipi].filter(Boolean).join(' — '),
    };
  }
  const grup = aksamGrubu(asansor, kalem.slotlar);
  if (!grup) return { dosyalar: [], altBilgi: '' };
  const belgeler = grup.belgeIdler.length
    ? await AksamBelgesi.find({ _id: { $in: grup.belgeIdler } }).lean()
    : [];
  const dosyalar = [...new Map(belgeler.filter((b) => b.dosya).map((b) => [b.dosya.dosyaAnahtari, b.dosya])).values()];
  return { dosyalar, altBilgi: [grup.marka, grup.tip].filter(Boolean).join(' — ') };
}

function dosyaKalemi(kalem, { denetim, firma, asansor }) {
  const tekil = (s) => (s ? [s] : []);
  switch (kalem.kod) {
    case 'building-permit': return tekil(asansor?.yapiRuhsatiDosya);
    case 'calculations': return tekil(denetim.ekProje);
    case 'type-projects': return denetim.tipProjeler ?? [];
    // 9.1: firmanın SMM bilgilerinde yüklü sözleşme (yoksa "eksik")
    case 'project-service-contract': return tekil(firma?.smmSozlesme);
    // 9.2: SMM firmasındaki mühendislerin SMM belgeleri + imza sirküleri
    case 'engineers-competency':
      return ['smmMakMuhSmmBelgesi', 'smmMakMuhImzaSirkusu', 'smmElkMuhSmmBelgesi', 'smmElkMuhImzaSirkusu']
        .flatMap((alan) => tekil(asansor?.[alan] || firma?.[alan]));
    default: return [];
  }
}

async function kalemListesi(baglam) {
  const { denetim } = baglam;
  const uretilenler = new Map((denetim.uretilenBelgeler ?? []).map((u) => [u.sablonKodu, u]));
  const ozetler = new Map();
  try {
    const veri = await denetimVerisi(baglam);
    for (const k of DENETIM_G_KALEMLERI.filter((x) => x.tip === 'sablon' && x.hazir !== false && uretilenler.has(x.kod))) {
      ozetler.set(k.kod, await kaynakOzeti(sablonYolu(k, baglam), kalemVerisi(veri, k, baglam), baglam.firma));
    }
  } catch { /* özet hesaplanamazsa güncellik bilgisi verilmez */ }

  const sonuc = [];
  for (const k of DENETIM_G_KALEMLERI) {
    const satir = { no: k.no, kod: k.kod, ad: k.ad, tip: k.tip };
    if (k.tip === 'sablon') {
      if (k.hazir === false) {
        satir.hazirDegil = true;
        satir.altBilgi = 'Alan eşlemesi sonraki adımda eklenecek';
        satir.uretilen = null;
      } else {
        const u = uretilenler.get(k.kod);
        satir.uretilen = u ? { docx: u.docx, pdf: u.pdf, uretimTarihi: u.uretimTarihi } : null;
        satir.eskimis = !!u && ozetler.has(k.kod) && u.kaynakOzeti !== ozetler.get(k.kod);
      }
    } else if (k.tip === 'aksam') {
      const { dosyalar, altBilgi } = await aksamBelgeleri(baglam.asansor, k);
      satir.dosyalar = dosyalar;
      if (altBilgi) satir.altBilgi = altBilgi;
    } else {
      satir.dosyalar = dosyaKalemi(k, baglam);
      if (k.altBilgi) satir.altBilgi = k.altBilgi;
    }
    sonuc.push(satir);
  }
  return sonuc;
}

// ---- Üretim ----
async function belgeKaydet(denetimId, kalem, ozet, docxBuffer, pdfBuffer) {
  const ad = taban(kalem);
  const docxKey = buildObjectKey('denetimler', `${ad}.docx`);
  const pdfKey = buildObjectKey('denetimler', `${ad}.pdf`);
  await Promise.all([putObject(docxKey, docxBuffer, DOCX_MIME), putObject(pdfKey, pdfBuffer, 'application/pdf')]);
  const kayit = {
    sablonKodu: kalem.kod,
    sablonAdi: kalem.ad,
    docx: slotOlustur(docxKey, `${ad}.docx`, DOCX_MIME, docxBuffer.length),
    pdf: slotOlustur(pdfKey, `${ad}.pdf`, 'application/pdf', pdfBuffer.length),
    uretimTarihi: new Date(),
    kaynakOzeti: ozet,
  };
  const onceki = await Denetim.findOneAndUpdate(
    { _id: denetimId },
    { $pull: { uretilenBelgeler: { sablonKodu: kalem.kod } } },
    { returnDocument: 'before', projection: { uretilenBelgeler: 1 } }
  ).lean();
  await Denetim.updateOne({ _id: denetimId }, { $push: { uretilenBelgeler: kayit } });
  const eski = (onceki?.uretilenBelgeler ?? []).find((u) => u.sablonKodu === kalem.kod);
  await anahtarlariSil([eski?.docx?.dosyaAnahtari, eski?.pdf?.dosyaAnahtari]);
}

const uretilebilirKalem = (kod) => DENETIM_G_KALEMLERI.find((k) => k.kod === kod && k.tip === 'sablon' && k.hazir !== false);

async function kalemUret(denetimId, kod, slot, { zorla, ctx }) {
  const kalem = uretilebilirKalem(kod);
  if (!kalem) throw new Error('Bu belge henüz yazdırılamıyor');
  const baglam = await denetimYukle(denetimId);
  if (!baglam) throw new Error('Denetim bulunamadı');
  if (!gKodu(baglam.denetim)) throw new Error('Yazdırma listesi şimdilik yalnız Modül G için hazır');
  const yol = sablonYolu(kalem, baglam);
  await fs.access(yol).catch(() => { throw new Error(`Şablon dosyası bulunamadı: ${kalem.klasor}/${sablonDosyasi(kalem, baglam)}`); });
  const veri = await denetimVerisi(baglam);
  const kVeri = kalemVerisi(veri, kalem, baglam);
  const ozet = await kaynakOzeti(yol, kVeri, baglam.firma);
  const mevcut = (baglam.denetim.uretilenBelgeler ?? []).find((u) => u.sablonKodu === kod);
  if (!zorla && mevcut?.kaynakOzeti === ozet && mevcut.docx?.dosyaAnahtari && mevcut.pdf?.dosyaAnahtari) {
    return { durum: 'guncel' };
  }
  ctx.faz('hazirlaniyor');
  const docxBuffer = await sablonDoldur(yol, kVeri, baglam.firma, doldurmaSecenegi(baglam));
  ctx.faz('cevriliyor');
  const pdfBuffer = await convertDocxToPdf(docxBuffer, slot);
  ctx.faz('kaydediliyor');
  await belgeKaydet(denetimId, kalem, ozet, docxBuffer, pdfBuffer);
  return { durum: 'uretildi' };
}

async function topluUret(denetimId, slot, { ctx }) {
  const baglam = await denetimYukle(denetimId);
  if (!baglam) throw new Error('Denetim bulunamadı');
  if (!gKodu(baglam.denetim)) throw new Error('Yazdırma listesi şimdilik yalnız Modül G için hazır');
  const veri = await denetimVerisi(baglam);
  const mevcutlar = new Map((baglam.denetim.uretilenBelgeler ?? []).map((u) => [u.sablonKodu, u]));

  ctx.faz('hazirlaniyor');
  const hazirlar = [];
  for (const kalem of DENETIM_G_KALEMLERI.filter((k) => k.tip === 'sablon' && k.hazir !== false)) {
    if (ctx.iptalMi()) return ctx.iptalEt();
    ctx.durum(kalem.kod, 'uretiliyor');
    try {
      const yol = sablonYolu(kalem, baglam);
      await fs.access(yol).catch(() => { throw new Error(`Şablon dosyası bulunamadı: ${kalem.klasor}/${sablonDosyasi(kalem, baglam)}`); });
      const kVeri = kalemVerisi(veri, kalem, baglam);
      const ozet = await kaynakOzeti(yol, kVeri, baglam.firma);
      const mevcut = mevcutlar.get(kalem.kod);
      if (mevcut?.kaynakOzeti === ozet && mevcut.docx?.dosyaAnahtari && mevcut.pdf?.dosyaAnahtari) {
        ctx.durum(kalem.kod, 'guncel');
        continue;
      }
      hazirlar.push({ kalem, ozet, docxBuffer: await sablonDoldur(yol, { ...kVeri }, baglam.firma, doldurmaSecenegi(baglam)) });
      ctx.durum(kalem.kod, 'hazir');
    } catch (err) {
      ctx.durum(kalem.kod, 'hata', err.message);
    }
  }
  if (!hazirlar.length) return { durum: 'guncel' };
  if (ctx.iptalMi()) return ctx.iptalEt();

  ctx.faz('cevriliyor');
  const pdfler = await topluPdfCevir(hazirlar.map((h) => h.docxBuffer), slot, (i) => ctx.durum(hazirlar[i].kalem.kod, 'cevrildi'));
  for (let i = 0; i < hazirlar.length; i++) {
    if (pdfler[i]) continue;
    try {
      pdfler[i] = await convertDocxToPdf(hazirlar[i].docxBuffer, slot);
      ctx.durum(hazirlar[i].kalem.kod, 'cevrildi');
    } catch (err) {
      ctx.durum(hazirlar[i].kalem.kod, 'hata', err.message);
    }
  }

  ctx.faz('kaydediliyor');
  const kaydedilecek = hazirlar.map((h, i) => ({ h, pdf: pdfler[i] })).filter((x) => x.pdf);
  for (let i = 0; i < kaydedilecek.length; i += 3) {
    await Promise.all(kaydedilecek.slice(i, i + 3).map(async ({ h, pdf }) => {
      try {
        await belgeKaydet(denetimId, h.kalem, h.ozet, h.docxBuffer, pdf);
        ctx.durum(h.kalem.kod, 'tamam');
      } catch (err) {
        ctx.durum(h.kalem.kod, 'hata', err.message);
      }
    }));
  }
  return { durum: 'uretildi' };
}

const calistir = (id) => (kod, slot, secenek) => (kod ? kalemUret(id, kod, slot, secenek) : topluUret(id, slot, secenek));

// ---- Rotalar (/api/denetimler altına, denetim router'ından ÖNCE) ----
const router = express.Router();

router.get('/:id/yazdir', async (req, res) => {
  try {
    const baglam = await denetimYukle(req.params.id);
    if (!baglam) return res.status(404).json({ message: 'Denetim bulunamadı' });
    if (!gKodu(baglam.denetim)) {
      return res.json({ sablonSeti: baglam.denetim.modul || '', kalemler: [], mesaj: 'Yazdırma listesi şimdilik yalnız Modül G için hazır.' });
    }
    res.json({
      sablonSeti: 'Modül G',
      teknikDosyaSeti: setSecimi(baglam.denetim.teknikDosyaSeti, TEKNIK_DOSYA_SETLERI, CE),
      tuvFormsSeti: setSecimi(baglam.denetim.tuvFormsSeti, TUV_FORMS_SETLERI, TUV),
      kalemler: await kalemListesi(baglam),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/yazdir/:kod', async (req, res) => {
  try {
    const kalem = uretilebilirKalem(req.params.kod);
    if (!kalem) return res.status(400).json({ message: 'Bu belge henüz yazdırılamıyor' });
    if (!(await Denetim.exists({ _id: req.params.id }))) return res.status(404).json({ message: 'Denetim bulunamadı' });
    if (aktifTopluIs(req.params.id)) return res.status(409).json({ message: 'Toplu yazdırma sürüyor — bitmesini bekleyin.' });
    const isId = isBaslat({
      tescilId: req.params.id,
      tip: 'tekli',
      ad: `${kalem.no}-${kalem.ad}`,
      kalemler: [{ kod: kalem.kod, no: kalem.no, ad: kalem.ad }],
      zorla: req.body?.zorla === true,
      calistir: calistir(req.params.id),
    });
    res.status(202).json({ isId });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

router.post('/:id/yazdir-toplu', async (req, res) => {
  try {
    if (!(await Denetim.exists({ _id: req.params.id }))) return res.status(404).json({ message: 'Denetim bulunamadı' });
    const mevcut = aktifTopluIs(req.params.id);
    if (mevcut) return res.status(202).json({ isId: mevcut, mevcut: true });
    if (tescildeAktifIsVar(req.params.id)) {
      return res.status(409).json({ message: 'Bu denetimde başka bir yazdırma sürüyor — bitmesini bekleyin.' });
    }
    const isId = isBaslat({
      tescilId: req.params.id,
      tip: 'toplu',
      ad: 'Tümünü Yazdır',
      kalemler: DENETIM_G_KALEMLERI.filter((k) => k.tip === 'sablon' && k.hazir !== false).map(({ kod, no, ad }) => ({ kod, no, ad })),
      zorla: false,
      calistir: calistir(req.params.id),
    });
    res.status(202).json({ isId, mevcut: false });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

router.get('/:id/yazdir/isler', (req, res) => res.json(tescilIsleri(req.params.id)));

router.delete('/:id/yazdir/isler/:isId', (req, res) => {
  const iptal = isIptal(req.params.id, req.params.isId);
  res.status(iptal ? 200 : 404).json({ iptal });
});

router.delete('/:id/yazdir', async (req, res) => {
  try {
    if (tescildeAktifIsVar(req.params.id)) {
      return res.status(409).json({ message: 'Devam eden yazdırma var — bitmesini bekleyin veya iptal edin.' });
    }
    const denetim = await Denetim.findById(req.params.id).lean();
    if (!denetim) return res.status(404).json({ message: 'Denetim bulunamadı' });
    const liste = denetim.uretilenBelgeler ?? [];
    await Denetim.updateOne({ _id: denetim._id }, { $set: { uretilenBelgeler: [] } });
    const silinen = await anahtarlariSil(liste.flatMap((u) => [u.docx?.dosyaAnahtari, u.pdf?.dosyaAnahtari]));
    res.json({ silinen: liste.length, depodanSilinen: silinen });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

export default router;
