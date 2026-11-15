import mongoose from 'mongoose';
import { deleteObject } from './storage.js';

// Kayıt silinirken R2'deki dosyaların da silinmesi için ortak yardımcılar.
// Başka kayıtlarla paylaşılan dosyalar (SMM havuzundan / firmadan kopyalanan belgeler vb.) silinmez.

// Dosya taşıyan modeller (adres önbelleği gibi büyük koleksiyonlar taranmaz)
const DOSYA_MODELLERI = ['Firma', 'Asansor', 'Tescil', 'Denetim', 'SmmFirmasi', 'AksamBelgesi', 'Denetci', 'RiskMaddesi'];

// Bir kayıttaki (iç içe) tüm dosya anahtarlarını toplar
export function dosyaAnahtarlari(deger, kume = new Set()) {
  if (Array.isArray(deger)) deger.forEach((d) => dosyaAnahtarlari(d, kume));
  else if (deger && typeof deger === 'object' && !(deger instanceof Date) && !deger._bsontype) {
    if (typeof deger.dosyaAnahtari === 'string') kume.add(deger.dosyaAnahtari);
    Object.values(deger).forEach((d) => dosyaAnahtarlari(d, kume));
  }
  return kume;
}

// Silinen kaydın dışındaki tüm kayıtların kullandığı anahtarlar
async function baskasinaAitAnahtarlar(modelAdi, id) {
  const kume = new Set();
  for (const ad of DOSYA_MODELLERI) {
    if (!mongoose.models[ad]) continue;
    const kayitlar = await mongoose.model(ad).find().lean();
    for (const k of kayitlar) {
      if (ad === modelAdi && String(k._id) === String(id)) continue;
      dosyaAnahtarlari(k, kume);
    }
  }
  return kume;
}

// Kaydı siler; yalnız ona ait dosyaları R2'den kaldırır. Dönüş: { kayit, depodanSilinen }
export async function kaydiVeDosyalariniSil(modelAdi, id) {
  const Model = mongoose.model(modelAdi);
  const mevcut = await Model.findById(id).lean();
  if (!mevcut) return null;
  const paylasilan = await baskasinaAitAnahtarlar(modelAdi, id);
  const silinecek = [...dosyaAnahtarlari(mevcut)].filter((a) => !paylasilan.has(a));
  await Model.findByIdAndDelete(id);
  let silinen = 0;
  for (const anahtar of silinecek) {
    try {
      await deleteObject(anahtar);
      silinen += 1;
    } catch (err) {
      console.error('R2 silme hatası:', anahtar, err.message);
    }
  }
  return { kayit: mevcut, depodanSilinen: silinen };
}
