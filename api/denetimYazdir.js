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

// Risk analizinin gerekli olup olmadığı asansör ölçülerinden hesaplanır
// (AsansorDetayPage'deki kuyuDipRiskVar / kuyuUstRiskVar / makineDairesiRiskVar ile aynı kurallar).
// Ölçüler değişip risk ortadan kalkarsa o analizin seçili maddeleri de rapordan çıkar.
function riskDurumu(a) {
  const nedenler = { dip: [], ust: [], makine: [] };
  const sonuc = () => ({ dip: nedenler.dip.length > 0, ust: nedenler.ust.length > 0, makine: nedenler.makine.length > 0, nedenler });
  if (!a) return sonuc();
  const sayi = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  const hiz = sayi(a.hiz);
  const sonParca = (str) => { const p = String(str ?? '').split('x'); return Number(p[p.length - 1]); };

  const kabinAlt = sayi(a.kuyuDipKabinEnAltNokta), b = sayi(a.kuyuDipBosluk), s = sayi(a.kuyuDipTamponStroke);
  const durmaSonCm = sonParca(a.kuyuDipDurmaAlani);
  if (kabinAlt !== null && b !== null && s !== null && hiz !== null && Number.isFinite(durmaSonCm) && a.kuyuDipDurmaAlani) {
    const sonHareketMm = b + s + 0.035 * hiz * hiz * 1000;
    const etek = sayi(a.kuyuDipEtekSaciTabanMesafe), iv = sayi(a.kuyuDipIvOlcusu);
    if ((kabinAlt - sonHareketMm) / 10 < durmaSonCm) nedenler.dip.push('durma');
    if (etek !== null && etek - sonHareketMm < 0) nedenler.dip.push('etek');
    if (iv !== null && iv - sonHareketMm < 0) nedenler.dip.push('iv');
  }

  const kb = sayi(a.kuyuDipKarsiBosluk), ks = sayi(a.kuyuDipKarsiStroke);
  if (kb !== null && ks !== null && hiz !== null) {
    const sh = kb + ks + 0.035 * hiz * hiz * 1000;
    const durmaSonMm = sonParca(a.kuyuUstDurmaAlani) * 10;
    const kork = sayi(a.kuyuUstKorkulukMesafe), susp = sayi(a.kuyuUstSuspansiyonMesafe), ustDurma = sayi(a.kuyuUstKabinUstDurma);
    if (kork !== null && kork - sh < 300) nedenler.ust.push('korkuluk');
    if (susp !== null && susp - sh < 500) nedenler.ust.push('susp');
    if (ustDurma !== null && Number.isFinite(durmaSonMm) && ustDurma - sh - durmaSonMm < 0) nedenler.ust.push('durma');
  }

  if (a.makinaKonumu === 'MR') {
    const c = sayi(a.makineDairesiCalismaYuksekligi), g = sayi(a.makineDairesiGecisYuksekligi), k = sayi(a.makineDairesiKapiYuksekligi);
    if (c !== null && c < 2100) nedenler.makine.push('calisma');
    if (g !== null && g < 1800) nedenler.makine.push('gecis');
    if (k !== null && k < 2000) nedenler.makine.push('kapi');
  }
  return sonuc();
}

// 20.Risk Analiz Formu: her risk analizi için başlık, tehlikeli durum ve olası etki metinleri
// (Türkçe / İngilizce). Tehlikeli durum ve etki, o analizi gerektiren ölçülere göre otomatik seçilir.
const RISK_ETKILERI = {
  bas: ['Bakım, arıza ve kurtarma esnasında kişinin başını çarpma neticesinde ciddi yaralanması veya ölüm', 'Serious injury or death due to head impact during maintenance, breakdown and rescue'],
  sikisma: ['Kabin altında/üstünde çalışan kişinin sıkışması veya ezilmesi neticesinde ciddi yaralanması veya ölüm', 'Serious injury or death due to a person working under/above the car being trapped or crushed'],
  makine: ['Makine dairesinde çalışma ve hareket esnasında kişinin başını çarpması neticesinde yaralanma', 'Injury due to head impact while working and moving in the machine room'],
};
const RISK_METINLERI = {
  dip: {
    baslik: ['Kuyu dibi (kabin altı) risk analizi', 'Pit (under car) risk analysis'],
    nedenler: {
      durma: ['Kabin en alçak konumundayken kabin altı ile çukur tabanı arasında durma (sığınma) alanının yetersiz olması', 'Insufficient refuge space between the underside of the car and the pit floor when the car is at its lowest position'],
      etek: ['Etek sacı ucu ile çukur tabanı arasındaki mesafenin yetersiz olması', 'Insufficient clearance between the toe guard (apron) end and the pit floor'],
      iv: ['Çukurdaki ekipman ile kabin arasındaki serbest mesafenin yetersiz olması', 'Insufficient free clearance between the equipment in the pit and the car'],
    },
    etki: { durma: 'sikisma', etek: 'sikisma', iv: 'sikisma' },
  },
  ust: {
    baslik: ['Kuyu üstü (kabin üstü) risk analizi', 'Well top (car roof) risk analysis'],
    nedenler: {
      korkuluk: ['Kabin üstü korkuluğu ile kuyu tavanı arasındaki mesafenin yetersiz olması', 'Insufficient clearance between the car roof balustrade and the well ceiling'],
      susp: ['Süspansiyon elemanları ile kuyu tavanı arasındaki mesafenin yetersiz olması', 'Insufficient clearance between the suspension means and the well ceiling'],
      durma: ['Kabin en üst konumundayken kabin üstünde durma (sığınma) alanının yetersiz olması', 'Insufficient refuge space on the car roof when the car is at its highest position'],
    },
    etki: { korkuluk: 'bas', susp: 'bas', durma: 'sikisma' },
  },
  makine: {
    baslik: ['Makine dairesi risk analizi', 'Machine room risk analysis'],
    nedenler: {
      calisma: ["Makine dairesi çalışma alanı yüksekliğinin 2,10 m'den düşük olması", 'Working area height in the machine room is lower than 2,10 m'],
      gecis: ["Makine dairesi geçiş (hareket) alanı yüksekliğinin 1,80 m'den düşük olması", 'Clear height for movement in the machine room is lower than 1,80 m'],
      kapi: ["Makine dairesi giriş kapısı yüksekliğinin 2,00 m'den düşük olması", 'Machine room access door height is lower than 2,00 m'],
    },
    etki: { calisma: 'makine', gecis: 'makine', kapi: 'makine' },
  },
};

