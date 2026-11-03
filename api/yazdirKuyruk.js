import { randomUUID } from 'node:crypto';

// Yazdırma (DOCX doldurma + PDF çevirme) için sunucu geneli iş kuyruğu.
//
// - Aynı anda en fazla YAZDIR_PARALEL görev çalışır (varsayılan 1: Render
//   Free 512 MB'ta tek LibreOffice güvenli). Her çalışan kendi "slot"unu
//   (LibreOffice profil dizini) kullanır, birbirini kilitlemez.
// - Tek yazdırma (öncelik 0) toplu yazdırmanın (öncelik 1) önüne geçer.
// - Toplu iş TEK görevdir: önce tüm Word dosyaları doldurulur, sonra LibreOffice
//   bir kez açılıp hepsi sırayla PDF'e çevrilir, en son kaydedilir.
//   Aşamalar iş üzerinde `faz` olarak, belgeler `durum` olarak izlenir.
// - Aynı tescil + aynı belge zaten kuyruktaysa/çalışıyorsa ikinci tek istek
//   yeni görev açmaz, aynı sonuca bağlanır (çift üretim/yetim dosya olmaz).
// - Durum bellektedir; sunucu yeniden başlarsa kuyruk kaybolur, ama hangi
//   belgelerin üretildiği veritabanındadır (değişmeyen belge tekrar çevrilmez).

const PARALEL = Math.max(1, Number(process.env.YAZDIR_PARALEL) || 1);
const IS_SAKLAMA_MS = 10 * 60 * 1000;

// Belge durumları: bekliyor → uretiliyor (Word dolduruluyor) → hazir (Word
// hazır, PDF bekliyor) → cevrildi (PDF hazır, kaydedilecek) → tamam
const BITMIS = ['tamam', 'guncel', 'hata', 'iptal'];
const WORD_HAZIR = ['hazir', 'cevrildi', 'tamam', 'guncel'];
const PDF_HAZIR = ['cevrildi', 'tamam', 'guncel'];

const isler = new Map(); // isId -> iş
const gorevler = new Map(); // anahtar -> bekleyen/çalışan görev
const tekliKuyruk = []; // öncelikli görevler (FIFO)
const topluIsler = []; // bekleyen görevi olan toplu işler
let rr = 0;
const bosSlotlar = Array.from({ length: PARALEL }, (_, i) => PARALEL - 1 - i);

export const paralelSayisi = PARALEL;

const gorevAnahtari = (tescilId, kod) => `${tescilId}:${kod}`;

function temizle() {
  const sinir = Date.now() - IS_SAKLAMA_MS;
  for (const [id, is] of isler) {
    if (is.bitis && is.bitis < sinir) isler.delete(id);
  }
}

function kuyruktanCikar(g) {
  const i = tekliKuyruk.indexOf(g);
  if (i !== -1) tekliKuyruk.splice(i, 1);
  for (const is of topluIsler) {
    const j = is.bekleyen.indexOf(g);
    if (j !== -1) is.bekleyen.splice(j, 1);
  }
}

function sonrakiGorev() {
  if (tekliKuyruk.length) return tekliKuyruk.shift();
  for (let n = 0; n < topluIsler.length; n++) {
    const idx = (rr + n) % topluIsler.length;
    const is = topluIsler[idx];
    if (is.bekleyen.length) {
      rr = (idx + 1) % topluIsler.length;
      return is.bekleyen.shift();
    }
  }
  return null;
}

function isiKapatmaKontrolu(is) {
  if (is.bitis) return;
  if (![...is.kalemler.values()].every((k) => BITMIS.includes(k.durum))) return;
  is.bitis = Date.now();
  is.faz = 'bitti';
  const i = topluIsler.indexOf(is);
  if (i !== -1) topluIsler.splice(i, 1);
}

function durumYaz(isSeti, kod, durum, ayrinti) {
  for (const is of isSeti) {
    const k = is.kalemler.get(kod);
    if (!k) continue;
    k.durum = durum;
    if (ayrinti) k.hata = ayrinti;
    isiKapatmaKontrolu(is);
  }
}

// Görevin kendi işine bildirdiği ilerleme (aşama, belge durumu, iptal)
function baglamKur(g) {
  return {
    faz: (f) => {
      for (const is of g.isler) if (!is.bitis) is.faz = f;
    },
    durum: (kod, durum, ayrinti) => durumYaz(g.isler, kod, durum, ayrinti),
    iptalMi: () => [...g.isler].some((is) => is.iptalIstegi),
    iptalEt: () => {
      for (const is of g.isler) {
        for (const k of is.kalemler.values()) if (!BITMIS.includes(k.durum)) k.durum = 'iptal';
        isiKapatmaKontrolu(is);
      }
    },
  };
}

