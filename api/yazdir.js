import express from 'express';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { Tescil } from './tescil.js';
import { AksamBelgesi } from './katalog.js';
import { buildObjectKey, putObject } from './storage.js';

// Tescil dosyası yazdırma servisi — artidoksan1 YEDEK/apps/server/src/belgeler
// altyapısının bu projeye portu. templates/<set>/ içindeki DOCX şablonları
// docxtemplater ile doldurulur, LibreOffice headless ile PDF'e çevrilir ve her
// ikisi R2'ye kaydedilir. Şablon olmayan kalemler (yüklü dosyalar, CE/aksam
// sertifikaları) mevcut kayıtlardan çözülür; liste GET ucu hepsini tek seferde
// döner, istemci Tümünü İndir için /api/zip-link'i kullanır.

const execFileAsync = promisify(execFile);
const KLASOR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || path.join(KLASOR, '..', 'templates');
const LIBREOFFICE_PATH = process.env.LIBREOFFICE_PATH || 'soffice';

// ---- Kalem listesi: Tescil Yazdır ekranındaki 36 satır (sıra = numara) ----
// tip 'dosya'  : kayıtlardaki yüklü belge slot(lar)ı
// tip 'ce'     : tescilde seçili CE belgeleri (25/26 — modüle göre değişken)
// tip 'aksam'  : asansörün güvenlik aksamı/motor katalog sertifikası
// tip 'sablon' : templates/<set>/ içindeki DOCX doldurulup üretilir
export const KALEMLER = [
  { no: 0, kod: 'yapi-ruhsati', ad: 'Yapı Ruhsatı', tip: 'dosya' },
  { no: 1, kod: 'icindekiler', ad: 'İçindekiler', tip: 'sablon', dosya: '0- İÇİNDEKİLER.docx' },
  { no: 2, kod: 'asansor-beyan', ad: 'Asansör Beyan', tip: 'sablon', dosya: '1- ASANSÖR BEYAN.docx' },
  { no: 3, kod: 'dilekce', ad: 'Dilekçe', tip: 'sablon', dosya: '2 - DİLEKÇE.docx' },
  { no: 4, kod: 'tescil-belgesi', ad: 'Tescil Belgesi', tip: 'sablon', dosya: '3 - TESCİL BELGESİ.docx' },
  { no: 5, kod: 'yesil-etiket', ad: 'Yeşil Etiket Raporu', tip: 'dosya' },
  { no: 6, kod: 'hyb', ad: 'HYB', tip: 'dosya' },
  // 7: seçili CE modülüne göre B/E veya G/H şablonu (sablonDosyasi fonksiyonu)
  { no: 7, kod: 'ab-uygunluk-beyani', ad: 'AB Uygunluk Beyanı', tip: 'sablon' },
  { no: 8, kod: 'sanayi-sicil', ad: 'Sanayi Sicil Belgesi', tip: 'dosya' },
  { no: 9, kod: 'garanti-belgesi', ad: 'Garanti Belgesi', tip: 'sablon', dosya: '9 - GARANTİ BELGESİ.docx' },
  { no: 10, kod: 'fatura', ad: 'Fatura', tip: 'dosya' },
  { no: 11, kod: 'buro-tescil', ad: 'Büro Tescil', tip: 'dosya' },
  { no: 12, kod: 'imza-sirkusu-elk', ad: 'İmza Sirküsü Elk Müh.', tip: 'dosya' },
  { no: 13, kod: 'imza-sirkusu-mak', ad: 'İmza Sirküsü Mak Müh.', tip: 'dosya' },
  { no: 14, kod: 'smm-elk', ad: 'SMM Elk Müh.', tip: 'dosya' },
  { no: 15, kod: 'smm-mak', ad: 'SMM Mak Müh.', tip: 'dosya' },
  { no: 16, kod: 'teslim-egitim-tutanagi', ad: 'Asansör Teslim Eğitim Tutanağı', tip: 'sablon', dosya: '13- ASANSÖR TESLİM EĞİTİM TUTANAĞI.docx' },
  { no: 17, kod: 'bakim-sozlesmesi', ad: 'Bakım Sözleşmesi', tip: 'sablon', dosya: '14 - BAKIM SÖZLEŞMESİ.docx' },
  { no: 18, kod: 'iso', ad: 'ISO Belgesi', tip: 'dosya' },
  { no: 19, kod: 'son-kontrol-formu', ad: 'Asansör Son Kontrol Form', tip: 'sablon', dosya: '16- ASANSÖR SON KONTROL FORMU.docx' },
  { no: 20, kod: 'ce-ekipman-listesi', ad: 'CE Ekipman Listesi', tip: 'sablon', dosya: '17- CE EKİPMAN LİSTESİ.docx' },
  { no: 21, kod: 'temel-ozellikler', ad: 'Asansörün Temel Özellikleri', tip: 'sablon', dosya: '20- ASANSÖRÜN TEMEL ÖZELLİKLERİ.docx' },
  { no: 22, kod: 'seyir-defteri', ad: 'Asansör Seyir Defteri', tip: 'sablon', dosya: '21- ASANSÖR SEYİR DEFTERİ.docx' },
  { no: 23, kod: 'proje-hizmet-sozlesmesi', ad: 'Proje Hizmet Sözleşmesi', tip: 'sablon', dosya: '22 - Proje Hizmet Sözleşmesi.docx' },
  { no: 24, kod: 'proje-muellif-onay', ad: 'Proje Müellif Onay', tip: 'sablon', dosya: '23- Proje Müellif Onayı.docx' },
  // 25/26: seçili CE belgeleri — ad modüle göre dinamik ("Modul G" vb.)
  { no: 25, kod: 'ce-1', ad: 'CE Belgesi', tip: 'ce', sira: 0 },
  { no: 26, kod: 'ce-2', ad: 'CE Belgesi', tip: 'ce', sira: 1 },
  { no: 27, kod: 'sert-hiz-reg', ad: 'Hız Reg Sertifika', tip: 'aksam', slotlar: ['hiz_regulatoru'] },
  { no: 28, kod: 'sert-kab-fren', ad: 'Kab Fren Sertifika', tip: 'aksam', slotlar: ['fren'] },
  { no: 29, kod: 'sert-kab-tampon', ad: 'Kab Tampon Sertifika', tip: 'aksam', slotlar: ['kabin_tamponu'] },
  { no: 30, kod: 'sert-kar-tampon', ad: 'Kar Tampon Sertifika', tip: 'aksam', slotlar: ['karsi_agirlik_tamponu'] },
  { no: 31, kod: 'sert-kart', ad: 'Kart Sertifika', tip: 'aksam', slotlar: ['kontrol_karti'] },
  { no: 32, kod: 'sert-d-kapi-kilit', ad: 'D Kapı Kilit Sertifika', tip: 'aksam', slotlar: ['durak_kapi_kilidi', 'durak_kapi_kilidi_2'] },
  { no: 33, kod: 'sert-k-kapi-kilit', ad: 'K Kapı Kilit Sertifika', tip: 'aksam', slotlar: ['kabin_kapi_kilidi', 'kabin_kapi_kilidi_2'] },
  { no: 34, kod: 'sert-motor', ad: 'Motor Sertifika', tip: 'aksam', motor: true },
  // Kullanıcı kararı: Makine = Motor ile aynı belge (tek sürüş ünitesi verisi)
  { no: 35, kod: 'sert-makine', ad: 'Makine Sertifika', tip: 'aksam', motor: true },
];