// Form yayım tarihi: denetim yılının Ocak ayının ilk 10 gününden biri (denetime göre sabit, rastgele görünür)
function riskYayimTarihi(denetim) {
  const yil = new Date(denetim.denetimTarihi ?? Date.now()).getFullYear();
  const gun = 1 + (parseInt(String(denetim._id).slice(-6), 16) % 10);
  return `${String(gun).padStart(2, '0')}.01.${yil}`;
}

// 20.Risk Analiz Formu şablon alanları (denetim ve tescil yazdırması ortak kullanır)
function riskFormAlanlari(asansor, grup, veri, yayimTarihi) {
  const f = riskFormMetinleri(asansor, grup);
  return {
    ...veri,
    risk_analiz_kabinust: f.baslikTr,
    risk_analiz_en_kabinust: f.baslikEn,
    'risk_analiz_içerik_tanımı': f.baslikTr,
    risk_analiz_icerik_tanimi_ingilizce: f.baslikEn,
    tehlikeli_durum_kabinust: f.durumTr,
    tehlikeli_durum_en_kabinust: f.durumEn,
    tehlikeli_durum_aciklamas: f.durumTr,
    tehlikeli_durum_aciklamasi: f.durumTr,
    tehlikeli_durum_aciklamasi_ingilizce: f.durumEn,
    olasi_etki: `${f.etkiTr}\n${f.etkiEn}`,
    uygulma_maddeleri: veri[`risk_cozum_${grup}`] ?? '',
    yayim_tarih_kabinust: yayimTarihi,
    yayim_tarih: yayimTarihi,
    // Güncellik özetine girsin diye (resim eklenip çıkarılınca belge eskir)
    risk_resim_anahtarlari: riskResimAnahtarlari(asansor, grup).join(','),
  };
}

// Gerçekleşen nedenlere göre form metinleri (birden çok neden varsa maddeler alt alta)
function riskFormMetinleri(asansor, grup) {
  const m = RISK_METINLERI[grup];
  const nedenler = riskDurumu(asansor).nedenler[grup];
  const liste = (idx) => nedenler.map((n) => m.nedenler[n][idx]);
  const etkiler = [...new Set(nedenler.map((n) => m.etki[n]))].map((k) => RISK_ETKILERI[k]);
  const birlestir = (dizi) => (dizi.length > 1 ? dizi.map((t) => `- ${t}`).join('\n') : dizi.join(''));
  return {
    baslikTr: m.baslik[0],
    baslikEn: m.baslik[1],
    durumTr: birlestir(liste(0)),
    durumEn: birlestir(liste(1)),
    etkiTr: birlestir(etkiler.map((e) => e[0])),
    etkiEn: birlestir(etkiler.map((e) => e[1])),
  };
}

// Asansörde risk analizi gerekli olan gruplarının seçili maddeleri
const riskSecimleri = (asansor, gruplar = ['dip', 'ust', 'makine']) => {
  const r = riskDurumu(asansor);
  const var_ = (g) => r[g] && gruplar.includes(g);
  return [
    ...(var_('dip') ? asansor.kuyuDibiRiskMaddeleri ?? [] : []),
    ...(var_('ust') ? asansor.kuyuUstuRiskMaddeleri ?? [] : []),
    ...(var_('makine') ? asansor.makineDairesiRiskMaddeleri ?? [] : []),
  ].filter((m) => m?.metin);
};