// Biten (ya da çöken) toplu görevde tamamlanmamış kalan belgeler hata sayılır
function tamamlanmayanlariHataYap(g, mesaj) {
  for (const is of g.isler) {
    for (const k of is.kalemler.values()) {
      if (!BITMIS.includes(k.durum)) {
        k.durum = 'hata';
        k.hata = mesaj;
      }
    }
    isiKapatmaKontrolu(is);
  }
}

function pompala() {
  while (bosSlotlar.length) {
    const g = sonrakiGorev();
    if (!g) return;
    const slot = bosSlotlar.pop();
    g.durum = 'calisiyor';
    for (const is of g.isler) {
      is.faz = 'hazirlaniyor';
      // Tek görevde belge "üretiliyor"a geçer; toplu görev belgeleri kendisi ilerletir
      if (!g.toplu) {
        const k = is.kalemler.get(g.kod);
        if (k) k.durum = 'uretiliyor';
      }
    }
    const ctx = baglamKur(g);
    const basla = Date.now();
    Promise.resolve()
      .then(() => g.calistir(slot, { zorla: g.zorla, ctx }))
      .then(
        (sonuc) => {
          const durum = sonuc?.durum === 'guncel' ? 'guncel' : 'tamam';
          console.log(
            `[yazdir] ${g.tescilId} ${g.kod} ${g.toplu ? 'toplu-bitti' : durum} ${Date.now() - basla}ms ` +
              `slot=${slot} rss=${Math.round(process.memoryUsage().rss / 1048576)}MB`
          );
          if (g.toplu) tamamlanmayanlariHataYap(g, 'Tamamlanamadı');
          else ctx.durum(g.kod, durum);
        },
        (err) => {
          console.error(`[yazdir] ${g.tescilId} ${g.kod} HATA:`, err.message);
          if (g.toplu) tamamlanmayanlariHataYap(g, err.message);
          else ctx.durum(g.kod, 'hata', err.message);
        }
      )
      .finally(() => {
        bosSlotlar.push(slot);
        gorevler.delete(g.anahtar);
        pompala();
      });
  }
}

// kalemler: [{ kod, no, ad }]
// calistir(kod, slot, { zorla, ctx }): tek görevde kod dolu; toplu görevde kod = null
export function isBaslat({ tescilId, tip, ad, kalemler, zorla = false, calistir }) {
  temizle();
  const is = {
    id: randomUUID(),
    tescilId: String(tescilId),
    tip,
    ad,
    olusturma: Date.now(),
    bitis: null,
    faz: 'sirada',
    iptalIstegi: false,
    kalemler: new Map(),
    bekleyen: [],
  };
  isler.set(is.id, is);
  for (const kalem of kalemler) {
    is.kalemler.set(kalem.kod, { kod: kalem.kod, no: kalem.no, ad: kalem.ad, durum: 'bekliyor', hata: '' });
  }

  if (tip === 'toplu') {
    // Tüm iş tek görev: tek LibreOffice açılışıyla çevrilir
    const anahtar = gorevAnahtari(is.tescilId, 'toplu');
    const g = {
      anahtar,
      tescilId: is.tescilId,
      kod: 'toplu',
      toplu: true,
      oncelik: 1,
      zorla,
      durum: 'bekliyor',
      isler: new Set([is]),
      calistir: (slot, secenek) => calistir(null, slot, secenek),
    };
    gorevler.set(anahtar, g);
    is.bekleyen.push(g);
    topluIsler.push(is);
    pompala();
    return is.id;
  }

  for (const kalem of kalemler) {
    const anahtar = gorevAnahtari(is.tescilId, kalem.kod);
    const mevcut = gorevler.get(anahtar);
    if (mevcut) {
      // Aynı belge zaten kuyrukta/çalışıyor — aynı sonuca bağlan
      mevcut.isler.add(is);
      if (mevcut.durum === 'calisiyor') is.kalemler.get(kalem.kod).durum = 'uretiliyor';
      else mevcut.zorla = mevcut.zorla || zorla;
      continue;
    }
    const g = {
      anahtar,
      tescilId: is.tescilId,
      kod: kalem.kod,
      toplu: false,
      oncelik: 0,
      zorla,
      durum: 'bekliyor',
      isler: new Set([is]),
      calistir: (slot, secenek) => calistir(kalem.kod, slot, secenek),
    };
    gorevler.set(anahtar, g);
    tekliKuyruk.push(g);
  }
  isiKapatmaKontrolu(is);
  pompala();
  return is.id;
}

export function aktifTopluIs(tescilId) {
  for (const is of isler.values()) {
    if (is.tip === 'toplu' && is.tescilId === String(tescilId) && !is.bitis) return is.id;
  }
  return null;
}