// ---- Yardımcılar (artidoksan1 templateData.js'ten port) ----
function bos(v) {
  return v === undefined || v === null ? '' : String(v);
}

function kelimeBasiBuyukHarfe(deger) {
  return deger
    .toLocaleLowerCase('tr-TR')
    .replace(/(^|\s)(\S)/gu, (_e, b, h) => b + h.toLocaleUpperCase('tr-TR'));
}

function adresSatiri(kayit) {
  const parca = (v) => (v ? kelimeBasiBuyukHarfe(v) : v);
  const ilceIl = [parca(kayit?.ilce), parca(kayit?.il)].filter(Boolean).join('/');
  return [parca(kayit?.mahalle), kayit?.adres, ilceIl].filter(Boolean).join(' ');
}

function tarihStr(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return bos(value);
  return d.toLocaleDateString('tr-TR');
}

// Yıllık belgelerde standart pratik: 08.09.2026 başlar → 07.09.2027 biter
function birYilSonraBirGunOnce(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const sonraki = new Date(d);
  sonraki.setFullYear(sonraki.getFullYear() + 1);
  sonraki.setDate(sonraki.getDate() - 1);
  return tarihStr(sonraki);
}

// "6.5mm(8x19 W-IWRC)" gibi birleşik halat tipinden baştaki çap
function halatCapMM(halatTipi) {
  if (!halatTipi) return '';
  const m = /^([\d.,]+)\s*mm/i.exec(halatTipi.trim());
  return m ? m[1] : halatTipi;
}

