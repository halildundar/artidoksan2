// "Tümünü İndir" ZIP'leri (R2 zipler/ öneki) paylaşım linkleri 7 gün geçerli; link ölünce dosyanın
// depoda kalmasının anlamı yok. Bu iş 7 günden eski zipler/ nesnelerini siler.
// Sunucu açılınca (birkaç dakika sonra) ve sonra her 6 saatte bir çalışır. ZIP_TEMIZLIK=0 ile kapatılır.
import { listObjects, deleteObject } from './storage.js';

const GUN_MS = 24 * 3600_000;
export const ZIP_OMRU_GUN = 7; // zip-link imzalı URL süresiyle (server.js ZIP_URL_TTL_SECONDS) aynı
const ALTI_SAAT = 6 * 3600_000;

// kuru: true ise silmez, yalnız silinecekleri raporlar
export async function eskiZipleriSil({ kuru = false, gun = ZIP_OMRU_GUN } = {}) {
  const sinir = Date.now() - gun * GUN_MS;
  const nesneler = await listObjects('zipler/');
  const eskiler = nesneler.filter((o) => o.key.startsWith('zipler/') && new Date(o.tarih).getTime() < sinir);
  let silinen = 0;
  let boyut = 0;
  for (const o of eskiler) {
    if (kuru) { silinen += 1; boyut += o.boyut; continue; }
    try { await deleteObject(o.key); silinen += 1; boyut += o.boyut; } catch (err) { console.error('[zip-temizlik] silinemedi:', o.key, err.message); }
  }
  return { toplam: nesneler.length, silinen, boyutMB: Number((boyut / 1048576).toFixed(1)), kuru };
}

export function zipTemizliginiZamanla() {
  if (process.env.ZIP_TEMIZLIK === '0') return;
  const calistir = () => eskiZipleriSil()
    .then((r) => r.silinen && console.log(`[zip-temizlik] ${r.silinen} eski ZIP silindi (${r.boyutMB} MB); depoda ${r.toplam - r.silinen} ZIP kaldı`))
    .catch((err) => console.error('[zip-temizlik] çalışmadı:', err.message));
  setTimeout(calistir, 2 * 60_000).unref();
  setInterval(calistir, ALTI_SAAT).unref();
}
