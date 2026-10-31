import { ref } from 'vue';

// Koyu/açık tema anahtarı (Ayarlar'daki toggle). Koyu varsayılandır; seçim
// cihazda saklanır. Açık tema, html köküne .acik-tema sınıfı konarak çalışır
// (bkz. theme/tailwind.css ve theme/variables.css'teki ezme blokları).
type Tema = 'koyu' | 'acik';

const ANAHTAR = 'tema';
const tema = ref<Tema>('koyu');

function uygula(yeni: Tema) {
  tema.value = yeni;
  const kok = document.documentElement;
  kok.classList.toggle('acik-tema', yeni === 'acik');
  // Form kontrolleri/kaydırma çubukları temayla uyumlu çizilsin
  kok.style.colorScheme = yeni === 'acik' ? 'light' : 'dark';
  // Kurulu PWA'da üst sistem şeridi rengi (anlık; kurulumdaki manifest rengi
  // yalnız ilk boyamada kullanılır)
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', yeni === 'acik' ? '#dfeae2' : '#1c2a21');
  try {
    localStorage.setItem(ANAHTAR, yeni);
  } catch {
    /* gizli pencere vb. — tema yine uygulanır, sadece hatırlanmaz */
  }
}

export function useTema() {
  function baslat() {
    let kayitli: string | null = null;
    try {
      kayitli = localStorage.getItem(ANAHTAR);
    } catch {
      /* okunamazsa koyu kalır */
    }
    uygula(kayitli === 'acik' ? 'acik' : 'koyu');
  }

  function degistir() {
    uygula(tema.value === 'acik' ? 'koyu' : 'acik');
  }

  return { tema, baslat, degistir };
}
