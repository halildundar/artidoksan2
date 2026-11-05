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
  TEMPLATES_DIR, DOCX_MIME,
} from './yazdir.js';

// Denetim > Yazdır: Modül G dosya listesi. Tescil Yazdır'ın altyapısı
// (kuyruk, iki aşamalı toplu üretim, kaynak özeti ile atlama, ilerleme
// paneli) aynen kullanılır; kalem listesi ve şablon verisi denetime özgüdür.
// Şablonlar: templates/tuv-temp1 (TÜV formları) ve templates/ce-td-temp1
// (CE teknik dosya). `hazir: false` olan şablonların alan eşlemesi sonraki
// adımda eklenecek (listede görünür, yazdırılamaz).
const TUV = 'tuv-temp1';
const CE = 'ce-td-temp1';

export const DENETIM_G_KALEMLERI = [
  { no: '1', kod: 'application-form', ad: 'Application Form', tip: 'sablon', klasor: TUV, dosya: '1.APPLICATION FROM.docx' },
  { no: '2', kod: 'building-permit', ad: 'Building Permit', tip: 'dosya' },
  { no: '3', kod: 'checklist', ad: 'Checklist', tip: 'sablon', klasor: TUV, dosya: '3.CHECKLIST.docx', hazir: false },
  { no: '4', kod: 'inspection-report', ad: 'Elevator Inspectation Report', tip: 'sablon', klasor: TUV, dosya: '4.ELEVATOR INSPECTION REPORT.docx' },
  { no: '5', kod: 'calculations', ad: 'Calculations and Constructions', tip: 'dosya' },
  { no: '6', kod: 'declaration', ad: 'Declaration of Confirmity', tip: 'sablon', klasor: CE, dosya: '6.Declaration of Confirmity.docx' },
  { no: '7', kod: 'photo', ad: 'Photo', tip: 'sablon', klasor: CE, dosya: '7.Photo.docx' },
  { no: '8', kod: 'technical-descriptions', ad: 'Technical Descriptions and Manuals', tip: 'sablon', klasor: CE, dosya: '8.Technical Descriptions and Manuals.docx', hazir: false },
  { no: '9.1', kod: 'project-service-contract', ad: 'Project Service Contract', tip: 'dosya', altBilgi: 'SMM firması belgeleri' },
  { no: '9.2', kod: 'engineers-competency', ad: 'Engineers Competency Certificates', tip: 'dosya' },
  { no: '9.3', kod: 'type-projects', ad: 'Type Projects Calculations and Constructions', tip: 'dosya' },
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
  { no: '13', kod: 'sample-table', ad: 'SAMPLE TABLE. NEEDED DETAILS FOR CERTIFICATION', tip: 'sablon', klasor: CE, dosya: '13.Sample Table,Needed Details For Certification.docx', hazir: false },
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
async function denetimVerisi({ denetim, firma, asansor, denetci }) {
  const sahteTescil = {
    abUygunlukBeyaniTarihi: denetim.abUygunlukBeyaniTarihi,
    sonKontrolTarihi: denetim.sonKontrolTarihi,
    ceBelgeIdleri: [],
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

const sablonYolu = (kalem) => path.join(TEMPLATES_DIR, kalem.klasor, kalem.dosya);

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
    // 9.1: asansörün SMM firması alanından yüklenen proje firması belgesi (büro tescil)
    case 'project-service-contract': return tekil(asansor?.smmBuroTescilBelgesi || firma?.smmBuroTescilBelgesi);
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
      ozetler.set(k.kod, await kaynakOzeti(sablonYolu(k), veri, baglam.firma));
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
  const yol = sablonYolu(kalem);
  await fs.access(yol).catch(() => { throw new Error(`Şablon dosyası bulunamadı: ${kalem.klasor}/${kalem.dosya}`); });
  const veri = await denetimVerisi(baglam);
  const ozet = await kaynakOzeti(yol, veri, baglam.firma);
  const mevcut = (baglam.denetim.uretilenBelgeler ?? []).find((u) => u.sablonKodu === kod);
  if (!zorla && mevcut?.kaynakOzeti === ozet && mevcut.docx?.dosyaAnahtari && mevcut.pdf?.dosyaAnahtari) {
    return { durum: 'guncel' };
  }
  ctx.faz('hazirlaniyor');
  const docxBuffer = await sablonDoldur(yol, veri, baglam.firma);
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
      const yol = sablonYolu(kalem);
      await fs.access(yol).catch(() => { throw new Error(`Şablon dosyası bulunamadı: ${kalem.klasor}/${kalem.dosya}`); });
      const ozet = await kaynakOzeti(yol, veri, baglam.firma);
      const mevcut = mevcutlar.get(kalem.kod);
      if (mevcut?.kaynakOzeti === ozet && mevcut.docx?.dosyaAnahtari && mevcut.pdf?.dosyaAnahtari) {
        ctx.durum(kalem.kod, 'guncel');
        continue;
      }
      hazirlar.push({ kalem, ozet, docxBuffer: await sablonDoldur(yol, { ...veri }, baglam.firma) });
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
    res.json({ sablonSeti: 'Modül G', kalemler: await kalemListesi(baglam) });
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
