import { createApp, h, type Component } from 'vue';
import type { Asansor } from '@/services/asansorService';
import RayOlculeriModal from '@/components/sema/RayOlculeriModal.vue';
import KabinOlculeriModal from '@/components/sema/KabinOlculeriModal.vue';
import KapiOlculeriModal from '@/components/sema/KapiOlculeriModal.vue';
import HalatKasnaklarModal from '@/components/sema/HalatKasnaklarModal.vue';
import KuyuDipAlaniModal from '@/components/sema/KuyuDipAlaniModal.vue';
import KuyuUstAlaniModal from '@/components/sema/KuyuUstAlaniModal.vue';
import type { KapiOlcum } from '@/components/sema/kapiKilitleriTipleri';

// Denetim PDF raporuna giren şema çizimleri: asansör detayındaki şema
// modalları (kabin, kapı, halat/kasnak, ray, kuyu dip, kuyu üst) asansörün
// ölçüleriyle gizlice mount edilir ve içlerindeki SVG'ler serileştirilir.
// Mount → serileştir → unmount tek senkron akışta yapıldığı için tarayıcı
// hiç boyamaz, ekranda bir şey görünmez. Renkler PDF'in beyaz zeminine göre
// somutlaştırılır (CSS sınıfları PDF'e taşınmadığından attribute'a yazılır).

const INK = '#374151';
const OLCU_RENK = '#5b7265';
const RISK_RENK = '#dc2626';

// currentColor, en yakın atadaki inline color stiline (risk kırmızısı gibi)
// çözülür; yoksa varsayılan mürekkep rengi kullanılır.
function renkCoz(el: Element): string {
  let p: Element | null = el;
  while (p) {
    const renk = (p as HTMLElement).style?.color;
    if (renk) return renk;
    p = p.parentElement;
  }
  return INK;
}

function svgSerilestir(svgEl: SVGSVGElement): string {
  const kopya = svgEl.cloneNode(true) as SVGSVGElement;
  kopya.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const hepsi = [kopya, ...Array.from(kopya.querySelectorAll('*'))];
  for (const el of hepsi) {
    if (el.getAttribute('fill') === 'currentColor') el.setAttribute('fill', renkCoz(el));
    if (el.getAttribute('stroke') === 'currentColor') el.setAttribute('stroke', renkCoz(el));
    if (el.classList.contains('sema-olcu-cizgi')) {
      el.setAttribute(
        'stroke',
        el.classList.contains('sema-olcu-cizgi--risk') ? RISK_RENK : OLCU_RENK
      );
      el.setAttribute('stroke-dasharray', '1.5 4.5');
      el.setAttribute('stroke-linecap', 'round');
    }
  }
  return new XMLSerializer().serializeToString(kopya);
}

// Bileşeni gizlice mount eder, ürettiği .sema-svg çizimlerini sırayla döner.
function bilesenSvgleri(bilesen: Component, propsObj: Record<string, unknown>): string[] {
  const oncekiler = new Set(Array.from(document.querySelectorAll('svg.sema-svg')));
  const kap = document.createElement('div');
  document.body.appendChild(kap);
  const app = createApp({ render: () => h(bilesen, { open: true, ...propsObj }) });
  try {
    app.mount(kap);
    return Array.from(document.querySelectorAll('svg.sema-svg'))
      .filter((el) => !oncekiler.has(el))
      .map((el) => svgSerilestir(el as SVGSVGElement));
  } finally {
    app.unmount();
    kap.remove();
  }
}

