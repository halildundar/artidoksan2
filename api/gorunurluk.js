import mongoose from 'mongoose';

// Rol bazlı VERİ görünürlüğü (izinler.js "modül × eylem" izinlerini tamamlar):
// - Admin (ve AUTH_ZORUNLU=0 iken kullanıcısız istek): her şeyi görür.
// - Danışman: kendi eklediği ve kayıtta danışman olarak seçildiği Firma/Asansörler; bunların kademeli Denetim/Tescil'i.
// - Denetçi: kendine atanan (Denetim.denetciId) veya kendi eklediği Denetimler; bunların Firma/Asansör/Tescil'i
//   ve kendi eklediği Firma/Asansörler. Başka denetçilerin denetimleri görünmez.
// - Alanı (olusturanId / danismanIdler) olmayan eski kayıtlar yalnız Admin'e görünür.
// Kullanici.kaynakId: Danisman ya da Denetci kaydının _id'si (rol'e göre).

const M = (ad) => mongoose.model(ad);
const bos = { $in: [] };

// Kullanıcının erişebildiği id kümeleri ve koleksiyon filtreleri
async function kapsam(k) {
  const uid = k._id;
  const kid = k.kaynakId ?? null;
  const Firma = M('Firma');
  const Asansor = M('Asansor');
  const Denetim = M('Denetim');

  if (k.rol === 'danisman') {
    const kendi = [{ olusturanId: uid }, ...(kid ? [{ danismanIdler: kid }] : [])];
    const firmaIds = await Firma.distinct('_id', { $or: kendi });
    const asansorIds = await Asansor.distinct('_id', { $or: [...kendi, { firmaId: { $in: firmaIds } }] });
    return {
      firma: { _id: { $in: firmaIds } },
      asansor: { _id: { $in: asansorIds } },
      denetim: { $or: [{ olusturanId: uid }, { firmaId: { $in: firmaIds } }, { asansorId: { $in: asansorIds } }] },
      tescil: { $or: [{ olusturanId: uid }, { firmaId: { $in: firmaIds } }, { asansorId: { $in: asansorIds } }] },
    };
  }

  if (k.rol === 'denetci') {
    const denetim = { $or: [{ olusturanId: uid }, ...(kid ? [{ denetciId: kid }] : [])] };
    const denetimler = await Denetim.find(denetim).select('firmaId asansorId').lean();
    const firmaIds = [...new Set([
      ...denetimler.map((d) => String(d.firmaId)),
      ...(await Firma.distinct('_id', { olusturanId: uid })).map(String),
    ])];
    const asansorIds = [...new Set([
      ...denetimler.map((d) => String(d.asansorId)),
      ...(await Asansor.distinct('_id', { olusturanId: uid })).map(String),
    ])];
    return {
      firma: { _id: { $in: firmaIds } },
      asansor: { _id: { $in: asansorIds } },
      denetim,
      tescil: { $or: [{ olusturanId: uid }, { asansorId: { $in: asansorIds } }] },
    };
  }

  // Tanımsız rol: hiçbir kayıt
  return { firma: { _id: bos }, asansor: { _id: bos }, denetim: { _id: bos }, tescil: { _id: bos } };
}

const tamErisim = (k) => !k || k.rol === 'admin';

// tur: 'firma' | 'asansor' | 'denetim' | 'tescil' → Mongo filtresi ({} = hepsi)
export async function gorunurlukFiltresi(k, tur) {
  if (tamErisim(k)) return {};
  // SMM firma havuzu: Danışman yalnız kendi eklediklerini görür; Denetçi havuzun tamamını görür (katalog)
  if (tur === 'smm') return k.rol === 'danisman' ? { $or: [{ olusturanId: k._id }, ...(k.kaynakId ? [{ danismanIdler: k.kaynakId }] : [])] } : {};
  return (await kapsam(k))[tur];
}

const MODEL_ADLARI = { firma: 'Firma', asansor: 'Asansor', denetim: 'Denetim', tescil: 'Tescil', smm: 'SmmFirmasi' };
const BULUNAMADI = { firma: 'Firma bulunamadı', asansor: 'Asansör bulunamadı', denetim: 'Denetim bulunamadı', tescil: 'Tescil bulunamadı', smm: 'SMM firması bulunamadı' };

// Tek kayıt: kullanıcı bu kaydı görebilir mi?
export async function gorunurMu(k, tur, id) {
  if (tamErisim(k)) return true;
  if (!mongoose.isValidObjectId(id)) return true; // geçersiz id'yi rota zaten reddeder
  const filtre = await gorunurlukFiltresi(k, tur);
  return !!(await M(MODEL_ADLARI[tur]).exists({ $and: [{ _id: id }, filtre] }));
}

// router.param('id', ...) için: görünmeyen kayıt 404 döner (varlığı sızdırılmaz)
export const kayitKorumasi = (tur) => async (req, res, next, id) => {
  try {
    if (await gorunurMu(req.kullanici, tur, id)) return next();
    res.status(404).json({ message: BULUNAMADI[tur] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// app.use('/api/firmalar/:id', ...) için aynı kontrol
export const kayitKorumasiMw = (tur) => async (req, res, next) => {
  try {
    if (await gorunurMu(req.kullanici, tur, req.params.id)) return next();
    res.status(404).json({ message: BULUNAMADI[tur] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Kaydı kimin eklediği: yalnız sunucu yazar (istemci gövdesindeki değer yok sayılır)
export const olusturanAlani = (req) => (req.kullanici ? { olusturanId: req.kullanici._id } : {});

// Danışman alanı (`danismanIdler`: kaydı görebilecek danışmanlar): Admin/Denetçi çoklu seçebilir
// (gövdede `danismanIdler` dizisi varsa; boş dizi = danışman yok). Danışman kullanıcı eklerse kendisi atanır;
// danışman güncellerken değiştiremez. `yeni`: kayıt ilk kez oluşturuluyor mu
export function danismanAlani(req, govde, yeni = false) {
  const k = req.kullanici;
  if (k?.rol === 'danisman') return yeni ? { danismanIdler: k.kaynakId ? [k.kaynakId] : [] } : {};
  if (Array.isArray(govde?.danismanIdler)) {
    return { danismanIdler: [...new Set(govde.danismanIdler.filter((v) => mongoose.isValidObjectId(v)).map(String))] };
  }
  return {};
}

function gecerliId(v) {
  return v && mongoose.isValidObjectId(v) ? v : null;
}