export function tescildeAktifIsVar(tescilId) {
  return [...isler.values()].some((is) => is.tescilId === String(tescilId) && !is.bitis);
}

export function isIptal(tescilId, isId) {
  const is = isler.get(isId);
  if (!is || is.tescilId !== String(tescilId) || is.bitis) return false;

  if (is.tip === 'toplu') {
    const g = gorevler.get(gorevAnahtari(is.tescilId, 'toplu'));
    if (g && g.durum === 'bekliyor') {
      // Henüz başlamadı: görev tamamen kaldırılır
      kuyruktanCikar(g);
      gorevler.delete(g.anahtar);
      for (const k of is.kalemler.values()) k.durum = 'iptal';
      is.bekleyen = [];
      isiKapatmaKontrolu(is);
      return true;
    }
    // Word hazırlama sürüyorsa iptal istenir; PDF aşamasından sonra durdurulamaz
    if (is.faz === 'hazirlaniyor') {
      is.iptalIstegi = true;
      return true;
    }
    return false;
  }

  let iptalEdildi = false;
  for (const k of is.kalemler.values()) {
    if (k.durum !== 'bekliyor') continue;
    const g = gorevler.get(gorevAnahtari(is.tescilId, k.kod));
    if (g && g.durum === 'bekliyor') {
      g.isler.delete(is);
      // Başka işe bağlı değilse görev tamamen kaldırılır
      if (!g.isler.size) {
        kuyruktanCikar(g);
        gorevler.delete(g.anahtar);
      }
    }
    k.durum = 'iptal';
    iptalEdildi = true;
  }
  isiKapatmaKontrolu(is);
  return iptalEdildi;
}

const FAZ_YUZDE = { sirada: 0, hazirlaniyor: 20, cevriliyor: 55, kaydediliyor: 85, bitti: 100 };

function isOzeti(is) {
  const kalemler = [...is.kalemler.values()];
  const say = (d) => kalemler.filter((k) => d.includes(k.durum)).length;
  const calisan = kalemler.filter((k) => k.durum === 'uretiliyor').map(({ kod, no, ad }) => ({ kod, no, ad }));
  const wordHazir = say(WORD_HAZIR);
  const pdfHazir = say(PDF_HAZIR);
  // Bu iş sırada beklerken önündeki (başkalarına ait) görev sayısı
  let onunde = 0;
  if (!is.bitis && is.faz === 'sirada') {
    for (const g of gorevler.values()) {
      if (g.isler.has(is)) continue;
      // Tek yazdırma toplu işlerin bekleyen görevlerinin önüne geçer
      if (is.tip === 'tekli' && g.durum === 'bekliyor' && g.oncelik === 1) continue;
      onunde += 1;
    }
  }
  const yuzde = is.bitis
    ? 100
    : is.tip === 'toplu' && kalemler.length
      ? Math.round(((wordHazir + pdfHazir) / (2 * kalemler.length)) * 100)
      : FAZ_YUZDE[is.faz] ?? 0;
  return {
    id: is.id,
    tip: is.tip,
    ad: is.ad,
    durum: is.bitis ? (say(['hata']) ? 'hatali' : say(['iptal']) ? 'iptal' : 'bitti') : 'calisiyor',
    // sirada | hazirlaniyor (Word dolduruluyor) | cevriliyor (LibreOffice) | kaydediliyor | bitti
    faz: is.faz,
    yuzde,
    toplam: kalemler.length,
    tamamlanan: say(['tamam', 'guncel', 'hata', 'iptal']),
    wordHazir,
    pdfHazir,
    uretilen: say(['tamam']),
    atlanan: say(['guncel']),
    hatali: say(['hata']),
    hatalar: kalemler.filter((k) => k.durum === 'hata').map((k) => ({ ad: `${k.no}-${k.ad}`, mesaj: k.hata })),
    calisan,
    kalemler: kalemler.map(({ kod, durum }) => ({ kod, durum })),
    bekleyen: say(['bekliyor']),
    onunde,
    iptalEdilebilir:
      !is.bitis && (is.tip === 'toplu' ? is.faz === 'sirada' || is.faz === 'hazirlaniyor' : say(['bekliyor']) > 0),
    olusturma: is.olusturma,
    bitis: is.bitis,
    // Bitişten bu yana geçen süre (ms): istemci saatinden bağımsız
    bitisSonra: is.bitis ? Date.now() - is.bitis : null,
  };
}

export function tescilIsleri(tescilId) {
  temizle();
  return {
    isler: [...isler.values()]
      .filter((is) => is.tescilId === String(tescilId))
      .sort((a, b) => a.olusturma - b.olusturma)
      .map(isOzeti),
    genelBekleyen: gorevler.size,
    paralel: PARALEL,
  };
}
