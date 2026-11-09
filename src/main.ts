import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import { useAuth, setGirisHedefi } from '@/composables/useAuth';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

import { IonicVue } from '@ionic/vue';

/*
 * Tüm global CSS tek girişten yüklenir (Ionic iskelet CSS'leri, tema ve Tailwind).
 * Ionic CSS'leri Tailwind'in base katmanına alındığı için utility sınıfları
 * Ionic reset'lerini ezebilir — ayrıntı için theme/tailwind.css'e bak.
 */
import './theme/tailwind.css';

const app = createApp(App)
  .use(IonicVue)
  .use(router);

// Açılışta kayıtlı oturum geri yüklenir; süre dolarsa giriş ekranına yönlendirilir
const auth = useAuth();
// Oturum bitince giriş ekranına gidilir; mevcut sayfa girişten sonra dönülmek üzere bellekte tutulur (adreste sorgu yok)
const girisYonelt = () => {
  const yol = router.currentRoute.value;
  if (!yol.meta.acik) setGirisHedefi(yol.fullPath);
  router.replace('/giris');
};
Promise.all([router.isReady(), auth.baslat(girisYonelt)]).then(() => {
  app.mount('#app');
});

// Android/iOS: uygulama arka plandan öne gelince oturum süresi ve sunucu durumu bir kez kontrol edilir
// (web'de aynısını visibilitychange yapar)
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) void auth.geriDonusKontrolu();
  });
}
