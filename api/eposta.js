// E-posta gönderimi — sağlayıcı soyutlaması.
// E_POSTA_SAGLAYICI: "konsol" (geliştirme: gönderilmez, sunucu loguna yazılır), "brevo" veya "resend".
// Ortam: BREVO_API_KEY | RESEND_API_KEY, E_POSTA_GONDEREN ("Ad <adres@alanadi.com>" veya yalnız adres).

const saglayici = () => (process.env.E_POSTA_SAGLAYICI || 'konsol').toLowerCase();

// "Ad <a@b.com>" → { ad, email }
function gondereniAyir() {
  const ham = process.env.E_POSTA_GONDEREN || 'Artidoksan <noreply@localhost>';
  const m = /^(.*?)\s*<([^>]+)>$/.exec(ham.trim());
  return m ? { ad: m[1].replace(/^"|"$/g, '') || 'Artidoksan', email: m[2] } : { ad: 'Artidoksan', email: ham.trim() };
}

async function brevoGonder({ alici, konu, html, metin }) {
  const g = gondereniAyir();
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY ?? '', 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: g.ad, email: g.email }, to: [{ email: alici }], subject: konu, htmlContent: html, textContent: metin }),
  });
  if (!res.ok) throw new Error(`Brevo e-posta hatası (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

async function resendGonder({ alici, konu, html, metin }) {
  const g = gondereniAyir();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY ?? ''}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: `${g.ad} <${g.email}>`, to: [alici], subject: konu, html, text: metin }),
  });
  if (!res.ok) throw new Error(`Resend e-posta hatası (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

// Son gönderilen e-postalar (yalnız konsol modunda; testlerde kodu okumak için)
export const sonKonsolEpostalari = [];

export async function epostaGonder(ileti) {
  const s = saglayici();
  if (s === 'brevo') return brevoGonder(ileti);
  if (s === 'resend') return resendGonder(ileti);
  // konsol: gönderme, kod ve bağlantıyı loga yaz
  sonKonsolEpostalari.unshift({ ...ileti, zaman: new Date().toISOString() });
  sonKonsolEpostalari.length = Math.min(sonKonsolEpostalari.length, 20);
  console.log(`\n[E-POSTA/konsol] → ${ileti.alici}\n  Konu: ${ileti.konu}\n  ${String(ileti.metin).replace(/\n/g, '\n  ')}\n`);
}

export const konsolModu = () => saglayici() === 'konsol';
