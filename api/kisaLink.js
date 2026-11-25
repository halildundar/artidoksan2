// Kısa indirme linkleri: R2 imzalı URL'leri ~1000 karakterdir (X-Amz-* imza parametreleri +
// dosya adı). Paylaşılacak linkler için kısa bir kod saklanır; /d/<kod> açılınca o anda taze bir
// imzalı indirme URL'i üretilip yönlendirilir. Link, kayıttaki süre dolana kadar çalışır.
import crypto from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import { createDownloadUrl } from './storage.js';

const kisaLinkSchema = new mongoose.Schema(
  {
    kod: { type: String, required: true, unique: true },
    anahtar: { type: String, required: true }, // R2 nesne anahtarı
    dosyaAdi: { type: String, default: 'dosya' },
    // Süre dolunca MongoDB kaydı kendiliğinden siler (TTL)
    bitis: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true, collection: 'kisalinkler' }
);
const KisaLink = mongoose.models.KisaLink || mongoose.model('KisaLink', kisaLinkSchema);

const ALFABE = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışan karakterler (l,1,O,0,I) yok
function kodUret(uzunluk = 10) {
  const bayt = crypto.randomBytes(uzunluk);
  return Array.from(bayt, (b) => ALFABE[b % ALFABE.length]).join('');
}

// Linkin gösterileceği taban adres: KISA_LINK_TABAN ortam değişkeni, yoksa isteğin geldiği adres
function tabanAdres(req) {
  if (process.env.KISA_LINK_TABAN) return process.env.KISA_LINK_TABAN.replace(/\/+$/, '');
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol).split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.get('host')).split(',')[0].trim();
  return `${proto}://${host}`;
}

// Kısa link üretir; başarısız olursa (ör. veritabanı) uzun imzalı URL'e düşer
export async function kisaIndirmeLinki(req, anahtar, dosyaAdi, sureSn) {
  try {
    const kod = kodUret();
    await KisaLink.create({ kod, anahtar, dosyaAdi, bitis: new Date(Date.now() + sureSn * 1000) });
    return `${tabanAdres(req)}/d/${kod}`;
  } catch (err) {
    console.error('[kisa-link] oluşturulamadı, uzun URL kullanılıyor:', err.message);
    return createDownloadUrl(anahtar, dosyaAdi, sureSn);
  }
}

// GET /d/:kod — giriş gerektirmez (link zaten paylaşılmak için üretilir); kod tahmin edilemez
const router = express.Router();
router.get('/:kod', async (req, res) => {
  try {
    const kayit = /^[A-Za-z0-9]{6,32}$/.test(req.params.kod) ? await KisaLink.findOne({ kod: req.params.kod }).lean() : null;
    if (!kayit || kayit.bitis < new Date()) {
      return res.status(404).type('html').send(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<body style="font-family:system-ui;padding:2rem;text-align:center"><h2>Bağlantı bulunamadı</h2>' +
        '<p>Bu indirme bağlantısının süresi dolmuş veya bağlantı geçersiz. Dosyayı gönderen kişiden yeni bir bağlantı isteyin.</p></body>'
      );
    }
    // Yönlendirme anında kısa ömürlü (5 dk) taze imzalı URL
    res.redirect(302, await createDownloadUrl(kayit.anahtar, kayit.dosyaAdi));
  } catch (err) {
    res.status(500).type('text').send(`İndirme bağlantısı açılamadı: ${err.message}`);
  }
});

export default router;
