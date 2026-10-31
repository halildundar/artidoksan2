// Şablon içindeki görsel tag'lerinin (firma_logo, firma_imza_kase,
// denetci_imza) GERÇEK metin çerçevesi boyutunu ve dikey hizasını render
// ANINDA okur/düzeltir — kalıcı dosya değişikliği YAPILMAZ, her yazdırmada
// güncel şablon neyse ona göre çalışır. Amaç: şablonu hazırlayan kişi metin
// kutusunu istediği gibi boyutlandırıp konumlandırsın (kullanıcı kararı:
// "metin kutusunu ben ekleyip anchorlayacağım templatelerde"), kod HER
// ZAMAN o güncel boyuta göre görseli ölçeklesin ve kutu içinde dikey
// ortalasın — sabit piksel hedefleri her yeni şablonda/boyut
// değişikliğinde elle yeniden kalibre etmeye gerek kalmasın.

const PT_TO_PX = 96 / 72
const EMU_TO_PX = 1 / 9525

// Sadece <w:t>...</w:t> içeriklerini sırayla birleştirip her karakterin
// orijinal XML'deki index'ini haritalar — Word'ün yazım denetimi
// (<w:proofErr>) bir tag'i birden fazla run'a bölebildiğinden (örn.
// "firma_imza_kase" -> "firma_imza" + proofErr + "kase" run'ları), ham
// XML'de basit bir indexOf tag'i BULAMAZ (canlı doğrulanan hata) — bu
// yüzden arama düz metinde yapılıp sonuç orijinal pozisyona geri eşlenir.
function duzMetinHaritasi(xml) {
  const parcalar = []
  const harita = []
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let m
  while ((m = re.exec(xml))) {
    const baslangic = m.index + m[0].indexOf('>') + 1
    const metin = m[1]
    for (let i = 0; i < metin.length; i++) {
      parcalar.push(metin[i])
      harita.push(baslangic + i)
    }
  }
  return { duzMetin: parcalar.join(''), harita }
}

// tag'i saran, HÂLÂ AÇIK (tagPos'ta kapanmamış) en yakın <wp:anchor>'ı
// geriye doğru arar; içindeki <wp:extent>'i, <wps:bodyPr ... anchor="X">
// özniteliğinin değerinin XML'deki tam konumunu VE (varsa) kutunun kendi
// dönüklüğünü/konumunu döner (DrawingML — modern Word text box'ları,
// LibreOffice PDF dönüşümünde FİİLEN kullanılan dal). rotDerece/konum
// SADECE kutu döndürülmüşse (a:xfrm rot=) dolu döner — bkz.
// sablonGorselDondur (kullanıcı geri bildirimi: LibreOffice döndürülmüş
// bir metin çerçevesi İÇİNDEKİ resmi PDF'e çevirirken döndürmüyor, canlı
// doğrulanan hata — resim çerçeveden çıkarılıp KENDİ başına döndürülmüş
// bağımsız bir nesne olarak yeniden yerleştirilir).
function drawingMLCercevesiBul(xml, tagPos) {
  let aramaSonu = tagPos
  while (true) {
    const baslangic = xml.lastIndexOf('<wp:anchor', aramaSonu)
    if (baslangic === -1) return null
    const kapanisIdx = xml.indexOf('</wp:anchor>', baslangic)
    if (kapanisIdx !== -1 && kapanisIdx < tagPos) {
      aramaSonu = baslangic - 1
      continue
    }
    const segmentSonu = kapanisIdx === -1 ? xml.length : kapanisIdx
    const segment = xml.slice(baslangic, Math.min(segmentSonu, baslangic + 3000))
    const extentM = segment.match(/<wp:extent cx="(\d+)" cy="(\d+)"/)
    if (!extentM) return null
    const boyut = [Number(extentM[1]) * EMU_TO_PX, Number(extentM[2]) * EMU_TO_PX]
    const rotM = segment.match(/<a:xfrm rot="(-?\d+)"/)
    const rotDerece = rotM ? Number(rotM[1]) : 0
    const posHM = segment.match(/<wp:positionH relativeFrom="(\w+)"><wp:posOffset>(-?\d+)<\/wp:posOffset><\/wp:positionH>/)
    const posVM = segment.match(/<wp:positionV relativeFrom="(\w+)"><wp:posOffset>(-?\d+)<\/wp:posOffset><\/wp:positionV>/)
    const konum = rotDerece !== 0 && posHM && posVM
      ? { hRelatif: posHM[1], hOfset: Number(posHM[2]), vRelatif: posVM[1], vOfset: Number(posVM[2]) }
      : null
    const bodyPrM = segment.match(/<wps:bodyPr[^>]*\banchor="(\w+)"/)
    if (!bodyPrM) return { boyut, anchorPos: null, anchorUzunluk: 0, rotDerece, konum }
    const anchorPos = baslangic + bodyPrM.index + bodyPrM[0].length - bodyPrM[1].length - 1
    return { boyut, anchorPos, anchorUzunluk: bodyPrM[1].length, rotDerece, konum }
  }
}

