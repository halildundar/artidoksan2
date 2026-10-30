# Vue 3 → Web + Android + iOS — VS Code Kurulum Rehberi

> Tek kod tabanıyla önce web, sonra Android/iOS uygulaması: **Ionic (iskelet) + Vue 3 + Tailwind (görünüm) + Capacitor** kurulumu, adım adım.
>
> Bu klasördeki `CLAUDE.md` ve `.claude/skills/` dosyaları, projeyi VS Code'da **Claude Code** ile geliştirmen içindir — kurulumun sonunda proje klasörüne kopyalanacaklar (Bölüm 11).

---

## 1. Ön Gereksinimler

### 1.1 Node.js (LTS)
```bash
node -v    # v20+ önerilir
npm -v
```
Kurulu değilse: https://nodejs.org

### 1.2 Git
```bash
git --version
```
Kurulu değilse: https://git-scm.com

### 1.3 VS Code Eklentileri
**Extensions** panelinden (Ctrl+Shift+X) kur:

| Eklenti | Ne işe yarar |
|---|---|
| **Vue - Official (Volar)** | Vue 3 dil desteği, otomatik tamamlama |
| **Ionic** | Ionic komutlarını panel üzerinden çalıştırma (opsiyonel) |
| **ESLint** | Kod kalitesi |
| **Prettier** | Kod formatlama |

---

## 2. Ionic CLI Kurulumu

VS Code içinde terminal aç (Ctrl+`):

```bash
npm install -g @ionic/cli
ionic --version
```

---

## 3. Projeyi Oluştur

```bash
ionic start uygulamam tabs --type=vue
```

- `uygulamam` → proje/klasör adı
- `tabs` → alt sekmeli hazır şablon (`blank` = boş, `sidemenu` = yan menülü)
- `--type=vue` → Vue 3

Soru gelirse: "Create free Ionic account?" → **No**

Projeyi VS Code'da aç:

```bash
cd uygulamam
code .
```

---

## 4. Aşama 1 — Web'de Geliştir 🌐

```bash
ionic serve
```

- `http://localhost:8100` açılır, **hot reload** aktif
- Tarayıcıda **F12 → Ctrl+Shift+M** ile telefon görünümünde test et
- `ionic serve --lab` → iOS ve Android görünümü yan yana

### Tailwind CSS'i kur (görünüm katmanımız)

Hibrit yaklaşımımız: **Ionic yalnızca iskelet** (`ion-page`, `ion-content`, sayfa geçişleri, geri tuşu, safe area), **görünümün tamamı Tailwind** ve kendi komponentlerin.

```bash
npm install -D tailwindcss @tailwindcss/vite
```

`vite.config.ts` içine ekle:

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // ...
})
```

`src/theme/` altındaki global CSS dosyasının (veya `src/main.ts`'de import edilen bir `tailwind.css`'in) en üstüne:

```css
@import "tailwindcss";
```

> Not: Tailwind v4 kurulumu budur. Projende Tailwind v3 çıkarsa klasik `npx tailwindcss init -p` yolunu izle — Claude Code'a "Tailwind'i kur" demen de yeterli.

Örnek sayfa deseni:

```vue
<template>
  <ion-page>          <!-- Ionic: iskelet -->
    <ion-content>
      <div class="mx-auto max-w-lg p-4 space-y-4">   <!-- Tailwind: görünüm -->
        <h1 class="text-2xl font-bold">Projeler</h1>
        <button class="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white">
          Yeni Proje
        </button>
      </div>
    </ion-content>
  </ion-page>
</template>
```

### Mobile-first altın kurallar (sonradan pişman olmamak için)
- ✅ Tasarımı **önce telefon ekranına göre** yap, `md:`/`lg:` ile masaüstüne genişlet
- ✅ Her sayfada `ion-page` + `ion-content` iskeletini koru (geçişler ve kaydırma buna bağlı); içini Tailwind'le doldur
- ✅ Görsel Ionic bileşenleri (`ion-button`, `ion-card`...) kullanma — tasarım dili Tailwind
- ✅ Backend (API) çağrılarını tek bir servis dosyasında topla (ör. `src/services/api.ts`)
- ✅ Express API'nde **CORS** ayarını unutma (mobil uygulamalar farklı origin'den gelir)

### Web'e yayınlama
```bash
ionic build          # dist/ klasörü oluşur
```
`dist/` klasörünü kendi sunucuna (nginx, Express static, vb.) koy — normal bir Vue sitesi gibi.

---

## 5. Aşama 2 — PWA Yap (Opsiyonel Ara Adım) 📲

Store'a girmeden "uygulama gibi" dağıtmak için:

```bash
npm install -D vite-plugin-pwa
```

`vite.config.ts` içine ekle:

```ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Uygulamam',
        short_name: 'Uygulamam',
        theme_color: '#3880ff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
