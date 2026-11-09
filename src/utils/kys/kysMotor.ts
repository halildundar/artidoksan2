import JSZip from 'jszip';
import { createKysEngine } from '@/data/kys/engine.js';
import { getDosyaUrl } from '@/services/dosyaService';
import type { Firma } from '@/services/firmaService';
import { getAsansorler, type Asansor } from '@/services/asansorService';
import { getOnayliKurumSecenekleri, type OnayliKurumSecenek } from '@/services/onayliKurumService';
import type { KysVerisi } from '@/services/kysService';

// KYS motoru (artifact'tan taşınan üretici kod) — durum S bir düz nesnedir; arayüz doğrudan değiştirir.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type KysMotor = any;

const iso = (d?: string | null) => (d ? String(d).slice(0, 10) : '');
const modulB = (m: string) => /(^|\s)B($|\s)|modul b|modül b/i.test(m);
const modulE = (m: string) => /(^|\s)E($|\s)|modul e|modül e/i.test(m);

// Firma dışı bağlam: onaylı kurum kataloğu (NoBo no) ve firmanın asansörleri (model varyant kapsamı)
export interface KysBaglam { kurumlar: OnayliKurumSecenek[]; asansorler: Asansor[] }

export async function kysBaglami(f: Firma): Promise<KysBaglam> {
  const [kurumlar, asansorler] = await Promise.all([
    getOnayliKurumSecenekleri().catch(() => [] as OnayliKurumSecenek[]),
    getAsansorler({ firmaId: f._id }).catch(() => [] as Asansor[]),
  ]);
  return { kurumlar, asansorler };
}

const trKey = (s: string) => s.trim().toLocaleLowerCase('tr');
const sayiAraligi = (liste: number[], birim: string) => {
  if (!liste.length) return '';
  const a = Math.min(...liste), b = Math.max(...liste);
  const f = (x: number) => String(x).replace('.', ',');
  return a === b ? `${f(a)} ${birim}` : `${f(a)}–${f(b)} ${birim}`;
};

// Asansörlerden model varyant kapsamı: makine yeri, yük, hız, askı oranı
function modelKapsami(asansorler: Asansor[]): string {
  if (!asansorler.length) return '';
  const say = (k: keyof Asansor) => asansorler.map((a) => Number(a[k])).filter((n) => Number.isFinite(n) && n > 0);
  const tekil = (k: keyof Asansor) => [...new Set(asansorler.map((a) => a[k]).filter(Boolean) as string[])].sort();
  const parcalar = [
    tekil('makinaKonumu').map((k) => (k === 'MRL' ? 'Makine Dairesiz(MRL)' : 'Makine Daireli(MR)')).join(' / '),
    sayiAraligi(say('beyanYuku'), 'kg'),
    sayiAraligi(say('hiz'), 'm/s'),
    tekil('askiTipi').length ? `${tekil('askiTipi').join(', ')} askı` : '',
  ].filter(Boolean);
  return parcalar.join(', ');
}

// Firma kaydından gelen (elle girilmemiş) alanlar — KYS'deki aynı adlı alanlarla eşleşir
export function firmaKysAlanlari(f: Firma, baglam?: KysBaglam): Record<string, string> {
  const nobo = (kurum?: string) => (kurum ? baglam?.kurumlar.find((k) => trKey(k.unvan) === trKey(kurum))?.nobo ?? '' : '');
  const ce = f.ceBelgeleri ?? [];
  const tip = ce.find((c) => modulB(c.modul));
  const me = ce.find((c) => modulE(c.modul));
  const p = f.personel;
  const muh = f.muhendisler ?? [];
  const tm = (muh.find((m) => m.tur === 'makine') ?? muh[0])?.adSoyad;
  const adres = [f.mahalle, f.adres, f.postaKodu, [f.ilce, f.il].filter(Boolean).join('/')].filter(Boolean).join(' ');
  const v: Record<string, string> = {
    unvan: f.unvan || f.ad,
    vergiDairesi: f.vergiDairesi ?? '',
    vergiNo: f.vergiNo ?? '',
    kisaKod: f.ad, // firmanın kısa adı, proje numaralarında kod olarak kullanılır
    il: f.il,
    adres,
    telefon: f.telefon,
    eposta: f.email,
    hyb: f.hybBelgeNo,
    hybTarih: iso(f.hybGecerlilik),
    tipSertNo: tip?.belgeNo ?? '',
    tipSertTarih: iso(tip?.bitisTarihi || tip?.gecerlilikTarihi),
    tipKurulus: tip?.kurum ?? '',
    tipKurulusNo: nobo(tip?.kurum),
    modelKapsam: modelKapsami(baglam?.asansorler ?? []),
    meKurulus: me?.kurum ?? '',
    meKurulusNo: nobo(me?.kurum),
    meBelgeNo: me?.belgeNo ?? '',
    meBelgeTarih: iso(me?.bitisTarihi || me?.gecerlilikTarihi),
    gm: p?.genelMudur ?? '',
    kyt: p?.kytTemsilcisi ?? '',
    tm: tm ?? '',
    smd: p?.sonKontrolSorumlusu ?? '',
    sef: p?.montajSorumlusu ?? '',
    bakimSefi: p?.bakimSorumlusu ?? '',
    satin: p?.satinAlmaSorumlusu ?? '',
  };
  Object.keys(v).forEach((k) => { if (!v[k] || !String(v[k]).trim()) delete v[k]; });
  return v;
}

