import express from 'express';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import os from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import { imageSize } from 'image-size';
import { Tescil } from './tescil.js';
import { AksamBelgesi } from './katalog.js';
import { buildObjectKey, putObject, getObjectBuffer, deleteObject } from './storage.js';
import { sablonGorselYerlesimHazirla, sablonGorselDondur } from './gorselYerlesim.js';
import { isBaslat, aktifTopluIs, tescildeAktifIsVar, isIptal, tescilIsleri } from './yazdirKuyruk.js';

// Tescil dosyası yazdırma servisi — artidoksan1 YEDEK/apps/server/src/belgeler
// altyapısının bu projeye portu. templates/<set>/ içindeki DOCX şablonları
// docxtemplater ile doldurulur, LibreOffice headless ile PDF'e çevrilir ve her
// ikisi R2'ye kaydedilir. Şablon olmayan kalemler (yüklü dosyalar, CE/aksam
// sertifikaları) mevcut kayıtlardan çözülür; liste GET ucu hepsini tek seferde
// döner, istemci Tümünü İndir için /api/zip-link'i kullanır.

const execFileAsync = promisify(execFile);
const KLASOR = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = process.env.TEMPLATES_DIR || path.join(KLASOR, '..', 'templates');
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
  // 36-38: Risk Analiz Formu (ce-td-temp1 şablonu) — yalnız asansörde o risk analizi gerekiyorsa
  // listelenir ve yazdırılır (kuyu dibi / kuyu üstü / makine dairesi)
  { no: 36, kod: 'risk-analiz-dip', ad: 'Risk Analiz Formu - Kuyu Dibi', tip: 'sablon', riskGrup: 'dip' },
  { no: 37, kod: 'risk-analiz-ust', ad: 'Risk Analiz Formu - Kuyu Üstü', tip: 'sablon', riskGrup: 'ust' },
  { no: 38, kod: 'risk-analiz-makine', ad: 'Risk Analiz Formu - Makine Dairesi', tip: 'sablon', riskGrup: 'makine' },
];

// Risk formu kalemi, asansörde o risk analizi gerekiyorsa etkindir (diğer kalemler her zaman)
async function kalemEtkinMi(kalem, { asansor }) {
  if (!kalem.riskGrup) return true;
  const { riskGrupAktif } = await import('./denetimYazdir.js');
  return riskGrupAktif(asansor, kalem.riskGrup);
}
const etkinKalemler = async (baglam, filtre = () => true) => {
  const sonuc = [];
  for (const k of KALEMLER) if (filtre(k) && (await kalemEtkinMi(k, baglam))) sonuc.push(k);
  return sonuc;
};

// Şablon kalemi için yol + veri + sablonDoldur seçenekleri (risk formu ortak ce şablonunu kullanır)
async function kalemHazirla(kalem, baglam, veri) {
  if (kalem.riskGrup) {
    const { riskFormHazirla } = await import('./denetimYazdir.js');
    return riskFormHazirla(baglam, kalem.riskGrup);
  }
  return { yol: sablonYolu(baglam.tescil, baglam.firma, kalem), veri, secenek: undefined };
}

