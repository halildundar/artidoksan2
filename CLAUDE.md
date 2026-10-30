# CLAUDE.md

Bu dosya, bu depoda çalışan Claude Code için proje rehberidir.

## Dil

- Kullanıcıyla **Türkçe** konuş. Kod, değişken adları ve commit mesajları İngilizce olabilir.

## Proje Nedir?

Tek kod tabanından **Web + Android + iOS** hedefleyen bir mobil/web uygulaması.

- **Çatı:** Vue 3 (Composition API, `<script setup lang="ts">`)
- **Mobil katman:** Ionic Vue — yalnızca **iskelet** olarak (`ion-app`, `ion-page`, `ion-content`, `ion-router-outlet`, sayfa geçişleri, geri tuşu, safe area)
- **Görsel katman:** **Tailwind CSS** + projenin kendi komponentleri. `ion-button`, `ion-card` gibi görsel Ionic bileşenlerini KULLANMA; görünüm Tailwind ile yazılır.
- **Native paketleme:** Capacitor (Android yerelde, iOS bulut build — Codemagic)
- **Build aracı:** Vite
- **Backend:** Ayrı bir Node.js/Express API (bu depoda değil). Tüm HTTP çağrıları `src/services/` altındaki servis katmanından yapılır; komponent içinden doğrudan `fetch` çağırma.

## Komutlar

```bash
npm install              # bağımlılıkları kur
ionic serve              # geliştirme sunucusu (http://localhost:8100, hot reload)
ionic build              # üretim derlemesi → dist/
npx vue-tsc --noEmit     # tip kontrolü
npm run lint             # ESLint
ionic cap sync           # dist/ içeriğini android/ ve ios/ projelerine kopyala
ionic cap open android   # Android Studio'da aç
```

Her `ionic build` sonrası native test için `ionic cap sync` gerekir.

## Dizin Yapısı

```
src/
├── views/        # Sayfalar (her biri ion-page ile sarılı, route hedefi)
├── components/   # Yeniden kullanılabilir Tailwind komponentleri
├── services/     # API çağrıları (axios/fetch sarmalayıcıları)
├── stores/       # Pinia store'ları
├── router/       # Vue Router tanımları
└── theme/        # Global CSS, Tailwind girişi
```

## Kod Kuralları

- Vue SFC'lerde sıralama: `<script setup lang="ts">` → `<template>` → `<style>` (style'a nadiren ihtiyaç olmalı; önce Tailwind).
- Her yeni sayfa (`src/views/`):
  - En dışta `<ion-page>`, içinde `<ion-content>` bulunur (geçiş animasyonları ve kaydırma için zorunlu).
  - `src/router/index.ts` dosyasına route eklenir.
- Mobile-first: önce dar ekran (~390px) tasarla, `md:`/`lg:` ile genişlet.
- Safe area: tam ekran/sabit öğelerde `env(safe-area-inset-*)` değerlerini hesaba kat (ion-content kendi içeriğinde bunu halleder).
- Durum yönetimi: sayfalar arası paylaşılan veri Pinia'da; tek sayfalık durum `ref`/`computed` ile komponentte kalır.
- API taban adresi `.env` dosyalarından okunur (`VITE_API_URL`); koda sabit URL yazma.
- Native özellik gerektiğinde önce resmi Capacitor eklentisine bak (`@capacitor/*`); web fallback'ini her zaman düşün.

## Yapma

- Görsel Ionic bileşenleri ekleme (ion-button, ion-card, ion-list...) — tasarım dili Tailwind'dir.
- `android/` ve `ios/` klasörlerindeki üretilmiş dosyaları elle düzenleme (Capacitor yeniden üretir); yapılandırma `capacitor.config.ts` üzerinden yapılır.
- Kullanıcıya sormadan yeni UI kütüphanesi ekleme.
