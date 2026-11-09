import express from 'express';
import mongoose from 'mongoose';
import { BILESEN_TIPLERI } from './katalog.js';

// Anasayfa istatistikleri: tek istekte sayılar (liste çekmeden, veritabanında sayılır)
const router = express.Router();

const say = (model) => mongoose.model(model).countDocuments();
const dagilim = (model, alan) =>
  mongoose.model(model).aggregate([{ $group: { _id: `$${alan}`, adet: { $sum: 1 } } }]);
const harita = (liste) => Object.fromEntries(liste.filter((x) => x._id).map((x) => [x._id, x.adet]));

router.get('/', async (_req, res) => {
  try {
    const simdi = new Date();
    const doksanGun = new Date(simdi.getTime() + 90 * 86400_000);
    const Aksam = mongoose.model('AksamBelgesi');

    const [
      firma, asansor, denetim, tescil,
      makine, tahrik, denetimModul, aksamDagilim, yakinda,
    ] = await Promise.all([
      say('Firma'), say('Asansor'), say('Denetim'), say('Tescil'),
      dagilim('Asansor', 'makinaKonumu'), dagilim('Asansor', 'tahrikTipi'), dagilim('Denetim', 'modul'),
      Aksam.aggregate([{ $group: { _id: { kod: '$bilesenTipiKodu', durum: '$durum' }, adet: { $sum: 1 } } }]),
      // Aktif olup 90 gün içinde geçerliliği bitecek belgeler
      Aksam.countDocuments({ durum: 'aktif', gecerlilikBitis: { $ne: null, $gte: simdi, $lte: doksanGun } }),
    ]);

    // Bileşen tipine göre aktif / pasif adetleri (tüm tipler listelenir, belgesi olmayan 0)
    const tipler = BILESEN_TIPLERI.map((t) => {
      const aktif = aksamDagilim.find((x) => x._id.kod === t.kod && x._id.durum === 'aktif')?.adet ?? 0;
      const pasif = aksamDagilim.find((x) => x._id.kod === t.kod && x._id.durum === 'pasif')?.adet ?? 0;
      return { kod: t.kod, ad: t.ad, kategori: t.kategori, aktif, pasif };
    });
    const toplam = (k) => tipler.filter((t) => !k || t.kategori === k).reduce((a, t) => ({ aktif: a.aktif + t.aktif, pasif: a.pasif + t.pasif }), { aktif: 0, pasif: 0 });

    res.json({
      firma, asansor, denetim, tescil,
      asansorDagilimi: { makine: harita(makine), tahrik: harita(tahrik) },
      denetimModulleri: harita(denetimModul),
      komponent: { toplam: toplam(), guvenlik: toplam('guvenlik_aksami'), bilesen: toplam('asansor_bileseni'), yakinda, tipler },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
