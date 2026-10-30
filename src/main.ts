import { createApp } from 'vue'
import App from './App.vue'
import router from './router';

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

router.isReady().then(() => {
  app.mount('#app');
});