// ---- Yardımcılar (artidoksan1 templateData.js'ten port) ----
export function bos(v) {
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

export function tarihStr(value) {
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
export const MAKINA_KONUMU_ETIKET = { MR: 'Makine Daireli', MRL: 'Makine Dairesiz' };

// Asansör Yönetmeliği (2014/33/AB) modüllerinin AB Uygunluk Beyanı metinleri
export const MODUL_METIN = {
  B: { annex: 'Annex IX', name: 'AB Tip İncelemesi', nameEn: 'EU-Type Examination' },
  E: { annex: 'Annex X', name: 'Ürün Kalite Güvencesi', nameEn: 'Product Quality Assurance' },
  G: { annex: 'Annex VIII', name: 'Birim Doğrulaması', nameEn: 'Unit Verification' },
  H1: { annex: 'Annex XII', name: 'Tam Kalite Güvencesi + Tasarım İncelemesi', nameEn: 'Full Quality Assurance plus Design Examination' },
};

// CeBelgesi.modul serbest metindir ("Modul G", "Modül H1"...) — kod ayıklanır
export function ceModulKodu(modul) {
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
export function aksamGrubu(asansor, slotlar) {
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
// CE belgesinde kurum yalnız unvan olarak tutulur; NoBo no ve adres
// onaylikurumlar koleksiyonundan unvana göre bulunur (boşluk/büyük-küçük harf
// ve Türkçe i/İ farkı yok sayılır)
const kurumAnahtari = (u) => String(u ?? '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');

async function onayliKurumBul(unvan) {
  const anahtar = kurumAnahtari(unvan);
  if (!anahtar) return null;
  const kurumlar = await mongoose.connection.db
    .collection('onaylikurumlar')
    .find({}, { projection: { nobo: 1, unvan: 1, adres: 1 } })
    .toArray();
  return kurumlar.find((k) => kurumAnahtari(k.unvan) === anahtar) ?? null;
}

export async function sablonVerisi({ tescil, firma, asansor }) {
  const kapasiteKg = asansor?.beyanYuku != null && asansor?.beyanYuku !== '' ? `${asansor.beyanYuku}` : '';
  const celer = secilenCeler(tescil, firma);
  // Ana CE: asansörün kendi modülü (B dışındaki ilk seçim; yoksa ilk seçim)
  const anaCe = celer.find((ce) => ceModulKodu(ce.modul) !== 'B') ?? celer[0] ?? null;
  const bCe = celer.find((ce) => ceModulKodu(ce.modul) === 'B') ?? null;
  const abTarih = tescil.abUygunlukBeyaniTarihi || asansor?.abUygunlukBeyaniTarihi || null;
  const anaModul = anaCe ? ceModulKodu(anaCe.modul) : '';
  const [anaKurum, bKurum] = await Promise.all([onayliKurumBul(anaCe?.kurum), onayliKurumBul(bCe?.kurum)]);
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
    yapi_belge_no: bos(asansor?.yapiRuhsatNo),
    muteahhit_firma: bos(asansor?.yapiMuteahhidi),
    imal_yili: bos(asansor?.montajYili),
    durak_sayisi: bos(asansor?.durakSayisi),
    kisi_sayisi: bos(asansor?.kisiSayisi),
    kapasite: kapasiteKg,
    hiz: bos(asansor?.hiz),
    sinif: asansor?.sinif ? SINIF_ETIKET[asansor.sinif] ?? asansor.sinif : '',
    // Tahrik/asansör tipi girilmemişse (varsayılan) Elektrikli basılır
    tahrik_tip: asansor?.tahrikTipi ? TAHRIK_ETIKET[asansor.tahrikTipi] ?? asansor.tahrikTipi : 'Elektrikli',
    aski_oran: bos(asansor?.askiTipi),
    seyir_mesafesi: bos(asansor?.seyirMesafesi),
    mak_dairesi: asansor?.makinaKonumu
      ? MAKINA_KONUMU_ETIKET[asansor.makinaKonumu] ?? asansor.makinaKonumu
      : '',
    // "Asansörün Tipi" satırı: hidrolikse Hidrolik, değilse makine konumu
    asansor_tipi:
      asansor?.tahrikTipi === 'hidrolik'
        ? 'Hidrolik'
        : asansor?.makinaKonumu === 'MR'
          ? 'Makine Daireli (MR)'
          : asansor?.makinaKonumu === 'MRL'
            ? 'Makine Dairesiz (MRL)'
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
    // AB beyan tarihi tescilde yoksa asansör kaydındakine düşülür
    ab_uyg_tarih: tarihStr(abTarih),
    ab_uyg_tarih_1yil: birYilSonraBirGunOnce(abTarih),
    son_kon_tarih: tarihStr(tescil.sonKontrolTarihi),
    garanti_tarih: tarihStr(tescil.garantiTarihi),
    fatura_no: bos(tescil.faturaNo),
    fatura_tarih: tarihStr(tescil.faturaTarihi),
    pro_hizmet_soz_tarih: tarihStr(tescil.projeHizmetSozlesmeTarihi),
    // CE (ana belge + varsa Modül B referansı); NoBo no/adres onaylı kurum
    // kaydından gelir
    ce_belge_no: bos(anaCe?.belgeNo),
    ce_kurum: bos(anaCe?.kurum),
    ce_tarih: tarihStr(anaCe?.gecerlilikTarihi),
    ce_nobo: bos(anaKurum?.nobo),
    ce_adres: bos(anaKurum?.adres),
    ce_belge_no_b: bos(bCe?.belgeNo),
    ce_kurum_b: bos(bCe?.kurum),
    ce_nobo_b: bos(bKurum?.nobo),
    ce_adres_b: bos(bKurum?.adres),
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
export async function convertDocxToPdf(docxBuffer, slot = 0) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yazdir-'));
  const docxPath = path.join(tmpDir, 'belge.docx');
  // Her kuyruk slotunun KENDİ kalıcı LibreOffice profili vardır: slotlar
  // birbirini kilitlemez, ilk çevirmeden sonra profil ısınır (başlangıç hızlanır)
  const profilUrl = pathToFileURL(path.join(os.tmpdir(), `yazdir-lo-profil-${slot}`)).href;
  try {
    await fs.writeFile(docxPath, docxBuffer);
    await execFileAsync(
      LIBREOFFICE_PATH,
      [
        `-env:UserInstallation=${profilUrl}`,
        '--headless', '--norestore', '--nolockcheck', '--nofirststartwizard', '--nodefault', '--nologo',
        '--convert-to', 'pdf', '--outdir', tmpDir, docxPath,
      ],
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

// ---- Görsel tag'leri ({%firma_logo} vb.): değer firma kaydındaki görsel
// dosyasının buffer'ıdır; kutu boyutu şablondan okunur (gorselYerlesim.js),
// görsel kutuya contain-fit ölçeklenir (artidoksan1 portu) ----
const VARSAYILAN_HEDEF_GENISLIK_PX = 200;
const VARSAYILAN_HEDEF_YUKSEKLIK_PX = 100;

// Desteklenen görsel tag adları → firma.belgeler alanı ({%logo} ve
// {%firma_logo} aynı kaynağı gösterir — şablon hazırlayan hangisini
// yazarsa yazsın çalışır)
const GORSEL_TAG_KAYNAKLARI = {
  logo: 'logo',
  firma_logo: 'logo',
  imza_kase: 'imzaKase',
  firma_imza_kase: 'imzaKase',
  // Denetim belgeleri: denetçinin imza-kaşesi (denetimYazdir.js firma.belgeler'e ekler)
  denetci_imza: 'denetciImza',
  denci_imza_kase: 'denetciImza', // 3.CHECKLIST şablonundaki yazım
  denetci_imza_kase: 'denetciImza',
};

function createImageModule(gorselKutuBoyutlari = {}) {
  return new ImageModule({
    getImage: (tagValue) => tagValue,
    // Kutu boyutu koddan asla büyütülmez — görsel kutunun genişlik VE
    // yüksekliğine sığacak şekilde (iki oranın küçüğü) ölçeklenir
    getSize: (buf, _value, tagName) => {
      const { width, height } = imageSize(buf);
      const [hedefGenislik, hedefYukseklik] =
        gorselKutuBoyutlari[tagName] ?? [VARSAYILAN_HEDEF_GENISLIK_PX, VARSAYILAN_HEDEF_YUKSEKLIK_PX];
      const oran = Math.min(hedefGenislik / width, hedefYukseklik / height);
      return [Math.round(width * oran), Math.round(height * oran)];
    },
  });
}

// Word tag'leri birden fazla run'a bölebildiğinden tag adı XML'de düz
// indexOf ile bulunamayabilir — tüm <w:t> içerikleri birleştirilip aranır
function duzMetinIcerir(xml, aranan) {
  let duz = '';
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m;
  while ((m = re.exec(xml))) duz += m[1];
  return duz.includes(aranan);
}

// ---- Üstbilgi/altbilgi görselleri: docxtemplater'ın görsel modülü header
// parçalarındaki metin kutularını güvenilir işlemiyor (canlı doğrulanan
// hata: etiket tüketiliyor, resim basılmıyor) — bu parçalarda {%tag}
// run'ı, resim + ilişki + medya dosyası zip'e elle yazılarak değiştirilir ----
function sonAcilisIndeksi(xml, sinirIdx) {
  const re = /<w:r[ >]/g;
  let son = -1;
  let m;
  while ((m = re.exec(xml)) && m.index < sinirIdx) son = m.index;
  return son;
}

function inlineResimXml(rId, wPx, hPx, docPrId) {
  const cx = Math.round(wPx * 9525);
  const cy = Math.round(hPx * 9525);
  // xmlns bildirimleri bilerek eleman üstünde — header kökünde wp/a/pic/r
  // tanımlı olmayabilir
  return (
    '<w:r><w:drawing>' +
    '<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
    `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${docPrId}" name="Gorsel${docPrId}"/>` +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<pic:nvPicPr><pic:cNvPr id="${docPrId}" name="gorsel"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'
  );
}

// Parçanın rels dosyasına görsel ilişkisi + medya dosyası ekler, rId döner
function zipeResimEkle(zip, parca, buffer, sayac) {
  const medyaAdi = `media/yazdir_gorsel_${sayac}.png`;
  zip.file(`word/${medyaAdi}`, buffer);

  // [Content_Types].xml'de png tanımlı olmalı
  const ctYolu = '[Content_Types].xml';
  const ct = zip.file(ctYolu).asText();
  if (!/Extension="png"/.test(ct)) {
    zip.file(ctYolu, ct.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>'));
  }

  const relsYolu = `word/_rels/${parca.slice('word/'.length)}.rels`;
  const relsDosyasi = zip.file(relsYolu);
  const rId = `rIdYazdirGorsel${sayac}`;
  const iliski = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${medyaAdi}"/>`;
  if (relsDosyasi) {
    zip.file(relsYolu, relsDosyasi.asText().replace('</Relationships>', `${iliski}</Relationships>`));
  } else {
    zip.file(
      relsYolu,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${iliski}</Relationships>`
    );
  }
  return rId;
}

// Word metin kutularını mc:AlternateContent içinde İKİ kopya saklar
// (mc:Choice = modern wps, mc:Fallback = eski VML). docxtemplater görseli
// yalnız Fallback kopyasına basıyor, LibreOffice ise Choice kopyasını
// çiziyor → kutu boş kalıyordu (canlı doğrulanan hata). Görsel tag'i
// içeren bloklar render ÖNCESİ Choice içeriğine indirgenir; görselsiz
// bloklara dokunulmaz.
function gorselluAlternatifleriSadelestir(xml, gorselTagleri) {
  if (!gorselTagleri.length) return xml;
  return xml.replace(/<mc:AlternateContent>([\s\S]*?)<\/mc:AlternateContent>/g, (tum, ic) => {
    // Etiket hangi kopyadaysa O kopya kalır (Word, kullanıcının yazdığı
    // metni bazen yalnız Fallback kopyasına koyuyor — canlı doğrulandı)
    const tagIceriyor = (parca) =>
      !!parca && gorselTagleri.some((tag) => duzMetinIcerir(parca, `{%${tag}}`));
    const choice = /<mc:Choice[^>]*>([\s\S]*?)<\/mc:Choice>/.exec(ic);
    const fallback = /<mc:Fallback>([\s\S]*?)<\/mc:Fallback>/.exec(ic);
    if (tagIceriyor(choice?.[1])) return choice[1];
    if (tagIceriyor(fallback?.[1])) return fallback[1];
    return tum;
  });
}

// Görsel metin kutusu, paragrafa göre konumlanır. Hücre dikey ortalıysa
// (özellikle birleşik hücrelerde) LibreOffice paragrafı hücrenin ortasına
// indirir ve kutu logo alanından aşağı kayar; Word'de kayma olmaz. Bu yüzden
// kutu içeren hücreler üste hizalanır.
function gorselHucreleriniUsteHizala(xml) {
  return xml.replace(/<w:tc>(?:(?!<w:tc>)[\s\S])*?<\/w:tc>/g, (hucre) =>
    hucre.includes('<wp:anchor') && /\{%/.test(hucre.replace(/<[^>]+>/g, ''))
      ? hucre.replace('<w:vAlign w:val="center"/>', '<w:vAlign w:val="top"/>')
      : hucre
  );
}

// Görsel tag'leri gövdede VEYA üstbilgi/altbilgide olabilir — hepsi taranır
const GORSEL_PARCA_DESENI = /^word\/(document|header\d*|footer\d*)\.xml$/;

// ---- Word onay kutuları (w14:checkbox content control): docxtemplater bunların
// durumunu bilmez; render öncesi document.xml doğrudan düzenlenir. Şablonun
// kendi tanımındaki glyph'ler: ☐ (işaretsiz) → ☒ (işaretli); LibreOffice PDF'e
// çevirirken w14:checked bayrağını değil görünen glyph'i basar, ikisi de değişir ----
const MODUL_CHECKBOX_TAG_ADI = {
  B: 'modul_b_bool', F: 'modul_f_bool', G: 'modul_g_bool', E: 'modul_e_bool', H1: 'modul_h1_bool', D: 'modul_d_bool',
};

// Modül E beyanı alttaki Modül B tip incelemesine dayandığından E için B de işaretlenir
export function isaretlenecekCheckboxTagleri(modulKodu) {
  const kendi = MODUL_CHECKBOX_TAG_ADI[modulKodu];
  if (!kendi) return [];
  return modulKodu === 'E' ? [kendi, MODUL_CHECKBOX_TAG_ADI.B] : [kendi];
}

// Bir onay kutusu content control'ünü (SDT) işaretler/işaretsiz yapar; yalnız o
// SDT'nin sınırları içinde çalışır
function checkboxDurumu(xml, tagAdi, isaretli) {
  const tagIdx = xml.indexOf(`w:tag w:val="{${tagAdi}}"`);
  if (tagIdx === -1) return xml;
  const sdtSon = xml.indexOf('</w:sdt>', tagIdx);
  let parca = xml.slice(tagIdx, sdtSon === -1 ? undefined : sdtSon);
  const [eskiBayrak, yeniBayrak] = isaretli ? ['w14:val="0"', 'w14:val="1"'] : ['w14:val="1"', 'w14:val="0"'];
  parca = parca.replace(`w14:checked ${eskiBayrak}`, `w14:checked ${yeniBayrak}`);
  parca = isaretli ? parca.replace('>☐<', '>☒<') : parca.replace('>☒<', '>☐<');
  return xml.slice(0, tagIdx) + parca + (sdtSon === -1 ? '' : xml.slice(sdtSon));
}

// Tüm modül kutuları önce işaretsiz yapılır, sonra yalnız istenenler işaretlenir
// (şablon dosyasında hangileri işaretli kalmış olursa olsun sonuç denetimin
// modülüne göre doğru çıkar)
function checkboxlariIsaretle(xml, tagAdlari) {
  let sonuc = xml;
  for (const tag of Object.values(MODUL_CHECKBOX_TAG_ADI)) sonuc = checkboxDurumu(sonuc, tag, false);
  for (const tag of tagAdlari) sonuc = checkboxDurumu(sonuc, tag, true);
  return sonuc;
}

// Onay kutusu glyph'leri (☐ ☒) şablonda belirli bir yazı tipine bağlı değildir;
// sunucuda (Docker) yedek yazı tipi bu karakterlerden birini içermezse PDF'te
// "?" kutusu çıkıyor. Tüm onay kutusu run'ları DejaVu Sans'a sabitlenir (Docker
// imajında fonts-dejavu-core var; yerelde yoksa LibreOffice kendi yedeğini seçer).
function checkboxFontunuSabitle(xml) {
  const font = '<w:rFonts w:ascii="DejaVu Sans" w:hAnsi="DejaVu Sans" w:eastAsia="DejaVu Sans" w:cs="DejaVu Sans"/>';
  return xml.replace(/<w:sdt>[\s\S]*?<\/w:sdt>/g, (sdt) => {
    if (!sdt.includes('w14:checkbox')) return sdt;
    return sdt.replace(/(<w:sdtContent>[\s\S]*?)<w:r( [^>]*)?>(<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t>/g, (_m, once, oznitelik, rpr) => {
      const ek = rpr ? rpr.replace('<w:rPr>', `<w:rPr>${font}`) : `<w:rPr>${font}</w:rPr>`;
      return `${once}<w:r${oznitelik ?? ''}>${ek}<w:t>`;
    });
  });
}

// Birden çok görselin basıldığı tag'ler ({%tag} gövdede tek paragrafta): her tag
// için depolama anahtarı listesi verilir, görseller yan yana (satır sığdıkça)
// kutuya ölçeklenerek aynı paragrafa dizilir; liste boşsa tag silinir
const COKLU_GORSEL_KUTU_PX = [300, 225];
async function cokluGorselleriYerlestir(zip, xml, cokluGorseller) {
  if (!cokluGorseller) return xml;
  let sayac = 5000;
  for (const [tag, anahtarlar] of Object.entries(cokluGorseller)) {
    const hedef = `{%${tag}}`;
    // Etiket Word tarafından birkaç run'a bölünmüş olabilir: paragrafın düz metnine bakılır
    let pBas = -1, pSon = -1;
    const pDeseni = /<w:p(?: [^>]*[^>/])?>[\s\S]*?<\/w:p>/g;
    for (let pm; (pm = pDeseni.exec(xml)); ) {
      const duz = [...pm[0].matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((t) => t[1]).join('');
      if (duz.includes(hedef)) { pBas = pm.index; pSon = pm.index + pm[0].length; break; }
    }
    if (pBas === -1) continue;
    const paragraf = xml.slice(pBas, pSon);
    const pAc = paragraf.match(/^<w:p(?: [^>]*)?>/)[0];
    const pPr = (paragraf.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) ?? [''])[0];
    let runlar = '';
    for (const anahtar of anahtarlar) {
      const buffer = await getObjectBuffer(anahtar);
      const { width, height } = imageSize(buffer);
      const oran = Math.min(COKLU_GORSEL_KUTU_PX[0] / width, COKLU_GORSEL_KUTU_PX[1] / height);
      sayac += 1;
      const rId = zipeResimEkle(zip, 'word/document.xml', buffer, sayac);
      runlar += inlineResimXml(rId, Math.round(width * oran), Math.round(height * oran), 9000 + sayac) + '<w:r><w:t xml:space="preserve">  </w:t></w:r>';
    }
    let sonrasi = xml.slice(pSon);
    // Görsellerden sonraki boş paragraflar (şablonun yer tutucuları) fazladan boş sayfa üretmesin
    sonrasi = sonrasi.replace(/^(?:<w:p(?: [^>]*[^>/])?>(?:(?!<w:t[ >]|<w:drawing|<w:br|<w:sectPr)[\s\S])*?<\/w:p>|<w:p(?: [^>]*)?\/>)+/, '');
    // Başlık paragrafı (görsellerden hemen önceki) görsellerle aynı sayfada kalsın
    let onceki = xml.slice(0, pBas);
    const bPos = onceki.lastIndexOf('<w:p ');
    if (bPos !== -1 && onceki.slice(bPos).includes('<w:pPr>') && !onceki.slice(bPos).includes('<w:keepNext/>')) {
      onceki = onceki.slice(0, bPos) + onceki.slice(bPos).replace('<w:pPr>', '<w:pPr><w:keepNext/>');
    }
    // Başlıktan önceki boş paragraflar da (tablodan sonra) sayfaya taşıp boş sayfa üretmesin
    const baslikBas = onceki.lastIndexOf('<w:p ');
    if (baslikBas !== -1) {
      const oncesi = onceki.slice(0, baslikBas).replace(/(?:<w:p(?: [^>]*[^>/])?>(?:(?!<w:t[ >]|<w:drawing|<w:br|<w:sectPr)[\s\S])*?<\/w:p>|<w:p(?: [^>]*)?\/>)+$/, '');
      onceki = oncesi + onceki.slice(baslikBas);
    }
    xml = onceki + pAc + pPr + runlar + '</w:p>' + sonrasi;
  }
  return xml;
}

export async function sablonDoldur(sablonYolu, veri, firma, secenek = {}) {
  const zip = new PizZip(await fs.readFile(sablonYolu));
  // Sunucuda/Word'de bulunmayan marka yazı tipleri (TÜV'ün "TNG Pro"su) LibreOffice'te rastgele
  // bir yazı tipine (kalın görünen) düşüyor; Word'ün de kullandığı Calibri'ye (Carlito) sabitlenir
  for (const parca of Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n))) {
    const metin = zip.file(parca).asText();
    if (metin.includes('TNG Pro')) zip.file(parca, metin.replace(/TNG Pro/g, 'Calibri'));
  }
  {
    let xml = zip.file('word/document.xml').asText();
    // Metin içindeki sıradan "{" (ör. "{ 1 m/s") etiket sanılıp "unclosed tag" hatası
    // vermesin: etiketler boşluk/rakamla başlamaz, bu parantezler HTML koduyla yazılır
    xml = xml.replace(/(<w:t(?: [^>]*)?>)([^<]*)(<\/w:t>)/g, (_m, ac, t, ka) => ac + t.replace(/\{(?=\s|\d)/g, '&#123;') + ka);
    if (secenek.xmlYama) xml = secenek.xmlYama(xml);
    if (secenek.checkboxTagleri) xml = checkboxlariIsaretle(xml, secenek.checkboxTagleri);
    xml = await cokluGorselleriYerlestir(zip, xml, secenek.cokluGorseller);
    zip.file('word/document.xml', checkboxFontunuSabitle(xml));
  }
  const parcalar = Object.keys(zip.files).filter((n) => GORSEL_PARCA_DESENI.test(n));

  // Şablonda geçen görsel tag'leri bul (tüm parçalarda), firma görsellerini
  // R2'den çek — tag varsa görsel ZORUNLU (eksik görselli resmî belge
  // sessizce üretilmez)
  const gorselTagleri = [
    ...new Set(
      parcalar.flatMap((parca) => {
        const xml = zip.file(parca).asText();
        return Object.keys(GORSEL_TAG_KAYNAKLARI).filter((tag) => duzMetinIcerir(xml, `{%${tag}}`));
      })
    ),
  ];
  for (const tag of gorselTagleri) {
    const alan = GORSEL_TAG_KAYNAKLARI[tag];
    const anahtar = firma?.belgeler?.[alan]?.dosyaAnahtari;
    if (!anahtar) {
      const etiket = alan === 'logo' ? 'logo' : 'imza-kaşe';
      const hata = new Error(
        alan === 'denetciImza'
          ? `Bu denetim için denetçi seçilmemiş ya da denetçinin imza-kaşesi yüklenmemiş — Ayarlar > Denetçiler'den yükleyin (şablon {%${tag}} istiyor).`
          : `Bu firma için ${etiket} yüklenmemiş — Firmalar > Genel Bilgiler'den yükleyin (şablon {%${tag}} istiyor).`
      );
      hata.status = 400;
      throw hata;
    }
    veri[tag] = await getObjectBuffer(anahtar);
  }

  // Görsel kutularının gerçek boyutu/hizası her parçada okunur ve düzeltilir
  const boyutlar = {};
  const parcaDonduruler = {};
  for (const parca of parcalar) {
    const sadeXml = gorselHucreleriniUsteHizala(
      gorselluAlternatifleriSadelestir(zip.file(parca).asText(), gorselTagleri)
    );
    const sonuc = sablonGorselYerlesimHazirla(sadeXml, gorselTagleri);
    zip.file(parca, sonuc.xml);
    Object.assign(boyutlar, sonuc.boyutlar);
    if (Object.keys(sonuc.donduruler).length) parcaDonduruler[parca] = sonuc.donduruler;
  }

  // Üstbilgi/altbilgilerdeki görsel etiketleri elle yerleştirilir (görsel
  // modülü bu parçalarda güvenilir çalışmıyor — üstteki yorum)
  let gorselSayac = 0;
  for (const parca of parcalar) {
    if (parca === 'word/document.xml') continue;
    let xml = zip.file(parca).asText();
    let degisti = false;
    for (const tag of gorselTagleri) {
      const hedef = `{%${tag}}`;
      let idx;
      while ((idx = xml.indexOf(hedef)) !== -1) {
        const runBas = sonAcilisIndeksi(xml, idx);
        const runSonIdx = xml.indexOf('</w:r>', idx);
        if (runBas === -1 || runSonIdx === -1) break;
        const buffer = veri[tag];
        const { width, height } = imageSize(buffer);
        const [hedefW, hedefH] =
          boyutlar[tag] ?? [VARSAYILAN_HEDEF_GENISLIK_PX, VARSAYILAN_HEDEF_YUKSEKLIK_PX];
        const oran = Math.min(hedefW / width, hedefH / height);
        gorselSayac += 1;
        const rId = zipeResimEkle(zip, parca, buffer, gorselSayac);
        xml =
          xml.slice(0, runBas) +
          inlineResimXml(rId, Math.round(width * oran), Math.round(height * oran), 9000 + gorselSayac) +
          xml.slice(runSonIdx + '</w:r>'.length);
        degisti = true;
      }
    }
    if (degisti) zip.file(parca, xml);
  }

  // Gövdedeki görselleri docxtemplater'ın görsel modülü işler (orada
  // güvenilir çalışıyor, canlı doğrulandı)
  const govdeGorselVar = gorselTagleri.some((tag) =>
    duzMetinIcerir(zip.file('word/document.xml').asText(), `{%${tag}}`)
  );

  const tpl = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Görsel modülü SADECE gövdede {%...} etiketi varsa bağlanır — modül,
    // etiketi olmayan bazı şablonlarda (İÇİNDEKİLER) renderAsync'i
    // "reading 'length'" ile çökertiyor (canlı doğrulanan hata)
    modules: govdeGorselVar ? [createImageModule(boyutlar)] : [],
    // Eksik tag "undefined" yerine boş basılır (artidoksan1'de canlı
    // doğrulanan hatanın önlemi)
    nullGetter: () => '',
  });
  // Görsel modülü async çözümlenir — senkron render() Buffer'ı çözümlenmiş
  // sanıp patlar (artidoksan1'de canlı doğrulanan hata)
  if (govdeGorselVar) await tpl.renderAsync(veri);
  else tpl.render(veri);

  // Döndürülmüş kutudaki görsel LibreOffice'te dönmez — kutudan çıkarılıp
  // kendi rotasyonuyla bağımsız nesne olarak yeniden yerleştirilir
  const renderZip = tpl.getZip();
  for (const [parca, donduruler] of Object.entries(parcaDonduruler)) {
    renderZip.file(parca, sablonGorselDondur(renderZip.file(parca).asText(), donduruler));
  }
  return renderZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ---- Kaynak özeti: belgeyi üreten girdilerin (şablon dosyası + doldurulan
// veri + logo/imza görselleri) parmak izi. Aynıysa belge yeniden çevrilmez;
// URETIM_SURUMU üretim mantığı değişince artırılır ve eski çıktıları geçersiz kılar ----
const URETIM_SURUMU = 53;
const sablonHashOnbellek = new Map();

async function sablonHash(yol) {
  const st = await fs.stat(yol);
  const anahtar = `${yol}|${st.mtimeMs}|${st.size}`;
  let h = sablonHashOnbellek.get(anahtar);
  if (!h) {
    h = createHash('sha1').update(await fs.readFile(yol)).digest('hex');
    sablonHashOnbellek.set(anahtar, h);
  }
  return h;
}

function sablonYolu(tescil, firma, kalem) {
  const set = tescil.sablonSeti || 'tescil-temp1';
  return path.join(TEMPLATES_DIR, set, kalem.dosya ?? abBeyaniSablonu(tescil, firma));
}

export async function kaynakOzeti(yol, veri, firma) {
  const girdi = JSON.stringify([
    URETIM_SURUMU,
    await sablonHash(yol),
    Object.entries(veri).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    firma?.belgeler?.logo?.dosyaAnahtari ?? '',
    firma?.belgeler?.imzaKase?.dosyaAnahtari ?? '',
    firma?.belgeler?.denetciImza?.dosyaAnahtari ?? '',
  ]);
  return createHash('sha1').update(girdi).digest('hex');
}

export function slotOlustur(key, dosyaAdi, mimeType, boyut) {
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
  // Üretilmiş belgenin girdileri değişmişse "güncel değil" işaretlenir
  const ozetler = new Map();
  try {
    const veri = await sablonVerisi(baglam);
    for (const kalem of await etkinKalemler(baglam, (k) => k.tip === 'sablon' && uretilenler.has(k.kod))) {
      const h = await kalemHazirla(kalem, baglam, veri);
      ozetler.set(kalem.kod, await kaynakOzeti(h.yol, h.veri, firma));
    }
  } catch {
    /* özet hesaplanamazsa güncellik bilgisi verilmez */
  }

  const etkinler = new Set((await etkinKalemler(baglam)).map((k) => k.kod));
  return KALEMLER.filter((k) => etkinler.has(k.kod)).map((kalem) => {
    const satir = { no: kalem.no, kod: kalem.kod, ad: kalem.ad, tip: kalem.tip };
    if (kalem.tip === 'sablon') {
      const u = uretilenler.get(kalem.kod);
      satir.uretilen = u
        ? { docx: u.docx, pdf: u.pdf, uretimTarihi: u.uretimTarihi }
        : null;
      satir.eskimis = !!u && ozetler.has(kalem.kod) && u.kaynakOzeti !== ozetler.get(kalem.kod);
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

// Üretilen DOCX+PDF'i R2'ye yazar, tescil kaydını günceller, eski çıktıyı siler
async function belgeKaydet(tescilId, kalem, ozet, docxBuffer, pdfBuffer) {
  const taban = `${String(kalem.no).padStart(2, '0')}-${kalem.ad}`;
  const docxKey = buildObjectKey('tesciller', `${taban}.docx`);
  const pdfKey = buildObjectKey('tesciller', `${taban}.pdf`);
  await Promise.all([
    putObject(docxKey, docxBuffer, DOCX_MIME),
    putObject(pdfKey, pdfBuffer, 'application/pdf'),
  ]);

  const kayit = {
    sablonKodu: kalem.kod,
    sablonAdi: kalem.ad,
    docx: slotOlustur(docxKey, `${taban}.docx`, DOCX_MIME, docxBuffer.length),
    pdf: slotOlustur(pdfKey, `${taban}.pdf`, 'application/pdf', pdfBuffer.length),
    uretimTarihi: new Date(),
    kaynakOzeti: ozet,
  };
  // Atomik: eski kaydı çıkarırken okunan hali al (silinecek anahtarlar tam
  // olarak çıkarılandır, yetim dosya kalmaz), sonra yenisini ekle
  const onceki = await Tescil.findOneAndUpdate(
    { _id: tescilId },
    { $pull: { uretilenBelgeler: { sablonKodu: kalem.kod } } },
    { returnDocument: 'before', projection: { uretilenBelgeler: 1 } }
  ).lean();
  await Tescil.updateOne({ _id: tescilId }, { $push: { uretilenBelgeler: kayit } });
  const eski = (onceki?.uretilenBelgeler ?? []).find((u) => u.sablonKodu === kalem.kod);
  await anahtarlariSil([eski?.docx?.dosyaAnahtari, eski?.pdf?.dosyaAnahtari]);
}

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Tek bir şablon belgesini üretir (kuyruk görevi). Girdiler değişmediyse ve
// zorla istenmediyse mevcut çıktı korunur, çevirme yapılmaz.
async function kalemUret(tescilId, kod, slot, { zorla, ctx }) {
  const kalem = KALEMLER.find((k) => k.kod === kod && k.tip === 'sablon');
  if (!kalem) throw new Error('Bilinmeyen şablon kodu');
  const baglam = await tescilYukle(tescilId);
  if (!baglam) throw new Error('Tescil bulunamadı');
  const { tescil, firma } = baglam;
  if (!(await kalemEtkinMi(kalem, baglam))) throw new Error('Bu belge bu tescil için gerekli değil (risk analizi yok)');

  const h = await kalemHazirla(kalem, baglam, await sablonVerisi(baglam));
  const { yol, veri, secenek } = h;
  await fs.access(yol).catch(() => {
    throw new Error(`Şablon dosyası bulunamadı: ${path.relative(TEMPLATES_DIR, yol)}`);
  });

  const ozet = await kaynakOzeti(yol, veri, firma);
  const mevcut = (tescil.uretilenBelgeler ?? []).find((u) => u.sablonKodu === kod);
  if (!zorla && mevcut?.kaynakOzeti === ozet && mevcut.docx?.dosyaAnahtari && mevcut.pdf?.dosyaAnahtari) {
    return { durum: 'guncel' };
  }

  ctx.faz('hazirlaniyor');
  const docxBuffer = await sablonDoldur(yol, veri, firma, secenek);
  ctx.faz('cevriliyor');
  const pdfBuffer = await convertDocxToPdf(docxBuffer, slot);
  ctx.faz('kaydediliyor');
  await belgeKaydet(tescilId, kalem, ozet, docxBuffer, pdfBuffer);
  return { durum: 'uretildi' };
}

// Birden çok DOCX'i TEK LibreOffice açılışıyla sırayla PDF'e çevirir
// (açılış maliyeti bir kez ödenir). LibreOffice dosyaları verilen sırayla
// işler: i. PDF, (i+1). PDF göründüğünde tamamlanmıştır; ilerleme(i) bu
// anda çağrılır. Çevrilemeyen belge için null döner (çağıran tek tek dener).
export async function topluPdfCevir(docxBufferlari, slot, ilerleme) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yazdir-toplu-'));
  const cikti = path.join(tmpDir, 'cikti');
  const ad = (i) => String(i).padStart(3, '0');
  try {
    await fs.mkdir(cikti);
    const girdiler = [];
    for (let i = 0; i < docxBufferlari.length; i++) {
      const yol = path.join(tmpDir, `${ad(i)}.docx`);
      await fs.writeFile(yol, docxBufferlari[i]);
      girdiler.push(yol);
    }
    const profilUrl = pathToFileURL(path.join(os.tmpdir(), `yazdir-lo-profil-${slot}`)).href;

    const bildirilen = new Set();
    const tara = async (bitti) => {
      const adlar = new Set((await fs.readdir(cikti).catch(() => [])).filter((a) => a.endsWith('.pdf')));
      for (let i = 0; i < docxBufferlari.length; i++) {
        if (bildirilen.has(i) || !adlar.has(`${ad(i)}.pdf`)) continue;
        if (bitti || adlar.has(`${ad(i + 1)}.pdf`)) {
          bildirilen.add(i);
          ilerleme(i);
        }
      }
    };
    const zamanlayici = setInterval(() => tara(false).catch(() => {}), 700);
    try {
      await execFileAsync(
        LIBREOFFICE_PATH,
        [
          `-env:UserInstallation=${profilUrl}`,
          '--headless', '--norestore', '--nolockcheck', '--nofirststartwizard', '--nodefault', '--nologo',
          '--convert-to', 'pdf', '--outdir', cikti, ...girdiler,
        ],
        { timeout: Math.min(600_000, 90_000 + 30_000 * docxBufferlari.length) }
      );
    } catch (err) {
      console.error('[yazdir] toplu PDF dönüşümü kısmen başarısız:', err.message);
    } finally {
      clearInterval(zamanlayici);
    }
    await tara(true);

    const sonuc = [];
    for (let i = 0; i < docxBufferlari.length; i++) {
      const pdf = await fs.readFile(path.join(cikti, `${ad(i)}.pdf`)).catch(() => null);
      // Yarım yazılmış (çöken çeviri) PDF'i ele: dosya sonu işareti olmalı
      const saglam = pdf && pdf.subarray(Math.max(0, pdf.length - 1024)).includes('%%EOF');
      sonuc.push(saglam ? pdf : null);
    }
    return sonuc;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// Toplu yazdırma (tek görev): 1) tüm Word dosyaları doldurulur, 2) LibreOffice
// bir kez açılıp hepsi PDF'e çevrilir, 3) kaydedilir. Güncel belgeler atlanır.
async function topluUret(tescilId, slot, { ctx }) {
  const baglam = await tescilYukle(tescilId);
  if (!baglam) throw new Error('Tescil bulunamadı');
  const { tescil, firma } = baglam;
  const veri = await sablonVerisi(baglam);
  const mevcutlar = new Map((tescil.uretilenBelgeler ?? []).map((u) => [u.sablonKodu, u]));

  ctx.faz('hazirlaniyor');
  const hazirlar = [];
  for (const kalem of await etkinKalemler(baglam, (k) => k.tip === 'sablon')) {
    if (ctx.iptalMi()) return ctx.iptalEt();
    ctx.durum(kalem.kod, 'uretiliyor');
    try {
      const h = await kalemHazirla(kalem, baglam, veri);
      const yol = h.yol;
      await fs.access(yol).catch(() => {
        throw new Error(`Şablon dosyası bulunamadı: ${path.relative(TEMPLATES_DIR, yol)}`);
      });
      const ozet = await kaynakOzeti(yol, h.veri, firma);
      const mevcut = mevcutlar.get(kalem.kod);
      if (mevcut?.kaynakOzeti === ozet && mevcut.docx?.dosyaAnahtari && mevcut.pdf?.dosyaAnahtari) {
        ctx.durum(kalem.kod, 'guncel');
        continue;
      }
      const docxBuffer = await sablonDoldur(yol, { ...h.veri }, firma, h.secenek);
      hazirlar.push({ kalem, ozet, docxBuffer });
      ctx.durum(kalem.kod, 'hazir');
    } catch (err) {
      ctx.durum(kalem.kod, 'hata', err.message);
    }
  }
  if (!hazirlar.length) return { durum: 'guncel' };
  if (ctx.iptalMi()) return ctx.iptalEt();

  ctx.faz('cevriliyor');
  const pdfler = await topluPdfCevir(
    hazirlar.map((h) => h.docxBuffer),
    slot,
    (i) => ctx.durum(hazirlar[i].kalem.kod, 'cevrildi')
  );
  // Toplu çağrıda çevrilemeyen belge tek tek yeniden denenir
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
    await Promise.all(
      kaydedilecek.slice(i, i + 3).map(async ({ h, pdf }) => {
        try {
          await belgeKaydet(tescilId, h.kalem, h.ozet, h.docxBuffer, pdf);
          ctx.durum(h.kalem.kod, 'tamam');
        } catch (err) {
          ctx.durum(h.kalem.kod, 'hata', err.message);
        }
      })
    );
  }
  return { durum: 'uretildi' };
}

const calistir = (tescilId) => (kod, slot, secenek) =>
  kod ? kalemUret(tescilId, kod, slot, secenek) : topluUret(tescilId, slot, secenek);

// Tek yazdırma: iş kuyruğa alınır, hemen döner (ilerleme /yazdir/isler'den izlenir)
router.post('/:id/yazdir/:kod', async (req, res) => {
  try {
    const kalem = KALEMLER.find((k) => k.kod === req.params.kod && k.tip === 'sablon');
    if (!kalem) return res.status(400).json({ message: 'Bilinmeyen şablon kodu' });
    if (!(await Tescil.exists({ _id: req.params.id }))) {
      return res.status(404).json({ message: 'Tescil bulunamadı' });
    }
    if (aktifTopluIs(req.params.id)) {
      return res.status(409).json({ message: 'Toplu yazdırma sürüyor — bitmesini bekleyin.' });
    }
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

// Toplu yazdırma: tüm şablon belgeleri; güncel olanlar atlanır. Tescilde
// zaten çalışan bir toplu iş varsa yenisi açılmaz, ona bağlanılır.
router.post('/:id/yazdir-toplu', async (req, res) => {
  try {
    if (!(await Tescil.exists({ _id: req.params.id }))) {
      return res.status(404).json({ message: 'Tescil bulunamadı' });
    }
    const mevcut = aktifTopluIs(req.params.id);
    if (mevcut) return res.status(202).json({ isId: mevcut, mevcut: true });
    if (tescildeAktifIsVar(req.params.id)) {
      return res.status(409).json({ message: 'Bu tescilde başka bir yazdırma sürüyor — bitmesini bekleyin.' });
    }
    const sablonlar = await etkinKalemler(await tescilYukle(req.params.id), (k) => k.tip === 'sablon');
    const isId = isBaslat({
      tescilId: req.params.id,
      tip: 'toplu',
      ad: 'Tümünü Yazdır',
      kalemler: sablonlar.map(({ kod, no, ad }) => ({ kod, no, ad })),
      zorla: false,
      calistir: calistir(req.params.id),
    });
    res.status(202).json({ isId, mevcut: false });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

router.get('/:id/yazdir/isler', (req, res) => {
  res.json(tescilIsleri(req.params.id));
});

router.delete('/:id/yazdir/isler/:isId', (req, res) => {
  const iptal = isIptal(req.params.id, req.params.isId);
  res.status(iptal ? 200 : 404).json({ iptal });
});

// R2 silme hatası kullanıcı akışını bozmasın: en iyi çaba, kaç tanesi silindi döner
export async function anahtarlariSil(anahtarlar) {
  let silinen = 0;
  for (const a of anahtarlar.filter(Boolean)) {
    try {
      await deleteObject(a);
      silinen += 1;
    } catch (err) {
      console.error('R2 silme hatası:', a, err.message);
    }
  }
  return silinen;
}

// Sıfırla: üretilmiş tüm DOCX/PDF çıktılarını depodan ve kayıttan kaldırır
router.delete('/:id/yazdir', async (req, res) => {
  try {
    if (tescildeAktifIsVar(req.params.id)) {
      return res.status(409).json({ message: 'Devam eden yazdırma var — bitmesini bekleyin veya iptal edin.' });
    }
    const tescil = await Tescil.findById(req.params.id).lean();
    if (!tescil) return res.status(404).json({ message: 'Tescil bulunamadı' });
    const liste = tescil.uretilenBelgeler ?? [];
    await Tescil.updateOne({ _id: tescil._id }, { $set: { uretilenBelgeler: [] } });
    const silinen = await anahtarlariSil(
      liste.flatMap((u) => [u.docx?.dosyaAnahtari, u.pdf?.dosyaAnahtari])
    );
    res.json({ silinen: liste.length, depodanSilinen: silinen });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

export default router;