// DrawingML yoksa (eski/uyumluluk şablonları), tag'den ÖNCEKİ makul bir
// pencere içinde VML şeklin style="...width:Xpt;height:Ypt;...
// v-text-anchor:Y..." dizgisini arar (VML şekiller stilini AÇILIŞ
// etiketinde taşır, tag ondan SONRA gelir) — tam XML iç içelik takibi
// yerine bilinçli bir sezgisel (bkz. plan: gerçek şablonlarla doğrulandı).
function vmlCercevesiBul(xml, tagPos) {
  const pencereBaslangic = Math.max(0, tagPos - 2500)
  const pencere = xml.slice(pencereBaslangic, tagPos)
  const stilRe = /width:([\d.]+)pt;height:([\d.]+)pt[^"]*/g
  let sonEslesme = null
  let m
  while ((m = stilRe.exec(pencere))) sonEslesme = m
  if (!sonEslesme) return null
  const boyut = [Number(sonEslesme[1]) * PT_TO_PX, Number(sonEslesme[2]) * PT_TO_PX]
  const vAnchorM = sonEslesme[0].match(/v-text-anchor:(\w+)/)
  if (!vAnchorM) return { boyut, anchorPos: null, anchorUzunluk: 0 }
  const anchorPos = pencereBaslangic + sonEslesme.index + vAnchorM.index + 'v-text-anchor:'.length
  return { boyut, anchorPos, anchorUzunluk: vAnchorM[1].length }
}

// Döndürülmüş kutulardaki tag'in render SONRASI (docxtemplater resmi
// bastıktan sonra) bulunabilmesi için render ÖNCESİ paragrafın sonuna
// eklenen görünmez işaretleyici — Unicode Özel Kullanım Alanı (U+E000)
// karakteriyle sarılı, gerçek firma verisiyle asla çakışmaz. docxtemplater
// SADECE kendi tanıdığı `{...}`/`{%...}` tag'lerine dokunur, bu düz metni
// OLDUĞU GİBİ bırakır — render sonrası aynı metni arayıp resmin bu
// paragrafın neresinde bittiğini buluruz (bkz. sablonGorselDondur).
const ISARETLEYICI_ON = 'gorsel_don:'
const ISARETLEYICI_SON = ''

function isaretleyiciOlustur(tagAdi) {
  return ISARETLEYICI_ON + tagAdi + ISARETLEYICI_SON
}

// GÜVENLİK PAYI — kutunun nominal extent'inden bir miktar küçük hedeflenir
// (kenarlarda birkaç pikselik taşma/kırpılma payı). Kullanıcı isteği:
// "resmi her daim metin kutusu genişliğine göre genişlet büyüt" — pay
// önceden %15 idi (0.85), görseller kutuya göre gereğinden küçük kalıyordu;
// artık kutunun neredeyse tamamı kullanılır (%3 pay yeterli, service.js
// createImageModule'daki genişlik-bazlı ölçekleme zaten en-boy oranını
// koruduğundan taşma riski minimaldir).
const GUVENLI_PAY_ORANI = 0.97

// xml: word/document.xml içeriği (string). tagIsimleri: aranacak görsel
// tag adları (örn. ['firma_logo','firma_imza_kase','denetci_imza']).
// Dönen: { xml: (anchor="ctr"/v-text-anchor:middle olarak düzeltilmiş,
// SADECE bulunan görsel tag'lerin kendi çerçeveleri — belgedeki alakasız
// diğer metin çerçeveleri DOKUNULMADAN kalır) yeni XML, boyutlar:
// { tagAdi: [genislikPx, yukseklikPx] } (bulunamayan tag'ler için —örn.
// metin kutusu yerine düz tablo hücresine yerleştirilmiş, zaten
// w:vAlign=center ile ortalanan tag'ler— anahtar YOK, çağıran taraf kendi
// varsayılanına düşer) }.
export function sablonGorselYerlesimHazirla(xml, tagIsimleri) {
  const { duzMetin, harita } = duzMetinHaritasi(xml)
  const boyutlar = {}
  const donduruler = {}
  const duzeltmeler = []
  for (const tagAdi of tagIsimleri) {
    const duzIdx = duzMetin.indexOf(tagAdi)
    if (duzIdx === -1) continue
    const xmlIdx = harita[duzIdx]
    const bulunan = drawingMLCercevesiBul(xml, xmlIdx) ?? vmlCercevesiBul(xml, xmlIdx)
    if (!bulunan) continue
    boyutlar[tagAdi] = [Math.round(bulunan.boyut[0] * GUVENLI_PAY_ORANI), Math.round(bulunan.boyut[1] * GUVENLI_PAY_ORANI)]
    if (bulunan.anchorPos != null) {
      const mevcutDeger = xml.slice(bulunan.anchorPos, bulunan.anchorPos + bulunan.anchorUzunluk)
      const yeniDeger = mevcutDeger === 'top' ? 'middle' : mevcutDeger === 't' ? 'ctr' : null
      if (yeniDeger) duzeltmeler.push({ pos: bulunan.anchorPos, eskiUzunluk: bulunan.anchorUzunluk, yeniDeger })
    }
    // Kutu döndürülmüşse (bkz. drawingMLCercevesiBul üst yorumu) render
    // sonrası bulunabilmesi için paragrafın SONUNA (kapanış </w:p>'den
    // hemen önce) görünmez bir işaretleyici run'ı eklenir — sıfır uzunluklu
    // bir "düzeltme" (eskiUzunluk: 0) olarak AYNI sondan-başa listesine
    // eklenir, böylece pozisyon kayması diğer düzeltmelerle TUTARLI ele alınır.
    if (bulunan.konum) {
      donduruler[tagAdi] = { rotDerece: bulunan.rotDerece, konum: bulunan.konum }
      const paragrafKapanisIdx = xml.indexOf('</w:p>', xmlIdx)
      if (paragrafKapanisIdx !== -1) {
        const isaretleyiciRunXml = `<w:r><w:t xml:space="preserve">${isaretleyiciOlustur(tagAdi)}</w:t></w:r>`
        duzeltmeler.push({ pos: paragrafKapanisIdx, eskiUzunluk: 0, yeniDeger: isaretleyiciRunXml })
      } else {
        delete donduruler[tagAdi]
      }
    }
  }
  // Düzeltmeler SONDAN başa doğru uygulanır — splice edilen metnin uzunluğu
  // değiştiğinden (örn. "t" -> "ctr" veya 0 uzunluklu bir ekleme), önce
  // işlenen bir düzeltme SONRAKİ (daha büyük index'li) pozisyonları
  // kaydırır; sondan başa gidince daha KÜÇÜK index'li, henüz işlenmemiş
  // pozisyonlar hiç etkilenmez.
  duzeltmeler.sort((a, b) => b.pos - a.pos)
  let yeniXml = xml
  for (const { pos, eskiUzunluk, yeniDeger } of duzeltmeler) {
    yeniXml = yeniXml.slice(0, pos) + yeniDeger + yeniXml.slice(pos + eskiUzunluk)
  }
  return { xml: yeniXml, boyutlar, donduruler }
}

// acilisTag'in İÇİNDEKİ iç içe (nested) tekrarlarını da sayarak DENGELİ
// (balanced) eşleşen kapanışı bulur — basit indexOf/regex kullanımı
// içi içe aynı isimli etiketlerde YANLIŞ kapanışı bulabilir.
function balancedBul(metin, acilisTag, kapanisTag, baslangic) {
  let derinlik = 1
  let j = baslangic + acilisTag.length
  while (derinlik > 0) {
    const sonrakiAcilis = metin.indexOf(acilisTag, j)
    const sonrakiKapanis = metin.indexOf(kapanisTag, j)
    if (sonrakiKapanis === -1) return null
    if (sonrakiAcilis !== -1 && sonrakiAcilis < sonrakiKapanis) {
      derinlik++
      j = sonrakiAcilis + acilisTag.length
    } else {
      derinlik--
      j = sonrakiKapanis + kapanisTag.length
    }
  }
  return { baslangic, bitis: j }
}

// regex'in (global bayraklı) sinirIdx'ten ÖNCEKİ SON eşleşmesini döner —
// String.lastIndexOf regex kabul etmediğinden (ör. `<w:r>`nin `<w:r
// w:rsidR="...">` gibi öznitelikli hâllerini de yakalamak için) elle
// ileri taramayla en son eşleşme tutulur.
function sonEslesmeOncesindeBul(metin, regexKaynagi, sinirIdx) {
  const re = new RegExp(regexKaynagi, 'g')
  let son = null
  let m
  while ((m = re.exec(metin)) && m.index < sinirIdx) son = m
  return son
}

// Render SONRASI çağrılır (bkz. service.js yazdirBelge) —
// sablonGorselYerlesimHazirla'nın işaretlediği döndürülmüş kutulardaki
// resmi bulur, kutunun KENDİSİNDEN çıkarıp bağımsız, KENDİ dönüklüğüne
// sahip yüzen (anchor) bir nesne olarak yeniden yerleştirir. Neden:
// LibreOffice, döndürülmüş bir metin çerçevesi (wps:wsp, a:xfrm rot=)
// İÇİNE gömülü satır-içi (inline) bir resmi PDF'e çevirirken
// döndürmüyor — hem şablonun DrawingML rotasyonu hem eski-Word-uyumluluk
// (VML) rotasyonu doğru olsa bile (canlı doğrulanan davranış, kullanıcı
// geri bildirimi: "çıkmıyor eğik"). Resmi bağımsız bir wp:anchor nesnesi
// olarak (kendi a:xfrm rot'uyla) yerleştirmek bu sınırlamayı bypass eder
// — kutunun ESKİ konumu/boyutu yeni nesneye AYNEN taşınır (kullanıcı
// isteği: "istediğim pozisyonda değil" — konum kutudakiyle BİREBİR
// tutulur, sadece taşıyıcı değişir).
export function sablonGorselDondur(xml, donduruler) {
  let yeniXml = xml
  for (const [tagAdi, { rotDerece, konum }] of Object.entries(donduruler)) {
    const isaretleyici = isaretleyiciOlustur(tagAdi)
    const isaretIdx = yeniXml.indexOf(isaretleyici)
    if (isaretIdx === -1) continue
    const paragrafBaslangicM = sonEslesmeOncesindeBul(yeniXml, '<w:p(?:\\s[^>]*)?>', isaretIdx)
    const paragrafKapanis = yeniXml.indexOf('</w:p>', isaretIdx)
    if (!paragrafBaslangicM || paragrafKapanis === -1) continue
    const paragrafBaslangic = paragrafBaslangicM.index
    const paragrafIcerik = yeniXml.slice(paragrafBaslangic, paragrafKapanis)

    const cizimIdxRel = paragrafIcerik.indexOf('<w:drawing>')
    if (cizimIdxRel === -1) continue
    const cizimEslesme = balancedBul(paragrafIcerik, '<w:drawing>', '</w:drawing>', cizimIdxRel)
    if (!cizimEslesme) continue
    const cizimXml = paragrafIcerik.slice(cizimEslesme.baslangic, cizimEslesme.bitis)
    const extentM = cizimXml.match(/<wp:extent cx="(\d+)" cy="(\d+)"/)
    const picM = cizimXml.match(/<pic:pic[\s\S]*?<\/pic:pic>/)
    if (!extentM || !picM) continue

    // Resmin KENDİ dönüşümüne rotasyon eklenir — kutunun rotasyonuna
    // GÜVENMEK yerine (LibreOffice'te çalışmıyor) resim bağımsız olarak
    // kendi açısıyla döner.
    const picXml = picM[0].replace('<a:xfrm>', `<a:xfrm rot="${rotDerece}">`)
    const [, cx, cy] = extentM
    const docPrId = 800000 + Math.floor(Math.random() * 90000)
    const ankorXml =
      '<w:r><w:drawing>' +
      `<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${docPrId}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">` +
      '<wp:simplePos x="0" y="0"/>' +
      `<wp:positionH relativeFrom="${konum.hRelatif}"><wp:posOffset>${konum.hOfset}</wp:posOffset></wp:positionH>` +
      `<wp:positionV relativeFrom="${konum.vRelatif}"><wp:posOffset>${konum.vOfset}</wp:posOffset></wp:positionV>` +
      `<wp:extent cx="${cx}" cy="${cy}"/>` +
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
      '<wp:wrapNone/>' +
      `<wp:docPr id="${docPrId}" name="DonukGorsel${docPrId}"/>` +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
      `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">${picXml}</a:graphicData>` +
      '</a:graphic>' +
      '</wp:anchor>' +
      '</w:drawing></w:r>'

    // Eski çizimi saran run — nested <w:r> olmasın diye <w:drawing>
    // DEĞİL, onu saran <w:r>...</w:r> baştan sona silinip yerine yeni
    // anchor run'ı konur.
    const eskiRunM = sonEslesmeOncesindeBul(paragrafIcerik, '<w:r(?:\\s[^>]*)?>', cizimEslesme.baslangic)
    if (!eskiRunM) continue
    const eskiRunBitisRel = paragrafIcerik.indexOf('</w:r>', cizimEslesme.bitis) + '</w:r>'.length
    const eskiRunBaslangicMutlak = paragrafBaslangic + eskiRunM.index
    const eskiRunBitisMutlak = paragrafBaslangic + eskiRunBitisRel

    // İşaretleyici run'ı SONDAN silinir (eski çizim run'ından SONRA
    // geldiğinden önce o kaldırılır, aksi halde eski çizimin pozisyonu kayar).
    const isaretRunBaslangic = yeniXml.lastIndexOf('<w:r>', isaretIdx)
    const isaretRunBitis = yeniXml.indexOf('</w:r>', isaretIdx) + '</w:r>'.length
    yeniXml = yeniXml.slice(0, isaretRunBaslangic) + yeniXml.slice(isaretRunBitis)

    yeniXml = yeniXml.slice(0, eskiRunBaslangicMutlak) + ankorXml + yeniXml.slice(eskiRunBitisMutlak)
  }
  return yeniXml
}
