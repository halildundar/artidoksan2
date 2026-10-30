---
name: tasarimdan-koda
description: Figma tasarımını veya ekran görüntüsünü çalışan Vue 3 + Tailwind ekranına çevirir. Kullanıcı bir tasarım görseli, Figma linki paylaştığında ya da "bu tasarımı koda dök" dediğinde kullan.
---

# Tasarımdan Koda Çevirme

Kullanıcı bir Figma tasarımı, ekran görüntüsü veya mockup verdiğinde bunu projenin kurallarına uygun çalışan koda çevir.

## 1. Tasarımı incele

- Görsel verildiyse dikkatle oku: yerleşim (düzen, hizalama, boşluklar), renkler, tipografi hiyerarşisi, köşe yuvarlaklıkları, gölgeler, ikonlar.
- Figma bağlantısı/MCP erişimi varsa kesin değerleri (renk kodları, px ölçüleri, font boyutları) oradan al; görselden çalışıyorsan en yakın Tailwind ölçeğine yuvarla (ör. 17px → `text-base` veya `text-lg`, hangisi bütüne uyuyorsa).
- Tekrarlayan desenleri tespit et: kart, liste satırı, rozet gibi tekrar eden bloklar ayrı komponent olmalı.

## 2. Çevirme kuralları

- Çıktı: `src/views/` altında bir sayfa ve/veya `src/components/` altında komponentler.
- Sayfa en dışta `<ion-page>` + `<ion-content>` iskeletini korur; onun içindeki her şey Tailwind.
- Görsel Ionic bileşeni kullanma — buton, kart, giriş alanı dahil her şey Tailwind ile yazılır.
- Renkler: tasarımdaki renkleri `tailwind.config` theme'ine ekle (ör. `brand` paleti) ve sınıflarda o adları kullan; keyfi hex'leri (`bg-[#3a7bd5]`) yalnızca tek seferlik değerler için kullan.
- Mobile-first yaz; tasarım masaüstü ise önce ~390px versiyonunu kur, sonra `md:`/`lg:` ile tasarıma sadık genişlet.
- Metinleri tasarımdaki gerçek metinlerle doldur; veri listeleri için şimdilik gerçekçi sahte veri dizisi kullan ve bunu `// TODO: API` yorumuyla işaretle.
- İkonlar: `lucide-vue-next` kurulu ise onu kullan; değilse inline SVG yaz. İkon kütüphanesi eklemeden önce kullanıcıya sor.

## 3. Etkileşimler ve geçişler

- Tasarımda/prototipte görülen navigasyon ("bu karta basınca detay açılır") Vue Router ile bağlanır; ekranlar arası geçiş animasyonunu Ionic zaten verir, elle animasyon yazma.
- Ekran İÇİ animasyonlar (açılır panel, modal, liste girişi) Vue `<Transition>` + Tailwind ile yazılır. Prototipte süre/easing değeri görünüyorsa onu kullan; bilinmiyorsa 200-300ms `ease-out` varsay.
- Prototipin birebir kopyalanamayan "Smart Animate" efektlerinde amaca en yakın sade geçişi uygula ve notunu düş.

## 4. Doğrula ve teslim et

- `npx vue-tsc --noEmit` çalıştır.
- Yeni sayfa eklediysen route'u kaydet.
- Kullanıcıya kısaca bildir: hangi dosyalar oluştu, tasarımdan bilinçli sapılan noktalar (varsa) ve ekranı nerede göreceği (`ionic serve` → URL).