```

Yayınla → kullanıcılar tarayıcıdan **"Ana ekrana ekle"** deyince uygulama gibi açılır.

---

## 6. Aşama 3 — Android Uygulamasına Çevir 🤖

### 6.1 Android Studio kur
https://developer.android.com/studio (Android SDK + emülatör kurulumla gelir)

### 6.2 Android platformunu ekle

```bash
ionic build
ionic cap add android
```

### 6.3 Çalıştır

```bash
ionic cap open android
```

Android Studio açılır → **Run ▶** ile emülatörde veya USB'yle bağlı telefonda çalıştır.

> Telefonda test: **Geliştirici Seçenekleri → USB Hata Ayıklama** açık olmalı.

### 6.4 Her kod değişikliğinden sonra

```bash
ionic build && ionic cap sync
```

> 💡 Canlı yenileme ile telefonda geliştirme: `ionic cap run android -l --external`

### 6.5 Play Store için imzalı build
Android Studio → **Build → Generate Signed Bundle / APK** → `.aab` dosyası → Play Console'a yükle (tek seferlik 25 $ geliştirici hesabı).

---

## 7. Aşama 4 — iOS Uygulaması (Windows'tan, Mac'siz) 🍎

Windows'ta Xcode çalışmadığı için final build **bulutta** alınır:

```bash
ionic cap add ios      # iOS projesi oluşturulur (build edilmez)
```

1. Projeyi **GitHub'a push'la**
2. **Codemagic** (https://codemagic.io) hesabı aç → repo'yu bağla (Capacitor desteği hazır, ücretsiz katman var)
3. Build al → `.ipa` dosyası çıkar
4. App Store'a yüklemek için **Apple Developer hesabı** gerekir (99 $/yıl)

Alternatifler: Bitrise, GitHub Actions (macOS runner), Ionic Appflow.

---

## 8. Native Özellikler (Kamera, GPS, Bildirim...)

Capacitor eklentileri hem webde hem mobilde **tek API** ile çalışır:

```bash
npm install @capacitor/camera
npx cap sync
```

```ts
import { Camera, CameraResultType } from '@capacitor/camera'

const foto = await Camera.getPhoto({
  resultType: CameraResultType.Uri,
  quality: 90
})
// Webde dosya seçici / webcam açılır, mobilde gerçek kamera
```

Eklenti kataloğu: https://capacitorjs.com/docs/plugins

---

## 9. Özet Komutlar

| Komut | Ne yapar |
|---|---|
| `ionic start <ad> tabs --type=vue` | Yeni proje |
| `ionic serve` | Web'de geliştir (hot reload) |
| `ionic build` | Üretim derlemesi → `dist/` |
| `ionic cap add android` / `ios` | Platform ekle |
| `ionic cap sync` | Web kodunu native projelere kopyala |
| `ionic cap open android` | Android Studio'da aç |
| `ionic cap run android -l --external` | Telefonda canlı yenileme |

---

## 10. Yol Haritası Özeti

```
1. ionic start → Tailwind kur → web'de geliştir (ionic serve)
2. dist/ → sunucuna yayınla (+ istersen PWA)
3. cap add android → Play Store
4. cap add ios + Codemagic → App Store
```

**Tek kod tabanı, üç platform.** Backend'in (Node/Express) hiçbir değişiklik gerektirmez — üçü de aynı API'yi kullanır. 🚀

---

## 11. Claude Code Kurulumu (VS Code)

Bu paket, projeyi Claude Code ile geliştirmen için hazır dosyalar içerir:

```
proje-paketi/
├── KURULUM.md                            ← bu dosya
├── CLAUDE.md                             ← Claude Code'un proje rehberi
└── .claude/
    └── skills/
        ├── yeni-ekran/SKILL.md           ← /yeni-ekran: yeni sayfa ekleme tarifi
        └── tasarimdan-koda/SKILL.md      ← /tasarimdan-koda: Figma/görsel → Vue+Tailwind
```

### 11.1 Claude Code'u kur

VS Code → Extensions (Ctrl+Shift+X) → **"Claude Code"** uzantısını kur ve Claude hesabınla giriş yap. (Alternatif: terminalden CLI kurulumu — https://code.claude.com/docs/en/setup)

### 11.2 Dosyaları projeye kopyala

`ionic start` ile projeyi oluşturduktan sonra `CLAUDE.md` dosyasını ve `.claude` klasörünü **proje kökine** kopyala:

```
uygulamam/
├── CLAUDE.md          ← buraya
├── .claude/           ← buraya (gizli klasör — Windows Gezgini'nde görünmüyorsa adıyla yapıştır)
├── src/
├── package.json
└── ...
```

Claude Code her oturumda `CLAUDE.md`'yi otomatik okur; skill'ler ise `/yeni-ekran`, `/tasarimdan-koda` yazarak veya doğal dille ("yeni bir ayarlar ekranı ekle") tetiklenir.

### 11.3 İlk komutların

Proje açıkken Claude Code paneline şunları yazabilirsin:

- `Tailwind'i kur ve CLAUDE.md'deki kurallara göre yapılandır`
- `/yeni-ekran — Projeler listesi ekranı, alt sekmede görünsün`
- Figma ekran görüntüsünü yapıştır + `/tasarimdan-koda`

İyi kodlamalar! 🤖
