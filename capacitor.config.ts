import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.firman.artidoksa',
  appName: 'TüvNord Asansör',
  webDir: 'dist',
  // Native uygulamalar gömülü kopya yerine CANLI SİTEYİ yükler (kullanıcı
  // kararı, 30 Eki 2026): her git push sonrası Android/iOS da kendiliğinden
  // güncellenir, mağaza/apk dağıtımı gerekmez. Bedeli: internetsiz açılmaz.
  // Gömülü moda dönmek için server bloğunu kaldırıp yeniden derleyin.
  server: {
    url: 'https://artidoksan2.onrender.com',
  },
};

export default config;