// `kosul` tanımlı kalem yalnız koşul sağlanınca listelenir/yazdırılır
const kalemAktif = (k, baglam) => !k.kosul || k.kosul(baglam);
// Modul B: Tip Projeler alanında seçilen Certificate Annex formları (ce-td-temp1), seçim sırasıyla,
// "Engineers Competency Certificates"tan sonra ek kalemler olarak listelenir
function annexKalemleri(baglam) {
  if (ceModulKodu(baglam.denetim.modul) !== 'B') return [];
  const secenekler = new Map((baglam.annexler ?? []).map((a) => [a.etiket, a]));
  return (baglam.denetim.certificateAnnexler ?? [])
    .filter((etiket) => secenekler.has(etiket))
    .map((etiket, i) => ({
      no: `9.3.${i + 1}`,
      kod: `certificate-annex-${i + 1}`,
      ad: `Certificate Annex For Modul B (${etiket})`,
      tip: 'sablon',
      klasor: CE,
      dosya: secenekler.get(etiket).dosya,
    }));
}

const aktifKalemler = (baglam) => {
  const sonuc = [];
  for (const k of DENETIM_G_KALEMLERI) {
    if (kalemAktif(k, baglam)) sonuc.push(k);
    if (k.kod === 'engineers-competency') sonuc.push(...annexKalemleri(baglam));
  }
  return sonuc;
};

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
  // Sarı vurgulu sabit metinlere (sertifika/proje no, tarihler) dokunulmaz — etiket içermezler
  { no: '14', kod: 'module-g-certificate', ad: 'MODULE G CERTIFICATE', tip: 'sablon', klasor: TUV, dosya: 'MODULE G xxxxxx CERTIFICATE.docx', kosul: ({ denetim }) => gKodu(denetim) },
  // Standarttan sapma raporu: yalnız asansörde risk analizi (kuyu dibi/üstü/makine dairesi) varsa listelenir
  // Risk analiz formu (kabin üstü / kuyu üstü): kuyu üstü risk analizi gerekiyorsa listelenir
  { no: '20.1', kod: 'risk-analysis-dip', ad: 'Risk Analiz Formu - Kuyu Dibi', tip: 'sablon', klasor: CE, dosya: '20.Risk Analiz Formu.docx', riskGrup: 'dip', kosul: ({ asansor }) => riskDurumu(asansor).dip },
  { no: '20.2', kod: 'risk-analysis-ust', ad: 'Risk Analiz Formu - Kuyu Üstü', tip: 'sablon', klasor: CE, dosya: '20.Risk Analiz Formu.docx', riskGrup: 'ust', kosul: ({ asansor }) => riskDurumu(asansor).ust },
  { no: '20.3', kod: 'risk-analysis-makine', ad: 'Risk Analiz Formu - Makine Dairesi', tip: 'sablon', klasor: CE, dosya: '20.Risk Analiz Formu.docx', riskGrup: 'makine', kosul: ({ asansor }) => riskDurumu(asansor).makine },
  { no: '15', kod: 'deviation-report', ad: 'DEVIATION FROM STANDARD CONTROL AND CONFIRMITY REPORT', tip: 'sablon', klasor: TUV, dosya: 'DEVIATION FROM STANDARD CONTROL AND APPROVAL REPORT.docx', kosul: ({ asansor }) => riskSecimleri(asansor).length > 0 },
];

// ce-td-temp1 içindeki "Certificate Annex For Modul B ( 800 kg 1.6 ms 1-1 askı ).docx" şablonları:
// parantez içi etiket seçenek olur ("800 kg 1.6 ms 1-1 askı")
export async function annexSecenekleri() {
  const dosyalar = await fs.readdir(path.join(TEMPLATES_DIR, CE)).catch(() => []);
  const liste = [];
  for (const dosya of dosyalar) {
    const m = /^Certificate Annex For Modul B\s*\(\s*(.+?)\s*\)\.docx$/i.exec(dosya);
    if (m) liste.push({ etiket: m[1].replace(/\s+/g, ' '), dosya });
  }
  const sayilar = (e) => (e.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  return liste.sort((x, y) => {
    const a = sayilar(x.etiket), b = sayilar(y.etiket);
    for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
    return x.etiket.localeCompare(y.etiket, 'tr');
  });
}

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
  return {
    denetim, firma: firmaGorsel, asansor, denetci, annexler: await annexSecenekleri(),
    bAksamlar: ceModulKodu(denetim.modul) === 'B' ? await bAksamSatirlari(denetim) : null,
  };
}

const gKodu = (denetim) => ceModulKodu(denetim.modul) === 'G';
// Yazdırma listesi Modül G, B, E ve H1 denetimlerinde açıktır
const yazdirModulu = (denetim) => ['G', 'B', 'E', 'H1'].includes(ceModulKodu(denetim.modul));
const YAZDIR_MODUL_ETIKETI = { G: 'Modül G', B: 'Modül B', E: 'Modül E', H1: 'Modül H1' };

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
// Seçili komponent kodu -> şablonlardaki etiket önekleri (kilit/tampon gibi formlarda farklı adlarla geçer)
const B_KOMPONENT_ONEKLERI = {
  hiz_regulatoru: ['hiz_reg'],
  fren: ['fren', 'kab_fren'],
  kontrol_karti: ['kart'],
  durak_kapi_kilidi: ['durak_kapi_kilit', 'd_kapi', 'kilit'],
  kabin_kapi_kilidi: ['kabin_kapi_kilit', 'k_kapi', 'kab_kilit'],
  ucm_acop: ['ucm_acop'],
  motor: ['motor'],
  tampon: ['kab_tamp', 'kar_tamp'],
};