// PDF'teki bölüm başlığı → o bölümün tablosunun altına girecek SVG'ler.
// Başlıklar utils/asansorBilgi.ts'teki asansorBolumleri başlıklarıyla birebir.
export function asansorSemaCizimleri(a: Asansor): Record<string, string[]> {
  const sonuc: Record<string, string[]> = {};
  const ekle = (anahtar: string, bilesen: Component, propsObj: Record<string, unknown>) => {
    try {
      const svgler = bilesenSvgleri(bilesen, propsObj);
      if (svgler.length) sonuc[anahtar] = [...(sonuc[anahtar] ?? []), ...svgler];
    } catch {
      /* şema üretilemezse rapor o bölümde şekilsiz devam eder */
    }
  };

  ekle('Kabin & Ağırlıklar', KabinOlculeriModal, {
    kabinGenislik: a.kabinGenislik ?? null,
    kabinDerinlik: a.kabinDerinlik ?? null,
    kabinIciAydinlatma: a.kabinIciAydinlatma ?? null,
    girisTipi: a.kabinGirisTipi ?? null,
    panelMalzemesi: a.kabinPanelMalzemesi ?? null,
    camBelgesi: null, // şema için gerekmez; önizleme istekleri tetiklenmesin
    fotolar: [],
  });

  // Kapı şeması giriş başına ayrı SVG üretir (çift girişte iki çizim)
  const girisKur = (girisNo: 1 | 2): KapiOlcum => {
    const [panel, yon, genislik, yukseklik, malzeme, riskDuraklar] =
      girisNo === 1
        ? [a.giris1PanelSayisi, a.giris1KapiYonu, a.giris1KapiGenislik, a.giris1KapiYukseklik,
           a.giris1PanelMalzemesi, a.giris1DusukKapiDuraklari] as const
        : [a.giris2PanelSayisi, a.giris2KapiYonu, a.giris2KapiGenislik, a.giris2KapiYukseklik,
           a.giris2PanelMalzemesi, a.giris2DusukKapiDuraklari] as const;
    return {
      panel: Math.min(Math.max(panel ?? 2, 2), 4),
      yon: (yon as KapiOlcum['yon']) ?? 'sol',
      genislik: genislik ?? null,
      yukseklik: yukseklik ?? null,
      riskDuraklar: [...(riskDuraklar ?? [])],
      panelMalzemesi: (malzeme as KapiOlcum['panelMalzemesi']) ?? 'paslanmaz',
      camBelgesi: null,
      fotolar: [],
    };
  };
  try {
    const kapiSvgleri = bilesenSvgleri(KapiOlculeriModal, {
      girisler: a.kabinGirisTipi === 'cift' ? [girisKur(1), girisKur(2)] : [girisKur(1)],
      duraklar: (a.katYukseklikleri ?? []).map((k) => k.kat),
    });
    kapiSvgleri.forEach((svg, i) => {
      const anahtar = i === 0 ? 'Giriş 1 Kapısı' : 'Giriş 2 Kapısı';
      sonuc[anahtar] = [...(sonuc[anahtar] ?? []), svg];
    });
  } catch {
    /* şema üretilemezse rapor o bölümde şekilsiz devam eder */
  }

  ekle('Halat & Kasnaklar', HalatKasnaklarModal, {
    tahrikKasnagiCapi: a.tahrikKasnakCapi ?? null,
    sapturmaKasnagiCapi: a.halatSapturmaKasnagiCapi ?? null,
    palanga1Capi: a.halatPalanga1Capi ?? null,
    palanga2Capi: a.halatPalanga2Capi ?? null,
    palanga3Capi: a.halatPalanga3Capi ?? null,
    halatSekli: a.halatSekli ?? null,
    halatAdedi: a.halatAdet ?? null,
    halatMesafesi: a.askiHalatArasiMesafe ?? null,
    halatTipi: a.halatTipi || null,
    dikeyMesafe: a.kasnaklarArasiDikeyMesafe ?? null,
    yatayMesafe: a.kasnaklarArasiYatayMesafe ?? null,
    sarimAcisi: a.sarimAcisi ?? null,
    palangaKonumu: a.kabinPalangaKonumu && a.kabinPalangaKonumu !== 'yok' ? a.kabinPalangaKonumu : null,
    askiTipi: a.askiTipi ?? null,
  });

  ekle('Raylar', RayOlculeriModal, {
    karsiAgirlikRayArasi: a.karsiAgirlikRayArasi ?? null,
    kabinRayArasi: a.kabinRayArasi ?? null,
    rayRR: a.rayRR ?? null,
    rayRK: a.rayRK ?? null,
    kuyuGenislik: a.kuyuGenislik ?? null,
    kuyuDerinlik: a.kuyuDerinlik ?? null,
    kabinRayTipi: a.kabinRayTipi || null,
    karsiAgirlikRayTipi: a.karsiAgirlikRayTipi || null,
    agirlikKonumu: a.karsiAgirlikKonumu || null,
  });

  ekle('Kuyu Dip Alanı', KuyuDipAlaniModal, {
    kuyuDipYuksekligi: a.kuyuDipYukseklik ?? null,
    kabinEnAltNokta: a.kuyuDipKabinEnAltNokta ?? null,
    etekSaciMesafe: a.kuyuDipEtekSaciTabanMesafe ?? null,
    ivOlcusu: a.kuyuDipIvOlcusu ?? null,
    bosluk: a.kuyuDipBosluk ?? null,
    stroke: a.kuyuDipTamponStroke ?? null,
    durmaAlani: a.kuyuDipDurmaAlani ?? null,
    karsiBosluk: a.kuyuDipKarsiBosluk ?? null,
    karsiStroke: a.kuyuDipKarsiStroke ?? null,
    hiz: a.hiz ?? null,
  });

  ekle('Kuyu Üst Alanı', KuyuUstAlaniModal, {
    korkulukMesafe: a.kuyuUstKorkulukMesafe ?? null,
    korkulukYuksekligi: a.kuyuUstKorkulukYuksekligi ?? null,
    suspansiyonMesafe: a.kuyuUstSuspansiyonMesafe ?? null,
    kabinUstDurma: a.kuyuUstKabinUstDurma ?? null,
    sonKat: a.kuyuUstSonKat ?? null,
    durmaAlani: a.kuyuUstDurmaAlani ?? null,
    hiz: a.hiz ?? null,
    dipBosluk: a.kuyuDipKarsiBosluk ?? null,
    dipStroke: a.kuyuDipKarsiStroke ?? null,
  });

  return sonuc;
}
