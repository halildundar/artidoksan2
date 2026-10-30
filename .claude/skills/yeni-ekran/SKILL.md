---
name: yeni-ekran
description: Projeye yeni bir sayfa/ekran ekler — ion-page iskeletli, Tailwind görünümlü bir view, route kaydı ve gerekiyorsa Pinia store ile. Kullanıcı "yeni ekran", "yeni sayfa", "X ekranı ekle" dediğinde kullan.
---

# Yeni Ekran Ekleme

Projeye yeni bir ekran eklerken bu adımları sırayla uygula.

## 1. Bilgi topla

Kullanıcıdan şunlar net değilse kısaca sor (tahmin etme):
- Ekranın adı ve amacı (ör. "Projeler listesi", "Ayarlar")
- Alt sekme çubuğunda mı görünecek, yoksa başka bir ekrandan mı açılacak?
- Hangi API verisini gösterecek / hangi aksiyonları yapacak?

## 2. View dosyasını oluştur

`src/views/<Ad>Page.vue` — şu iskeletle:

```vue
<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue'
// veri ve mantık buraya
</script>

<template>
  <ion-page>
    <ion-content>
      <div class="mx-auto max-w-lg p-4">
        <h1 class="text-2xl font-bold">Başlık</h1>
        <!-- içerik: tamamen Tailwind + proje komponentleri -->
      </div>
    </ion-content>
  </ion-page>
</template>
```

Kurallar:
- En dış `<ion-page>` ve içinde `<ion-content>` ZORUNLU (sayfa geçişleri ve kaydırma bunlara bağlı).
- Görünüm için Tailwind kullan; görsel Ionic bileşeni (ion-button, ion-card vb.) ekleme.
- Üst bar gerekiyorsa onu da Tailwind ile yaz (sticky header div), `ion-header` kullanma.

## 3. Route ekle

`src/router/index.ts` içine route kaydını ekle. Sekmeli ekransa `/tabs/` altındaki children'a, değilse kök seviyeye ekle. Lazy import kullan:

```ts
{ path: 'projeler', component: () => import('@/views/ProjelerPage.vue') }
```

## 4. Veri katmanı

- API verisi gerekiyorsa çağrıyı `src/services/` altındaki ilgili servise ekle (yoksa oluştur); komponent içinden doğrudan fetch yapma.
- Ekranlar arası paylaşılan durum gerekiyorsa `src/stores/` altında Pinia store oluştur.
- Yükleniyor / boş / hata durumlarının üçünü de template'te ele al.

## 5. Doğrula

- `npx vue-tsc --noEmit` ile tip kontrolü yap.
- `ionic serve` çalışıyorsa tarayıcıda ekranı aç(tır), rotanın çalıştığını söyle.
- Kullanıcıya tek satırla ne eklendiğini ve hangi URL'de görebileceğini bildir.
