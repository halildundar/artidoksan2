import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import TabsPage from '../views/TabsPage.vue'

const routes: Array<RouteRecordRaw> = [
  // Tam sayfa formlar — sekme düzeninin dışında, alt menü görünmez
  {
    path: '/firma/yeni',
    component: () => import('@/views/FirmaFormPage.vue')
  },
  {
    path: '/firma/:id/duzenle',
    component: () => import('@/views/FirmaFormPage.vue')
  },
  {
    path: '/ayarlar/onayli-kurumlar/yeni',
    component: () => import('@/views/OnayliKurumFormPage.vue')
  },
  {
    path: '/ayarlar/onayli-kurumlar/:id/duzenle',
    component: () => import('@/views/OnayliKurumFormPage.vue')
  },
  {
    // Yeni asansör: önce ÖN BİLGİ formu doldurulur, kaydedince detaya geçilir
    path: '/asansor/yeni',
    component: () => import('@/views/AsansorOnBilgiPage.vue')
  },
  {
    path: '/asansor/:id/on-bilgi',
    component: () => import('@/views/AsansorOnBilgiPage.vue')
  },
  {
    // Detay: buton grubu (şema modalları) + bölüm özetleri
    path: '/asansor/:id',
    component: () => import('@/views/AsansorDetayPage.vue')
  },
  {
    // Tam form: tüm teknik alanların akordeon formu (detaydan "Tam Form" ile)
    path: '/asansor/:id/duzenle',
    component: () => import('@/views/AsansorFormPage.vue')
  },
  {
    path: '/ayarlar/guvenlik-aksamlari/yeni',
    component: () => import('@/views/CeBelgesiFormPage.vue')
  },
  {
    path: '/ayarlar/guvenlik-aksamlari/:id/duzenle',
    component: () => import('@/views/CeBelgesiFormPage.vue')
  },
  {
    // Denetim detayı (Modul G): ek proje + tarih girişleri
    path: '/denetim/:id',
    component: () => import('@/views/DenetimDetayPage.vue')
  },
  {
    // Tescil detayı: Modul G ile aynı içerik + CE belge seçimi
    path: '/tescil/:id',
    component: () => import('@/views/TescilDetayPage.vue')
  },
  {
    path: '/ayarlar/smm-firmalari/yeni',
    component: () => import('@/views/SmmFirmaFormPage.vue')
  },
  {
    path: '/ayarlar/smm-firmalari/:id/duzenle',
    component: () => import('@/views/SmmFirmaFormPage.vue')
  },
  {
    path: '/ayarlar/danismanlar/yeni',
    component: () => import('@/views/DanismanFormPage.vue')
  },
  {
    path: '/ayarlar/danismanlar/:id/duzenle',
    component: () => import('@/views/DanismanFormPage.vue')
  },
  {
    path: '/',
    component: TabsPage,
    children: [
      {
        path: '',
        redirect: '/anasayfa'
      },
      {
        path: 'anasayfa',
        component: () => import('@/views/AnasayfaPage.vue')
      },
      {
        path: 'asansor',
        component: () => import('@/views/AsansorPage.vue')
      },
      {
        path: 'guv-aksam',
        component: () => import('@/views/GuvenlikAksamiPage.vue')
      },
      {
        path: 'rapor',
        component: () => import('@/views/RaporPage.vue')
      },
      {
        path: 'denetim',
        component: () => import('@/views/DenetimPage.vue')
      },
      {
        path: 'tescil',
        component: () => import('@/views/TescilPage.vue')
      },
      {
        path: 'firma',
        component: () => import('@/views/FirmaPage.vue')
      },
      {
        path: 'ayarlar',
        component: () => import('@/views/AyarlarPage.vue')
      },
      {
        path: 'ayarlar/onayli-kurumlar',
        component: () => import('@/views/OnayliKurumlarPage.vue')
      },
      {
        path: 'ayarlar/danismanlar',
        component: () => import('@/views/DanismanlarPage.vue')
      },
      {
        // CE belge kataloğu içeriği Güvenlik Aksamlar'a taşındı (kullanıcı
        // isteği) — CE Belgeleri şimdilik boş placeholder.
        path: 'ayarlar/ce-belgeleri',
        component: () => import('@/views/AyarAltSayfasi.vue'),
        meta: { baslik: 'CE Belgeleri' }
      },
      {
        path: 'ayarlar/guvenlik-aksamlari',
        component: () => import('@/views/CeBelgeleriPage.vue')
      },
      {
        path: 'ayarlar/smm-firmalari',
        component: () => import('@/views/SmmFirmalariPage.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