// Firma kaydından alınabilen KYS alanları ve bunların firmada girileceği yer (Bilgiler sekmesinde salt okunur
// metin olarak gösterilir; eksikse firmada nereden girileceği belirtilir)
export const FIRMA_KAYNAKLI_ALANLAR: Record<string, string> = {
  unvan: 'Firma > Genel Bilgiler', kisaKod: 'Firma > Genel Bilgiler (Firma Adı)', vergiDairesi: 'Firma > Genel Bilgiler', vergiNo: 'Firma > Genel Bilgiler', il: 'Firma > Genel Bilgiler', adres: 'Firma > Genel Bilgiler',
  telefon: 'Firma > Genel Bilgiler', eposta: 'Firma > Genel Bilgiler',
  hyb: 'Firma > HYB Belgesi', hybTarih: 'Firma > HYB Belgesi',
  tipSertNo: 'Firma > CE Belgeler (Modul B)', tipSertTarih: 'Firma > CE Belgeler (Modul B)', tipKurulus: 'Firma > CE Belgeler (Modul B)', tipKurulusNo: 'Firma > CE Belgeler (Modul B kurumu, NoBo)',
  modelKapsam: 'Firma > Montajlar (asansör bilgileri)', meKurulusNo: 'Firma > CE Belgeler (Modul E kurumu, NoBo)',
  meKurulus: 'Firma > CE Belgeler (Modul E)', meBelgeNo: 'Firma > CE Belgeler (Modul E)', meBelgeTarih: 'Firma > CE Belgeler (Modul E)',
  gm: 'Firma > Personel', kyt: 'Firma > Personel', smd: 'Firma > Personel', sef: 'Firma > Personel',
  bakimSefi: 'Firma > Personel', satin: 'Firma > Personel', tm: 'Firma > Personel (mühendisler)',
};

const dolu = (x: unknown) => x != null && String(x).trim() !== '';

// Firma logosu → motorun beklediği {src (png/jpeg data URL), w, h}
export async function firmaLogosu(f: Firma): Promise<{ src: string; w: number; h: number; adGoster: boolean } | null> {
  const slot = f.belgeler?.logo;
  if (!slot?.dosyaAnahtari) return null;
  try {
    const url = await getDosyaUrl(slot.dosyaAnahtari);
    const blob = await (await fetch(url)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    return { src: canvas.toDataURL('image/png'), w: bitmap.width, h: bitmap.height, adGoster: false };
  } catch {
    return null; // logo alınamazsa belge logosuz üretilir
  }
}

export function tarayiciIndir(ad: string, veri: BlobPart) {
  const mime = /\.html$/.test(ad) ? 'text/html' : /\.zip$/.test(ad) ? 'application/zip'
    : /\.docx$/.test(ad) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream';
  const blob = new Blob([veri], { type: `${mime};charset=utf-8` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

export interface KysKurulum {
  firma: Firma;
  kys: KysVerisi | null;
  logo?: { src: string; w: number; h: number; adGoster: boolean } | null;
  baglam?: KysBaglam;
  onDurum?: (tur: string, mesaj: string) => void;
}

// Motoru kurar: kayıtlı KYS verisi + firma kaydından gelen alanlar. girilen = kullanıcının elle yazdıkları
// (yalnız bunlar kaydedilir; firma bilgisi değişince KYS de güncel kalır).
export function kysMotoruKur({ firma, kys, logo, baglam, onDurum }: KysKurulum) {
  const motor: KysMotor = createKysEngine({
    state: {},
    JSZip,
    save: async (ad: string, veri: BlobPart) => tarayiciIndir(ad, veri),
    onStatus: onDurum,
  });
  const kayitli = (kys ?? {}) as Record<string, any>;
  const girilen: Record<string, string> = {};
  Object.entries((kayitli.v ?? {}) as Record<string, unknown>).forEach(([k, x]) => { if (dolu(x)) girilen[k] = String(x); });
  const s = motor.setState({ ...kayitli, v: {} });
  const firmaAlanlari = firmaKysAlanlari(firma, baglam);
  s.v = { ...s.v, ...girilen, ...firmaAlanlari }; // firma kaydındaki bilgi esastır
  s.logo = logo ?? null;
  motor.kyInit();
  return { motor, girilen, firmaAlanlari };
}

// Kaydedilecek veri: motor durumu, v yerine yalnız elle girilenler; logo her zaman firmadan
export function kysKayitVerisi(motor: KysMotor, girilen: Record<string, string>): KysVerisi {
  const geri: Record<string, unknown> = { ...motor.S };
  delete geri.logo; // logo her zaman firma kaydından gelir
  return { ...geri, v: { ...girilen }, savedAt: new Date().toISOString() };
}

// Zorunlu bilgilerden boş olanlar (etiketleriyle) + logo
export function eksikKysBilgileri(motor: KysMotor, logoVar: boolean): string[] {
  const eksik: string[] = (motor.REQUIRED as string[])
    .filter((k) => !motor.T(k))
    .map((k) => motor.LABELS[k] as string);
  if (!logoVar) eksik.push('Firma logosu');
  return eksik;
}