const TAHRIK_ETIKET = { elektrikli: 'Elektrikli', hidrolik: 'Hidrolik' };
const SINIF_ETIKET = { insan_ve_yuk: 'İnsan ve Yük', yuk: 'Yük' };
const MAKINA_KONUMU_ETIKET = { MR: 'Makine Daireli', MRL: 'Makine Dairesiz' };

// Asansör Yönetmeliği (2014/33/AB) modüllerinin AB Uygunluk Beyanı metinleri
const MODUL_METIN = {
  B: { annex: 'Annex IX', name: 'AB Tip İncelemesi', nameEn: 'EU-Type Examination' },
  E: { annex: 'Annex X', name: 'Ürün Kalite Güvencesi', nameEn: 'Product Quality Assurance' },
  G: { annex: 'Annex VIII', name: 'Birim Doğrulaması', nameEn: 'Unit Verification' },
  H1: { annex: 'Annex XII', name: 'Tam Kalite Güvencesi + Tasarım İncelemesi', nameEn: 'Full Quality Assurance plus Design Examination' },
};

// CeBelgesi.modul serbest metindir ("Modul G", "Modül H1"...) — kod ayıklanır
function ceModulKodu(modul) {
  const m = /H1|H|B|E|G/i.exec(bos(modul).toLocaleUpperCase('tr-TR'));
  if (!m) return '';
  return m[0] === 'H' ? 'H1' : m[0];
}

// ---- Veri toplama ----
async function tescilYukle(id) {
  const tescil = await Tescil.findById(id);
  if (!tescil) return null;
  const Firma = mongoose.model('Firma');
  const Asansor = mongoose.model('Asansor');
  const [firma, asansor] = await Promise.all([
    tescil.firmaId ? Firma.findById(tescil.firmaId) : null,
    tescil.asansorId ? Asansor.findById(tescil.asansorId) : null,
  ]);
  return { tescil, firma, asansor };
}

function secilenCeler(tescil, firma) {
  const idler = (tescil.ceBelgeIdleri ?? []).map(String);
  return (firma?.ceBelgeleri ?? []).filter((ce) => ce._id && idler.includes(String(ce._id)));
}

// guvenlikAksamlari satırlarından slot grubu: marka/tip ilk satırdan,
// seri numaraları virgülle birleştirilir (uygulamadaki panellerle aynı kural)
function aksamGrubu(asansor, slotlar) {
  const satirlar = (asansor?.guvenlikAksamlari ?? []).filter((s) => slotlar.includes(s.slot));
  if (!satirlar.length) return null;
  const ilk = satirlar[0];
  const seriNolar = [...new Set(satirlar.map((s) => bos(s.seriNo)).filter(Boolean))];
  return {
    marka: bos(ilk.markaSnapshot),
    tip: bos(ilk.tip),
    seriNo: seriNolar.join(', '),
    sertifikaNo: bos(ilk.sertifikaNo),
    nobo: bos(ilk.onayliKurumNobo),
    belgeIdler: [...new Set(satirlar.map((s) => s.aksamBelgesiId && String(s.aksamBelgesiId)).filter(Boolean))],
  };
}

// Kalemlerde geçen tüm katalog belgeleri tek sorguda çekilir
async function katalogHaritasi(asansor) {
  const idler = new Set();
  for (const k of KALEMLER) {
    if (k.tip !== 'aksam') continue;
    if (k.motor) {
      if (asansor?.motorAksamBelgesiId) idler.add(String(asansor.motorAksamBelgesiId));
    } else {
      for (const id of aksamGrubu(asansor, k.slotlar)?.belgeIdler ?? []) idler.add(id);
    }
  }
  if (!idler.size) return new Map();
  const belgeler = await AksamBelgesi.find({ _id: { $in: [...idler] } }).lean();
  return new Map(belgeler.map((b) => [String(b._id), b]));
}