// Denetimin seçili komponent satırları, katalog bilgileriyle (onaylı kurum, NoBo, sertifika) zenginleştirilir;
// aynı sertifika numaralı satırlar tek kayıtta birleşir (tipler virgülle)
async function bAksamSatirlari(denetim) {
  const satirlar = denetim.guvenlikAksamlari ?? [];
  const idler = [...new Set(satirlar.map((a) => a.belgeId).filter(Boolean).map(String))];
  const katalog = idler.length ? await AksamBelgesi.find({ _id: { $in: idler } }).lean() : [];
  const harita = new Map(katalog.map((b) => [String(b._id), b]));
  const gruplar = {};
  for (const a of satirlar) {
    const belge = harita.get(String(a.belgeId));
    const kayit = {
      marka: bos(belge?.marka || a.marka),
      tip: bos(a.tip),
      sertifikaNo: bos(belge?.sertifikaNo || a.sertifikaNo),
      kurum: bos(belge?.onayliKurumUnvan),
      nobo: bos(belge?.onayliKurumNobo),
    };
    const liste = (gruplar[a.bilesenTipiKodu] ??= []);
    const anahtar = kayit.sertifikaNo ? `sert:${kayit.sertifikaNo.toLocaleLowerCase('tr')}` : `${a.belgeId}|${kayit.tip}`;
    const var_ = liste.find((x) => x.anahtar === anahtar);
    if (var_) {
      if (kayit.tip && !var_.tipler.includes(kayit.tip)) var_.tipler.push(kayit.tip);
      if (kayit.marka && !var_.markalar.includes(kayit.marka)) var_.markalar.push(kayit.marka);
    } else {
      liste.push({ anahtar, markalar: kayit.marka ? [kayit.marka] : [], tipler: kayit.tip ? [kayit.tip] : [], sertifikaNo: kayit.sertifikaNo, kurum: kayit.kurum, nobo: kayit.nobo });
    }
  }
  return gruplar;
}

// Her komponent için ilgili etiketler: alan başına alt alta satırlar (satır = bir sertifika kaydı);
// *_ozet etiketi "Marka / Tip / Onaylı Kurum - NoBo / Sertifika No" biçiminde birleşik satırlardır
function bAksamTaglari(gruplar) {
  const sonuc = {};
  for (const [kod, onekler] of Object.entries(B_KOMPONENT_ONEKLERI)) {
    const liste = gruplar[kod] ?? [];
    if (!liste.length) continue;
    const kurumNobo = (g) => [g.kurum, g.nobo].filter(Boolean).join(' - ');
    const satirlar = (fn) => liste.map(fn).join('\n');
    for (const on of onekler) {
      const marka = satirlar((g) => g.markalar.join(', '));
      sonuc[`${on}_marka`] = marka;
      sonuc[`${on}_ad`] = marka;
      sonuc[`${on}_tip`] = satirlar((g) => g.tipler.join(', '));
      sonuc[`${on}_cert_no`] = satirlar((g) => g.sertifikaNo);
      sonuc[`${on}_nobo`] = satirlar(kurumNobo);
      sonuc[`${on}_ozet`] = satirlar((g) => [g.markalar.join(', '), g.tipler.join(', '), kurumNobo(g), g.sertifikaNo].join(' / '));
      // Numaralı tampon alanları (kab_tamp_1..3) asansör kaydından geliyordu; seçili komponentler
      // zaten alt alta yazıldığından tekrar etmesin diye boşaltılır
      if (kod === 'tampon') {
        for (let i = 1; i <= 3; i++) {
          for (const alan of ['marka', 'tip', 'cert_no', 'nobo', 'serino']) sonuc[`${on}_${i}_${alan}`] = '';
        }
      }
    }
  }
  return sonuc;
}

// Modul B: denetimde "Modul B Komponentler" panelinden seçilen komponentler, formlardaki ilgili
// komponent alanlarına (marka/tip/onaylı kurum-NoBo/sertifika) alt alta yazılır
function kalemVerisi(veri, kalem, baglam) {
  const sonuc = kalemVerisiTemel(veri, kalem, baglam);
  return baglam.bAksamlar ? { ...sonuc, ...bAksamTaglari(baglam.bAksamlar) } : sonuc;
}

