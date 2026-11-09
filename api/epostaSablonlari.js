// Şık e-posta şablonları: tablo tabanlı + inline CSS (Gmail/Outlook/mobil uyumlu), düz metin yedeği.
// Bağlantılar UYGULAMA_URL ortam değişkeninden üretilir (yerelde http://localhost:8100, production'da ana adres).

export const uygulamaUrl = () => (process.env.UYGULAMA_URL || 'http://localhost:8100').replace(/\/+$/, '');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MARKA = '#2b5c3d';

// Ortak çerçeve: üst bant, kart, kod kutusu, ana buton, güvenlik notu, alt bilgi
function cerceve({ baslik, selam, govde, kod, butonMetni, butonUrl, not }) {
  const kodHtml = kod
    ? `<tr><td align="center" style="padding:8px 0 20px"><div style="display:inline-block;background:#f1f6f2;border:1px solid #cfe0d3;border-radius:10px;padding:14px 26px;font:700 30px/1 'Courier New',monospace;letter-spacing:8px;color:#17361f">${esc(kod)}</div></td></tr>`
    : '';
  const butonHtml = butonUrl
    ? `<tr><td align="center" style="padding:6px 0 22px"><a href="${esc(butonUrl)}" style="display:inline-block;background:${MARKA};color:#ffffff;text-decoration:none;font:600 15px/1 Arial,sans-serif;padding:14px 30px;border-radius:8px">${esc(butonMetni)}</a></td></tr>
       <tr><td style="padding:0 0 18px;font:12px/1.5 Arial,sans-serif;color:#6b7a70;word-break:break-all">Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br><a href="${esc(butonUrl)}" style="color:${MARKA}">${esc(butonUrl)}</a></td></tr>`
    : '';
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(baslik)}</title></head>
<body style="margin:0;padding:0;background:#eef3ef">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3ef;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dbe6de">
    <tr><td style="background:${MARKA};padding:20px 28px;font:700 20px/1.2 Arial,sans-serif;color:#ffffff;letter-spacing:.3px">Artidoksan</td></tr>
    <tr><td style="padding:28px 28px 8px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr><td style="font:700 20px/1.3 Arial,sans-serif;color:#17361f;padding-bottom:10px">${esc(baslik)}</td></tr>
        <tr><td style="font:15px/1.6 Arial,sans-serif;color:#33443a;padding-bottom:18px">${esc(selam)}<br>${govde}</td></tr>
        ${kodHtml}
        ${butonHtml}
        ${not ? `<tr><td style="font:13px/1.55 Arial,sans-serif;color:#6b7a70;border-top:1px solid #e4ece6;padding:14px 0 6px">${esc(not)}</td></tr>` : ''}
      </table>
    </td></tr>
    <tr><td style="background:#f6f9f7;padding:14px 28px;font:12px/1.5 Arial,sans-serif;color:#8a978e">Bu e-posta Artidoksan tarafından otomatik gönderilmiştir. Lütfen yanıtlamayın.</td></tr>
  </table>
</td></tr></table></body></html>`;
}

function metin({ baslik, selam, duz, kod, butonUrl, not }) {
  return [baslik, '', selam, duz, kod ? `\nKod: ${kod}` : '', butonUrl ? `\nBağlantı: ${butonUrl}` : '', not ? `\n${not}` : ''].filter((x) => x !== '').join('\n');
}

const adi = (k) => `${k.ad ?? ''} ${k.soyad ?? ''}`.trim() || 'Merhaba';

// Hesap doğrulama (yönetici "Doğrulama gönder" dediğinde): buton + kod
export function hesapDogrulamaSablonu(k, kod, token) {
  const url = `${uygulamaUrl()}/dogrula?token=${encodeURIComponent(token)}`;
  const b = { baslik: 'Hesabınızı doğrulayın', selam: `Merhaba ${adi(k)},`, kod, butonUrl: url, butonMetni: 'Hesabımı doğrula',
    not: 'Bu bağlantı ve kod 24 saat geçerlidir. Bu hesabı siz istemediyseniz bu e-postayı yok sayabilirsiniz.' };
  return { konu: 'Hesabınızı doğrulayın', html: cerceve({ ...b, govde: 'Artidoksan hesabınız için e-posta adresinizi doğrulamanız ve şifrenizi belirlemeniz gerekiyor. Aşağıdaki butona dokunun ya da kodu uygulamadaki doğrulama ekranına girin.' }),
    metin: metin({ ...b, duz: 'E-posta adresinizi doğrulamak ve şifrenizi belirlemek için bağlantıyı açın veya kodu girin.' }) };
}

// Yeni cihazdan giriş kodu
export function girisKoduSablonu(k, kod) {
  const b = { baslik: 'Giriş doğrulama kodu', selam: `Merhaba ${adi(k)},`, kod, not: 'Kod 10 dakika geçerlidir. Giriş yapmaya çalışan siz değilseniz kimseyle paylaşmayın ve şifrenizi değiştirin.' };
  return { konu: `Giriş kodunuz: ${kod}`, html: cerceve({ ...b, govde: 'Yeni bir cihazdan giriş yapılıyor. Devam etmek için aşağıdaki kodu girin.' }),
    metin: metin({ ...b, duz: 'Yeni bir cihazdan giriş yapılıyor. Devam etmek için kodu girin.' }) };
}

// Şifre sıfırlama: kod + buton
export function sifreSifirlamaSablonu(k, kod, token) {
  const url = `${uygulamaUrl()}/sifre-sifirla?token=${encodeURIComponent(token)}`;
  const b = { baslik: 'Şifre sıfırlama', selam: `Merhaba ${adi(k)},`, kod, butonUrl: url, butonMetni: 'Şifremi sıfırla',
    not: 'Bağlantı ve kod 30 dakika geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayın; şifreniz değişmez.' };
  return { konu: 'Şifre sıfırlama', html: cerceve({ ...b, govde: 'Şifrenizi sıfırlamak için aşağıdaki butona dokunun ya da kodu uygulamaya girin.' }),
    metin: metin({ ...b, duz: 'Şifrenizi sıfırlamak için bağlantıyı açın veya kodu girin.' }) };
}

// Şifre değiştirme onay kodu
export function sifreDegistirmeSablonu(k, kod) {
  const b = { baslik: 'Şifre değiştirme onayı', selam: `Merhaba ${adi(k)},`, kod, not: 'Kod 10 dakika geçerlidir. Bu işlemi siz başlatmadıysanız kodu girmeyin ve yöneticinize bildirin.' };
  return { konu: `Şifre değiştirme kodu: ${kod}`, html: cerceve({ ...b, govde: 'Şifrenizi değiştirmek için istek aldık. Onaylamak için aşağıdaki kodu uygulamaya girin.' }),
    metin: metin({ ...b, duz: 'Şifrenizi değiştirmek için kodu uygulamaya girin.' }) };
}

// Şifre değişti bildirimi
export function sifreDegistiBildirimiSablonu(k) {
  const b = { baslik: 'Şifreniz değiştirildi', selam: `Merhaba ${adi(k)},`, not: 'Bu değişikliği siz yapmadıysanız hemen yöneticinizle iletişime geçin.' };
  return { konu: 'Şifreniz değiştirildi', html: cerceve({ ...b, govde: 'Hesabınızın şifresi başarıyla değiştirildi. Güvenliğiniz için diğer cihazlardaki oturumlar kapatıldı.' }),
    metin: metin({ ...b, duz: 'Hesabınızın şifresi değiştirildi. Diğer cihazlardaki oturumlar kapatıldı.' }) };
}