// ---- Şablon verisi: tüm şablonların token birleşimi tek objede üretilir.
// docxtemplater nullGetter '' döndürdüğünden fazladan anahtar sorun olmaz,
// eksik anahtar da "undefined" basmaz. ----
async function sablonVerisi({ tescil, firma, asansor }) {
  const kapasiteKg = asansor?.beyanYuku != null && asansor?.beyanYuku !== '' ? `${asansor.beyanYuku}` : '';
  const celer = secilenCeler(tescil, firma);
  // Ana CE: asansörün kendi modülü (B dışındaki ilk seçim; yoksa ilk seçim)
  const anaCe = celer.find((ce) => ceModulKodu(ce.modul) !== 'B') ?? celer[0] ?? null;
  const bCe = celer.find((ce) => ceModulKodu(ce.modul) === 'B') ?? null;
  const anaModul = anaCe ? ceModulKodu(anaCe.modul) : '';
  const modulMetin = MODUL_METIN[anaModul] ?? { annex: '', name: '', nameEn: '' };

  const hizReg = aksamGrubu(asansor, ['hiz_regulatoru']);
  const fren = aksamGrubu(asansor, ['fren']);
  const kabTamp = aksamGrubu(asansor, ['kabin_tamponu']);
  const karTamp = aksamGrubu(asansor, ['karsi_agirlik_tamponu']);
  const kart = aksamGrubu(asansor, ['kontrol_karti']);
  const dKapi = aksamGrubu(asansor, ['durak_kapi_kilidi', 'durak_kapi_kilidi_2']);
  const kKapi = aksamGrubu(asansor, ['kabin_kapi_kilidi', 'kabin_kapi_kilidi_2']);

  // Motor sertifika no/nobo katalogdan (satır snapshot'ı yok)
  const motorBelge = asansor?.motorAksamBelgesiId
    ? await AksamBelgesi.findById(asansor.motorAksamBelgesiId).select('sertifikaNo onayliKurumNobo').lean()
    : null;

  const aksamTaglari = (onEk, grup) => ({
    [`${onEk}_marka`]: grup?.marka ?? '',
    [`${onEk}_tip`]: grup?.tip ?? '',
    [`${onEk}_serino`]: grup?.seriNo ?? '',
    [`${onEk}_seri_no`]: grup?.seriNo ?? '',
    [`${onEk}_cert_no`]: grup?.sertifikaNo ?? '',
    [`${onEk}_nobo`]: grup?.nobo ?? '',
  });

  // SMM bilgileri asansör kaydına seçim anında kopyalanır — asansör öncelikli
  const smm = (alan) => bos(asansor?.[alan] || firma?.[alan]);

  return {
    // Firma
    unvan: bos(firma?.unvan || firma?.ad),
    kisa_ad: bos(firma?.ad),
    telefon: bos(firma?.telefon),
    adres: adresSatiri(firma),
    sirket_muduru: bos(firma?.personel?.genelMudur || firma?.yetkili),
    sanayi_sicil_no: bos(firma?.sanayiSicilBelgeNo),
    sanayi_sicil_tarih: tarihStr(firma?.sanayiSicilBelgeTarihi),
    hyb_tarih: tarihStr(firma?.hybIlkVerilis),
    hyb_tarih_1yil: tarihStr(firma?.hybGecerlilik),
    // SMM / mühendisler
    smm_firma_unvan: smm('smmUnvan'),
    smm_firma_adres: smm('smmAdres'),
    elk_muh_name: smm('smmElkMuhAdSoyad'),
    elk_muh_sicilno: smm('smmElkMuhOdaSicilNo'),
    elk_muh_telefon: smm('smmElkMuhTelefon'),
    mak_muh_name: smm('smmMakMuhAdSoyad'),
    mak_muh_sicilno: smm('smmMakMuhOdaSicilNo'),
    mak_muh_telefon: smm('smmMakMuhTelefon'),
    // Asansör
    as_seri_no: bos(asansor?.seriNo),
    as_adres: adresSatiri(asansor),
    montaj_adres: adresSatiri(asansor),
    ada: bos(asansor?.ada),
    parsel: bos(asansor?.parsel),
    yapi_sahibi: bos(asansor?.yapiSahibiAdi),
    imal_yili: bos(asansor?.montajYili),
    durak_sayisi: bos(asansor?.durakSayisi),
    kisi_sayisi: bos(asansor?.kisiSayisi),
    kapasite: kapasiteKg,
    hiz: bos(asansor?.hiz),
    sinif: asansor?.sinif ? SINIF_ETIKET[asansor.sinif] ?? asansor.sinif : '',
    tahrik_tip: asansor?.tahrikTipi ? TAHRIK_ETIKET[asansor.tahrikTipi] ?? asansor.tahrikTipi : '',
    aski_oran: bos(asansor?.askiTipi),
    seyir_mesafesi: bos(asansor?.seyirMesafesi),
    mak_dairesi: asansor?.makinaKonumu
      ? MAKINA_KONUMU_ETIKET[asansor.makinaKonumu] ?? asansor.makinaKonumu
      : '',
    halat_adet: bos(asansor?.halatAdet),
    halat_mm: halatCapMM(asansor?.halatTipi),
    kab_gen: bos(asansor?.kabinGenislik),
    kab_der: bos(asansor?.kabinDerinlik),
    kuyu_gen: bos(asansor?.kuyuGenislik),
    kuyu_der: bos(asansor?.kuyuDerinlik),
    kapi_gen: bos(asansor?.giris1KapiGenislik),
    kab_ray_tip: bos(asansor?.kabinRayTipi),
    kar_ray_tip: bos(asansor?.karsiAgirlikRayTipi),
    kabin_agirlik: bos(asansor?.kabinAgirligi),
    karsi_agirlik: bos(asansor?.karsiAgirlik),
    // Motor / Makine — tek sürüş ünitesi verisi, iki tag grubu aynı kaynaktan
    motor_marka: bos(asansor?.motorMarkaSnapshot),
    motor_tip: bos(asansor?.motorTip),
    motor_serino: bos(asansor?.motorSeriNo),
    motor_seri_no: bos(asansor?.motorSeriNo),
    motor_kw: bos(asansor?.motorGucKw),
    motor_rpm: bos(asansor?.motorRpm),
    motor_cert_no: bos(motorBelge?.sertifikaNo),
    motor_nobo: bos(motorBelge?.onayliKurumNobo),
    makine_marka: bos(asansor?.motorMarkaSnapshot),
    makine_tip: bos(asansor?.motorTip),
    makine_serino: bos(asansor?.motorSeriNo),
    // Güvenlik aksamları
    ...aksamTaglari('hiz_reg', hizReg),
    ...aksamTaglari('kab_fren', fren),
    ...aksamTaglari('kab_tamp', kabTamp),
    ...aksamTaglari('kar_tamp', karTamp),
    ...aksamTaglari('kart', kart),
    ...aksamTaglari('d_kapi', dKapi),
    ...aksamTaglari('k_kapi', kKapi),
    // Tescil tarihleri / alanları
    belediye: bos(tescil.belediyeAdi),
    basv_tarih: tarihStr(tescil.dilekceTarihi),
    ab_uyg_tarih: tarihStr(tescil.abUygunlukBeyaniTarihi),
    ab_uyg_tarih_1yil: birYilSonraBirGunOnce(tescil.abUygunlukBeyaniTarihi),
    son_kon_tarih: tarihStr(tescil.sonKontrolTarihi),
    garanti_tarih: tarihStr(tescil.garantiTarihi),
    fatura_no: bos(tescil.faturaNo),
    fatura_tarih: tarihStr(tescil.faturaTarihi),
    pro_hizmet_soz_tarih: tarihStr(tescil.projeHizmetSozlesmeTarihi),
    // CE (ana belge + varsa Modül B referansı; NoBo no/adres CE kaydında
    // tutulmadığından boş kalır)
    ce_belge_no: bos(anaCe?.belgeNo),
    ce_kurum: bos(anaCe?.kurum),
    ce_tarih: tarihStr(anaCe?.gecerlilikTarihi),
    ce_nobo: '',
    ce_adres: '',
    ce_belge_no_b: bos(bCe?.belgeNo),
    ce_kurum_b: bos(bCe?.kurum),
    ce_nobo_b: '',
    ce_adres_b: '',
    mod_ul: anaModul,
    modul_annex: modulMetin.annex,
    modul_name: modulMetin.name,
    modul_name_en: modulMetin.nameEn,
  };
}

