import 'dotenv/config';
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

// Tarayıcı presigned URL'lere doğrudan R2'ye GET yapar (FileViewerHost/pdf.js
// fetch'i dahil) — bucket CORS politikasının origin'e izin vermesi gerekir.
// Bucket artidoksan1 ile ortak ("test") olduğundan onun origin'leri korunur.
// Bir kez çalıştırmak yeterli: node set-r2-cors.js
const ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8100', // artidoksan2 ionic serve
  'http://localhost',      // Capacitor Android WebView
  'capacitor://localhost', // Capacitor iOS WebView
];

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: process.env.R2_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ORIGINS,
          AllowedMethods: ['GET', 'PUT', 'HEAD'],
          AllowedHeaders: ['*'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  })
);
console.log(`[r2-cors] "${process.env.R2_BUCKET}" bucket'ına CORS uygulandı: ${ORIGINS.join(', ')}`);
