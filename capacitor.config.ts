import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.firman.artidoksa',
  appName: 'TüvNord Asansör',
  webDir: 'dist',
  // Native uygulamalar gömülü kopya yerine CANLI SİTEYİ yükler (kullanıcı
  // kararı, 30 Eki 2026): her git push sonrası Android/iOS da kendiliğinden
  // güncellenir, mağaza/apk dağıtımı gerekmez. Çevrimdışı açılış service
  // worker önbelleğiyle sağlanır (ilk açılış internetli olmalı). Gömülü moda
  // dönmek için server bloğunu kaldırıp yeniden derleyin.
  server: {
    url: 'https://artidoksan2.onrender.com',
  },
  ios: {
    // WKWebView'da service worker yalnız "app-bound" alanlarda çalışır —
    // çevrimdışı açılış için şart (Info.plist'teki WKAppBoundDomains ile).
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    // Durum çubuğu header'la aynı koyu yeşil; koyu zemin → açık ikonlar
    StatusBar: {
      backgroundColor: '#1c2a21',
      style: 'DARK',
    },
  },
};

export default config;
