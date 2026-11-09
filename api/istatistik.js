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
      makine, tahrik, denetimModul, aksamDagilim, yakinda, sonAsansorler, sonDenetimler, sonTescilKayitlari,
    ] = await Promise.all([
      say('Firma'), say('Asansor'), say('Denetim'), say('Tescil'),
      dagilim('Asansor', 'makinaKonumu'), dagilim('Asansor', 'tahrikTipi'), dagilim('Denetim', 'modul'),
      Aksam.aggregate([{ $group: { _id: { kod: '$bilesenTipiKodu', durum: '$durum' }, adet: { $sum: 1 } } }]),
      // Aktif olup 90 gün içinde geçerliliği bitecek belgeler
      Aksam.countDocuments({ durum: 'aktif', gecerlilikBitis: { $ne: null, $gte: simdi, $lte: doksanGun } }),
      // Son eklenen 10 asansör ve 10 denetim
      mongoose.model('Asansor').find().sort({ createdAt: -1 }).limit(10)
        .select('seriNo yapiRuhsatNo il ilce makinaKonumu hiz beyanYuku kisiSayisi tahrikTipi askiTipi createdAt').lean(),
      mongoose.model('Denetim').find().sort({ createdAt: -1 }).limit(10)
        .select('modul denetimTarihi firmaId asansorId createdAt')
        .populate('firmaId', 'ad').populate('asansorId', 'seriNo yapiRuhsatNo').lean(),
      mongoose.model('Tescil').find().sort({ createdAt: -1 }).limit(10)
        .select('belediyeAdi dilekceTarihi firmaId asansorId createdAt')
        .populate('firmaId', 'ad')
        .populate('asansorId', 'seriNo yapiRuhsatNo makinaKonumu hiz beyanYuku tahrikTipi askiTipi').lean(),
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
      sonAsansorler,
      sonDenetimler: sonDenetimler.map((d) => ({
        _id: d._id, modul: d.modul, tarih: d.denetimTarihi ?? d.createdAt,
        firma: d.firmaId?.ad ?? '', asansor: d.asansorId?.seriNo || d.asansorId?.yapiRuhsatNo || '',
      })),
      sonTescilKayitlari: sonTescilKayitlari.map((t) => ({
        _id: t._id, tarih: t.dilekceTarihi ?? t.createdAt, belediye: t.belediyeAdi ?? '', firma: t.firmaId?.ad ?? '',
        asansor: t.asansorId?.seriNo || t.asansorId?.yapiRuhsatNo || '',
        makinaKonumu: t.asansorId?.makinaKonumu ?? null, hiz: t.asansorId?.hiz ?? null, beyanYuku: t.asansorId?.beyanYuku ?? null,
        tahrikTipi: t.asansorId?.tahrikTipi ?? null, askiTipi: t.asansorId?.askiTipi ?? null,
      })),
      komponent: { toplam: toplam(), guvenlik: toplam('guvenlik_aksami'), bilesen: toplam('asansor_bileseni'), yakinda, tipler },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
