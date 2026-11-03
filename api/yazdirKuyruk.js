import { randomUUID } from 'node:crypto';

// Yazdırma (DOCX doldurma + PDF çevirme) için sunucu geneli iş kuyruğu.
//
// - Aynı anda en fazla YAZDIR_PARALEL görev çalışır (varsayılan 1: Render
//   Free 512 MB'ta tek LibreOffice güvenli). Her çalışan kendi "slot"unu
//   (LibreOffice profil dizini) kullanır, birbirini kilitlemez.
// - Tek yazdırma (öncelik 0) toplu yazdırmanın (öncelik 1) önüne geçer.
// - Toplu işler kendi aralarında sırayla (round-robin) ilerler: biri 36
//   belge yollasa da diğerleri arkada kalmaz.
// - Aynı tescil + aynı belge zaten kuyruktaysa/çalışıyorsa ikinci istek yeni
//   görev açmaz, aynı sonuca bağlanır (çift üretim ve R2'de yetim dosya olmaz).
// - Durum bellektedir; sunucu yeniden başlarsa kuyruk kaybolur, ama hangi
//   belgelerin üretildiği veritabanındadır (değişmeyen belge tekrar çevrilmez).

const PARALEL = Math.max(1, Number(process.env.YAZDIR_PARALEL) || 1);
const IS_SAKLAMA_MS = 10 * 60 * 1000;

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

function kuyrukluGorev(g) {
  return g.durum === 'bekliyor';
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

function isBittiMi(is) {
  return [...is.kalemler.values()].every((k) => ['tamam', 'guncel', 'hata', 'iptal'].includes(k.durum));
}

function isiKapatmaKontrolu(is) {
  if (is.bitis || !isBittiMi(is)) return;
  is.bitis = Date.now();
  const i = topluIsler.indexOf(is);
  if (i !== -1) topluIsler.splice(i, 1);
}

function gorevBitti(g, durum, ayrinti) {
  for (const is of g.isler) {
    const k = is.kalemler.get(g.kod);
    if (k) {
      k.durum = durum;
      if (ayrinti) k.hata = ayrinti;
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
      const k = is.kalemler.get(g.kod);
      if (k) k.durum = 'uretiliyor';
    }
    const basla = Date.now();
    Promise.resolve()
      .then(() => g.calistir(slot, { zorla: g.zorla }))
      .then(
        (sonuc) => {
          const durum = sonuc?.durum === 'guncel' ? 'guncel' : 'tamam';
          console.log(
            `[yazdir] ${g.tescilId} ${g.kod} ${durum} ${Date.now() - basla}ms slot=${slot} ` +
              `rss=${Math.round(process.memoryUsage().rss / 1048576)}MB`
          );
          gorevBitti(g, durum);
        },
        (err) => {
          console.error(`[yazdir] ${g.tescilId} ${g.kod} HATA:`, err.message);
          gorevBitti(g, 'hata', err.message);
        }
      )
      .finally(() => {
        bosSlotlar.push(slot);
        gorevler.delete(g.anahtar);
        pompala();
      });
  }
}

// kalemler: [{ kod, no, ad }]; calistir(kod, slot, { zorla }) => Promise<{ durum }>
export function isBaslat({ tescilId, tip, ad, kalemler, zorla = false, calistir }) {
  temizle();
  const is = {
    id: randomUUID(),
    tescilId: String(tescilId),
    tip,
    ad,
    olusturma: Date.now(),
    bitis: null,
    kalemler: new Map(),
    bekleyen: [],
  };
  isler.set(is.id, is);
  const oncelik = tip === 'tekli' ? 0 : 1;

  for (const kalem of kalemler) {
    is.kalemler.set(kalem.kod, { kod: kalem.kod, no: kalem.no, ad: kalem.ad, durum: 'bekliyor', hata: '' });
    const anahtar = gorevAnahtari(is.tescilId, kalem.kod);
    const mevcut = gorevler.get(anahtar);
    if (mevcut) {
      // Aynı belge zaten kuyrukta/çalışıyor — aynı sonuca bağlan
      mevcut.isler.add(is);
      if (mevcut.durum === 'calisiyor') {
        is.kalemler.get(kalem.kod).durum = 'uretiliyor';
      } else {
        mevcut.zorla = mevcut.zorla || zorla;
        if (oncelik === 0 && mevcut.oncelik === 1) {
          // Toplu işteki bekleyen görev, tek yazdırma isteğiyle öne alınır
          kuyruktanCikar(mevcut);
          mevcut.oncelik = 0;
          tekliKuyruk.push(mevcut);
        }
      }
      continue;
    }
    const g = {
      anahtar,
      tescilId: is.tescilId,
      kod: kalem.kod,
      oncelik,
      zorla,
      durum: 'bekliyor',
      isler: new Set([is]),
      calistir: (slot, secenek) => calistir(kalem.kod, slot, secenek),
    };
    gorevler.set(anahtar, g);
    if (oncelik === 0) tekliKuyruk.push(g);
    else is.bekleyen.push(g);
  }

  if (oncelik === 1 && is.bekleyen.length) topluIsler.push(is);
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
  for (const k of is.kalemler.values()) {
    if (k.durum !== 'bekliyor') continue;
    const g = gorevler.get(gorevAnahtari(is.tescilId, k.kod));
    if (g && kuyrukluGorev(g)) {
      g.isler.delete(is);
      // Başka işe bağlı değilse görev tamamen kaldırılır
      if (!g.isler.size) {
        kuyruktanCikar(g);
        gorevler.delete(g.anahtar);
      }
    }
    k.durum = 'iptal';
  }
  is.bekleyen = [];
  isiKapatmaKontrolu(is);
  return true;
}

function isOzeti(is) {
  const kalemler = [...is.kalemler.values()];
  const say = (d) => kalemler.filter((k) => d.includes(k.durum)).length;
  const calisan = kalemler.filter((k) => k.durum === 'uretiliyor').map(({ kod, no, ad }) => ({ kod, no, ad }));
  const bekleyen = say(['bekliyor']);
  // Bu işte çalışan yokken, kuyrukta önündeki (başkalarına ait) görev sayısı
  let onunde = 0;
  if (!is.bitis && !calisan.length) {
    for (const g of gorevler.values()) {
      if (g.isler.has(is)) continue;
      // Tek yazdırma toplu işlerin bekleyen görevlerinin önüne geçer
      if (is.tip === 'tekli' && g.durum === 'bekliyor' && g.oncelik === 1) continue;
      onunde += 1;
    }
  }
  return {
    id: is.id,
    tip: is.tip,
    ad: is.ad,
    durum: is.bitis ? (say(['hata']) ? 'hatali' : say(['iptal']) ? 'iptal' : 'bitti') : 'calisiyor',
    toplam: kalemler.length,
    tamamlanan: say(['tamam', 'guncel', 'hata', 'iptal']),
    uretilen: say(['tamam']),
    atlanan: say(['guncel']),
    hatali: say(['hata']),
    hatalar: kalemler.filter((k) => k.durum === 'hata').map((k) => ({ ad: `${k.no}-${k.ad}`, mesaj: k.hata })),
    calisan,
    kalemler: kalemler.map(({ kod, durum }) => ({ kod, durum })),
    bekleyen,
    onunde,
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
