import https from 'node:https';
import tls from 'node:tls';
import fs from 'node:fs';
import { Router } from 'express';
import mongoose from 'mongoose';

// PTT'nin kendi posta-kodu sayfasının (www.ptt.gov.tr/posta-kodu) çağırdığı
// aynı public JSON API — auth/cookie gerektirmez. İl/ilçe sınırları ve
// mahalle adları pratikte hiç değişmediğinden sonuçlar process ömrü boyunca
// bellekte cache'lenir (TTL yok).
const PTT_HOST = 'www.ptt.gov.tr';
const PTT_PATH = '/api/posta-kodu';
const REQUEST_TIMEOUT_MS = 10_000;

// www.ptt.gov.tr TLS handshake'inde ara sertifikayı (GlobalSign RSA OV SSL
// CA 2018) göndermiyor — tarayıcılar tolere eder ama Node "unable to verify
// the first certificate" ile düşer. Çözüm doğrulamayı kapatmak DEĞİL, Node'un
// güvendiği kök listesine eksik ara halkayı eklemek.
const GLOBALSIGN_RSA_OV_SSL_CA_2018 = `-----BEGIN CERTIFICATE-----
MIIETjCCAzagAwIBAgINAe5fIh38YjvUMzqFVzANBgkqhkiG9w0BAQsFADBMMSAw
HgYDVQQLExdHbG9iYWxTaWduIFJvb3QgQ0EgLSBSMzETMBEGA1UEChMKR2xvYmFs
U2lnbjETMBEGA1UEAxMKR2xvYmFsU2lnbjAeFw0xODExMjEwMDAwMDBaFw0yODEx
MjEwMDAwMDBaMFAxCzAJBgNVBAYTAkJFMRkwFwYDVQQKExBHbG9iYWxTaWduIG52
LXNhMSYwJAYDVQQDEx1HbG9iYWxTaWduIFJTQSBPViBTU0wgQ0EgMjAxODCCASIw
DQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKdaydUMGCEAI9WXD+uu3Vxoa2uP
UGATeoHLl+6OimGUSyZ59gSnKvuk2la77qCk8HuKf1UfR5NhDW5xUTolJAgvjOH3
idaSz6+zpz8w7bXfIa7+9UQX/dhj2S/TgVprX9NHsKzyqzskeU8fxy7quRU6fBhM
abO1IFkJXinDY+YuRluqlJBJDrnw9UqhCS98NE3QvADFBlV5Bs6i0BDxSEPouVq1
lVW9MdIbPYa+oewNEtssmSStR8JvA+Z6cLVwzM0nLKWMjsIYPJLJLnNvBhBWk0Cq
o8VS++XFBdZpaFwGue5RieGKDkFNm5KQConpFmvv73W+eka440eKHRwup08CAwEA
AaOCASkwggElMA4GA1UdDwEB/wQEAwIBhjASBgNVHRMBAf8ECDAGAQH/AgEAMB0G
A1UdDgQWBBT473/yzXhnqN5vjySNiPGHAwKz6zAfBgNVHSMEGDAWgBSP8Et/qC5F
JK5NUPpjmove4t0bvDA+BggrBgEFBQcBAQQyMDAwLgYIKwYBBQUHMAGGImh0dHA6
Ly9vY3NwMi5nbG9iYWxzaWduLmNvbS9yb290cjMwNgYDVR0fBC8wLTAroCmgJ4Yl
aHR0cDovL2NybC5nbG9iYWxzaWduLmNvbS9yb290LXIzLmNybDBHBgNVHSAEQDA+
MDwGBFUdIAAwNDAyBggrBgEFBQcCARYmaHR0cHM6Ly93d3cuZ2xvYmFsc2lnbi5j
b20vcmVwb3NpdG9yeS8wDQYJKoZIhvcNAQELBQADggEBAJmQyC1fQorUC2bbmANz
EdSIhlIoU4r7rd/9c446ZwTbw1MUcBQJfMPg+NccmBqixD7b6QDjynCy8SIwIVbb
0615XoFYC20UgDX1b10d65pHBf9ZjQCxQNqQmJYaumxtf4z1s4DfjGRzNpZ5eWl0
6r/4ngGPoJVpjemEuunl1Ig423g7mNA2eymw0lIYkN5SQwCuaifIFJ6GlazhgDEw
fpolu4usBCOmmQDo8dIm7A9+O4orkjgTHY+GzYZSR+Y0fFukAj6KYXwidlNalFMz
hriSqHKvoflShx8xpfywgVcvzfTO3PYkz6fiNJBonf6q8amaEsybwMbDqKWwIX7e
SPY=
-----END CERTIFICATE-----`;

