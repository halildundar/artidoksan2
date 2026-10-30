import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 dosya deposu — artidoksan1'deki storage/r2.js deseninin
// sadeleştirilmiş hali. Firma evrakları (logo, imza/kaşe, resmi belgeler)
// burada saklanır.
const VIEW_URL_TTL_SECONDS = 5 * 60;

let client = null;

function getClient() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    const err = new Error('R2 depolama yapılandırılmamış (R2_* env değişkenleri eksik)');
    err.status = 500;
    throw err;
  }
  client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export function buildObjectKey(prefix, dosyaAdi) {
  const sanitized = dosyaAdi.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${prefix}/${randomUUID()}-${sanitized}`;
}

// Sunucuya multipart ile gelen dosyayı R2'ye yazar.
export async function putObject(key, buffer, mimeType) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
}

// Görüntüleme/önizleme için kısa ömürlü imzalı GET URL'i üretir.
export async function createViewUrl(key) {
  const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: VIEW_URL_TTL_SECONDS });
}

// İndirme için imzalı URL: tarayıcı dosyayı verilen adla indirir
// (artidoksan1 createDownloadUrl deseni). Paylaşılacak linkler (ör. ZIP)
// için daha uzun bir expiresIn verilebilir (S3 imza üst sınırı 7 gün).
export async function createDownloadUrl(key, dosyaAdi, expiresIn = VIEW_URL_TTL_SECONDS) {
  const asciiFallback = dosyaAdi.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(dosyaAdi)}`,
  });
  return getSignedUrl(getClient(), command, { expiresIn });
}

// R2'deki nesneyi belleğe okur (ZIP paketleme için).
export async function getObjectBuffer(key) {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key })
  );
  return Buffer.from(await res.Body.transformToByteArray());
}