function kalemVerisiTemel(veri, kalem, baglam) {
  const { asansor, denetim, denetci } = baglam;
  if (kalem.kod.startsWith('certificate-annex-')) return { ...veri, ...annexAciklamasi(asansor, kalem, veri) };
  if (kalem.kod === 'checklist') return { ...veri, ...checklistVerisi(asansor, String(denetim._id)) };
  if (kalem.kod === 'module-g-certificate') {
    return { ...veri, ...teknikVerisi(asansor, denetim, denetci), ...ornekTabloVerisi(asansor), 'kişi_sayisi': bos(asansor?.kisiSayisi) };
  }
  if (kalem.riskGrup) return riskFormAlanlari(asansor, kalem.riskGrup, veri, riskYayimTarihi(denetim));
  if (kalem.kod === 'sample-table') return { ...veri, ...teknikVerisi(asansor, denetim, denetci), ...ornekTabloVerisi(asansor) };
  if (kalem.kod === 'technical-descriptions') return { ...veri, ...teknikVerisi(asansor, denetim, denetci) };
  return veri;
}

// Certificate Annex "1. Description of the lift": makine dairesi (MR/MRL) ve askı oranına (1:1 / 2:1) göre
// 3 paragraf. Askı oranı seçilen annex formunun kendi etiketinden ("... 2-1 askı"), yoksa asansörden alınır
function annexAciklamasi(asansor, kalem, veri) {
  const ad = veri.kisa_ad || 'The lift';
  const oran = /(\d)-(\d)\s*askı/i.exec(kalem.ad)?.slice(1, 3).join(':') || asansor?.askiTipi || '1:1';
  const mrl = asansor?.makinaKonumu === 'MRL';
  const makine = mrl
    ? `The ${ad} is a machine roomless concept. The machine is installed in the well, at the top of the well. The control panel and the maintenance panel are located next to the lift entrance door at the top landing.`
    : `The ${ad} is a machine room concept. The machine is installed in a separate machine room above of the well. The machine room contains the electric drive, the control panel and the maintenance panel.`;
  const montaj = mrl
    ? 'The machine is mounted on the guide rails (or on a base fixed to the well structure) inside the well.'
    : 'The machine is mounted on a base with brackets which is fixed on concrete.';
  return {
    paraf1: makine,
    paraf2: `The suspension is of the topslung type with a reefing factor ${oran}. ${montaj}`,
    paraf3: 'The main characteristics of the layout are given in figure 1 and on the next pages. For more details we refer to the technical file. The main characteristics concerning the model description are listed on the next pages.',
  };
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

// Risk analizi maddeleri: katalogdaki "standart" işaretine göre iki sütuna ayrılır
// (standart madde numaraları / uygulanan çözümler)
async function riskVerisi(asansor) {
  const secimler = riskSecimleri(asansor);
  const idler = secimler.map((m) => m.maddeId).filter(Boolean);
  const katalog = idler.length ? await mongoose.model('RiskMaddesi').find({ _id: { $in: idler } }).select('standart').lean() : [];
  const standartlar = new Set(katalog.filter((m) => m.standart).map((m) => String(m._id)));
  const birlestir = (liste) => liste.map((m) => m.metin.trim()).join('\n\n');
  const standartMi = (m) => m.maddeId && standartlar.has(String(m.maddeId));
  // 20.Risk Analiz Formu: her analizde yalnız o analizin uygulanan çözümleri
  const cozum = (grup) => birlestir(riskSecimleri(asansor, [grup]).filter((m) => !standartMi(m)));
  return {
    risk_cozum_dip: cozum('dip'),
    risk_cozum_ust: cozum('ust'),
    risk_cozum_makine: cozum('makine'),
    risk_standart_maddeleri: birlestir(secimler.filter(standartMi)),
    risk_uygulama_maddeleri: birlestir(secimler.filter((m) => !standartMi(m))),
  };
}

async function denetimVerisi({ denetim, firma, asansor, denetci }) {
  const sahteTescil = {
    abUygunlukBeyaniTarihi: denetim.abUygunlukBeyaniTarihi,
    sonKontrolTarihi: denetim.sonKontrolTarihi,
    // Tescildeki gibi CE bilgisi (onaylı kurum, NoBo, belge no): firmanın bu modüle
    // ait CE belgeleri otomatik seçili sayılır (E beyanı B tip incelemesine de dayanır)
    // Denetimde elle seçilen onaylı kurum/CE belgeleri varsa onlar kullanılır
    // Modül G'de onaylı kurum CE belgesinden seçilmez (denetçiden gelir): eski seçimler yok sayılır
    ceBelgeIdleri: (denetim.ceBelgeIdleri ?? []).length && !gKodu(denetim)
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
    denetim_tarihi: tarihStr(denetim.denetimTarihi),
    ...(await riskVerisi(asansor)),
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
// Risk analizinin uygulama resimleri (madde bazlı değil, analiz başına)
const RISK_RESIM_ALANLARI = { dip: 'kuyuDibiRiskResimleri', ust: 'kuyuUstuRiskResimleri', makine: 'makineDairesiRiskResimleri' };
const riskResimAnahtarlari = (asansor, grup) => [...new Set(
  (asansor?.[RISK_RESIM_ALANLARI[grup]] ?? []).map((r) => r?.dosyaAnahtari).filter(Boolean)
)];

// İlk tablo (firma/asansör bilgileri) başlık tablosundan dar çıkıyor (%103 + sabit yerleşim, LibreOffice
// sütunları farklı hesaplıyor): başlık tablosuyla aynı genişliğe (14034) ve sütunlara (3828 / kalan) çekilir
function ilkTabloyuBaslikGenisligineGetir(xml) {
  const bas = xml.indexOf('<w:tbl>');
  const son = xml.indexOf('</w:tbl>', bas);
  if (bas === -1 || son === -1) return xml;
  let t = xml.slice(bas, son);
  t = t.replace(/<w:tblW [^>]*\/>/, '<w:tblW w:w="14034" w:type="dxa"/>');
  t = t.replace(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/, '<w:tblGrid><w:gridCol w:w="3828"/><w:gridCol w:w="10186"/><w:gridCol w:w="20"/></w:tblGrid>');
  const hucreGenisligi = { 1318: 3828, 3535: 10186, 147: 20 };
  t = t.replace(/<w:tcW w:w="(\d+)" w:type="pct"\/>/g, (m, w) => (hucreGenisligi[w] ? `<w:tcW w:w="${hucreGenisligi[w]}" w:type="dxa"/>` : m));
  // Satır aralarındaki çok ince boş ayraç satırları çift çizgi gibi görünüyor — kaldırılır
  t = t.replace(/<w:tr [\s\S]*?<\/w:tr>/g, (satir) => (/<w:trHeight w:val="(?:89|62)"\/>/.test(satir) && !satir.replace(/<[^>]+>/g, '').trim() ? '' : satir));
  return xml.slice(0, bas) + t + xml.slice(son);
}

// 20.Risk Analiz Formu: render öncesi XML yamaları
function riskXmlYama(xml) {
  xml = ilkTabloyuBaslikGenisligineGetir(xml);
  // Olası etki metni (şablonda sabit) gruba göre doldurulur
  xml = xml.replace('Bakım, arıza ve kurtarma esnasında kişinin başını çarpma neticesinde ciddi yaralanması veya ölüm', '{olasi_etki}');
  // Düzeltici faaliyet paragrafında negatif sağ girinti (-1302) metni hücrenin dışına taşırıyor
  xml = xml.replace(/(<w:ind[^>]*?) w:right="-\d+"/g, '$1');
  // Hücrelerdeki noWrap uzun metinlerin hücre dışına taşmasına yol açıyor — metin sarılsın
  xml = xml.replace(/<w:noWrap\/>/g, '');
  // LibreOffice'te 1. sayfa birkaç satır taşıyor: alt kenar boşluğu biraz daraltılır
  xml = xml.replace(/(<w:pgMar [^>]*w:bottom=")1417(")/, '$1900$2');
  return tablolariYeniSayfadaBaslat(ilkTablodakiBosSonSatiriKaldir(hucreIciKonumlariDuzelt(birlesikSatirlariTekle(bosDolguTablolariniKaldir(checklistYamasi(xml))))), [1, 2]);
}

const doldurmaSecenegi = ({ denetim, asansor }, kalem) => ({
  checkboxTagleri: isaretlenecekCheckboxTagleri(ceModulKodu(denetim.modul)),
  ...(kalem?.riskGrup ? { cokluGorseller: { 'risk_analiz_resimlerİ': riskResimAnahtarlari(asansor, kalem.riskGrup) } } : {}),
  xmlYama: (xml) => {
    // 20.Risk Analiz Formu: Word'ün tablo içine koyduğu sayfa sonları genel yamada LibreOffice'te
    // tablo başına boş satır ekliyor — 2. ve 3. tablo "sayfa başı" paragrafıyla başlatılır
    if (kalem?.riskGrup) return riskXmlYama(xml);
    const yamali = icindekilerSayfaKirilimi(wordSayfaKirilimlari(hucreIciKonumlariDuzelt(birlesikSatirlariTekle(bosDolguTablolariniKaldir(checklistYamasi(xml))))));
    if (kalem?.kod === 'module-g-certificate') return bosParagraflariKucult(yamali);
    if (kalem?.kod === 'deviation-report') return uzunSatirlariEsnet(yamali);
    return yamali;
  },
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

// Tablo dışındaki boş paragraflar (yalnız boşluk bırakan) 2 pt'ye indirilir: LibreOffice
// satır yüksekliklerini biraz büyük hesapladığı için tek sayfalık belgeler ikinci sayfaya taşıyor.
// İlk tablonun metinsiz son satırı LibreOffice'te sayfaya sığmayıp tek başına sonraki sayfaya
// taşıyor (Word'de sığıyor) — görünür içeriği olmayan bu satır kaldırılır
function ilkTablodakiBosSonSatiriKaldir(xml) {
  const son = xml.indexOf('</w:tbl>');
  const satirBas = xml.lastIndexOf('<w:tr ', son);
  if (son === -1 || satirBas === -1) return xml;
  const satir = xml.slice(satirBas, son);
  if (!/<w:t[ >]/.test(satir)) xml = xml.slice(0, satirBas) + xml.slice(son);
  // Yeni son satırın hücrelerindeki sondaki boş paragraflar da atılır (en az biri kalır)
  const bit = xml.indexOf('</w:tbl>');
  const bas = xml.lastIndexOf('<w:tr ', bit);
  const temiz = xml.slice(bas, bit).replace(/<w:tc>[\s\S]*?<\/w:tc>/g, (hucre) => {
    const bos = /<w:p(?: [^>]*)?(?:\/>|>(?:(?!<w:t[ >]|<w:drawing|<w:br)[\s\S])*?<\/w:p>)(?=(?:<w:p(?: [^>]*)?(?:\/>|>(?:(?!<w:t[ >]|<w:drawing|<w:br)[\s\S])*?<\/w:p>))*<\/w:tc>$)/g;
    return hucre.replace(bos, (m, ofs) => (hucre.slice(0, ofs).includes('<w:p') && ofs > hucre.indexOf('<w:p') ? '' : m));
  });
  // Kaldırılan boş satırın taşıdığı alt çizgi son satıra verilir
  const cizgili = temiz.replace(/<w:bottom w:val="nil"\/>/g, '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>');
  return xml.slice(0, bas) + cizgili + xml.slice(bit);
}

// Verilen sıradaki (0 tabanlı) gövde tablolarından hemen önce, yeni sayfa başlatan çok küçük
// bir paragraf eklenir; tablo içindeki lastRenderedPageBreak izleri (Word'ün eski yerleşimi)
// kaldırılır (LibreOffice tablo içi sayfa sonunu boş satır olarak bırakıyor)
function tablolariYeniSayfadaBaslat(xml, siralar) {
  xml = xml.replace(/<w:lastRenderedPageBreak\/>/g, '');
  const baslar = [];
  for (let i = xml.indexOf('<w:tbl>'); i !== -1; i = xml.indexOf('<w:tbl>', i + 1)) baslar.push(i);
  const kirim = '<w:p><w:pPr><w:pageBreakBefore/><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
  for (const sira of [...siralar].sort((a, b) => b - a)) {
    if (baslar[sira] === undefined) continue;
    // Tablodan hemen önceki boş paragraflar (sığmayınca fazladan boş sayfa üretirler) atılır
    let bas = baslar[sira];
    for (;;) {
      const onceki = xml.slice(0, bas).match(/<w:p(?: [^>]*)?\/>$|<w:p(?: [^>]*)?>(?:(?!<w:p[ >]|<\/w:p>|<w:t[ >]|<w:drawing|<w:br|<w:sectPr)[\s\S])*<\/w:p>$/);
      if (!onceki) break;
      bas -= onceki[0].length;
    }
    xml = xml.slice(0, bas) + kirim + xml.slice(baslar[sira]);
  }
  return xml;
}

// Sapma raporunda madde metinleri sabit yükseklikli satıra sığmaz (kesilir):
// yüksek (içerik) satırları "en az" yüksekliğe çevrilir, böylece metne göre uzar
function uzunSatirlariEsnet(xml) {
  return xml.replace(/<w:trHeight w:hRule="exact" w:val="(\d+)"\/>/g, (m, v) => (Number(v) >= 900 ? `<w:trHeight w:hRule="atLeast" w:val="${v}"/>` : m));
}

function bosParagraflariKucult(xml) {
  const tablolar = [];
  let derinlik = 0;
  let bas = 0;
  for (const m of xml.matchAll(/<w:tbl>|<\/w:tbl>/g)) {
    if (m[0] === '<w:tbl>') { if (derinlik === 0) bas = m.index; derinlik += 1; }
    else { derinlik -= 1; if (derinlik === 0) tablolar.push([bas, m.index]); }
  }
  const tabloIcinde = (i) => tablolar.some(([b, e]) => b < i && i < e);
  return xml.replace(/<w:p[ >](?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, (p, i) => {
    if (/<w:t[ >]|<w:drawing>|<w:pict>|<w:br|<w:sectPr|<w:object/.test(p) || tabloIcinde(i)) return p;
    const kucuk = '<w:rPr><w:sz w:val="4"/><w:szCs w:val="4"/></w:rPr>';
    if (/<w:pPr>/.test(p)) {
      return p.includes('<w:rPr>') ? p.replace(/<w:rPr>[\s\S]*?<\/w:rPr>(?=<\/w:pPr>)/, kucuk) : p.replace('</w:pPr>', `${kucuk}</w:pPr>`);
    }
    return p.replace(/^(<w:p[^>]*>)/, `$1<w:pPr>${kucuk}</w:pPr>`);
  });
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
    case 'calculations': return tekil(asansor?.asansorProjesiDosya ?? denetim.ekProje);
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
    for (const k of aktifKalemler(baglam).filter((x) => x.tip === 'sablon' && x.hazir !== false && uretilenler.has(x.kod))) {
      ozetler.set(k.kod, await kaynakOzeti(sablonYolu(k, baglam), kalemVerisi(veri, k, baglam), baglam.firma));
    }
  } catch { /* özet hesaplanamazsa güncellik bilgisi verilmez */ }

  const sonuc = [];
  for (const k of aktifKalemler(baglam)) {
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

const uretilebilirKalem = (baglam, kod) => aktifKalemler(baglam).find((k) => k.kod === kod && k.tip === 'sablon' && k.hazir !== false);

async function kalemUret(denetimId, kod, slot, { zorla, ctx }) {
  const baglam = await denetimYukle(denetimId);
  if (!baglam) throw new Error('Denetim bulunamadı');
  const kalem = uretilebilirKalem(baglam, kod);
  if (!kalem) throw new Error('Bu belge henüz yazdırılamıyor');
  if (!yazdirModulu(baglam.denetim)) throw new Error('Yazdırma listesi şimdilik yalnız Modül G, B, E ve H1 için hazır');
  if (!kalemAktif(kalem, baglam)) throw new Error('Bu belge bu denetim için gerekli değil (risk analizi yok)');
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
  const docxBuffer = await sablonDoldur(yol, kVeri, baglam.firma, doldurmaSecenegi(baglam, kalem));
  ctx.faz('cevriliyor');
  const pdfBuffer = await convertDocxToPdf(docxBuffer, slot);
  ctx.faz('kaydediliyor');
  await belgeKaydet(denetimId, kalem, ozet, docxBuffer, pdfBuffer);
  return { durum: 'uretildi' };
}

async function topluUret(denetimId, slot, { ctx }) {
  const baglam = await denetimYukle(denetimId);
  if (!baglam) throw new Error('Denetim bulunamadı');
  if (!yazdirModulu(baglam.denetim)) throw new Error('Yazdırma listesi şimdilik yalnız Modül G, B, E ve H1 için hazır');
  const veri = await denetimVerisi(baglam);
  const mevcutlar = new Map((baglam.denetim.uretilenBelgeler ?? []).map((u) => [u.sablonKodu, u]));

  ctx.faz('hazirlaniyor');
  const hazirlar = [];
  for (const kalem of aktifKalemler(baglam).filter((k) => k.tip === 'sablon' && k.hazir !== false)) {
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
      hazirlar.push({ kalem, ozet, docxBuffer: await sablonDoldur(yol, { ...kVeri }, baglam.firma, doldurmaSecenegi(baglam, kalem)) });
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

// Modul B: Tip Projeler alanında seçilebilen Certificate Annex formları
router.get('/annex-secenekleri', async (_req, res) => {
  try {
    res.json((await annexSecenekleri()).map(({ etiket }) => ({ etiket })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/yazdir', async (req, res) => {
  try {
    const baglam = await denetimYukle(req.params.id);
    if (!baglam) return res.status(404).json({ message: 'Denetim bulunamadı' });
    if (!yazdirModulu(baglam.denetim)) {
      return res.json({ sablonSeti: baglam.denetim.modul || '', kalemler: [], mesaj: 'Yazdırma listesi şimdilik yalnız Modül G, B, E ve H1 için hazır.' });
    }
    res.json({
      sablonSeti: YAZDIR_MODUL_ETIKETI[ceModulKodu(baglam.denetim.modul)],
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
    const baglam = await denetimYukle(req.params.id);
    if (!baglam) return res.status(404).json({ message: 'Denetim bulunamadı' });
    const kalem = uretilebilirKalem(baglam, req.params.kod);
    if (!kalem) return res.status(400).json({ message: 'Bu belge henüz yazdırılamıyor' });
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
    const baglam = await denetimYukle(req.params.id);
    const isId = isBaslat({
      tescilId: req.params.id,
      tip: 'toplu',
      ad: 'Tümünü Yazdır',
      kalemler: aktifKalemler(baglam).filter((k) => k.tip === 'sablon' && k.hazir !== false).map(({ kod, no, ad }) => ({ kod, no, ad })),
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

// ---- Tescil Yazdır'ın kullandığı risk analiz formu arayüzü ----
export const riskGrupAktif = (asansor, grup) => !!riskDurumu(asansor)[grup];

// { yol, veri, secenek }: şablon yolu, doldurulacak veri ve sablonDoldur seçenekleri.
// Şablon tescilin şablon setinden alınır (tescil-temp1/24.Risk Analiz Formu.docx)
export async function riskFormHazirla({ asansor, firma, tescil }, grup) {
  const t = await sablonVerisi({ tescil, firma, asansor });
  const taban = { ...t, as_firma_adresi: t.adres, montaj_adresi: t.montaj_adres, ...(await riskVerisi(asansor)) };
  const yayim = riskYayimTarihi({ _id: tescil._id, denetimTarihi: tescil.abUygunlukBeyaniTarihi ?? tescil.createdAt });
  return {
    yol: path.join(TEMPLATES_DIR, tescil.sablonSeti || 'tescil-temp1', '24.Risk Analiz Formu.docx'),
    veri: riskFormAlanlari(asansor, grup, taban, yayim),
    secenek: { cokluGorseller: { 'risk_analiz_resimlerİ': riskResimAnahtarlari(asansor, grup) }, xmlYama: riskXmlYama },
  };
}