// PTT Eki 2026 itibarıyla "GlobalSign GCC R46 OV TLS CA 2025" ara
// sertifikasıyla imzalı (yine zincirde göndermiyor) — AIA adresinden indirilen
// kopya repo'da tutulur. Eski 2018 CA'sı da olası geri dönüşe karşı listede.
const GLOBALSIGN_GCC_R46_OV_TLS_CA_2025 = fs.readFileSync(
  new URL('./gsgccr46ovtlsca2025.pem', import.meta.url),
  'utf8'
);

const pttAgent = new https.Agent({
  ca: [...tls.rootCertificates, GLOBALSIGN_RSA_OV_SSL_CA_2018, GLOBALSIGN_GCC_R46_OV_TLS_CA_2025],
});

function pttRequest(body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: PTT_HOST,
        path: PTT_PATH,
        method: 'POST',
        agent: pttAgent,
        // PTT WAF'ı başlıksız istekleri 403 ile kesiyor (Eki 2026) —
        // kendi sayfasının gönderdiği tarayıcı başlıkları taklit edilir.
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'tr-TR,tr;q=0.9',
          Origin: 'https://www.ptt.gov.tr',
          Referer: 'https://www.ptt.gov.tr/posta-kodu',
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function callPtt(action, params = {}) {
  let data;
  try {
    data = await pttRequest(JSON.stringify({ action, ...params }));
  } catch {
    const err = new Error('PTT adres servisine ulaşılamadı');
    err.status = 502;
    throw err;
  }
  try {
    return JSON.parse(data);
  } catch {
    const err = new Error('PTT adres servisi geçersiz yanıt döndü');
    err.status = 502;
    throw err;
  }
}

function trCompare(a, b) {
  return a.localeCompare(b, 'tr');
}

// PTT, bazı barındırma IP'lerinden (ör. Render/Frankfurt) gelen istekleri
// kabul etmiyor. Bu yüzden başarılı PTT yanıtları MongoDB'ye de yazılır;
// PTT'ye ulaşılamayan ortamlarda aynı veri oradan servis edilir. Veriyi
// doldurmak için PTT'ye erişebilen bir makinede: node seed-adres-cache.js
const AdresCache = mongoose.model(
  'AdresCache',
  new mongoose.Schema(
    { _id: String, veri: { type: [mongoose.Schema.Types.Mixed], default: [] } },
    { collection: 'adresCache', versionKey: false }
  )
);

// Yazımlar istek akışını bloklamaz; seed betiği çıkmadan önce hepsini bekler
const bekleyenYazimlar = new Set();

function dbYaz(anahtar, veri) {
  const p = AdresCache.findByIdAndUpdate(anahtar, { veri }, { upsert: true })
    .exec()
    .catch(() => { /* yedek yazılamazsa sıradaki istek yeniden dener */ });
  bekleyenYazimlar.add(p);
  p.finally(() => bekleyenYazimlar.delete(p));
}

export function adresYazimlariniBekle() {
  return Promise.allSettled([...bekleyenYazimlar]);
}

async function dbOku(anahtar) {
  const kayit = await AdresCache.findById(anahtar).lean();
  return kayit?.veri?.length ? kayit.veri : null;
}

let illerCache = null;
let illerPromise = null;
const ilcelerCache = new Map();
const mahallelerCache = new Map();

// Sıra: bellek → DB → PTT. Veri seed ile DB'de hazır olduğundan istekler
// anında döner; PTT yalnız DB'de olmayan (yeni) kombinasyonlar için denenir.
// (Önceden PTT önce denenip 10 sn'lik zaman aşımından sonra DB'ye düşülüyordu
// — PTT'ye erişemeyen ortamlarda her seçim o kadar bekletiyordu.)
export async function listIller() {
  if (illerCache) return illerCache;
  illerPromise ??= (async () => {
    const yedek = await dbOku('iller').catch(() => null);
    if (yedek) {
      illerCache = yedek;
      return yedek;
    }
    const rows = await callPtt('iller');
    const options = (Array.isArray(rows) ? rows : [])
      .filter((r) => r.kod > 0)
      .map((r) => ({ label: r.ad, value: r.kod }))
      .sort((a, b) => trCompare(a.label, b.label));
    dbYaz('iller', options);
    illerCache = options;
    return options;
  })().finally(() => {
    illerPromise = null;
  });
  return illerPromise;
}

export async function listIlceler(ilKodu) {
  if (ilcelerCache.has(ilKodu)) return ilcelerCache.get(ilKodu);
  let options = await dbOku(`ilceler:${ilKodu}`).catch(() => null);
  if (!options) {
    const rows = await callPtt('ilceler', { il_kodu: String(ilKodu) });
    options = (Array.isArray(rows) ? rows : [])
      .filter((r) => r.kod > 0)
      .map((r) => ({ label: r.ad, value: r.kod }))
      .sort((a, b) => trCompare(a.label, b.label));
    dbYaz(`ilceler:${ilKodu}`, options);
  }
  ilcelerCache.set(ilKodu, options);
  return options;
}

// PTT'nin "postakodu" action'ı sokak seviyesinde satır döner — mahalleAdi'na
// göre tekilleştirilip her mahallenin ilk görülen posta kodu alınır.
export async function listMahalleler(ilKodu, ilceKodu) {
  const cacheKey = `${ilKodu}:${ilceKodu}`;
  if (mahallelerCache.has(cacheKey)) return mahallelerCache.get(cacheKey);
  let result = await dbOku(`mahalleler:${cacheKey}`).catch(() => null);
  if (!result) {
    const rows = await callPtt('postakodu', { il_kodu: String(ilKodu), ilce_kodu: String(ilceKodu) });
    const postaKoduByAd = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      const ad = row.mahalleAdi?.trim();
      if (ad && !postaKoduByAd.has(ad)) postaKoduByAd.set(ad, row.posta_Kodu);
    }
    result = [...postaKoduByAd.entries()]
      .map(([ad, postaKodu]) => ({ ad, postaKodu }))
      .sort((a, b) => trCompare(a.ad, b.ad));
    dbYaz(`mahalleler:${cacheKey}`, result);
  }
  mahallelerCache.set(cacheKey, result);
  return result;
}

const router = Router();

router.get('/iller', async (_req, res) => {
  try {
    res.json(await listIller());
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

router.get('/ilceler', async (req, res) => {
  const ilKodu = Number(req.query.ilKodu);
  if (!ilKodu) return res.status(400).json({ message: 'ilKodu gerekli' });
  try {
    res.json(await listIlceler(ilKodu));
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

router.get('/mahalleler', async (req, res) => {
  const ilKodu = Number(req.query.ilKodu);
  const ilceKodu = Number(req.query.ilceKodu);
  if (!ilKodu || !ilceKodu) return res.status(400).json({ message: 'ilKodu ve ilceKodu gerekli' });
  try {
    res.json(await listMahalleler(ilKodu, ilceKodu));
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

export default router;