// 7-AB Uygunluk Beyanı: seçili CE'lerde G/H1 varsa 7.1 şablonu, yoksa B/E
function abBeyaniSablonu(tescil, firma) {
  const kodlar = secilenCeler(tescil, firma).map((ce) => ceModulKodu(ce.modul));
  return kodlar.includes('G') || kodlar.includes('H1')
    ? '7.1-AB UYGUNLUK BEYANI G VE H.docx'
    : '7-AB UYGUNLUK BEYANI B VE E.docx';
}

// ---- DOCX doldurma + PDF çevirme ----
async function convertDocxToPdf(docxBuffer) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yazdir-'));
  const docxPath = path.join(tmpDir, 'belge.docx');
  try {
    await fs.writeFile(docxPath, docxBuffer);
    await execFileAsync(
      LIBREOFFICE_PATH,
      ['--headless', '--convert-to', 'pdf', '--outdir', tmpDir, docxPath],
      { timeout: 120_000 }
    );
    return await fs.readFile(path.join(tmpDir, 'belge.pdf'));
  } catch (err) {
    const hata = new Error(
      `PDF dönüşümü başarısız — sunucuda LibreOffice kurulu olmalı (LIBREOFFICE_PATH): ${err.message}`
    );
    hata.status = 500;
    throw hata;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function sablonDoldur(sablonYolu, veri) {
  const zip = new PizZip(await fs.readFile(sablonYolu));
  const tpl = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Eksik tag "undefined" yerine boş basılır (artidoksan1'de canlı
    // doğrulanan hatanın önlemi)
    nullGetter: () => '',
  });
  tpl.render(veri);
  return tpl.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function slotOlustur(key, dosyaAdi, mimeType, boyut) {
  return { dosyaAdi, dosyaAnahtari: key, mimeType, boyut, yuklenmeTarihi: new Date() };
}

// ---- Kalem çözümü (liste ucu) ----
function dosyaKalemi(kod, { tescil, firma, asansor }) {
  const tekil = (slot) => (slot ? [slot] : []);
  switch (kod) {
    case 'yapi-ruhsati': return tekil(asansor?.yapiRuhsatiDosya);
    case 'yesil-etiket': return tekil(tescil.yesilEtiketRaporu);
    case 'hyb': return tekil(firma?.hybDosya);
    case 'sanayi-sicil': return tekil(firma?.sanayiSicilDosya);
    case 'fatura': return tescil.faturalar ?? [];
    case 'buro-tescil': return tekil(asansor?.smmBuroTescilBelgesi || firma?.smmBuroTescilBelgesi);
    case 'imza-sirkusu-elk': return tekil(asansor?.smmElkMuhImzaSirkusu || firma?.smmElkMuhImzaSirkusu);
    case 'imza-sirkusu-mak': return tekil(asansor?.smmMakMuhImzaSirkusu || firma?.smmMakMuhImzaSirkusu);
    case 'smm-elk': return tekil(asansor?.smmElkMuhSmmBelgesi || firma?.smmElkMuhSmmBelgesi);
    case 'smm-mak': return tekil(asansor?.smmMakMuhSmmBelgesi || firma?.smmMakMuhSmmBelgesi);
    default: return [];
  }
}

async function kalemListesi(baglam) {
  const { tescil, firma, asansor } = baglam;
  const katalog = await katalogHaritasi(asansor);
  const celer = secilenCeler(tescil, firma);
  const uretilenler = new Map((tescil.uretilenBelgeler ?? []).map((u) => [u.sablonKodu, u]));

  return KALEMLER.map((kalem) => {
    const satir = { no: kalem.no, kod: kalem.kod, ad: kalem.ad, tip: kalem.tip };
    if (kalem.tip === 'sablon') {
      const u = uretilenler.get(kalem.kod);
      satir.uretilen = u
        ? { docx: u.docx, pdf: u.pdf, uretimTarihi: u.uretimTarihi }
        : null;
    } else if (kalem.tip === 'ce') {
      const ce = celer[kalem.sira];
      if (ce) {
        satir.ad = ce.modul || kalem.ad;
        satir.dosyalar = ce.dosya ? [ce.dosya] : [];
        satir.altBilgi = [ce.belgeNo, ce.kurum].filter(Boolean).join(' • ');
      } else {
        satir.dosyalar = [];
      }
    } else if (kalem.tip === 'aksam') {
      const dosyalar = [];
      let altBilgi = '';
      if (kalem.motor) {
        const belge = asansor?.motorAksamBelgesiId && katalog.get(String(asansor.motorAksamBelgesiId));
        if (belge?.dosya) dosyalar.push(belge.dosya);
        altBilgi = [asansor?.motorMarkaSnapshot, asansor?.motorTip].filter(Boolean).join(' — ');
      } else {
        const grup = aksamGrubu(asansor, kalem.slotlar);
        for (const id of grup?.belgeIdler ?? []) {
          const belge = katalog.get(id);
          if (belge?.dosya) dosyalar.push(belge.dosya);
        }
        if (grup) altBilgi = [grup.marka, grup.tip].filter(Boolean).join(' — ');
      }
      // Aynı belge birden fazla satırdan gelebilir — anahtarına göre teke indir
      satir.dosyalar = [...new Map(dosyalar.map((d) => [d.dosyaAnahtari, d])).values()];
      if (altBilgi) satir.altBilgi = altBilgi;
    } else {
      satir.dosyalar = dosyaKalemi(kalem.kod, baglam);
    }
    return satir;
  });
}

// ---- Rotalar (/api/tesciller altına monte edilir) ----
const router = express.Router();

router.get('/:id/yazdir', async (req, res) => {
  try {
    const baglam = await tescilYukle(req.params.id);
    if (!baglam) return res.status(404).json({ message: 'Tescil bulunamadı' });
    res.json({
      sablonSeti: baglam.tescil.sablonSeti || 'tescil-temp1',
      kalemler: await kalemListesi(baglam),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/yazdir/:kod', async (req, res) => {
  try {
    const kalem = KALEMLER.find((k) => k.kod === req.params.kod && k.tip === 'sablon');
    if (!kalem) return res.status(400).json({ message: 'Bilinmeyen şablon kodu' });
    const baglam = await tescilYukle(req.params.id);
    if (!baglam) return res.status(404).json({ message: 'Tescil bulunamadı' });
    const { tescil, firma } = baglam;

    const set = tescil.sablonSeti || 'tescil-temp1';
    const dosyaAdi = kalem.dosya ?? abBeyaniSablonu(tescil, firma);
    const sablonYolu = path.join(TEMPLATES_DIR, set, dosyaAdi);
    await fs.access(sablonYolu).catch(() => {
      const hata = new Error(`Şablon dosyası bulunamadı: ${set}/${dosyaAdi}`);
      hata.status = 500;
      throw hata;
    });

    const veri = await sablonVerisi(baglam);
    const docxBuffer = await sablonDoldur(sablonYolu, veri);
    const pdfBuffer = await convertDocxToPdf(docxBuffer);

    const taban = `${String(kalem.no).padStart(2, '0')}-${kalem.ad}`;
    const docxKey = buildObjectKey('tesciller', `${taban}.docx`);
    const pdfKey = buildObjectKey('tesciller', `${taban}.pdf`);
    await Promise.all([
      putObject(docxKey, docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      putObject(pdfKey, pdfBuffer, 'application/pdf'),
    ]);

    const kayit = {
      sablonKodu: kalem.kod,
      sablonAdi: kalem.ad,
      docx: slotOlustur(docxKey, `${taban}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', docxBuffer.length),
      pdf: slotOlustur(pdfKey, `${taban}.pdf`, 'application/pdf', pdfBuffer.length),
      uretimTarihi: new Date(),
    };
    // Atomik güncelleme — eşzamanlı üretimlerde (Tümünü Yazdır, iki cihaz)
    // doc.save() sürüm çakışması verir, $pull+$push vermez
    await Tescil.updateOne(
      { _id: tescil._id },
      { $pull: { uretilenBelgeler: { sablonKodu: kalem.kod } } }
    );
    await Tescil.updateOne({ _id: tescil._id }, { $push: { uretilenBelgeler: kayit } });
    res.json(kayit);
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

export default router;
