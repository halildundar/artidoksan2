/* eslint-disable */
// @ts-nocheck
// "Modül E Kalite El Kitabı" artifact'ının üretici kısmı (arayüz hariç): firma bilgisi/politika/hedef/doküman
// listesi, el kitabı bölümleri, ~70 şablon, uygulama kayıtları ve DOM→DOCX yazıcısı.
// Durum (S) dışarıdan verilir; JSZip ve indirme işlevi env ile enjekte edilir.
export function createKysEngine(env) {
"use strict";
var S = null;
var setStatus = function (k, m) { if (env.onStatus) env.onStatus(k, m); };
var changed = function () { if (env.onChange) env.onChange(); };
var render = function () {}, refreshChrome = function () {};
var tplQ = "", tplType = "", tplEdit = false, selTpl = "PR-04.01";
var STANDALONE = false;
var FIELD_GROUPS=[
 {title:"Firma bilgileri",fields:[
  ["unvan","Ticari unvan","text","Örn. ABC Asansör San. ve Tic. Ltd. Şti.","wide"],
  ["kisaKod","Firma kısa kodu","text","Proje numarasında kullanılır (örn. ABC)"],
  ["il","İl","text","Örn. Gaziantep"],
  ["adres","Merkez adresi","text","","wide"],
  ["telefon","Telefon","text",""],
  ["eposta","E-posta","text",""],
  ["web","Web sitesi","text",""],
  ["vergiDairesi","Vergi dairesi","text",""],
  ["vergiNo","Vergi no","text",""],
  ["mersis","MERSİS / ticaret sicil no","text",""],
  ["hyb","Hizmet Yeterlilik Belgesi no","text",""],
  ["hybTarih","HYB geçerlilik tarihi","date",""],
  ["teknikPersonel","Teknik personel sayısı","number",""],
  ["idariPersonel","İdari personel sayısı","number",""],
  ["kapasite","Yıllık montaj kapasitesi (adet)","number",""],
  ["bakimAdet","Bakımı yapılan asansör (adet)","number",""],
  ["kurtarma","7/24 kurtarma hattı","text","Kabin etiketine ve kılavuza yazılır"]
 ]},
 {title:"Tip inceleme ve Modül E onaylanmış kuruluşları",fields:[
  ["tipSertNo","AB tip inceleme sertifika no (Modül B)","text",""],
  ["tipSertTarih","Tip sertifikası geçerlilik tarihi","date",""],
  ["tipKurulus","Tip sertifikasını veren kuruluş","text",""],
  ["tipKurulusNo","Kuruluş kimlik no (4 hane)","text",""],
  ["modelKapsam","Model asansör varyant kapsamı","textarea","Örn. MR/MRL, 320–1000 kg, 1,0–1,75 m/s, 2:1 askı, en fazla 16 durak","wide"],
  ["meKurulus","Modül E onaylanmış kuruluşu","text",""],
  ["meKurulusNo","Modül E kuruluş kimlik no","text","CE işaretinin yanında yer alır"],
  ["meBelgeNo","Kalite sistemi onay belgesi no","text","Onay sonrası doldurulur"],
  ["meBelgeTarih","Onay belgesi tarihi","date",""]
 ]},
 {title:"El kitabı kontrol bilgileri",fields:[
  ["dokKod","Doküman kodu","text",""],
  ["ilkYayin","İlk yayın tarihi","date",""],
  ["revNo","Revizyon no","text",""],
  ["revTarih","Revizyon tarihi","date",""],
  ["dagitim","Dağıtım","textarea","Kontrollü kopya sahipleri","wide"]
 ]},
 {title:"Görevliler",fields:[
  ["gm","Genel Müdür","text",""],
  ["kyt","Kalite Yönetim Temsilcisi","text",""],
  ["tm","Teknik Müdür (Asansör Mühendisi)","text",""],
  ["smd","Son Muayene ve Deney Sorumlusu","text",""],
  ["sef","Montaj Şantiye Şefi","text",""],
  ["bakimSefi","Bakım ve Revizyon Şefi","text",""],
  ["satin","Satın Alma ve Depo Sorumlusu","text",""]
 ]}
];
var LABELS={};FIELD_GROUPS.forEach(function(g){g.fields.forEach(function(f){LABELS[f[0]]=f[1];});});

var POLICY=[
 "Monte ettiğimiz her asansörü, tip inceleme sertifikasındaki model asansöre ve Asansör Yönetmeliği (2014/33/AB) temel sağlık ve güvenlik gereklerine tam uygun olarak piyasaya arz etmek.",
 "Hiçbir asansörü, onaylı son muayene ve deney prosedürü eksiksiz tamamlanıp kayıt altına alınmadan CE işaretlememek ve hizmete almamak.",
 "Yalnızca AB tip inceleme sertifikalı güvenlik aksamları ve onaylı tedarikçilerden temin edilen malzemeler kullanmak.",
 "Montaj, revizyon ve bakım personelimizi yetkin, belgeli ve sürekli eğitimli tutmak.",
 "Can ve mal güvenliğini, iş sağlığı ve güvenliğini her ticari hedefin önünde tutmak.",
 "Müşteri şikayetlerini ve sahadan gelen geri bildirimleri sistematik olarak değerlendirerek kalite sistemimizi sürekli iyileştirmek.",
 "Onaylanmış kuruluş, Bakanlık ve muayene kuruluşlarıyla şeffaf işbirliği yapmak."
];
var HEDEF=[
 ["Son muayenede ilk seferde geçiş","Uygunsuzluksuz Son Muayene ve Deney Formu sayısı / toplam form sayısı × 100","≥ %90","Aylık","Teknik Müdür"],
 ["A tipi muayenede ilk kontrolde yeşil etiket","Yeşil etiket / ilk kontrol × 100","≥ %85","3 aylık","Bakım Şefi"],
 ["Onaylanmış kuruluş tetkik bulgusu","Majör uygunsuzluk sayısı","0","Her tetkik","KYT"],
 ["Habersiz ziyarette şantiye uygunsuzluğu","Majör bulgu sayısı","0","Her ziyaret","Teknik Müdür"],
 ["Montaj teslim süresine uyum","Zamanında teslim / toplam × 100","≥ %90","3 aylık","Proje Sorumlusu"],
 ["Mahsur kalmada ilk müdahale","Ortalama müdahale süresi","≤ 60 dk","Aylık","Bakım Şefi"],
 ["Tekrarlayan arıza","30 gün içinde aynı arıza / toplam × 100","≤ %5","Aylık","Bakım Şefi"],
 ["Müşteri memnuniyeti","FR-11.04 / FR-11.05 anket ortalaması (5 üzerinden)","≥ 4,2","Yıllık","KYT"],
 ["Kalibrasyon uyumu","Süresi geçmiş ekipman sayısı","0","Aylık","KYT"],
 ["Eğitim planı gerçekleşmesi","Gerçekleşen / planlanan saat × 100","≥ %90","6 aylık","İdari İşler"],
 ["İş kazası","Kayıp günlü kaza sayısı","0","Aylık","Teknik Müdür"]
].map(function(r){return {hedef:r[0],gosterge:r[1],deger:r[2],siklik:r[3],sorumlu:r[4]};});

var DOCS=[
 ["PR-04.01","Eğitim ve Yetkinlik Prosedürü","4"],["PR-05.01","Doküman ve Kayıt Kontrolü Prosedürü","5"],
 ["PR-06.01","Tip Sertifikası Uyumu, Proje ve Değişiklik Kontrolü","6"],["PR-07.01","Satın Alma, Tedarikçi Değerlendirme ve Giriş Kontrolü","7"],
 ["PR-08.01","Montaj ve Ara Kontroller Prosedürü","8"],["PR-09.01","Son Muayene ve Deneyler Prosedürü","9"],
 ["PR-10.01","Ölçme ve Test Ekipmanlarının Kontrolü","10"],["PR-11.01","Uygunsuz Ürünün Kontrolü","11"],
 ["PR-11.02","Düzeltici ve Önleyici Faaliyetler","11"],["PR-11.03","Müşteri Şikayetleri","11"],
 ["PR-12.01","CE İşaretleme, AB Uygunluk Beyanı ve Teslim","12"],["PR-13.01","Revizyon (Modernizasyon)","13"],
 ["PR-14.01","Bakım, Arıza ve Kurtarma","14"],["PR-15.01","İç Tetkik","15"],["PR-15.02","Yönetimin Gözden Geçirmesi","15"],
 ["TL-08.01","Kuyu Ölçümü ve Şakul Talimatı","8"],["TL-08.02","Ray Montaj Talimatı","8"],["TL-08.03","Makine ve Şase Montaj Talimatı","8"],
 ["TL-08.04","Kabin ve Karkas Montaj Talimatı","8"],["TL-08.05","Karşı Ağırlık Montaj Talimatı","8"],["TL-08.06","Halat / Kayış Bağlantı Talimatı","8"],
 ["TL-08.07","Kapı Montaj ve Ayar Talimatı","8"],["TL-08.08","Kumanda Panosu ve Kablolama Talimatı","8"],
 ["TL-08.09","Güvenlik Aksamı Montaj ve Ayar Talimatı","8"],["TL-08.10","İlk Çalıştırma ve Parametre Ayar Talimatı","8"],
 ["TL-09.01","Fren ve Traksiyon Deney Talimatı","9"],["TL-09.02","Paraşüt ve Regülatör Deney Talimatı","9"],["TL-09.03","Tampon Deney Talimatı","9"],
 ["TL-09.04","UCMP Deney Talimatı","9"],["TL-09.05","Elektriksel Ölçüm Talimatı","9"],["TL-09.06","Statik Deney Talimatı","9"],
 ["TL-14.01","Acil Kurtarma Talimatı (Makine Daireli)","14"],["TL-14.02","Acil Kurtarma Talimatı (Makine Dairesiz)","14"],["TL-16.01","İSG Genel Talimatı","16"],
 ["FR-04.01","Eğitim İhtiyaç Analizi","4"],["FR-04.02","Yıllık Eğitim Planı","4"],["FR-04.03","Eğitim Katılım ve Etkinlik Formu","4"],
 ["FR-04.04","Yetki Matrisi","4"],["FR-04.05","Personel Dosyası Kontrol Listesi","4"],
 ["FR-05.02","Doküman Ana Listesi","5"],["FR-05.03","Dış Kaynaklı Doküman Listesi","5"],
 ["FR-06.01","Varyant Uygunluk Kontrol Listesi","6"],["FR-06.03","Proje Değişiklik Formu","6"],["FR-06.04","Teknik Dosya Kontrol Listesi","6"],
 ["FR-07.01","Tedarikçi Değerlendirme Formu","7"],["FR-07.02","Onaylı Tedarikçi Listesi","7"],["FR-07.03","Proje Malzeme Listesi","7"],
 ["FR-07.04","Giriş Kontrol Formu","7"],["FR-07.05","Güvenlik Aksamı İzlenebilirlik Listesi","7"],
 ["FR-08.01","Kuyu Ölçüm ve Teslim Alma Formu","8"],["FR-08.02","Sevkiyat Kontrol Formu","8"],["FR-08.03","Ray Montaj Kontrol Formu","8"],
 ["FR-08.04","Makine ve Regülatör Montaj Kontrol Formu","8"],["FR-08.05","Kabin, Paraşüt ve Karşı Ağırlık Kontrol Formu","8"],
 ["FR-08.06","Halat / Kayış ve Askı Kontrol Formu","8"],["FR-08.07","Kapı Montaj Kontrol Formu","8"],["FR-08.08","Tampon ve Kuyu Dibi Kontrol Formu","8"],
 ["FR-08.09","Elektrik Tesisatı Kontrol Formu","8"],["FR-08.10","İlk Çalıştırma ve Ayar Formu","8"],["FR-08.11","Montaj Bitiş Bildirimi","8"],
 ["FR-09.01","Son Muayene ve Deney Formu","9"],["FR-09.03","Devam Eden Montajlar Listesi","9"],
 ["FR-10.01","Ekipman ve Kalibrasyon Planı","10"],
 ["FR-11.01","Uygunsuzluk ve DÖF Formu","11"],["FR-11.03","Şikayet Kayıt Formu","11"],["FR-11.04","Müşteri Memnuniyet Anketi (Montaj)","11"],["FR-11.05","Müşteri Memnuniyet Anketi (Teknik Servis)","11"],
 ["FR-12.01","CE Etiket Talep Formu","12"],["FR-12.02","AB Uygunluk Beyanı","12"],["FR-12.03","Teslim Tutanağı","12"],["FR-12.04","Piyasaya Arz Bildirim Listesi","12"],
 ["FR-13.01","Revizyon Değerlendirme Formu","13"],["FR-13.02","EN 81-80 Mevcut Durum Tespit Formu","13"],["FR-13.03","Revizyon Teslim Raporu","13"],
 ["FR-14.01","Periyodik Bakım Formu","14"],["FR-14.02","Arıza Kayıt Formu","14"],
 ["FR-15.01","Yıllık İç Tetkik Planı","15"],["FR-15.02","İç Tetkik Raporu","15"],["FR-15.03","YGG Tutanağı","15"],["FR-15.04","Kalite Hedefleri İzleme Tablosu","15"],["FR-15.05","İç Tetkik Soru Listesi","15"],["FR-15.06","Onaylanmış Kuruluş Denetim Takip Formu","15"]
].map(function(r){return {kod:r[0],ad:r[1],bolum:r[2],rev:"00",tarih:"",durum:"Taslak"};});

function defaults(){
  var v={};Object.keys(LABELS).forEach(function(k){v[k]="";});
  v.dokKod="KEK-01";v.revNo="00";
  v.dagitim="Kontrollü kopya: Genel Müdür, Teknik Müdür, KYT, Şantiye Şefleri, Bakım Şefi; onaylanmış kuruluşa elektronik kopya";
  return {v:v,politika:POLICY.slice(),hedefler:JSON.parse(JSON.stringify(HEDEF)),dokumanlar:JSON.parse(JSON.stringify(DOCS)),
    revizyonlar:[{rev:"00",tarih:"",bolum:"Tümü",aciklama:"İlk yayın",onay:"Genel Müdür"}],ozel:{},kayit:{egitim:[],tetkik:[],ygg:[],proje:[]},logo:null,savedAt:""};
}
function merge(base,src){
  if(!src||typeof src!=="object")return base;
  if(src.v)Object.keys(src.v).forEach(function(k){base.v[k]=src.v[k];});
  ["politika","hedefler","dokumanlar","revizyonlar"].forEach(function(k){if(Array.isArray(src[k]))base[k]=src[k];});
  if(src.ozel&&typeof src.ozel==="object"&&!Array.isArray(src.ozel))base.ozel=src.ozel;
  if(src.kayit&&typeof src.kayit==="object"&&!Array.isArray(src.kayit)){Object.keys(src.kayit).forEach(function(k){if(Array.isArray(src.kayit[k]))base.kayit[k]=src.kayit[k];});}
  (base.hedefler||[]).forEach(function(h){if(h&&h.gosterge==="Uygunsuzluksuz SMDF / toplam SMDF × 100")h.gosterge="Uygunsuzluksuz Son Muayene ve Deney Formu sayısı / toplam form sayısı × 100";});
  (function(){var L=base.dokumanlar||[],old=L.some(function(d){return d&&d.kod==="FR-14.02"&&/3 Aylık Bakım/.test(d.ad||"");});if(!old)return;
    base.dokumanlar=L.filter(function(d){return !(d&&/^FR-14\.0[234]$/.test(d.kod)&&/Aylık|Yıllık/.test(d.ad||""));});
    base.dokumanlar.forEach(function(d){if(d.kod==="FR-14.01"&&/Aylık Bakım/.test(d.ad||""))d.ad="Periyodik Bakım Formu";if(d.kod==="FR-14.05")d.kod="FR-14.02";});
    if(base.ozel){["FR-14.01","FR-14.02","FR-14.03","FR-14.04"].forEach(function(k){delete base.ozel[k];});if(base.ozel["FR-14.05"]){base.ozel["FR-14.02"]=base.ozel["FR-14.05"];delete base.ozel["FR-14.05"];}}})();
  [["FR-06.04","Teknik Dosya Kontrol Listesi","6","FR-06.03"],["FR-15.06","Onaylanmış Kuruluş Denetim Takip Formu","15","FR-15.05"]].forEach(function(nd){var L=base.dokumanlar||[];if(L.some(function(d){return d&&d.kod===nd[0];}))return;var ix=-1;L.forEach(function(d,i){if(d&&d.kod===nd[3])ix=i;});var o={kod:nd[0],ad:nd[1],bolum:nd[2],rev:"00",tarih:"",durum:"Taslak"};if(ix>=0)L.splice(ix+1,0,o);else L.push(o);});
  (function(){var L=base.dokumanlar||[];if(L.some(function(d){return d&&d.kod==="FR-11.04";}))return;var ix=-1;L.forEach(function(d,i){if(d&&d.kod==="FR-11.03")ix=i;});var nd=[{kod:"FR-11.04",ad:"Müşteri Memnuniyet Anketi (Montaj)",bolum:"11",rev:"00",tarih:"",durum:"Taslak"},{kod:"FR-11.05",ad:"Müşteri Memnuniyet Anketi (Teknik Servis)",bolum:"11",rev:"00",tarih:"",durum:"Taslak"}];if(ix>=0)L.splice.apply(L,[ix+1,0].concat(nd));else nd.forEach(function(x){L.push(x);});})();
  (function(){var L=base.dokumanlar||[];if(L.some(function(d){return d&&d.kod==="FR-15.05";}))return;var ix=-1;L.forEach(function(d,i){if(d&&d.kod==="FR-15.04")ix=i;});var nd={kod:"FR-15.05",ad:"İç Tetkik Soru Listesi",bolum:"15",rev:"00",tarih:"",durum:"Taslak"};if(ix>=0)L.splice(ix+1,0,nd);else L.push(nd);})();
  (base.dokumanlar||[]).forEach(function(d){if(d&&d.kod==="FR-09.01"&&d.ad==="Son Muayene ve Deney Formu (SMDF)")d.ad="Son Muayene ve Deney Formu";});
  function fixSMDF(t){return t.replace(/SMDF'yi/g,"Son Muayene ve Deney Formu'nu").replace(/SMDF'ye/g,"Son Muayene ve Deney Formu'na").replace(/SMDF'si/g,"Son Muayene ve Deney Formu").replace(/SMDF'de/g,"Son Muayene ve Deney Formu'nda").replace(/SMDF istatistikleri/g,"Son muayene ve deney istatistikleri").replace(/\bSMDF\b/g,"Son Muayene ve Deney Formu");}
  function deepFix(o){if(typeof o==="string")return o.indexOf("SMDF")>=0?fixSMDF(o):o;if(Array.isArray(o))return o.map(deepFix);if(o&&typeof o==="object"){Object.keys(o).forEach(function(k){o[k]=deepFix(o[k]);});return o;}return o;}
  ["politika","hedefler","revizyonlar"].forEach(function(k){base[k]=deepFix(base[k]);});base.kayit=deepFix(base.kayit);base.ozel=deepFix(base.ozel);
  if(src.logo&&typeof src.logo==="object")base.logo=src.logo;
  if(src.savedAt)base.savedAt=src.savedAt;
  return base;
}
var embedded={};try{embedded=JSON.parse(document.getElementById("kek-state").textContent||"{}");}catch(e){}
/* ---------- Firma çalışma alanı ---------- */
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function fmtD(d){if(!d)return "";var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d);return m?m[3]+"."+m[2]+"."+m[1]:d;}
function P(k,alt){var x=S.v[k];if(x!==undefined&&String(x).trim()!==""){var t=(LABELS[k]&&FIELD_TYPE[k]==="date")?fmtD(x):x;return '<span class="v-in">'+esc(t).replace(/\n/g,"<br>")+'</span>';}return '<span class="ph">['+esc(alt||LABELS[k]||k)+']</span>';}
function T(k){var x=S.v[k];return x&&String(x).trim()?String(x):"";}
var FIELD_TYPE={};FIELD_GROUPS.forEach(function(g){g.fields.forEach(function(f){FIELD_TYPE[f[0]]=f[2];});});
function $(s,r){return (r||document).querySelector(s);}
function table(head,rows,cls){return '<div class="ts"><table class="t'+(cls?" "+cls:"")+'"><thead><tr>'+head.map(function(h){return "<th>"+h+"</th>";}).join("")+'</tr></thead><tbody>'+rows.map(function(r){if(r.grp)return '<tr class="grp"><td colspan="'+head.length+'">'+r.grp+'</td></tr>';return "<tr>"+r.map(function(c,i){return "<td"+(i===0&&cls==="codes"?' class="c"':"")+">"+c+"</td>";}).join("")+"</tr>";}).join("")+'</tbody></table></div>';}
function ul(a){return "<ul>"+a.map(function(x){return "<li>"+x+"</li>";}).join("")+"</ul>";}
function ol(a){return "<ol>"+a.map(function(x){return "<li>"+x+"</li>";}).join("")+"</ol>";}

/* ---------- Tamamlanma ---------- */
var REQUIRED=["unvan","kisaKod","il","adres","telefon","eposta","vergiDairesi","vergiNo","mersis","hyb","tipSertNo","tipKurulus","tipKurulusNo","modelKapsam","meKurulus","meKurulusNo","dokKod","ilkYayin","revNo","revTarih","gm","kyt","tm","smd","sef","bakimSefi","satin"];
function completeness(){var n=0;REQUIRED.forEach(function(k){if(T(k))n++;});return [n,REQUIRED.length];}

/* ---------- El kitabı ---------- */
var LOGO_RE=/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/;
function logoOK(){return !!(S.logo&&typeof S.logo.src==="string"&&LOGO_RE.test(S.logo.src)&&S.logo.w>0&&S.logo.h>0);}
function logoImg(maxH,maxW){if(!logoOK())return "";var L=S.logo,h=maxH||56,w=Math.round(L.w*h/L.h),mw=maxW||190;if(w>mw){w=mw;h=Math.round(L.h*mw/L.w);}return '<img class="logo" src="'+L.src+'" width="'+w+'" height="'+h+'" alt="Firma logosu">';}
function firmCellHTML(){var name=T("unvan")?esc(T("unvan")):'<span class="ph">[Ticari unvan]</span>';var img=logoImg();if(!img)return name;return img+(S.logo.adGoster===false?"":'<div class="fn">'+name+'</div>');}
function projeKodu(){return (T("kisaKod")?esc(T("kisaKod")):'<span class="ph">[Kısa kod]</span>')+"-YYYY-NNN";}
var SECTIONS=[
 ["s0","Doküman kontrolü",function(){
  return '<p class="key">Bu el kitabı, '+P("unvan")+' tarafından 2014/33/AB Asansör Direktifi Ek X (Modül E – Ürün Kalite Güvencesine Dayalı Tipe Uygunluk) kapsamında onaylanmış kuruluşa sunulan kalite sisteminin ana belgesidir.</p>'+
  table(["Alan","Bilgi"],[["Doküman kodu",P("dokKod")],["İlk yayın tarihi",P("ilkYayin")],["Revizyon no / tarihi",P("revNo")+" / "+P("revTarih")],["Hazırlayan","Kalite Yönetim Temsilcisi – "+P("kyt")],["Kontrol eden","Teknik Müdür – "+P("tm")],["Onaylayan","Genel Müdür – "+P("gm")],["Dağıtım",P("dagitim")],["Saklama yeri","Elektronik doküman yönetim sistemi ve KYT arşivi"]])+
  '<h3>Revizyon geçmişi</h3>'+table(["Rev.","Tarih","Değişen bölüm","Açıklama","Onay"],S.revizyonlar.map(function(r){return [esc(r.rev),esc(fmtD(r.tarih))||'<span class="ph">[tarih]</span>',esc(r.bolum),esc(r.aciklama),esc(r.onay)];}))+
  '<h3>Onay</h3>'+table(["Görev","Ad Soyad","İmza","Tarih"],[["Hazırlayan – KYT",P("kyt"),"",""],["Kontrol eden – Teknik Müdür",P("tm"),"",""],["Onaylayan – Genel Müdür",P("gm"),"",""]],"sign");
 }],
 ["s1","1. Amaç, kapsam ve yasal dayanak",function(){
  return '<h3>1.1 Amaç</h3><p>Bu el kitabı; '+P("unvan")+' tarafından monte edilen her elektrikli asansörün, '+P("tipSertNo")+' numaralı AB tip inceleme sertifikasında (Ek IV Bölüm B, Modül B) tanımlanan model asansöre uygun olduğunu, Ek I temel sağlık ve güvenlik gereklerini karşıladığını ve piyasaya arzdan önce eksiksiz son muayene ve deneylerden geçtiğini güvence altına alan kalite sistemini tanımlar.</p>'+
  '<h3>1.2 Modül E\'nin mantığı</h3><p>Modül E tasarımı değil, son muayene ve deneyleri onaylatan bir kalite güvence modülüdür. Onaylanmış kuruluş ('+P("meKurulus")+', kimlik no '+P("meKurulusNo")+') her asansörü tek tek muayene etmez; firmanın muayene-deney sistemini onaylar ve periyodik tetkik ile habersiz şantiye ziyaretleriyle gözetler.</p>'+
  table(["Aşama","Kim yapar","Dayanak"],[["Model asansörün tip incelemesi","Onaylanmış kuruluş ("+P("tipKurulus")+")","Ek IV Bölüm B"],["Kalite sisteminin onayı","Onaylanmış kuruluş","Ek X madde 3"],["Her asansörün son muayene ve deneyleri","Firma (onaylı sistemle)","Ek X 3.2 + Ek V 3(b)"],["CE işareti ve AB Uygunluk Beyanı","Firma","Ek X madde 7, Ek II-B"],["Gözetim tetkiki ve habersiz ziyaret","Onaylanmış kuruluş","Ek X madde 4"]])+
  '<h3>1.3 Kapsam</h3><p><b>Ürün kapsamı (Modül E sertifikasına girecek):</b> tip inceleme sertifikası kapsamındaki elektrikli (halatlı/kayışlı tahrikli) insan ve insan-yük asansörleri. Varyant kapsamı: '+P("modelKapsam")+'.</p>'+
  '<p><b>Hizmet kapsamı (kalite sistemine dahil, sertifikanın parçası değil):</b> revizyon/modernizasyon (Bölüm 13) ve periyodik bakım, arıza ve kurtarma hizmetleri (Bölüm 14).</p>'+
  '<p><b>Hariç tutulanlar:</b> hidrolik asansörler, insan taşımayan yük asansörleri, yürüyen merdiven ve bantlar, platform tipi engelli asansörleri, hızı 0,15 m/s ve altı kaldırma araçları. Güvenlik aksamı imalatı yapılmaz; tüm güvenlik aksamları AB tip inceleme sertifikalı olarak satın alınır.</p>'+
  '<h3>1.4 Yasal dayanak</h3>'+ul(["Asansör Yönetmeliği (2014/33/AB) – RG 29.06.2016, Sayı 29757; Ek X Modül E","Ek X 3.2: kalite hedefleri; organizasyon, yetki ve sorumluluklar; piyasaya arzdan önce muayene ve deneyler (en az Ek V 3(b)); sistemin izlenmesi; kalite kayıtları","Ek X 3.3: tetkik firma tesislerini ve bir montaj şantiyesini kapsar","Ek X 6: dokümanlar, değişiklikler ve onaylanmış kuruluş kararları piyasaya arzdan sonra 10 yıl saklanır"])+
  '<p class="note">Ek ve madde atıfları direktifin konsolide metnine göredir; başvuru öncesi güncel yönetmelik metni ve onaylanmış kuruluş prosedürüyle teyit edilir.</p>';
 }],
 ["s2","2. Mevzuat, standartlar ve tanımlar",function(){
  return '<p>Standartların yürürlükteki sürümleri KYT tarafından Dış Kaynaklı Doküman Listesi\'nde (FR-05.03) yılda en az bir kez güncellenir.</p><h3>2.1 Mevzuat</h3>'+
  table(["Mevzuat","Resmî Gazete","Konu"],[["Asansör Yönetmeliği (2014/33/AB)","29.06.2016 / 29757","Uygunluk değerlendirme, CE, AB Uygunluk Beyanı"],["Asansör İşletme ve Bakım Yönetmeliği","06.04.2019 / 30737","Bakım, garanti, tescil, servis"],["Asansör Periyodik Kontrol Yönetmeliği","04.05.2018 / 30411","A tipi muayene, etiketler"],["Asansör Piyasa Gözetimi ve Denetimi Yönetmeliği","11.03.2022 / 31775","Bakanlık denetimleri"],["Asansörlerin Tasarımına İlişkin Tebliğ (SGM-2017/18)","14.06.2017 / 30096","Tasarım ve proje esasları"],["6331 sayılı İSG Kanunu ve yönetmelikleri","30.06.2012 / 28339","Montaj ve bakım İSG"]])+
  '<h3>2.2 Standartlar</h3>'+table(["Standart","Konu"],[["TS EN 81-20","İnsan ve insan-yük asansörleri – yapım ve montaj"],["TS EN 81-50","Tasarım kuralları, hesaplar, muayene ve deneyler"],["TS EN 81-21","Mevcut binalarda yeni asansörler"],["TS EN 81-28","Uzaktan alarm"],["TS EN 81-70","Erişilebilirlik"],["TS EN 81-58","Kat kapıları yangın dayanımı"],["TS EN 81-73","Yangında asansör davranışı"],["TS EN 81-77","Depreme maruz asansörler"],["TS EN 81-80","Mevcut asansörlerin güvenliğinin iyileştirilmesi"],["TS EN 13015","Bakım talimatları"],["TS EN 12015 / 12016","EMC"],["TS EN ISO 9001","Kalite yönetim sistemi çerçevesi"]],"codes")+
  '<h3>2.3 Terimler</h3>'+table(["Terim","Tanım"],[["Asansör monte eden","Bu el kitabında "+P("unvan")],["Model asansör","Tip incelemesine tabi tutulan, varyant aralıkları tanımlı temsili asansör"],["Güvenlik aksamı","Yönetmelik Ek III\'te listelenen aksam (kilit, paraşüt, regülatör, tampon, UCMP, yukarı yön aşırı hız koruması vb.)"],["Önemli değişiklik","Yeni uygunluk değerlendirmesi gerektiren hız, yük, tahrik veya güvenlik aksamı değişikliği"],["KYT / DÖF","Kalite Yönetim Temsilcisi / Düzeltici-Önleyici Faaliyet"],["UCMP","Kabinin istem dışı hareketine karşı koruma"]]);
 }],
 ["s3","3. Firma, kalite politikası ve hedefler",function(){
  var per=(T("teknikPersonel")||T("idariPersonel"))?("Teknik: "+P("teknikPersonel","–")+", İdari: "+P("idariPersonel","–")):P("teknikPersonel","Personel sayısı");
  return '<h3>3.1 Firma bilgileri</h3>'+table(["Alan","Bilgi"],[["Ticari unvan",P("unvan")],["Merkez adresi",P("adres")+(T("il")?" / "+esc(T("il")):"")],["İletişim",P("telefon")+" · "+P("eposta")+(T("web")?" · "+esc(T("web")):"")],["Vergi dairesi / no",P("vergiDairesi")+" / "+P("vergiNo")],["MERSİS / sicil no",P("mersis")],["Hizmet Yeterlilik Belgesi",P("hyb")+" (geçerlilik "+P("hybTarih")+")"],["Faaliyet alanı","Elektrikli asansör montajı, revizyonu, bakım-onarım ve kurtarma"],["Çalışan sayısı",per],["Yıllık montaj kapasitesi",P("kapasite")+" adet"],["Bakımı yapılan asansör",P("bakimAdet")+" adet"],["Tip inceleme sertifikası",P("tipSertNo")+" – "+P("tipKurulus")+" ("+P("tipKurulusNo")+"), geçerlilik "+P("tipSertTarih")],["Modül E onay belgesi",P("meBelgeNo","Onay sonrası")+" – "+P("meKurulus")+" ("+P("meKurulusNo")+"), "+P("meBelgeTarih","tarih")]])+
  '<h3>3.2 Kalite politikası</h3><p>'+P("unvan")+' olarak taahhüdümüz:</p>'+ol(S.politika.filter(function(x){return x.trim();}).map(esc))+
  '<p>Politika Genel Müdür tarafından imzalanır, ofis ve depoda asılır, oryantasyonda tüm personele tebliğ edilir ve her Yönetimin Gözden Geçirmesi\'nde uygunluğu değerlendirilir.</p>'+
  '<h3>3.3 Kalite hedefleri</h3><p>Hedefler yıllık belirlenir, 3 ayda bir izlenir (FR-15.04) ve Yönetimin Gözden Geçirmesi\'nde değerlendirilir.</p>'+
  table(["Hedef","Gösterge","Hedef değer","Sıklık","Sorumlu"],S.hedefler.map(function(h){return [esc(h.hedef),esc(h.gosterge),esc(h.deger),esc(h.siklik),esc(h.sorumlu)];}));
 }],
 ["s4","4. Organizasyon, yetki ve yetkinlik",function(){
  return '<p class="key">Son Muayene ve Deney Sorumlusu montaj ekibinden bağımsızdır ve "uygun değil" kararı verdiğinde asansörün hizmete alınmasını durdurma yetkisine sahiptir; bu yetki ticari baskıyla geçersiz kılınamaz.</p>'+
  '<h3>4.1 Organizasyon</h3><p>Genel Müdür\'e bağlı: KYT, Teknik Müdür, İdari ve Mali İşler. Teknik Müdür\'e bağlı: Montaj Şantiye Şefleri (montaj ekipleri), Son Muayene ve Deney Sorumlusu, Bakım ve Revizyon Şefi (bakım teknisyenleri), Satın Alma ve Depo.</p>'+
  '<h3>4.2 Yetki ve sorumluluklar</h3><p>Görevlerde bulunan kişilerin adları Yetki Matrisi\'nde (FR-04.04) ve personel kayıtlarında tutulur; kişi değişikliği el kitabının revizyonunu gerektirmez.</p>'+table(["Görev","Temel sorumluluk","Özel yetki"],[
   ["Genel Müdür","Kalite politikası, kaynak, YGG, AB Uygunluk Beyanı imzası","AB UB imzalama, onaylı tedarikçi listesini onaylama"],
   ["Kalite Yönetim Temsilcisi","Doküman ve kayıt kontrolü, iç tetkik, DÖF, onaylanmış kuruluşla iletişim, kalibrasyon","Uygunsuzluk açma, doküman yayınlama/geri çekme"],
   ["Teknik Müdür","Tip sertifikası uyumu, teknik dosya, montaj planlama, son muayene onayı","Projeyi ve CE etiket basımını onaylama"],
   ["Son Muayene ve Deney Sorumlusu","Bölüm 9 deneylerini yürütmek, Son Muayene ve Deney Formu\'nu doldurmak","Asansörü kabul edilemez ilan etme"],
   ["Montaj Şantiye Şefi","Talimata uygun montaj, ara kontroller, izlenebilirlik","Uygun olmayan malzemeyi kullanmama"],
   ["Bakım ve Revizyon Şefi","Bakım planı, arıza ve kurtarma, revizyon projeleri","Güvensiz asansörü kullanıma kapatma"],
   ["Satın Alma ve Depo","Onaylı tedarikçiden alım, giriş kontrolü, stok","Belgesiz malzemeyi kabul etmeme"]])+
  '<h3>4.3 Yetkinlik şartları</h3>'+table(["Görev","Eğitim","Belge","Deneyim"],[["Teknik Müdür","Makine / Elektrik-Elektronik Mühendisliği","Oda üyeliği","Asansörde ≥ 3 yıl"],["Son Muayene ve Deney Sorumlusu","Mühendis veya tekniker","Test-ölçüm ve EN 81-20/50 eğitimi","≥ 2 yıl"],["Montaj Şantiye Şefi","Meslek lisesi / MYO","MYK Asansör Montajcısı Seviye 4","≥ 3 yıl"],["Montaj Teknisyeni","Meslek lisesi","MYK Asansör Montajcısı Seviye 3/4","–"],["Bakım Teknisyeni","Meslek lisesi","MYK Asansör Bakım ve Onarımcısı Seviye 3/4","≥ 1 yıl"],["Tüm saha personeli","–","İSG, yüksekte çalışma, elektrik güvenliği; sağlık raporu","–"]])+
  '<h3>4.4 Eğitim ve yetkilendirme</h3>'+ol(["Yıllık eğitim ihtiyaç analizi (FR-04.01) Ocak ayında yapılır.","Yıllık Eğitim Planı (FR-04.02) Genel Müdür onayına sunulur.","Yeni personel oryantasyonu en az 1 hafta kıdemli personelle birlikte çalışmayı içerir.","Eğitim etkinliği FR-04.03 ile kaydedilir; son muayene personelinde gözetimli 3 asansör muayenesi ile ölçülür.","Yetki Matrisi (FR-04.04): Teknik Müdür onayı olmadan kimse Son Muayene ve Deney Formu\'nu imzalayamaz.","Personel dosyası (FR-04.05) ayrılıştan sonra 10 yıl saklanır."]);
 }],
 ["s5","5. Doküman ve kayıt kontrolü",function(){
  return '<p class="key">Geçerli olmayan doküman sahada bulunmaz; her kayıt asansör piyasaya arz edildikten sonra en az 10 yıl saklanır.</p>'+
  '<h3>5.1 Doküman hiyerarşisi</h3>'+table(["Seviye","Tür","Kod","Onaylayan"],[["1","Kalite El Kitabı",esc(T("dokKod")||"KEK-01"),"Genel Müdür"],["2","Prosedürler","PR-xx.yy","Genel Müdür"],["3","Talimatlar","TL-xx.yy","Teknik Müdür"],["4","Formlar","FR-xx.yy","KYT"],["–","Dış kaynaklı dokümanlar","DK-xx","KYT kayda alır"]])+
  '<h3>5.2 Doküman kontrolü</h3>'+ol(["Taslak doküman sahibince hazırlanır; KYT kodlama ve şablonu kontrol eder.","İçerik ilgili yöneticice kontrol edilir, 5.1\'deki yetkilice onaylanır.","Doküman Ana Listesi (FR-05.02, Ek-2) güncellenir: kod, ad, revizyon, yayın tarihi, durum.","Kontrollü kopyalar dağıtılır; sahada yalnızca yürürlükteki sürüm salt okunur erişimle kullanılır.","Geçersiz dokümanlar toplanır, arşiv kopyası \"GEÇERSİZ\" işaretiyle saklanır.","Kalite sistemini etkileyen önemli değişiklikler uygulanmadan önce "+P("meKurulus")+"\'na yazılı bildirilir (Ek X 3.5)."])+
  '<h3>5.3 Kayıtlar</h3>'+table(["Kayıt","Saklama süresi","Sorumlu"],[["Asansör teknik dosyası","Piyasaya arzdan itibaren 10 yıl","Teknik Müdür"],["Son Muayene ve Deney Formu ve ölçüm çıktıları","10 yıl","Son Muayene Sorumlusu"],["AB Uygunluk Beyanı kopyası","10 yıl","Teknik Müdür"],["Güvenlik aksamı sertifikaları ve seri no listesi","10 yıl","Satın Alma"],["Kalibrasyon sertifikaları","Cihaz kullanımdan kalktıktan sonra 10 yıl","KYT"],["Personel ve eğitim kayıtları","Ayrılıştan sonra 10 yıl","İdari İşler"],["İç tetkik, YGG, DÖF","10 yıl","KYT"],["Onaylanmış kuruluş kararları ve raporları","10 yıl","KYT"],["Bakım ve arıza kayıtları","Sözleşme bitiminden sonra en az 10 yıl","Bakım Şefi"]])+
  '<h3>5.4 Proje numarası ve izlenebilirlik</h3><p>Her asansöre sözleşmede benzersiz numara verilir: <b>'+projeKodu()+'</b>. Bu numara teknik dosyada, sevk irsaliyelerinde, Son Muayene ve Deney Formu\'nda, CE etiketinde, AB Uygunluk Beyanı\'nda ve bakım kayıtlarında kullanılır. Güvenlik aksamı seri numaraları FR-07.05\'e proje numarasıyla işlenir.</p>';
 }],
 ["s6","6. Tip incelemesi bağlantısı ve teknik dosya",function(){
  return '<p class="key">Her proje, montaj başlamadan önce '+P("tipSertNo")+' numaralı tip inceleme sertifikasının varyant aralıklarına karşı kontrol edilir; aralık dışındaki proje Modül E ile piyasaya arz edilemez.</p>'+
  '<h3>6.1 Varyant kontrolü (FR-06.01)</h3><p>Sertifikadaki kapsam: '+P("modelKapsam")+'.</p>'+table(["Parametre","Sertifikadaki aralık","Proje değeri","Uygun mu?"],[["Beyan yükü / kişi sayısı","","",""],["Beyan hızı (m/s)","","",""],["Hareket mesafesi / durak sayısı","","",""],["Askı oranı, halat/kayış tipi","","",""],["Tahrik makinesi tipi ve yeri (MR/MRL)","","",""],["Kabin ölçüsü / ağırlığı","","",""],["Kapı tipi","","",""],["Kuyu dibi ve kuyu üstü","","",""],["Güvenlik aksamları (marka/tip)","","",""],["Kumanda kartı / PESSRAL","","",""]])+
  '<p>Tek parametre aralık dışındaysa: proje aralığa çekilir, tip sertifikası revizyonu için başvurulur veya asansör Modül G ile değerlendirilir.</p>'+
  '<h3>6.2 Proje ve hesaplar</h3>'+ul(["Kuyu, makine yeri, kabin ve kapı yerleşim çizimleri","Halat/kayış güvenlik faktörü ve traksiyon hesabı (EN 81-50)","Ray hesabı (EN 81-50)","Tampon, makine gücü ve fren hesapları","Kuyu dibi ve kuyu üstü sığınma alanları (EN 81-20)","Bina yüklerinin bildirimi","Elektrik tek hat, kumanda ve güvenlik devresi şemaları","Deprem bölgesinde EN 81-77 kategorisi"])+
  '<h3>6.3 Teknik dosya içeriği</h3>'+ol(["Sözleşme, bina ve ruhsat bilgileri","FR-06.01 Varyant Uygunluk Kontrol Listesi","Tip inceleme sertifikası kopyası","Proje çizimleri, hesaplar, şemalar","Güvenlik aksamı sertifikaları, beyanları ve seri numaraları","Giriş kontrol kayıtları","Montaj ara kontrol formları","Son Muayene ve Deney Formu, ölçüm çıktıları, fotoğraflar","Uygunsuzluk kayıtları","AB Uygunluk Beyanı ve CE etiketi fotoğrafı","Kılavuz teslim tutanağı","Tescil ve ilk periyodik kontrol raporu"])+
  '<h3>6.4 Değişiklik kontrolü</h3><p>Montajda projeden sapma gerektiğinde Proje Değişiklik Formu (FR-06.03) açılır; Teknik Müdür sertifika kapsamını değerlendirir. Onaysız değişiklik montaja yansıtılamaz.</p>';
 }],
 ["s7","7. Satın alma ve güvenlik aksamı kontrolü",function(){
  return '<p class="key">Güvenlik aksamları yalnızca onaylı tedarikçiden, geçerli AB tip inceleme sertifikası ve AB uygunluk beyanıyla alınır ve tip sertifikasındaki marka/tiple birebir aynı olmalıdır.</p>'+
  '<h3>7.1 Tedarikçi değerlendirme</h3>'+table(["Kriter","Güvenlik aksamı","Diğer kritik","Genel"],[["AB tip inceleme sertifikası + Modül E/H/C2","Zorunlu","–","–"],["CE / uygunluk beyanı","Zorunlu","Zorunlu","–"],["ISO 9001","Tercih","Tercih","–"],["Teslim, fiyat, destek","Puanlanır","Puanlanır","Puanlanır"],["Yeniden değerlendirme","Yılda 1","Yılda 1","2 yılda 1"]])+
  '<p>100 üzerinden ≥ 70 onaylı, 50–69 şartlı onaylı, &lt; 50 onaysız. Onaylı Tedarikçi Listesi (FR-07.02) Genel Müdür onayıyla yayınlanır.</p>'+
  '<h3>7.2 Ek III güvenlik aksamları</h3>'+table(["Aksam","Giriş kontrolü"],[["Kat kapısı kilidi","Sertifika no, CE + kuruluş no, model uyumu"],["Paraşüt (ani / kademeli)","Kütle ve hız aralığı, ray kalınlığı, mühür"],["Aşırı hız regülatörü","Atma hızı etiketi, mühür, halat çapı"],["Tamponlar","Kütle ve çarpma hızı aralığı, yağ seviyesi"],["UCMP aksamı","Sertifikadaki kombinasyon ve koşullar"],["Yukarı yön aşırı hız koruması","Kütle/hız aralığı, çalışma yönü"],["Güvenlik devresi elektronik elemanları","SIL seviyesi, yazılım sürümü"]])+
  '<h3>7.3 Satın alma ve giriş kontrolü</h3>'+ol(["Proje malzeme listesi (FR-07.03) Teknik Müdür onayıyla satın almaya iletilir.","Sipariş yalnızca onaylı tedarikçiye verilir; belge teslimi sipariş şartıdır.","Giriş Kontrol Formu (FR-07.04) doldurulur; güvenlik aksamında Teknik Müdür imzası aranır.","Uygun olmayan malzeme karantinaya alınır, uygunsuzluk açılır.","Seri numaraları FR-07.05\'e işlenir.","Raylar düz ve kuru, halatlar makarada, kartlar antistatik ambalajda depolanır."])+
  '<h3>7.4 Dış kaynaklı hizmetler</h3><p>Taşeron montaj, iskele, vinç ve kalibrasyon yazılı sözleşmeyle alınır. <b>Son muayene ve deney hiçbir koşulda taşerona devredilmez.</b></p>';
 }],
 ["s8","8. Montaj süreci ve ara kontroller",function(){
  return '<p class="key">Montaj, yazılı talimatlara göre ve her aşama sonunda imzalı ara kontrolle ilerler; bekleme noktası kapanmadan sonraki aşamaya geçilmez.</p>'+
  table(["No","Aşama","Kontrol","Form","Onay"],[["1","Sözleşme ve varyant kontrolü","Tip sertifikası aralığı","FR-06.01","Teknik Müdür"],["2","Kuyu ön kontrolü","Ölçüler, şakul, kuyu dibi/üstü, elektrik altyapısı","FR-08.01","Şantiye Şefi (bekleme)"],["3","Sevkiyat","Liste ve seri no eşleşmesi","FR-08.02","Şantiye Şefi"],["4","İskele ve İSG önlemleri","Kapı boşluğu korumaları","İSG listesi","İSG / Şef"],["5","Ray montajı","Ray mesafesi, şakul sapması, ek yerleri","FR-08.03","Şantiye Şefi (bekleme)"],["6","Makine ve regülatör","Terazi, şase, regülatör konumu","FR-08.04","Şantiye Şefi"],["7","Kabin, paraşüt, karşı ağırlık","Gönye, paraşüt-ray boşluğu, dolgu","FR-08.05","Şantiye Şefi"],["8","Halat / kayış","Bağlantılar, pimler, gerginlik eşitliği","FR-08.06","Şantiye Şefi"],["9","Kapılar","Aralıklar, kilit kavrama, eşik seviyesi","FR-08.07","Şantiye Şefi (bekleme)"],["10","Tampon, kuyu dibi","Tampon ekseni, stop, merdiven","FR-08.08","Şantiye Şefi"],["11","Elektrik tesisatı","Topraklama, güvenlik devresi","FR-08.09","Elektrik sorumlusu"],["12","İlk çalıştırma","Revizyon hızı, kat seviyeleri, kapı ayarı","FR-08.10","Şantiye Şefi"],["13","Montaj bitiş","Ekibin kontrol listesi","FR-08.11","Şantiye Şefi"],["14","Son muayene ve deneyler","Bölüm 9","FR-09.01","Son Muayene ve Deney Sorumlusu + Teknik Müdür"],["15","CE, AB UB, teslim","Bölüm 12","FR-12.xx","Genel Müdür"]])+
  '<p class="note">Bağlayıcı değerler tip sertifikası, üretici montaj talimatları ve EN 81-20\'dir; firma iç kriteri ile çelişirse daha sıkı olan uygulanır.</p>'+
  '<h3>Şantiye dosyası ve ürünün korunması</h3><p>Şantiyede güncel proje, malzeme listesi, talimatlar, ara kontrol formları, İSG risk değerlendirmesi ve günlük montaj defteri bulunur. Teslim edilmemiş asansörde ana şalter kilitlenir ve kat kapılarına "KULLANIM DIŞI – MONTAJ DEVAM EDİYOR" levhası asılır.</p>';
 }],
 ["s9","9. Son muayene ve deneyler",function(){
  var R=function(a){return a;};
  return '<p class="key">Her asansör piyasaya arzdan önce aşağıdaki muayene ve deneylerin tamamından geçer; tek kalem "uygun değil" ise CE etiketi basılmaz, AB Uygunluk Beyanı düzenlenmez ve asansör hizmete alınmaz.</p>'+
  '<h3>9.1 Asgari yasal şart (Ek V 3(b))</h3>'+ol(["Boş ve beyan yükü ile çalıştırarak montajın ve güvenlik tertibatlarının (son durak şalterleri, kilitler vb.) doğru çalıştığının doğrulanması.","Boş ve beyan yükü ile çalıştırarak enerji kesilmesinde güvenlik tertibatlarının doğru çalıştığının doğrulanması.","Beyan yükünün 1,25 katı ile statik deney."])+
  '<h3>9.2 Ön koşullar</h3>'+ul(["FR-08.11 ve tüm ara kontroller kapalı","Kalibrasyonu geçerli ekipman (Bölüm 10)","Beyan yükünün en az %125\'i kadar tartılmış deney ağırlığı","Kalıcı bina elektriği bağlı","Deneyi yapan Son Muayene ve Deney Sorumlusu montaj ekibinden bağımsız ve yetkili"])+
  '<h3>9.3 Muayene ve deney planı</h3>'+table(["No","Kontrol / deney","Yöntem","Kabul kriteri"],[
   {grp:"A · Doküman ve projeye uygunluk"},["A1","Teknik dosya ile asansör","Gözle, ölçüm","Proje ve tip sertifikasıyla aynı"],["A2","Güvenlik aksamı tip/seri no","Etiket","FR-07.05 ile birebir"],["A3","Etiket ve levhalar","Gözle","EN 81-20"],
   {grp:"B · Kuyu ve makine yeri"},["B1","Sığınma alanları ve serbest mesafeler","Ölçüm","EN 81-20 5.2.5"],["B2","Kuyu aydınlatması","Lüksmetre","Kabin üstü ve kuyu dibinde ≥ 50 lx"],["B3","Kuyu dibi stop, priz, merdiven","Fonksiyon","EN 81-20 5.2.1"],["B4","Makine yeri erişimi ve alanları","Ölçüm","EN 81-20 5.2.6"],
   {grp:"C · Kapılar ve kilitler"},["C1","Kapı aralıkları","Ölçüm","≤ 6 mm"],["C2","Kilit kavraması","Her kat","≥ 7 mm kavramadan hareket yok"],["C3","Kapanma kuvveti","Kuvvet ölçer","≤ 150 N"],["C4","Kapı koruyucu","Fonksiyon","Engelde yeniden açılma"],["C5","Acil kilit açma ve kendiliğinden kapanma","Her kat","Çalışır, kapanır, kilitlenir"],
   {grp:"D · Elektrik"},["D1","Yalıtım direnci","Megger","EN 81-20 tablo değerleri"],["D2","Koruma iletkeni sürekliliği","Ölçüm","Tüm metal aksam bağlı"],["D3","Güvenlik devresi kontakları","Tek tek açtırma","Hareket durur"],["D4","Faz koruması, kontaktör izleme","Fonksiyon","Hatada kalkış yok"],
   {grp:"E · Tahrik, fren, traksiyon"},["E1","Fren deneyi","%125 yük, beyan hızı, aşağı","Kabin durur; her fren kolu tek başına yavaşlatır"],["E2","Traksiyon deneyleri","EN 81-50 / 81-20","Kayma koşulları sağlanır"],["E3","Dengeleme","Akım ölçümü","Proje oranı"],
   {grp:"F · Güvenlik aksamları"},["F1","Regülatör atma hızı","Takometre","≥ %115 beyan hızı, sertifika sınırı içinde"],["F2","Kabin paraşüt deneyi","Yükle","Kabin durur, taban eğimi ≤ %5"],["F3","Karşı ağırlık paraşütü","Boş kabin","Durur"],["F4","Tampon deneyi","Oturtma","Kalıcı deformasyon yok"],["F5","UCMP","Simülasyon","EN 81-20 5.6.7 sınırları"],["F6","Yukarı yön aşırı hız","Boş kabin yukarı","Devreye girer"],
   {grp:"G · Fonksiyon"},["G1","Tüm katlara çağrı","Boş ve dolu","Tüm çağrılar karşılanır"],["G2","Durma ve seviyeleme","Ölçüm","Durma ±10 mm, seviyeleme ±20 mm"],["G3","Son durak şalterleri","Fonksiyon","Tampondan önce durdurma"],["G4","Revizyon kumandası","Fonksiyon","EN 81-20"],["G5","Acil kurtarma","Enerji kesik","Kabin en yakın kata alınır"],["G6","Enerji kesintisinde güvenlik","Ek V 3(b)(ii)","Fren tutar"],["G7","Acil aydınlatma","Lüksmetre","≥ 5 lx, 1 saat"],["G8","Uzaktan alarm","Fiili arama","EN 81-28; "+P("kurtarma")+" hattına bağlı"],["G9","Aşırı yük","Yükleme","%110\'u aşmadan hareket engellenir"],
   {grp:"H · Statik deney"},["H1","1,25 × beyan yükü","Kabin en alt katta","Kayma, hasar, kalıcı deformasyon yok"]],"codes")+
  '<p class="note">Kabul kriterleri EN 81-20/50 özetidir; Son Muayene ve Deney Formu hazırlanırken yürürlükteki sürümden madde ve değer teyidi yapılır.</p>'+
  '<h3>9.4 Karar</h3>'+ol(["Her kalem Uygun / Uygun değil / Uygulanamaz olarak işaretlenir; ölçümler sayıyla yazılır.","Uygun olmayan kalemler uygunsuzlukla montaj ekibine iletilir, düzeltme sonrası deney tekrarlanır.","Tüm kalemler uygunsa Teknik Müdür \"Piyasaya Arza Uygundur\" onayı verir.","Onaydan önce asansör kullanım amaçlı teslim edilmez."])+
  '<h3>9.5 Habersiz ziyaretler</h3><p>'+P("meKurulus")+' Ek X 4.4 uyarınca şantiyelere habersiz gelebilir ve deney yapabilir. KYT her yıl Devam Eden Montajlar Listesi\'ni (FR-09.03) kuruluşla paylaşır.</p>';
 }],
 ["s10","10. Ölçme ve test ekipmanları",function(){
  return '<p class="key">Son muayenede kullanılan her cihaz akredite (TS EN ISO/IEC 17025) laboratuvarda kalibre edilmiş ve süresi geçerli olmalıdır.</p>'+
  table(["Ekipman","Deney","Kalibrasyon","Periyot"],[["Yalıtım direnci ölçer","D1","Akredite","1 yıl"],["Süreklilik ölçer, multimetre, pens ampermetre","D2, E3","Akredite","1 yıl"],["Takometre / regülatör test cihazı","F1","Akredite","1 yıl"],["Kapı kuvvet ölçer","C3","Akredite","1 yıl"],["Lüksmetre","B2, G7","Akredite","1 yıl"],["Metre, lazer metre, kumpas, sentil","A1, B1, C1, G2","Kalibrasyon veya iç doğrulama","1 yıl"],["Lazer şakul, su terazisi","Ray montajı","İç doğrulama","6 ay"],["Deney ağırlıkları","E1, E2, F2, H1","Tartım ve etiket","3 yıl"]])+
  ul(["Her cihazda ekipman no ve kalibrasyon etiketi bulunur.","Süresi geçen cihaz kırmızı etiketle kullanımdan çekilir.","Sapma sınırı aşıldıysa o cihazla yapılan ölçümler geriye dönük değerlendirilir, gerekirse deney tekrarlanır.","Son Muayene ve Deney Formu\'na kullanılan cihazın ekipman numarası yazılır."]);
 }],
 ["s11","11. Uygunsuzluk, DÖF ve şikayetler",function(){
  return '<p class="key">Uygunsuzluk tek formla (FR-11.01) kaydedilir, sınıflandırılır ve kök nedeni bulunmadan kapatılmaz.</p>'+
  table(["Sınıf","Tanım","Müdahale"],[["Kritik","Can güvenliğini doğrudan etkiler (köprülenmiş kilit, çalışmayan paraşüt, sertifikasız aksam)","Asansör derhal kapatılır, 24 saat içinde DÖF"],["Majör","Yönetmelik/standart şartından sapma","Piyasaya arz durdurulur; DÖF zorunlu"],["Minör","Kayıt eksikliği, görsel kusur","Düzeltme; tekrarlıysa DÖF"]])+
  '<h3>Uygunsuz ürün</h3>'+ul(["Malzeme: karantina, iade veya hurda (Teknik Müdür kararı).","Montaj: yeniden işleme ve ilgili kontrolün tekrarı.","Piyasadaki asansör: güvenli hale getirme, aynı aksam/lotu kullanan asansörlerin izlenebilirlik listesinden bulunup kontrolü; ciddi riskte Bakanlık ve onaylanmış kuruluşa bildirim.","Uygunsuzlukla piyasaya arz için özel izin uygulaması yoktur."])+
  '<h3>DÖF süreci</h3>'+ol(["Kayıt","Anında düzeltme","Kök neden analizi (5 Neden / balık kılçığı)","Faaliyet planı: sorumlu, termin","KYT en geç 3 ay sonra etkinliği doğrular","Kapanış; tekrar ederse YGG gündemi","Benzer projelerde önleyici değerlendirme"])+
  '<h3>Şikayetler ve kazalar</h3><p>Şikayetler FR-11.03\'e işlenir; güvenlik şikayetinde aynı gün teknisyen gönderilir, 3 iş günü içinde ilk yanıt, 15 iş günü içinde sonuç bildirilir. Yaralanmalı kaza veya ciddi olayda asansör kapatılır, olay yeri korunur, mevzuattaki bildirimler yapılır ve DÖF açılır.</p><h3>Müşteri memnuniyeti</h3><p>Montaj müşterilerine teslimden sonra 1 ay içinde FR-11.04, bakım ve modernizasyon müşterilerine FR-11.05 Müşteri Memnuniyet Anketi uygulanır. 3 ve altı puanlar şikayet olarak işlenir; yıllık ortalama puanlar kalite hedefiyle karşılaştırılıp Yönetimin Gözden Geçirmesi\'nde değerlendirilir.</p>';
 }],
 ["s12","12. CE işareti, AB Uygunluk Beyanı ve teslim",function(){
  return '<p class="key">CE işareti ve '+P("meKurulusNo","kuruluş no")+' kimlik numarası, yalnızca Teknik Müdür\'ün Son Muayene ve Deney Formu onayından sonra her asansörün kabinine görünür, okunaklı ve silinmez şekilde iliştirilir.</p>'+
  '<h3>12.1 Kabin etiketi</h3>'+table(["Etiket alanı","İçerik"],[["İşaret","CE "+P("meKurulusNo","kuruluş no")],["Asansör monte eden",P("unvan")],["Adres",P("adres")],["Seri / proje no",projeKodu()],["Montaj yılı","YYYY"],["Beyan yükü / kişi","… kg / … kişi"]])+
  '<h3>12.2 AB Uygunluk Beyanı (FR-12.02)</h3>'+ol(["Asansör monte edenin adı ve adresi: "+P("unvan")+", "+P("adres"),"Asansörün tanımı, seri no ve kurulduğu adres","Montaj yılı","İlgili hükümler (2014/33/AB; varsa 2014/30/AB)","Beyanın tek sorumlusunun monte eden olduğu ifadesi","Tip inceleme: "+P("tipKurulus")+" ("+P("tipKurulusNo")+"), sertifika "+P("tipSertNo"),"Modül E: "+P("meKurulus")+" ("+P("meKurulusNo")+"), onay belgesi "+P("meBelgeNo","onay belgesi no"),"Uyumlaştırılmış standartlar (EN 81-20, EN 81-50 vb.)","İmzalayan: Genel Müdür; ad soyad, imza, yer ve tarih"])+
  '<h3>12.3 Kullanım kılavuzu</h3><p>Türkçe olarak teslim edilir: kullanım talimatları, acil kurtarma talimatı, EN 13015\'e göre bakım talimatları, periyodik kontrol yükümlülükleri, servis ve 7/24 kurtarma iletişimi ('+P("kurtarma")+').</p>'+
  '<h3>12.4 Teslim</h3>'+ol(["Teslim Tutanağı (FR-12.03): asansör, anahtarlar, kurtarma aparatları, kılavuzlar, AB UB, en az 3 yıl garanti belgesi.","Bina sorumlusuna kullanım ve acil durum bilgilendirmesi.","İlgili idareye tescil belgelerinin hazırlanması.","A tipi muayene kuruluşu ilk kontrolüne hazırlık.","Onaylanmış kuruluşa piyasaya arz listesinin (FR-12.04) bildirimi."]);
 }],
 ["s13","13. Revizyon (modernizasyon)",function(){
  return '<p class="key">Her revizyonda ilk karar, değişikliğin önemli değişiklik olup olmadığıdır: önemliyse asansör yeni asansör gibi değerlendirilir, değilse EN 81-80 risk yaklaşımıyla yürütülür.</p>'+
  table(["Tür","Örnek","Yol"],[["Önemli değişiklik","Hız/yük değişimi, tahrik tipinin değişmesi, durak eklenmesi","Tip sertifikası kapsamındaysa Bölüm 9 + yeni CE; değilse Modül G"],["Güvenlik iyileştirme","Kabin kapısı, kilit değişimi, UCMP, regülatör/paraşüt yenileme","EN 81-80 risk değerlendirmesi + ilgili deneyler"],["Eşdeğer parça","Aynı tip motor, operatör, kart","Bakım kaydı + fonksiyon deneyi"]])+
  ol(["Mevcut durum tespiti (FR-13.02)","EN 81-80 öncelik sınıflarına göre risk değerlendirmesi","Yazılı teklif; müşterinin kapsam dışı bıraktığı kritik riskler tutanakla kayda geçer","Etkilenen hesapların yenilenmesi","Bölüm 7 şartlarıyla satın alma","Bölüm 8 talimatlarıyla uygulama","Muayene ve deney","Belgelendirme: yeni CE/AB UB veya Revizyon Teslim Raporu (FR-13.03)","Gerekirse yeniden periyodik kontrol"])+
  '<p>Karar Teknik Müdür tarafından FR-13.01 ile verilir; tereddütte onaylanmış kuruluş ve Bakanlık görüşü alınır.</p>';
 }],
 ["s14","14. Bakım ve servis",function(){
  return '<p class="key">Bakım, Asansör İşletme ve Bakım Yönetmeliği ile EN 13015\'e göre hazırlanmış talimatlarla en az ayda bir yapılır; 7/24 kurtarma hizmeti ('+P("kurtarma")+') kesintisiz sağlanır.</p>'+
  table(["Periyot","Kapsam","Form"],[["Aylık","Kapılar ve kilitler, fotosel, kat seviyeleri, fren, alarm, acil aydınlatma, güvenlik devresi","FR-14.01"],["3 aylık","Halat/kayış, makaralar, kılavuz pabuçları, ray yağlama, pano","FR-14.01"],["6 aylık","Regülatör ve paraşüt fonksiyonu, tampon, son durak, UCMP","FR-14.01"],["Yıllık","Yalıtım ölçümü, fren balataları, halat gerginliği, periyodik kontrol öncesi tam kontrol","FR-14.01"]])+
  '<h3>Arıza ve kurtarma</h3>'+ol(["İhbar FR-14.02\'e saat ve dakikasıyla işlenir.","Mahsur kalmada öncelik 1; hedef ilk müdahale ≤ 60 dk.","Kurtarma asansöre özel talimatla en az iki kişiyle yapılır.","Güvenlik devresi test edilerek hizmete alınır.","30 gün içinde tekrarlayan arıza DÖF\'e bağlanır."])+
  '<p>Periyodik kontrolden önce yıllık bakım tamamlanır, kontrolde teknisyen hazır bulunur; bulgular Bölüm 11\'e işlenir. Güvenlik aksamı yedek parçası yalnızca orijinal veya aynı tip sertifikalı olur ve seri numarası kayda geçer. Sorumlu: Bakım ve Revizyon Şefi.</p>';
 }],
 ["s15","15. İç tetkik, YGG ve onaylanmış kuruluş gözetimi",function(){
  return '<p class="key">Sistemin etkinliği yılda en az bir tam iç tetkik, en az bir Yönetimin Gözden Geçirmesi ve aylık gösterge takibiyle izlenir.</p>'+
  '<h3>15.1 İç tetkik</h3>'+ul(["Yıllık plan (FR-15.01) Ocak\'ta yayınlanır; tüm bölümler ve en az 1 aktif şantiye tetkik edilir.","Tetkikçiler tetkik ettikleri işten bağımsızdır.","Tetkikler İç Tetkik Soru Listesi (FR-15.05) ile yapılır.","Şantiye tetkikinde habersiz ziyaret simüle edilir ve rastgele bir deney tanıklıkla tekrarlanır.","Bu yıl içerisinde piyasaya arz edilmiş 1 asansörün teknik dosyası ve Son Muayene ve Deney Formu incelenir."])+
  '<h3>15.2 Yönetimin Gözden Geçirmesi</h3><p>Yılda en az bir kez, gözetim tetkikinden önce yapılır. Girdiler: hedef gerçekleşmeleri, tetkik ve ziyaret bulguları, periyodik kontrol etiket dağılımı, son muayene ve deney istatistikleri, şikayetler, DÖF, tedarikçi, kalibrasyon, eğitim, mevzuat değişiklikleri. Tutanak FR-15.03.</p>'+
  '<h3>15.3 Onaylanmış kuruluş ('+P("meKurulus")+')</h3>'+table(["Faaliyet","Dayanak","Firmanın yükümlülüğü"],[["Başvuru","Ek X 3.1","Başvuru dosyası ve başka kuruluşa başvurulmadığı beyanı"],["Değerlendirme","Ek X 3.3","Ofis ve şantiye ziyaretine hazırlık"],["Değişiklik bildirimi","Ek X 3.5","Öngörülen değişiklikleri önceden bildirmek"],["Periyodik tetkik","Ek X 4.3","Erişim ve kayıtları sunmak"],["Habersiz ziyaret","Ek X 4.4","Güncel şantiye listesi, deney imkânı"],["Saklama","Ek X 6","Kararlar ve raporlar 10 yıl"]]);
 }],
 ["s16","16. İSG ve çevre",function(){
  return '<p class="key">Güvensiz koşulda hiçbir montaj, deney veya bakım yapılmaz; her saha çalışanı işi durdurma yetkisine sahiptir.</p>'+
  ul(["Montaj, revizyon ve bakım için ayrı risk değerlendirmesi; şantiyeye özel ek riskler işlenir; risk değerlendirmesi ve İSG eğitimleri hizmet alınan OSGB ile yürütülür.","Kuyu ve kabin üstünde tam vücut kemeri ve ankraj; açık kapı boşluklarında bariyer.","Elektrik işlerinde kilitle-etiketle uygulaması.","Statik, paraşüt ve tampon deneylerinde kuyu ve kabinde kimse bulunmaz.","Kurtarma en az 2 kişiyle yapılır.","KKD zimmetle verilir; sağlık ve yüksekte çalışma uygunluğu kayıtlıdır.","Sökülen aksam türlerine göre ayrılır; yağ ve aküler lisanslı firmalara verilir."]);
 }],
 ["ek","Ekler",function(){
  var groups={PR:"Prosedürler",TL:"Talimatlar",FR:"Formlar"},rows=[];
  ["PR","TL","FR"].forEach(function(p){var list=S.dokumanlar.filter(function(d){return (d.kod||"").indexOf(p)===0;});if(!list.length)return;rows.push({grp:groups[p]+" ("+list.length+")"});list.forEach(function(d){rows.push([esc(d.kod),esc(d.ad),esc(d.bolum),esc(d.rev),esc(fmtD(d.tarih))||'<span class="ph">[tarih]</span>',esc(d.durum)]);});});
  var other=S.dokumanlar.filter(function(d){var k=d.kod||"";return k.indexOf("PR")!==0&&k.indexOf("TL")!==0&&k.indexOf("FR")!==0;});
  if(other.length){rows.push({grp:"Diğer ("+other.length+")"});other.forEach(function(d){rows.push([esc(d.kod),esc(d.ad),esc(d.bolum),esc(d.rev),esc(fmtD(d.tarih))||'<span class="ph">[tarih]</span>',esc(d.durum)]);});}
  return '<h3>EK-1 Doküman Ana Listesi (FR-05.02)</h3>'+table(["Kod","Doküman adı","Bölüm","Rev.","Yayın tarihi","Durum"],rows,"codes")+
  '<h3>EK-2 Ek X – El kitabı çapraz referansı</h3>'+table(["Ek X şartı","Konu","Bölüm"],[["2","Onaylı sistemi işletme, gözetim","1, 15"],["3.1","Başvuru dosyası","15.3, EK-3"],["3.2(a)","Kalite hedefleri","3"],["3.2(b)","Organizasyon ve yetki","4"],["3.2(c)","Muayene ve deneyler","8, 9, 10"],["3.2(d)","Sistemin izlenmesi","11, 15"],["3.2(e)","Kalite kayıtları","5, 9, 10"],["3.5","Değişiklik bildirimi","5.2, 15.3"],["4","Gözetim ve habersiz ziyaret","9.5, 15.3"],["6","10 yıl saklama","5.3"],["7","CE ve AB UB","12"]],"codes")+
  '<h3>EK-3 Başvuru dosyası kontrol listesi</h3>'+ul(["Başvuru formu ve başka kuruluşa başvurulmadığı beyanı","Monte edilecek asansör bilgileri ve yıllık adet ("+P("kapasite")+")","Tip inceleme sertifikası "+P("tipSertNo")+" ve ekleri","Kalite El Kitabı ("+esc(T("dokKod")||"KEK-01")+" Rev. "+esc(T("revNo")||"00")+") ve prosedürler","Son Muayene ve Deney Formu ve deney talimatları","Örnek bir asansörün tam teknik dosyası","Örnek kullanım kılavuzu ve bakım talimatları","Personel listesi, yetki matrisi, MYK belgeleri","Ekipman ve kalibrasyon listesi","Onaylı tedarikçi listesi ve aksam sertifikaları","Tamamlanmış iç tetkik ve YGG kayıtları","Aktif şantiye listesi","Örnek AB Uygunluk Beyanı ve CE etiket taslağı"]);
 }]
];

function docHead(){
  return '<table class="dochead"><tr><td class="firm" rowspan="4">'+firmCellHTML()+'</td><td class="title" rowspan="4">KALİTE EL KİTABI<small>2014/33/AB Ek X · Modül E · Elektrikli asansör montaj, revizyon ve bakım</small></td><td class="k">Doküman no</td><td class="v">'+P("dokKod")+'</td></tr><tr><td class="k">Yayın tarihi</td><td class="v">'+P("ilkYayin")+'</td></tr><tr><td class="k">Rev. no</td><td class="v">'+P("revNo")+'</td></tr><tr><td class="k">Rev. tarihi</td><td class="v">'+P("revTarih")+'</td></tr></table>';
}
function runHead(i,title){return '<div class="runhead"><span>'+esc(T("dokKod")||"KEK-01")+' · Rev. '+esc(T("revNo")||"00")+(T("revTarih")?" · "+esc(fmtD(T("revTarih"))):"")+'</span><span>'+(i===0?"Kapak":esc(title.split(".")[0]==="Ekler"?"Ekler":"Bölüm "+title.split(".")[0]))+'</span></div>';}
function manualHTML(){
  return docHead()+'<h1>Modül E Kalite Güvence Sistemi El Kitabı</h1><p class="lead" style="margin-bottom:8px">'+P("unvan")+' · '+P("il")+'</p>'+
   SECTIONS.map(function(s,i){return '<section id="'+s[0]+'">'+runHead(i,s[1])+'<h2>'+esc(s[1])+'</h2>'+s[2]()+'</section>';}).join("");
}

/* ---------- Şablon içerikleri: Prosedürler ---------- */
var TPL={};
TPL["PR-04.01"]={t:"P",
 amac:"Kalite sistemini etkileyen görevlerde çalışan personelin eğitim, belge ve deneyim şartlarını belirlemek; eğitim ihtiyacını planlamak, eğitimleri gerçekleştirmek, etkinliğini ölçmek ve görev yetkilendirmesini kayıt altına almak.",
 kapsam:"{unvan} bünyesindeki tüm yönetim, montaj, son muayene, bakım, satın alma ve idari personel ile taşeron montaj personelini kapsar.",
 sor:[["Genel Müdür","Yıllık eğitim planını ve bütçesini onaylar."],["Teknik Müdür","Teknik eğitim ihtiyacını belirler, yetki matrisini onaylar, son muayene personelini yetkilendirir."],["Kalite Yönetim Temsilcisi","İhtiyaç analizini koordine eder, kayıtları tutar, etkinliği izler."],["İdari İşler","Personel dosyalarını, sağlık raporlarını ve belge geçerliliklerini takip eder."],["Bölüm yöneticileri","Personelinin eğitime katılımını sağlar, iş başı eğitimini verir."]],
 akis:[
  ["Yetkinlik şartları",["Her görevin eğitim, belge (MYK vb.) ve deneyim şartları Kalite El Kitabı Bölüm 4.3'te tanımlıdır; değişiklik Teknik Müdür önerisi ve Genel Müdür onayıyla yapılır.","İşe alımda adayın belgeleri bu şartlarla karşılaştırılır; eksik belgeyle saha görevi verilmez."]],
  ["Eğitim ihtiyaç analizi",["Her yıl Ocak ayında Eğitim İhtiyaç Analizi (FR-04.01) yapılır.","Girdiler: mevzuat ve standart değişiklikleri, iç ve dış tetkik bulguları, DÖF'ler, yeni ekipman/ürün, belge son geçerlilik tarihleri, personel talepleri.","Belgesi 3 ay içinde sona erecek personel ayrıca listelenir."]],
  ["Planlama ve uygulama",["Yıllık Eğitim Planı (FR-04.02) konu, katılımcı, eğitmen, süre ve planlanan ay bilgileriyle hazırlanır ve Genel Müdür'e onaylatılır.","Zorunlu eğitimler: İSG (tehlike sınıfına göre), yüksekte çalışma, elektrik güvenliği, acil kurtarma, EN 81-20/50 son muayene ve deney, iç tetkikçi.","Yeni personele en az 1 haftalık oryantasyon verilir: kalite politikası, el kitabı, ilgili talimatlar, İSG kuralları, kıdemli personelle birlikte çalışma.","Her eğitim Eğitim Katılım ve Etkinlik Formu (FR-04.03) ile kayıt altına alınır."]],
  ["Etkinlik ölçümü",["Etkinlik eğitimden sonra en geç 3 ay içinde ölçülür: sınav, gözetimli uygulama veya iş sonuçlarının değerlendirilmesi.","Son Muayene ve Deney personeli için etkinlik ölçümü, Teknik Müdür gözetiminde en az 3 asansörün eksiksiz muayenesidir.","Etkin bulunmayan eğitim tekrarlanır veya yöntem değiştirilir."]],
  ["Yetkilendirme",["Yetki Matrisi (FR-04.04) kimin hangi işi yapmaya ve hangi formu imzalamaya yetkili olduğunu gösterir.","Teknik Müdür onayı olmadan hiç kimse Son Muayene ve Deney Formu (FR-09.01) imzalayamaz.","Yetki matrisi her personel değişikliğinde ve yılda en az bir kez gözden geçirilir."]],
  ["Personel dosyası",["Her çalışan için FR-04.05'e göre dosya tutulur: diploma, MYK belgesi, sağlık raporu, eğitim kayıtları, zimmet.","Dosyalar ayrılıştan sonra 10 yıl saklanır."]]],
 kayit:["FR-04.01","FR-04.02","FR-04.03","FR-04.04","FR-04.05"],ilgili:["Kalite El Kitabı Bölüm 4","6331 sayılı İSG Kanunu ve Çalışanların İSG Eğitimleri Yönetmeliği","MYK mesleki yeterlilik mevzuatı"]};

TPL["PR-05.01"]={t:"P",
 amac:"Kalite sistemi dokümanlarının hazırlanması, onaylanması, dağıtılması, değiştirilmesi ve geri çekilmesi ile kalite kayıtlarının tanımlanması, saklanması ve imhasına ilişkin kuralları belirlemek.",
 kapsam:"Kalite El Kitabı, prosedürler, talimatlar, formlar, dış kaynaklı dokümanlar ile Modül E kapsamındaki tüm kalite kayıtlarını kapsar.",
 tanim:[["Kontrollü kopya","Dağıtımı kayıt altında olan ve revizyonlarda güncellenen kopya"],["Dış kaynaklı doküman","Mevzuat, standart, tip inceleme sertifikası, tedarikçi kılavuzu gibi firma dışında hazırlanan doküman"],["Kayıt","Faaliyetin yapıldığını kanıtlayan doldurulmuş form, rapor, ölçüm çıktısı"]],
 sor:[["Genel Müdür","El kitabı ve prosedürleri onaylar."],["Teknik Müdür","Talimatları onaylar, teknik içeriği kontrol eder."],["Kalite Yönetim Temsilcisi","Kodlama, yayın, dağıtım, ana liste ve arşivden sorumludur."],["Doküman sahibi","Taslağı hazırlar, uygulanabilirliğini izler."]],
 akis:[
  ["Kodlama",["El kitabı: KEK-01; prosedür: PR-BB.SS; talimat: TL-BB.SS; form: FR-BB.SS (BB: el kitabı bölüm no, SS: sıra no); dış kaynaklı: DK-SS.","Her dokümanın başlığında firma adı, doküman adı, kod, yayın tarihi, revizyon no ve revizyon tarihi bulunur."]],
  ["Hazırlama ve onay",["Taslak doküman sahibi tarafından standart şablonla hazırlanır.","KYT kodlama ve şablon uyumunu, ilgili yönetici teknik içeriği kontrol eder.","Onay yetkisi: Kalite El Kitabı ve PR – Genel Müdür; TL – Teknik Müdür; FR – KYT."]],
  ["Yayın ve dağıtım",["Onaylanan doküman Doküman Ana Listesi'ne (FR-05.02) kod, ad, revizyon, yayın tarihi ve durum bilgileriyle işlenir.","Elektronik ortamda yalnızca \"Yürürlükte\" klasörü kullanılır; saha cihazlarında salt okunur erişim verilir.","Basılı kontrollü kopyalar imza karşılığı dağıtılır."]],
  ["Değişiklik",["Değişiklik talebi doküman sahibine iletilir; değişen kısım revizyon açıklamasında belirtilir.","Revizyon no bir artırılır, revizyon tarihi güncellenir.","Kalite sistemini, model kapsamını, organizasyonu veya deney yöntemini etkileyen değişiklikler uygulanmadan önce onaylanmış kuruluşa yazılı bildirilir (Ek X 3.5)."]],
  ["Geçersiz dokümanlar",["Eski revizyonlar dağıtım noktalarından toplanır.","Arşiv kopyası \"GEÇERSİZ\" işaretiyle saklanır; diğerleri imha edilir."]],
  ["Dış kaynaklı dokümanlar",["Dış Kaynaklı Doküman Listesi (FR-05.03) yılda en az bir kez ve AB Resmî Gazetesi'nde yeni atıf yayımlandığında güncellenir.","Standart sürüm değişikliğinde etkilenen talimat ve formlar gözden geçirilir."]],
  ["Kayıtların kontrolü",["Kayıtlar okunaklı, tarihli, imzalı ve proje/seri numarası ile tanımlı olur.","Düzeltme eski değer okunur kalacak şekilde üzeri çizilip paraflanarak yapılır; silici kullanılmaz.","Elektronik kayıtlar haftalık yedeklenir; bir yedek farklı fiziksel konumda tutulur.","Modül E kayıtları asansör piyasaya arz edildikten sonra en az 10 yıl saklanır; süresi dolan kayıtlar KYT onayıyla imha edilir."]]],
 kayit:["FR-05.02","FR-05.03"],ilgili:["Kalite El Kitabı Bölüm 5","2014/33/AB Ek X madde 3.5 ve 6"]};

TPL["PR-06.01"]={t:"P",
 amac:"Her asansör projesinin {tipSertNo} numaralı AB tip inceleme sertifikasında tanımlı model asansörün varyant aralıkları içinde kaldığını doğrulamak; proje, hesap ve teknik dosyayı oluşturmak ve montaj sırasındaki proje değişikliklerini kontrol etmek.",
 kapsam:"Modül E kapsamında monte edilecek tüm elektrikli asansörlerin sözleşme, proje ve montaj aşamalarını kapsar.",
 sor:[["Teknik Müdür","Varyant kontrolünü yapar, projeyi ve hesapları onaylar, değişiklik kararlarını verir."],["Proje / çizim personeli","Çizim ve hesapları hazırlar."],["Montaj Şantiye Şefi","Sahadaki sapmaları Proje Değişiklik Formu ile bildirir."],["Kalite Yönetim Temsilcisi","Teknik dosyanın eksiksizliğini kontrol eder."]],
 akis:[
  ["Sözleşme öncesi gözden geçirme",["Müşteri talebi (yük, hız, durak, kuyu ölçüleri, kapı tipi, makine dairesi durumu) yazılı alınır.","Teknik Müdür Varyant Uygunluk Kontrol Listesi'ni (FR-06.01) doldurur.","Tüm parametreler sertifika aralığındaysa sözleşme imzalanır ve proje numarası ({kisaKod}-YYYY-NNN) verilir."]],
  ["Aralık dışı durum",["Proje sertifika aralığına çekilir; ya da","Onaylanmış kuruluşa tip sertifikası revizyonu için başvurulur; ya da","Asansör Modül G (birim doğrulama) ile değerlendirilir. Karar ve gerekçe FR-06.01'e yazılır."]],
  ["Proje ve hesaplar",["Kuyu, makine yeri, kabin ve kapı yerleşim çizimleri hazırlanır.","EN 81-50'ye göre halat/kayış güvenlik faktörü, traksiyon, ray, tampon, fren ve makine gücü hesapları yapılır.","EN 81-20'ye göre kuyu dibi ve kuyu üstü sığınma alanları kontrol edilir.","Bina yükleri bina projecisine yazılı bildirilir; deprem bölgesinde EN 81-77 kategorisi belirlenir.","Elektrik tek hat, kumanda ve güvenlik devresi şemaları projeye eklenir.","Proje Teknik Müdür ({tm}) tarafından imzalanır."]],
  ["Teknik dosya",["Proje numarasıyla teknik dosya açılır; içerik Kalite El Kitabı Bölüm 6.3'teki 12 kalemdir ve piyasaya arzdan sonra Teknik Dosya Kontrol Listesi (FR-06.04) ile eksiksizliği kontrol edilmeden arşive alınmaz.","Dosya montaj süresince güncellenir, son muayene öncesi KYT tarafından eksiksizlik kontrolü yapılır."]],
  ["Değişiklik kontrolü",["Sahada projeden sapma gerektiğinde Proje Değişiklik Formu (FR-06.03) açılır.","Teknik Müdür değişikliğin sertifika kapsamında kalıp kalmadığını değerlendirir, gerekirse hesapları revize eder.","Onaylanmamış değişiklik montaja yansıtılmaz."]]],
 kayit:["FR-06.01","FR-06.03","FR-06.04"],ilgili:["Kalite El Kitabı Bölüm 6","Asansörlerin Tasarımına İlişkin Tebliğ (SGM-2017/18)","TS EN 81-20, TS EN 81-50"]};

TPL["PR-07.01"]={t:"P",
 amac:"Malzeme, güvenlik aksamı ve dış hizmetlerin onaylı tedarikçilerden, belirlenmiş şartlara uygun olarak temin edilmesini; giriş kontrolünü ve izlenebilirliği sağlamak.",
 kapsam:"Tüm proje malzemeleri, 2014/33/AB Ek III güvenlik aksamları, kritik malzemeler, kalibrasyon, taşeron montaj, iskele ve vinç hizmetlerini kapsar.",
 sor:[["Genel Müdür","Onaylı Tedarikçi Listesi'ni onaylar."],["Teknik Müdür","Malzeme listesini onaylar, güvenlik aksamı giriş kontrolünü imzalar."],["Satın Alma ve Depo Sorumlusu","Sipariş, giriş kontrolü, depolama ve izlenebilirliği yürütür."],["Kalite Yönetim Temsilcisi","Tedarikçi değerlendirmesini koordine eder."]],
 akis:[
  ["Tedarikçi değerlendirme",["Yeni tedarikçi Tedarikçi Değerlendirme Formu (FR-07.01) ile puanlanır (100 üzerinden).","≥ 70: onaylı; 50–69: şartlı onaylı (DÖF ile); < 50: onaysız.","Güvenlik aksamı tedarikçisinde geçerli AB tip inceleme sertifikası (Ek IV A) ve Modül E/H/C2 belgesi zorunludur.","Onaylı tedarikçiler yılda bir (genel malzemede 2 yılda bir) yeniden değerlendirilir; sonuç FR-07.02'ye işlenir."]],
  ["Satın alma",["Proje Malzeme Listesi (FR-07.03) Teknik Müdür onayıyla satın almaya iletilir; güvenlik aksamlarının marka ve tipi listede açıkça yazılır; sertifika numaraları Güvenlik Aksamı İzlenebilirlik Listesi'ne (FR-07.05) işlenir.","Sipariş yalnızca onaylı tedarikçiye verilir; siparişte sertifika ve AB uygunluk beyanının malzemeyle teslimi şart koşulur.","Tip sertifikasındakinden farklı marka/tip güvenlik aksamı sipariş edilemez."]],
  ["Giriş kontrolü",["Her teslimatta Giriş Kontrol Formu (FR-07.04) doldurulur: miktar, hasar, etiket, seri no, belge uygunluğu.","Güvenlik aksamlarında giriş kontrolü Teknik Müdür veya yetkilendirdiği kişi tarafından imzalanır.","Uygun olmayan malzeme kırmızı etiketle karantina alanına konur ve Uygunsuzluk Formu (FR-11.01) açılır."]],
  ["İzlenebilirlik ve depolama",["Güvenlik aksamı seri numaraları Güvenlik Aksamı İzlenebilirlik Listesi'ne (FR-07.05) proje numarasıyla işlenir.","Raylar düz ve nemsiz, halatlar makarada ve kuru, elektronik kartlar antistatik ambalajda depolanır; sevk FIFO ile yapılır."]],
  ["Dış hizmetler",["Taşeron montaj, iskele, vinç ve kalibrasyon hizmetleri yazılı sözleşmeyle alınır.","Taşeron montajcıların MYK belgesi ve İSG eğitimleri işe başlamadan kontrol edilir.","Son muayene ve deney hiçbir koşulda taşerona devredilmez."]]],
 kayit:["FR-07.01","FR-07.02","FR-07.03","FR-07.04","FR-07.05","FR-11.01"],ilgili:["Kalite El Kitabı Bölüm 7","2014/33/AB Ek III"]};

TPL["PR-08.01"]={t:"P",
 amac:"Asansör montajının tip sertifikasına, projeye, üretici talimatlarına ve TS EN 81-20'ye uygun yapılmasını; her aşamanın ara kontrolle doğrulanmasını sağlamak.",
 kapsam:"Kuyu teslim alma aşamasından montaj bitiş bildirimine kadar tüm montaj faaliyetlerini kapsar.",
 tanim:[["Bekleme noktası","Kontrolü imzalanmadan sonraki aşamaya geçilemeyen kontrol adımı"],["Ara kontrol","Bir montaj aşamasının sonunda ilgili form ile yapılan kontrol"]],
 sor:[["Teknik Müdür","Montaj planlamasını yapar, ekip atar, bekleme noktası uygunsuzluklarını karara bağlar."],["Montaj Şantiye Şefi","Talimata uygun montajı, ara kontrolleri ve şantiye dosyasını yürütür."],["Montaj Teknisyeni","İşi talimata göre yapar, ara kontrol formlarını imzalar."]],
 akis:[
  ["Hazırlık",["Teknik dosya, malzeme listesi ve talimatlar şantiye dosyasına konur.","Kuyu Ölçüm ve Teslim Alma Formu (FR-08.01) doldurulur — bekleme noktası: kuyu uygun değilse montaja başlanmaz, müşteriye yazılı bildirilir.","Sevkiyat Kontrol Formu (FR-08.02) ile malzeme ve seri numaraları doğrulanır.","İskele, kapı boşluğu korumaları ve düşmeye karşı önlemler kurulur."]],
  ["Montaj ve ara kontroller",["Ray montajı – TL-08.02, FR-08.03 (bekleme noktası).","Makine, saptırma makarası ve regülatör – TL-08.03, FR-08.04.","Kabin, karkas, paraşüt ve karşı ağırlık – TL-08.04/05, FR-08.05.","Halat/kayış ve askı – TL-08.06, FR-08.06.","Kat ve kabin kapıları – TL-08.07, FR-08.07 (bekleme noktası).","Tampon ve kuyu dibi ekipmanları – FR-08.08.","Elektrik tesisatı – TL-08.08, FR-08.09.","İlk çalıştırma ve ayarlar – TL-08.10, FR-08.10."]],
  ["Montaj bitişi",["Şantiye Şefi kendi kontrol listesini tamamlar ve Montaj Bitiş Bildirimi'ni (FR-08.11) Teknik Müdür'e iletir.","Teknik Müdür son muayene planlamasını yapar; asansör Son Muayene ve Deney Sorumlusu'na devredilir."]],
  ["Şantiye kuralları",["Günlük montaj defterine ekip, yapılan iş, sorunlar ve değişiklikler yazılır.","Projeden sapma FR-06.03 ile onaylatılmadan uygulanmaz.","Teslim edilmemiş asansörde ana şalter kilitlenir, kat kapılarına \"KULLANIM DIŞI – MONTAJ DEVAM EDİYOR\" levhası asılır.","Kabin ve kapı yüzeyleri koruyucu filmle korunur; asansör inşaat yükü taşımada kullanılmaz."]]],
 kayit:["FR-08.01","FR-08.02","FR-08.03","FR-08.04","FR-08.05","FR-08.06","FR-08.07","FR-08.08","FR-08.09","FR-08.10","FR-08.11"],ilgili:["Kalite El Kitabı Bölüm 8","TL-08.01 … TL-08.10","TS EN 81-20"]};

TPL["PR-09.01"]={t:"P",
 amac:"Her asansörün piyasaya arzdan önce 2014/33/AB Ek X madde 3.2(c) ve Ek V madde 3(b) ile TS EN 81-20/50'ye göre eksiksiz muayene ve deneyden geçirilmesini ve sonuçların kayıt altına alınmasını sağlamak.",
 kapsam:"Modül E kapsamında monte edilen tüm asansörlerin son muayene ve deneyleri ile önemli değişiklik niteliğindeki revizyonları kapsar.",
 sor:[["Son Muayene ve Deney Sorumlusu ({smd})","Deneyleri yürütür, Son Muayene ve Deney Formu'nu doldurur, uygunsuzluk açar; gerekirse asansörü kabul edilemez ilan eder."],["Teknik Müdür ({tm})","Son Muayene ve Deney Formu'nu gözden geçirir, piyasaya arz onayını verir."],["Montaj Şantiye Şefi","Deney sırasında hazır bulunur, uygunsuzlukları giderir."],["Kalite Yönetim Temsilcisi","Kalibrasyon geçerliliğini ve kayıtları kontrol eder, FR-09.03'ü onaylanmış kuruluşla paylaşır."]],
 akis:[
  ["Ön koşullar",["FR-08.11 ve tüm ara kontrol formları kapalı.","Kalibrasyonu geçerli ekipman (FR-10.01) hazır.","Beyan yükünün en az %125'i tartılmış ve etiketli deney ağırlığı şantiyede.","Kalıcı bina elektriği bağlı; kuyu, makine yeri ve kapı önleri temiz.","Deneyi yapacak personel montaj ekibinden bağımsız ve yetki matrisinde yetkili."]],
  ["Muayene ve deneyler",["A – Doküman ve projeye uygunluk; güvenlik aksamı seri no kontrolü.","B – Kuyu, sığınma alanları, aydınlatma, makine yeri.","C – Kapılar, kilitler, kapanma kuvveti, kapı koruyucu.","D – Elektrik: yalıtım, süreklilik, güvenlik devresi, faz koruması (TL-09.05).","E – Fren, traksiyon ve dengeleme deneyleri (TL-09.01).","F – Regülatör, paraşüt, tampon, UCMP, yukarı yön aşırı hız koruması (TL-09.02/03/04).","G – Fonksiyon, seviyeleme, revizyon, acil kurtarma, enerji kesintisi, acil aydınlatma, alarm, aşırı yük.","H – 1,25 × beyan yükü statik deney (TL-09.06).","Her kalem FR-09.01'e ölçülen değeri ve kullanılan cihaz numarasıyla yazılır; \"OK\" ifadesi kabul edilmez."]],
  ["Uygunsuzluk",["Uygun olmayan kalem FR-11.01 ile montaj ekibine iletilir.","Düzeltme sonrası ilgili deney ve etkilenen diğer deneyler tekrarlanır.","Kritik uygunsuzlukta asansör enerjisi kesilip kilitlenir."]],
  ["Karar",["Tüm kalemler uygunsa Son Muayene ve Deney Sorumlusu Son Muayene ve Deney Formu'nu imzalar.","Teknik Müdür Son Muayene ve Deney Formu ve teknik dosyayı gözden geçirip \"Piyasaya Arza Uygundur\" onayını verir.","Onaydan sonra PR-12.01 başlar; onaydan önce asansör kullanım amaçlı teslim edilmez."]],
  ["Onaylanmış kuruluş gözetimi",["KYT her yıl Devam Eden Montajlar Listesi'ni (FR-09.03) onaylanmış kuruluşa iletir.","Habersiz ziyarette deney ekipmanı ve ağırlıklar kuruluşun kullanımına sunulur; ziyaret raporu teknik dosyaya eklenir."]]],
 kayit:["FR-09.01","FR-09.03","FR-11.01"],ilgili:["Kalite El Kitabı Bölüm 9","TL-09.01 … TL-09.06","2014/33/AB Ek V 3(b), Ek X 3.2(c) ve 4.4","TS EN 81-20, TS EN 81-50"]};

TPL["PR-10.01"]={t:"P",
 amac:"Son muayene, montaj ve bakımda kullanılan ölçme ve test ekipmanlarının kalibrasyonunu, tanımlanmasını, korunmasını ve kalibrasyon dışı durumların etkisinin değerlendirilmesini sağlamak.",
 kapsam:"FR-10.01'de listelenen tüm ölçüm cihazları ve deney ağırlıklarını kapsar.",
 sor:[["Kalite Yönetim Temsilcisi","Kalibrasyon planını yönetir, sertifikaları değerlendirir."],["Son Muayene ve Deney Sorumlusu","Cihazları kullanmadan önce etiket ve geçerliliği kontrol eder."],["Teknik Müdür","Kalibrasyon dışı durumların geriye dönük etkisini değerlendirir."]],
 akis:[
  ["Tanımlama ve planlama",["Her cihaza benzersiz ekipman no verilir ve FR-10.01'e işlenir: ad, marka/model, seri no, ölçüm aralığı, kalibrasyon yöntemi, periyot, son ve sonraki tarih.","Akredite kalibrasyon TS EN ISO/IEC 17025 akreditasyonlu laboratuvarda yapılır; iç doğrulamalar referans cihazla yapılır ve kayda alınır."]],
  ["Kalibrasyon",["KYT her ay sonraki 30 gün içinde kalibrasyonu dolacak cihazları listeler.","Gelen sertifika kabul sınırlarına göre değerlendirilir ve imzalanır; cihaza tarihli kalibrasyon etiketi yapıştırılır.","Deney ağırlıkları kalibre teraziyle tartılır, ağırlık değeri üzerine yazılır."]],
  ["Kullanım ve koruma",["Kullanıcı her kullanımdan önce etiketi kontrol eder; süresi geçmiş cihazla ölçüm yapılmaz.","Cihazlar taşıma çantasında, darbe ve nemden korunarak taşınır.","Son Muayene ve Deney Formu'na her deneyde kullanılan cihazın ekipman numarası yazılır."]],
  ["Kalibrasyon dışı durum",["Süresi geçen, düşen veya hasarlanan cihaz kırmızı etiketle kullanımdan çekilir.","Sertifikada sapma sınırı aşıldıysa, son geçerli kalibrasyondan bu yana o cihazla yapılan ölçümler belirlenir.","Teknik Müdür etkiyi değerlendirir; gerekirse etkilenen asansörlerde deney tekrarlanır ve DÖF (FR-11.01) açılır."]]],
 kayit:["FR-10.01","FR-11.01"],ilgili:["Kalite El Kitabı Bölüm 10","TS EN ISO/IEC 17025"]};

TPL["PR-11.01"]={t:"P",
 amac:"Uygun olmayan malzeme, montaj ve ürünün tanımlanmasını, kullanımının veya piyasaya arzının önlenmesini ve karara bağlanmasını sağlamak.",
 kapsam:"Giriş kontrolü, montaj, son muayene, bakım ve piyasaya arz sonrası tespit edilen tüm uygunsuzlukları kapsar.",
 tanim:[["Kritik","Can güvenliğini doğrudan etkileyen uygunsuzluk"],["Majör","Yönetmelik veya standart şartından sapma; güvenliği dolaylı etkileyebilir"],["Minör","Kayıt/doküman eksikliği, konfor veya görsel kusur"]],
 sor:[["Tespit eden personel","Uygunsuzluğu FR-11.01 ile kaydeder, ürünü tanımlar."],["Teknik Müdür","Uygunsuz ürünün akıbetine karar verir."],["Kalite Yönetim Temsilcisi","Kayıtları izler, gerekirse DÖF başlatır."],["Genel Müdür","Kritik uygunsuzlukta ve resmi bildirimlerde karar verir."]],
 akis:[
  ["Tanımlama",["Uygun olmayan malzeme kırmızı \"UYGUNSUZ\" etiketiyle işaretlenip karantina alanına konur.","Uygun olmayan montajda ilgili aşama durdurulur; kritik durumda asansör enerjisi kesilip kilitlenir.","Uygunsuzluk FR-11.01'e sınıfıyla birlikte kaydedilir."]],
  ["Karar",["Malzeme: tedarikçiye iade, hurda veya (yalnızca güvenlik aksamı dışı ve teknik olarak uygunsa) Teknik Müdür onaylı yeniden işleme.","Montaj: yeniden işleme ve ilgili kontrolün tekrarı.","Uygunsuzlukla piyasaya arz için özel izin uygulaması yoktur."]],
  ["Piyasaya arz sonrası uygunsuzluk",["Asansör güvenli hale getirilir veya kullanıma kapatılır; bina sorumlusuna yazılı bildirilir.","Aynı aksam/lotu kullanan asansörler FR-07.05 ile bulunur ve kontrol edilir.","Ciddi risk varsa Sanayi ve Teknoloji Bakanlığı ve onaylanmış kuruluş bilgilendirilir.","DÖF (PR-11.02) zorunludur."]]],
 kayit:["FR-11.01","FR-07.05"],ilgili:["Kalite El Kitabı Bölüm 11","PR-11.02"]};

TPL["PR-11.02"]={t:"P",
 amac:"Uygunsuzlukların kök nedenlerini ortadan kaldırarak tekrarını önlemek ve potansiyel uygunsuzlukların oluşmasını engellemek.",
 kapsam:"Tetkik bulguları, majör/kritik uygunsuzluklar, tekrarlayan minör uygunsuzluklar, şikayetler, kazalar, periyodik kontrol kırmızı/sarı etiket bulguları ve onaylanmış kuruluş bulgularını kapsar.",
 sor:[["Kalite Yönetim Temsilcisi","DÖF açar, takip eder, etkinliği doğrular, kapatır."],["Teknik Müdür","Teknik DÖF'lerde kök neden analizine liderlik eder."],["Faaliyet sorumlusu","Planlanan faaliyeti termininde uygular."],["Genel Müdür","Kaynak sağlar; geciken DÖF'leri YGG'de değerlendirir."]],
 akis:[
  ["Başlatma",["DÖF, FR-11.01'in DÖF bölümü doldurularak başlatılır ve numara verilir (DÖF-YYYY-NNN).","Onaylanmış kuruluş bulgularında kuruluşun verdiği kapanış süresi termin olarak alınır."]],
  ["Kök neden analizi",["Ekip Teknik Müdür veya KYT liderliğinde kurulur.","5 Neden veya balık kılçığı yöntemi kullanılır; analiz forma eklenir.","Aynı kök nedenin diğer projelerde de bulunup bulunmadığı araştırılır."]],
  ["Faaliyet planı ve uygulama",["Her faaliyet için sorumlu ve termin belirlenir.","Faaliyet talimat, form veya eğitim değişikliği gerektiriyorsa PR-05.01 / PR-04.01 uygulanır."]],
  ["Etkinlik ve kapanış",["KYT en geç 3 ay sonra kayıt ve saha incelemesiyle etkinliği doğrular.","Etkin değilse yeni faaliyet planlanır; etkinse DÖF kapatılır.","Açık ve geciken DÖF'ler her ay Genel Müdür'e raporlanır ve YGG'de değerlendirilir."]]],
 kayit:["FR-11.01"],ilgili:["Kalite El Kitabı Bölüm 11","PR-15.01","PR-15.02"]};

TPL["PR-11.03"]={t:"P",
 amac:"Müşteri şikayetlerinin kayda alınması, değerlendirilmesi, sonuçlandırılması ve müşteriye geri bildirim yapılmasını; müşteri memnuniyetinin anketlerle düzenli ölçülmesini sağlamak.",
 kapsam:"Telefon, e-posta, web, yazılı veya personel aracılığıyla gelen tüm şikayetleri ve montaj ile teknik servis (bakım, arıza, modernizasyon) müşterilerine uygulanan memnuniyet anketlerini kapsar; güvenlikle ilgili ihbarlar öncelikli işlenir.",
 sor:[["Şikayeti alan personel","FR-11.03'e kaydeder ve ilgili sorumluya iletir."],["Bakım ve Revizyon Şefi","Saha incelemesini organize eder."],["Kalite Yönetim Temsilcisi","Şikayeti takip eder, müşteriye geri bildirim yapar, eğilim analizi hazırlar."]],
 akis:[
  ["Kayıt ve sınıflandırma",["Şikayet FR-11.03'e kaydedilir: tarih/saat, şikayet eden, asansör seri no, konu.","Sınıf: güvenlik, arıza tekrarı, hizmet kalitesi, ticari, diğer."]],
  ["İnceleme",["Güvenlikle ilgili şikayette aynı gün sahaya teknisyen gönderilir; gerekirse asansör kullanıma kapatılır.","Diğer şikayetlerde inceleme sorumlusu atanır."]],
  ["Yanıt",["Müşteriye 3 iş günü içinde ilk yanıt verilir.","15 iş günü içinde sonuç yazılı bildirilir.","Haklı bulunan ve tekrar riski olan şikayetler DÖF'e (PR-11.02) bağlanır."]],
  ["Müşteri memnuniyeti anketleri",["Montajı tamamlanan her asansör için teslimden sonra en geç 1 ay içinde Müşteri Memnuniyet Anketi (Montaj) (FR-11.04) bina sorumlusuna iletilir.","Bakım sözleşmesi bulunan müşterilere yılda bir kez, modernizasyon yapılan müşterilere işin tesliminden sonra Müşteri Memnuniyet Anketi (Teknik Servis) (FR-11.05) uygulanır.","Anketler elden, e-posta veya telefonla yapılabilir; telefonla yapılan ankette görüşen personel formu müşteri adına doldurur ve not eder.","3 ve altı puan alan her konu şikayet gibi FR-11.03'e kaydedilir; tekrar riski varsa DÖF açılır."]],
  ["Analiz",["KYT 3 ayda bir şikayetleri sınıf ve asansör bazında analiz eder ve YGG'ye raporlar.","Anket sonuçları yılda bir montaj ve teknik servis için ayrı ayrı ortalama puan olarak hesaplanır; Müşteri memnuniyeti kalite hedefiyle (≥ 4,2) karşılaştırılarak YGG'ye sunulur."]]],
 kayit:["FR-11.03","FR-11.04","FR-11.05","FR-11.01"],ilgili:["Kalite El Kitabı Bölüm 11"]};

TPL["PR-12.01"]={t:"P",
 amac:"Son muayenesi onaylanan asansöre CE işaretinin iliştirilmesi, AB Uygunluk Beyanı'nın düzenlenmesi, kullanım belgelerinin hazırlanması ve asansörün bina sorumlusuna teslimini tanımlamak.",
 kapsam:"Modül E kapsamında piyasaya arz edilen tüm asansörleri kapsar.",
 sor:[["Teknik Müdür","CE etiket basımını onaylar, belgelerin doğruluğunu kontrol eder."],["Genel Müdür ({gm})","AB Uygunluk Beyanı'nı imzalar."],["Montaj Şantiye Şefi","Etiketi iliştirir, teslimi yapar."],["Kalite Yönetim Temsilcisi","Piyasaya arz listesini onaylanmış kuruluşa bildirir."]],
 akis:[
  ["CE etiketi",["Son Muayene ve Deney Formu onayından sonra CE Etiket Talep Formu (FR-12.01) doldurulur.","Etikette: CE + onaylanmış kuruluş kimlik numarası, {unvan}, adres, seri no, montaj yılı, beyan yükü ve kişi sayısı.","CE işaretinin oranları korunur, en az 5 mm yükseklik uygulanır; etiket kabin içine görünür ve silinmez şekilde iliştirilir."]],
  ["AB Uygunluk Beyanı",["FR-12.02 şablonu Ek II Bölüm B içeriğiyle her asansör için ayrı doldurulur.","Genel Müdür imzalar; aslı bina sorumlusuna verilir, kopyası teknik dosyada 10 yıl saklanır."]],
  ["Kullanım belgeleri",["Türkçe kullanım kılavuzu, acil kurtarma talimatı (TL-14.01/02), EN 13015'e uygun bakım talimatları ve kullanım kayıt defteri hazırlanır.","Acil kurtarma talimatı makine dairesine/kumanda panosuna asılır."]],
  ["Teslim",["Teslimden sonra en geç 1 ay içinde Müşteri Memnuniyet Anketi (Montaj) (FR-11.04) bina sorumlusuna iletilir (PR-11.03).","Teslim Tutanağı (FR-12.03) ile asansör, anahtarlar, kurtarma aparatları, belgeler ve en az 3 yıllık garanti belgesi teslim edilir.","Bina sorumlusuna kullanım ve acil durum bilgilendirmesi yapılır.","Tescil için gerekli belgeler ilgili idareye mevzuattaki süre içinde iletilir.","Asansör FR-12.04 Piyasaya Arz Bildirim Listesi'ne işlenir ve sözleşmedeki periyotta onaylanmış kuruluşa bildirilir."]]],
 kayit:["FR-12.01","FR-12.02","FR-12.03","FR-12.04"],ilgili:["Kalite El Kitabı Bölüm 12","2014/33/AB Ek I 6.2, Ek II-B, Ek X madde 7","Asansör İşletme ve Bakım Yönetmeliği"]};

TPL["PR-13.01"]={t:"P",
 amac:"Mevcut asansörlerde yapılacak revizyon ve modernizasyon işlerinin önemli değişiklik olup olmadığının belirlenmesi, TS EN 81-80'e göre risk değerlendirmesi yapılması ve işin uygun yolla belgelendirilmesini sağlamak.",
 kapsam:"Firmanın yaptığı tüm revizyon, modernizasyon ve güvenlik iyileştirme işlerini kapsar.",
 tanim:[["Önemli değişiklik","Beyan hızı, beyan yükü, kabin ağırlığı, hareket mesafesi, tahrik tipi veya güvenlik aksamlarında yeni uygunluk değerlendirmesi gerektiren değişiklik"]],
 sor:[["Teknik Müdür","Revizyon türüne karar verir, projeyi onaylar."],["Bakım ve Revizyon Şefi","Mevcut durum tespitini ve uygulamayı yürütür."],["Son Muayene ve Deney Sorumlusu","Revizyon sonrası deneyleri yapar."]],
 akis:[
  ["Mevcut durum tespiti",["FR-13.02 (TS EN 81-80 kontrol listesi) ile asansör ve kuyu incelenir.","Son periyodik kontrol raporundaki sarı/kırmızı etiket bulguları eklenir."]],
  ["Değerlendirme",["Teknik Müdür Revizyon Değerlendirme Formu (FR-13.01) ile türü belirler: önemli değişiklik / güvenlik iyileştirme / eşdeğer parça değişimi.","Önemli değişiklik ve tip sertifikası kapsamında: Modül E ile yeni CE. Kapsam dışında: Modül G.","Tereddüt halinde onaylanmış kuruluş ve Bakanlık'tan yazılı görüş alınır."]],
  ["Teklif ve proje",["Giderilecek tehlikeler ve değişecek aksamlar müşteriye yazılı bildirilir.","Müşterinin kapsam dışı bıraktığı kritik riskler tutanakla kayda geçer.","Etkilenen hesaplar (halat, fren, tampon, ray) yenilenir; bina yükleri değişirse bina sorumlusu bilgilendirilir."]],
  ["Uygulama ve deney",["Satın alma PR-07.01'e, uygulama PR-08.01 talimatlarına göre yapılır; asansör kullanıma kapatılır.","Önemli değişiklikte PR-09.01'in tamamı; diğerlerinde değişen aksamla ilgili deneyler + güvenlik devresi ve fonksiyon deneyleri yapılır.","Sökülen güvenlik aksamları tekrar kullanılmamak üzere imha edilir veya işaretlenir."]],
  ["Belgelendirme",["Önemli değişiklikte yeni CE ve AB Uygunluk Beyanı (PR-12.01).","Diğerlerinde Revizyon Teslim Raporu (FR-13.03) ve teknik dosya güncellemesi.","Gerekirse A tipi muayene kuruluşuna yeniden kontrol başvurusu yapılır."]]],
 kayit:["FR-13.01","FR-13.02","FR-13.03"],ilgili:["Kalite El Kitabı Bölüm 13","TS EN 81-80","PR-09.01","PR-12.01"]};

TPL["PR-14.01"]={t:"P",
 amac:"Bakım sözleşmesi kapsamındaki asansörlerin periyodik bakımının, arıza giderme ve kurtarma hizmetlerinin mevzuata ve EN 13015'e uygun, kesintisiz yürütülmesini sağlamak.",
 kapsam:"Firmanın bakımını üstlendiği tüm asansörleri ve 7/24 kurtarma hizmetini ({kurtarma}) kapsar.",
 sor:[["Bakım ve Revizyon Şefi ({bakimSefi})","Bakım planını, ekip atamasını ve çağrı yönetimini yürütür."],["Bakım Teknisyeni","Bakımı talimata göre yapar, formu doldurur ve imzalatır."],["Teknik Müdür","Güvenlik riski taşıyan bulgularda karar verir."],["Kalite Yönetim Temsilcisi","Arıza ve müdahale sürelerini izler."]],
 akis:[
  ["Sözleşme",["Asansör listesi, periyot, kapsam, müdahale süreleri, 7/24 hat ve bina sorumlusunun yükümlülükleri yazılı sözleşmeye bağlanır.","Monte edilen asansörlerde garanti süresince (en az 3 yıl) bakım firma veya yetkili servisince yapılır."]],
  ["Periyodik bakım",["Aylık, 3 aylık, 6 aylık ve yıllık bakımlar plan dahilinde yapılır ve Periyodik Bakım Formu'na (FR-14.01) kaydedilir; formda yapılan bakım türü işaretlenir, o türe ait (*) işaretli kalemlerin tamamı kontrol edilir.","Form bina sorumlusuna imzalatılır, kopyası asansör dosyasına konur ve sisteme işlenir.","Güvenliği tehlikeye atan bulguda asansör kullanıma kapatılır, bina sorumlusuna yazılı bildirilir.","Bakım müşterilerine yılda bir kez Müşteri Memnuniyet Anketi (Teknik Servis) (FR-11.05) uygulanır (PR-11.03)."]],
  ["Arıza ve kurtarma",["İhbar Arıza Kayıt Formu'na (FR-14.02) saat ve dakikasıyla işlenir.","Mahsur kalmada öncelik 1; hedef ilk müdahale ≤ 60 dk.","Kurtarma TL-14.01/02'ye göre en az iki kişiyle yapılır.","30 gün içinde tekrarlayan arıza DÖF'e bağlanır."]],
  ["Periyodik kontrol",["A tipi muayene öncesi yıllık bakım tamamlanır, kontrolde teknisyen hazır bulunur.","Sarı ve kırmızı etiket bulguları FR-11.01 ile kaydedilir ve mevzuattaki sürelerde giderilir."]],
  ["Yedek parça",["Güvenlik aksamı yedek parçası yalnızca orijinal veya aynı tip sertifikalı olur; seri numarası bakım kaydına işlenir."]]],
 kayit:["FR-14.01","FR-14.02","FR-11.05"],ilgili:["Kalite El Kitabı Bölüm 14","Asansör İşletme ve Bakım Yönetmeliği","Asansör Periyodik Kontrol Yönetmeliği","TS EN 13015"]};

TPL["PR-15.01"]={t:"P",
 amac:"Kalite sisteminin Modül E şartlarına ve bu el kitabına uygun uygulanıp uygulanmadığını planlı aralıklarla tetkik etmek.",
 kapsam:"Tüm bölümler, süreçler ve aktif montaj şantiyelerini kapsar.",
 sor:[["Kalite Yönetim Temsilcisi","Tetkik planını hazırlar, tetkikçileri atar, raporları takip eder."],["İç tetkikçiler","Tetkiki yapar, bulguları raporlar."],["Tetkik edilen bölüm yöneticisi","Bulgular için DÖF uygular."]],
 akis:[
  ["Planlama",["Yıllık İç Tetkik Planı (FR-15.01) Ocak'ta yayınlanır; her bölüm ve en az 1 aktif şantiye yılda en az bir kez tetkik edilir.","Önceki bulgular, şikayetler ve değişiklikler yoğun tetkik gerektiren alanları belirler."]],
  ["Tetkikçiler",["İç tetkikçi eğitimi almış personel görevlendirilir.","Tetkikçi kendi işini tetkik edemez."]],
  ["Uygulama",["Açılış, kayıt ve saha incelemesi, personel görüşmesi, kapanış.","Şantiye tetkikinde habersiz ziyaret simüle edilir: şantiye dosyası, ara kontroller, izlenebilirlik ve rastgele seçilen bir deneyin tanıklıkla tekrarı.","Bu yıl içerisinde piyasaya arz edilmiş 1 asansörün teknik dosyası ve Son Muayene ve Deney Formu incelenir.","Tetkik, İç Tetkik Soru Listesi'nde (FR-15.05) plandaki her tetkik için ayrı hazırlanmış soru listesi kullanılarak yapılır; tetkikçi gerektiğinde ek soru yazar ve incelediği kanıtı not eder."]],
  ["Raporlama",["Bulgular İç Tetkik Raporu'na (FR-15.02) majör/minör/gözlem olarak yazılır.","Majör ve minör bulgular için DÖF açılır (PR-11.02).","Sonuçlar YGG'ye girdi olur.","Onaylanmış kuruluşun gözetim tetkikleri ve habersiz ziyaretleri Onaylanmış Kuruluş Denetim Takip Formu'na (FR-15.06) kaydedilir; bulgular için DÖF açılır ve kapanışları bu formda izlenir."]]],
 kayit:["FR-15.01","FR-15.05","FR-15.02","FR-15.06","FR-11.01"],ilgili:["Kalite El Kitabı Bölüm 15","TS EN ISO 19011"]};

TPL["PR-15.02"]={t:"P",
 amac:"Kalite sisteminin sürekli uygunluğunu, yeterliliğini ve etkinliğini üst yönetim tarafından değerlendirmek ve iyileştirme kararları almak.",
 kapsam:"Kalite sisteminin tamamını kapsar; yılda en az bir kez ve onaylanmış kuruluş gözetim tetkikinden önce yapılır.",
 sor:[["Genel Müdür ({gm})","Toplantıya başkanlık eder, kararları onaylar."],["Kalite Yönetim Temsilcisi ({kyt})","Girdileri hazırlar, tutanağı yazar, kararları takip eder."],["Bölüm yöneticileri","Kendi alanlarının verilerini sunar."]],
 akis:[
  ["Girdiler",["Kalite hedefleri gerçekleşmesi (FR-15.04)","İç tetkik, onaylanmış kuruluş tetkiki ve habersiz ziyaret sonuçları","Son Muayene ve Deney Formu ilk geçiş oranı ve en sık uygunsuzluklar","Periyodik kontrol etiket dağılımı","Şikayetler ve müşteri memnuniyeti","DÖF durumu","Tedarikçi performansı, kalibrasyon ve eğitim durumu","Mevzuat ve standart değişiklikleri; önceki YGG kararları; kaynak ihtiyaçları"]],
  ["Çıktılar",["İyileştirme kararları, sorumlular ve terminler","Kaynak kararları","Gerekiyorsa kalite politikası ve hedeflerinin revizyonu","Tutanak (FR-15.03) katılımcılarca imzalanır."]],
  ["Takip",["KYT kararların durumunu her ay izler ve bir sonraki YGG'de raporlar."]]],
 kayit:["FR-15.03","FR-15.04"],ilgili:["Kalite El Kitabı Bölüm 3 ve 15"]};
/* ---------- Şablon içerikleri: Talimatlar ---------- */
var GUV_KUYU=["Kuyuya girmeden önce ana şalter kapatılır, kilitlenir ve \"ÇALIŞMA VAR\" etiketi asılır (LOTO).","Açık kat kapısı boşluklarına sabit korkuluk veya bariyer konur.","Kuyu içinde ve iskelede tam vücut kemeri ve ankraj kullanılır.","Baret, iş ayakkabısı, eldiven ve koruyucu gözlük takılır.","Üst üste çalışma yapılmaz; malzeme düşmesine karşı alt bölge boşaltılır."];
var NOT_STD="Sayısal değerler firma iç kabul kriteridir. Bağlayıcı değerler tip sertifikası, üretici montaj talimatı ve TS EN 81-20/50'dir; çelişkide daha sıkı olan uygulanır.";

TPL["TL-08.01"]={t:"T",amac:"Montaj öncesinde kuyu, makine yeri ve kat ölçülerinin alınması, şakul ipinin/lazer şakulün kurulması ve kuyunun projeye uygunluğunun doğrulanması.",
 ekip:["Lazer metre ve şerit metre","Lazer şakul veya şakul teli (0,5–1 mm çelik tel) ve şakul ağırlıkları","Su terazisi","Şakul tahtası (kuyu üstü şablonu)","Kuyu Ölçüm ve Teslim Alma Formu (FR-08.01)"],guv:GUV_KUYU,
 on:["Kuyu kaba inşaatı tamamlanmış, kuyu kuru ve temiz.","Kuyu dibine erişim için sabit merdiven veya güvenli geçici merdiven var.","Projede kuyu ölçüleri ve kat yükseklikleri belli."],
 adim:[["Genel ölçüm",["Her katta kuyu genişliği ve derinliği ölçülür; en küçük net ölçü kaydedilir.","Kat yükseklikleri ve toplam hareket mesafesi ölçülür.","Kuyu dibi derinliği (en alt kat bitmiş döşemeden) ve kuyu üstü yüksekliği (en üst kat bitmiş döşemeden tavana) ölçülür.","Kat kapısı boşluk ölçüleri ve eşik kotları alınır."]],
  ["Şakul kurulumu",["Kuyu üstüne şakul tahtası projeye göre yerleştirilir ve sabitlenir.","Ray ve kapı eşik şakulleri sarkıtılır; ağırlıklar su veya yağ dolu kapta salınımı durdurulur.","Şakullerin her katta duvara mesafesi ölçülerek en dar kesitte gerekli boşluğun sağlandığı doğrulanır."]],
  ["Değerlendirme",["Ölçümler projeyle karşılaştırılır; sapma varsa FR-06.03 ile Teknik Müdür'e bildirilir.","Makine dairesi/makine yeri, havalandırma, aydınlatma, priz ve bina besleme hattı kontrol edilir.","Uygunsuzluk varsa bekleme noktası uygulanır, müşteriye yazılı bildirim yapılır."]]],
 kabul:[["Kuyu net ölçüsü","Projedeki en küçük ölçüden az değil","Lazer metre"],["Kuyu şakulden sapma","Kuyu boyunca ±25 mm içinde (proje toleransı)","Şakul"],["Kuyu dibi / kuyu üstü","EN 81-20 sığınma alanı ve boşluklarını sağlayan proje değeri","Ölçüm"],["Kat yükseklikleri","Proje değeri ±20 mm","Ölçüm"]],kayit:["FR-08.01"],not:NOT_STD};

TPL["TL-08.02"]={t:"T",amac:"Kabin ve karşı ağırlık raylarının konsollarla birlikte projeye ve üretici talimatına uygun montajı ve hizalanması.",
 ekip:["Ray mesafe mastarı (DBG mastarı)","Ray hizalama aparatı","Tork anahtarı","Sentil ve cetvel","Matkap, dübel/ankraj","Şakul"],guv:GUV_KUYU.concat(["Ray taşıma ve kaldırmada vinç/zincirli palanga kullanılır; ray boyları el ile tek kişi taşınmaz."]),
 on:["FR-08.01 onaylı (bekleme noktası kapalı).","Ray konsol aralıkları ve ankraj tipi projede belli."],
 adim:[["Konsol montajı",["Konsol yerleri şakullerden ölçülerek işaretlenir; aralık projeden fazla olamaz.","Ankrajlar üretici talimatındaki derinlik ve torkla takılır."]],
  ["Ray montajı",["İlk ray boyu kuyu dibinde tampon/ray tabanına oturtulur.","Raylar erkek dişi yukarı bakacak şekilde birleştirilir; ek lamaları tüm cıvatalarla torklanır.","Ray klipsleri geçici sıkılır; hizalama sonrası nihai tork uygulanır."]],
  ["Hizalama",["Raylar arası mesafe (DBG) her konsolda mastarla kontrol edilir.","Her ray şakule göre iki eksende hizalanır.","Ek yerlerindeki kademe eğe ile giderilir.","Ölçümler FR-08.03'e konsol bazında yazılır."]]],
 kabul:[["Raylar arası mesafe (DBG)","Nominal +0 / +2 mm","Mastar"],["Şakulden sapma","Ray boyunca ≤ 1 mm/5 m, toplamda ≤ 3 mm","Şakul + cetvel"],["Ek yerlerinde kademe","≤ 0,05 mm (hissedilmez)","Sentil"],["Konsol aralığı","Projedeki değerden büyük değil","Ölçüm"],["Cıvata torku","Üretici değeri","Tork anahtarı"]],kayit:["FR-08.03"],not:NOT_STD};

TPL["TL-08.03"]={t:"T",amac:"Tahrik makinesi, makine şasesi, saptırma makarası ve aşırı hız regülatörünün montajı.",
 ekip:["Vinç veya zincirli palanga ve sapanlar","Su terazisi","Tork anahtarı","Şakul"],guv:GUV_KUYU.concat(["Makine kaldırılırken altında kimse bulunmaz; kaldırma ekipmanının periyodik kontrolü geçerlidir."]),
 on:["Ray montajı tamamlanmış ve FR-08.03 kapalı.","Makine taşıyıcı kirişleri/bina mesnetleri projeye uygun."],
 adim:[["Makine ve şase",["Şase projeye göre yerleştirilir, titreşim takozları üretici talimatına göre konur.","Makine şaseye bağlanır; makine kasnağı halat inişleri şakullere göre hizalanır.","Şase terazisi iki eksende kontrol edilir."]],
  ["Saptırma makarası",["Makara ekseni makine kasnağına paralel hizalanır.","Halat çıkış noktaları şakullerle karşılaştırılır."]],
  ["Regülatör",["Regülatör projede belirtilen konuma, regülatör halatı paraşüt tetik koluna dik inecek şekilde yerleştirilir.","Gergi makarası kuyu dibinde ağırlık serbest olacak şekilde montajlanır; gergi kontağı ayarlanır.","Regülatör mührü ve etiket hızı kontrol edilir."]]],
 kabul:[["Şase terazisi","≤ 1 mm/m","Su terazisi"],["Kasnak – şakul hizası","Proje değeri ±2 mm","Şakul"],["Regülatör halatı – tetik kolu","Halat düşey, sürtünmesiz","Gözle"],["Bağlantı torkları","Üretici değeri","Tork anahtarı"]],kayit:["FR-08.04"],not:NOT_STD};

TPL["TL-08.04"]={t:"T",amac:"Kabin karkası, kabin tabanı, panelleri, kabin kapısı mekanizması ve paraşüt tertibatının montajı ve ayarı.",
 ekip:["Su terazisi, gönye","Sentil","Tork anahtarı","Kaldırma ekipmanı"],guv:GUV_KUYU.concat(["Karkas montajı sırasında karkas alt kirişi kuyu dibinde sağlam takozlara oturtulur."]),
 on:["Ray montajı tamamlanmış.","Paraşüt tipi tip sertifikasındaki ile aynı (FR-07.05 kontrolü)."],
 adim:[["Karkas",["Alt kiriş takozlara oturtulur; dikmeler ve üst kiriş birleştirilir.","Kılavuz pabuçları takılır; karkasın raylar arasında gönyesi kontrol edilir."]],
  ["Paraşüt",["Paraşüt blokları karkasa bağlanır; ray–paraşüt çenesi boşlukları her iki tarafta eşitlenir.","Tetik mekanizmasının senkron çalışması ve paraşüt kontağı kontrol edilir.","Paraşüt seri numarası FR-08.05'e yazılır."]],
  ["Kabin",["Taban, paneller, tavan ve kabin içi donanım üretici talimatıyla monte edilir.","Kabin üstü korkuluk (gerekiyorsa), kabin üstü stop ve revizyon kutusu takılır."]]],
 kabul:[["Karkas gönyesi","≤ 2 mm köşegen farkı","Ölçüm"],["Paraşüt çenesi – ray boşluğu","Üretici değeri, iki tarafta eşit","Sentil"],["Paraşüt tetik senkronu","Her iki taraf aynı anda kavrar","Fonksiyon"],["Kabin üstü korkuluk","EN 81-20 şartlarına göre","Ölçüm"]],kayit:["FR-08.05"],not:NOT_STD};

TPL["TL-08.05"]={t:"T",amac:"Karşı ağırlık çerçevesinin montajı ve dolgu ağırlığının dengeleme oranına göre hesaplanması.",
 ekip:["Kaldırma ekipmanı","Terazi veya ağırlık listesi","Tork anahtarı"],guv:GUV_KUYU,
 on:["Karşı ağırlık rayları hizalanmış.","Dengeleme oranı projede belli (genellikle %40–50)."],
 adim:[["Montaj",["Karşı ağırlık çerçevesi rayların arasına yerleştirilir, kılavuz pabuçları takılır.","Varsa karşı ağırlık paraşütü takılır ve ayarlanır."]],
  ["Dolgu hesabı",["Karşı ağırlık = kabin ağırlığı + dengeleme oranı × beyan yükü (halat dengeleme dahil).","Dolgu blokları hesaplanan adette yerleştirilir ve sabitleme lamasıyla kilitlenir.","Nihai dengeleme ilk çalıştırmada akım ölçümüyle doğrulanır (TL-09.01)."]]],
 kabul:[["Karşı ağırlık kütlesi","Hesap değeri ±%2","Hesap / tartım"],["Dolgu sabitlemesi","Bloklar hareket etmez","Gözle"],["Tampon mesafesi","Proje değeri","Ölçüm"]],kayit:["FR-08.05"],not:NOT_STD};

TPL["TL-08.06"]={t:"T",amac:"Askı halatları veya kayışların kesilmesi, takılması, bağlantı elemanlarının montajı ve gerginliklerinin eşitlenmesi.",
 ekip:["Halat kesme aleti","Halat kilitleri/kamalı soketler (üretici onaylı)","Halat gerginlik ölçer veya yay terazisi","Kumpas"],guv:GUV_KUYU.concat(["Halat çözülürken makara sabitlenir; halat uçları bantlanır."]),
 on:["Kabin ve karşı ağırlık montajı tamamlanmış ve takozlanmış.","Halat/kayış tipi ve çapı projedekiyle aynı."],
 adim:[["Halat boyu ve kesme",["Halat boyu kabin en üst katta, karşı ağırlık tampon mesafesinde olacak şekilde ölçülür.","Kesim noktasının iki yanı bantlanır."]],
  ["Bağlantı",["Halat uçları kamalı soketlere üretici talimatıyla takılır; halat kilitleri (gerekiyorsa) doğru yönde sıkılır.","Gergi yayları ve emniyet pimleri takılır; gevşek halat kontağı ayarlanır."]],
  ["Gerginlik eşitleme",["Kabin kat ortasındayken her halatın gerginliği ölçülür.","Ortalamadan sapma ≤ %10 olacak şekilde ayarlanır; değerler FR-08.06'ya yazılır."]]],
 kabul:[["Halat çapı","Proje değeri","Kumpas"],["Gerginlik sapması","Ortalamadan ≤ %10","Gerginlik ölçer"],["Emniyet pimleri","Tüm soketlerde takılı","Gözle"],["Halat sayısı ve askı oranı","Proje ile aynı","Gözle"]],kayit:["FR-08.06"],not:NOT_STD};

TPL["TL-08.07"]={t:"T",amac:"Kat kapıları, kabin kapısı ve kapı operatörünün montajı; kilitlerin ve kapı aralıklarının ayarı.",
 ekip:["Kapı eşik şakulü","Sentil ve cetvel","Kapı kuvvet ölçer","Su terazisi"],guv:GUV_KUYU,
 on:["Kat kapısı kilitlerinin tipi tip sertifikasındaki ile aynı.","Eşik kotları ve bitmiş döşeme kotları belli."],
 adim:[["Kat kapıları",["Eşikler şakule ve bitmiş döşeme kotuna göre yerleştirilir.","Kasa ve paneller monte edilir; panel–panel, panel–kasa ve panel–eşik aralıkları ayarlanır.","Kilit ve kilit kontağı ayarlanır; kendiliğinden kapanma (ağırlık/yay) kontrol edilir.","Acil kilit açma anahtarı her katta denenir."]],
  ["Kabin kapısı",["Operatör ve kabin kapısı panelleri takılır; kabin kapısı kontağı ve kilidi (gerekiyorsa) ayarlanır.","Kapı koruyucu (ışık perdesi) takılır ve ayarlanır.","Kabin eşiği ile kat eşiği arası mesafe kontrol edilir."]],
  ["Kayıt",["Her katın ölçümleri FR-08.07'ye yazılır; bekleme noktası imzalanmadan ilk çalıştırmaya geçilmez."]]],
 kabul:[["Panel–panel / panel–kasa aralığı","≤ 6 mm","Sentil"],["Kilit kavrama derinliği","≥ 7 mm, kavramadan önce kontak kapanmaz","Ölçüm"],["Kabin eşiği – kat eşiği","≤ 35 mm","Ölçüm"],["Kapanma kuvveti","≤ 150 N","Kuvvet ölçer"],["Kendiliğinden kapanma","Her katta kapanır ve kilitlenir","Fonksiyon"]],kayit:["FR-08.07"],not:NOT_STD};

TPL["TL-08.08"]={t:"T",amac:"Kumanda panosu, sürücü, kuyu ve kabin kablolaması, topraklama ve güvenlik devresi bağlantılarının yapılması.",
 ekip:["Multimetre","Topraklama/süreklilik ölçer","Kablo pabuç sıkma pensesi","Etiketleme makinesi"],guv:["Bağlantılar enerjisiz devrede yapılır; LOTO uygulanır.","Sürücü kondansatörlerinin deşarj süresi beklenir.","Yalnızca yetkili elektrik personeli çalışır."].concat(GUV_KUYU.slice(1,3)),
 on:["Bina besleme hattı ve ana şalter hazır.","Elektrik şemaları ve güvenlik devresi şeması şantiyede."],
 adim:[["Pano ve sürücü",["Pano projedeki yere, erişim ve çalışma alanı bırakılarak monte edilir.","Ana besleme, motor, fren ve enkoder kabloları şemaya göre bağlanır."]],
  ["Kuyu ve kabin",["Kuyu kablo kanalları ve kat butonyerleri tesis edilir; askı kablosu kabin bağlantısına sabitlenir.","Kuyu aydınlatması (kabin üstü ve kuyu dibinde ≥ 50 lx) ve kuyu dibi prizi bağlanır.","Tüm güvenlik kontakları güvenlik devresine şemadaki sırayla bağlanır; köprü bırakılmaz."]],
  ["Topraklama ve etiket",["Tüm metal aksam (raylar, kapı kasaları, makine, pano, kabin) koruma iletkenine bağlanır.","Kablo uçları ve klemensler şemaya göre etiketlenir."]]],
 kabul:[["Koruma iletkeni sürekliliği","Tüm metal aksam bağlı","Süreklilik ölçer"],["Güvenlik devresi","Köprü yok, her kontak devrede","Kontrol + D3 deneyi"],["Kuyu aydınlatması","≥ 50 lx","Lüksmetre"],["Etiketleme","Şema ile birebir","Gözle"]],kayit:["FR-08.09"],not:NOT_STD};

TPL["TL-08.09"]={t:"T",amac:"2014/33/AB Ek III güvenlik aksamlarının (kilit, paraşüt, regülatör, tampon, UCMP, yukarı yön aşırı hız koruması, elektronik güvenlik elemanları) montaj ve ayarının üretici talimatına ve tip sertifikasına uygun yapılması.",
 ekip:["Üretici montaj ve ayar talimatları (bu talimatın eki)","Sentil, kumpas, tork anahtarı","Takometre"],guv:GUV_KUYU,
 on:["Her aksam için AB tip inceleme sertifikası ve AB uygunluk beyanı teknik dosyada.","Aksam tip/markası tip sertifikasındaki ile aynı; seri no FR-07.05'e işlenmiş."],
 adim:[["Genel kurallar",["Üretici mühürleri sökülmez; ayar gerektiren aksamda yalnızca üreticinin izin verdiği ayarlar yapılır.","Her aksamın etiketi (tip, sertifika no, CE + kuruluş no, ayar değerleri) montajdan sonra okunabilir kalır."]],
  ["Aksam bazında",["Kat kapısı kilidi: TL-08.07'ye göre kavrama ve kontak ayarı.","Paraşüt: kütle ve hız aralığının asansöre uygunluğu, ray–çene boşluğu (TL-08.04).","Regülatör: atma hızı etiketi, halat çapı, gergi (TL-08.03).","Tampon: eksen hizası, hidrolik tamponda yağ seviyesi ve geri dönüş kontağı.","UCMP: sertifikadaki fren + algılama + tetikleme kombinasyonu birebir kurulur; parametreler kumanda yazılımında üretici değerine ayarlanır.","Yukarı yön aşırı hız koruması: çalışma yönü ve tetikleme düzeni.","Elektronik güvenlik elemanları: yazılım sürümü sertifikadaki ile aynı."]]],
 kabul:[["Aksam tip ve seri no","FR-07.05 ve tip sertifikası ile aynı","Etiket"],["Mühürler","Sağlam","Gözle"],["Ayar değerleri","Üretici talimatı","Ölçüm"]],kayit:["FR-07.05","FR-08.05","FR-08.08"],not:NOT_STD};

TPL["TL-08.10"]={t:"T",amac:"Asansörün ilk kez enerjilendirilmesi, revizyon hızında çalıştırılması ve kumanda parametrelerinin ayarlanması.",
 ekip:["Multimetre, pens ampermetre","Kumanda servis cihazı/yazılımı","Lazer metre"],guv:["İlk enerjilendirmeden önce güvenlik devresinin köprüsüz olduğu kontrol edilir.","İlk hareketler revizyon kumandasıyla kabin üstünden yapılır; kuyuda başka kimse bulunmaz."],
 on:["FR-08.03 … FR-08.09 kapalı.","Fren elle açılıp kapanarak kontrol edilmiş."],
 adim:[["Enerjilendirme",["Faz sırası ve gerilimler ölçülür.","Sürücü motor parametreleri girilir; motor ayarı (autotune) üretici talimatına göre yapılır."]],
  ["Revizyon hızında çalıştırma",["Kabin revizyon hızında tüm kuyu boyunca hareket ettirilir; serbest geçiş kontrol edilir.","Kuyu bilgi sistemi (mıknatıs, enkoder, kat şalterleri) yerleştirilir ve öğretme sürüşü yapılır."]],
  ["Normal çalışma ayarları",["Hızlanma, yavaşlama ve durma eğrileri ayarlanır.","Kat seviyeleri boş ve dolu kabinde ayarlanır.","Kapı açma/kapama süreleri ve hızları ayarlanır.","Son parametre listesi yazdırılıp/kaydedilip teknik dosyaya eklenir."]]],
 kabul:[["Kat durma doğruluğu","±10 mm","Ölçüm"],["Seviyeleme","±20 mm","Ölçüm"],["Kapı hareketi","Sarsıntısız, takılmasız","Gözle"]],kayit:["FR-08.10"],not:NOT_STD};

TPL["TL-09.01"]={t:"T",amac:"Fren, traksiyon ve dengeleme deneylerinin TS EN 81-20/50'ye göre yapılması.",
 ekip:["Kalibre deney ağırlıkları (beyan yükünün en az %125'i)","Pens ampermetre","Durma mesafesi ölçümü için metre veya analiz cihazı","FR-09.01"],guv:["Deney sırasında kabin içinde kimse bulunmaz; kabin kumandası makine dairesi veya servis panelinden yapılır.","Kuyu dibine giriş yasaklanır.","Ağırlıklar kabin tabanına dengeli dağıtılır."],
 on:["Montaj tamamlanmış, FR-08.11 kapalı.","Fren ayarı üretici talimatına göre yapılmış."],
 adim:[["Fren deneyi",["Kabine beyan yükünün %125'i yerleştirilir.","Kabin beyan hızında aşağı yönde giderken ana besleme ve fren devresi kesilir.","Kabinin durduğu ve durma mesafesi kaydedilir.","Her fren kolu ayrı ayrı devreden çıkarılarak tek kolun yükü yavaşlattığı doğrulanır."]],
  ["Traksiyon deneyleri",["%125 yükle aşağı yönde en kötü durumda durdurma: halat kayması olmamalı.","Boş kabin yukarı yönde acil durdurma: kabin durur, kayma kontrol edilir.","Karşı ağırlık tampona oturmuşken makine yukarı yönde çalıştırıldığında boş kabin kaldırılamamalı (halat kaymalı) veya sürücü durdurmalı."]],
  ["Dengeleme",["Boş, %25, %50, %75 ve %100 yükte yukarı ve aşağı yönde akım ölçülür.","Akımların eşitlendiği yük oranı proje dengeleme oranıyla karşılaştırılır."]]],
 kabul:[["Fren – %125 yük","Kabin durur; her kol tek başına yavaşlatır","E1"],["Traksiyon – yüklü","Kayma yok","E2"],["Traksiyon – karşı ağırlık tamponda","Boş kabin kaldırılamaz","E2"],["Dengeleme","Proje oranı ±%5","E3"]],kayit:["FR-09.01"],not:NOT_STD};

TPL["TL-09.02"]={t:"T",amac:"Aşırı hız regülatörü atma hızının ölçülmesi ve kabin (ve varsa karşı ağırlık) paraşüt deneyinin yapılması.",
 ekip:["Takometre veya regülatör test cihazı","Deney ağırlıkları","Su terazisi / eğim ölçer","FR-09.01"],guv:["Deney sırasında kabin içinde ve kuyuda kimse bulunmaz.","Paraşüt kontağı köprülenerek yapılan deneyden sonra köprü mutlaka sökülür ve kontrol edilir.","Deney sonrası raylar kontrol edilmeden asansör normal çalışmaya alınmaz."],
 on:["Regülatör etiket hızı ve paraşüt kütle/hız aralığı asansöre uygun."],
 adim:[["Regülatör atma hızı",["Regülatör halatı kasnaktan çıkarılarak test cihazıyla veya kasnak hızı ölçülerek atma hızı belirlenir.","Elektriksel kontağın mekanik atmadan önce veya aynı anda açıldığı kontrol edilir.","Değer FR-09.01 F1'e yazılır."]],
  ["Kabin paraşüt deneyi",["Ani paraşütte kabine beyan yükü, kademeli paraşütte beyan yükünün %125'i konur.","Kabin revizyon hızında (ani) veya beyan/düşük hızda (kademeli, üretici talimatına göre) aşağı hareket ederken regülatör elle tetiklenir; paraşüt ve fren kontağı köprülenir.","Kabinin durduğu doğrulanır; kabin tabanı eğimi ölçülür.","Kabin yukarı çekilerek paraşüt çözülür; kontaklar eski haline getirilir."]],
  ["Karşı ağırlık paraşütü (varsa)",["Boş kabinle karşı ağırlık aşağı yönde hareket ederken tetiklenir ve durduğu doğrulanır."]],
  ["Deney sonrası",["Ray yüzeyindeki çene izleri eğelenir.","Paraşüt ve regülatör kontakları ile mühürler kontrol edilir."]]],
 kabul:[["Regülatör atma hızı","≥ beyan hızının %115'i ve etiket/sertifika üst sınırı içinde","F1"],["Kabin paraşütü","Kabin durur, taban eğimi ≤ %5","F2"],["Rayda kalıcı hasar","Yok","Gözle"],["Kontaklar","Mekanik tetiklemeden önce açılır","Fonksiyon"]],kayit:["FR-09.01"],not:NOT_STD};

TPL["TL-09.03"]={t:"T",compact:true,amac:"Kabin ve karşı ağırlık tamponlarının deneyi.",
 ekip:["Deney ağırlıkları","Metre","FR-09.01"],guv:["Deney sırasında kuyu dibinde kimse bulunmaz.","Son durak şalterleri köprülenerek yapılan deneyden sonra köprüler sökülür."],
 on:["Tampon ekseni ve yağ seviyesi (hidrolik) kontrol edilmiş."],
 adim:[["Enerji biriktiren tamponlar",["Beyan yüklü kabin revizyon hızında tampona oturtulur; kabin tampondan kaldırıldıktan sonra tamponda kalıcı deformasyon olmadığı kontrol edilir.","Karşı ağırlık tamponu boş kabinle (karşı ağırlık aşağıda) aynı şekilde denenir."]],
  ["Enerji sönümleyen (hidrolik) tamponlar",["Beyan yüklü kabin üretici talimatındaki hızda tampona oturtulur.","Tamponun tam sıkışma sonrası geri dönüş süresi ölçülür ve geri dönüş kontağının çalıştığı doğrulanır.","Yağ kaçağı kontrol edilir."]]],
 kabul:[["Kalıcı deformasyon","Yok","Gözle"],["Hidrolik tampon geri dönüşü","Üretici süresi içinde tam geri döner","Ölçüm"],["Geri dönüş kontağı","Tampon tam dönmeden hareket yok","Fonksiyon"]],kayit:["FR-09.01"],not:NOT_STD};

TPL["TL-09.04"]={t:"T",compact:true,amac:"Kabinin istem dışı hareketine karşı koruma (UCMP) sisteminin TS EN 81-20 5.6.7'ye göre deneyi.",
 ekip:["Metre veya analiz cihazı","Kumanda servis cihazı","FR-09.01"],guv:["Deney kabin boşken yapılır; kabinde ve kapı önünde kimse bulunmaz.","Simülasyon için kumanda yazılımının servis fonksiyonu kullanılır; harici köprüleme yalnızca üretici talimatının izin verdiği şekilde yapılır."],
 on:["UCMP bileşenleri tip sertifikasındaki kombinasyonla aynı."],
 adim:[["Hazırlık",["Kabin bir kat seviyesinde, kapılar açık konuma getirilir.","Üretici talimatına göre istem dışı hareket (fren açma veya sürücü komutu) simüle edilir."]],
  ["Deney",["Hareket algılandığında UCMP tertibatının devreye girdiği ve kabini durdurduğu doğrulanır.","Kat seviyesinden durma noktasına kadar mesafe ölçülür.","Deney yukarı ve aşağı yönde, boş ve (sertifika istiyorsa) yüklü kabinle tekrarlanır.","Sistem sıfırlanmadan asansörün normal çalışmaya dönmediği kontrol edilir."]]],
 kabul:[["Durma mesafesi","Kat seviyesinden ≤ 1,20 m; kabin eşiği–kat lentosu arası ≥ 1,00 m serbest yükseklik","Ölçüm"],["Algılama","Kapı bölgesi dışına çıkmadan devreye girer","Fonksiyon"],["Sıfırlama","Yetkili kişi sıfırlamadan çalışmaz","Fonksiyon"]],kayit:["FR-09.01"],not:NOT_STD};

TPL["TL-09.05"]={t:"T",amac:"Yalıtım direnci, koruma iletkeni sürekliliği ve güvenlik devresi kontaklarının deneyi.",
 ekip:["Yalıtım direnci ölçer (megger)","Düşük direnç / süreklilik ölçer","Multimetre","Güvenlik devresi kontak listesi"],guv:["Yalıtım ölçümünden önce elektronik kartlar ve sürücü devreden ayrılır.","Ölçüm sonrası devreler deşarj edilir.","LOTO uygulanır."],
 on:["Elektrik tesisatı tamamlanmış (FR-08.09)."],
 adim:[["Yalıtım direnci",["Güç, güvenlik, kumanda ve aydınlatma devreleri ayrı ayrı toprağa karşı ölçülür.","Değerler FR-09.01 D1'e yazılır."]],
  ["Süreklilik",["Ana topraklama barasından raylar, kapı kasaları, makine, pano ve kabine süreklilik ölçülür."]],
  ["Güvenlik devresi",["Kontak listesindeki her kontak (kat kapısı kilitleri, kabin kapısı, stoplar, paraşüt, regülatör, gergi, tampon, gevşek halat vb.) tek tek açtırılır.","Her açmada asansörün hareket etmediği veya durduğu doğrulanır.","Faz kaybı/faz sırası koruması ve kontaktör yapışma izlemesi denenir."]]],
 kabul:[["Yalıtım – SELV ≤ 50 V","250 V DC'de ≥ 0,5 MΩ","D1"],["Yalıtım – ≤ 500 V devreler","500 V DC'de ≥ 1 MΩ","D1"],["Süreklilik","Tüm metal aksam bağlı","D2"],["Güvenlik kontakları","Her biri hareketi keser","D3"],["Faz / kontaktör izleme","Hatada kalkış yok","D4"]],kayit:["FR-09.01"],not:NOT_STD};

TPL["TL-09.06"]={t:"T",compact:true,amac:"Beyan yükünün 1,25 katı ile statik deney (2014/33/AB Ek V 3(b)).",
 ekip:["Kalibre deney ağırlıkları (beyan yükü × 1,25)","Metre","FR-09.01"],guv:["Deney sırasında kabin içinde ve kuyuda kimse bulunmaz.","Ağırlıklar kabin tabanına dengeli dağıtılır."],
 on:["Fren ve traksiyon deneyleri uygun."],
 adim:[["Deney",["Kabin en alt kata getirilir.","Beyan yükünün 1,25 katı kabine yerleştirilir.","Asansör en az 10 dakika bu yükle bekletilir.","Halat/kayış kayması, fren kayması, kabin ve karkas deformasyonu, kapı ve eşiklerde hasar kontrol edilir.","Ağırlıklar alındıktan sonra kat seviyesi ve kalıcı deformasyon tekrar kontrol edilir."]]],
 kabul:[["Kabin konumu","Kayma yok (kat seviyesi korunur)","Ölçüm"],["Yapısal hasar","Yok","Gözle"],["Kalıcı deformasyon","Yok","Gözle / ölçüm"]],kayit:["FR-09.01"],not:NOT_STD};

TPL["TL-14.01"]={t:"T",amac:"Makine daireli asansörde enerji kesintisi veya arıza nedeniyle kabinde mahsur kalan kişilerin güvenle kurtarılması.",
 ekip:["Kat kapısı acil kilit açma anahtarı","Fren açma kolu ve el çarkı (makineye özel)","El feneri","Telsiz/telefon","KKD"],guv:["Kurtarma en az iki kişiyle yapılır.","Kabindeki kişilerle iletişim kurulur ve kurtarma bitene kadar sakin kalmaları, kapıyı zorlamamaları söylenir.","Kişiler kabinden yalnızca kabin kapı bölgesindeyken ve kabin eşiği ile kat eşiği arasındaki fark güvenli düzeydeyken çıkarılır."],
 on:["Kurtarmayı yapan personel bu asansör tipi için kurtarma eğitimi almış."],
 adim:[["Hazırlık",["Makine dairesinde ana şalter kapatılır ve kilitlenir.","Kabinin konumu kat göstergesinden veya halat işaretlerinden belirlenir.","Tüm kat kapılarının kapalı olduğu kontrol edilir."]],
  ["Kabini kata getirme",["Fren açma kolu kısa aralıklarla açılarak kabinin dengesine göre hareket etmesi sağlanır; gerekirse el çarkı kullanılır.","Kabin hızlanırsa fren hemen bırakılır.","Kabin en yakın katın kapı bölgesine (halat işaretiyle) getirilir ve fren bırakılır."]],
  ["Tahliye",["İlgili kat kapısı acil kilit açma anahtarıyla açılır; kabin kapısı elle açılır.","Kişiler kabin–kat seviyesi farkına dikkat edilerek çıkarılır.","Kapılar kapatılır, kilitlendiği kontrol edilir."]],
  ["Sonrası",["Arıza nedeni giderilmeden asansör hizmete alınmaz.","Kurtarma FR-14.02'e saatleriyle kaydedilir."]]],
 kabul:[["Kurtarma süresi","İhbardan itibaren hedef ≤ 60 dk","FR-14.02"],["Kapılar","Kurtarma sonrası kapalı ve kilitli","Fonksiyon"]],kayit:["FR-14.02"],not:"Bu talimat her asansörün makine dairesine, makineye özel fren açma ve el çarkı bilgileriyle birlikte asılır. Acil durumda 7/24 hat: {kurtarma}"};

TPL["TL-14.02"]={t:"T",amac:"Makine dairesiz (MRL) asansörde enerji kesintisi veya arıza nedeniyle kabinde mahsur kalan kişilerin güvenle kurtarılması.",
 ekip:["Kat kapısı acil kilit açma anahtarı","Acil kurtarma panosu anahtarı","El feneri","Telsiz/telefon","KKD"],guv:["Kurtarma en az iki kişiyle yapılır.","Kabindeki kişilerle iletişim kurulur.","Kuyuya girilmez; tüm işlemler acil kurtarma panosundan yapılır."],
 on:["Personel bu MRL asansör tipi için kurtarma eğitimi almış.","Acil kurtarma panosundaki akü/UPS durumu bakımda kontrol edilmiş."],
 adim:[["Hazırlık",["Acil kurtarma panosu (genellikle en üst kat kapı kasası veya ayrı dolap) açılır.","Ana şalter kapatılır; tüm kat kapılarının kapalı olduğu kontrol edilir."]],
  ["Kabini kata getirme",["Panodaki fren açma butonu kısa aralıklarla basılarak kabinin dengesine göre hareketi sağlanır; hız göstergesi izlenir.","Elektriksel kurtarma (UPS ile düşük hız sürüşü) varsa üretici talimatına göre kullanılır.","Panodaki kapı bölgesi göstergesi yandığında fren bırakılır."]],
  ["Tahliye",["İlgili kat kapısı acil kilit açma anahtarıyla açılır, kişiler çıkarılır.","Kapılar kapatılıp kilitlendiği kontrol edilir."]],
  ["Sonrası",["Arıza nedeni giderilmeden asansör hizmete alınmaz.","Kurtarma FR-14.02'e kaydedilir."]]],
 kabul:[["Kurtarma süresi","Hedef ≤ 60 dk","FR-14.02"],["Kapılar","Kapalı ve kilitli","Fonksiyon"]],kayit:["FR-14.02"],not:"Bu talimat acil kurtarma panosunun iç kapağına asılır. Acil durumda 7/24 hat: {kurtarma}"};

TPL["TL-16.01"]={t:"T",amac:"Montaj, revizyon, bakım ve deney işlerinde iş sağlığı ve güvenliği kurallarını tanımlamak.",
 ekip:["Baret, iş ayakkabısı, eldiven, koruyucu gözlük","Tam vücut kemeri ve ankraj","LOTO kilit ve etiketleri","İlk yardım çantası","Bariyer ve uyarı levhaları"],guv:["Güvensiz koşulda her çalışan işi durdurur ve şefe bildirir.","İşe başlamadan şantiyeye özel risk değerlendirmesi okunur ve imzalanır.","Alkol ve uyuşturucu etkisinde çalışılmaz."],
 on:["Personelin İSG eğitimi, yüksekte çalışma eğitimi ve sağlık raporu geçerli."],
 adim:[["Kuyuda çalışma",["Kuyuya girişte kuyu dibi stop butonu basılır, ana şalter kilitlenir.","Kabin üstünde revizyon kumandası kullanılır; kabin üstü korkuluk yoksa kemer ankrajlanır.","Kat kapısı açık bırakılan yere bariyer ve uyarı levhası konur."]],
  ["Elektrik",["Enerjili devrede çalışılmaz; LOTO uygulanır, gerilim yokluğu ölçülür.","Sürücü kondansatör deşarj süresi beklenir."]],
  ["Kaldırma ve taşıma",["Ağır malzemeler vinç, palanga veya en az iki kişiyle taşınır.","Kaldırma ekipmanının periyodik kontrolü geçerli olmalıdır."]],
  ["Deneyler",["Paraşüt, tampon, fren ve statik deneylerde kuyu ve kabin boşaltılır.","Köprülenen kontaklar deney sonunda sökülür ve kontrol edilir."]],
  ["Kaza ve olay",["İlk yardım uygulanır, 112 aranır, olay yeri korunur.","Genel Müdür bilgilendirilir, hizmet alınan OSGB'ye haber verilir; olay kaydı ve DÖF açılır."]],
  ["Çevre",["Sökülen metal, elektronik, akü ve yağ türlerine göre ayrılır ve lisanslı firmaya verilir."]]],
 kabul:[["KKD kullanımı","Tüm saha personelinde tam","Saha denetimi"],["LOTO","Her elektrik ve kuyu çalışmasında","Saha denetimi"]],kayit:["İSG saha denetim formu","Eğitim kayıtları (FR-04.03)"],not:""};
/* ---------- Şablon içerikleri: Formlar ---------- */
var CK=["No","Kontrol maddesi","Uygun","Uygun değil","Ölçülen / açıklama"],CKB=[2,3];
var PRJ=["Proje / seri no","Bina adı ve adresi","Tarih"];
function F(info,parts){return {t:"F",info:info,parts:parts};}

TPL["FR-04.01"]=F(["Yıl","Hazırlayan","Tarih"],[
 {opt:[["Girdiler", ["☐ Mevzuat / standart değişikliği", "☐ Tetkik bulguları", "☐ DÖF", "☐ Yeni ürün / ekipman", "☐ Belge geçerlilik sonu", "☐ Personel talebi", "☐ Diğer"]]]},
 {tbl:["Ad Soyad","Görev","Mevcut belge / eğitim","Geçerlilik sonu","İhtiyaç duyulan eğitim","Gerekçe","Öncelik (Y/O/D)"],n:12},
 {sig:["Hazırlayan (KYT)","Kontrol eden (Teknik Müdür)","Onaylayan (Genel Müdür)"]}]);

TPL["FR-04.02"]=F(["Yıl","Revizyon","Onay tarihi"],[
 {tbl:["No","Eğitim konusu","Katılımcılar","Eğitmen / kurum","Süre (saat)","Planlanan ay","Gerçekleşme tarihi","Durum"],rows:[["1","İSG temel eğitimi"],["2","Yüksekte çalışma"],["3","Elektrik güvenliği ve LOTO"],["4","Acil kurtarma (MR / MRL)"],["5","TS EN 81-20/50 son muayene ve deney"],["6","Kalite El Kitabı ve prosedürler"],["7","İç tetkikçi eğitimi"],["8","Mevzuat değişiklikleri bilgilendirmesi"]],n:6},
 {p:"Toplam planlanan saat: ………   Gerçekleşen saat: ………   Gerçekleşme oranı: ………%"},
 {sig:["Hazırlayan (KYT)","Onaylayan (Genel Müdür)"]}]);

TPL["FR-04.03"]=F(["Eğitim konusu","Tarih","Süre (saat)","Eğitmen / kurum","Yer"],[
 {h:"Katılımcılar"},{tbl:["No","Ad Soyad","Görev","İmza"],n:15},
 {h:"Eğitim içeriği"},{p:"………………………………………………………………………………………………………………"},
 {h:"Etkinlik değerlendirmesi (en geç 3 ay içinde)"},
 {opt:[["Etkinlik ölçme yöntemi", ["☐ Sınav", "☐ Gözetimli uygulama", "☐ İş sonuçlarının değerlendirilmesi", "☐ Diğer: ………"]]]},
 {tbl:["Ad Soyad","Sonuç / puan","Etkin mi? (E/H)","Etkin değilse yapılacak"],n:6},
 {sig:["Eğitmen","Değerlendiren","KYT"]}]);

TPL["FR-04.04"]=F(["Revizyon","Tarih"],[
 {p:"İşaretler: Y = yapar / imzalar, O = onaylar, K = kontrol eder, — = yetkisiz"},
 {tbl:["Ad Soyad","Görev","Montaj ara kontrol (FR-08)","Güvenlik aksamı giriş kontrolü","Son muayene ve deney (FR-09.01)","Son Muayene ve Deney Formu onayı","CE etiket onayı","AB UB imzası","Bakım / kurtarma","İç tetkik"],rows:[["{gm}","Genel Müdür"],["{tm}","Teknik Müdür"],["{kyt}","KYT"],["{smd}","Son Muayene ve Deney Sorumlusu"],["{sef}","Montaj Şantiye Şefi"],["{bakimSefi}","Bakım ve Revizyon Şefi"],["{satin}","Satın Alma ve Depo"]],n:6},
 {sig:["Hazırlayan (KYT)","Onaylayan (Teknik Müdür)"]}]);

TPL["FR-04.05"]=F(["Ad Soyad","Görev","İşe giriş tarihi","Sicil no"],[
 {chk:{cols:["No","Belge","Var","Yok","Geçerlilik / not"],box:[2,3],items:["Kimlik fotokopisi","Diploma","MYK mesleki yeterlilik belgesi","Sağlık raporu (işe giriş / periyodik)","Yüksekte çalışma uygunluk raporu","İSG eğitim sertifikası","Mesleki eğitim sertifikaları","Oryantasyon kaydı","Yetki matrisi kaydı","KKD zimmet tutanağı","Görev tanımı tebliğ imzası"]}},
 {sig:["Kontrol eden (İdari İşler)","Tarih"]}]);

TPL["FR-05.02"]=F(["Revizyon","Tarih"],[
 {p:"Bu liste el kitabı sayfasındaki \"Doküman listesi\" sekmesinden otomatik oluşturulur."},{doclist:true},
 {sig:["Hazırlayan (KYT)","Onaylayan (Genel Müdür)"]}]);

TPL["FR-05.03"]=F(["Son gözden geçirme tarihi","Gözden geçiren"],[
 {tbl:["Kod","Doküman adı","Sürüm / tarih","Kaynak","Son kontrol","Etkilenen dokümanlar"],rows:[
  ["DK-01","Asansör Yönetmeliği (2014/33/AB)","RG 29.06.2016 / 29757","Resmî Gazete (Sanayi ve Teknoloji Bakanlığı)","29.10.2026","Kalite El Kitabı; tüm prosedürler"],
  ["DK-02","Asansör İşletme ve Bakım Yönetmeliği","RG 06.04.2019 / 30737 (değişiklikleriyle)","Resmî Gazete","29.10.2026","Kalite El Kitabı Bölüm 14; PR-14.01; FR-14.01–14.05"],
  ["DK-03","Asansör Periyodik Kontrol Yönetmeliği","RG 04.05.2018 / 30411 (değişiklikleriyle)","Resmî Gazete","29.10.2026","PR-14.01; FR-14.01"],
  ["DK-04","Asansör Piyasa Gözetimi ve Denetimi Yönetmeliği","RG 11.03.2022 / 31775; değişiklik RG 12.08.2025 / 32984","Resmî Gazete","29.10.2026","Kalite El Kitabı Bölüm 11; PR-11.01"],
  ["DK-05","Asansörlerin Tasarımına İlişkin Usul ve Esaslara Dair Tebliğ (SGM-2017/18)","RG 14.06.2017 / 30096; değişiklik SGM-2023/1, RG 28.03.2023 / 32146","Resmî Gazete","29.10.2026","Kalite El Kitabı Bölüm 6; PR-06.01"],
  ["DK-06","TS EN 81-20 – İnsan ve insan-yük asansörleri, yapım ve montaj","EN 81-20:2020","TSE; AB uyumlaştırılmış standart, Karar (AB) 2021/76","29.10.2026","Kalite El Kitabı Bölüm 8–9; PR-08.01; PR-09.01; TL-08.01–08.10; FR-09.01"],
  ["DK-07","TS EN 81-50 – Tasarım kuralları, hesaplar, muayene ve deneyler","EN 81-50:2020","TSE; AB uyumlaştırılmış standart, Karar (AB) 2021/76","29.10.2026","PR-06.01; PR-09.01; TL-09.01–09.06"],
  ["DK-08","TS EN 81-21 – Mevcut binalarda yeni asansörler","EN 81-21:2022","TSE; AB uyumlaştırılmış standart, Karar (AB) 2023/1646","29.10.2026","PR-06.01; FR-06.01"],
  ["DK-09","TS EN 81-28 – Uzaktan alarm","EN 81-28:2022","TSE; AB uyumlaştırılmış standart, Karar (AB) 2023/1646","29.10.2026","FR-09.01; FR-14.01"],
  ["DK-10","TS EN 81-70 – Erişilebilirlik","EN 81-70:2021+A1:2022","TSE; AB uyumlaştırılmış standart, Karar (AB) 2023/1646","29.10.2026","PR-06.01; FR-06.01"],
  ["DK-11","TS EN 81-58 – Kat kapıları yangın dayanımı deneyi","EN 81-58:2022","TSE; AB uyumlaştırılmış standart, Karar (AB) 2023/1646","29.10.2026","PR-07.01; FR-07.03"],
  ["DK-12","TS EN 81-73 – Yangın durumunda asansör davranışı","EN 81-73:2020","TSE; AB uyumlaştırılmış standart, Karar (AB) 2021/1220","29.10.2026","PR-06.01"],
  ["DK-13","TS EN 81-77 – Depreme maruz asansörler","EN 81-77:2022","TSE; AB uyumlaştırılmış standart, Karar (AB) 2023/1646","29.10.2026","PR-06.01; FR-06.01"],
  ["DK-14","TS EN 81-80 – Mevcut asansörlerin güvenliğinin iyileştirilmesi","EN 81-80:2019","TSE (uyumlaştırılmış standart değildir)","29.10.2026","PR-13.01; FR-13.02"],
  ["DK-15","TS EN 13015 – Bakım talimatları","EN 13015:2001+A1:2008","TSE; AB uyumlaştırılmış standart (AB RG C 138, 2016)","29.10.2026","PR-14.01; FR-14.01–14.04"],
  ["DK-16","TS EN 12015 / TS EN 12016 – Elektromanyetik uyumluluk","EN 12015:2020; EN 12016:2013","TSE; EN 12016 Asansör Direktifi uyumlaştırılmış listesinde","29.10.2026","PR-07.01"],
  ["DK-17","6331 sayılı İş Sağlığı ve Güvenliği Kanunu","RG 30.06.2012 / 28339 (değişiklikleriyle)","Resmî Gazete","29.10.2026","Kalite El Kitabı Bölüm 16; TL-16.01"],
  ["DK-18","AB tip inceleme sertifikası {tipSertNo}","Geçerlilik: {tipSertTarih}","{tipKurulus}","29.10.2026","Kalite El Kitabı Bölüm 6; PR-06.01; FR-06.01"],
  ["DK-19","Güvenlik aksamı üretici talimatları","Her aksam için güncel revizyon","Üretici / tedarikçi","29.10.2026","TL-08.09; PR-07.01; FR-07.05"]],n:2},
 {p:"Sürümler, AB Komisyonu'nun Asansör Direktifi uyumlaştırılmış standart listesi ve Resmî Gazete kayıtlarına göre 29.10.2026 tarihinde kontrol edilmiştir. Liste yılda en az bir kez ve AB Resmî Gazetesi'nde yeni atıf yayımlandığında güncellenir."},
 {sig:["Hazırlayan (KYT)"]}]);

TPL["FR-06.01"]=F(["Proje / seri no","Müşteri / bina","Tarih","Tip sertifikası no"],[
 {p:"Sertifikadaki varyant kapsamı: {modelKapsam}"},
 {tbl:["Parametre","Sertifikadaki aralık","Proje değeri","Uygun (E/H)"],rows:[["Beyan yükü (kg) / kişi sayısı"],["Beyan hızı (m/s)"],["Hareket mesafesi (m) / durak sayısı"],["Askı oranı, halat/kayış tipi ve sayısı"],["Tahrik makinesi tipi ve yeri (MR / MRL)"],["Kabin ölçüsü (G × D × Y) / kabin ağırlığı"],["Kapı tipi ve ölçüsü"],["Kuyu ölçüsü"],["Kuyu dibi derinliği / kuyu üstü yüksekliği"],["Azaltılmış boşluk uygulaması"],["Kat kapısı kilidi (marka/tip)"],["Paraşüt (marka/tip)"],["Regülatör (marka/tip)"],["Tamponlar (marka/tip)"],["UCMP aksamı"],["Yukarı yön aşırı hız koruması"],["Kumanda kartı / PESSRAL"],["Deprem kategorisi (EN 81-77)"]]},
 {opt:[["Karar", ["☐ Tüm parametreler aralıkta – Modül E ile devam", "☐ Proje aralığa çekilecek", "☐ Tip sertifikası revizyonu başvurusu", "☐ Modül G ile değerlendirme"]]]},
 {p:"Gerekçe / açıklama: ……………………………………………………………………………"},
 {sig:["Teknik Müdür"]}]);

TPL["FR-06.03"]=F(["Değişiklik no","Proje / seri no","Talep eden","Tarih"],[
 {kv:["Değişikliğin tanımı","Nedeni","Etkilenen çizim / hesap","Etkilenen güvenlik aksamı"]},
 {opt:[["Tip sertifikası kapsamında mı?", ["☐ Evet", "☐ Hayır"]], ["Hesap revizyonu gerekli mi?", ["☐ Evet", "☐ Hayır"]], ["Müşteri bilgilendirmesi gerekli mi?", ["☐ Evet", "☐ Hayır"]], ["Karar", ["☐ Onaylandı", "☐ Reddedildi", "☐ Koşullu onay: ……………………"]]]},
 {sig:["Talep eden","Teknik Müdür"]}]);

TPL["FR-07.01"]=F(["Tedarikçi","Adres","İlgili kişi / telefon","Tedarik konusu",["Tür","☐ Güvenlik aksamı    ☐ Diğer kritik malzeme    ☐ Genel malzeme    ☐ Hizmet"],"Değerlendirme tarihi"],[
 {tbl:["Kriter","Ağırlık (puan)","Verilen puan","Kanıt / açıklama"],rows:[["AB tip inceleme sertifikası ve Modül E/H/C2 belgesi (güvenlik aksamında zorunlu)","25"],["CE işareti ve AB uygunluk beyanı","15"],["ISO 9001 belgesi","10"],["Ürün kalitesi / geçmiş uygunsuzluklar","20"],["Teslim süresine uyum","15"],["Teknik destek ve doküman","10"],["Fiyat ve ödeme koşulları","5"],["TOPLAM","100"]]},
 {opt:[["Sonuç", ["☐ Onaylı (≥ 70)", "☐ Şartlı onaylı (50–69, DÖF no: ……)", "☐ Onaysız (< 50)"]]]},
 {sig:["Değerlendiren (Satın Alma)","Kontrol (KYT)","Onay (Genel Müdür)"]}]);

TPL["FR-07.02"]=F(["Revizyon","Tarih"],[
 {tbl:["No","Firma adı","İletişim bilgileri (yetkili, telefon, e-posta)","Alınan ürün / hizmet","Onay durumu"],n:15,w:[5,24,36,23,12]},
 {p:"Onay durumu: Onaylı veya Şartlı onaylı. Değerlendirme ayrıntıları Tedarikçi Değerlendirme Formu'nda (FR-07.01) tutulur."},
 {sig:["Hazırlayan (Satın Alma)","Onaylayan (Genel Müdür)"]}]);

TPL["FR-07.03"]=F(["Proje / seri no","Müşteri / bina","Hazırlayan","Tarih"],[
 {tbl:["No","Malzeme","Marka / tip","Miktar"],w:[6,44,34,16],rows:[["1","Tahrik makinesi"],["2","Kumanda panosu ve sürücü"],["3","Kabin rayları"],["4","Karşı ağırlık rayları"],["5","Halat / kayış"],["6","Kabin ve karkas"],["7","Karşı ağırlık ve dolgu"],["8","Kat kapıları ve kilitleri"],["9","Kabin kapısı ve operatör"],["10","Paraşüt"],["11","Aşırı hız regülatörü"],["12","Tamponlar"],["13","UCMP aksamı"],["14","Kuyu kabloları ve askı kablosu"],["15","Kat ve kabin butonyerleri"],["16","Alarm / iki yönlü iletişim cihazı"]],n:4},
 {sig:["Hazırlayan","Onaylayan (Teknik Müdür)"]}]);

TPL["FR-07.04"]=F(["Tedarikçi","İrsaliye no / tarihi","Proje / seri no"],[
 {tbl:["Malzeme / aksam","Miktar","Hasarsız","Etiket ve seri no uygun","Belgeler tam","Kabul","Red"],n:12,box:[2,3,4,5,6],w:[31,10,11,15,12,10,11]},
 {p:"Belgeler tam: güvenlik aksamında AB tip inceleme sertifikası ve AB uygunluk beyanı teslim edilmiş, tip sertifikasındaki marka/tip ile aynı."},
 {opt:[["Red edilen malzeme için uygunsuzluk formu (FR-11.01) no",["……………"]],["Karantina etiketi takıldı",["☐ Evet","☐ Hayır"]]]},
 {sig:["Kontrol eden (Depo)","Güvenlik aksamı onayı (Teknik Müdür)"]}]);

TPL["FR-07.05"]=F(["Proje / seri no","Bina adresi","Piyasaya arz tarihi"],[
 {tbl:["Aksam","Marka / tip","Seri no","AB tip inceleme sertifika no","Sertifika geçerlilik tarihi","Onaylanmış kuruluş no"],w:[26,16,14,19,13,12],rows:[["Kat kapısı kilitleri (her kat)"],["Kabin kapısı kilidi (varsa)"],["Kabin paraşütü"],["Karşı ağırlık paraşütü (varsa)"],["Aşırı hız regülatörü"],["Kabin tamponu"],["Karşı ağırlık tamponu"],["UCMP aksamı"],["Yukarı yön aşırı hız koruması"],["Güvenlik devresi elektronik elemanı / PESSRAL"]],n:4},
 {sig:["Hazırlayan","Kontrol (Teknik Müdür)"]}]);

TPL["FR-08.01"]=F(PRJ,[
 {tbl:["Durak / kat","Kuyu genişliği (mm)","Kuyu derinliği (mm)","Kat yüksekliği (mm)","Kapı boşluğu G × Y (mm)","Eşik kotu","Not"],rows:[["1"],["2"],["3"],["4"],["5"],["6"],["7"],["8"],["9"],["10"]],w:[11,14,14,14,17,12,18]},
 {chk:{cols:CK,box:CKB,items:["Kuyu dibi derinliği projeye uygun (… mm)","Kuyu üstü yüksekliği projeye uygun (… mm)","Kuyu şakulden sapma kabul sınırında","Kuyu kuru, temiz, su sızıntısı yok","Kuyu dibine güvenli erişim var","Makine dairesi / makine yeri ölçü ve erişimi uygun","Makine dairesi havalandırma ve aydınlatma","Bina besleme hattı ve ana şalter yeri hazır","Kapı boşluklarında koruma bariyeri var","Kuyuda ilgisiz tesisat yok"]}},
 {opt:[["Sonuç", ["☐ Kuyu montaja uygun (bekleme noktası kapandı)", "☐ Uygun değil – müşteriye yazılı bildirildi (tarih: ……)"]]]},
 {sig:["Şantiye Şefi","Teknik Müdür"]}]);

TPL["FR-08.02"]=F(PRJ.concat(["İrsaliye no"]),[
 {tbl:["Malzeme","Miktar","Listeyle uyumlu","Hasarsız","Seri no doğrulandı","Not"],box:[2,3,4],w:[31,10,13,11,14,21],rows:[["Tahrik makinesi"],["Kumanda panosu ve sürücü"],["Kabin rayları"],["Karşı ağırlık rayları"],["Halat / kayış"],["Kabin ve karkas"],["Karşı ağırlık ve dolgu"],["Kat kapıları ve kilitleri"],["Kabin kapısı ve operatör"],["Paraşüt"],["Aşırı hız regülatörü"],["Tamponlar"],["UCMP aksamı"],["Kuyu kabloları ve askı kablosu"],["Kat ve kabin butonyerleri"],["Alarm / iki yönlü iletişim cihazı"]],n:2},
 {opt:[["Sevkiyat eksiksiz ve hasarsız teslim alındı",["☐ Evet","☐ Hayır – eksik / hasarlı malzeme için FR-11.01 no: ……"]]]},
 {sig:["Teslim alan (Şantiye Şefi)","Depo"]}]);

TPL["FR-08.03"]=F(PRJ,[
 {opt:[["Proje değerleri",["DBG kabin: ……… mm","DBG karşı ağırlık: ……… mm","Konsol aralığı: ……… mm"]]]},
 {tbl:["Konsol / kot","DBG kabin (mm)","DBG k.a. (mm)","Sapma sol (mm)","Sapma sağ (mm)","Ek kademesi","Tork kontrol"],n:12},
 {chk:{cols:CK,box:CKB,items:["Raylar erkek diş yukarı","Tüm ek lamaları ve cıvatalar takılı","Ray klipsleri nihai torkta","Ray alt ucu tabana oturuyor","Raylarda boya / pas / hasar yok"]}},
 {opt:[["Sonuç", ["☐ Uygun – bekleme noktası kapandı", "☐ Uygun değil"]]]},
 {sig:["Şantiye Şefi","Kontrol eden"]}]);

TPL["FR-08.04"]=F(PRJ,[
 {chk:{cols:CK,box:CKB,items:["# Makine","Makine tip ve seri no projeyle aynı","Şase terazisi (≤ 1 mm/m)","Titreşim takozları üretici talimatına göre","Kasnak – halat inişi şakulle hizalı","Bağlantı torkları","Fren elle açma kolu / el çarkı mevcut","# Saptırma makarası","Makara ekseni kasnağa paralel","Makara koruması takılı","# Regülatör","Regülatör tip, etiket hızı ve mühür kontrolü","Regülatör halatı tetik koluna düşey","Gergi makarası serbest, gergi kontağı ayarlı","Regülatör koruma kapağı takılı"]}},
 {sig:["Şantiye Şefi"]}]);

TPL["FR-08.05"]=F(PRJ,[
 {chk:{cols:CK,box:CKB,items:["# Kabin ve karkas","Karkas gönyesi (köşegen farkı ≤ 2 mm)","Kılavuz pabuçları takılı ve ayarlı","Kabin üstü korkuluk / stop / revizyon kutusu","Kabin içi donanım ve aydınlatma","# Paraşüt","Paraşüt tip ve seri no (… )","Ray – çene boşlukları eşit (sol … / sağ … mm)","Tetik mekanizması senkron","Paraşüt kontağı ayarlı","# Karşı ağırlık","Hesaplanan kütle (… kg) ve dolgu adedi","Dolgu sabitleme laması takılı","Karşı ağırlık paraşütü (varsa)","Karşı ağırlık – tampon mesafesi (… mm)"]}},
 {sig:["Şantiye Şefi"]}]);

TPL["FR-08.06"]=F(PRJ,[
 {opt:[["Halat / kayış bilgileri",["Tipi: ………","Çap: ……… mm","Adet: ………","Askı oranı: ………"]]]},
 {chk:{cols:CK,box:CKB,items:["Halat boyları uygun (kabin en üstte – k.a. tampon mesafesinde)","Halat gerginlikleri eşit (ortalamadan sapma ≤ %10)","Soketler / halat kilitleri ve emniyet pimleri takılı","Gevşek halat kontağı ayarlı","Halat yüzeyinde hasar / burulma yok","Kasnak kanallarına doğru oturuyor"]}},
 {sig:["Şantiye Şefi"]}]);

TPL["FR-08.07"]=F(PRJ,[
 {tbl:["Kat","Panel–panel (mm)","Panel–kasa (mm)","Panel–eşik (mm)","Kilit kavrama (mm)","Kontak kavramadan önce açık","Kendiliğinden kapanma","Acil açma anahtarı","Eşik farkı (mm)"],n:12},
 {chk:{cols:CK,box:CKB,items:["Kilit tipi tip sertifikasıyla aynı","Kabin kapısı kontağı ayarlı","Kapı koruyucu (ışık perdesi) çalışıyor","Kabin eşiği – kat eşiği ≤ 35 mm","Kapanma kuvveti ≤ 150 N"]}},
 {opt:[["Sonuç", ["☐ Uygun – bekleme noktası kapandı", "☐ Uygun değil"]]]},
 {sig:["Şantiye Şefi","Kontrol eden"]}]);

TPL["FR-08.08"]=F(PRJ,[
 {chk:{cols:CK,box:CKB,items:["Kabin tamponu tip / seri no ve eksen hizası","Karşı ağırlık tamponu tip / seri no ve eksen hizası","Hidrolik tamponda yağ seviyesi ve geri dönüş kontağı","Tampon tabanı sağlam","Kuyu dibi stop butonu","Kuyu dibi prizi ve aydınlatma anahtarı","Kuyu dibi merdiveni","Kuyu dibi sığınma alanı","Regülatör gergi makarası","Kuyu dibi temiz ve kuru","Kuyu bölmesi (çoklu asansörde)"]}},
 {sig:["Şantiye Şefi"]}]);

TPL["FR-08.09"]=F(PRJ,[
 {chk:{cols:CK,box:CKB,items:["Pano yeri, erişim ve çalışma alanı","Ana besleme bağlantısı ve kesit","Motor, fren, enkoder bağlantıları şemaya uygun","Kuyu kablo kanalları ve sabitleme","Askı kablosu bağlantısı","Kuyu aydınlatması (kabin üstü … lx, kuyu dibi … lx)","Güvenlik devresi şemaya uygun, köprü yok","Koruma iletkeni tüm metal aksama bağlı","Kablo ve klemens etiketleri","Acil aydınlatma ve alarm beslemesi"]}},
 {sig:["Elektrik sorumlusu","Şantiye Şefi"]}]);

TPL["FR-08.10"]=F(PRJ,[
 {opt:[["Besleme gerilimi", ["L1-L2: …… V", "L2-L3: …… V", "L1-L3: …… V"]], ["Faz sırası", ["☐ Doğru", "☐ Hatalı"]], ["Motor ayarı (autotune)", ["☐ Yapıldı", "☐ Yapılmadı"]]]},
 {tbl:["Kat","Durma – boş, yukarı (mm)","Durma – boş, aşağı (mm)","Durma – dolu, yukarı (mm)","Durma – dolu, aşağı (mm)","Kapı açma/kapama süresi (s)"],n:12},
 {chk:{cols:CK,box:CKB,items:["Revizyon hızında tüm kuyu boyunca serbest geçiş","Kuyu bilgi sistemi öğretme sürüşü","Hızlanma / yavaşlama konforu","Parametre listesi kaydedildi ve teknik dosyaya eklendi"]}},
 {sig:["Şantiye Şefi"]}]);

TPL["FR-08.11"]=F(PRJ,[
 {chk:{cols:["No","Form","Tamamlandı","Devam ediyor","Not"],box:[2,3],items:["FR-08.01 Kuyu teslim alma","FR-08.02 Sevkiyat","FR-08.03 Ray montajı","FR-08.04 Makine ve regülatör","FR-08.05 Kabin, paraşüt, karşı ağırlık","FR-08.06 Halat / kayış","FR-08.07 Kapılar","FR-08.08 Tampon ve kuyu dibi","FR-08.09 Elektrik","FR-08.10 İlk çalıştırma","Proje değişiklikleri (FR-06.03) onaylı","Kuyu ve makine yeri temizlendi"]}},
 {p:"Asansör son muayene ve deneylere hazırdır. Önerilen deney tarihi: ……………"},
 {sig:["Şantiye Şefi","Teslim alan (Son Muayene ve Deney Sorumlusu)","Teknik Müdür"]}]);

var SM_COLS=["No","Kontrol / deney","Kabul kriteri","Ölçülen değer","Cihaz no","U","UD","UY"],SM_BOX=[5,6,7];
TPL["FR-09.01"]=F(["Proje / seri no","Bina adı ve adresi","Beyan yükü (kg) / kişi","Beyan hızı (m/s)","Durak sayısı / hareket mesafesi","Tip sertifikası no","Deney tarihi","Deneyi yapan"],[
 {p:"U: Uygun · UD: Uygun değil · UY: Uygulanamaz (gerekçe açıklamaya yazılır). Ölçülen değerler sayıyla yazılır; \"OK\" kabul edilmez."},
 {chk:{cols:SM_COLS,box:SM_BOX,w:[5,34,25,12,8,5,5,6],items:[
  "# A · Doküman ve projeye uygunluk",["A1","Teknik dosya – asansör uyumu","Proje ve tip sertifikasıyla aynı"],["A2","Güvenlik aksamı tip / seri no","FR-07.05 ile birebir"],["A3","Etiket, uyarı ve talimat levhaları","EN 81-20"],
  "# B · Kuyu ve makine yeri",["B1","Kuyu dibi / üstü sığınma alanları ve mesafeler","EN 81-20 5.2.5"],["B2","Kuyu aydınlatması","≥ 50 lx"],["B3","Kuyu dibi stop, priz, merdiven","EN 81-20 5.2.1"],["B4","Makine yeri erişimi, aydınlatma, çalışma alanları","EN 81-20 5.2.6"],
  "# C · Kapılar ve kilitler",["C1","Kapı aralıkları (FR-08.07)","≤ 6 mm"],["C2","Kilit kavraması ve kontak (her kat)","≥ 7 mm"],["C3","Kapanma kuvveti","≤ 150 N"],["C4","Kapı koruyucu","Engelde yeniden açılır"],["C5","Acil kilit açma ve kendiliğinden kapanma","Her katta"],
  "# D · Elektrik",["D1","Yalıtım direnci","≤ 500 V devrede ≥ 1 MΩ"],["D2","Koruma iletkeni sürekliliği","Tüm aksam bağlı"],["D3","Güvenlik devresi kontakları tek tek","Her biri hareketi keser"],["D4","Faz koruması, kontaktör izleme","Hatada kalkış yok"],
  "# E · Tahrik, fren, traksiyon",["E1","Fren – %125 yük, beyan hızı, aşağı","Durur; her kol tek başına"],["E2","Traksiyon deneyleri","Koşullar sağlanır"],["E3","Dengeleme (akım ölçümü)","Proje oranı"],
  "# F · Güvenlik aksamları",["F1","Regülatör atma hızı","≥ %115 Vn, sertifika sınırında"],["F2","Kabin paraşüt deneyi","Durur, eğim ≤ %5"],["F3","Karşı ağırlık paraşütü","Durur"],["F4","Tampon deneyi","Kalıcı deformasyon yok"],["F5","UCMP","EN 81-20 5.6.7"],["F6","Yukarı yön aşırı hız koruması","Devreye girer"],
  "# G · Fonksiyon",["G1","Tüm katlara çağrı (boş / dolu)","Karşılanır"],["G2","Durma / seviyeleme","±10 / ±20 mm"],["G3","Son durak şalterleri","Tampondan önce durdurur"],["G4","Revizyon kumandası, kabin üstü stop","EN 81-20"],["G5","Acil kurtarma","Kabin kata alınır"],["G6","Enerji kesintisinde güvenlik tertibatları","Fren tutar"],["G7","Acil aydınlatma","≥ 5 lx, 1 saat"],["G8","Uzaktan alarm ve iki yönlü iletişim","EN 81-28, {kurtarma}"],["G9","Aşırı yük tertibatı","%110'u aşmadan engeller"],
  "# H · Statik deney",["H1","1,25 × beyan yükü","Kayma / hasar yok"]]}},
 {h:"Uygunsuzluklar"},{tbl:["Kalem","Uygunsuzluk","FR-11.01 no","Düzeltme tarihi","Tekrar deney sonucu"],n:3,w:[9,41,14,16,20]},
 {opt:[["Sonuç", ["☐ Tüm kalemler uygun", "☐ Uygunsuzluk var – asansör piyasaya arz edilemez"]], ["PİYASAYA ARZA UYGUNDUR", ["☐ Evet", "Tarih: ……………"]]]},
 {sig:["Son Muayene ve Deney Sorumlusu","Teknik Müdür (onay)"]}]);

TPL["FR-09.03"]=F(["Yıl","Gönderim tarihi","Gönderilen kuruluş: {meKurulus}"],[
 {tbl:["Proje / seri no","Bina adresi (il/ilçe)","Durum (montaj / son muayeneye hazır)","Planlanan son muayene tarihi","Kontrol tarihi","Kontrol yapan","Uygunluk Beyanı tarihi"],n:12,w:[13,19,17,14,12,13,12]},
 {sig:["Hazırlayan (KYT)"]}]);

TPL["FR-10.01"]=F(["Revizyon","Tarih"],[
 {tbl:["Ekipman no","Ekipman adı","Seri no","Kalibrasyon tarihi","Kalibrasyon firması","Sonraki kalibrasyon"],w:[10,23,21,13,19,14],rows:[["EK-01","Yalıtım direnci ölçer"],["EK-02","Süreklilik / topraklama ölçer"],["EK-03","Multimetre"],["EK-04","Pens ampermetre"],["EK-05","Takometre / regülatör test cihazı"],["EK-06","Kapı kuvvet ölçer"],["EK-07","Lüksmetre"],["EK-08","Lazer metre"],["EK-09","Şerit metre"],["EK-10","Kumpas"],["EK-11","Sentil takımı"],["EK-12","Lazer şakul"],["EK-13","Su terazisi"],["EK-14","Deney ağırlıkları"]],n:2},
 {sig:["Hazırlayan (KYT)"]}]);

TPL["FR-11.01"]=F([],[
 {form:[["Uygunsuzluk / DÖF no",""],["Tarih",""],["Tespit eden",""],["Proje / seri no",""],
  ["Kaynak",["☐ Giriş kontrolü","☐ Montaj ara kontrolü","☐ Son muayene","☐ Onaylanmış kuruluş","☐ Periyodik kontrol","☐ Bakanlık","☐ Bakım","☐ Şikayet","☐ İç tetkik","☐ Kaza / olay"]],
  ["Sınıf",["☐ Kritik","☐ Majör","☐ Minör"]]]},
 {form:[["Uygunsuzluğun tanımı","tall"],["Anında yapılan düzeltme","tall"],
  ["Uygunsuz ürün kararı",["☐ Yeniden işleme","☐ İade","☐ Hurda","☐ Asansör kullanıma kapatıldı","☐ Uygulanmaz"]]]},
 {h:"Düzeltici / önleyici faaliyet"},
 {form:[["DÖF gerekli mi?",["☐ Evet","☐ Hayır"]],["Kök neden","tall"],["Faaliyet, sorumlu ve termin","tall"],["Benzer projelerde aynı risk var mı?",["☐ Evet","☐ Hayır"]],
  ["Etkinlik doğrulaması","tall"],["Sonuç",["☐ Etkin – kapatıldı","☐ Etkin değil – yeni DÖF no: ………"]]]},
 {sig:["Tespit eden","Faaliyet sorumlusu","KYT (kapanış)"]}]);

TPL["FR-11.03"]=F(["Şikayet no","Tarih / saat","Alan personel",["Kanal","☐ Telefon    ☐ E-posta    ☐ Web sitesi    ☐ Yazılı (dilekçe)    ☐ Bakım personeli aracılığıyla    ☐ Diğer"]],[
 {kv:["Şikayet eden (ad, telefon)","Bina / asansör seri no","Şikayetin konusu"]},
 {opt:[["Sınıf", ["☐ Güvenlik", "☐ Arıza tekrarı", "☐ Hizmet kalitesi", "☐ Ticari", "☐ Diğer"]], ["Güvenlikle ilgili ise aynı gün sahaya gidildi", ["☐ Evet", "☐ Hayır"]]]},
 {kv:["İnceleme sonucu","Yapılan işlem"]},
 {tbl:["Adım","Tarih","Yapan"],rows:[["İlk yanıt (≤ 3 iş günü)"],["Sonuç bildirimi (≤ 15 iş günü)"]]},
 {opt:[["Şikayet haklı mı?", ["☐ Evet", "☐ Hayır"]], ["DÖF açıldı mı?", ["☐ Evet (no: ……)", "☐ Hayır"]]]},
 {sig:["İnceleyen","KYT"]}]);

TPL["FR-11.04"]=F(["Müşteri / bina","Asansör seri no","Teslim tarihi","Anket tarihi",["Anketi dolduran (ad soyad / görev)","",1]],[
 {p:"Sayın müşterimiz, asansörünüzün teklif, montaj ve teslim süreçlerindeki hizmetimizi değerlendirmeniz bizim için önemlidir. Her konu için uygun kutuyu işaretleyiniz."},
 {chk:{cols:["No","Değerlendirme konusu","Çok iyi (5)","İyi (4)","Orta (3)","Kötü (2)","Çok kötü (1)"],box:[2,3,4,5,6],w:[5,50,9,9,9,9,9],items:["# Teklif ve sözleşme","Teklifin açıklığı ve anlaşılırlığı","Fiyat / performans dengesi","Sözleşme sürecinde bilgilendirme","# Proje ve montaj","Projenin binanıza ve ihtiyaçlarınıza uygunluğu","Montajın iş programına (teslim süresine) uygun yürütülmesi","Montaj ekibinin davranışı ve iletişimi","Şantiye düzeni, temizlik ve iş güvenliği önlemleri","Montaj süresince bilgilendirme","# Ürün ve teslim","Asansörün sürüş konforu ve sessizliği","Kabin, kapı ve butonların işçiliği ve görünümü","Teslimde kullanım ve acil durum bilgilendirmesi","Teslim edilen belgelerin eksiksizliği","Genel memnuniyetiniz"]}},
 {form:[["Firmamızı başkalarına tavsiye eder misiniz?",["☐ Evet","☐ Hayır","☐ Kararsızım"]],["Görüş ve önerileriniz","tall"],["# Firma tarafından doldurulur"],["Ortalama puan (5 üzerinden)",""],["3 ve altı puan alan konular için şikayet (FR-11.03) / DÖF (FR-11.01) no",""],["Değerlendiren (KYT) / tarih",""]]}]);
TPL["FR-11.04"].info2=true;
TPL["FR-11.05"]=F(["Müşteri / bina","Asansör seri / tescil no","Anket dönemi","Anket tarihi",["Alınan hizmet",["☐ Periyodik bakım","☐ Arıza / kurtarma","☐ Modernizasyon (revizyon)"],1],["Anketi dolduran (ad soyad / görev)","",1]],[
 {p:"Sayın müşterimiz, teknik servis hizmetlerimizi değerlendirmeniz bizim için önemlidir. Almadığınız hizmete ait bölümü boş bırakınız."},
 {chk:{cols:["No","Değerlendirme konusu","Çok iyi (5)","İyi (4)","Orta (3)","Kötü (2)","Çok kötü (1)"],box:[2,3,4,5,6],w:[5,50,9,9,9,9,9],items:["# Periyodik bakım","Bakımların planlanan periyotta yapılması","Teknisyenin bilgi ve yetkinliği","Bakım sonrası bilgilendirme ve bakım formunun imzalatılması","Teknisyenin davranışı ve çalışma alanının temiz bırakılması","# Arıza ve kurtarma","7/24 arıza ve kurtarma hattına ulaşılabilirlik","Arızaya / mahsur kalmaya müdahale süresi","Arızanın ilk müdahalede giderilmesi","Tekrarlayan arıza sıklığı","# Modernizasyon (revizyon)","Teklif ve iş kapsamının açıklığı","İşin söz verilen sürede tamamlanması","Modernizasyon sonrası asansörün performansı ve güvenliği","# Genel","Fiyat / hizmet dengesi","Talep ve şikayetlere dönüş hızı","Genel memnuniyetiniz"]}},
 {form:[["Firmamızı başkalarına tavsiye eder misiniz?",["☐ Evet","☐ Hayır","☐ Kararsızım"]],["Görüş ve önerileriniz","tall"],["# Firma tarafından doldurulur"],["Ortalama puan (5 üzerinden)",""],["3 ve altı puan alan konular için şikayet (FR-11.03) / DÖF (FR-11.01) no",""],["Değerlendiren (KYT) / tarih",""]]}]);
TPL["FR-11.05"].info2=true;

TPL["FR-12.01"]=F(["Talep no","Proje / seri no","Talep tarihi"],[
 {chk:{cols:["No","Ön şart","Tamam","Eksik","Not"],box:[2,3],items:["Son Muayene ve Deney Formu (FR-09.01) tüm kalemler uygun","Teknik Müdür piyasaya arz onayı","Teknik dosya eksiksiz","AB Uygunluk Beyanı hazırlandı"]}},
 {h:"Etiket bilgileri"},{tbl:["Alan","Değer"],rows:[["CE + onaylanmış kuruluş no","CE {meKurulusNo}"],["Asansör monte eden","{unvan}"],["Adres","{adres}"],["Seri / proje no",""],["Montaj yılı",""],["Beyan yükü (kg) / kişi sayısı",""]]},
 {sig:["Talep eden","Onaylayan (Teknik Müdür)","Etiketi iliştiren / tarih"]}]);

TPL["FR-12.02"]=F([],[
 {ttl:["AB UYGUNLUK BEYANI","Asansör Yönetmeliği (2014/33/AB) Ek II, Bölüm B uyarınca"]},
 {sform:[["Asansör monte eden",[["Ticari unvan","{unvan}"],["Adres","{adres}"]]],
  ["Asansörün tanımı",[["Asansör tipi","Elektrikli insan / insan-yük asansörü"],["Seri no",""],["Kurulduğu adres",""],["Beyan yükü – hız – durak sayısı","……… kg / ……… kişi  –  ……… m/s  –  ……… durak"],["Montaj yılı",""]]],
  ["Uygunluk değerlendirmesi",[["AB tip incelemesi (Ek IV-B)","{tipKurulus} (kimlik no {tipKurulusNo}) – sertifika no {tipSertNo}"],["Kalite güvencesi (Ek X, Modül E)","{meKurulus} (kimlik no {meKurulusNo}) – onay belgesi no {meBelgeNo}"]]],
  ["Mevzuat ve standartlar",[["Mevzuat","Asansör Yönetmeliği (2014/33/AB); Elektromanyetik Uyumluluk Yönetmeliği (2014/30/AB)"],["Uyumlaştırılmış standartlar","TS EN 81-20:2020, TS EN 81-50:2020; uygulanıyorsa TS EN 81-21, 81-28, 81-70, 81-73, 81-77"]]]]},
 {stbl:{no:5,sec:"Güvenlik aksamları ve ana ekipman",head:["Aksam / ekipman","Marka","Model / tip","Seri no","AB tip inceleme sertifika no"],w:[13,30,12,14,12,19],rows:[["Kat kapısı kilitleri"],["Kabin kapısı kilidi"],["Paraşüt tertibatı"],["Aşırı hız regülatörü"],["Tamponlar (kabin / karşı ağ.)"],["UCMP aksamı"],["Yukarı yön aşırı hız koruması"],["Elektronik güvenlik devresi"],["Tahrik makinesi"],["Kumanda panosu ve sürücü"]]}},
 {ce:"CE {meKurulusNo}"},{band:"Bu uygunluk beyanı, asansör monte edenin tek sorumluluğu altında düzenlenmiştir. Yukarıda tanımlanan asansörün Asansör Yönetmeliği (2014/33/AB)'nin ilgili tüm hükümlerine uygun olduğunu beyan ederiz."},
 {signs:[["Yer ve tarih",""],["Ad Soyad / unvan","{gm}, Genel Müdür"],["İmza ve kaşe",""]]}]);
TPL["FR-12.02"].cert=true;

TPL["FR-12.03"]=F(["Proje / seri no","Bina adı ve adresi","Bina sorumlusu","Teslim tarihi"],[
 {chk:{cols:["No","Teslim edilen","Teslim edildi","Yok","Adet / not"],box:[2,3],items:["Asansör çalışır ve CE etiketi takılı","AB Uygunluk Beyanı (asıl)","Kullanım kılavuzu","Bakım talimatları","Acil kurtarma talimatı (asılı)","Kat kapısı acil kilit açma anahtarı","Makine dairesi / kurtarma panosu anahtarları","Fren açma kolu / el çarkı (MR)","Garanti belgesi (en az 3 yıl)","Bakım sözleşmesi / teklifi","Kullanım kayıt defteri"]}},
 {opt:[["Bina sorumlusuna kullanım, acil durum ve 7/24 kurtarma hattı ({kurtarma}) bilgilendirmesi yapıldı", ["☐ Evet", "☐ Hayır"]]]},
 {sig:["Teslim eden ({unvan})","Teslim alan (bina sorumlusu)"]}]);

TPL["FR-12.04"]=F([["Bildirilen onaylanmış kuruluş","{meKurulus} (kimlik no {meKurulusNo})"],"Bildirim dönemi / sayfa no","Bildirim tarihi"],[
 {lifts:5},
 {signs:[["Hazırlayan (KYT)",""],["İmza",""],["Tarih",""]]}]);

TPL["FR-13.01"]=F(["Proje no","Bina adresi","Mevcut asansör bilgileri (yıl, tip, yük, hız)","Tarih"],[
 {kv:["Talep edilen değişiklik"]},
 {chk:{cols:["No","Değişiklik","Evet","Hayır","Açıklama"],box:[2,3],items:["Beyan hızı değişiyor","Beyan yükü değişiyor","Kabin ağırlığı önemli ölçüde artıyor","Hareket mesafesi / durak sayısı değişiyor","Tahrik sistemi tipi değişiyor","Kumanda + makine + paraşüt birlikte değişiyor","Güvenlik aksamı ekleniyor / değişiyor","Yalnızca eşdeğer parça değişimi"]}},
 {chk:{cols:["No","Karar","Seçim","Açıklama"],box:[2],items:["Önemli değişiklik – tip sertifikası kapsamında (Modül E, yeni CE)","Önemli değişiklik – kapsam dışı (Modül G)","Güvenlik iyileştirme (EN 81-80)","Eşdeğer parça değişimi"]}},
 {kv:["Gerekçe","Onaylanmış kuruluş / Bakanlık görüşü (gerekirse)"]},
 {sig:["Teknik Müdür"]}]);

TPL["FR-13.02"]=F(["Asansör tescil / seri no","Tespit tarihi","Yıl, tip, yük, hız","Periyodik kontrol etiketi","Bina adresi"],[
 {chk:{cols:["No","TS EN 81-80 tehlike / kontrol","Var","Yok","Öncelik / not"],box:[2,3],items:["# Kuyu ve erişim","Kuyu dibinde sığınma alanı yetersiz","Kuyu üstünde sığınma alanı yetersiz","Kuyu dibi stop / merdiven / aydınlatma eksik","Kuyu cidarları kesintili / açıklık var","# Kapılar","Kabin kapısı yok","Kat kapısı kilitleri uygun değil","Kapı panelleri camlı ve korumasız / aralıklar büyük","Kapı koruyucu yok veya yetersiz","# Tahrik ve güvenlik","Fren tek kollu / yedeksiz","UCMP koruması yok","Yukarı yön aşırı hız koruması yok","Paraşüt / regülatör uygun değil","Tamponlar uygun değil","# Kabin ve kumanda","Kabin üstü korkuluk yok","Aşırı yük tertibatı yok","Kat seviyeleme hatası büyük","Uzaktan alarm / iki yönlü iletişim yok","Acil aydınlatma yok","Elektrik tesisatı / topraklama yetersiz"]}},
 {kv:["Periyodik kontrol raporundaki bulgular","Genel değerlendirme"]},
 {sigrow:["Tespit eden","Teknik Müdür"]}]);
TPL["FR-13.02"].info2=true;

TPL["FR-13.03"]=F(["Seri no","Teslim tarihi","Bina adresi","Değerlendirme formu (FR-13.01) no","Beyan yükü / hız / durak","Revizyon başlangıç – bitiş"],[
 {tbl:["Değiştirilen / eklenen aksam","Değişti","Marka / tip","Seri no","AB tip inceleme sertifika no"],w:[28,9,21,18,24],box:[1],rows:[["Tahrik makinesi ve fren"],["Kumanda panosu / sürücü"],["Paraşüt tertibatı"],["Aşırı hız regülatörü"],["Kat kapısı kilitleri"],["Kabin kapısı ve operatörü"],["UCMP aksamı"],["Tamponlar"]]},
 {tbl:["Deney / ölçüm","Kabul kriteri","Ölçülen","Uygun","Cihaz no"],w:[31,29,15,9,16],box:[3],rows:[["Fren deneyi (%125 yük, aşağı yön)","Kabin durur, kalıcı hasar yok"],["Paraşüt deneyi","Kabin eğimi ≤ %5"],["Regülatör tetikleme hızı (m/s)","≥ 1,15 × beyan hızı"],["Tampon deneyi","EN 81-50’ye uygun"],["UCMP durma mesafesi (m)","≤ 1,20 m"],["Kapı kapanma kuvveti (N)","≤ 150 N"],["Durma / seviye koruma doğruluğu","±10 mm / ±20 mm"],["Aşırı yük tertibatı","Beyan yükü +%10 (en az 75 kg)"],["Yalıtım direnci (MΩ) / topraklama","≥ 1 MΩ (500 V DC) / sürekli"],["Alarm, iletişim, acil aydınlatma","EN 81-28; ≥ 1 saat, ≥ 5 lx"]]},
 {form:[["Giderilen tehlikeler (FR-13.02 madde no)",""],["Kapsam dışı riskler (tutanak no)",""],["Belgelendirme",["☐ Yeni CE ve AB UB","☐ Revizyon raporu","☐ Periyodik kontrol başvurusu"]]]},
 {sigrow:["Bakım ve Revizyon Şefi","Teknik Müdür","Bina sorumlusu"]}]);
TPL["FR-13.03"].info2=true;

var BK=["Bina adı ve adresi","Asansör seri / tescil no","Tarih ve saat","Teknisyen"];
var BK_COLS=["No","Kontrol","Uygun","Ayar / onarım yapıldı","Not"];
TPL["FR-14.01"]=F(["Bina adı ve adresi","Asansör seri / tescil no","Tarih ve saat","Teknisyen",["Yapılan bakım türü",["☐ Aylık","☐ 3 aylık","☐ 6 aylık","☐ Yıllık","→ (*) işaretli kalemlerin tamamı kontrol edilir"],1],["Güvenliği tehlikeye atan bulgu",["☐ Yok","☐ Var – asansör kullanıma kapatıldı, bina sorumlusuna yazılı bildirildi"],1]],[
 {bakim:[
  [0,"Kat kapıları, kilitler ve kontaklar"],[0,"Kapı aralıkları ve kendiliğinden kapanma"],[0,"Kabin kapısı ve kapı koruyucu"],[0,"Kat seviyeleri"],[0,"Fren fonksiyonu ve balata görünümü"],[0,"Alarm butonu ve iki yönlü iletişim"],[0,"Acil aydınlatma"],[0,"Kabin içi aydınlatma, butonlar, göstergeler"],[0,"Makine yağ seviyesi / sızıntı"],[0,"Kuyu dibi temizliği ve stop butonu"],[0,"Güvenlik devresi fonksiyonu"],[0,"Makine dairesi / kurtarma panosu ve kurtarma talimatı"],[0,"Kullanım kayıt defteri kontrolü"],
  [1,"Halat / kayış görsel kontrol ve çap ölçümü (… mm)"],[1,"Kasnak ve makara kanalları"],[1,"Kılavuz pabuçları / makaralar"],[1,"Ray yağlama"],[1,"Kumanda panosu sıkılık ve temizlik"],[1,"Kapı operatörü ve kayışı"],[1,"Kabin üstü ekipman"],
  [2,"Regülatör fonksiyonu ve kontağı (yüksüz)"],[2,"Paraşüt tetik mekanizması (yüksüz)"],[2,"Tamponlar ve geri dönüş kontağı"],[2,"Son durak şalterleri"],[2,"UCMP fonksiyonu"],[2,"Topraklama bağlantıları gözle kontrol"],[2,"Aşırı yük tertibatı"],
  [3,"Yalıtım direnci ölçümü (… MΩ)"],[3,"Fren ayarı ve balata aşınması"],[3,"Halat gerginlik eşitliği"],[3,"Kat kapısı kilit kavrama derinlikleri"],[3,"Acil aydınlatma süresi (1 saat)"],[3,"Kurtarma ekipmanı / akü durumu"],[3,"Periyodik kontrol öncesi tam kontrol"]]},
 {signs:[["Teknisyen (ad soyad / imza)",""],["Bakım Şefi – yıllık bakımda (ad soyad / imza)",""],["Bina sorumlusu (ad soyad / imza)",""]]}]);
TPL["FR-14.01"].info2=true;
TPL["FR-14.02"]=F(["Kayıt no","Bina adı ve adresi","Asansör seri / tescil no","İhbar eden / telefon"],[
 {tbl:["Olay","Tarih","Saat"],rows:[["İhbar alındı"],["Teknisyen yönlendirildi"],["Sahaya varış"],["Kurtarma tamamlandı"],["Asansör hizmete alındı / kapatıldı"]]},
 {opt:[["İçeride mahsur kalan var mı?", ["☐ Evet (kişi sayısı: ……)", "☐ Hayır"]], ["İlk müdahale süresi", ["…… dk (hedef ≤ 60 dk)"]]]},
 {kv:["Arıza tanımı","Tespit edilen neden","Yapılan işlem / değiştirilen parça (güvenlik aksamında seri no)"]},
 {opt:[["Son 30 gün içinde aynı arıza", ["☐ Hayır", "☐ Evet – DÖF no: ………"]]]},
 {sig:["Teknisyen","Bina sorumlusu"]}]);

TPL["FR-15.01"]=F(["Yıl","Revizyon","Tarih"],[
 {tbl:["No","Tetkik edilecek alan / süreç","İlgili Kalite El Kitabı bölümü","Tetkikçi","Planlanan ay","Gerçekleşme tarihi","Rapor no"],rows:[["1","Doküman ve kayıt kontrolü","5"],["2","Organizasyon, eğitim ve yetkinlik","4"],["3","Tip sertifikası uyumu ve teknik dosya","6"],["4","Satın alma ve giriş kontrolü","7"],["5","Montaj şantiyesi 1","8"],["6","Montaj şantiyesi 2","8"],["7","Son muayene ve deney (dosya + tanıklık)","9"],["8","Ölçme ve test ekipmanları","10"],["9","Uygunsuzluk, DÖF ve şikayetler","11"],["10","CE, AB UB ve teslim","12"],["11","Revizyon","13"],["12","Bakım ve kurtarma","14"],["13","İSG uygulamaları","16"]]},
 {sig:["Hazırlayan (KYT)","Onaylayan (Genel Müdür)"]}]);

TPL["FR-15.02"]=F(["Rapor no","Tetkik tarihi","Tetkik edilen alan","Tetkikçi(ler)","Görüşülen kişiler"],[
 {kv:["Tetkik kapsamı ve incelenen kayıtlar (proje no'ları)"]},
 {tbl:["No","Bulgu","Şart (Kalite El Kitabı / PR / Ek X)","Sınıf (Majör/Minör/Gözlem)","DÖF no"],n:8},
 {kv:["Olumlu bulgular","Genel değerlendirme"]},
 {sig:["Tetkikçi","Bölüm yöneticisi","KYT"]}]);

TPL["FR-15.03"]=F(["Toplantı tarihi","Yer","Toplantı no"],[
 {tbl:["Katılımcı","Görev","İmza"],rows:[["{gm}","Genel Müdür"],["{kyt}","KYT"],["{tm}","Teknik Müdür"],["{bakimSefi}","Bakım ve Revizyon Şefi"]],n:3},
 {tbl:["Gündem maddesi (girdi)","Değerlendirme"],rows:[["Önceki YGG kararlarının durumu"],["Kalite hedefleri gerçekleşmesi (FR-15.04)"],["İç tetkik sonuçları"],["Onaylanmış kuruluş tetkiki ve habersiz ziyaretler"],["Son muayene ve deney istatistikleri ve en sık uygunsuzluklar"],["Periyodik kontrol etiket dağılımı"],["Şikayetler ve müşteri memnuniyeti"],["DÖF durumu"],["Tedarikçi performansı"],["Kalibrasyon ve eğitim durumu"],["Mevzuat / standart değişiklikleri"],["Kaynak ihtiyaçları"],["Politika ve hedeflerin uygunluğu"]]},
 {h:"Kararlar"},{tbl:["No","Karar","Sorumlu","Termin"],n:8},
 {sig:["KYT","Genel Müdür"]}]);

TPL["FR-15.04"]=F(["Yıl","Güncelleme tarihi"],[
 {hedefler:true},
 {sig:["Hazırlayan (KYT)","Genel Müdür"]}]);
TPL["FR-15.05"]=F([],[
 {p:"Her soru listesi, Yıllık İç Tetkik Planı'ndaki (FR-15.01) ilgili tetkik için ayrı doldurulur. Tetkikçi gerektiğinde ek soru yazar; uygun olmayan cevaplar İç Tetkik Raporu'na (FR-15.02) bulgu olarak aktarılır."},
 {qsets:[{"no": "1", "t": "Doküman ve kayıt kontrolü", "ref": "Kalite El Kitabı Bölüm 5 · PR-05.01", "q": [["Doküman ana listesi güncel mi; dokümanların revizyonları listeyle uyumlu mu?", "FR-05.02"], ["Dokümanlar yayın öncesi yetkili kişilerce gözden geçirilip onaylanmış mı?", "Onay imzaları"], ["Revizyon nedenleri ve değişiklikler revizyon geçmişine işlenmiş mi?", "Revizyon geçmişi"], ["Kullanım noktalarında (ofis, şantiye) güncel dokümanlar var; geçersiz kopyalar kaldırılmış mı?", "Saha kontrolü"], ["Dış kaynaklı doküman listesi güncel; standart ve mevzuat değişiklikleri değerlendirilmiş mi?", "FR-05.03"], ["Kalite sistemindeki önemli değişiklikler onaylanmış kuruluşa bildirilmiş mi?", "Yazışmalar"], ["Kayıtlar okunaklı, tanımlı ve kolay erişilebilir şekilde saklanıyor mu?", "Arşiv"], ["Kayıtlar en az 10 yıl saklanıyor ve elektronik kayıtlar yedekleniyor mu?", "Arşiv, yedekleme"]]}, {"no": "2", "t": "Organizasyon, eğitim ve yetkinlik", "ref": "Kalite El Kitabı Bölüm 4 · PR-04.01", "q": [["Organizasyon şeması ve görev tanımları güncel mi?", "Kalite El Kitabı Bölüm 4"], ["Yetki matrisi güncel; personel yalnızca yetkili olduğu işleri mi yapıyor?", "FR-04.04"], ["Eğitim ihtiyaç analizi yapılmış mı?", "FR-04.01"], ["Yıllık eğitim planı uygulanıyor; gerçekleşmeyen eğitimler yeniden planlanmış mı?", "FR-04.02"], ["Eğitim katılım kayıtları ve etkinlik değerlendirmeleri mevcut mu?", "FR-04.03"], ["Personel dosyaları eksiksiz mi (mesleki yeterlilik belgesi, sağlık raporu, sertifikalar)?", "FR-04.05"], ["Yeni personele oryantasyon ve kalite sistemi eğitimi verilmiş mi?", "FR-04.03"], ["Personel kalite politikasını ve kendi sorumluluklarını biliyor mu?", "Personel görüşmesi"]]}, {"no": "3", "t": "Tip sertifikası uyumu ve teknik dosya", "ref": "Kalite El Kitabı Bölüm 6 · PR-06.01", "q": [["Kullanılan AB tip inceleme sertifikası geçerli ve güncel revizyonunda mı?", "Tip sertifikası"], ["Projenin yük, hız, hareket mesafesi ve durak sayısı sertifika sınırları içinde mi?", "FR-06.01"], ["Projedeki güvenlik aksamları sertifikada tanımlı aksamlarla uyumlu mu?", "FR-06.01, FR-07.05"], ["Proje hesapları (ray, tampon, halat, traksiyon) dosyada ve onaylı mı?", "Teknik dosya"], ["Teknik dosya 12 kalem olarak eksiksiz mi?", "Teknik dosya"], ["Proje değişiklikleri kayıt altına alınmış ve onaylanmış mı?", "FR-06.03"], ["Tip sertifikasını etkileyen değişiklikler onaylanmış kuruluşa bildirilmiş mi?", "FR-06.03, yazışmalar"], ["Teknik dosya piyasaya arzdan sonra 10 yıl saklanacak şekilde arşivleniyor mu?", "Arşiv"]]}, {"no": "4", "t": "Satın alma ve giriş kontrolü", "ref": "Kalite El Kitabı Bölüm 7 · PR-07.01", "q": [["Onaylı tedarikçi listesi güncel mi?", "FR-07.02"], ["Tedarikçi değerlendirmeleri yapılmış, yıllık yeniden değerlendirme uygulanıyor mu?", "FR-07.01"], ["Siparişlerde marka, tip ve sertifika gereklilikleri açıkça belirtilmiş mi?", "Siparişler, FR-07.03"], ["Güvenlik aksamları onaylı tedarikçilerden alınmış mı?", "FR-07.02, faturalar"], ["Güvenlik aksamlarının AB tip inceleme sertifikaları ve AB uygunluk beyanları dosyada ve geçerli mi?", "FR-07.05"], ["Giriş kontrolleri yapılmış; sertifika ve seri numaraları kontrol edilmiş mi?", "FR-07.04"], ["Uygunsuz malzeme ayrılmış, tanımlanmış ve kayıt altına alınmış mı?", "FR-07.04, FR-11.01"], ["Malzemeler hasar görmeyecek şekilde taşınıyor ve saklanıyor mu?", "Saha kontrolü"]]}, {"no": "5 ve 6", "t": "Montaj şantiyesi – her şantiye için ayrı doldurulur", "ref": "Kalite El Kitabı Bölüm 8 · PR-08.01", "q": [["Şantiyede güncel proje, montaj talimatları ve proje malzeme listesi mevcut mu?", "TL-08.01 … TL-08.10, FR-07.03"], ["Montaj öncesi kuyu ölçülmüş ve kuyu teslim alınmış mı?", "FR-08.01"], ["Sevkiyat kontrolü yapılmış mı?", "FR-08.02"], ["Tamamlanan aşamaların ara kontrol formları doldurulmuş ve imzalı mı?", "FR-08.03 … FR-08.10"], ["Sahadaki güvenlik aksamlarının seri numaraları izlenebilirlik listesiyle uyumlu mu?", "FR-07.05"], ["Kullanılan ölçüm aletleri tanımlı ve kalibrasyonu geçerli mi?", "FR-10.01"], ["Montaj personeli yetkili ve eğitimli mi?", "FR-04.04"], ["Kuyu koruma, KKD ve kilitleme-etiketleme önlemleri uygulanıyor mu?", "TL-16.01"]]}, {"no": "7", "t": "Son muayene ve deney (dosya ve tanıklık)", "ref": "Kalite El Kitabı Bölüm 9 · PR-09.01", "q": [["Son muayene öncesi tüm ara kontroller tamamlanmış mı?", "FR-08.03 … FR-08.11"], ["Son Muayene ve Deney Formu tüm kalemleriyle doldurulmuş ve sonuçlandırılmış mı?", "FR-09.01"], ["Deneyler ilgili talimatlara göre yapılmış mı?", "TL-09.01 … TL-09.06"], ["Ölçülen değerler kabul kriterlerini sağlıyor mu?", "FR-09.01"], ["Kullanılan cihazların numaraları kayıtlı ve kalibrasyonları geçerli mi?", "FR-09.01, FR-10.01"], ["Uygun olmayan sonuçlar giderilmeden asansör uygun kabul edilmemiş mi?", "FR-11.01"], ["Rastgele seçilen bir deney tanıklık altında tekrarlandı; sonuç kayıtla uyumlu mu?", "Tanıklık"], ["Devam eden montajlar listesi güncel ve onaylanmış kuruluşa yıllık bildirilmiş mi?", "FR-09.03"]]}, {"no": "8", "t": "Ölçme ve test ekipmanları", "ref": "Kalite El Kitabı Bölüm 10 · PR-10.01", "q": [["Tüm ölçme ve test ekipmanları planda kayıtlı mı?", "FR-10.01"], ["Kalibrasyonlar planlanan tarihlerde yapılmış ve sertifikaları dosyada mı?", "FR-10.01, sertifikalar"], ["Kalibrasyon sertifikalarındaki sonuçlar değerlendirilmiş mi?", "Sertifikalar"], ["Cihazların üzerinde kalibrasyon durumunu gösteren etiket var mı?", "Saha kontrolü"], ["Kalibrasyonu geçmiş veya hasarlı cihazlar kullanımdan alınmış mı?", "FR-10.01"], ["Hatalı çıkan cihazla yapılmış önceki ölçümlerin etkisi değerlendirilmiş mi?", "FR-11.01"], ["Deney ağırlıkları tanımlı ve 3 yıllık doğrulaması geçerli mi?", "FR-10.01"], ["Cihazlar uygun şekilde taşınıyor ve saklanıyor mu?", "Saha kontrolü"]]}, {"no": "9", "t": "Uygunsuzluk, DÖF ve şikayetler", "ref": "Kalite El Kitabı Bölüm 11 · PR-11.01, PR-11.02, PR-11.03", "q": [["Uygunsuzluklar tespit edildiğinde kayıt altına alınıyor mu?", "FR-11.01"], ["Uygunsuz ürün tanımlanıp ayrılmış ve kullanımı engellenmiş mi?", "FR-11.01"], ["Kök neden analizi yapılmış mı?", "FR-11.01"], ["DÖF'ler termininde kapatılmış mı?", "FR-11.01"], ["DÖF etkinliği doğrulanmış mı?", "FR-11.01"], ["Müşteri şikayetleri kaydedilmiş ve cevaplanmış mı?", "FR-11.03"], ["Tekrarlayan arıza ve şikayetler için DÖF açılmış mı?", "FR-11.03, FR-14.02"], ["Uygunsuzluk ve şikayet istatistikleri YGG'ye raporlanmış mı?", "FR-15.03"]]}, {"no": "10", "t": "CE, AB Uygunluk Beyanı ve teslim", "ref": "Kalite El Kitabı Bölüm 12 · PR-12.01", "q": [["CE etiket talebi ön şartlar tamamlanarak onaylanmış mı?", "FR-12.01"], ["CE işareti onaylanmış kuruluş kimlik numarasıyla birlikte kabine iliştirilmiş mi?", "Saha kontrolü / fotoğraf"], ["AB Uygunluk Beyanı tüm bilgileriyle eksiksiz ve imzalı mı?", "FR-12.02"], ["Beyandaki güvenlik aksamı bilgileri izlenebilirlik listesiyle uyumlu mu?", "FR-12.02, FR-07.05"], ["Kullanım kılavuzu, bakım ve kurtarma talimatları teslim edilmiş mi?", "FR-12.03"], ["Teslim tutanağı bina sorumlusuna imzalatılmış mı?", "FR-12.03"], ["Piyasaya arz edilen asansörler onaylanmış kuruluşa bildirilmiş mi?", "FR-12.04"], ["Gerekli belgeler ilgili idareye süresi içinde iletilmiş mi?", "Yazışmalar"]]}, {"no": "11", "t": "Revizyon", "ref": "Kalite El Kitabı Bölüm 13 · PR-13.01", "q": [["Revizyon öncesi değişikliğin önemli olup olmadığı değerlendirilmiş mi?", "FR-13.01"], ["Önemli değişikliklerde uygun uygunluk değerlendirme yolu seçilmiş mi?", "FR-13.01"], ["EN 81-80 mevcut durum tespiti yapılmış mı?", "FR-13.02"], ["Değiştirilen güvenlik aksamlarının sertifikaları ve seri numaraları kayıtlı mı?", "FR-13.03"], ["Revizyon sonrası deneyler yapılmış ve sonuçlar kabul kriterlerini sağlıyor mu?", "FR-13.03"], ["Kapsam dışı bırakılan riskler müşteriye yazılı bildirilmiş mi?", "FR-13.03, tutanak"], ["Revizyon teslim raporu düzenlenmiş ve imzalanmış mı?", "FR-13.03"]]}, {"no": "12", "t": "Bakım ve kurtarma", "ref": "Kalite El Kitabı Bölüm 14 · PR-14.01", "q": [["Bakım sözleşmeleri ve bakım planı güncel mi?", "Sözleşmeler, bakım planı"], ["Periyodik bakımlar plana göre yapılmış mı?", "FR-14.01"], ["Bakım türüne ait (*) işaretli tüm kalemler kontrol edilmiş mi?", "FR-14.01"], ["Güvenliği tehlikeye atan bulgularda asansör kapatılıp bina sorumlusuna yazılı bildirilmiş mi?", "FR-14.01"], ["Arıza ve kurtarma kayıtları saat ve dakikasıyla tutulmuş mu?", "FR-14.02"], ["İlk müdahale süresi hedefi (≤ 60 dk) sağlanmış mı?", "FR-14.02"], ["Acil kurtarma talimatları makine dairesinde / kurtarma panosunda asılı mı?", "TL-14.01, TL-14.02"], ["7/24 kurtarma hattı çalışıyor ve bina sorumlularına bildirilmiş mi?", "Saha kontrolü"]]}, {"no": "13", "t": "İSG uygulamaları", "ref": "Kalite El Kitabı Bölüm 16 · TL-16.01", "q": [["Çalışanların İSG eğitimleri ve sağlık raporları geçerli mi?", "FR-04.05"], ["Şantiyede KKD (baret, emniyet kemeri, iş ayakkabısı) kullanılıyor mu?", "TL-16.01"], ["Kat kapısı boşlukları ve kuyu açıklıkları korunmuş mu?", "Saha kontrolü"], ["Elektrik çalışmalarında kilitleme-etiketleme uygulanıyor mu?", "TL-16.01"], ["Yüksekte çalışma ve kaldırma ekipmanları kontrol edilmiş mi?", "Kontrol kayıtları"], ["Kuyu içinde tek başına çalışılmaması kuralına uyuluyor mu?", "TL-16.01"], ["İş kazası ve ramak kala olayları kaydedilmiş mi?", "Kayıtlar"]]}]}]);
/* ---------- Şablon motoru ---------- */
function PK(k){var x=S.v[k];var has=x!==undefined&&String(x).trim()!=="";var t=has?(FIELD_TYPE[k]==="date"?fmtD(x):x):"["+(LABELS[k]||k)+"]";return '<span data-key="'+k+'" class="'+(has?"v-in":"ph")+'">'+esc(t)+'</span>';}
function tx(s){return esc(s).replace(/\{(\w+)\}/g,function(m,k){return LABELS[k]?PK(k):m;});}
function docOf(kod){for(var i=0;i<S.dokumanlar.length;i++)if(S.dokumanlar[i].kod===kod)return S.dokumanlar[i];return null;}
function docName(kod){var d=docOf(kod);if(d)return d.ad;for(var i=0;i<DOCS.length;i++)if(DOCS[i].kod===kod)return DOCS[i].ad;return "";}
function tTable(head,rows,cls,cw,box){return '<div class="ts"><table class="t'+(cls?" "+cls:"")+'"'+(cw?' data-w="'+cw.join(",")+'"':"")+'>'+(cw?'<colgroup>'+cw.map(function(x){return '<col style="width:'+x+'%">';}).join("")+'</colgroup>':"")+'<thead><tr>'+head.map(function(h,i){return "<th"+(box&&box.indexOf(i)>=0?' class="box"':"")+">"+tx(h)+"</th>";}).join("")+'</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>';}
function tRow(cells,boxes){return "<tr>"+cells.map(function(c,i){var b=boxes&&boxes.indexOf(i)>=0;return '<td'+(b?' class="box"':"")+'>'+(b?"☐":c)+"</td>";}).join("")+"</tr>";}
function blankRows(n,w,box){var r=[];for(var i=0;i<n;i++){var c=[];for(var j=0;j<w;j++)c.push("&nbsp;");r.push(tRow(c,box));}return r;}
function sigRow(roles){return '<div class="ts"><table class="t sig"><thead><tr><th>Görev</th><th>Ad Soyad</th><th>İmza</th><th>Tarih</th></tr></thead><tbody>'+roles.map(function(r){return '<tr><td>'+tx(r)+'</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>';}).join("")+'</tbody></table></div>';}
function sigBlock(roles){return '<div class="ts"><table class="t sig"><thead><tr>'+roles.map(function(r){return "<th>"+tx(r)+"</th>";}).join("")+'</tr></thead><tbody><tr>'+roles.map(function(){return '<td><span class="sl">Ad Soyad:</span></td>';}).join("")+'</tr><tr>'+roles.map(function(){return '<td><span class="sl">İmza:</span></td>';}).join("")+'</tr><tr>'+roles.map(function(){return '<td><span class="sl">Tarih:</span></td>';}).join("")+'</tr></tbody></table></div>';}
function kvBlock(labels,cls){return '<div class="ts"><table class="t kv'+(cls?" "+cls:"")+'"><tbody>'+labels.map(function(l){var a=Array.isArray(l);return '<tr><th>'+tx(a?l[0]:l)+'</th><td'+(a?' class="opts"':'')+'>'+(a?tx(l[1]):"&nbsp;")+'</td></tr>';}).join("")+'</tbody></table></div>';}
function qTable(items){var QW=[4,55,16,7,8,10],qn=0;return '<div class="ts"><table class="t qlist" data-w="'+QW.join(",")+'"><colgroup>'+QW.map(function(x){return '<col style="width:'+x+'%">';}).join("")+'</colgroup><thead><tr><th>No</th><th>Soru</th><th>Kanıt / kayıt</th><th class="box">Uygun</th><th class="box">Uygun değil</th><th>Not / bulgu</th></tr></thead><tbody>'+items.map(function(q){if(q[0].charAt(0)==="#")return '<tr class="grp"><td colspan="6">'+tx(q[0].slice(1).trim())+'</td></tr>';qn++;return '<tr><td>'+qn+'</td><td>'+(q[0]?tx(q[0]):"&nbsp;")+'</td><td>'+(q[1]?tx(q[1]):"&nbsp;")+'</td><td class="box">☐</td><td class="box">☐</td><td>&nbsp;</td></tr>';}).join("")+'</tbody></table></div>';}
function kvGrid(labels){var r=[];function L(x){return tx(Array.isArray(x)?x[0]:x);}function V(x){if(!Array.isArray(x))return "&nbsp;";var v=x[1];return Array.isArray(v)?v.map(function(o){return tx(o.replace(/ /g,"\u00a0"));}).join(" \u00a0\u00a0\u00a0 "):tx(v);}function W(x){return Array.isArray(x)&&x[2];}for(var i=0;i<labels.length;i+=2){var a=labels[i],b=labels[i+1];if(W(a)){r.push('<tr><th>'+L(a)+'</th><td colspan="3">'+V(a)+'</td></tr>');i--;continue;}if(W(b))b=undefined,i--;r.push('<tr><th>'+L(a)+'</th>'+(b!==undefined?'<td>'+V(a)+'</td><th>'+L(b)+'</th><td>'+V(b)+'</td>':'<td colspan="3">'+V(a)+'</td>')+'</tr>');}return '<div class="ts"><table class="t kv2 info" data-w="22,30,22,26"><colgroup><col style="width:22%"><col style="width:30%"><col style="width:22%"><col style="width:26%"></colgroup><tbody>'+r.join("")+'</tbody></table></div>';}
function recTable(codes){return tTable(["Kayıt","Adı","Saklama süresi","Saklama yeri"],codes.map(function(c){var n=docName(c);return tRow([esc(c),n?esc(n):"",/^FR/.test(c)?"10 yıl":"–",/^FR/.test(c)?"Proje dosyası / KYT arşivi":"–"]);}));}
function partHTML(p){
  if(p.h)return '<h3>'+tx(p.h)+'</h3>';
  if(p.p)return '<p>'+tx(p.p)+'</p>';
  if(p.sform){var SW=[13,31,56],no=0;return '<div class="ts"><table class="t sform" data-w="'+SW.join(",")+'"><colgroup>'+SW.map(function(x){return '<col style="width:'+x+'%">';}).join("")+'</colgroup><tbody>'+p.sform.map(function(sc){no++;return sc[1].map(function(r,j){return '<tr>'+(j===0?'<th class="sec" rowspan="'+sc[1].length+'"><div class="secno">'+no+'</div><div class="sect">'+tx(sc[0])+'</div></th>':"")+'<th>'+tx(r[0])+'</th><td>'+(r[1]?tx(r[1]):"&nbsp;")+'</td></tr>';}).join("");}).join("")+'</tbody></table></div>';}
  if(p.stbl){var q=p.stbl;return '<div class="ts"><table class="t sform stbl" data-w="'+q.w.join(",")+'"><colgroup>'+q.w.map(function(x){return '<col style="width:'+x+'%">';}).join("")+'</colgroup><tbody><tr class="colh"><th class="sec" rowspan="'+(q.rows.length+1)+'"><div class="secno">'+q.no+'</div><div class="sect">'+tx(q.sec)+'</div></th>'+q.head.map(function(h){return '<th>'+tx(h)+'</th>';}).join("")+'</tr>'+q.rows.map(function(r){return '<tr>'+q.head.map(function(h,k){return '<td>'+(r[k]?tx(r[k]):"&nbsp;")+'</td>';}).join("")+'</tr>';}).join("")+'</tbody></table></div>';}
  if(p.lifts){var LW=[9,24,29,19,19],h='';for(var a=1;a<=p.lifts;a++){var R=[["Seri no","Montaj yılı"],["Bina adresi"],["Yük (kg/kişi) – hız – durak","Son muayene tarihi"],["AB UB tarihi","Piyasaya arz tarihi"]];h+=R.map(function(r,j){return '<tr>'+(j===0?'<th class="sec" rowspan="'+R.length+'"><div class="secno">'+a+'</div><div class="sect">Asansör</div></th>':"")+'<th>'+tx(r[0])+'</th>'+(r.length>1?'<td>&nbsp;</td><th>'+tx(r[1])+'</th><td>&nbsp;</td>':'<td colspan="3">&nbsp;</td>')+'</tr>';}).join("");}
    return '<div class="ts"><table class="t sform lifts" data-w="'+LW.join(",")+'"><colgroup>'+LW.map(function(x){return '<col style="width:'+x+'%">';}).join("")+'</colgroup><tbody>'+h+'</tbody></table></div>';}
  if(p.bakim){var BW=[5,39,7,7,7,7,8,9,11],no3=0;return '<div class="ts"><table class="t bakim" data-w="'+BW.join(",")+'"><colgroup>'+BW.map(function(x){return '<col style="width:'+x+'%">';}).join("")+'</colgroup><thead><tr><th>No</th><th>Kontrol</th><th class="box">Aylık</th><th class="box">3 aylık</th><th class="box">6 aylık</th><th class="box">Yıllık</th><th class="box">Uygun</th><th class="box">Ayar / onarım</th><th>Not</th></tr></thead><tbody>'+p.bakim.map(function(it){no3++;var c='<tr><td>'+no3+'</td><td>'+tx(it[1])+'</td>';for(var k=0;k<4;k++)c+='<td class="box star">'+(k>=it[0]?"*":"&nbsp;")+'</td>';return c+'<td class="box">☐</td><td class="box">☐</td><td>&nbsp;</td></tr>';}).join("")+'</tbody></table></div>';}
  if(p.qlist)return qTable(p.qlist);
  if(p.qsets)return p.qsets.map(function(st){return '<section class="qset"><h3>Plan no '+esc(st.no)+' – '+tx(st.t)+'</h3><p class="sub">'+tx(st.ref)+'</p>'+kvGrid(["Tetkik tarihi","Tetkikçi","Tetkik edilen birim / şantiye","Görüşülen kişi(ler)",["İç Tetkik Raporu (FR-15.02) no","",1]])+qTable(st.q.concat([["",""],["",""]]))+sigRow(["Tetkikçi","Bölüm temsilcisi"])+'</section>';}).join("");
  if(p.ce)return '<p class="center cemark">'+tx(p.ce)+'</p>';
  if(p.ttl)return '<h1 class="center decl">'+tx(p.ttl[0])+'</h1>'+(p.ttl[1]?'<p class="center sub">'+tx(p.ttl[1])+'</p>':"");
  if(p.signs)return '<div class="ts"><table class="t sig tall"><tbody><tr>'+p.signs.map(function(c){return '<td><span class="sl">'+tx(c[0])+':</span>'+(c[1]?'<br>'+tx(c[1]):'')+'</td>';}).join("")+'</tr></tbody></table></div>';
  if(p.band)return '<div class="ts"><table class="t band"><tbody><tr class="grp"><td>'+tx(p.band)+'</td></tr></tbody></table></div>';
  if(p.form)return '<div class="ts"><table class="t kv form"><tbody>'+p.form.map(function(r){var v=r[1];if(typeof r[0]==="string"&&r[0].charAt(0)==="#")return '<tr class="grp"><td colspan="2">'+tx(r[0].slice(1).trim())+'</td></tr>';if(v==="tall")return '<tr class="tall"><th>'+tx(r[0])+'</th><td>&nbsp;</td></tr>';if(Array.isArray(v))return '<tr><th>'+tx(r[0])+'</th><td class="opts">'+v.map(function(o){return tx(o.length<=30?o.replace(/ /g,"\u00a0"):o);}).join(" \u00a0\u00a0 ")+'</td></tr>';return '<tr><th>'+tx(r[0])+'</th><td>'+(v?tx(v):"&nbsp;")+'</td></tr>';}).join("")+'</tbody></table></div>';
  if(p.opt)return '<div class="ts"><table class="t kv opt"><tbody>'+p.opt.map(function(r){return '<tr><th>'+tx(r[0])+'</th><td class="opts">'+r[1].map(function(o){return tx(o.length<=30?o.replace(/ /g,"\u00a0"):o);}).join(" \u00a0\u00a0 ")+'</td></tr>';}).join("")+'</tbody></table></div>';
  if(p.kv)return kvBlock(p.kv,"tall");
  if(p.sig)return sigBlock(p.sig);
  if(p.sigrow)return sigRow(p.sigrow);
  if(p.tbl){var w=p.tbl.length,rows=(p.rows||[]).map(function(r){var c=[];for(var j=0;j<w;j++)c.push(r[j]!==undefined&&r[j]!==""?tx(r[j]):"&nbsp;");return tRow(c,p.box);});return tTable(p.tbl,rows.concat(blankRows(p.n||0,w,p.box)),p.cls||"",p.w,p.box);}
  if(p.chk){var cc=p.chk,w2=cc.cols.length,no=0,rows2=cc.items.map(function(it){
    if(typeof it==="string"&&it.charAt(0)==="#")return '<tr class="grp"><td colspan="'+w2+'">'+tx(it.slice(1).trim())+'</td></tr>';
    var cells=[];if(typeof it==="string"){no++;cells=[String(no),tx(it)];}else{cells=it.map(function(x){return tx(x);});}
    while(cells.length<w2)cells.push("&nbsp;");return tRow(cells,cc.box);});
    return tTable(cc.cols,rows2,"chk",cc.w,cc.box);}
  if(p.doclist){return tTable(["Kod","Doküman adı","Bölüm","Rev.","Yayın tarihi","Durum"],S.dokumanlar.map(function(d){return tRow([esc(d.kod),esc(d.ad),esc(d.bolum),esc(d.rev),esc(fmtD(d.tarih))||"&nbsp;",esc(d.durum)]);}));}
  if(p.hedefler){return tTable(["Hedef","Hedef değer","1. çeyrek","2. çeyrek","3. çeyrek","4. çeyrek","Yıl sonu","Durum"],S.hedefler.map(function(h){return tRow([esc(h.hedef),esc(h.deger),"&nbsp;","&nbsp;","&nbsp;","&nbsp;","&nbsp;","&nbsp;"]);}));}
  return "";
}
function genericTpl(kod){
  var pre=(kod||"").slice(0,2).toUpperCase();
  if(pre==="PR")return {t:"P",amac:"……",kapsam:"……",sor:[["……","……"]],akis:[["Uygulama",["……","……"]]],kayit:[],ilgili:["Kalite El Kitabı"]};
  if(pre==="TL")return {t:"T",amac:"……",ekip:["……"],guv:["……"],on:["……"],adim:[["Uygulama",["……","……"]]],kabul:[["……","……","……"]],kayit:[],not:""};
  return F(["Proje / seri no","Tarih"],[{tbl:["No","Açıklama","Sonuç","Not"],n:10},{sig:["Dolduran","Kontrol eden"]}]);
}
function tplDef(kod){return TPL[kod]||genericTpl(kod);}
function tplBody(kod){
  var d=tplDef(kod),h="";
  if(d.t==="P"){
    var n=1;h+='<h3>'+(n++)+'. Amaç</h3><p>'+tx(d.amac)+'</p><h3>'+(n++)+'. Kapsam</h3><p>'+tx(d.kapsam)+'</p>';
    if(d.tanim&&d.tanim.length)h+='<h3>'+(n++)+'. Tanımlar</h3>'+tTable(["Terim","Tanım"],d.tanim.map(function(r){return tRow([tx(r[0]),tx(r[1])]);}));
    h+='<h3>'+(n++)+'. Sorumluluklar</h3>'+tTable(["Görev","Sorumluluk"],d.sor.map(function(r){return tRow([tx(r[0]),tx(r[1])]);}));
    var u=n++;h+='<h3>'+u+'. Uygulama</h3>'+d.akis.map(function(a,i){return '<h4>'+u+'.'+(i+1)+' '+tx(a[0])+'</h4><ol>'+a[1].map(function(s){return "<li>"+tx(s)+"</li>";}).join("")+'</ol>';}).join("");
    h+='<h3>'+(n++)+'. İlgili dokümanlar</h3><ul>'+d.ilgili.map(function(s){return "<li>"+tx(s)+"</li>";}).join("")+'</ul>';
    if(d.kayit.length)h+='<h3>'+(n++)+'. Kayıtlar</h3>'+recTable(d.kayit);
    h+=sigBlock(["Hazırlayan – KYT","Kontrol eden – Teknik Müdür","Onaylayan – Genel Müdür"]);
  }else if(d.t==="T"){
    var m=1;h+='<h3>'+(m++)+'. Amaç</h3><p>'+tx(d.amac)+'</p>';
    h+='<h3>'+(m++)+'. Gerekli ekipman</h3>'+(d.compact?'<p>'+d.ekip.map(function(s){return tx(s);}).join(" · ")+'</p>':'<ul>'+d.ekip.map(function(s){return "<li>"+tx(s)+"</li>";}).join("")+'</ul>');
    h+='<h3>'+(m++)+'. Güvenlik önlemleri</h3><ul class="warn">'+d.guv.map(function(s){return "<li>"+tx(s)+"</li>";}).join("")+'</ul>';
    h+='<h3>'+(m++)+'. Ön koşullar</h3><ul>'+d.on.map(function(s){return "<li>"+tx(s)+"</li>";}).join("")+'</ul>';
    var v=m++;h+='<h3>'+v+'. Uygulama adımları</h3>'+d.adim.map(function(a,i){return '<h4>'+v+'.'+(i+1)+' '+tx(a[0])+'</h4><ol>'+a[1].map(function(s){return "<li>"+tx(s)+"</li>";}).join("")+'</ol>';}).join("");
    h+='<h3>'+(m++)+'. Kabul kriterleri</h3>'+tTable(["Kontrol","Kabul kriteri","Yöntem / referans"],d.kabul.map(function(r){return tRow([tx(r[0]),tx(r[1]),tx(r[2])]);}));
    h+='<h3>'+(m++)+'. Kayıtlar</h3>'+(d.kayit.length?(d.compact?'<p>'+d.kayit.map(function(c){var n=docName(c);return esc(c)+(n?" "+esc(n):"")+(/^FR/.test(c)?" – 10 yıl, proje dosyası / KYT arşivi":"");}).join("; ")+'</p>':recTable(d.kayit)):"<p>–</p>");
    if(d.not)h+='<p class="note">'+tx(d.not)+'</p>';
    h+=d.compact?sigRow(["Hazırlayan","Onaylayan – Teknik Müdür"]):sigBlock(["Hazırlayan","Onaylayan – Teknik Müdür"]);
  }else{
    if(d.info&&d.info.length)h+=d.info2?kvGrid(d.info):kvBlock(d.info,"info");
    h+=d.parts.map(partHTML).join("");
  }
  return h;
}
function tplHead(kod){
  var d=docOf(kod)||{kod:kod,ad:docName(kod),rev:"00",tarih:"",durum:"Taslak"};
  var kind={PR:"PROSEDÜR",TL:"TALİMAT",FR:"FORM"}[(kod||"").slice(0,2)]||"DOKÜMAN";
  return '<table class="dochead"><tr><td class="firm" rowspan="4">'+firmCellHTML()+'</td><td class="title" rowspan="4"><small>'+kind+'</small>'+esc(d.ad||"[Doküman adı]")+'</td><td class="k">Doküman no</td><td class="v">'+esc(d.kod)+'</td></tr><tr><td class="k">Yayın tarihi</td><td class="v">'+(d.tarih?esc(fmtD(d.tarih)):'<span class="ph">[tarih]</span>')+'</td></tr><tr><td class="k">Rev. no</td><td class="v">'+esc(d.rev||"00")+'</td></tr><tr><td class="k">Durum</td><td class="v">'+esc(d.durum||"")+'</td></tr></table>';
}
function cleanHTML(html){
  var t=document.createElement("template");t.innerHTML=String(html||"");
  t.content.querySelectorAll("script,style,iframe,object,embed,link,meta,form,input,button,textarea,select,base,frame,frameset,svg,math").forEach(function(n){n.remove();});
  t.content.querySelectorAll("*").forEach(function(el){Array.prototype.slice.call(el.attributes).forEach(function(a){var n=a.name.toLowerCase();if(n.indexOf("on")===0||n==="contenteditable"||n==="srcdoc"||n==="style"||((n==="href"||n==="src"||n==="xlink:href"||n==="action"||n==="formaction")&&/^\s*(javascript|data|vbscript):/i.test(a.value)))el.removeAttribute(a.name);});});
  return t.innerHTML;
}
function fillKeys(html){
  var t=document.createElement("template");t.innerHTML=html;
  t.content.querySelectorAll("[data-key]").forEach(function(el){var k=el.getAttribute("data-key");if(!LABELS[k])return;var x=S.v[k],has=x!==undefined&&String(x).trim()!=="";el.textContent=has?(FIELD_TYPE[k]==="date"?fmtD(x):x):"["+LABELS[k]+"]";el.className=has?"v-in":"ph";});
  return t.innerHTML;
}
function tplContent(kod){var o=S.ozel&&S.ozel[kod];return o?fillKeys(cleanHTML(o)):tplBody(kod);}
function isCert(kod){var d=TPL[kod];return !!(d&&d.cert);}
function certTop(){var img=logoImg(52,200);return '<div class="certtop center">'+(img?'<div class="center">'+img+'</div>':"")+'<div class="certfirm center">'+(T("unvan")?esc(T("unvan")):'<span class="ph">[Ticari unvan]</span>')+'</div></div>';}
function certFoot(kod){var d=docOf(kod)||{rev:"00"};return '<div class="certfoot">'+esc(kod)+' · Rev. '+esc(d.rev||"00")+(d.tarih?' · '+esc(fmtD(d.tarih)):"")+'</div>';}
function tplDocHTML(kod){if(isCert(kod))return '<div class="certframe">'+certTop()+'<div class="tplbody">'+tplContent(kod)+'</div>'+certFoot(kod)+'</div>';return tplHead(kod)+'<div class="tplbody">'+tplContent(kod)+'</div>';}

/* ---------- Şablonlar görünümü ---------- */
var selTpl="PR-04.01",tplQ="",tplType="",tplEdit=false;
function tplVisible(d){if(tplType&&(d.kod||"").indexOf(tplType)!==0)return false;if(tplQ){var q=tplQ.toLocaleLowerCase("tr");return ((d.kod||"")+" "+(d.ad||"")).toLocaleLowerCase("tr").indexOf(q)>=0;}return true;}
function viewSablonlar(){
  if(!docOf(selTpl)&&S.dokumanlar.length)selTpl=S.dokumanlar[0].kod;
  var list=S.dokumanlar.filter(tplVisible),nOz=Object.keys(S.ozel||{}).length;
  var groups=[["PR","Prosedürler"],["TL","Talimatlar"],["FR","Formlar"]];
  var side=groups.map(function(g){var items=list.filter(function(d){return (d.kod||"").indexOf(g[0])===0;});if(!items.length)return "";return '<div class="tl-g">'+g[1]+' <span>'+items.length+'</span></div>'+items.map(function(d){return '<button class="tl-i'+(d.kod===selTpl?" on":"")+'" data-tpl="'+esc(d.kod)+'"><span class="c">'+esc(d.kod)+'</span><span class="n">'+esc(d.ad)+'</span>'+(S.ozel&&S.ozel[d.kod]?'<span class="dot" title="Düzenlendi"></span>':"")+'</button>';}).join("");}).join("");
  var other=list.filter(function(d){var k=d.kod||"";return !/^(PR|TL|FR)/.test(k);});
  if(other.length)side+='<div class="tl-g">Diğer <span>'+other.length+'</span></div>'+other.map(function(d){return '<button class="tl-i'+(d.kod===selTpl?" on":"")+'" data-tpl="'+esc(d.kod)+'"><span class="c">'+esc(d.kod)+'</span><span class="n">'+esc(d.ad)+'</span></button>';}).join("");
  var opts=S.dokumanlar.map(function(d){return '<option value="'+esc(d.kod)+'"'+(d.kod===selTpl?" selected":"")+'>'+esc(d.kod+" · "+d.ad)+'</option>';}).join("");
  var edited=!!(S.ozel&&S.ozel[selTpl]);
  return '<div class="panel-head"><div><h2 class="ph-title">Doküman şablonları</h2><p class="lead">Doküman listesindeki her prosedür, talimat ve form için hazır şablon. Başlıktaki firma adı, doküman no, revizyon ve yayın tarihi ile metindeki sarı alanlar girdiğiniz bilgilerden otomatik dolar.</p></div><div class="legend"><span class="pill">'+S.dokumanlar.length+' şablon</span><span class="pill">'+nOz+' düzenlenmiş</span></div></div>'+
  '<div class="tpl-shell"><aside class="tpl-side"><div class="toolbar" style="margin-bottom:8px"><input type="search" id="q-tpl" placeholder="Kod veya ad ara" value="'+esc(tplQ)+'" aria-label="Şablon ara"></div><div class="seg" role="group" aria-label="Tür" style="margin-bottom:10px">'+[["","Tümü"],["PR","PR"],["TL","TL"],["FR","FR"]].map(function(o){return '<button data-ttype="'+o[0]+'" aria-pressed="'+(tplType===o[0])+'">'+o[1]+'</button>';}).join("")+'</div><div class="tl-list">'+(side||'<p class="lead">Eşleşen doküman yok.</p>')+'</div></aside>'+
  '<div class="tpl-main"><select id="tpl-pick" class="tpl-pick" aria-label="Şablon seç">'+opts+'</select>'+
  '<div class="toolbar tpl-tools"><button class="btn'+(tplEdit?" primary":"")+'" id="t-edit" aria-pressed="'+tplEdit+'">'+(tplEdit?"Düzenlemeyi bitir":"Metni düzenle")+'</button>'+(edited?'<button class="btn danger" id="t-reset">Varsayılan şablona dön</button>':"")+'<button class="btn" id="t-word">Word olarak indir</button><button class="btn" id="t-dl">HTML olarak indir</button><button class="btn primary" id="t-wzip">Tüm dokümanlar Word ZIP</button><button class="btn" id="t-zip">Tümü HTML ZIP</button>'+(edited?'<span class="pill">Düzenlendi</span>':"")+'</div>'+
  (tplEdit?'<p class="editnote">Düzenleme açık: metne tıklayıp yazabilirsiniz. Sarı ve koyu alanlar Bilgiler sekmesinden gelir; onları burada değil, Bilgiler sekmesinde değiştirin. Kaydetmek için üstteki "Kaydet"e basın.</p>':"")+
  '<article class="paper tpl-paper'+(isCert(selTpl)?" certpaper":"")+'">'+(isCert(selTpl)?'<div class="certframe">'+certTop():tplHead(selTpl))+'<div class="tplbody'+(tplEdit?" editing":"")+'" id="tpl-body"'+(tplEdit?' contenteditable="true" spellcheck="true"':"")+'>'+tplContent(selTpl)+'</div>'+(isCert(selTpl)?certFoot(selTpl)+'</div>':"")+'</article></div></div>';
}

/* ---------- Şablon dışa aktarma ---------- */
function safeName(s){var tr={"ç":"c","Ç":"C","ğ":"g","Ğ":"G","ı":"i","İ":"I","ö":"o","Ö":"O","ş":"s","Ş":"S","ü":"u","Ü":"U"};return String(s).replace(/[çÇğĞıİöÖşŞüÜ]/g,function(c){return tr[c];}).replace(/[^\w .\-()]+/g,"").replace(/[\\\/:*?"<>|]+/g,"").replace(/\s+/g," ").trim().slice(0,90);}
function tplStandalone(kod){var d=docOf(kod)||{ad:docName(kod)};return wrapDoc((T("unvan")||"Firma")+" – "+kod+" "+(d.ad||""),tplDocHTML(kod));}
var jszipP=null;
function loadJSZip(){return Promise.resolve(env.JSZip);}
async function saveFile(name,data){await env.save(name,data);}
async function zipAll(){
  setStatus("","ZIP hazırlanıyor…");
  var JSZip;try{JSZip=await loadJSZip();}catch(_){setStatus("err","ZIP aracı yüklenemedi; şablonları tek tek indirebilirsiniz");return;}
  var z=new JSZip(),dirs={PR:"1-Prosedurler",TL:"2-Talimatlar",FR:"3-Formlar"};
  z.file("0-"+safeName((T("dokKod")||"KEK-01")+" Kalite El Kitabi")+".html",standaloneHTML());
  S.dokumanlar.forEach(function(d){if(d.durum==="İptal"||!d.kod)return;var dir=dirs[d.kod.slice(0,2)]||"4-Diger";z.folder(dir).file(safeName(d.kod+" "+d.ad)+".html",tplStandalone(d.kod));});
  z.file("3-Formlar/Dokuman-listesi.csv",csvDocs());
  try{var data=await z.generateAsync({type:"uint8array",compression:"DEFLATE"});await saveFile(fileBase()+"-sablonlar.zip",data);}catch(_){setStatus("err","ZIP oluşturulamadı");}
}

/* ---------- Uygulama kayıtları: veri ve yardımcılar ---------- */
var KY_STATUS=["Planlandı","Gerçekleşti","Ertelendi","İptal"];
var YGG_GUNDEM=["Önceki YGG kararlarının durumu","Kalite hedefleri gerçekleşmesi (FR-15.04)","İç tetkik sonuçları","Onaylanmış kuruluş tetkiki ve habersiz ziyaretler","Son muayene ve deney istatistikleri ve en sık uygunsuzluklar","Periyodik kontrol etiket dağılımı","Şikayetler ve müşteri memnuniyeti","DÖF durumu","Tedarikçi performansı","Kalibrasyon ve eğitim durumu","Mevzuat / standart değişiklikleri","Kaynak ihtiyaçları","Politika ve hedeflerin uygunluğu"];
var KY_TYPES={egitim:"Eğitim",tetkik:"İç tetkik",ygg:"YGG",proje:"Montaj projesi"};
function kyInit(){if(!S.kayit||typeof S.kayit!=="object")S.kayit={};kyAllTypes().forEach(function(k){if(!Array.isArray(S.kayit[k]))S.kayit[k]=[];});}
function kyId(){return "k"+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);}
function todayISO(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function isoOf(dt){return dt.getUTCFullYear()+"-"+String(dt.getUTCMonth()+1).padStart(2,"0")+"-"+String(dt.getUTCDate()).padStart(2,"0");}
function wd(y,m,d){var dt=new Date(Date.UTC(y,m-1,d));var w=dt.getUTCDay();if(w===6)dt.setUTCDate(dt.getUTCDate()+2);if(w===0)dt.setUTCDate(dt.getUTCDate()+1);return isoOf(dt);}
function addD(iso,n){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||"");if(!m)return "";var dt=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]+n));var w=dt.getUTCDay();if(w===6)dt.setUTCDate(dt.getUTCDate()-1);if(w===0)dt.setUTCDate(dt.getUTCDate()-2);return isoOf(dt);}
var AYLAR=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
function ayOf(iso){var m=/^\d{4}-(\d{2})/.exec(iso||"");return m?+m[1]:0;}
function kyList(type,yil){return S.kayit[type].filter(function(r){return String(r.yil)===String(yil);}).sort(function(a,b){return String(a.tarih||"9").localeCompare(String(b.tarih||"9"));});}
function kyFind(type,id){var a=S.kayit[type];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;}
function kyTitle(type,r){if(KYX[type])return KYX[type].title(r);if(type==="proje")return (r.no||"Yeni montaj projesi")+(r.bina?" – "+r.bina:"");return type==="egitim"?(r.konu||"Yeni eğitim"):type==="tetkik"?(r.alan||"Yeni iç tetkik"):("Yönetimin Gözden Geçirmesi"+(r.no?" "+r.no:""));}
function kyState(r){if(r.durum==="Planlandı"&&r.tarih&&r.tarih<todayISO())return "Gecikmiş";return r.durum||"Planlandı";}
function kyPill(r){var s=kyState(r),c={"Gerçekleşti":"ok","Planlandı":"plan","Ertelendi":"warn","Gecikmiş":"warn","İptal":"bad","Kapandı":"ok","Açık":"warn"}[s]||"plan";return '<span class="st st-'+c+'">'+esc(s)+'</span>';}
function nl(s){return esc(s||"").replace(/\n/g,"<br>");}
function vv(s){return s&&String(s).trim()?nl(s):"&nbsp;";}
function kvF(pairs){return '<div class="ts"><table class="t kv info"><tbody>'+pairs.map(function(p){return '<tr><th>'+esc(p[0])+'</th><td>'+(p[1]===undefined||p[1]===""?"&nbsp;":p[1])+'</td></tr>';}).join("")+'</tbody></table></div>';}
function sigF(list){return '<div class="ts"><table class="t sig"><thead><tr>'+list.map(function(r){return "<th>"+esc(r[0])+"</th>";}).join("")+'</tr></thead><tbody><tr>'+list.map(function(r){return '<td><span class="sl">Ad Soyad:</span> '+vv(r[1])+'</td>';}).join("")+'</tr><tr>'+list.map(function(){return '<td><span class="sl">İmza:</span></td>';}).join("")+'</tr><tr>'+list.map(function(r){return '<td><span class="sl">Tarih:</span> '+(r[2]?esc(fmtD(r[2])):"")+'</td>';}).join("")+'</tr></tbody></table></div>';}
function gTarih(r){return r.gercTarih||(r.durum==="Gerçekleşti"?r.tarih:"");}

/* ---------- Duyuru numaraları ---------- */
function kyEvents(yil){
  var ev=[];
  ["egitim","tetkik","ygg"].forEach(function(t){kyList(t,yil).forEach(function(r){ev.push({type:t,r:r});});});
  return ev;
}
function duyuruNo(type,r){
  var ev=kyEvents(r.yil).filter(function(e){return e.r.durum!=="İptal";}).sort(function(a,b){var x=(a.r.duyuruTarihi||a.r.tarih||"9")+a.r.id,y=(b.r.duyuruTarihi||b.r.tarih||"9")+b.r.id;return x.localeCompare(y);});
  for(var i=0;i<ev.length;i++)if(ev[i].r.id===r.id)return "DY-"+r.yil+"-"+String(i+1).padStart(2,"0");
  return "DY-"+r.yil+"-__";
}

/* ---------- Doküman üreticileri ---------- */
function partList(arr){return (arr||[]).filter(function(p){return p.ad&&String(p.ad).trim();});}
function roleSummary(k){var o=[],c={};k.forEach(function(p){var g=String(p.gorev||"").trim()||"Diğer personel";if(!c[g]){c[g]=0;o.push(g);}c[g]++;});return o.map(function(g){return g+(c[g]>1?" ("+c[g]+")":"");}).join(", ");}
function docEgitimPlan(yil){
  var L=kyList("egitim",yil),plan=0,ger=0;
  var rows=L.map(function(r,i){var s=+String(r.sure||0).replace(",",".")||0;if(r.durum!=="İptal")plan+=s;if(r.durum==="Gerçekleşti")ger+=s;var k=partList(r.katilimcilar);return tRow([String(i+1),esc(r.konu),k.length?esc(k.length+" kişi: "+roleSummary(k)):"&nbsp;",esc([r.egitmen,r.kurum].filter(Boolean).join(" / "))||"&nbsp;",esc(r.sure)||"&nbsp;",r.tarih?AYLAR[ayOf(r.tarih)-1]:"&nbsp;",esc(fmtD(gTarih(r)))||"&nbsp;",esc(kyState(r))]);});
  return tplHead("FR-04.02")+'<div class="tplbody">'+kvF([["Yıl",esc(yil)],["Hazırlayan",PK("kyt")],["Onay tarihi",""]])+
   tTable(["No","Eğitim konusu","Katılımcılar","Eğitmen / kurum","Süre (saat)","Planlanan ay","Gerçekleşme tarihi","Durum"],rows.length?rows:blankRows(6,8))+
   '<p>Toplam planlanan: <b>'+plan+' saat</b> · Gerçekleşen: <b>'+ger+' saat</b> · Gerçekleşme oranı: <b>'+(plan?Math.round(ger/plan*100):0)+'%</b></p>'+
   sigF([["Hazırlayan (KYT)",T("kyt"),""],["Onaylayan (Genel Müdür)",T("gm"),""]])+'</div>';
}
function docEgitimKatilim(r){
  var k=partList(r.katilimcilar);var rows=k.map(function(p,i){return tRow([String(i+1),esc(p.ad),esc(p.gorev)||"&nbsp;","&nbsp;"]);});
  var res=k.map(function(p){return tRow([esc(p.ad),esc(p.puan)||"&nbsp;",esc(p.etkin)||"&nbsp;",esc(p.not)||"&nbsp;"]);});
  return tplHead("FR-04.03")+'<div class="tplbody">'+kvF([["Eğitim konusu",esc(r.konu)],["Tarih",esc(fmtD(gTarih(r)||r.tarih))+(r.saat?" · "+esc(r.saat):"")],["Süre (saat)",esc(r.sure)],["Eğitmen / kurum",esc([r.egitmen,r.kurum].filter(Boolean).join(" / "))],["Yer",esc(r.yer)]])+
   '<h3>Katılımcılar</h3>'+tTable(["No","Ad Soyad","Görev","İmza"],rows.concat(blankRows(Math.max(0,3-rows.length),4)))+
   '<h3>Eğitim içeriği</h3><p>'+vv(r.icerik)+'</p>'+
   '<h3>Etkinlik değerlendirmesi</h3>'+kvF([["Yöntem",esc(r.etkYontem)],["Değerlendirme tarihi",esc(fmtD(r.etkTarih))]])+
   tTable(["Ad Soyad","Sonuç / puan","Etkin mi? (E/H)","Etkin değilse yapılacak"],res.length?res:blankRows(4,4))+
   (r.etkSonuc?'<p><b>Genel sonuç:</b> '+nl(r.etkSonuc)+'</p>':"")+
   sigF([["Eğitmen",r.egitmen,gTarih(r)||r.tarih],["Değerlendiren",T("tm")||"",r.etkTarih],["KYT",T("kyt"),r.etkTarih]])+'</div>';
}
function docTetkikPlan(yil){
  var L=kyList("tetkik",yil);
  var rows=L.map(function(r,i){return tRow([String(i+1),esc(r.alan),esc(r.bolum)||"&nbsp;",esc(r.tetkikci)||"&nbsp;",r.tarih?esc(fmtD(r.tarih)):"&nbsp;",esc(fmtD(gTarih(r)))||"&nbsp;",r.durum==="Gerçekleşti"?esc(r.no):"&nbsp;"]);});
  return tplHead("FR-15.01")+'<div class="tplbody">'+kvF([["Yıl",esc(yil)],["Hazırlayan",PK("kyt")]])+
   tTable(["No","Tetkik edilecek alan / süreç","Kalite El Kitabı bölümü","Tetkikçi","Planlanan tarih","Gerçekleşme tarihi","Rapor no"],rows.length?rows:blankRows(8,7))+
   sigF([["Hazırlayan (KYT)",T("kyt"),""],["Onaylayan (Genel Müdür)",T("gm"),""]])+'</div>';
}
function docTetkikRapor(r){
  var b=(r.bulgular||[]).filter(function(x){return x.bulgu&&String(x.bulgu).trim();});
  var cnt={Majör:0,Minör:0,Gözlem:0};b.forEach(function(x){if(cnt[x.sinif]!==undefined)cnt[x.sinif]++;});
  return tplHead("FR-15.02")+'<div class="tplbody">'+kvF([["Rapor no",esc(r.no)],["Tetkik tarihi",esc(fmtD(gTarih(r)||r.tarih))+(r.saat?" · "+esc(r.saat):"")],["Tetkik edilen alan",esc(r.alan)+(r.bolum?" (Kalite El Kitabı Bölüm "+esc(r.bolum)+")":"")],["Tetkikçi(ler)",esc(r.tetkikci)],["Görüşülen kişiler",esc(r.gorusulen)]])+
   kvF([["Tetkik kapsamı ve incelenen kayıtlar",vv(r.kapsam)]])+
   tTable(["No","Bulgu","Şart (Kalite El Kitabı / PR / Ek X)","Sınıf","DÖF no"],b.length?b.map(function(x,i){return tRow([String(i+1),nl(x.bulgu),esc(x.sart)||"&nbsp;",esc(x.sinif)||"&nbsp;",esc(x.dof)||"&nbsp;"]);}):[tRow(["–","Bulgu tespit edilmemiştir.","&nbsp;","&nbsp;","&nbsp;"])])+
   '<p>Özet: '+cnt["Majör"]+' majör, '+cnt["Minör"]+' minör uygunsuzluk, '+cnt["Gözlem"]+' gözlem.</p>'+
   kvF([["Olumlu bulgular",vv(r.olumlu)],["Genel değerlendirme",vv(r.degerlendirme)]])+
   sigF([["Tetkikçi",r.tetkikci,gTarih(r)||r.tarih],["Bölüm yöneticisi",r.gorusulen?String(r.gorusulen).split(",")[0]:"",gTarih(r)||r.tarih],["KYT",T("kyt"),gTarih(r)||r.tarih]])+'</div>';
}
function docYgg(r){
  var k=partList(r.katilimcilar),g=(r.gundem||[]),kr=(r.kararlar||[]).filter(function(x){return x.karar&&String(x.karar).trim();});
  return tplHead("FR-15.03")+'<div class="tplbody">'+kvF([["Toplantı no",esc(r.no)],["Toplantı tarihi",esc(fmtD(gTarih(r)||r.tarih))+(r.saat?" · "+esc(r.saat):"")],["Yer",esc(r.yer)]])+
   tTable(["Katılımcı","Görev","İmza"],k.length?k.map(function(p){return tRow([esc(p.ad),esc(p.gorev)||"&nbsp;","&nbsp;"]);}):blankRows(4,3))+
   tTable(["Gündem maddesi (girdi)","Değerlendirme"],g.map(function(x){return tRow([esc(x.madde),vv(x.degerlendirme)]);}))+
   '<h3>Kararlar</h3>'+tTable(["No","Karar","Sorumlu","Termin","Durum"],kr.length?kr.map(function(x,i){return tRow([String(i+1),nl(x.karar),esc(x.sorumlu)||"&nbsp;",esc(fmtD(x.termin))||"&nbsp;",esc(x.durum)||"&nbsp;"]);}):blankRows(5,5))+
   sigF([["KYT",T("kyt"),gTarih(r)||r.tarih],["Genel Müdür",T("gm"),gTarih(r)||r.tarih]])+'</div>';
}
function duyuruHead(no,tarih,konu){return '<table class="dochead"><tr><td class="firm" rowspan="3">'+firmCellHTML()+'</td><td class="title" rowspan="3"><small>DUYURU</small>'+esc(konu)+'</td><td class="k">Duyuru no</td><td class="v">'+esc(no)+'</td></tr><tr><td class="k">Duyuru tarihi</td><td class="v">'+(tarih?esc(fmtD(tarih)):'<span class="ph">[tarih]</span>')+'</td></tr><tr><td class="k">Hazırlayan</td><td class="v">KYT</td></tr></table>';}
function docDuyuru(type,r){
  var no=duyuruNo(type,r),ts=esc(fmtD(r.tarih))+(r.saat?" (saat "+esc(r.saat)+")":"");
  if(type==="egitim"){var k=partList(r.katilimcilar);
    return duyuruHead(no,r.duyuruTarihi,"Eğitim Duyurusu")+'<div class="tplbody"><p>Sayın ilgililer,</p><p>Yıllık Eğitim Planı (FR-04.02) kapsamında <b>'+ts+'</b> tarihinde <b>'+esc(r.yer||"[yer]")+'</b>\'de "<b>'+esc(r.konu)+'</b>" konulu eğitim düzenlenecektir. Aşağıda adı geçen personelin eğitime katılımı zorunludur.</p>'+
     kvF([["Eğitim konusu",esc(r.konu)],["Tarih ve saat",ts],["Süre",r.sure?esc(r.sure)+" saat":""],["Yer",esc(r.yer)],["Eğitmen / kurum",esc([r.egitmen,r.kurum].filter(Boolean).join(" / "))],["İçerik",vv(r.icerik)]])+
     '<h3>Katılımcılar</h3>'+tTable(["No","Ad Soyad","Görev","Tebliğ imzası"],k.length?k.map(function(p,i){return tRow([String(i+1),esc(p.ad),esc(p.gorev)||"&nbsp;","&nbsp;"]);}):blankRows(5,4))+
     '<p>Katılım, Eğitim Katılım ve Etkinlik Formu (FR-04.03) ile kayıt altına alınacaktır. Katılamayacak personelin en geç bir iş günü önce Kalite Yönetim Temsilcisi\'ne bilgi vermesi gerekir.</p><p class="note">Dağıtım: katılımcılar, bölüm yöneticileri, ilan panosu</p>'+
     sigF([["Hazırlayan (KYT)",T("kyt"),r.duyuruTarihi],["Onaylayan (Genel Müdür)",T("gm"),r.duyuruTarihi]])+'</div>';}
  if(type==="tetkik"){
    return duyuruHead(no,r.duyuruTarihi,"İç Tetkik Duyurusu")+'<div class="tplbody"><p>Sayın ilgililer,</p><p>Yıllık İç Tetkik Planı (FR-15.01) kapsamında <b>'+ts+'</b> tarihinde "<b>'+esc(r.alan)+'</b>" alanında iç tetkik yapılacaktır.</p>'+
     kvF([["Tetkik edilecek alan",esc(r.alan)],["Kalite El Kitabı bölümü",esc(r.bolum)],["Tarih ve saat",ts],["Tetkikçi",esc(r.tetkikci)],["Görüşülecek kişiler",esc(r.gorusulen)],["Kapsam",vv(r.kapsam)]])+
     '<p>Tetkik edilecek bölümün ilgili prosedür, form ve kayıtlarını tetkik sırasında hazır bulundurması, sorumlu personelin tetkik süresince ulaşılabilir olması rica olunur. Tetkik açılış toplantısıyla başlayıp kapanış toplantısıyla sona erecek, bulgular İç Tetkik Raporu (FR-15.02) ile bildirilecektir.</p><p class="note">Dağıtım: tetkik edilen bölüm, tetkikçi, Genel Müdür</p>'+
     sigF([["Hazırlayan (KYT)",T("kyt"),r.duyuruTarihi],["Onaylayan (Genel Müdür)",T("gm"),r.duyuruTarihi]])+'</div>';}
  var k2=partList(r.katilimcilar);
  return duyuruHead(no,r.duyuruTarihi,"Yönetimin Gözden Geçirmesi Toplantı Daveti")+'<div class="tplbody"><p>Sayın ilgililer,</p><p>Yönetimin Gözden Geçirmesi toplantısı <b>'+ts+'</b> tarihinde <b>'+esc(r.yer||"[yer]")+'</b>\'de Genel Müdür başkanlığında yapılacaktır.</p>'+
   '<h3>Katılımcılar</h3>'+tTable(["Ad Soyad","Görev"],k2.length?k2.map(function(p){return tRow([esc(p.ad),esc(p.gorev)||"&nbsp;"]);}):blankRows(4,2))+
   '<h3>Gündem</h3><ol>'+(r.gundem||[]).map(function(x){return "<li>"+esc(x.madde)+"</li>";}).join("")+'</ol>'+
   '<p>Her bölüm yöneticisinin kendi alanına ait verileri'+(r.girdiSon?' en geç <b>'+esc(fmtD(r.girdiSon))+'</b> tarihine kadar':'')+' Kalite Yönetim Temsilcisi\'ne iletmesi rica olunur. Toplantı kararları YGG Tutanağı (FR-15.03) ile kayıt altına alınacaktır.</p><p class="note">Dağıtım: katılımcılar</p>'+
   sigF([["Hazırlayan (KYT)",T("kyt"),r.duyuruTarihi],["Onaylayan (Genel Müdür)",T("gm"),r.duyuruTarihi]])+'</div>';
}
function docTakvim(yil){
  var ev=kyEvents(yil).sort(function(a,b){return String(a.r.tarih||"9").localeCompare(String(b.r.tarih||"9"));});
  var rows=[];var cur=-1;ev.forEach(function(e){var m=ayOf(e.r.tarih);if(m!==cur){cur=m;rows.push('<tr class="grp"><td colspan="6">'+(m?AYLAR[m-1]:"Tarihsiz")+'</td></tr>');}
    var sor=e.type==="egitim"?(e.r.egitmen||""):e.type==="tetkik"?(e.r.tetkikci||""):"Genel Müdür / KYT";
    rows.push(tRow([esc(fmtD(e.r.tarih))||"&nbsp;",esc(KY_TYPES[e.type]),esc(kyTitle(e.type,e.r)),esc(sor)||"&nbsp;",esc(fmtD(e.r.duyuruTarihi))||"&nbsp;",esc(kyState(e.r))]));});
  return '<table class="dochead"><tr><td class="firm">'+firmCellHTML()+'</td><td class="title"><small>KALİTE SİSTEMİ</small>'+esc(yil)+' Yıllık Faaliyet Takvimi</td></tr></table><div class="tplbody">'+
   tTable(["Tarih","Faaliyet","Konu","Sorumlu / eğitmen","Duyuru tarihi","Durum"],rows.length?rows:blankRows(6,6))+
   sigF([["Hazırlayan (KYT)",T("kyt"),""],["Onaylayan (Genel Müdür)",T("gm"),""]])+'</div>';
}

/* ---------- Örnek kayıt üretici ---------- */
var SAMPLE_NAMES={gm:"Kemal Aydın",kyt:"Elif Şahin",tm:"Murat Kaya",smd:"Burak Çelik",sef:"Hasan Yıldız",bakimSefi:"Serkan Arslan",satin:"Zeynep Koç",isg:"Ayşe Demir"};
var SAMPLE_ROLE={gm:"Genel Müdür",kyt:"Kalite Yönetim Temsilcisi",tm:"Teknik Müdür",smd:"Son Muayene ve Deney Sorumlusu",sef:"Montaj Şantiye Şefi",bakimSefi:"Bakım ve Revizyon Şefi",satin:"Satın Alma ve Depo Sorumlusu",isg:"İSG Uzmanı"};
var SAMPLE_TECH=[["Emre Öztürk","Montaj Teknisyeni"],["Oğuz Kılıç","Montaj Teknisyeni"],["Fatih Aksoy","Bakım Teknisyeni"],["Cem Doğan","Bakım Teknisyeni"]];
function nm(k){return T(k)||SAMPLE_NAMES[k];}
function pp(k){return {ad:nm(k),gorev:SAMPLE_ROLE[k]};}
function techs(f){return SAMPLE_TECH.filter(function(t){return !f||t[1].indexOf(f)>=0;}).map(function(t){return {ad:t[0],gorev:t[1]};});}
function withRes(list,fill,base){return list.map(function(p,i){var o={ad:p.ad,gorev:p.gorev,puan:"",etkin:"",not:""};if(fill){o.puan=String(base+((i*7)%15));o.etkin="E";}return o;});}
function kyOrnek(yil,fill){
  yil=+yil;var y=String(yil);
  ["egitim","tetkik","ygg"].forEach(function(t){S.kayit[t]=S.kayit[t].filter(function(r){return String(r.yil)!==y;});});
  S.kayit.proje=(S.kayit.proje||[]).filter(function(r){return !(String(r.yil)===y&&r.ornek);});S.kayit.proje.push(prjSample(yil,fill));
  var tm=nm("tm"),kyt=nm("kyt"),bk=nm("bakimSefi"),isg="OSGB İSG uzmanı";
  var saha=[pp("sef"),pp("smd"),pp("bakimSefi")].concat(techs());
  var E=[
   {konu:"Kalite El Kitabı, prosedürler ve Modül E şartları",d:[1,15],saat:"09:30",sure:"4",yer:"Merkez ofis toplantı salonu",egitmen:kyt,kurum:"İç eğitim",kat:[pp("tm"),pp("smd"),pp("sef"),pp("bakimSefi"),pp("satin")].concat(techs()),icerik:"Kalite politikası ve hedefler; Kalite El Kitabı bölümleri; doküman ve kayıt kontrolü; son muayene ve deney sistemi; uygunsuzluk ve DÖF süreci; onaylanmış kuruluş tetkik ve habersiz ziyaret beklentileri.",yon:"Sınav",base:78},
   {konu:"İç tetkikçi eğitimi (TS EN ISO 19011 esasları)",d:[1,22],saat:"09:00",sure:"8",yer:"Merkez ofis toplantı salonu",egitmen:"Dış eğitmen",kurum:"Belgelendirme eğitim kurumu",kat:[pp("kyt"),pp("tm"),pp("bakimSefi")],icerik:"Tetkik ilkeleri, planlama, kontrol listesi hazırlama, kanıt toplama, bulgu yazma ve sınıflandırma, kapanış toplantısı, DÖF takibi.",yon:"Sınav",base:80},
   {konu:"İSG temel eğitimi (çok tehlikeli sınıf)",d:[2,10],saat:"09:00",sure:"16",yer:"Merkez ofis toplantı salonu",egitmen:isg,kurum:"OSGB",kat:saha,icerik:"Genel konular, sağlık konuları, teknik konular; asansör montajına özgü riskler; kişisel koruyucu donanım; acil durum ve ilk yardım.",yon:"Sınav",base:76},
   {konu:"Yüksekte çalışma ve kuyu içi güvenlik",d:[3,12],saat:"09:00",sure:"8",yer:"Eğitim kurumu uygulama alanı",egitmen:"Uygulama eğitmeni",kurum:"Yetkili eğitim kurumu",kat:[pp("sef")].concat(techs()),icerik:"Tam vücut kemeri ve ankraj kullanımı, kuyuda düşmeye karşı önlemler, kat kapısı boşluk korumaları, kabin üstü çalışma kuralları.",yon:"Gözetimli uygulama",base:82},
   {konu:"Elektrik güvenliği ve kilitle-etiketle (LOTO)",d:[4,16],saat:"13:30",sure:"4",yer:"Depo / atölye",egitmen:tm,kurum:"İç eğitim",kat:[pp("sef"),pp("smd"),pp("bakimSefi")].concat(techs()),icerik:"Enerji izolasyonu, kilit ve etiket uygulaması, gerilim yokluğu kontrolü, sürücü kondansatör deşarjı, yalıtım ölçümünde güvenlik.",yon:"Gözetimli uygulama",base:80},
   {konu:"Acil kurtarma uygulaması (makine daireli ve makine dairesiz)",d:[5,14],saat:"10:00",sure:"4",yer:"Örnek MRL ve MR asansör şantiyesi",egitmen:bk,kurum:"İç eğitim",kat:[pp("sef")].concat(techs()),icerik:"TL-14.01 ve TL-14.02 adımları; fren açma ve el çarkı kullanımı; kurtarma panosu; iki kişi kuralı; kurtarma kaydı (FR-14.02).",yon:"Gözetimli uygulama",base:84},
   {konu:"TS EN 81-20/50 son muayene ve deney uygulamaları",d:[6,11],saat:"09:00",sure:"8",yer:"Merkez ofis ve deney şantiyesi",egitmen:tm,kurum:"İç eğitim",kat:[pp("smd"),pp("sef"),pp("bakimSefi")].concat(techs("Montaj")),icerik:"Son Muayene ve Deney Formu (FR-09.01) kalemleri; fren, traksiyon, paraşüt, tampon, UCMP ve statik deneyler; ölçüm cihazlarının kullanımı ve kayıt kuralları.",yon:"Gözetimli uygulama",base:79},
   {konu:"Mevzuat ve standart değişiklikleri bilgilendirmesi",d:[11,5],saat:"15:00",sure:"2",yer:"Merkez ofis toplantı salonu",egitmen:kyt,kurum:"İç eğitim",kat:[pp("tm"),pp("smd"),pp("sef"),pp("bakimSefi"),pp("satin")],icerik:"Yıl içinde değişen yönetmelik ve standartlar, dış kaynaklı doküman listesi (FR-05.03) güncellemeleri ve etkilenen talimatlar.",yon:"İş sonuçlarının değerlendirilmesi",base:85}
  ];
  E.forEach(function(e){var t=wd(yil,e.d[0],e.d[1]);S.kayit.egitim.push({id:kyId(),yil:y,ornek:true,konu:e.konu,tarih:t,saat:e.saat,sure:e.sure,yer:e.yer,egitmen:e.egitmen,kurum:e.kurum,durum:fill?"Gerçekleşti":"Planlandı",gercTarih:fill?t:"",duyuruTarihi:addD(t,-7),icerik:e.icerik,etkYontem:e.yon,etkTarih:fill?addD(t,30):"",etkSonuc:fill?"Tüm katılımcılar başarılı bulunmuş, eğitim etkin değerlendirilmiştir.":"",katilimcilar:withRes(e.kat,fill,e.base)});});
  var A=[
   ["Doküman ve kayıt kontrolü","5",tm,[2,17],kyt,"FR-05.02 doküman ana listesi, FR-05.03 dış kaynaklı doküman listesi, sahadaki 3 talimatın revizyon kontrolü.",[["FR-05.03 dış kaynaklı doküman listesinde TS EN 81-20 sürüm tarihi güncellenmemiş.","Kalite El Kitabı 5.2 / PR-05.01","Minör"]]],
   ["Organizasyon, eğitim ve yetkinlik","4",kyt,[3,10],nm("gm")+", İdari İşler","Yetki matrisi (FR-04.04), 6 personel dosyası, eğitim katılım ve etkinlik kayıtları.",[["Bir bakım teknisyeninin yüksekte çalışma eğitim sertifikasının geçerlilik süresi dolmuş.","Kalite El Kitabı 4.3 / PR-04.01","Minör"]]],
   ["Tip sertifikası uyumu ve teknik dosya","6",kyt,[3,24],tm,"Son 3 projenin FR-06.01 varyant kontrol listeleri, hesaplar ve proje değişiklik formları.",[]],
   ["Satın alma ve giriş kontrolü","7",kyt,[4,14],nm("satin"),"Onaylı tedarikçi listesi, 2 güvenlik aksamı tedarikçisinin değerlendirmesi, 5 giriş kontrol formu.",[["Bir kat kapısı kilidi teslimatında AB uygunluk beyanı giriş kontrol formuna eklenmemiş.","Kalite El Kitabı 7.3 / PR-07.01","Minör"]]],
   ["Montaj şantiyesi 1","8",kyt,[5,19],nm("sef"),"Şantiye dosyası, FR-08.01–08.07 ara kontrol formları, malzeme izlenebilirliği, İSG uygulamaları.",[["Günlük montaj defterinde 2 güne ait kayıt bulunmuyor.","Kalite El Kitabı 8.3 / PR-08.01","Minör"]]],
   ["Son muayene ve deney (dosya ve tanıklık)","9",kyt,[6,16],nm("smd"),"Bu yıl içerisinde piyasaya arz edilmiş 1 asansörün teknik dosyası ve Son Muayene ve Deney Formu; bir paraşüt deneyine tanıklık.",[["Bir Son Muayene ve Deney Formu'nda G7 acil aydınlatma kaleminde ölçüm değeri yerine 'uygun' yazılmış.","Kalite El Kitabı 9.4 / PR-09.01","Minör"]]],
   ["Ölçme ve test ekipmanları","10",kyt,[7,14],nm("smd"),"FR-10.01 kalibrasyon planı, 14 cihazın etiket ve sertifika kontrolü.",[["Bir lüksmetrenin kalibrasyon etiketi okunamıyor; sertifikası geçerli.","Kalite El Kitabı 10.2 / PR-10.01","Gözlem"]]],
   ["Montaj şantiyesi 2","8",kyt,[8,20],nm("sef"),"Şantiye dosyası, ray ve kapı ara kontrolleri, güvenlik aksamı seri numaraları.",[["Bir katta kapı boşluk bariyeri gevşek bağlanmış.","Kalite El Kitabı 16.1 / TL-16.01","Gözlem"]]],
   ["Uygunsuzluk, DÖF ve şikayetler","11",tm,[9,15],kyt,"Açık ve kapalı DÖF'ler, şikayet kayıtları, eğilim analizi.",[["Kapatılan 2 DÖF'te etkinlik doğrulama yöntemi açık yazılmamış.","Kalite El Kitabı 11.3 / PR-11.02","Gözlem"]]],
   ["CE, AB Uygunluk Beyanı ve teslim","12",kyt,[9,29],tm,"3 asansörün CE etiket talebi, AB UB ve teslim tutanakları.",[]],
   ["Revizyon","13",kyt,[10,13],bk,"2 revizyon projesinin FR-13.01, FR-13.02 ve FR-13.03 kayıtları.",[["Bir revizyon değerlendirme formunda gerekçe bölümü boş bırakılmış.","Kalite El Kitabı 13.2 / PR-13.01","Minör"]]],
   ["Bakım ve kurtarma","14",kyt,[11,10],bk,"10 asansörün bakım formları, arıza kayıtları, müdahale süreleri.",[["İki aylık bakım formunda bina sorumlusu imzası eksik.","Kalite El Kitabı 14.2 / PR-14.01","Minör"]]],
   ["İSG uygulamaları","16",kyt,[11,24],nm("sef")+", OSGB İSG uzmanı","Risk değerlendirmesi, KKD zimmetleri, saha İSG denetimleri.",[["Bir şantiyede ilk yardım çantası malzeme listesi güncel değil.","Kalite El Kitabı 16.1 / TL-16.01","Gözlem"]]]
  ];
  var dof=0;
  A.forEach(function(a,i){var t=wd(yil,a[3][0],a[3][1]);var bul=fill?a[6].map(function(b){var o={bulgu:b[0],sart:b[1],sinif:b[2],dof:""};if(b[2]!=="Gözlem"){dof++;o.dof="DÖF-"+y+"-"+String(dof).padStart(2,"0");}return o;}):[];
    S.kayit.tetkik.push({id:kyId(),yil:y,ornek:true,no:"IT-"+y+"-"+String(i+1).padStart(2,"0"),alan:a[0],bolum:a[1],tetkikci:a[2],tarih:t,saat:"10:00",durum:fill?"Gerçekleşti":"Planlandı",gercTarih:fill?t:"",duyuruTarihi:addD(t,-7),gorusulen:a[4],kapsam:a[5],bulgular:bul,olumlu:fill?"Kayıtlar düzenli tutuluyor; personel ilgili prosedürleri biliyor.":"",degerlendirme:fill?(bul.length?"Süreç genel olarak etkin işliyor; bulgular için DÖF açılmıştır.":"Süreç etkin işliyor; uygunsuzluk tespit edilmemiştir."):""});});
  var yt=wd(yil,12,8);
  var nE=S.kayit.egitim.filter(function(r){return r.yil===y;}).length,nA=A.length;
  var nMin=0,nGoz=0;A.forEach(function(a){a[6].forEach(function(b){if(b[2]==="Gözlem")nGoz++;else nMin++;});});
  var ev=fill?["Önceki YGG kararlarının tamamı kapatılmıştır.","11 hedeften 9'u sağlanmıştır; ilk kontrolde yeşil etiket oranı %82 (hedef %85) ve ortalama müdahale süresi 64 dk (hedef 60 dk) ile hedefin altında kalmıştır.",nA+" iç tetkik planlandığı gibi tamamlanmış; majör bulgu yok, "+nMin+" minör uygunsuzluk ve "+nGoz+" gözlem tespit edilmiştir.","Onaylanmış kuruluş gözetim tetkikinde majör bulgu çıkmamış; habersiz şantiye ziyareti uygunsuzluksuz tamamlanmıştır.","Son Muayene ve Deney Formu ilk seferde geçiş oranı %91; en sık uygunsuzluk kapı aralıkları ve kilit kavraması.","Periyodik kontrollerde yeşil %82, sarı %15, kırmızı %3; sarı etiket bulguları süresinde giderilmiştir.","Yıl içinde 6 şikayet alınmış, tamamı süresinde sonuçlandırılmış; memnuniyet anketi ortalaması 4,4.","Açılan "+nMin+" DÖF'ün tamamı termininde kapatılmış, etkinlik doğrulamaları yapılmıştır.","Güvenlik aksamı tedarikçilerinin tamamı onaylı; bir genel malzeme tedarikçisi şartlı onaylı.","Kalibrasyon planı %100 uygulanmış; "+nE+" planlı eğitimin tamamı gerçekleşmiştir.","TS EN 81-20 ve ilgili standartlardaki değişiklikler değerlendirilmiş, FR-05.03 güncellenmiştir.","Bakım ekibine bir teknisyen ve bir servis aracı ihtiyacı belirlenmiştir.","Kalite politikası uygun bulunmuş; müdahale süresi hedefi korunmuştur."]:YGG_GUNDEM.map(function(){return "";});
  S.kayit.ygg.push({id:kyId(),yil:y,ornek:true,no:"YGG-"+y+"-01",tarih:yt,saat:"10:00",yer:"Merkez ofis toplantı salonu",durum:fill?"Gerçekleşti":"Planlandı",gercTarih:fill?yt:"",duyuruTarihi:addD(yt,-10),girdiSon:addD(yt,-3),
   katilimcilar:[pp("gm"),pp("kyt"),pp("tm"),pp("bakimSefi"),pp("smd")].map(function(p){return {ad:p.ad,gorev:p.gorev};}),
   gundem:YGG_GUNDEM.map(function(m,i){return {madde:m,degerlendirme:ev[i]};}),
   kararlar:fill?[{karar:"Bakım ekibine bir teknisyen alınması ve bir servis aracı tahsis edilmesi.",sorumlu:nm("gm"),termin:wd(yil+1,2,27),durum:"Açık"},{karar:"Kapı aralığı ve kilit kavraması uygunsuzlukları için TL-08.07'nin revize edilip montaj ekiplerine yeniden eğitim verilmesi.",sorumlu:tm,termin:wd(yil+1,1,30),durum:"Açık"},{karar:"Ortalama müdahale süresini düşürmek için bölgesel nöbet listesinin oluşturulması.",sorumlu:bk,termin:wd(yil+1,1,16),durum:"Açık"},{karar:(yil+1)+" yılı eğitim ve iç tetkik planlarının Ocak ayının ilk haftasında yayınlanması.",sorumlu:kyt,termin:wd(yil+1,1,9),durum:"Açık"},{karar:"Kalite hedeflerinin "+(yil+1)+" yılı için aynı değerlerle sürdürülmesi.",sorumlu:nm("gm"),termin:wd(yil+1,1,9),durum:"Açık"}]:[]});
}

/* ---------- Marka / model kataloğu (Türkiye pazarında yaygın) ---------- */
var MARKA_KAT=[
 ["kapi",/kapı|kilit|operatör/i,"Kapı, kilit ve operatör",["Fermator / Elite MR","Fermator / 50/11 MEGA","Fupa Lift / Fermator lisanslı kapı","Wittur / Hydra Plus","Sematic / Otomatik kapı"]],
 ["regulator",/regülatör/i,"Aşırı hız regülatörü",["Dynatech / LBD-200","Wittur / Hız regülatörü","Akis / Hız regülatörü","PFB / Hız regülatörü","Montanari / Hız regülatörü"]],
 ["parasut",/paraşüt/i,"Paraşüt",["Dynatech / Kaymalı paraşüt","Wittur / Kaymalı paraşüt","Akis / Kaymalı paraşüt","PFB / Kaymalı paraşüt"]],
 ["tampon",/tampon/i,"Tampon",["Wittur / Poliüretan tampon","Oleo International / Hidrolik tampon","Akis / Poliüretan tampon"]],
 ["ucmp",/ucmp|yukarı yön/i,"UCMP / yukarı yön koruması",["Montanari / MGX çift devreli fren","Ziehl-Abegg / ZAtop çift devreli fren","Torin Drive / GETM çift devreli fren","Dynatech / Çift yönlü paraşüt"]],
 ["motor",/tahrik|makine|motor/i,"Tahrik makinesi",["Montanari / MGX","Ziehl-Abegg / ZAtop SM160","Ziehl-Abegg / ZAtop SM200","Torin Drive / GETM 3.0","Sicor / Dişlisiz makine","Eker Makine / Dişlisiz makine","Alberto Sassi / Dişlisiz makine"]],
 ["pano",/kumanda|pano|sürücü|pessral|elektronik|güvenlik devresi/i,"Kumanda ve sürücü",["Arkel / ARCODE","Arkel / ARCODE – ADrive","Aybey Elektronik / Kumanda kartı","Mik-El / Kumanda kartı","AKIS / Kumanda kartı","Yaskawa / L1000A (sürücü)","Fuji Electric / FRENIC-Lift (sürücü)","KEB / COMBIVERT F5 (sürücü)","Gefran / ADL300 (sürücü)"]],
 ["ray",/ray/i,"Ray",["Monteferro / T89/B – T70/B","Monteferro / T75/B – T50/A","Savera / T89/B – T70/B","Marazzi / T89/B – T70/B"]],
 ["halat",/halat|kayış/i,"Halat / kayış",["Gustav Wolf / Ø8 mm 8×19S","Pfeifer / Ø8 mm 8×19W","Teufelberger / Ø8 mm","Brugg Lifting / Ø8 mm","Çelik Halat ve Tel San. / Ø8 mm 8×19S"]],
 ["alarm",/alarm|iletişim/i,"Alarm ve iki yönlü iletişim",["Safeline / MX2"]],
 ["buton",/buton|gösterge/i,"Butonyer ve gösterge",["Yerli imalat / Paslanmaz butonyer"]],
 ["kablo",/kablo/i,"Kablo",["Yerli imalat / Hazır kablo seti"]],
 ["kabin",/kabin|karkas|karşı ağırlık/i,"Kabin ve karşı ağırlık",["Fupa Lift / Kabin","Yerli imalat / Paslanmaz kabin","Yerli imalat / Karşı ağırlık"]]];
var MALZ_LIST=["Tahrik makinesi (dişlisiz)","Kumanda panosu ve sürücü","Kabin ve karşı ağırlık rayları","Halat","Kabin ve karkas","Paraşüt","Karşı ağırlık ve dolgu","Kat kapıları ve kilitleri","Kabin kapısı ve operatör","Aşırı hız regülatörü","Tamponlar","UCMP aksamı","Kuyu kabloları ve askı kablosu","Butonyerler ve göstergeler","Alarm / iki yönlü iletişim cihazı"];
var AKSAM_LIST=["Kat kapısı kilitleri","Kabin kapısı kilidi","Kabin paraşütü","Karşı ağırlık paraşütü","Aşırı hız regülatörü","Kabin tamponu","Karşı ağırlık tamponu","UCMP aksamı","Yukarı yön aşırı hız koruması","Güvenlik devresi elektronik elemanı / PESSRAL"];
function markaCat(t){t=String(t||"");for(var i=0;i<MARKA_KAT.length;i++)if(MARKA_KAT[i][1].test(t))return MARKA_KAT[i][0];return "all";}
function kyDl(type,key,col,row){if(type!=="proje")return "";if((key==="satinalma"||key==="kalite")&&col==="marka")return "dl-m-"+markaCat(row.malzeme||row.aksam);if(key==="satinalma"&&col==="tedarikci")return "dl-ted";if(key==="satinalma"&&col==="malzeme")return "dl-malz";if(key==="kalite"&&col==="aksam")return "dl-aksam";return "";}
function kyDatalists(){
  var learned={all:{}};MARKA_KAT.forEach(function(c){learned[c[0]]={};c[3].forEach(function(v){learned[c[0]][v]=1;learned.all[v]=1;});});
  (S.kayit.proje||[]).forEach(function(p){(p.satinalma||[]).concat(p.kalite||[]).forEach(function(x){var v=String(x.marka||"").trim();if(!v)return;var c=markaCat(x.malzeme||x.aksam);(learned[c]=learned[c]||{})[v]=1;learned.all[v]=1;});});
  var ted={};(S.kayit.tedarikci||[]).forEach(function(t){if(t.firma&&t.sonuc!=="Onaysız")ted[t.firma]=1;});(S.kayit.proje||[]).forEach(function(p){(p.satinalma||[]).forEach(function(x){if(x.tedarikci)ted[x.tedarikci]=1;});});
  function dl(id,vals){return '<datalist id="'+id+'">'+vals.map(function(v){return '<option value="'+esc(v)+'">';}).join("")+'</datalist>';}
  return '<div hidden>'+Object.keys(learned).map(function(k){return dl("dl-m-"+k,Object.keys(learned[k]).sort(function(a,b){return a.localeCompare(b,"tr");}));}).join("")+dl("dl-ted",Object.keys(ted))+dl("dl-malz",MALZ_LIST)+dl("dl-aksam",AKSAM_LIST)+'</div>';
}
/* ---------- Montaj projesi (izlenebilirlik) kayıtları ---------- */
var PRJ_DOCS=[["ozet","İzlenebilirlik özeti"],["teklif","FR-06.01 Teklif ve sözleşme"],["satin","FR-07.03 Satın alma"],["giris","FR-07.04 Giriş kontrol"],["izl","FR-07.05 İzlenebilirlik"],["montaj","FR-08.11 Montaj kayıtları"],["ce","FR-12.01 CE etiket"],["abub","FR-12.02 AB Uygunluk Beyanı"],["teslim","FR-12.03 Teslim"],["anket","FR-11.04 Memnuniyet anketi"]];
var PRJ_DEF={f:[
  ["_h","Teklif ve sözleşme","head"],
  ["no","Proje / seri no","text"],["musteri","Müşteri / bina sahibi","text"],["bina","Bina adı","text"],["adres","Bina adresi","text","wide"],["binaSor","Bina sorumlusu / telefon","text"],
  ["teklifNo","Teklif no","text"],["teklifTarih","Teklif tarihi","date"],["sozlesmeNo","Sözleşme no","text"],["tarih","Sözleşme tarihi","date"],["teslimSure","Sözleşmedeki teslim süresi","text"],["garanti","Garanti / bakım taahhüdü","text"],["durum","Durum","status"],
  ["_h2","Asansör","head"],
  ["tip","Asansör tipi","text","wide"],["yuk","Beyan yükü (kg) / kişi","text"],["hiz","Beyan hızı (m/s)","text"],["durak","Durak / giriş sayısı","text"],["hm","Hareket mesafesi (m)","text"],["tipSert","AB tip inceleme sertifika no","text"],["montajYili","Montaj yılı","text"],
  ["_h3","Montaj ve piyasaya arz","head"],
  ["sef","Şantiye şefi","text"],["ekip","Montaj ekibi","text","wide"],["montajBas","Montaj başlangıç","date"],["montajBit","Montaj bitiş","date"],["smTarih","Son muayene ve deney tarihi","date"],["ceTarih","CE etiket tarihi","date"],["abubTarih","AB Uygunluk Beyanı tarihi","date"],["teslimTarih","Teslim tarihi","date"],["arzTarih","Piyasaya arz bildirim tarihi","date"],["notlar","Notlar","textarea","wide"]],
 arr:[
  ["parametreler","Sözleşme öncesi varyant kontrolü (FR-06.01)",[["parametre","Parametre","text"],["aralik","Sertifikadaki aralık","text"],["deger","Proje değeri","text"],["uygun","Uygun","select:|E|H"]],{parametre:"",aralik:"",deger:"",uygun:""}],
  ["satinalma","Satın alma (FR-07.03)",[["malzeme","Malzeme","text"],["marka","Marka / tip","text"],["miktar","Miktar","text"],["tedarikci","Tedarikçi","text"],["siparisNo","Sipariş no","text"],["siparisTarih","Sipariş tarihi","date"],["irsaliye","İrsaliye no","text"],["gelisTarih","Geliş tarihi","date"]],{malzeme:"",marka:"",miktar:"",tedarikci:"",siparisNo:"",siparisTarih:"",irsaliye:"",gelisTarih:""}],
  ["kalite","Kalite kontrol – güvenlik aksamı giriş kontrolü ve izlenebilirlik (FR-07.04 / FR-07.05)",[["aksam","Aksam","text"],["marka","Marka / tip","text"],["seriNo","Seri no","text"],["sertNo","AB tip inceleme sertifika no","text"],["gecerlilik","Sertifika geçerlilik","date"],["kurulusNo","Onaylanmış kuruluş no","text"],["sonuc","Giriş kontrol","select:|Kabul|Red"],["kontrolTarih","Kontrol tarihi","date"]],{aksam:"",marka:"",seriNo:"",sertNo:"",gecerlilik:"",kurulusNo:"",sonuc:"",kontrolTarih:""}],
  ["montaj","Montaj ve kontrol kayıtları",[["form","Form","text"],["asama","Aşama","text"],["tarih","Tarih","date"],["kontrol","Kontrol eden","text"],["sonuc","Sonuç","select:|Uygun|Uygun değil"],["not","Not","text"]],{form:"",asama:"",tarih:"",kontrol:"",sonuc:"",not:""}]],
 docs:PRJ_DOCS};
var CHK="☒",UNCHK="☐";
function prjHead(title,sub){return '<table class="dochead"><tr><td class="firm">'+firmCellHTML()+'</td><td class="title"><small>'+esc(sub)+'</small>'+esc(title)+'</td></tr></table>';}
function prjInfo(r,extra){return kvGrid2([["Proje / seri no",esc(r.no)],["Bina",esc([r.bina,r.adres].filter(Boolean).join(" – "))]].concat(extra||[]));}
function kvGrid2(pairs){var rows=[];for(var i=0;i<pairs.length;i+=2){var a=pairs[i],b=pairs[i+1];rows.push('<tr><th>'+esc(a[0])+'</th>'+(b?'<td>'+(a[1]||"&nbsp;")+'</td><th>'+esc(b[0])+'</th><td>'+(b[1]||"&nbsp;")+'</td>':'<td colspan="3">'+(a[1]||"&nbsp;")+'</td>')+'</tr>');}return '<div class="ts"><table class="t kv2 info" data-w="22,30,22,26"><colgroup><col style="width:22%"><col style="width:30%"><col style="width:22%"><col style="width:26%"></colgroup><tbody>'+rows.join("")+'</tbody></table></div>';}
function dd(x){return esc(fmtD(x))||"&nbsp;";}
function ee(x){return x&&String(x).trim()?esc(x):"&nbsp;";}
function maxD(list,k){var m="";(list||[]).forEach(function(x){if(x[k]&&x[k]>m)m=x[k];});return m;}
function minD(list,k){var m="";(list||[]).forEach(function(x){if(x[k]&&(!m||x[k]<m))m=x[k];});return m;}
function docPrjOzet(r){
  var M=r.montaj||[];
  var st=[["Teklif","Teklif no "+(r.teklifNo||"…"),r.teklifTarih,SAMPLE_ROLE.gm],["Sözleşme ve varyant kontrolü","FR-06.01 · Sözleşme no "+(r.sozlesmeNo||"…"),r.tarih,SAMPLE_ROLE.tm],["Satın alma","FR-07.03",minD(r.satinalma,"siparisTarih"),SAMPLE_ROLE.satin],["Giriş kontrol (kalite kontrol)","FR-07.04",maxD(r.kalite,"kontrolTarih")||maxD(r.satinalma,"gelisTarih"),SAMPLE_ROLE.satin+" / "+SAMPLE_ROLE.tm],["Güvenlik aksamı izlenebilirliği","FR-07.05",maxD(r.kalite,"kontrolTarih"),SAMPLE_ROLE.tm]];
  M.forEach(function(m){st.push([m.asama||"Montaj kontrolü",m.form||"",m.tarih,m.kontrol||SAMPLE_ROLE.sef]);});
  st=st.concat([["Son muayene ve deneyler","FR-09.01",r.smTarih,SAMPLE_ROLE.smd],["CE etiket talebi ve iliştirme","FR-12.01",r.ceTarih,SAMPLE_ROLE.tm],["AB Uygunluk Beyanı","FR-12.02",r.abubTarih,SAMPLE_ROLE.gm],["Teslim","FR-12.03",r.teslimTarih,SAMPLE_ROLE.sef],["Piyasaya arz bildirimi","FR-12.04",r.arzTarih,SAMPLE_ROLE.kyt]]);
  var ud=(r.kalite||[]).filter(function(x){return x.sonuc==="Red";}).length+M.filter(function(x){return x.sonuc==="Uygun değil";}).length;
  return prjHead(r.no||"Montaj projesi","PROJE İZLENEBİLİRLİK DOSYASI")+'<div class="tplbody">'+
   kvGrid2([["Proje / seri no",ee(r.no)],["Müşteri",ee(r.musteri)],["Bina",ee(r.bina)],["Bina sorumlusu",ee(r.binaSor)],["Adres",ee(r.adres)],["Asansör tipi",ee(r.tip)],["Beyan yükü / hız",ee([r.yuk,r.hiz?r.hiz+" m/s":""].filter(Boolean).join(" · "))],["Durak / hareket mesafesi",ee([r.durak?r.durak+" durak":"",r.hm?r.hm+" m":""].filter(Boolean).join(" · "))],["AB tip inceleme sertifikası",ee(r.tipSert)],["Şantiye şefi",ee(r.sef)]])+
   '<h3>Süreç ve kayıtlar</h3>'+tTable(["No","Aşama","Kayıt","Tarih","Sorumlu / kontrol eden"],st.map(function(s,i){return tRow([String(i+1),esc(s[0]),esc(s[1]),dd(s[2]),ee(s[3])]);}),"",[5,33,25,13,24])+
   '<h3>Özet</h3>'+tTable(["Gösterge","Değer"],[tRow(["Satın alma kalemi",String((r.satinalma||[]).length)]),tRow(["Giriş kontrolü yapılan güvenlik aksamı",String((r.kalite||[]).length)]),tRow(["Montaj kontrol kaydı",String(M.length)]),tRow(["Uygunsuzluk (red / uygun değil)",String(ud)]),tRow(["Sözleşme → teslim süresi",(r.tarih&&r.teslimTarih)?Math.round((Date.parse(r.teslimTarih)-Date.parse(r.tarih))/864e5)+" gün":"–"])],"",[60,40])+
   sigF([["Hazırlayan (KYT)",nm("kyt"),r.teslimTarih],["Onaylayan (Teknik Müdür)",nm("tm"),r.teslimTarih]])+'</div>';
}
function docPrjTeklif(r){
  var P=r.parametreler||[],allOk=P.length&&P.every(function(p){return p.uygun==="E";});
  return tplHead("FR-06.01")+'<div class="tplbody">'+
   kvGrid2([["Proje / seri no",ee(r.no)],["Müşteri / bina",ee([r.musteri,r.bina].filter(Boolean).join(" / "))],["Teklif no / tarihi",ee([r.teklifNo,fmtD(r.teklifTarih)].filter(Boolean).join(" · "))],["Sözleşme no / tarihi",ee([r.sozlesmeNo,fmtD(r.tarih)].filter(Boolean).join(" · "))],["Teslim süresi",ee(r.teslimSure)],["Garanti / bakım",ee(r.garanti)],["Tip sertifikası no",ee(r.tipSert)],["Asansör tipi",ee(r.tip)]])+
   tTable(["Parametre","Sertifikadaki aralık","Proje değeri","Uygun (E/H)"],P.map(function(p){return '<tr><td>'+ee(p.parametre)+'</td><td>'+ee(p.aralik)+'</td><td>'+ee(p.deger)+'</td><td class="box">'+ee(p.uygun)+'</td></tr>';}),"",[34,26,28,12])+
   kvGrid2([["Karar",(allOk?CHK:UNCHK)+" Tüm parametreler aralıkta – Modül E ile devam    "+(allOk?UNCHK:CHK)+" Uygun olmayan parametre var – sözleşme imzalanmaz"]])+
   sigF([["Teknik Müdür",nm("tm"),r.tarih],["Müşteri",r.musteri||"",r.tarih]])+'</div>';
}
function docPrjSatin(r){
  var L=r.satinalma||[];
  return tplHead("FR-07.03")+'<div class="tplbody">'+kvGrid2([["Proje / seri no",ee(r.no)],["Müşteri / bina",ee([r.musteri,r.bina].filter(Boolean).join(" / "))],["Hazırlayan",ee(nm("satin"))],["Tarih",dd(minD(L,"siparisTarih"))]])+
   tTable(["No","Malzeme","Marka / tip","Miktar","Tedarikçi","Sipariş no / tarihi","İrsaliye / geliş"],L.map(function(x,i){return tRow([String(i+1),ee(x.malzeme),ee(x.marka),ee(x.miktar),ee(x.tedarikci),ee([x.siparisNo,fmtD(x.siparisTarih)].filter(Boolean).join(" · ")),ee([x.irsaliye,fmtD(x.gelisTarih)].filter(Boolean).join(" · "))]);}),"",[5,21,17,9,17,16,15])+
   sigF([["Hazırlayan",nm("satin"),minD(L,"siparisTarih")],["Onaylayan (Teknik Müdür)",nm("tm"),minD(L,"siparisTarih")]])+'</div>';
}
function docPrjGiris(r){
  var K=r.kalite||[];
  var rows=K.map(function(x){var ok=x.sonuc==="Kabul",red=x.sonuc==="Red";return '<tr><td>'+ee(x.aksam)+'</td><td>'+ee(x.marka)+'</td><td>'+ee(x.seriNo)+'</td><td class="box">'+(ok?CHK:UNCHK)+'</td><td class="box">'+(ok?CHK:UNCHK)+'</td><td class="box">'+(ok?CHK:UNCHK)+'</td><td class="box">'+(ok?CHK:UNCHK)+'</td><td class="box">'+(red?CHK:UNCHK)+'</td><td>'+dd(x.kontrolTarih)+'</td></tr>';});
  var ted={};(r.satinalma||[]).forEach(function(s){if(s.tedarikci)ted[s.tedarikci]=1;});
  return tplHead("FR-07.04")+'<div class="tplbody">'+kvGrid2([["Proje / seri no",ee(r.no)],["Tedarikçi(ler)",ee(Object.keys(ted).join(", "))],["İrsaliye no(lar)",ee((r.satinalma||[]).map(function(s){return s.irsaliye;}).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).join(", "))],["Kontrol tarihi",dd(maxD(K,"kontrolTarih"))]])+
   '<div class="ts"><table class="t" data-w="21,14,13,8,10,9,8,7,10"><thead><tr><th>Malzeme / aksam</th><th>Marka / tip</th><th>Seri no</th><th class="box">Hasarsız</th><th class="box">Etiket ve seri no uygun</th><th class="box">Belgeler tam</th><th class="box">Kabul</th><th class="box">Red</th><th>Tarih</th></tr></thead><tbody>'+rows.join("")+'</tbody></table></div>'+
   '<p class="note">Belgeler tam: güvenlik aksamında AB tip inceleme sertifikası ve AB uygunluk beyanı teslim edilmiş, tip sertifikasındaki marka/tip ile aynı.</p>'+
   sigF([["Kontrol eden (Depo)",nm("satin"),maxD(K,"kontrolTarih")],["Güvenlik aksamı onayı (Teknik Müdür)",nm("tm"),maxD(K,"kontrolTarih")]])+'</div>';
}
function docPrjIzl(r){
  var K=r.kalite||[];
  return tplHead("FR-07.05")+'<div class="tplbody">'+kvGrid2([["Proje / seri no",ee(r.no)],["Bina adresi",ee(r.adres)],["Piyasaya arz tarihi",dd(r.arzTarih)],["Tip sertifikası no",ee(r.tipSert)]])+
   tTable(["Aksam","Marka / tip","Seri no","AB tip inceleme sertifika no","Sertifika geçerlilik tarihi","Onaylanmış kuruluş no"],K.map(function(x){return tRow([ee(x.aksam),ee(x.marka),ee(x.seriNo),ee(x.sertNo),dd(x.gecerlilik),ee(x.kurulusNo)]);}),"",[24,17,14,20,13,12])+
   sigF([["Hazırlayan",nm("satin"),maxD(K,"kontrolTarih")],["Kontrol (Teknik Müdür)",nm("tm"),maxD(K,"kontrolTarih")]])+'</div>';
}
function docPrjMontaj(r){
  var M=r.montaj||[],allOk=M.length&&M.every(function(m){return m.sonuc==="Uygun";});
  return tplHead("FR-08.11")+'<div class="tplbody">'+kvGrid2([["Proje / seri no",ee(r.no)],["Bina adı ve adresi",ee([r.bina,r.adres].filter(Boolean).join(" – "))],["Montaj başlangıç / bitiş",ee([fmtD(r.montajBas),fmtD(r.montajBit)].filter(Boolean).join(" – "))],["Şantiye şefi",ee(r.sef)],["Montaj ekibi",ee(r.ekip)]])+
   '<div class="ts"><table class="t" data-w="6,15,29,13,17,8,12"><thead><tr><th>No</th><th>Form</th><th>Aşama</th><th>Tarih</th><th>Kontrol eden</th><th class="box">Sonuç</th><th>Not</th></tr></thead><tbody>'+M.map(function(m,i){return '<tr><td>'+(i+1)+'</td><td>'+ee(m.form)+'</td><td>'+ee(m.asama)+'</td><td>'+dd(m.tarih)+'</td><td>'+ee(m.kontrol)+'</td><td class="box">'+ee(m.sonuc)+'</td><td>'+ee(m.not)+'</td></tr>';}).join("")+'</tbody></table></div>'+
   '<p>'+(allOk?"Tüm montaj kontrolleri uygun sonuçlanmıştır. Asansör son muayene ve deneylere hazırdır.":"Uygun olmayan kontroller giderilmeden son muayene ve deneylere geçilmez.")+(r.smTarih?" Önerilen deney tarihi: <b>"+esc(fmtD(r.smTarih))+"</b>.":"")+'</p>'+
   sigF([["Şantiye Şefi",r.sef||nm("sef"),r.montajBit],["Teslim alan (Son Muayene ve Deney Sorumlusu)",nm("smd"),r.montajBit],["Teknik Müdür",nm("tm"),r.montajBit]])+'</div>';
}
function docPrjCe(r){
  var ok=!!r.smTarih;
  return tplHead("FR-12.01")+'<div class="tplbody">'+kvGrid2([["Talep no","CE-"+ee(r.no)],["Proje / seri no",ee(r.no)],["Talep tarihi",dd(r.ceTarih)],["Son muayene tarihi",dd(r.smTarih)]])+
   '<div class="ts"><table class="t" data-w="6,54,12,12,16"><thead><tr><th>No</th><th>Ön şart</th><th class="box">Tamam</th><th class="box">Eksik</th><th>Not</th></tr></thead><tbody>'+["Son Muayene ve Deney Formu (FR-09.01) tüm kalemler uygun","Teknik Müdür piyasaya arz onayı","Teknik dosya eksiksiz","AB Uygunluk Beyanı hazırlandı"].map(function(t,i){return '<tr><td>'+(i+1)+'</td><td>'+esc(t)+'</td><td class="box">'+(ok?CHK:UNCHK)+'</td><td class="box">'+UNCHK+'</td><td>&nbsp;</td></tr>';}).join("")+'</tbody></table></div>'+
   '<h3>Etiket bilgileri</h3>'+tTable(["Alan","Değer"],[tRow(["CE + onaylanmış kuruluş no","CE "+ee(T("meKurulusNo"))]),tRow(["Asansör monte eden",ee(T("unvan"))]),tRow(["Adres",ee(T("adres"))]),tRow(["Seri no",ee(r.no)]),tRow(["Montaj yılı",ee(r.montajYili)]),tRow(["Beyan yükü (kg) / kişi sayısı",ee(r.yuk)])],"",[40,60])+
   sigF([["Talep eden",r.sef||nm("sef"),r.ceTarih],["Onaylayan (Teknik Müdür)",nm("tm"),r.ceTarih],["Etiketi iliştiren",r.sef||nm("sef"),r.ceTarih]])+'</div>';
}
function docPrjAbub(r){
  var K=r.kalite||[],base=TPL["FR-12.02"],parts=JSON.parse(JSON.stringify(base.parts));
  var V={"Seri no":r.no,"Kurulduğu adres":[r.bina,r.adres].filter(Boolean).join(", "),"Beyan yükü – hız – durak sayısı":[r.yuk,r.hiz?r.hiz+" m/s":"",r.durak?r.durak+" durak":""].filter(Boolean).join("  –  "),"Montaj yılı":r.montajYili,"Asansör tipi":r.tip};
  function brace(s){return String(s||"").replace(/[{}]/g,"");}
  parts.forEach(function(p){
    if(p.sform)p.sform.forEach(function(sc){sc[1].forEach(function(row){if(V[row[0]]!==undefined&&V[row[0]]!=="")row[1]=brace(V[row[0]]);});});
    if(p.stbl){var RX=[/^kat kapısı/i,/^kabin kapısı/i,/paraşüt/i,/regülatör/i,/tampon/i,/ucmp/i,/yukarı yön/i,/pessral|elektronik/i,/tahrik/i,/kumanda/i];
      p.stbl.rows=p.stbl.rows.map(function(row,ix){var rx=RX[ix],hit=null;if(!rx)return row;K.forEach(function(k){if(!hit&&rx.test(k.aksam||""))hit=k;});
        if(hit){var mm=String(hit.marka||"").split("/");return [row[0],brace(mm[0].trim()),brace(mm.slice(1).join("/").trim()),brace(hit.seriNo),brace(hit.sertNo)];}
        var sa=null;(r.satinalma||[]).forEach(function(x){if(!sa&&rx.test(x.malzeme||""))sa=x;});if(sa){var m2=String(sa.marka||"").split("/");return [row[0],brace(m2[0].trim()),brace(m2.slice(1).join("/").trim()),"",""];}return row;});}
    if(p.signs)p.signs=[["Yer ve tarih",brace([T("il"),fmtD(r.abubTarih)].filter(Boolean).join(", "))],["Ad Soyad / unvan","{gm}, Genel Müdür"],["İmza ve kaşe",""]];
  });
  return '<div class="certframe">'+certTop()+'<div class="tplbody">'+parts.map(partHTML).join("")+'</div>'+certFoot("FR-12.02")+'</div>';
}
function docPrjTeslim(r){
  var on=!!r.teslimTarih;
  var items=["Asansör çalışır ve CE etiketi takılı","AB Uygunluk Beyanı (asıl)","Kullanım kılavuzu","Bakım talimatları","Acil kurtarma talimatı (asılı)","Kat kapısı acil kilit açma anahtarı","Makine dairesi / kurtarma panosu anahtarları","Fren açma kolu / el çarkı (MR)","Garanti belgesi (en az 3 yıl)","Bakım sözleşmesi / teklifi","Kullanım kayıt defteri"];
  var mrl=/MRL|makine dairesiz/i.test(r.tip||"");
  return tplHead("FR-12.03")+'<div class="tplbody">'+kvGrid2([["Proje / seri no",ee(r.no)],["Bina adı ve adresi",ee([r.bina,r.adres].filter(Boolean).join(" – "))],["Bina sorumlusu",ee(r.binaSor)],["Teslim tarihi",dd(r.teslimTarih)]])+
   '<div class="ts"><table class="t" data-w="6,52,13,9,20"><thead><tr><th>No</th><th>Teslim edilen</th><th class="box">Teslim edildi</th><th class="box">Yok</th><th>Adet / not</th></tr></thead><tbody>'+items.map(function(t,i){var na=mrl&&/el çarkı \(MR\)/.test(t);return '<tr><td>'+(i+1)+'</td><td>'+esc(t)+'</td><td class="box">'+(on&&!na?CHK:UNCHK)+'</td><td class="box">'+(on&&na?CHK:UNCHK)+'</td><td>'+(na?"MRL – kurtarma panosunda":/Garanti/.test(t)&&r.garanti?esc(r.garanti):"&nbsp;")+'</td></tr>';}).join("")+'</tbody></table></div>'+
   kvGrid2([["Bilgilendirme",(on?CHK:UNCHK)+" Bina sorumlusuna kullanım, acil durum ve 7/24 kurtarma hattı ("+ee(T("kurtarma"))+") bilgilendirmesi yapıldı"]])+
   sigF([["Teslim eden ("+(T("unvan")||"firma")+")",r.sef||nm("sef"),r.teslimTarih],["Teslim alan (bina sorumlusu)",String(r.binaSor||"").split("/")[0].trim(),r.teslimTarih]])+'</div>';
}
function docPrjAnket(r){var d=TPL["FR-11.04"];var info=[["Müşteri / bina",[r.musteri,r.bina].filter(Boolean).join(" / ")],["Asansör seri no",r.no||""],["Teslim tarihi",fmtD(r.teslimTarih)],["Anket tarihi",""],["Anketi dolduran (ad soyad / görev)",String(r.binaSor||"").split("/")[0].trim()?String(r.binaSor).split("/")[0].trim()+" / Bina sorumlusu":"",1]].map(function(x){x[1]=String(x[1]||"").replace(/[{}]/g,"");return x;});return tplHead("FR-11.04")+'<div class="tplbody">'+kvGrid(info)+d.parts.map(partHTML).join("")+'</div>';}
function docPrj(r,which){if(which==="anket")return docPrjAnket(r);if(which==="ara")return docPrjAra(r);if(which==="sm")return docPrjSm(r);if(which==="tdosya")return docPrjTdosya(r);if(which==="fr0903")return docPrj0903(r);if(which==="fr1204")return docPrj1204(r);return which==="teklif"?docPrjTeklif(r):which==="satin"?docPrjSatin(r):which==="giris"?docPrjGiris(r):which==="izl"?docPrjIzl(r):which==="montaj"?docPrjMontaj(r):which==="ce"?docPrjCe(r):which==="abub"?docPrjAbub(r):which==="teslim"?docPrjTeslim(r):docPrjOzet(r);}
function prjDocName(r,which){var map={ozet:"0 Izlenebilirlik Ozeti",teklif:"FR-06.01 Teklif ve Sozlesme Kontrolu",satin:"FR-07.03 Proje Malzeme ve Satin Alma Listesi",giris:"FR-07.04 Giris Kontrol Formu",izl:"FR-07.05 Guvenlik Aksami Izlenebilirlik Listesi",montaj:"FR-08.11 Montaj Kayitlari ve Bitis Bildirimi",ce:"FR-12.01 CE Etiket Talep Formu",abub:"FR-12.02 AB Uygunluk Beyani",teslim:"FR-12.03 Teslim Tutanagi",anket:"FR-11.04 Musteri Memnuniyet Anketi",ara:"FR-08.01-08.10 Ara Kontrol Formlari",sm:"FR-09.01 Son Muayene ve Deney Formu",tdosya:"FR-06.04 Teknik Dosya Kontrol Listesi",fr0903:"FR-09.03 Devam Eden Montajlar Listesi",fr1204:"FR-12.04 Piyasaya Arz Bildirim Listesi"};if(which==="fr0903"||which==="fr1204")return safeName(map[which]+" "+(r.yil||""));return safeName((r.no||"Proje")+" "+(map[which]||which));}
function prjDocTitle(which){for(var i=0;i<PRJ_DOCS.length;i++)if(PRJ_DOCS[i][0]===which)return PRJ_DOCS[i][1].replace(/^FR-[\d.]+ /,"");return "Proje";}
function prjSample(yil,fill){
  var y=String(yil),kk=T("kisaKod")||"FRM",no=kk+"-"+y+"-014",sef=nm("sef"),smd=nm("smd"),tm=nm("tm");
  var mk=techs("Montaj").map(function(t){return t.ad;}).join(", ");
  var kNo=T("meKurulusNo")||"2754";
  var d=function(m,dd){return wd(yil,m,dd);};
  var r={id:kyId(),yil:y,ornek:true,no:no,musteri:"Yıldız Yapı Kooperatifi",bina:"Yıldız Apartmanı B Blok",adres:"Örnek Mah. Gül Sok. No:12, Çankaya / Ankara",binaSor:"Ahmet Yılmaz / 0532 000 00 00",
   teklifNo:"TK-"+y+"-031",teklifTarih:d(2,17),sozlesmeNo:"SZ-"+y+"-014",tarih:d(3,3),teslimSure:"Kuyu tesliminden itibaren 60 iş günü",garanti:"3 yıl garanti, 1 yıl ücretsiz bakım",durum:fill?"Gerçekleşti":"Planlandı",
   tip:"Elektrikli insan asansörü – makine dairesiz (MRL), 2:1 askı",yuk:"630 kg / 8 kişi",hiz:"1,0",durak:"8",hm:"21,0",tipSert:T("tipSertNo")||"TR-B-0001",montajYili:y,
   sef:sef,ekip:mk,montajBas:d(4,8),montajBit:fill?d(5,22):"",smTarih:fill?d(5,27):"",ceTarih:fill?d(5,28):"",abubTarih:fill?d(5,29):"",teslimTarih:fill?d(6,2):"",arzTarih:fill?d(6,2):"",
   notlar:"Örnek proje: tüm kayıtlar birbirine seri numaraları ve tarihlerle bağlanmıştır.",duyuruTarihi:""};
  r.parametreler=[["Beyan yükü / kişi sayısı","320 – 1000 kg","630 kg / 8 kişi"],["Beyan hızı","≤ 1,6 m/s","1,0 m/s"],["Hareket mesafesi / durak","≤ 45 m / ≤ 16 durak","21,0 m / 8 durak"],["Askı oranı, halat tipi ve sayısı","2:1, Ø8 mm çelik halat, ≥ 5 adet","2:1, 6 × Ø8 mm"],["Tahrik makinesi tipi ve yeri","Dişlisiz, MRL – kuyu üstü","Dişlisiz, MRL – kuyu üstü"],["Kabin ölçüsü / kabin ağırlığı","≤ 1200 × 1500 mm / ≤ 750 kg","1100 × 1400 × 2200 mm / 610 kg"],["Kapı tipi ve ölçüsü","Otomatik, 700 – 1100 mm","Teleskopik otomatik 800 × 2000 mm"],["Kuyu ölçüsü","≥ 1600 × 1700 mm","1700 × 1800 mm"],["Kuyu dibi / kuyu üstü","≥ 1100 / ≥ 3500 mm","1200 / 3650 mm"],["Güvenlik aksamları","Sertifika ekindeki liste","Listeyle aynı (FR-07.05)"],["Deprem kategorisi (EN 81-77)","Kategori 0 – 2","Kategori 1"]].map(function(p){return {parametre:p[0],aralik:p[1],deger:p[2],uygun:"E"};});
  var S1="Örnek Asansör Sistemleri A.Ş.",S2="Örnek Kapı ve Aksam Ltd. Şti.",S3="Örnek Ray ve Çelik San.";
  r.satinalma=[["Tahrik makinesi (dişlisiz)","Montanari / MGX","1 adet",S1,"SA-"+y+"-041",d(3,10),"İR-58812",d(3,31)],["Kumanda panosu ve sürücü","Arkel / ARCODE – ADrive","1 takım",S1,"SA-"+y+"-041",d(3,10),"İR-58812",d(3,31)],["Kabin ve karşı ağırlık rayları","Monteferro / T89/B – T70/B","1 takım",S3,"SA-"+y+"-042",d(3,11),"İR-1204",d(3,27)],["Halat","Gustav Wolf / Ø8 mm 8×19S","6 × 48 m",S1,"SA-"+y+"-041",d(3,10),"İR-58812",d(3,31)],["Kabin ve karkas","Yerli imalat / Paslanmaz kabin","1 takım",S1,"SA-"+y+"-041",d(3,10),"İR-58840",d(4,2)],["Paraşüt","Dynatech / Kaymalı paraşüt","1 adet",S1,"SA-"+y+"-041",d(3,10),"İR-58840",d(4,2)],["Karşı ağırlık ve dolgu","Yerli imalat / Karşı ağırlık","1 takım",S1,"SA-"+y+"-041",d(3,10),"İR-58840",d(4,2)],["Kat kapıları ve kilitleri","Fermator / Elite MR","8 adet",S2,"SA-"+y+"-043",d(3,12),"İR-7731",d(4,1)],["Kabin kapısı ve operatör","Fermator / Elite MR","1 takım",S2,"SA-"+y+"-043",d(3,12),"İR-7731",d(4,1)],["Aşırı hız regülatörü","Dynatech / LBD-200","1 adet",S1,"SA-"+y+"-041",d(3,10),"İR-58840",d(4,2)],["Tamponlar","Wittur / Poliüretan tampon","2 adet",S1,"SA-"+y+"-041",d(3,10),"İR-58840",d(4,2)],["Kuyu kabloları ve askı kablosu","Yerli imalat / Hazır kablo seti","1 takım",S1,"SA-"+y+"-041",d(3,10),"İR-58812",d(3,31)],["Butonyerler ve göstergeler","Yerli imalat / Paslanmaz butonyer","1 takım",S2,"SA-"+y+"-043",d(3,12),"İR-7731",d(4,1)],["Alarm / iki yönlü iletişim cihazı","Safeline / MX2","1 adet",S2,"SA-"+y+"-043",d(3,12),"İR-7731",d(4,1)]].map(function(a){return {malzeme:a[0],marka:a[1],miktar:a[2],tedarikci:a[3],siparisNo:a[4],siparisTarih:a[5],irsaliye:a[6],gelisTarih:a[7]};});
  var g=d(4,3);
  r.kalite=[["Kat kapısı kilitleri (8 adet)","Fermator / Elite MR kilit","FM24-1031 … 1038","TR-AB-KL-0412",wd(yil+3,9,30)],["Kabin kapısı kilidi","Fermator / Elite MR kabin kilidi","FM24-1101","TR-AB-KL-0413",wd(yil+3,9,30)],["Kabin paraşütü","Dynatech / Kaymalı paraşüt","DY24-5512","TR-AB-PR-0220",wd(yil+2,6,30)],["Aşırı hız regülatörü","Dynatech / LBD-200","DY24-3307","TR-AB-RG-0118",wd(yil+2,11,30)],["Kabin tamponu","Wittur / Poliüretan tampon","WT24-8801","TR-AB-TP-0091",wd(yil+4,3,31)],["Karşı ağırlık tamponu","Wittur / Poliüretan tampon","WT24-8802","TR-AB-TP-0091",wd(yil+4,3,31)],["UCMP aksamı (makine freni)","Montanari / MGX çift devreli fren","MN24-0730","TR-AB-UC-0057",wd(yil+3,1,31)],["Yukarı yön aşırı hız koruması","Montanari / MGX çift devreli fren","MN24-0730","TR-AB-UC-0057",wd(yil+3,1,31)],["Güvenlik devresi elektronik elemanı / PESSRAL","Arkel / ARCODE","AR24-4410","TR-AB-PE-0033",wd(yil+2,12,31)]].map(function(a){return {aksam:a[0],marka:a[1],seriNo:a[2],sertNo:a[3],gecerlilik:a[4],kurulusNo:kNo,sonuc:"Kabul",kontrolTarih:g};});
  var mt=[["FR-08.01","Kuyu ölçümü ve teslim alma",d(4,7),smd],["FR-08.02","Sevkiyat kontrolü",d(4,8),sef],["FR-08.03","Ray montajı",d(4,17),sef],["FR-08.04","Makine ve regülatör montajı",d(4,23),sef],["FR-08.05","Kabin, paraşüt ve karşı ağırlık",d(4,30),sef],["FR-08.06","Halat ve askı",d(5,6),sef],["FR-08.07","Kapı montajı",d(5,13),sef],["FR-08.08","Tampon ve kuyu dibi",d(5,14),sef],["FR-08.09","Elektrik tesisatı",d(5,19),sef],["FR-08.10","İlk çalıştırma ve ayar",d(5,21),sef],["FR-08.11","Montaj bitiş bildirimi",d(5,22),tm]];
  r.montaj=mt.map(function(m,i){var done=fill||i<4;return {form:m[0],asama:m[1],tarih:done?m[2]:"",kontrol:m[3],sonuc:done?"Uygun":"",not:m[0]==="FR-08.07"&&fill?"3. kat kapı aralığı 7 mm → ayarlandı, 5 mm":""};});
  if(!fill)r.durum="Planlandı";
  return r;
}

/* ---------- Montaj projesi ek kayıtları ve ek şablonlar ---------- */
TPL["FR-06.04"]=F(["Proje / seri no","Bina adı ve adresi","Kontrol tarihi"],[
 {chk:{cols:["No","Teknik dosya içeriği","Var","Yok","Kayıt no / açıklama"],box:[2,3],w:[6,46,9,9,30],items:["Sözleşme, bina ve ruhsat bilgileri","FR-06.01 Varyant Uygunluk Kontrol Listesi","Tip inceleme sertifikası kopyası","Proje çizimleri, hesaplar, şemalar","Güvenlik aksamı sertifikaları, beyanları ve seri numaraları","Giriş kontrol kayıtları","Montaj ara kontrol formları","Son Muayene ve Deney Formu, ölçüm çıktıları, fotoğraflar","Uygunsuzluk kayıtları","AB Uygunluk Beyanı ve CE etiketi fotoğrafı","Kılavuz teslim tutanağı","Tescil ve ilk periyodik kontrol raporu"]}},
 {opt:[["Sonuç",["☐ Teknik dosya eksiksiz – arşive alındı","☐ Eksik var – tamamlanınca arşive alınır"]]]},
 {sig:["Kontrol eden (Teknik Müdür)","KYT"]}]);
TPL["FR-15.06"]=F(["Denetim tarihi","Denetçi(ler)",["Denetim türü","☐ İlk belgelendirme    ☐ Gözetim tetkiki    ☐ Habersiz ziyaret    ☐ Yeniden belgelendirme"],["Onaylanmış kuruluş","{meKurulus} (kimlik no {meKurulusNo})"]],[
 {kv:["Kapsam / incelenen kayıtlar","Ziyaret edilen şantiye / proje"]},
 {tbl:["No","Bulgu","Sınıf","DÖF no","Termin","Kapanış tarihi"],n:6,w:[5,45,10,14,13,13]},
 {opt:[["Sonuç",["☐ Belge devam ediyor","☐ Bulgular kapatılınca belge devam eder","☐ Belge askıya alındı"]]]},
 {sig:["KYT","Genel Müdür"]}]);
PRJ_DEF.f.splice(PRJ_DEF.f.length-1,0,["planSm","Planlanan son muayene tarihi","date"],["tescil","Tescil / ilk periyodik kontrol raporu","text","wide"]);
function smItems(){var out=[];TPL["FR-09.01"].parts.forEach(function(p){if(p.chk)p.chk.items.forEach(function(it){out.push(it);});});return out;}
function smRows(){return smItems().filter(function(it){return Array.isArray(it);}).map(function(it){return {kod:it[0],kontrol:it[1],kriter:it[2],olcum:"",cihaz:"",sonuc:""};});}
PRJ_DEF.arr.push(["deneyler","Son muayene ve deneyler (FR-09.01)",[["kod","No","text"],["kontrol","Kontrol / deney","text"],["kriter","Kabul kriteri","text"],["olcum","Ölçülen değer","text"],["cihaz","Cihaz no","text"],["sonuc","Sonuç","select:|U|UD|UY"]],{kod:"",kontrol:"",kriter:"",olcum:"",cihaz:"",sonuc:""}]);
PRJ_DOCS.splice(PRJ_DOCS.length-1,0,["ara","FR-08.01–08.10 Ara kontroller"],["sm","FR-09.01 Son muayene ve deney"],["tdosya","FR-06.04 Teknik dosya"],["fr0903","FR-09.03 Devam eden montajlar (yıllık)"],["fr1204","FR-12.04 Piyasaya arz bildirimi (yıllık)"]);
var PRJ_YEARLY=["fr0903","fr1204"];
function prjDofs(r){return (S.kayit.dof||[]).filter(function(d){return d.projeNo&&d.projeNo===r.no;});}
function docPrjSm(r){
  var D={};(r.deneyler||[]).forEach(function(d){D[d.kod]=d;});
  var rows=smItems().map(function(it){if(typeof it==="string")return '<tr class="grp"><td colspan="8">'+esc(it.slice(1).trim())+'</td></tr>';var d=D[it[0]]||{};return '<tr><td>'+esc(it[0])+'</td><td>'+esc(it[1])+'</td><td>'+tx(it[2])+'</td><td>'+ee(d.olcum)+'</td><td>'+ee(d.cihaz)+'</td>'+["U","UD","UY"].map(function(s){return '<td class="box">'+(d.sonuc===s?CHK:UNCHK)+'</td>';}).join("")+'</tr>';}).join("");
  var uy=prjDofs(r).filter(function(d){return d.kaynak==="Son muayene";}),allU=(r.deneyler||[]).length&&(r.deneyler||[]).every(function(d){return d.sonuc==="U"||d.sonuc==="UY";});
  return tplHead("FR-09.01")+'<div class="tplbody">'+kvGrid2([["Proje / seri no",ee(r.no)],["Bina adı ve adresi",ee([r.bina,r.adres].filter(Boolean).join(" – "))],["Beyan yükü (kg) / kişi",ee(r.yuk)],["Beyan hızı (m/s)",ee(r.hiz)],["Durak sayısı / hareket mesafesi",ee([r.durak,r.hm?r.hm+" m":""].filter(Boolean).join(" / "))],["Tip sertifikası no",ee(r.tipSert)],["Deney tarihi",dd(r.smTarih)],["Deneyi yapan",ee(nm("smd"))]])+
   '<p class="note">U: Uygun · UD: Uygun değil · UY: Uygulanamaz (gerekçe açıklamaya yazılır). Ölçülen değerler sayıyla yazılır; "OK" kabul edilmez.</p>'+
   '<div class="ts"><table class="t chk" data-w="5,30,23,17,8,5,6,6"><thead><tr><th>No</th><th>Kontrol / deney</th><th>Kabul kriteri</th><th>Ölçülen değer</th><th>Cihaz no</th><th class="box">U</th><th class="box">UD</th><th class="box">UY</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
   '<h3>Uygunsuzluklar</h3>'+tTable(["Kalem","Uygunsuzluk","FR-11.01 no","Düzeltme tarihi","Tekrar deney sonucu"],uy.length?uy.map(function(d){return tRow([ee(d.ilgiliKayit),ee(d.tanim),ee(d.no),dd(d.kapanis),"Uygun"]);}):[tRow(["–","Uygunsuzluk yok","&nbsp;","&nbsp;","&nbsp;"])],"",[9,41,14,16,20])+
   fRows([["Sonuç",optX(["Tüm kalemler uygun","Uygunsuzluk var – asansör piyasaya arz edilemez"],allU&&r.smTarih?"Tüm kalemler uygun":""),1],["PİYASAYA ARZA UYGUNDUR",(allU&&r.smTarih?CHK:UNCHK)+" Evet    Tarih: "+dd(r.smTarih),1]])+
   sigF([["Son Muayene ve Deney Sorumlusu",nm("smd"),r.smTarih],["Teknik Müdür (onay)",nm("tm"),r.smTarih]])+'</div>';
}
function araFill(html,r,m){
  var t=document.createElement("template");t.innerHTML=html;var c=t.content,ok=m&&m.sonuc==="Uygun";
  c.querySelectorAll("table.kv.info tr").forEach(function(tr){var th=tr.querySelector("th"),td=tr.querySelector("td");if(!th||!td)return;var k=th.textContent.trim();if(k==="Proje / seri no")td.textContent=r.no||"";else if(k==="Bina adı ve adresi")td.textContent=[r.bina,r.adres].filter(Boolean).join(" – ");else if(k==="Tarih")td.textContent=m&&m.tarih?fmtD(m.tarih):"";});
  if(ok)c.querySelectorAll("table.chk tbody tr").forEach(function(tr){var b=tr.querySelector("td.box");if(b)b.textContent=CHK;});
  c.querySelectorAll("table.kv tr").forEach(function(tr){var th=tr.querySelector("th"),td=tr.querySelector("td.opts");if(ok&&th&&td&&th.textContent.trim()==="Sonuç")td.innerHTML=td.innerHTML.replace("☐",CHK);});
  var n=+String(r.durak||"").replace(/\D/g,"")||0;
  c.querySelectorAll("table.t").forEach(function(tb){var h=tb.querySelector("th");if(!h||!m||!m.tarih)return;var ht=h.textContent.trim(),rows=tb.querySelectorAll("tbody tr");
    if(ht==="Durak / kat")rows.forEach(function(tr,i){if(i>=n)return;var td=tr.querySelectorAll("td");var v=["",String(1700),String(1800),i===n-1?"–":"3000","900 × 2100",i===0?"±0":"+"+(i*3)+"",""];for(var j=1;j<td.length&&j<v.length;j++)td[j].textContent=v[j];});
    if(ht==="Kat"&&tb.textContent.indexOf("Panel")>=0)rows.forEach(function(tr,i){if(i>=n)return;var td=tr.querySelectorAll("td");var v=[String(i+1),"3","4",i===2?"5 (ilk 7 → ayarlandı)":"5","8","Evet","Evet","Evet","2"];for(var j=0;j<td.length&&j<v.length;j++)td[j].textContent=v[j];});
  });
  c.querySelectorAll("table.sig").forEach(function(tb){var trs=tb.querySelectorAll("tbody tr");trs.forEach(function(tr){tr.querySelectorAll("td").forEach(function(td,ci){var sl=td.querySelector(".sl");if(!sl)return;var lab=sl.textContent.trim();if(lab==="Ad Soyad:")td.innerHTML='<span class="sl">Ad Soyad:</span> '+esc(ci===0?(m&&m.kontrol)||"":nm("tm"));if(lab==="Tarih:"&&m&&m.tarih)td.innerHTML='<span class="sl">Tarih:</span> '+esc(fmtD(m.tarih));});});});
  return t.innerHTML;
}
function docPrjAra(r){var M={};(r.montaj||[]).forEach(function(m){M[m.form]=m;});
  return ["FR-08.01","FR-08.02","FR-08.03","FR-08.04","FR-08.05","FR-08.06","FR-08.07","FR-08.08","FR-08.09","FR-08.10"].map(function(k){var m=M[k];var note=m&&m.not?'<p class="note">Not: '+esc(m.not)+'</p>':"";return '<section>'+tplHead(k)+'<div class="tplbody">'+araFill(tplBody(k),r,m)+note+'</div></section>';}).join("");}
function docPrjTdosya(r){
  var K=r.kalite||[],M=r.montaj||[],U=prjDofs(r);
  var v=[[r.sozlesmeNo,"Sözleşme "+(r.sozlesmeNo||"")+(r.tarih?" · "+fmtD(r.tarih):"")],[(r.parametreler||[]).length,"FR-06.01 · "+fmtD(r.tarih)],[r.tipSert,r.tipSert],[r.no,"Proje dosyası "+(r.no||"")],[K.length,"FR-07.05 · "+K.length+" aksam"],[maxD(K,"kontrolTarih"),"FR-07.04 · "+fmtD(maxD(K,"kontrolTarih"))],[M.filter(function(m){return m.tarih;}).length,"FR-08.01–08.11 · "+M.filter(function(m){return m.tarih;}).length+" form"],[r.smTarih,"FR-09.01 · "+fmtD(r.smTarih)],[true,U.length?U.map(function(d){return d.no;}).join(", "):"Uygunsuzluk yok"],[r.abubTarih,"FR-12.02 · "+fmtD(r.abubTarih)+(r.ceTarih?" · CE fotoğrafı "+fmtD(r.ceTarih):"")],[r.teslimTarih,"FR-12.03 · "+fmtD(r.teslimTarih)],[r.tescil,r.tescil||""]];
  var items=TPL["FR-06.04"].parts[0].chk.items,allOk=v.every(function(x){return !!x[0];});
  return tplHead("FR-06.04")+'<div class="tplbody">'+kvGrid2([["Proje / seri no",ee(r.no)],["Bina adı ve adresi",ee([r.bina,r.adres].filter(Boolean).join(" – "))],["Kontrol tarihi",dd(r.teslimTarih||r.abubTarih)]])+
   '<div class="ts"><table class="t chk" data-w="6,46,9,9,30"><thead><tr><th>No</th><th>Teknik dosya içeriği</th><th class="box">Var</th><th class="box">Yok</th><th>Kayıt no / açıklama</th></tr></thead><tbody>'+items.map(function(it,i){var has=!!v[i][0];return '<tr><td>'+(i+1)+'</td><td>'+esc(it)+'</td><td class="box">'+(has?CHK:UNCHK)+'</td><td class="box">'+(has?UNCHK:CHK)+'</td><td>'+(has?ee(v[i][1]):"Bekleniyor")+'</td></tr>';}).join("")+'</tbody></table></div>'+
   fRows([["Sonuç",optX(["Teknik dosya eksiksiz – arşive alındı","Eksik var – tamamlanınca arşive alınır"],allOk?"Teknik dosya eksiksiz – arşive alındı":"Eksik var – tamamlanınca arşive alınır"),1]])+sigF([["Kontrol eden (Teknik Müdür)",nm("tm"),r.teslimTarih],["KYT",nm("kyt"),r.teslimTarih]])+'</div>';
}
function prjDurum(p){return p.arzTarih?"Piyasaya arz edildi":p.smTarih?"Son muayene tamamlandı":p.montajBit?"Son muayeneye hazır":p.montajBas?"Montaj devam ediyor":"Montaja başlanmadı";}
function docPrj0903(r){var y=yilOf(r),L=kyList("proje",y);return tplHead("FR-09.03")+'<div class="tplbody">'+kvGrid2([["Yıl",esc(y)],["Gönderim tarihi",dd(wd(+y,12,15))],["Gönderilen kuruluş",ee(T("meKurulus"))+(T("meKurulusNo")?" ("+esc(T("meKurulusNo"))+")":"")]])+
  tTable(["Proje / seri no","Bina adresi (il/ilçe)","Durum","Planlanan son muayene tarihi","Kontrol tarihi","Kontrol yapan","Uygunluk Beyanı tarihi"],L.map(function(p){var il=String(p.adres||"").split(",").pop().trim();return tRow([ee(p.no),ee(il),esc(prjDurum(p)),dd(p.planSm||p.smTarih),dd(p.smTarih),p.smTarih?ee(nm("smd")):"&nbsp;",dd(p.abubTarih)]);}),"",[13,19,17,14,12,13,12])+sigF([["Hazırlayan (KYT)",nm("kyt"),wd(+y,12,15)]])+'</div>';}
function docPrj1204(r){var y=yilOf(r),L=kyList("proje",y).filter(function(p){return p.arzTarih;}),LW=[9,24,29,19,19],h="";
  for(var a=0;a<Math.max(5,L.length);a++){var p=L[a]||{};var R=[["Seri no",ee(p.no),"Montaj yılı",ee(p.montajYili)],["Bina adresi",ee([p.bina,p.adres].filter(Boolean).join(", "))],["Yük (kg/kişi) – hız – durak",ee([p.yuk,p.hiz?p.hiz+" m/s":"",p.durak?p.durak+" durak":""].filter(Boolean).join(" – ")),"Son muayene tarihi",dd(p.smTarih)],["AB UB tarihi",dd(p.abubTarih),"Piyasaya arz tarihi",dd(p.arzTarih)]];
   h+=R.map(function(x,j){return '<tr>'+(j===0?'<th class="sec" rowspan="4"><div class="secno">'+(a+1)+'</div><div class="sect">Asansör</div></th>':"")+'<th>'+esc(x[0])+'</th>'+(x.length>2?'<td>'+x[1]+'</td><th>'+esc(x[2])+'</th><td>'+x[3]+'</td>':'<td colspan="3">'+x[1]+'</td>')+'</tr>';}).join("");}
  return tplHead("FR-12.04")+'<div class="tplbody">'+kvGrid2([["Bildirilen onaylanmış kuruluş",ee(T("meKurulus"))+(T("meKurulusNo")?" (kimlik no "+esc(T("meKurulusNo"))+")":"")],["Bildirim dönemi / sayfa no",esc(y)+" / 1"],["Bildirim tarihi",dd(wd(+y,12,15))]])+'<div class="ts"><table class="t sform lifts" data-w="'+LW.join(",")+'"><colgroup>'+LW.map(function(x){return '<col style="width:'+x+'%">';}).join("")+'</colgroup><tbody>'+h+'</tbody></table></div>'+'<div class="ts"><table class="t sig tall"><tbody><tr><td><span class="sl">Hazırlayan (KYT):</span><br>'+esc(nm("kyt"))+'</td><td><span class="sl">İmza:</span><br>&nbsp;</td><td><span class="sl">Tarih:</span><br>'+esc(fmtD(wd(+y,12,15)))+'</td></tr></tbody></table></div></div>';}
/* ---------- Örnek veri üretici (ek kayıtlar) ---------- */
function bumpSeri(s,k){return String(s||"").replace(/(\d+)(?!.*\d)/,function(m){return String(+m+k).padStart(m.length,"0");});}
function prjVariant(base,o){var r=JSON.parse(JSON.stringify(base));r.id=kyId();Object.keys(o).forEach(function(k){r[k]=o[k];});return r;}
function scoreList(items,target,lows,skip){var nn=items.filter(function(it){return !skip||!skip(it);}).length,k=Math.round((target-4)*nn),i=0;return items.map(function(it){if(skip&&skip(it))return {konu:it,puan:""};var v=(lows&&lows[it])||(i<k?"5":"4");i++;return {konu:it,puan:v};});}
function kyxSample(yil,fill){
  yil=+yil;var y=String(yil),d=function(m,dd){return wd(yil,m,dd);},kk=T("kisaKod")||"FRM";
  KYX_TYPES.forEach(function(t){S.kayit[t]=(S.kayit[t]||[]).filter(function(r){return !(String(r.yil)===y&&r.ornek);});});
  var P14=null;(S.kayit.proje||[]).forEach(function(p){if(String(p.yil)===y&&p.ornek&&/-014$/.test(p.no||""))P14=p;});
  S.kayit.proje=(S.kayit.proje||[]).filter(function(p){return !(String(p.yil)===y&&p.ornek&&!/-014$/.test(p.no||""));});
  var SMV={A1:["Proje ve tip sertifikasıyla uyumlu","",],A2:["FR-07.05 ile aynı",""],A3:["Tam",""],B1:["Kuyu dibi 1200 mm / üst 3650 mm","EK-08"],B2:["62 lx","EK-07"],B3:["Var",""],B4:["Uygun",""],C1:["Maks. 5 mm","EK-11"],C2:["Min. 8 mm","EK-10"],C3:["128 N","EK-06"],C4:["Engelde yeniden açıldı",""],C5:["8/8 kat",""],D1:["> 500 MΩ","EK-01"],D2:["Maks. 0,2 Ω","EK-02"],D3:["24/24 kontak",""],D4:["Kalkış yok",""],E1:["Durdu; her kol tek başına durdurdu","EK-14"],E2:["Koşullar sağlandı",""],E3:["%47 (proje %47,5)","EK-04"],F1:["1,24 m/s","EK-05"],F2:["Durdu, eğim %1,5","EK-13"],F3:["Karşı ağırlık paraşütü yok",""],F4:["Kalıcı deformasyon yok",""],F5:["Durma mesafesi 0,84 m","EK-08"],F6:["Devreye girdi",""],G1:["Karşılandı",""],G2:["+4 / −3 mm","EK-09"],G3:["Tampondan 70 mm önce durdu","EK-09"],G4:["Uygun",""],G5:["Kabin kata alındı",""],G6:["Fren tuttu",""],G7:["6,5 lx / 1 saat 05 dk","EK-07"],G8:["Hatta bağlantı kuruldu",""],G9:["693 kg'da uyarı, kalkış yok","EK-14"],H1:["787,5 kg; kayma / hasar yok","EK-14"]};
  function fillSm(p,done){p.deneyler=smRows().map(function(x){var v=SMV[x.kod]||["",""];if(done){x.olcum=v[0];x.cihaz=v[1];x.sonuc=x.kod==="F3"?"UY":"U";}return x;});}
  if(P14){fillSm(P14,fill);P14.tescil=fill?"Tescil belgesi "+d(6,20).split("-").reverse().join(".")+" · ilk periyodik kontrol: yeşil etiket":"";P14.planSm=d(5,27);}
  if(P14){
   var p9=prjVariant(P14,{ornek:true,yil:y,no:kk+"-"+y+"-009",musteri:"Kardelen Yapı Ltd. Şti.",bina:"Kardelen Sitesi C Blok",adres:"Örnek Mah. Menekşe Cad. No:40, Yenimahalle / Ankara",binaSor:"Selin Kara / 0533 000 00 00",teklifNo:"TK-"+y+"-002",teklifTarih:wd(yil-1,12,15),sozlesmeNo:"SZ-"+y+"-001",tarih:d(1,5),montajBas:d(2,2),montajBit:d(3,20),planSm:d(3,25),smTarih:d(3,25),ceTarih:d(3,26),abubTarih:d(3,27),teslimTarih:d(3,31),arzTarih:d(3,31),durum:"Gerçekleşti",tescil:"",notlar:"Örnek proje (onaylanmış kuruluş gözetiminde teknik dosyası incelendi)."});
   p9.kalite.forEach(function(k){k.seriNo=bumpSeri(k.seriNo,-40);k.kontrolTarih=d(1,28);});p9.satinalma.forEach(function(s){s.siparisNo=s.siparisNo.replace(/-04(\d)$/,"-00$1");s.siparisTarih=d(1,9);s.gelisTarih=d(1,27);});
   var md9=[d(2,2),d(2,3),d(2,11),d(2,17),d(2,24),d(3,3),d(3,10),d(3,11),d(3,16),d(3,19),d(3,20)];p9.montaj.forEach(function(m,i){m.tarih=md9[i];m.sonuc="Uygun";m.not="";});fillSm(p9,true);
   var p16=prjVariant(P14,{ornek:true,yil:y,no:kk+"-"+y+"-016",musteri:"Akasya Konut Kooperatifi",bina:"Akasya Konutları A Blok",adres:"Örnek Mah. Ihlamur Sok. No:3, Etimesgut / Ankara",binaSor:"Mehmet Öz / 0535 000 00 00",teklifNo:"TK-"+y+"-044",teklifTarih:d(5,12),sozlesmeNo:"SZ-"+y+"-016",tarih:d(6,2),montajBas:d(7,1),montajBit:"",planSm:wd(yil+1,1,20),smTarih:"",ceTarih:"",abubTarih:"",teslimTarih:"",arzTarih:"",durum:"Planlandı",tescil:"",notlar:"Montajı devam eden örnek proje (habersiz ziyarette incelendi)."});
   p16.kalite.forEach(function(k){k.seriNo=bumpSeri(k.seriNo,60);k.kontrolTarih=d(6,26);});p16.satinalma.forEach(function(s){s.siparisNo=s.siparisNo.replace(/-04(\d)$/,"-06$1");s.siparisTarih=d(6,9);s.gelisTarih=d(6,25);});
   var md16=[d(6,30),d(7,1),d(7,10),d(7,17),d(7,24),d(8,4),d(9,15),"","","",""];p16.montaj.forEach(function(m,i){m.tarih=md16[i];m.sonuc=md16[i]?"Uygun":"";m.not=i===6?"Kat kapıları 1–5 tamamlandı, 6–8 devam ediyor":"";});fillSm(p16,false);
   var p18=prjVariant(P14,{ornek:true,yil:y,no:kk+"-"+y+"-018",musteri:"Papatya Apartmanı Yönetimi",bina:"Papatya Apartmanı",adres:"Örnek Mah. Çiğdem Sok. No:9, Keçiören / Ankara",binaSor:"Ayten Kaya / 0536 000 00 00",teklifNo:"TK-"+y+"-061",teklifTarih:d(10,13),sozlesmeNo:"SZ-"+y+"-018",tarih:d(11,4),montajBas:"",montajBit:"",planSm:wd(yil+1,4,15),smTarih:"",ceTarih:"",abubTarih:"",teslimTarih:"",arzTarih:"",durum:"Planlandı",tescil:"",notlar:"Sözleşmesi imzalanmış, malzeme siparişi verilmiş örnek proje."});
   p18.kalite=[];p18.satinalma.forEach(function(s){s.siparisNo=s.siparisNo.replace(/-04(\d)$/,"-09$1");s.siparisTarih=d(11,12);s.irsaliye="";s.gelisTarih="";});p18.montaj.forEach(function(m){m.tarih="";m.sonuc="";m.not="";});fillSm(p18,false);
   S.kayit.proje.push(p9,p16,p18);
  }
  var pn=P14?P14.no:kk+"-"+y+"-014",p9n=kk+"-"+y+"-009",p16n=kk+"-"+y+"-016";
  /* Ekipman */
  var EKD=[["IR-5000","IR5-221873"],["CT-200","CT2-11902"],["MM-87","MM8-55310"],["PA-370","PA3-70418"],["TK-600","TK6-02251"],["DF-500","DF5-33067"],["LX-101","LX1-40785"],["LM-80","LM8-90112"],["Çelik 5 m","SM-05-118"],["Dijital 150 mm","KP-15-7731"],["0,05–1 mm","SN-0907"],["LS-30","LS3-11520"],["600 mm","ST-6-2204"],["20 × 25 kg","DA-25-01…20"]];
  S.kayit.ekipman.push({id:kyId(),yil:y,ornek:true,baslik:"Ekipman ve kalibrasyon planı "+y,tarih:d(1,6),rev:"00",hazirlayan:nm("kyt"),cihazlar:EKIP_LIST.map(function(e,i){var internal=i===8||i===12,dw=i===13;var kt=dw?wd(yil-1,3,10):d(1,12+(i%6));var nx=dw?wd(yil+2,3,10):addD(kt,365);return {kod:e[0],ad:e[1],marka:EKD[i][0],seriNo:EKD[i][1],kalTarih:kt,firma:internal?"İç doğrulama":"Örnek Kalibrasyon Lab.",sertNo:internal?"İD-"+y+"-0"+(i+1):"KS-"+(dw?yil-1:yil)+"-"+String(310+i),sonraki:nx,durum:i===6?"Geçerli – etiket yenilendi":dw?"Geçerli – 3 yıllık doğrulama":"Geçerli"};})});
  /* Personel */
  var PL=[["gm","Genel Müdür",["—","—","—","—","—","Y","—","—"],"Uygulanmaz"],["tm","Teknik Müdür",["K","O","K","O","O","—","K","Y"],"Seviye 5 – geçerli"],["kyt","Kalite Yönetim Temsilcisi",["—","—","—","—","—","—","—","Y"],"Uygulanmaz"],["smd","Son Muayene ve Deney Sorumlusu",["K","—","Y","—","—","—","—","—"],"Seviye 4 – geçerli"],["sef","Montaj Şantiye Şefi",["Y","—","—","—","—","—","—","—"],"Seviye 4 – geçerli"],["bakimSefi","Bakım ve Revizyon Şefi",["—","—","—","—","—","—","Y","Y"],"Seviye 4 – geçerli"],["satin","Satın Alma ve Depo Sorumlusu",["—","Y","—","—","—","—","—","—"],"Uygulanmaz"]];
  var people=PL.map(function(x){return {ad:nm(x[0]),gorev:x[1],yt:x[2],myk:x[3],saha:["tm","smd","sef","bakimSefi"].indexOf(x[0])>=0};}).concat(techs().map(function(t){return {ad:t.ad,gorev:t.gorev,yt:/Bakım/.test(t.gorev)?["—","—","—","—","—","—","Y","—"]:["—","—","—","—","—","—","—","—"],myk:"Seviye 3 – geçerli",saha:true};}));
  people.forEach(function(p,i){var r={id:kyId(),yil:y,ornek:true,ad:p.ad,gorev:p.gorev,tarih:wd(yil-14+i,[2,4,6,9,3,10][i%6],3+i),sicil:"P-"+String(101+i)};YETKI.forEach(function(yk,j){r[yk[0]]=p.yt[j];});
   var gec=function(yy,m){return String(m).padStart(2,"0")+"."+(yil+yy);};
   r.belgeler=PERS_BELGE.map(function(b){var o={belge:b,durum:"Var",not:""};
    if(b==="MYK mesleki yeterlilik belgesi"){if(p.myk==="Uygulanmaz"){o.durum="Uygulanmaz";}else o.not=p.myk+" (son: "+gec(3,6)+")";}
    if(b==="Sağlık raporu (işe giriş / periyodik)")o.not="Periyodik – "+gec(0,2)+" / sonraki "+gec(1,2);
    if(b==="Yüksekte çalışma uygunluk raporu"){if(!p.saha)o.durum="Uygulanmaz";else if(p.ad===(techs("Bakım")[0]||{}).ad)o.not="Süresi dolmuştu (DÖF-"+y+"-02); "+d(3,24).split("-").reverse().join(".")+" yenilendi, geçerli "+gec(1,3);else o.not="Geçerli – "+gec(1,5);}
    if(b==="İSG eğitim sertifikası")o.not=p.saha?"16 saat – "+gec(0,2):"8 saat – "+gec(0,2);
    if(b==="Mesleki eğitim sertifikaları"&&!p.saha)o.durum="Uygulanmaz";
    if(b==="KKD zimmet tutanağı"&&!p.saha)o.durum="Uygulanmaz";
    return o;});
   S.kayit.personel.push(r);});
  /* Tedarikçiler */
  var TS=[["Örnek Asansör Sistemleri A.Ş.","Organize Sanayi Bölgesi 5. Cad. No:12, İzmir","Satış Müdürü / 0232 000 00 00 / satis@ornekasansor.example","Tahrik makinesi (Montanari), kumanda (Arkel), paraşüt ve regülatör (Dynatech), tampon (Wittur), halat (Gustav Wolf), kabin","Güvenlik aksamı",[25,15,10,18,13,9,4],"Onaylı"],["Örnek Kapı ve Aksam Ltd. Şti.","Sanayi Sitesi 12. Blok No:4, İstanbul","Satış Sorumlusu / 0212 000 00 00 / info@ornekkapi.example","Kat ve kabin kapıları, kilitler, operatör (Fermator), butonyer, alarm cihazı (Safeline)","Güvenlik aksamı",[25,15,10,16,12,8,2],"Onaylı"],["Örnek Ray ve Çelik San.","OSB 3. Cad. No:8, Konya","Proje Sorumlusu / 0332 000 00 00 / ray@ornekray.example","Kabin ve karşı ağırlık rayları (Monteferro), konsollar","Diğer kritik malzeme",[25,15,0,18,14,7,4],"Onaylı"],["Örnek Kalibrasyon Laboratuvarı","Teknopark No:21, Ankara","Laboratuvar Müdürü / 0312 000 00 00 / lab@ornekkal.example","Ölçüm cihazı kalibrasyonu ve deney ağırlığı doğrulaması","Hizmet",[25,15,10,18,13,9,0],"Onaylı"],["Örnek Hırdavat ve Bağlantı Elemanları","Gazi Mah. No:77, Ankara","Satış / 0312 000 00 01 / satis@ornekhirdavat.example","Bağlantı elemanları, dübel, kablo kanalı","Genel malzeme",[25,8,0,14,7,6,2],"Şartlı onaylı"]];
  TS.forEach(function(t,i){var notGa=t[4]!=="Güvenlik aksamı";S.kayit.tedarikci.push({id:kyId(),yil:y,ornek:true,firma:t[0],adres:t[1],ilgili:t[2],konu:t[3],tur:t[4],tarih:d(1,13+i),degerlendiren:nm("satin"),sonuc:t[6],dofNo:"",sonraki:wd(yil+1,1,13+i),
   kriterler:TED_KRIT.map(function(k,j){var kan=["Sertifikalar ve Modül belgesi dosyada","AB UB her teslimatta","Belge geçerli","Geçen yıl 0–1 uygunsuzluk","Teslimatlar zamanında","Montaj kılavuzları Türkçe","Piyasa ortalaması"][j];if(j===0&&notGa)kan="Uygulanmaz – tam puan";if(j===2&&!t[5][2])kan="Belgesi yok";if(i===4&&j===4)kan="2 teslimat gecikmesi – 6 ay izlenecek";return {kriter:k[0],agirlik:k[1],puan:String(t[5][j]),kanit:kan};})});});
  /* Kalite hedefleri */
  var HV={"Son muayenede ilk seferde geçiş":["%100","%100","%100","%100","%100","Sağlandı"],"A tipi muayenede ilk kontrolde yeşil etiket":["%86","%88","%85","%89","%87","Sağlandı"],"Onaylanmış kuruluş tetkik bulgusu":["–","–","0 (habersiz)","0 majör","0 majör","Sağlandı"],"Habersiz ziyarette şantiye uygunsuzluğu":["–","–","0","–","0","Sağlandı"],"Montaj teslim süresine uyum":["%100","%100","–","%100","%100","Sağlandı"],"Mahsur kalmada ilk müdahale":["42 dk","47 dk","39 dk","44 dk","43 dk","Sağlandı"],"Tekrarlayan arıza":["%3,1","%4,2","%3,6","%4,8","%3,9","Sağlandı"],"Müşteri memnuniyeti":["–","–","–","4,4","4,4","Sağlandı"],"Kalibrasyon uyumu":["0","0","0","0","0","Sağlandı"],"Eğitim planı gerçekleşmesi":["–","%100","–","%100","%100","Sağlandı"],"İş kazası":["0","0","0","0","0","Sağlandı"]};
  S.kayit.hedef.push({id:kyId(),yil:y,ornek:true,baslik:"Kalite hedefleri izleme "+y,tarih:fill?d(12,5):d(1,6),satirlar:(S.hedefler||[]).map(function(h){var v=fill?HV[h.hedef]:null;return {hedef:h.hedef,deger:h.deger,q1:v?v[0]:"",q2:v?v[1]:"",q3:v?v[2]:"",q4:v?v[3]:"",yil:v?v[4]:"",durum:v?v[5]:"İzleniyor"};})});
  if(!fill)return;
  /* DÖF – iç tetkik bulgularından */
  var DD={1:["Liste güncellendi; TS EN 81-20:2020 sürüm ve son kontrol tarihi işlendi.","Standart güncellemelerinin takibi için sorumlu ve periyot tanımlı değil.","PR-05.01'e dış kaynaklı dokümanların 3 ayda bir TSE ve CEN duyurularından kontrol edilmesi maddesi eklendi; kontrol KYT'ye atandı.","kyt",30,"Mayıs ve Ağustos kontrolleri FR-05.03'te kayıtlı; güncel olmayan sürüm tespit edilmedi.",[8,29],""],
   2:["Teknisyen yüksekte çalışma işlerinden alındı; eğitim ve uygunluk raporu 24.03 tarihinde yenilendi.","Personel belgelerinin geçerlilik tarihleri için hatırlatma sistemi yok.","Belge geçerlilik tarihleri personel dosyası kontrol listesine (FR-04.05) işlendi; bitimine 60 gün kala KYT uyarı verir.","kyt",30,"Haziran ve Eylül kontrollerinde süresi dolan belge bulunmadı.",[9,30],""],
   3:["Tedarikçiden AB uygunluk beyanı temin edilip giriş kontrol formuna ve teknik dosyaya eklendi.","Giriş kontrol formunda 'belgeler tam' kontrolü irsaliye kalemi bazında yapılmıyor.","FR-07.04'te belge kontrolünün her güvenlik aksamı için ayrı işaretlenmesi kuralı getirildi; depo personeline bilgilendirme yapıldı.","satin",21,"Mayıs–Temmuz arasındaki 6 giriş kontrol formu incelendi; tüm güvenlik aksamlarında AB uygunluk beyanı mevcut.",[7,31],"proj"],
   4:["Eksik günlerin kayıtları şantiye şefi beyanı ve puantajla tamamlandı.","Şantiye şefi aynı anda iki şantiyeyi yönetiyor; defterin şef yokken kimin tutacağı tanımlı değil.","Şef yokken montaj defterinin kıdemli montaj teknisyenince doldurulması PR-08.01'e eklendi; Teknik Müdür haftalık kontrol yapar.","tm",30,"Haziran–Ağustos şantiye denetimlerinde defterler eksiksiz bulundu.",[8,29],"p16"],
   5:["Ölçüm tekrarlandı (6,5 lx / 1 saat 05 dk) ve forma yazıldı.","'Ölçülen değer sayıyla yazılır' kuralı personel tarafından yeterince benimsenmemiş.","Son muayene personeline PR-09.01 ve formun doldurulması konusunda eğitim verildi (FR-04.03).","smd",30,"Temmuz–Eylül arasında düzenlenen Son Muayene ve Deney Formlarında tüm ölçüm kalemleri sayısal değerle doldurulmuş.",[10,10],"proj"],
   6:["Gerekçe Teknik Müdür tarafından dolduruldu.","Formda gerekçe alanı zorunlu olarak tanımlanmamış.","FR-13.01'de gerekçe yazılmadan karar verilmemesi kuralı Teknik Müdür ve Bakım ve Revizyon Şefi'ne tebliğ edildi.","bakimSefi",30,"Kasım ayındaki revizyon değerlendirmelerinde gerekçe alanı dolu.",[12,4],""],
   7:["Bina sorumlusundan imza alındı.","Bina sorumlusunun bulunmadığı günlerde onay alma yöntemi tanımlı değil.","Bina sorumlusu yoksa formun fotoğrafının aynı gün e-postayla gönderilip yazılı onay alınması PR-14.01'e eklendi.","bakimSefi",21,"Kasım sonu–Aralık başı bakım formlarının tamamında imza veya e-posta onayı mevcut.",[12,5],""]};
  var dofN=0;
  kyList("tetkik",y).forEach(function(t){(t.bulgular||[]).forEach(function(b){if(!b.dof)return;dofN++;var x=DD[dofN]||DD[1],td=t.gercTarih||t.tarih;
   S.kayit.dof.push({id:kyId(),yil:y,ornek:true,no:b.dof,tarih:td,tespitEden:t.tetkikci||nm("kyt"),projeNo:x[7]==="proj"?pn:x[7]==="p16"?p16n:"",kaynak:"İç tetkik",ilgiliKayit:(t.no||"")+" · "+(b.sart||""),sinif:b.sinif||"Minör",durum:"Kapandı",tanim:b.bulgu,duzeltme:x[0],urunKarar:"Uygulanmaz",dofGerekli:"Evet",kokNeden:x[1],faaliyet:x[2],sorumlu:nm(x[3]),termin:addD(td,x[4]),benzer:"Evet",etkinlik:x[5],dogrulayan:nm("kyt"),kapanis:d(x[6][0],x[6][1]),sonuc:"Etkin – kapatıldı"});});});
  S.kayit.dof.push({id:kyId(),yil:y,ornek:true,no:"UYG-"+y+"-01",tarih:d(5,13),tespitEden:nm("sef"),projeNo:pn,kaynak:"Montaj ara kontrolü",ilgiliKayit:"FR-08.07 Kapı montaj kontrolü · 3. kat",sinif:"Minör",durum:"Kapandı",tanim:"3. kat kat kapısında panel–eşik aralığı 7 mm ölçüldü (kriter ≤ 6 mm).",duzeltme:"Kapı paneli ve eşik ayarı yapıldı; tekrar ölçümde 5 mm.",urunKarar:"Yeniden işleme",dofGerekli:"Hayır",kokNeden:"",faaliyet:"Anında düzeltildi; tekil ayar hatası, tekrar riski düşük olduğundan DÖF açılmadı.",sorumlu:nm("sef"),termin:d(5,13),benzer:"Hayır",etkinlik:"Son muayenede C1 kapı aralıkları kalemi uygun (maks. 5 mm).",dogrulayan:nm("kyt"),kapanis:d(5,27),sonuc:"Etkin – kapatıldı"});
  /* Şikayetler */
  var SKL=[[1,22,"Telefon","Hizmet kalitesi","Gül Sitesi A Blok yöneticisi / 0530 000 00 01","Gül Sitesi A Blok – bakım sözleşmeli","Bakım sonrası kabin içi ve kuyu dibi kirli bırakıldı.","Uygulanmaz","Bakım ekibinin temizlik adımını atladığı teyit edildi.","Ekip uyarıldı; ertesi gün temizlik yapıldı.","Evet",""],[3,5,"E-posta","Arıza tekrarı","Merkez İş Hanı / 0312 000 00 02","Merkez İş Hanı – bakım sözleşmeli","Kabin kapısı ara sıra açılıp kapanıyor.","Uygulanmaz","Kapı koruyucu ışık perdesinde kirlenme tespit edildi.","Işık perdesi temizlendi ve ayarlandı; bakım formuna kalem eklendi.","Evet",""],[5,12,"Telefon","Güvenlik","Lale Apartmanı / 0532 000 00 03","Lale Apartmanı – bakım sözleşmeli","Kabin 2. katta kat seviyesinin yaklaşık 5 cm altında duruyor.","Evet","Kat seviye sensörü kaymış.","Aynı gün sensör ayarlandı; seviye ±5 mm'ye getirildi.","Evet",""],[7,17,"Yazılı (dilekçe)","Ticari","Çınar Apartmanı / 0312 000 00 04","Çınar Apartmanı – bakım sözleşmeli","Bakım faturası sözleşme bedelinden yüksek.","Uygulanmaz","Faturaya sözleşmede yer alan yıllık artış oranının yansıtıldığı görüldü.","Sözleşme maddesi ve hesap yazılı olarak açıklandı.","Hayır",""],[9,9,"Müşteri anketi","Hizmet kalitesi","Lale Apartmanı / 0532 000 00 03","Lale Apartmanı – bakım sözleşmeli","Ankette arıza hattına ulaşılabilirlik 3 puan aldı: mesai dışında hatta geç ulaşıldı.","Uygulanmaz","Mesai dışı çağrıların yönlendirildiği numarada bekleme süresi uzun.","Mesai dışı çağrılar nöbetçi teknisyenin cep telefonuna yönlendirildi.","Evet",""],[11,24,"Telefon","Arıza tekrarı","Gül Sitesi B Blok / 0530 000 00 05","Gül Sitesi B Blok – bakım sözleşmeli","30 gün içinde 3 kez kapı arızası nedeniyle asansör durdu.","Uygulanmaz","Kapı operatör kayışının gerginliğini kaybettiği tespit edildi.","Kayış ve kasnak değiştirildi; DÖF açıldı.","Evet","DÖF-"+y+"-08"]];
  SKL.forEach(function(s,i){var tt=d(s[0],s[1]);S.kayit.sikayet.push({id:kyId(),yil:y,ornek:true,no:"SK-"+y+"-"+String(i+1).padStart(2,"0"),tarih:tt,saat:["10:15","14:40","08:55","11:20","16:05","09:30"][i],alan:nm("kyt"),kanal:s[2]==="Müşteri anketi"?"Diğer":s[2],sinif:s[3],eden:s[4],bina:s[5],konu:s[6],ayniGun:s[7],inceleme:s[8],islem:s[9],ilkYanit:addD(tt,1),sonucTarih:addD(tt,s[3]==="Arıza tekrarı"?9:6),yanitlayan:nm("bakimSefi"),hakli:s[10],dofNo:s[11],durum:"Kapandı"});});
  var dofTt=d(11,25);
  S.kayit.dof.push({id:kyId(),yil:y,ornek:true,no:"DÖF-"+y+"-08",tarih:dofTt,tespitEden:nm("kyt"),projeNo:"",kaynak:"Şikayet",ilgiliKayit:"SK-"+y+"-06",sinif:"Minör",durum:"Açık",tanim:"Gül Sitesi B Blok asansöründe 30 gün içinde 3 kez kapı arızası (kapı operatör kayışı).",duzeltme:"Kapı operatör kayışı ve kasnağı değiştirildi.",urunKarar:"Uygulanmaz",dofGerekli:"Evet",kokNeden:"Kayış gerginliği bakım formunda sayısal olarak kontrol edilmiyor; aşınma geç fark ediliyor.",faaliyet:"Periyodik Bakım Formu'nda (FR-14.01) kapı operatörü kalemine kayış gerginliği kontrolü eklenecek; bakım teknisyenlerine bilgilendirme yapılacak.",sorumlu:nm("bakimSefi"),termin:wd(yil+1,1,15),benzer:"Evet",etkinlik:"3 ay boyunca kapı kaynaklı tekrarlayan arıza oranı izlenecek.",dogrulayan:nm("kyt"),kapanis:"",sonuc:""});
  /* Onaylanmış kuruluş denetimleri */
  S.kayit.obd.push({id:kyId(),yil:y,ornek:true,tur:"Habersiz ziyaret",tarih:d(7,8),kurulus:T("meKurulus")||"Onaylanmış kuruluş",denetci:"Onaylanmış kuruluş denetçisi",kapsam:"Şantiye dosyası; FR-08.01–08.05 ara kontrol formları; sahadaki güvenlik aksamlarının seri numaralarının FR-07.05 ile karşılaştırılması; kullanılan ölçüm aletlerinin kalibrasyon durumu.",saha:p16n+" – Akasya Konutları A Blok",eslik:nm("tm")+", "+nm("sef"),sonuc:"Belge devam ediyor",raporNo:"HZ-"+y+"-117",durum:"Kapandı",bulgular:[]});
  var obT=d(12,1);
  S.kayit.obd.push({id:kyId(),yil:y,ornek:true,tur:"Gözetim tetkiki",tarih:obT,kurulus:T("meKurulus")||"Onaylanmış kuruluş",denetci:"Baş denetçi ve teknik uzman",kapsam:"Kalite sistemi; iç tetkik ve YGG kayıtları; "+pn+" ve "+p9n+" teknik dosyaları; DÖF kayıtları; kalibrasyon ve personel yetkinlikleri.",saha:pn+", "+p9n+" (dosya incelemesi)",eslik:nm("gm")+", "+nm("tm")+", "+nm("kyt"),sonuc:"Bulgular kapatılınca belge devam eder",raporNo:"GT-"+y+"-208",durum:"Açık",
   bulgular:[{bulgu:p9n+" projesinin teknik dosyasında tescil belgesi ve ilk periyodik kontrol raporu bulunmuyor.",sinif:"Minör",dof:"DÖF-"+y+"-09",termin:wd(yil+1,1,30),kapanis:""},{bulgu:"Kalibrasyon sertifikalarının değerlendirme sonucu cihaz kartına da yazılabilir.",sinif:"Gözlem",dof:"",termin:"",kapanis:""}]});
  S.kayit.dof.push({id:kyId(),yil:y,ornek:true,no:"DÖF-"+y+"-09",tarih:obT,tespitEden:"Onaylanmış kuruluş ("+(T("meKurulus")||"")+")",projeNo:p9n,kaynak:"Onaylanmış kuruluş",ilgiliKayit:"Gözetim tetkiki GT-"+y+"-208",sinif:"Minör",durum:"Açık",tanim:p9n+" projesinin teknik dosyasında tescil belgesi ve ilk periyodik kontrol raporu bulunmuyor.",duzeltme:"Belgeler ilgili idareden ve muayene kuruluşundan temin edilip dosyaya eklendi.",urunKarar:"Uygulanmaz",dofGerekli:"Evet",kokNeden:"Teslimden sonra gelen belgelerin dosyaya eklenmesi için sorumlu ve kontrol adımı tanımlı değil.",faaliyet:"Teknik Dosya Kontrol Listesi (FR-06.04) uygulamaya alındı; tescil ve ilk periyodik kontrol raporu gelmeden dosya arşive kapatılmıyor.",sorumlu:nm("tm"),termin:wd(yil+1,1,30),benzer:"Evet",etkinlik:"Ocak ayında piyasaya arz edilen 3 projenin dosyası FR-06.04 ile kontrol edilecek.",dogrulayan:nm("kyt"),kapanis:"",sonuc:""});
  /* Anketler */
  var it4=anketItems("Montaj").filter(function(x){return x.charAt(0)!=="#";}),it5=anketItems("Teknik servis");
  function sec(name){var on=false,out={};it5.forEach(function(x){if(x.charAt(0)==="#"){on=x.indexOf(name)>=0;return;}if(on)out[x]=1;});return out;}
  var sB=sec("Periyodik bakım"),sA=sec("Arıza"),sM=sec("Modernizasyon"),sG=sec("Genel"),it5q=it5.filter(function(x){return x.charAt(0)!=="#";});
  function only(){var allow=Array.prototype.slice.call(arguments);return function(it){return !allow.some(function(s){return s[it];});};}
  var AN=[["Montaj",d(4,15),"Kardelen Yapı Ltd. Şti. / Kardelen Sitesi C Blok",p9n,"31.03."+y,"","Selin Kara / Site yöneticisi","E-posta","Evet","Montaj ekibi çok özenliydi.",scoreList(it4,4.62)],
   ["Montaj",d(6,26),"Yıldız Yapı Kooperatifi / Yıldız Apartmanı B Blok",pn,"02.06."+y,"","Ahmet Yılmaz / Bina sorumlusu","Elden","Evet","Teslimde verilen bilgilendirme yeterliydi.",scoreList(it4,4.46)],
   ["Teknik servis",d(3,20),"Gül Sitesi A Blok","Tescil 06-1184","Ocak–Mart "+y,"Periyodik bakım","Site yöneticisi","Telefon","Evet","",scoreList(it5q,4.43,null,only(sB,sG))],
   ["Teknik servis",d(6,18),"Merkez İş Hanı","Tescil 06-2271","Nisan–Haziran "+y,"Periyodik bakım ve arıza","Yönetim müdürü","E-posta","Evet","Arıza dönüşleri hızlı.",scoreList(it5q,4.27,null,only(sB,sA,sG))],
   ["Teknik servis",d(9,8),"Lale Apartmanı","Tescil 06-0932","Temmuz–Eylül "+y,"Arıza / kurtarma","Apartman yöneticisi","Telefon","Kararsızım","Mesai dışında arıza hattına geç ulaştık.",scoreList(it5q,4.14,{"7/24 arıza ve kurtarma hattına ulaşılabilirlik":"3"},only(sA,sG))],
   ["Teknik servis",d(11,3),"Çınar Apartmanı","Tescil 06-0577","Modernizasyon teslimi","Modernizasyon (revizyon)","Apartman yöneticisi","Elden","Evet","",scoreList(it5q,4.5,null,only(sM,sG))]];
  AN.forEach(function(a,i){S.kayit.anket.push({id:kyId(),yil:y,ornek:true,tur:a[0],tarih:a[1],musteri:a[2],seriNo:a[3],teslimTarih:a[4],hizmet:a[5],dolduran:a[6],yontem:a[7],tavsiye:a[8],gorus:a[9],puanlar:a[10],sikayetNo:i===4?"SK-"+y+"-05":"",degerlendiren:nm("kyt")});});
}

/* ---------- Ek uygulama kayıtları: DÖF, şikayet, anket, tedarikçi, ekipman, personel, hedef, onaylanmış kuruluş ---------- */
function fRows(rows){return '<div class="ts"><table class="t kv form"><tbody>'+rows.map(function(r){if(String(r[0]).charAt(0)==="#")return '<tr class="grp"><td colspan="2">'+esc(String(r[0]).slice(1).trim())+'</td></tr>';return '<tr><th>'+esc(r[0])+'</th><td'+(r[2]?' class="opts"':'')+'>'+(r[1]===undefined||r[1]===""?"&nbsp;":r[1])+'</td></tr>';}).join("")+'</tbody></table></div>';}
function optX(list,sel){return list.map(function(o){var on=Array.isArray(sel)?sel.indexOf(o)>=0:o===sel;return (on?CHK:UNCHK)+" "+esc(o).replace(/ /g," ");}).join("    ");}
function yilOf(r){return String(r.yil||kyYil);}
function sameYear(type,r){return kyList(type,yilOf(r));}
var DOF_KAYNAK=["Giriş kontrolü","Montaj ara kontrolü","Son muayene","Onaylanmış kuruluş","Periyodik kontrol","Bakanlık","Bakım","Şikayet","İç tetkik","Kaza / olay","Müşteri anketi"];
function anketItems(tur){var t=TPL[tur==="Teknik servis"?"FR-11.05":"FR-11.04"],out=[];t.parts.forEach(function(p){if(p.chk)p.chk.items.forEach(function(it){out.push(it);});});return out;}
function anketPuanlar(tur){return anketItems(tur).filter(function(x){return x.charAt(0)!=="#";}).map(function(x){return {konu:x,puan:""};});}
function anketOrt(r){var s=0,n=0;(r.puanlar||[]).forEach(function(p){var v=+p.puan;if(v){s+=v;n++;}});return n?Math.round(s/n*100)/100:0;}
function fmtOrt(x){return x?String(x.toFixed(2)).replace(".",","):"–";}
function tedPuan(r){var t=0;(r.kriterler||[]).forEach(function(k){t+=+String(k.puan||0).replace(",",".")||0;});return t;}
var TED_KRIT=[["AB tip inceleme sertifikası ve Modül E/H/C2 belgesi (güvenlik aksamında zorunlu)","25"],["CE işareti ve AB uygunluk beyanı","15"],["ISO 9001 belgesi","10"],["Ürün kalitesi / geçmiş uygunsuzluklar","20"],["Teslim süresine uyum","15"],["Teknik destek ve doküman","10"],["Fiyat ve ödeme koşulları","5"]];
var YETKI=[["y1","Montaj ara kontrol (FR-08)"],["y2","Güvenlik aksamı giriş kontrolü"],["y3","Son muayene ve deney (FR-09.01)"],["y4","Son Muayene ve Deney Formu onayı"],["y5","CE etiket onayı"],["y6","AB UB imzası"],["y7","Bakım / kurtarma"],["y8","İç tetkik"]];
var PERS_BELGE=["Kimlik fotokopisi","Diploma","MYK mesleki yeterlilik belgesi","Sağlık raporu (işe giriş / periyodik)","Yüksekte çalışma uygunluk raporu","İSG eğitim sertifikası","Mesleki eğitim sertifikaları","Oryantasyon kaydı","Yetki matrisi kaydı","KKD zimmet tutanağı","Görev tanımı tebliğ imzası"];
var EKIP_LIST=[["EK-01","Yalıtım direnci ölçer"],["EK-02","Süreklilik / topraklama ölçer"],["EK-03","Multimetre"],["EK-04","Pens ampermetre"],["EK-05","Takometre / regülatör test cihazı"],["EK-06","Kapı kuvvet ölçer"],["EK-07","Lüksmetre"],["EK-08","Lazer metre"],["EK-09","Şerit metre"],["EK-10","Kumpas"],["EK-11","Sentil takımı"],["EK-12","Lazer şakul"],["EK-13","Su terazisi"],["EK-14","Deney ağırlıkları"]];
var SEL_YETKI="select:|Y|O|K|—";
var KYX={
 dof:{label:"DÖF",nav:"Uygunsuzluk ve DÖF",
  def:{f:[["no","Uygunsuzluk / DÖF no","text"],["tarih","Tarih","date"],["tespitEden","Tespit eden","text"],["projeNo","Proje / seri no","text"],["kaynak","Kaynak","select:|"+DOF_KAYNAK.join("|")],["ilgiliKayit","İlgili kayıt (tetkik, şikayet, proje vb.)","text"],["sinif","Sınıf","select:|Kritik|Majör|Minör|Gözlem"],["durum","Durum","select:|Açık|Kapandı"],
   ["tanim","Uygunsuzluğun tanımı","textarea","wide"],["duzeltme","Anında yapılan düzeltme","textarea","wide"],["urunKarar","Uygunsuz ürün kararı","select:|Yeniden işleme|İade|Hurda|Asansör kullanıma kapatıldı|Uygulanmaz"],["dofGerekli","DÖF gerekli mi?","select:|Evet|Hayır"],
   ["kokNeden","Kök neden","textarea","wide"],["faaliyet","Düzeltici / önleyici faaliyet","textarea","wide"],["sorumlu","Faaliyet sorumlusu","text"],["termin","Termin","date"],["benzer","Benzer projelerde aynı risk var mı?","select:|Evet|Hayır"],
   ["etkinlik","Etkinlik doğrulaması (yöntem ve sonuç)","textarea","wide"],["dogrulayan","Doğrulayan (KYT)","text"],["kapanis","Kapanış tarihi","date"],["sonuc","Sonuç","select:|Etkin – kapatıldı|Etkin değil – yeni DÖF açıldı"]],arr:[],
   docs:[["form","FR-11.01 Uygunsuzluk ve DÖF"],["liste","DÖF takip listesi (yıllık)"]]},
  yearly:["liste"],
  title:function(r){return (r.no||"Yeni kayıt")+(r.tanim?" – "+String(r.tanim).slice(0,48)+(String(r.tanim).length>48?"…":""):"");},
  init:function(r,y){r.no="DÖF-"+y+"-"+String(kyList("dof",y).length+1).padStart(2,"0");r.durum="Açık";r.dogrulayan=T("kyt");},
  doc:function(r,w){
   if(w==="liste"){var L=sameYear("dof",r);return tplHead("FR-11.01").replace("Uygunsuzluk ve DÖF Formu","DÖF Takip Listesi "+yilOf(r))+'<div class="tplbody">'+tTable(["No","Tarih","Kaynak / ilgili kayıt","Uygunsuzluk","Sınıf","Sorumlu","Termin","Kapanış","Durum"],L.map(function(x){return tRow([ee(x.no),dd(x.tarih),ee([x.kaynak,x.ilgiliKayit].filter(Boolean).join(" · ")),ee(x.tanim),ee(x.sinif),ee(x.sorumlu),dd(x.termin),dd(x.kapanis),ee(x.durum)]);}),"",[12,9,14,26,7,10,8,8,6])+'<p>Toplam: <b>'+L.length+'</b> · Açık: <b>'+L.filter(function(x){return x.durum!=="Kapandı";}).length+'</b> · Kapanan: <b>'+L.filter(function(x){return x.durum==="Kapandı";}).length+'</b></p>'+sigF([["Hazırlayan (KYT)",nm("kyt"),""]])+'</div>';}
   return tplHead("FR-11.01")+'<div class="tplbody">'+fRows([["Uygunsuzluk / DÖF no",ee(r.no)],["Tarih",dd(r.tarih)],["Tespit eden",ee(r.tespitEden)],["Proje / seri no",ee(r.projeNo)],["İlgili kayıt",ee(r.ilgiliKayit)],["Kaynak",optX(DOF_KAYNAK.slice(0,10),r.kaynak)+(r.kaynak==="Müşteri anketi"?" "+CHK+" Müşteri anketi":""),1],["Sınıf",optX(["Kritik","Majör","Minör","Gözlem"],r.sinif),1]])+
    fRows([["Uygunsuzluğun tanımı",vv(r.tanim)],["Anında yapılan düzeltme",vv(r.duzeltme)],["Uygunsuz ürün kararı",optX(["Yeniden işleme","İade","Hurda","Asansör kullanıma kapatıldı","Uygulanmaz"],r.urunKarar),1]])+
    '<h3>Düzeltici / önleyici faaliyet</h3>'+fRows([["DÖF gerekli mi?",optX(["Evet","Hayır"],r.dofGerekli),1],["Kök neden",vv(r.kokNeden)],["Faaliyet, sorumlu ve termin",vv(r.faaliyet)+(r.sorumlu||r.termin?"<br><b>Sorumlu:</b> "+ee(r.sorumlu)+" · <b>Termin:</b> "+dd(r.termin):"")],["Benzer projelerde aynı risk var mı?",optX(["Evet","Hayır"],r.benzer),1],["Etkinlik doğrulaması",vv(r.etkinlik)],["Sonuç",optX(["Etkin – kapatıldı","Etkin değil – yeni DÖF açıldı"],r.sonuc)+(r.kapanis?" · Kapanış: "+esc(fmtD(r.kapanis)):""),1]])+
    sigF([["Tespit eden",r.tespitEden,r.tarih],["Faaliyet sorumlusu",r.sorumlu,r.termin],["KYT (kapanış)",r.dogrulayan||nm("kyt"),r.kapanis]])+'</div>';},
  name:function(r,w){return w==="liste"?"DOF Takip Listesi "+yilOf(r):"FR-11.01 "+(r.no||"");}},
 sikayet:{label:"Şikayet",nav:"Şikayetler",
  def:{f:[["no","Şikayet no","text"],["tarih","Tarih","date"],["saat","Saat","text"],["alan","Alan personel","text"],["kanal","Kanal","select:|Telefon|E-posta|Web sitesi|Yazılı (dilekçe)|Bakım personeli aracılığıyla|Diğer"],["sinif","Sınıf","select:|Güvenlik|Arıza tekrarı|Hizmet kalitesi|Ticari|Diğer"],
   ["eden","Şikayet eden (ad, telefon)","text","wide"],["bina","Bina / asansör seri no","text","wide"],["konu","Şikayetin konusu","textarea","wide"],["ayniGun","Güvenlikle ilgili ise aynı gün sahaya gidildi","select:|Evet|Hayır|Uygulanmaz"],
   ["inceleme","İnceleme sonucu","textarea","wide"],["islem","Yapılan işlem","textarea","wide"],["ilkYanit","İlk yanıt tarihi","date"],["sonucTarih","Sonuç bildirim tarihi","date"],["yanitlayan","Yanıtlayan","text"],["hakli","Şikayet haklı mı?","select:|Evet|Hayır"],["dofNo","DÖF no (açıldıysa)","text"],["durum","Durum","select:|Açık|Kapandı"]],arr:[],
   docs:[["form","FR-11.03 Şikayet kaydı"],["liste","Şikayet listesi ve analiz (yıllık)"]]},
  yearly:["liste"],
  title:function(r){return (r.no||"Yeni şikayet")+(r.konu?" – "+String(r.konu).slice(0,44)+(String(r.konu).length>44?"…":""):"");},
  init:function(r,y){r.no="SK-"+y+"-"+String(kyList("sikayet",y).length+1).padStart(2,"0");r.alan=T("kyt");r.durum="Açık";},
  doc:function(r,w){
   if(w==="liste"){var L=sameYear("sikayet",r),by={};L.forEach(function(x){by[x.sinif||"Diğer"]=(by[x.sinif||"Diğer"]||0)+1;});return prjHead("Şikayet Listesi ve Analizi "+yilOf(r),"KALİTE SİSTEMİ")+'<div class="tplbody">'+tTable(["No","Tarih","Bina / asansör","Konu","Sınıf","Haklı","Sonuç bildirimi","DÖF"],L.map(function(x){return tRow([ee(x.no),dd(x.tarih),ee(x.bina),ee(x.konu),ee(x.sinif),ee(x.hakli),dd(x.sonucTarih),ee(x.dofNo)]);}),"",[9,10,17,30,10,7,10,7])+'<h3>Sınıflara göre dağılım</h3>'+tTable(["Sınıf","Adet"],Object.keys(by).map(function(k){return tRow([esc(k),String(by[k])]);}),"",[70,30])+'<p>Toplam <b>'+L.length+'</b> şikayet; süresinde (≤ 15 iş günü) sonuçlandırılan: <b>'+L.filter(function(x){return x.sonucTarih;}).length+'</b>.</p>'+sigF([["Hazırlayan (KYT)",nm("kyt"),""]])+'</div>';}
   return tplHead("FR-11.03")+'<div class="tplbody">'+kvGrid2([["Şikayet no",ee(r.no)],["Tarih / saat",ee([fmtD(r.tarih),r.saat].filter(Boolean).join(" · "))],["Alan personel",ee(r.alan)],["Kanal",ee(r.kanal)]])+
    fRows([["Şikayet eden (ad, telefon)",ee(r.eden)],["Bina / asansör seri no",ee(r.bina)],["Şikayetin konusu",vv(r.konu)],["Sınıf",optX(["Güvenlik","Arıza tekrarı","Hizmet kalitesi","Ticari","Diğer"],r.sinif),1],["Güvenlikle ilgili ise aynı gün sahaya gidildi",optX(["Evet","Hayır","Uygulanmaz"],r.ayniGun),1],["İnceleme sonucu",vv(r.inceleme)],["Yapılan işlem",vv(r.islem)]])+
    tTable(["Adım","Tarih","Yapan"],[tRow(["İlk yanıt (≤ 3 iş günü)",dd(r.ilkYanit),ee(r.yanitlayan)]),tRow(["Sonuç bildirimi (≤ 15 iş günü)",dd(r.sonucTarih),ee(r.yanitlayan)])],"",[50,20,30])+
    fRows([["Şikayet haklı mı?",optX(["Evet","Hayır"],r.hakli),1],["DÖF açıldı mı?",r.dofNo?CHK+" Evet (no: "+esc(r.dofNo)+")    "+UNCHK+" Hayır":UNCHK+" Evet    "+CHK+" Hayır",1]])+
    sigF([["İnceleyen",r.yanitlayan,r.sonucTarih],["KYT",nm("kyt"),r.sonucTarih]])+'</div>';},
  name:function(r,w){return w==="liste"?"Sikayet Listesi "+yilOf(r):"FR-11.03 "+(r.no||"");}},
 anket:{label:"Anket",nav:"Müşteri anketleri",
  def:{f:[["tur","Anket türü","select:Montaj|Teknik servis"],["tarih","Anket tarihi","date"],["musteri","Müşteri / bina","text","wide"],["seriNo","Asansör seri / tescil no","text"],["teslimTarih","Teslim tarihi / anket dönemi","text"],["hizmet","Alınan hizmet (teknik servis)","select:|Periyodik bakım|Arıza / kurtarma|Modernizasyon (revizyon)|Periyodik bakım ve arıza"],["dolduran","Anketi dolduran (ad soyad / görev)","text","wide"],["yontem","Anket yöntemi","select:|Elden|E-posta|Telefon"],["tavsiye","Firmamızı tavsiye eder misiniz?","select:|Evet|Hayır|Kararsızım"],["gorus","Görüş ve öneriler","textarea","wide"],["sikayetNo","3 ve altı puanlar için şikayet / DÖF no","text"],["degerlendiren","Değerlendiren (KYT)","text"]],
   arr:[["puanlar","Puanlar (5 = çok iyi … 1 = çok kötü; almadığı hizmet boş)",[["konu","Değerlendirme konusu","text"],["puan","Puan","select:|5|4|3|2|1"]],{konu:"",puan:""}]],
   docs:[["form","Dolu anket formu (FR-11.04 / 11.05)"],["ozet","Anket sonuçları özeti (yıllık)"]]},
  yearly:["ozet"],
  title:function(r){return (r.tur||"Anket")+" – "+(r.musteri||"yeni anket")+(anketOrt(r)?" ("+fmtOrt(anketOrt(r))+")":"");},
  init:function(r,y){r.tur="Montaj";r.degerlendiren=T("kyt");r.puanlar=anketPuanlar("Montaj");},
  doc:function(r,w){
   if(w==="ozet"){var L=sameYear("anket",r);function avg(f){var a=L.filter(f).map(anketOrt).filter(Boolean);return a.length?a.reduce(function(x,y){return x+y;},0)/a.length:0;}var am=avg(function(x){return x.tur==="Montaj";}),at=avg(function(x){return x.tur==="Teknik servis";}),aa=avg(function(){return true;});
    return prjHead("Müşteri Memnuniyeti Anket Sonuçları "+yilOf(r),"KALİTE SİSTEMİ")+'<div class="tplbody">'+tTable(["No","Tarih","Tür","Müşteri / bina","Ortalama","Tavsiye","3 ve altı puan","Şikayet / DÖF"],L.map(function(x,i){var low=(x.puanlar||[]).filter(function(p){return p.puan&&+p.puan<=3;}).length;return tRow([String(i+1),dd(x.tarih),ee(x.tur),ee(x.musteri),fmtOrt(anketOrt(x)),ee(x.tavsiye),String(low),ee(x.sikayetNo)]);}),"",[5,10,11,30,9,9,12,14])+
     tTable(["Gösterge","Değer"],[tRow(["Montaj anketleri ortalaması (FR-11.04)",fmtOrt(am)]),tRow(["Teknik servis anketleri ortalaması (FR-11.05)",fmtOrt(at)]),tRow(["Genel ortalama",fmtOrt(aa)]),tRow(["Kalite hedefi","≥ 4,2 – "+(aa>=4.2?"Sağlandı":aa?"Sağlanmadı":"–")])],"",[70,30])+sigF([["Hazırlayan (KYT)",nm("kyt"),""]])+'</div>';}
   var code=r.tur==="Teknik servis"?"FR-11.05":"FR-11.04",P={};(r.puanlar||[]).forEach(function(p){P[p.konu]=p.puan;});var no=0;
   var rows=anketItems(r.tur).map(function(it){if(it.charAt(0)==="#")return '<tr class="grp"><td colspan="7">'+esc(it.slice(1).trim())+'</td></tr>';no++;var v=P[it]||"";return '<tr><td>'+no+'</td><td>'+esc(it)+'</td>'+["5","4","3","2","1"].map(function(s){return '<td class="box">'+(v===s?CHK:UNCHK)+'</td>';}).join("")+'</tr>';}).join("");
   var info=r.tur==="Teknik servis"?[["Müşteri / bina",ee(r.musteri)],["Asansör seri / tescil no",ee(r.seriNo)],["Anket dönemi",ee(r.teslimTarih)],["Anket tarihi",dd(r.tarih)],["Alınan hizmet",ee(r.hizmet)],["Anketi dolduran",ee(r.dolduran)]]:[["Müşteri / bina",ee(r.musteri)],["Asansör seri no",ee(r.seriNo)],["Teslim tarihi",ee(r.teslimTarih)],["Anket tarihi",dd(r.tarih)],["Anketi dolduran",ee(r.dolduran)],["Anket yöntemi",ee(r.yontem)]];
   var low=(r.puanlar||[]).filter(function(p){return p.puan&&+p.puan<=3;}).map(function(p){return p.konu+" ("+p.puan+")";});
   return tplHead(code)+'<div class="tplbody">'+kvGrid2(info)+'<div class="ts"><table class="t chk" data-w="5,50,9,9,9,9,9"><thead><tr><th>No</th><th>Değerlendirme konusu</th><th class="box">Çok iyi (5)</th><th class="box">İyi (4)</th><th class="box">Orta (3)</th><th class="box">Kötü (2)</th><th class="box">Çok kötü (1)</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    fRows([["Firmamızı başkalarına tavsiye eder misiniz?",optX(["Evet","Hayır","Kararsızım"],r.tavsiye),1],["Görüş ve önerileriniz",vv(r.gorus)],["#Firma tarafından doldurulur"],["Ortalama puan (5 üzerinden)","<b>"+fmtOrt(anketOrt(r))+"</b>"],["3 ve altı puan alan konular / şikayet (FR-11.03) – DÖF (FR-11.01) no",ee([low.join(", "),r.sikayetNo].filter(Boolean).join(" → "))||"Yok"],["Değerlendiren (KYT) / tarih",ee([r.degerlendiren,fmtD(r.tarih)].filter(Boolean).join(" · "))]])+'</div>';},
  name:function(r,w){return w==="ozet"?"Anket Sonuclari "+yilOf(r):(r.tur==="Teknik servis"?"FR-11.05 ":"FR-11.04 ")+(r.tarih||"")+" "+(r.musteri||"");}},
 tedarikci:{label:"Tedarikçi",nav:"Tedarikçiler",
  def:{f:[["firma","Tedarikçi","text","wide"],["adres","Adres","text","wide"],["ilgili","İlgili kişi / telefon / e-posta","text","wide"],["konu","Tedarik konusu","text","wide"],["tur","Tür","select:|Güvenlik aksamı|Diğer kritik malzeme|Genel malzeme|Hizmet"],["tarih","Değerlendirme tarihi","date"],["degerlendiren","Değerlendiren (Satın Alma)","text"],["sonuc","Sonuç","select:|Onaylı|Şartlı onaylı|Onaysız"],["dofNo","Şartlı onayda DÖF no","text"],["sonraki","Sonraki değerlendirme","date"]],
   arr:[["kriterler","Değerlendirme kriterleri",[["kriter","Kriter","text"],["agirlik","Ağırlık","text"],["puan","Verilen puan","text"],["kanit","Kanıt / açıklama","text"]],{kriter:"",agirlik:"",puan:"",kanit:""}]],
   docs:[["form","FR-07.01 Tedarikçi değerlendirme"],["liste","FR-07.02 Onaylı tedarikçi listesi"]]},
  yearly:["liste"],
  title:function(r){return (r.firma||"Yeni tedarikçi")+(r.sonuc?" · "+r.sonuc:"");},
  init:function(r,y){r.degerlendiren=T("satin");r.kriterler=TED_KRIT.map(function(k){return {kriter:k[0],agirlik:k[1],puan:"",kanit:""};});},
  doc:function(r,w){
   if(w==="liste"){var L=sameYear("tedarikci",r).filter(function(x){return x.sonuc==="Onaylı"||x.sonuc==="Şartlı onaylı";});return tplHead("FR-07.02")+'<div class="tplbody">'+kvGrid2([["Revizyon",esc(yilOf(r))+"/01"],["Tarih",dd(minD(sameYear("tedarikci",r),"tarih"))]])+tTable(["No","Firma adı","İletişim bilgileri (yetkili, telefon, e-posta)","Alınan ürün / hizmet","Onay durumu"],L.map(function(x,i){return tRow([String(i+1),ee(x.firma),ee(x.ilgili),ee(x.konu),ee(x.sonuc)+(x.sonuc==="Şartlı onaylı"&&x.dofNo?" ("+esc(x.dofNo)+")":"")]);}),"",[5,24,36,23,12])+'<p class="note">Onay durumu: Onaylı veya Şartlı onaylı. Değerlendirme ayrıntıları Tedarikçi Değerlendirme Formu\'nda (FR-07.01) tutulur.</p>'+sigF([["Hazırlayan (Satın Alma)",nm("satin"),""],["Onaylayan (Genel Müdür)",nm("gm"),""]])+'</div>';}
   var tot=tedPuan(r);
   return tplHead("FR-07.01")+'<div class="tplbody">'+kvGrid2([["Tedarikçi",ee(r.firma)],["Değerlendirme tarihi",dd(r.tarih)],["Adres",ee(r.adres)],["İlgili kişi / telefon",ee(r.ilgili)],["Tedarik konusu",ee(r.konu)],["Tür",ee(r.tur)]])+
    tTable(["Kriter","Ağırlık (puan)","Verilen puan","Kanıt / açıklama"],(r.kriterler||[]).map(function(k){return tRow([ee(k.kriter),ee(k.agirlik),ee(k.puan),ee(k.kanit)]);}).concat([tRow(["<b>TOPLAM</b>","<b>100</b>","<b>"+tot+"</b>","&nbsp;"])]),"",[44,12,12,32])+
    fRows([["Sonuç",optX(["Onaylı","Şartlı onaylı","Onaysız"],r.sonuc)+(r.dofNo?" (DÖF no: "+esc(r.dofNo)+")":"")+(r.sonraki?" · Sonraki değerlendirme: "+esc(fmtD(r.sonraki)):""),1]])+
    sigF([["Değerlendiren (Satın Alma)",r.degerlendiren||nm("satin"),r.tarih],["Kontrol (KYT)",nm("kyt"),r.tarih],["Onay (Genel Müdür)",nm("gm"),r.tarih]])+'</div>';},
  name:function(r,w){return w==="liste"?"FR-07.02 Onayli Tedarikci Listesi "+yilOf(r):"FR-07.01 "+(r.firma||"");}},
 ekipman:{label:"Ekipman",nav:"Ekipman ve kalibrasyon",
  def:{f:[["baslik","Plan adı","text","wide"],["tarih","Plan tarihi","date"],["rev","Revizyon","text"],["hazirlayan","Hazırlayan","text"]],
   arr:[["cihazlar","Ölçme ve test ekipmanları",[["kod","Ekipman no","text"],["ad","Ekipman adı","text"],["marka","Marka / model","text"],["seriNo","Seri no","text"],["kalTarih","Kalibrasyon tarihi","date"],["firma","Kalibrasyon firması","text"],["sertNo","Sertifika no","text"],["sonraki","Sonraki kalibrasyon","date"],["durum","Durum / not","text"]],{kod:"",ad:"",marka:"",seriNo:"",kalTarih:"",firma:"",sertNo:"",sonraki:"",durum:""}]],
   docs:[["plan","FR-10.01 Ekipman ve kalibrasyon planı"]]},
  yearly:[],
  title:function(r){return r.baslik||"Ekipman ve kalibrasyon planı";},
  init:function(r,y){r.baslik="Ekipman ve kalibrasyon planı "+y;r.rev="00";r.hazirlayan=T("kyt");r.cihazlar=EKIP_LIST.map(function(e){return {kod:e[0],ad:e[1],marka:"",seriNo:"",kalTarih:"",firma:"",sertNo:"",sonraki:"",durum:""};});},
  doc:function(r){var C=r.cihazlar||[],t=todayISO();return tplHead("FR-10.01")+'<div class="tplbody">'+kvGrid2([["Revizyon",ee(r.rev)],["Tarih",dd(r.tarih)]])+tTable(["Ekipman no","Ekipman adı","Marka / model","Seri no","Kalibrasyon tarihi","Kalibrasyon firması","Sertifika no","Sonraki kalibrasyon","Durum"],C.map(function(c){var late=c.sonraki&&c.sonraki<t;return tRow([ee(c.kod),ee(c.ad),ee(c.marka),ee(c.seriNo),dd(c.kalTarih),ee(c.firma),ee(c.sertNo),dd(c.sonraki),late?"<b>Süresi geçti</b>":ee(c.durum||"Geçerli")]);}),"",[8,15,12,11,10,13,11,10,10])+'<p class="note">Kalibrasyon sertifikaları geldiğinde ölçüm sonuçları kabul kriterleriyle karşılaştırılır; uygun olmayan cihaz etiketlenip kullanımdan alınır ve önceki ölçümlerin etkisi değerlendirilir (PR-10.01).</p>'+sigF([["Hazırlayan (KYT)",r.hazirlayan||nm("kyt"),r.tarih]])+'</div>';},
  name:function(r){return "FR-10.01 Ekipman ve Kalibrasyon Plani "+yilOf(r);}},
 personel:{label:"Personel",nav:"Personel ve yetki",
  def:{f:[["ad","Ad Soyad","text"],["gorev","Görev","text"],["tarih","İşe giriş tarihi","date"],["sicil","Sicil no","text"]].concat(YETKI.map(function(y){return [y[0],y[1],SEL_YETKI];})),
   arr:[["belgeler","Personel dosyası belgeleri (FR-04.05)",[["belge","Belge","text"],["durum","Durum","select:|Var|Yok|Uygulanmaz"],["not","Geçerlilik / not","text"]],{belge:"",durum:"",not:""}]],
   docs:[["dosya","FR-04.05 Personel dosyası kontrol listesi"],["matris","FR-04.04 Yetki matrisi"]]},
  yearly:["matris"],
  title:function(r){return (r.ad||"Yeni personel")+(r.gorev?" – "+r.gorev:"");},
  init:function(r){r.belgeler=PERS_BELGE.map(function(b){return {belge:b,durum:"",not:""};});YETKI.forEach(function(y){r[y[0]]="—";});},
  doc:function(r,w){
   if(w==="matris"){var L=sameYear("personel",r);return tplHead("FR-04.04")+'<div class="tplbody">'+kvGrid2([["Revizyon",esc(yilOf(r))+"/01"],["Tarih",dd(minD(L,"tarih")>yilOf(r)+"-01-01"?minD(L,"tarih"):yilOf(r)+"-01-05")]])+'<p>İşaretler: Y = yapar / imzalar, O = onaylar, K = kontrol eder, — = yetkisiz</p>'+tTable(["Ad Soyad","Görev"].concat(YETKI.map(function(y){return y[1];})),L.map(function(x){return '<tr><td>'+ee(x.ad)+'</td><td>'+ee(x.gorev)+'</td>'+YETKI.map(function(y){return '<td class="box">'+ee(x[y[0]]||"—")+'</td>';}).join("")+'</tr>';}),"",[14,16,9,9,9,9,8,8,9,9])+sigF([["Hazırlayan (KYT)",nm("kyt"),""],["Onaylayan (Teknik Müdür)",nm("tm"),""]])+'</div>';}
   return tplHead("FR-04.05")+'<div class="tplbody">'+kvGrid2([["Ad Soyad",ee(r.ad)],["Görev",ee(r.gorev)],["İşe giriş tarihi",dd(r.tarih)],["Sicil no",ee(r.sicil)]])+'<div class="ts"><table class="t chk" data-w="6,44,9,9,32"><thead><tr><th>No</th><th>Belge</th><th class="box">Var</th><th class="box">Yok</th><th>Geçerlilik / not</th></tr></thead><tbody>'+(r.belgeler||[]).map(function(b,i){return '<tr><td>'+(i+1)+'</td><td>'+ee(b.belge)+'</td><td class="box">'+(b.durum==="Var"?CHK:UNCHK)+'</td><td class="box">'+(b.durum==="Yok"?CHK:UNCHK)+'</td><td>'+(b.durum==="Uygulanmaz"?"Uygulanmaz":ee(b.not))+'</td></tr>';}).join("")+'</tbody></table></div>'+
    '<h3>Yetkiler (FR-04.04)</h3>'+tTable(["Yetki","Durum"],YETKI.map(function(y){return tRow([esc(y[1]),ee(r[y[0]]||"—")]);}),"",[70,30])+sigF([["Kontrol eden (İdari İşler)",nm("kyt"),yilOf(r)+"-01-05"]])+'</div>';},
  name:function(r,w){return w==="matris"?"FR-04.04 Yetki Matrisi "+yilOf(r):"FR-04.05 "+(r.ad||"");}},
 hedef:{label:"Hedef",nav:"Kalite hedefleri izleme",
  def:{f:[["baslik","Başlık","text","wide"],["tarih","Güncelleme tarihi","date"]],
   arr:[["satirlar","Hedef gerçekleşmeleri",[["hedef","Hedef","text"],["deger","Hedef değer","text"],["q1","1. çeyrek","text"],["q2","2. çeyrek","text"],["q3","3. çeyrek","text"],["q4","4. çeyrek","text"],["yil","Yıl sonu","text"],["durum","Durum","select:|Sağlandı|Sağlanmadı|İzleniyor"]],{hedef:"",deger:"",q1:"",q2:"",q3:"",q4:"",yil:"",durum:""}]],
   docs:[["tablo","FR-15.04 Kalite hedefleri izleme"]]},
  yearly:[],
  title:function(r){return r.baslik||"Kalite hedefleri izleme";},
  init:function(r,y){r.baslik="Kalite hedefleri izleme "+y;r.satirlar=(S.hedefler||[]).map(function(h){return {hedef:h.hedef,deger:h.deger,q1:"",q2:"",q3:"",q4:"",yil:"",durum:"İzleniyor"};});},
  doc:function(r){return tplHead("FR-15.04")+'<div class="tplbody">'+kvGrid2([["Yıl",esc(yilOf(r))],["Güncelleme tarihi",dd(r.tarih)]])+tTable(["Hedef","Hedef değer","1. çeyrek","2. çeyrek","3. çeyrek","4. çeyrek","Yıl sonu","Durum"],(r.satirlar||[]).map(function(s){return tRow([ee(s.hedef),ee(s.deger),ee(s.q1),ee(s.q2),ee(s.q3),ee(s.q4),"<b>"+ee(s.yil)+"</b>",ee(s.durum)]);}),"",[28,10,9,9,9,9,10,16])+sigF([["Hazırlayan (KYT)",nm("kyt"),r.tarih],["Genel Müdür",nm("gm"),r.tarih]])+'</div>';},
  name:function(r){return "FR-15.04 Kalite Hedefleri Izleme "+yilOf(r);}},
 obd:{label:"Onaylanmış kuruluş",nav:"Onaylanmış kuruluş denetimleri",
  def:{f:[["tur","Denetim türü","select:|İlk belgelendirme|Gözetim tetkiki|Habersiz ziyaret|Yeniden belgelendirme|Proje / dosya incelemesi"],["tarih","Denetim tarihi","date"],["kurulus","Onaylanmış kuruluş","text"],["denetci","Denetçi(ler)","text"],["kapsam","Kapsam / incelenen kayıtlar","textarea","wide"],["saha","Ziyaret edilen şantiye / proje","text","wide"],["eslik","Eşlik eden personel","text","wide"],["sonuc","Sonuç","select:|Belge devam ediyor|Bulgular kapatılınca belge devam eder|Belge askıya alındı"],["raporNo","Kuruluş rapor no","text"],["durum","Durum","select:|Açık|Kapandı"]],
   arr:[["bulgular","Bulgular",[["bulgu","Bulgu","textarea"],["sinif","Sınıf","select:|Majör|Minör|Gözlem"],["dof","DÖF no","text"],["termin","Termin","date"],["kapanis","Kapanış tarihi","date"]],{bulgu:"",sinif:"",dof:"",termin:"",kapanis:""}]],
   docs:[["form","FR-15.06 Onaylanmış kuruluş denetim takibi"]]},
  yearly:[],
  title:function(r){return (r.tur||"Denetim")+(r.tarih?"":"")+(r.saha?" – "+r.saha:"");},
  init:function(r){r.kurulus=T("meKurulus");r.durum="Açık";r.bulgular=[];},
  doc:function(r){var B=r.bulgular||[];return tplHead("FR-15.06")+'<div class="tplbody">'+kvGrid2([["Denetim türü",ee(r.tur)],["Denetim tarihi",dd(r.tarih)],["Onaylanmış kuruluş",ee(r.kurulus)+(T("meKurulusNo")?" (kimlik no "+esc(T("meKurulusNo"))+")":"")],["Denetçi(ler)",ee(r.denetci)],["Kuruluş rapor no",ee(r.raporNo)],["Eşlik eden",ee(r.eslik)]])+fRows([["Kapsam / incelenen kayıtlar",vv(r.kapsam)],["Ziyaret edilen şantiye / proje",ee(r.saha)]])+
   tTable(["No","Bulgu","Sınıf","DÖF no","Termin","Kapanış tarihi"],B.length?B.map(function(b,i){return tRow([String(i+1),vv(b.bulgu),ee(b.sinif),ee(b.dof),dd(b.termin),dd(b.kapanis)]);}):[tRow(["–","Bulgu yok","&nbsp;","&nbsp;","&nbsp;","&nbsp;"])],"",[5,45,10,14,13,13])+
   fRows([["Sonuç",optX(["Belge devam ediyor","Bulgular kapatılınca belge devam eder","Belge askıya alındı"],r.sonuc),1]])+sigF([["KYT",nm("kyt"),r.tarih],["Genel Müdür",nm("gm"),r.tarih]])+'</div>';},
  name:function(r){return "FR-15.06 "+(r.tarih||"")+" "+(r.tur||"");}}
};
var KYX_TYPES=Object.keys(KYX);
function kyAllTypes(){return ["egitim","tetkik","ygg","proje"].concat(KYX_TYPES);}

var KYX_FOLD={dof:"5-Uygunsuzluk-DOF",sikayet:"6-Sikayetler",anket:"7-Musteri-Anketleri",tedarikci:"8-Tedarikciler",ekipman:"9-Ekipman-Kalibrasyon",personel:"10-Personel-Yetki",hedef:"11-Kalite-Hedefleri",obd:"12-Onaylanmis-Kurulus-Denetimleri"};
KYX_TYPES.forEach(function(t){KY_TYPES[t]=KYX[t].label;});
var _kyOrnekBase=kyOrnek;kyOrnek=function(yil,fill){_kyOrnekBase(yil,fill);kyxSample(yil,fill);};
/* ---------- Uygulama kayıtları görünümü ---------- */
var kyYil=String(new Date().getFullYear()),kySub="takvim",kySel={egitim:"",tetkik:"",ygg:"",proje:""},kyDoc={egitim:"katilim",tetkik:"rapor",ygg:"tutanak",proje:"ozet"},kyGen=false,kyGenFill=true;
var KY_DEF={
 egitim:{f:[["konu","Eğitim konusu","text","wide"],["tarih","Planlanan tarih","date"],["saat","Saat","text"],["sure","Süre (saat)","number"],["yer","Yer","text"],["egitmen","Eğitmen","text"],["kurum","Kurum","text"],["durum","Durum","status"],["gercTarih","Gerçekleşme tarihi","date"],["duyuruTarihi","Duyuru tarihi","date"],["icerik","Eğitim içeriği","textarea","wide"],["etkYontem","Etkinlik ölçme yöntemi","select:|Sınav|Gözetimli uygulama|İş sonuçlarının değerlendirilmesi|Diğer"],["etkTarih","Etkinlik değerlendirme tarihi","date"],["etkSonuc","Genel etkinlik sonucu","textarea","wide"]],
  arr:[["katilimcilar","Katılımcılar ve etkinlik sonuçları",[["ad","Ad Soyad","text"],["gorev","Görev","text"],["puan","Puan / sonuç","text"],["etkin","Etkin","select:|E|H"],["not","Etkin değilse yapılacak","text"]],{ad:"",gorev:"",puan:"",etkin:"",not:""}]],
  docs:[["katilim","FR-04.03 Katılım ve etkinlik"],["duyuru","Duyuru"],["plan","FR-04.02 Yıllık eğitim planı"]]},
 tetkik:{f:[["no","Rapor no","text"],["alan","Tetkik edilecek alan / süreç","text","wide"],["bolum","Kalite El Kitabı bölümü","text"],["tetkikci","Tetkikçi","text"],["tarih","Planlanan tarih","date"],["saat","Saat","text"],["durum","Durum","status"],["gercTarih","Gerçekleşme tarihi","date"],["duyuruTarihi","Duyuru tarihi","date"],["gorusulen","Görüşülen kişiler","text","wide"],["kapsam","Kapsam ve incelenen kayıtlar","textarea","wide"],["olumlu","Olumlu bulgular","textarea","wide"],["degerlendirme","Genel değerlendirme","textarea","wide"]],
  arr:[["bulgular","Bulgular",[["bulgu","Bulgu","textarea"],["sart","Şart (Kalite El Kitabı / PR / Ek X)","text"],["sinif","Sınıf","select:|Majör|Minör|Gözlem"],["dof","DÖF no","text"]],{bulgu:"",sart:"",sinif:"",dof:""}]],
  docs:[["rapor","FR-15.02 İç tetkik raporu"],["duyuru","Duyuru"],["plan","FR-15.01 Yıllık iç tetkik planı"]]},
 ygg:{f:[["no","Toplantı no","text"],["tarih","Planlanan tarih","date"],["saat","Saat","text"],["yer","Yer","text"],["durum","Durum","status"],["gercTarih","Gerçekleşme tarihi","date"],["duyuruTarihi","Davet tarihi","date"],["girdiSon","Girdilerin son teslim tarihi","date"]],
  arr:[["katilimcilar","Katılımcılar",[["ad","Ad Soyad","text"],["gorev","Görev","text"]],{ad:"",gorev:""}],["gundem","Gündem ve değerlendirmeler",[["madde","Gündem maddesi","text"],["degerlendirme","Değerlendirme","textarea"]],{madde:"",degerlendirme:""}],["kararlar","Kararlar",[["karar","Karar","textarea"],["sorumlu","Sorumlu","text"],["termin","Termin","date"],["durum","Durum","select:|Açık|Tamamlandı"]],{karar:"",sorumlu:"",termin:"",durum:"Açık"}]],
  docs:[["tutanak","FR-15.03 YGG tutanağı"],["duyuru","Toplantı daveti"]]},
 proje:PRJ_DEF
};
KYX_TYPES.forEach(function(t){KY_DEF[t]=KYX[t].def;kySel[t]="";kyDoc[t]=KYX[t].def.docs[0][0];});
function kyNew(type){
  var y=kyYil,r={id:kyId(),yil:y,durum:"Planlandı",tarih:"",duyuruTarihi:""};
  if(type==="egitim"){r.konu="";r.katilimcilar=[];}
  if(type==="tetkik"){r.no="IT-"+y+"-"+String(kyList("tetkik",y).length+1).padStart(2,"0");r.alan="";r.tetkikci=T("kyt");r.bulgular=[];}
  if(KYX[type])KYX[type].init(r,y);
  if(type==="proje"){r.planSm="";r.deneyler=smRows();r.no=(T("kisaKod")||"FRM")+"-"+y+"-"+String(kyList("proje",y).length+1).padStart(3,"0");r.tipSert=T("tipSertNo");r.montajYili=y;r.parametreler=["Beyan yükü / kişi sayısı","Beyan hızı","Hareket mesafesi / durak","Askı oranı, halat tipi ve sayısı","Tahrik makinesi tipi ve yeri","Kabin ölçüsü / kabin ağırlığı","Kapı tipi ve ölçüsü","Kuyu ölçüsü","Kuyu dibi / kuyu üstü","Güvenlik aksamları","Deprem kategorisi (EN 81-77)"].map(function(p){return {parametre:p,aralik:"",deger:"",uygun:""};});r.satinalma=[];r.kalite=["Kat kapısı kilitleri","Kabin kapısı kilidi","Kabin paraşütü","Aşırı hız regülatörü","Kabin tamponu","Karşı ağırlık tamponu","UCMP aksamı","Yukarı yön aşırı hız koruması","Güvenlik devresi elektronik elemanı / PESSRAL"].map(function(a){return {aksam:a,marka:"",seriNo:"",sertNo:"",gecerlilik:"",kurulusNo:T("meKurulusNo")||"",sonuc:"",kontrolTarih:""};});r.montaj=[["FR-08.01","Kuyu ölçümü ve teslim alma"],["FR-08.02","Sevkiyat kontrolü"],["FR-08.03","Ray montajı"],["FR-08.04","Makine ve regülatör montajı"],["FR-08.05","Kabin, paraşüt ve karşı ağırlık"],["FR-08.06","Halat ve askı"],["FR-08.07","Kapı montajı"],["FR-08.08","Tampon ve kuyu dibi"],["FR-08.09","Elektrik tesisatı"],["FR-08.10","İlk çalıştırma ve ayar"],["FR-08.11","Montaj bitiş bildirimi"]].map(function(m){return {form:m[0],asama:m[1],tarih:"",kontrol:"",sonuc:"",not:""};});}
  if(type==="ygg"){r.no="YGG-"+y+"-"+String(kyList("ygg",y).length+1).padStart(2,"0");r.yer="Merkez ofis toplantı salonu";r.katilimcilar=["gm","kyt","tm","bakimSefi","smd"].map(function(k){return {ad:T(k),gorev:SAMPLE_ROLE[k]};});r.gundem=YGG_GUNDEM.map(function(m){return {madde:m,degerlendirme:""};});r.kararlar=[];}
  S.kayit[type].push(r);kySel[type]=r.id;return r;
}
function kyYears(){var s={};s[kyYil]=1;var c=new Date().getFullYear();[c-1,c,c+1].forEach(function(y){s[y]=1;});kyAllTypes().forEach(function(t){(S.kayit[t]||[]).forEach(function(r){if(r.yil)s[r.yil]=1;});});return Object.keys(s).sort();}
function kyFieldHTML(type,r,f){
  if(f[2]==="head")return '<div class="field wide ky-fh"><h4>'+esc(f[1])+'</h4></div>';
  var k=f[0],val=r[k]==null?"":r[k],id="ky-"+type+"-"+k,a=' id="'+id+'" data-kr="'+type+'" data-kid="'+r.id+'" data-kf="'+k+'"',inp;
  if(f[2]==="textarea")inp='<textarea'+a+' rows="3">'+esc(val)+'</textarea>';
  else if(f[2]==="status")inp='<select'+a+'>'+KY_STATUS.map(function(o){return '<option'+(o===val?" selected":"")+'>'+o+'</option>';}).join("")+'</select>';
  else if(f[2].indexOf("select:")===0)inp='<select'+a+'>'+f[2].slice(7).split("|").map(function(o){return '<option value="'+esc(o)+'"'+(o===val?" selected":"")+'>'+(o||"—")+'</option>';}).join("")+'</select>';
  else inp='<input'+a+' type="'+(f[2]==="date"?"date":f[2]==="number"?"number":"text")+'" value="'+esc(val)+'">';
  return '<div class="field'+(f[3]==="wide"?" wide":"")+'"><label for="'+id+'">'+esc(f[1])+'</label>'+inp+'</div>';
}
function kyMini(type,r,ad){
  var key=ad[0],cols=ad[2],arr=r[key]||(r[key]=[]);
  var body=arr.map(function(row,i){return '<tr>'+cols.map(function(c){var v=row[c[0]]==null?"":row[c[0]],a=' data-kr="'+type+'" data-kid="'+r.id+'" data-ka="'+key+'" data-ki="'+i+'" data-kf="'+c[0]+'" aria-label="'+esc(c[1])+'"';
    if(c[2]==="textarea")return '<td><textarea rows="1"'+a+'>'+esc(v)+'</textarea></td>';
    if(c[2].indexOf("select:")===0)return '<td><select'+a+'>'+c[2].slice(7).split("|").map(function(o){return '<option value="'+esc(o)+'"'+(o===v?" selected":"")+'>'+(o||"—")+'</option>';}).join("")+'</select></td>';
    var dlx=kyDl(type,key,c[0],row);return '<td><input type="'+(c[2]==="date"?"date":"text")+'"'+a+(dlx?' list="'+dlx+'" autocomplete="off"':"")+' value="'+esc(v)+'"></td>';}).join("")+'<td class="del"><button class="x" data-kdel="'+type+'|'+r.id+'|'+key+'|'+i+'" title="Satırı sil" aria-label="Satırı sil">×</button></td></tr>';}).join("");
  return '<div class="ky-arr"><div class="toolbar"><b>'+esc(ad[1])+'</b><span class="count">'+arr.length+' satır</span><button class="btn" data-kadd="'+type+'|'+r.id+'|'+key+'">+ Satır ekle</button>'+(key==="katilimcilar"?'<button class="btn ghost" data-kfill="'+type+'|'+r.id+'">Görevlileri ekle</button>':"")+(type==="proje"&&(key==="satinalma"||key==="kalite")?'<span class="count">Marka / model ve tedarikçi alanlarında listeden seçin veya yazın; yazdığınız yeni değerler listeye eklenir.</span>':"")+'</div>'+
   '<div class="tscroll"><table class="edit ky-edit"><thead><tr>'+cols.map(function(c){return '<th>'+esc(c[1])+'</th>';}).join("")+'<th></th></tr></thead><tbody>'+(body||'<tr><td colspan="'+(cols.length+1)+'" class="empty-row">Henüz satır yok.</td></tr>')+'</tbody></table></div></div>';
}
function kyListHTML(type){
  var L=kyList(type,kyYil);
  if(!L.length)return '<p class="lead" style="padding:8px">Bu yıl için kayıt yok. "Ekle" ile yeni kayıt açın ya da "Örnek kayıt oluştur"u kullanın.</p>';
  return L.map(function(r){return '<button class="ky-i'+(r.id===kySel[type]?" on":"")+'" data-kysel="'+type+'|'+r.id+'"><span class="d">'+(r.tarih?esc(fmtD(r.tarih).slice(0,5)):"--.--")+'</span><span class="n">'+esc(kyTitle(type,r))+(r.ornek?' <span class="ex">örnek</span>':"")+'</span>'+(KYX[type]?kyxPill(type,r):kyPill(r))+'</button>';}).join("");
}
function kyxPill(type,r){var v=type==="tedarikci"?r.sonuc:type==="anket"?(anketOrt(r)?fmtOrt(anketOrt(r)):""):(type==="dof"||type==="sikayet"||type==="obd")?r.durum:"";if(!v)return "";var c=/Kapandı|^Onaylı$/.test(v)?"ok":/Açık|Şartlı/.test(v)?"warn":/Onaysız/.test(v)?"bad":"plan";return '<span class="st st-'+c+'">'+esc(v)+'</span>';}
function kyDocHTML(type,r,which){
  if(KYX[type])return KYX[type].doc(r,which);
  if(type==="proje")return docPrj(r,which);
  if(type==="egitim")return which==="plan"?docEgitimPlan(kyYil):which==="duyuru"?docDuyuru("egitim",r):docEgitimKatilim(r);
  if(type==="tetkik")return which==="plan"?docTetkikPlan(kyYil):which==="duyuru"?docDuyuru("tetkik",r):docTetkikRapor(r);
  return which==="duyuru"?docDuyuru("ygg",r):docYgg(r);
}
function kyDocName(type,r,which){
  if(KYX[type])return safeName(KYX[type].name(r,which))+".html";
  if(type==="proje")return prjDocName(r,which)+".html";
  var t=which==="plan"?(type==="egitim"?"FR-04.02 Yillik Egitim Plani "+kyYil:"FR-15.01 Yillik Ic Tetkik Plani "+kyYil):which==="duyuru"?duyuruNo(type,r)+" Duyuru "+kyTitle(type,r):(type==="egitim"?"FR-04.03 "+(r.tarih||"")+" "+kyTitle(type,r):type==="tetkik"?"FR-15.02 "+(r.no||"")+" "+kyTitle(type,r):"FR-15.03 "+(r.no||""));
  return safeName(t)+".html";
}
function kyEditor(type){
  var L=kyList(type,kyYil);if(!kyFind(type,kySel[type])||String(kyFind(type,kySel[type]).yil)!==kyYil)kySel[type]=L.length?L[0].id:"";
  var r=kyFind(type,kySel[type]),D=KY_DEF[type];
  var left='<aside class="ky-side"><div class="toolbar" style="justify-content:space-between"><b>'+esc(KY_TYPES[type])+' · '+esc(kyYil)+'</b><button class="btn" data-kynew="'+type+'">+ Ekle</button></div><div class="ky-list" id="ky-list">'+kyListHTML(type)+'</div></aside>';
  if(!r)return '<div class="ky-shell">'+left+'<div class="ky-main"><div class="ky-empty"><p>Kayıt seçilmedi.</p>'+(type==="proje"?'<p class="lead">"+ Ekle" ile yeni montaj projesi açın; satın alma, kalite kontrol, teklif-sözleşme ve montaj kayıtlarından ilgili formlar dolu olarak oluşur.</p>':type!=="ygg"?'<p class="lead">Yıllık plan dokümanı kayıt eklendikçe otomatik oluşur.</p>':"")+'</div></div></div>';
  var which=kyDoc[type];
  var form='<fieldset><legend>'+esc(kyTitle(type,r))+'</legend><div class="grid">'+D.f.map(function(f){return kyFieldHTML(type,r,f);}).join("")+'</div></fieldset>'+D.arr.map(function(ad){return kyMini(type,r,ad);}).join("")+
   '<div class="toolbar" style="margin-top:12px"><button class="btn danger" data-kyrm="'+type+'|'+r.id+'">Kaydı sil</button>'+(r.ornek?'<span class="count">Bu kayıt örnek verilerle oluşturuldu; isim ve içerikleri kendi bilgilerinizle değiştirin.</span>':"")+'</div>';
  var prev='<div class="ky-prev-head"><div class="seg" role="group" aria-label="Doküman">'+D.docs.map(function(d){return '<button data-kydoc="'+type+'|'+d[0]+'" aria-pressed="'+(which===d[0])+'">'+esc(d[1])+'</button>';}).join("")+'</div><span class="toolbar" style="margin:0"><button class="btn" data-kyword="'+type+'">Word olarak indir</button><button class="btn" data-kydl="'+type+'">HTML olarak indir</button></span></div><article class="paper tpl-paper" id="ky-prev">'+kyDocHTML(type,r,which)+'</article>';
  return (type==="proje"?kyDatalists():"")+'<div class="ky-shell">'+left+'<div class="ky-main"><div class="groups">'+form+'</div><h3 class="ky-h">Oluşan doküman</h3>'+prev+'</div></div>';
}
function kyTakvim(){
  var ev=kyEvents(kyYil),by={};ev.forEach(function(e){var m=ayOf(e.r.tarih);(by[m]=by[m]||[]).push(e);});
  var cnt={t:ev.length,g:ev.filter(function(e){return e.r.durum==="Gerçekleşti";}).length,p:ev.filter(function(e){return kyState(e.r)==="Planlandı";}).length,l:ev.filter(function(e){return kyState(e.r)==="Gecikmiş";}).length};
  var stats='<div class="ky-stats"><div><b>'+kyList("egitim",kyYil).length+'</b><span>eğitim</span></div><div><b>'+kyList("tetkik",kyYil).length+'</b><span>iç tetkik</span></div><div><b>'+kyList("ygg",kyYil).length+'</b><span>YGG</span></div><div><b>'+cnt.g+'/'+cnt.t+'</b><span>gerçekleşti</span></div><div class="'+(cnt.l?"warn":"")+'"><b>'+cnt.l+'</b><span>gecikmiş</span></div></div>';
  var months=AYLAR.map(function(a,i){var L=(by[i+1]||[]).sort(function(x,y){return String(x.r.tarih).localeCompare(String(y.r.tarih));});
    var du=ev.filter(function(e){return ayOf(e.r.duyuruTarihi)===i+1&&e.r.durum!=="İptal";});
    return '<div class="ky-month"><div class="mh">'+a+'<span>'+L.length+'</span></div>'+(L.length?L.map(function(e){return '<button class="ky-ev t-'+e.type+'" data-kyopen="'+e.type+'|'+e.r.id+'"><span class="d">'+esc(fmtD(e.r.tarih).slice(0,5))+'</span><span class="chip">'+esc(KY_TYPES[e.type])+'</span><span class="n">'+esc(kyTitle(e.type,e.r))+'</span>'+kyPill(e.r)+'</button>';}).join(""):'<p class="none">Faaliyet yok</p>')+
     (du.length?'<div class="du">Duyuru: '+du.map(function(e){return esc(fmtD(e.r.duyuruTarihi).slice(0,5))+" "+esc(KY_TYPES[e.type]);}).join(" · ")+'</div>':"")+'</div>';}).join("");
  var nod=ev.filter(function(e){return !e.r.tarih;});
  return stats+(nod.length?'<p class="banner">Tarihi girilmemiş '+nod.length+' kayıt var; takvimde görünmez.</p>':"")+'<div class="toolbar"><button class="btn" data-kytakdl="1">Yıllık faaliyet takvimini indir</button></div><div class="ky-months">'+months+'</div>';
}
function kyDuyurular(){
  var ev=kyEvents(kyYil).filter(function(e){return e.r.durum!=="İptal";}).sort(function(a,b){return String(a.r.duyuruTarihi||a.r.tarih||"9").localeCompare(String(b.r.duyuruTarihi||b.r.tarih||"9"));});
  var t=todayISO();
  var rows=ev.map(function(e){var due=e.r.duyuruTarihi&&e.r.duyuruTarihi<=t&&e.r.tarih>=t;return '<tr><td class="mono">'+esc(duyuruNo(e.type,e.r))+'</td><td>'+(e.r.duyuruTarihi?esc(fmtD(e.r.duyuruTarihi)):'<span class="ph">[tarih yok]</span>')+(due?' <span class="st st-warn">yayın zamanı</span>':"")+'</td><td>'+esc(KY_TYPES[e.type])+'</td><td>'+esc(kyTitle(e.type,e.r))+'</td><td>'+esc(fmtD(e.r.tarih))+'</td><td class="acts"><button class="btn" data-kyopen="'+e.type+'|'+e.r.id+'|duyuru">Aç</button><button class="btn" data-kydudl="'+e.type+'|'+e.r.id+'">İndir</button></td></tr>';}).join("");
  return '<p class="lead" style="margin-bottom:12px">Her faaliyet için duyuru otomatik oluşur. Duyuru tarihi kayıtta değiştirilebilir; varsayılan olarak eğitim ve iç tetkikten 7, YGG\'den 10 gün öncedir.</p><div class="tscroll"><table class="edit ky-dt"><thead><tr><th>Duyuru no</th><th>Duyuru tarihi</th><th>Faaliyet</th><th>Konu</th><th>Faaliyet tarihi</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="6" class="empty-row">Bu yıl için faaliyet yok.</td></tr>')+'</tbody></table></div>';
}
function viewKayitlar(){
  kyInit();
  var subs=[["takvim","Yıllık takvim"],["egitim","Eğitim planı ve kayıtları"],["tetkik","İç tetkik planı ve kayıtları"],["ygg","YGG toplantısı"],["proje","Montaj projeleri (izlenebilirlik)"]].concat(KYX_TYPES.map(function(t){return [t,KYX[t].nav];})).concat([["duyuru","Duyurular"]]);
  var head='<div class="panel-head"><div><h2 class="ph-title">Uygulama kayıtları</h2><p class="lead">Yıllık eğitim, iç tetkik ve YGG faaliyetlerini planlayın; montaj projelerini, DÖF, şikayet, müşteri anketi, tedarikçi, kalibrasyon, personel, kalite hedefi ve onaylanmış kuruluş denetimi kayıtlarını girin. İlgili formlar, listeler ve duyurular kayıtlarınızdan dolu olarak oluşur.</p></div>'+
   '<div class="toolbar" style="margin:0"><label class="count" for="ky-yil">Yıl</label><select id="ky-yil" class="ky-yil">'+kyYears().map(function(y){return '<option'+(y===kyYil?" selected":"")+'>'+y+'</option>';}).join("")+'</select><button class="btn" id="ky-gen">Örnek kayıt oluştur</button><button class="btn primary" id="ky-wzip">Yılın kayıtları Word ZIP</button><button class="btn" id="ky-zip">HTML ZIP</button></div></div>';
  var gen=kyGen?'<div class="banner ky-gen"><div><b>'+esc(kyYil)+' için örnek kayıt oluştur.</b> 8 eğitim, 13 iç tetkik, 1 YGG toplantısı, tüm kayıtlarıyla 4 montaj projesi; iç tetkik bulgularına bağlı DÖF\'ler, şikayetler, müşteri anketleri, tedarikçi değerlendirmeleri, kalibrasyon planı, personel ve yetki kayıtları, kalite hedefi gerçekleşmeleri ve onaylanmış kuruluş denetimleri. Görevliler sekmesindeki isimler kullanılır, boş olanlara örnek isim yazılır. Bu yılın mevcut eğitim, iç tetkik ve YGG kayıtları silinir; diğer bölümlerde yalnızca önceki örnek kayıtlar yenilenir, kendi girdiğiniz kayıtlar korunur.</div><label class="chk"><input type="checkbox" id="ky-genfill"'+(kyGenFill?" checked":"")+'> Sonuçları da doldur (gerçekleşmiş örnek kayıt)</label><button class="btn primary" id="ky-gen-ok">Oluştur</button><button class="btn ghost" id="ky-gen-no">Vazgeç</button></div>':"";
  var nav='<nav class="ky-sub" role="tablist">'+subs.map(function(s){return '<button class="tab" data-kysub="'+s[0]+'" aria-selected="'+(kySub===s[0])+'">'+s[1]+'</button>';}).join("")+'</nav>';
  var body=kySub==="takvim"?kyTakvim():kySub==="duyuru"?kyDuyurular():kyEditor(kySub);
  return head+gen+nav+'<div class="ky-body">'+body+'</div>';
}
var kyPrevT=null;
function kyRefresh(type){
  var l=document.getElementById("ky-list");if(l)l.innerHTML=kyListHTML(type);
  clearTimeout(kyPrevT);kyPrevT=setTimeout(function(){var p=document.getElementById("ky-prev"),r=kyFind(type,kySel[type]);if(p&&r)p.innerHTML=kyDocHTML(type,r,kyDoc[type]);},250);
}
async function kyZip(){
  setStatus("","ZIP hazırlanıyor…");
  var JSZip;try{JSZip=await loadJSZip();}catch(_){setStatus("err","ZIP aracı yüklenemedi; dokümanları tek tek indirebilirsiniz");return;}
  var z=new JSZip(),y=kyYil,W=function(title,html){return wrapDoc((T("unvan")||"Firma")+" – "+title,html);};
  z.file("0-"+y+" Yillik Faaliyet Takvimi.html",W(y+" Yıllık Faaliyet Takvimi",docTakvim(y)));
  var e=z.folder("1-Egitim");e.file("FR-04.02 Yillik Egitim Plani "+y+".html",W("FR-04.02",docEgitimPlan(y)));
  kyList("egitim",y).forEach(function(r){if(r.durum==="İptal")return;e.file(safeName("FR-04.03 "+(r.tarih||"")+" "+r.konu)+".html",W("FR-04.03",docEgitimKatilim(r)));e.file("Duyurular/"+safeName(duyuruNo("egitim",r)+" "+r.konu)+".html",W("Duyuru",docDuyuru("egitim",r)));});
  var t=z.folder("2-Ic-Tetkik");t.file("FR-15.01 Yillik Ic Tetkik Plani "+y+".html",W("FR-15.01",docTetkikPlan(y)));
  kyList("tetkik",y).forEach(function(r){if(r.durum==="İptal")return;t.file(safeName("FR-15.02 "+(r.no||"")+" "+r.alan)+".html",W("FR-15.02",docTetkikRapor(r)));t.file("Duyurular/"+safeName(duyuruNo("tetkik",r)+" "+r.alan)+".html",W("Duyuru",docDuyuru("tetkik",r)));});
  var g=z.folder("3-YGG");kyList("ygg",y).forEach(function(r){if(r.durum==="İptal")return;g.file(safeName("FR-15.03 "+(r.no||r.tarih||""))+".html",W("FR-15.03",docYgg(r)));g.file(safeName(duyuruNo("ygg",r)+" Toplanti Daveti")+".html",W("Duyuru",docDuyuru("ygg",r)));});
  var PLy=kyList("proje",y);PLy.forEach(function(r){var pf=z.folder("4-Montaj-Projeleri/"+safeName(r.no||"Proje"));PRJ_DOCS.forEach(function(dk){if(PRJ_YEARLY.indexOf(dk[0])>=0)return;pf.file(prjDocName(r,dk[0])+".html",W(prjDocTitle(dk[0]),docPrj(r,dk[0])));});});
  if(PLy.length)PRJ_YEARLY.forEach(function(k){z.file("4-Montaj-Projeleri/"+prjDocName(PLy[0],k)+".html",W(prjDocTitle(k),docPrj(PLy[0],k)));});
  KYX_TYPES.forEach(function(t){var L=kyList(t,y);if(!L.length)return;var X=KYX[t],fo=KYX_FOLD[t];X.def.docs.forEach(function(dk){if(X.yearly.indexOf(dk[0])>=0){z.file(fo+"/"+safeName(X.name(L[0],dk[0]))+".html",W(dk[1],X.doc(L[0],dk[0])));return;}L.forEach(function(r){z.file(fo+"/"+safeName(X.name(r,dk[0]))+".html",W(dk[1],X.doc(r,dk[0])));});});});
  try{var data=await z.generateAsync({type:"uint8array",compression:"DEFLATE"});await saveFile(fileBase()+"-uygulama-kayitlari-"+y+".zip",data);}catch(_){setStatus("err","ZIP oluşturulamadı");}
}


/* ---------- Firma seçici ve Firmalar görünümü ---------- */
var DX_W=9638,DX_MEDIA=[];
function dxImg(m){return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+m.cx+'" cy="'+m.cy+'"/><wp:docPr id="'+m.id+'" name="Logo '+m.id+'"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="'+m.id+'" name="logo'+m.id+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg'+m.id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+m.cx+'" cy="'+m.cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';}
function xe(s){return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function dxRun(text,f){
  var rp="";if(f.b)rp+="<w:b/><w:bCs/>";if(f.i)rp+="<w:i/><w:iCs/>";if(f.color)rp+='<w:color w:val="'+f.color+'"/>';if(f.sp)rp+='<w:spacing w:val="'+f.sp+'"/>';if(f.sz)rp+='<w:sz w:val="'+f.sz+'"/><w:szCs w:val="'+f.sz+'"/>';if(f.hl)rp+='<w:highlight w:val="yellow"/>';
  return '<w:r>'+(rp?'<w:rPr>'+rp+'</w:rPr>':'')+'<w:t xml:space="preserve">'+xe(text).replace(/\b([A-Z]{2,4})-(?=\d)/g,'$1</w:t><w:noBreakHyphen/><w:t xml:space="preserve">').replace(/\b([eE])-posta/g,'$1</w:t><w:noBreakHyphen/><w:t xml:space="preserve">posta')+'</w:t></w:r>';
}
function dxPPr(o){var x="";if(o.style)x+='<w:pStyle w:val="'+o.style+'"/>';if(o.keepNext)x+="<w:keepNext/>";if(o.border)x+='<w:pBdr><w:left w:val="single" w:sz="18" w:space="6" w:color="1F5A85"/></w:pBdr>';if(o.gold)x+='<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="6" w:color="B8963E"/></w:pBdr>';
  x+='<w:spacing w:before="'+(o.before||0)+'" w:after="'+(o.after==null?100:o.after)+'"/>';if(o.ind)x+='<w:ind w:left="'+o.ind+'"'+(o.hang?' w:hanging="'+o.hang+'"':"")+'/>';if(o.gold)x+='<w:ind w:left="1600" w:right="1600"/>';if(o.jc)x+='<w:jc w:val="'+o.jc+'"/>';return "<w:pPr>"+x+"</w:pPr>";}
function dxPara(runs,o){return "<w:p>"+dxPPr(o||{})+runs+"</w:p>";}
var DX_BLOCK={P:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,UL:1,OL:1,TABLE:1,DIV:1,SECTION:1,ARTICLE:1,BLOCKQUOTE:1,FIELDSET:1,ASIDE:1,HEADER:1,FOOTER:1,MAIN:1,NAV:1,LI:1};
function dxInline(node,f,out){
  if(node.nodeType===3){var t=node.nodeValue.replace(/[\t\n\r ]+/g," ");if(t)out.push({t:t,f:f});return;}
  if(node.nodeType!==1)return;
  var tag=node.tagName,cls=node.className||"";
  if(tag==="BR"){out.push({br:1});return;}
  if(tag==="SCRIPT"||tag==="STYLE")return;
  var g={b:f.b,i:f.i,sz:f.sz,color:f.color,hl:f.hl,sp:f.sp};
  if(tag==="B"||tag==="STRONG")g.b=1;
  if(tag==="I"||tag==="EM")g.i=1;
  if(/\bph\b/.test(cls))g.hl=1;
  if(tag==="IMG"){var src=node.getAttribute("src")||"",mm=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+\/=]+)$/.exec(src);if(mm){var iw=+node.getAttribute("width")||120,ih=+node.getAttribute("height")||48;DX_MEDIA.push({ext:mm[1]==="jpeg"?"jpeg":"png",b64:mm[2]});out.push({img:{id:DX_MEDIA.length,cx:Math.round(iw*9525),cy:Math.round(ih*9525)}});}return;}
  if(tag==="SMALL"){g.sz=16;g.color="5A6676";g.b=0;if(out.length&&!out[out.length-1].br)out.push({br:1});for(var k=0;k<node.childNodes.length;k++)dxInline(node.childNodes[k],g,out);out.push({br:1});return;}
  for(var i=0;i<node.childNodes.length;i++)dxInline(node.childNodes[i],g,out);
}
function dxRuns(items){
  while(items.length&&items[0].t!==undefined&&!items[0].t.trim()&&items[0].t.indexOf(" ")<0)items.shift();
  if(items.length&&items[0].t!==undefined)items[0].t=items[0].t.replace(/^ +/,"");
  while(items.length&&(items[items.length-1].br))items.pop();
  if(items.length&&items[items.length-1].t!==undefined)items[items.length-1].t=items[items.length-1].t.replace(/ +$/,"");
  var has=items.some(function(x){return x.img||(x.t&&x.t.length);});if(!has)return "";
  return items.map(function(x){return x.img?dxImg(x.img):x.br?'<w:r><w:br/></w:r>':dxRun(x.t,x.f);}).join("");
}
function dxBase(ctx){return {b:ctx.bold?1:0,sz:ctx.sz||0,color:ctx.color||"",i:ctx.ital?1:0,sp:ctx.sp||0};}
function dxBlocks(node,ctx){
  var out="",buf=[];
  function flush(){if(!buf.length)return;var r=dxRuns(buf);buf=[];if(r)out+=dxPara(r,{after:ctx.inTable?0:100,jc:ctx.jc,ind:ctx.ind});}
  for(var i=0;i<node.childNodes.length;i++){
    var c=node.childNodes[i];
    if(c.nodeType===1&&DX_BLOCK[c.tagName]){flush();out+=dxBlock(c,ctx);}
    else dxInline(c,dxBase(ctx),buf);
  }
  flush();return out;
}
function dxList(el,ctx,level){
  var out="",n=0,ordered=el.tagName==="OL";
  for(var i=0;i<el.children.length;i++){var li=el.children[i];if(li.tagName!=="LI")continue;n++;
    var items=[],nested=[];
    for(var j=0;j<li.childNodes.length;j++){var c=li.childNodes[j];if(c.nodeType===1&&(c.tagName==="UL"||c.tagName==="OL"))nested.push(c);else if(c.nodeType===1&&c.tagName==="P"){for(var q=0;q<c.childNodes.length;q++)dxInline(c.childNodes[q],dxBase(ctx),items);items.push({br:1});}else dxInline(c,dxBase(ctx),items);}
    var runs=dxRuns(items);var pre=ordered?n+".":"•";
    var ind=(ctx.inTable?280:420)+level*360;
    out+=dxPara(dxRun(pre,dxBase(ctx))+'<w:r><w:tab/></w:r>'+runs,{after:ctx.inTable?20:60,ind:ind,hang:ctx.inTable?280:360});
    nested.forEach(function(nl){out+=dxList(nl,ctx,level+1);});
  }
  return out;
}
function dxText(el){return (el.textContent||"").replace(/\s+/g," ").replace(/ /g,"").trim();}
function dxTable(el,ctx){
  var rows=[];for(var i=0;i<el.rows.length;i++)rows.push(el.rows[i]);
  if(!rows.length)return "";
  var grid=[],ncols=0,occ={};
  rows.forEach(function(tr,r){grid[r]=grid[r]||[];var c=0;
    for(var k=0;k<tr.cells.length;k++){var td=tr.cells[k];while(occ[r+","+c])c++;
      var cs=Math.max(1,td.colSpan||1),rs=Math.max(1,td.rowSpan||1);if(r+rs>rows.length)rs=rows.length-r;
      grid[r][c]={td:td,cs:cs,rs:rs};for(var a=0;a<rs;a++)for(var b=0;b<cs;b++){occ[(r+a)+","+(c+b)]=1;if(a>0&&b===0){grid[r+a]=grid[r+a]||[];grid[r+a][c]={cont:1,cs:cs};}}
      c+=cs;if(c>ncols)ncols=c;}
  });
  var cls=" "+(el.className||"")+" ";
  var wt=[];for(var c2=0;c2<ncols;c2++)wt[c2]=3;
  grid.forEach(function(row){row.forEach(function(e,c){if(e&&!e.cont&&e.cs===1){var L=Math.min(48,dxText(e.td).length);if(L>wt[c])wt[c]=L;}});});
  if(/ dochead /.test(cls)){wt=[];for(var c3=0;c3<ncols;c3++)wt[c3]=ncols===4?[32,38,15,15][c3]:ncols===2?[40,60][c3]:10;}
  if(/ kv /.test(cls)&&ncols===2)wt=[34,66];
  var dw=(el.getAttribute("data-w")||"").split(",").map(Number).filter(function(x){return x>0;});
  var W=ctx.width||DX_W,ws=wt.map(function(x){return Math.pow(Math.max(3,x),0.7);}),tot=ws.reduce(function(a,b){return a+b;},0);
  var tok=[];for(var c4=0;c4<ncols;c4++)tok[c4]=2;
  grid.forEach(function(row){row.forEach(function(e,c){if(e&&!e.cont&&e.cs===1){dxText(e.td).split(" ").forEach(function(wd){var L=Math.min(28,wd.length);if(L>tok[c])tok[c]=L;});}});});
  var small=ncols>=9,minw=tok.map(function(t){return t*(small?84:105)+(small?180:220);}),msum=minw.reduce(function(a,b){return a+b;},0),cw;
  if(dw.length===ncols){var dt=dw.reduce(function(a,b){return a+b;},0);cw=dw.map(function(x){return Math.round(x/dt*W);});}
  else if(/ dochead /.test(cls)||/ kv /.test(cls)){cw=ws.map(function(x){return Math.round(x/tot*W);});}
  else if(msum>=W){cw=minw.map(function(x){return Math.round(x*W/msum);});}
  else{var extra=W-msum;cw=minw.map(function(x,c){return Math.round(x+extra*ws[c]/tot);});}
  var sum=cw.reduce(function(a,b){return a+b;},0);cw=cw.map(function(x){return Math.round(x*W/sum);});
  var head=/ dochead /.test(cls);
  var x='<w:tbl><w:tblPr><w:tblW w:w="'+W+'" w:type="dxa"/><w:tblBorders>'+["top","left","bottom","right","insideH","insideV"].map(function(s){return '<w:'+s+' w:val="single" w:sz="4" w:space="0" w:color="9AA4B1"/>';}).join("")+'</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="'+(/ bakim /.test(cls)||/ qlist /.test(cls)?16:40)+'" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="'+(/ bakim /.test(cls)||/ qlist /.test(cls)?16:40)+'" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+cw.map(function(w){return '<w:gridCol w:w="'+w+'"/>';}).join("")+'</w:tblGrid>';
  rows.forEach(function(tr,r){
    var row=grid[r]||[],isHead=tr.parentNode&&tr.parentNode.tagName==="THEAD",grp=/\bgrp\b/.test(tr.className||"");
    var empty=true;for(var k=0;k<tr.cells.length;k++){if(tr.cells[k].tagName==="TD"&&dxText(tr.cells[k]))empty=false;}
    var hgt=(/ tall /.test(cls)||/\btall\b/.test(tr.className||""))&&!isHead?680:/ lifts /.test(cls)?460:/ qlist /.test(cls)&&!isHead&&!grp?480:/ sig /.test(cls)&&!isHead?420:(empty&&!isHead&&!grp?380:0);
    x+='<w:tr><w:trPr><w:cantSplit/>'+(hgt?'<w:trHeight w:val="'+hgt+'" w:hRule="atLeast"/>':"")+(isHead?"<w:tblHeader/>":"")+'</w:trPr>';
    for(var c=0;c<ncols;){
      var e=row[c],cs=e?e.cs:1,w=0;for(var q=0;q<cs;q++)w+=cw[c+q]||0;
      var tcp='<w:tcW w:w="'+w+'" w:type="dxa"/>'+(cs>1?'<w:gridSpan w:val="'+cs+'"/>':"");
      if(!e){x+='<w:tc><w:tcPr>'+tcp+'</w:tcPr><w:p>'+dxPPr({after:0})+'</w:p></w:tc>';c++;continue;}
      if(e.cont){x+='<w:tc><w:tcPr>'+tcp+'<w:vMerge/></w:tcPr><w:p>'+dxPPr({after:0})+'</w:p></w:tc>';c+=cs;continue;}
      var td=e.td,tcls=" "+(td.className||"")+" ",th=td.tagName==="TH";
      var sec=/ sec /.test(tcls),colh=/\bcolh\b/.test(tr.className||"");var fill=sec?"1F3A5F":grp||colh?"E3EDF5":th?(/ sform /.test(cls)?"F2F5F9":"EEF1F4"):"";
      tcp+=(e.rs>1?'<w:vMerge w:val="restart"/>':"")+(fill?'<w:shd w:val="clear" w:color="auto" w:fill="'+fill+'"/>':"")+'<w:vAlign w:val="'+(head||sec||/ lifts /.test(cls)?"center":"top")+'"/>';
      var jc=/ box /.test(tcls)||/ star /.test(tcls)||/ title /.test(tcls)||/ firm /.test(tcls)||sec?"center":"";
      var sub={inTable:true,bold:th||grp||/ firm /.test(tcls)||/ title /.test(tcls),sz:head?(/ title /.test(tcls)?26:/ firm /.test(tcls)?22:18):sec?16:(ncols>=9?15:18),jc:jc,width:w-160};if(sec)sub.color="FFFFFF";if(/ star /.test(tcls)){sub.bold=1;sub.sz=17;sub.color="1F3A5F";}else if(th&&/ sform /.test(cls))sub.color="1F3A5F";
      var inner=dxBlocks(td,sub);if(/ sig /.test(cls)&&r<rows.length-1)inner=inner.replace(/<w:pPr>/g,'<w:pPr><w:keepNext/>');if(!inner||/<\/w:tbl>$/.test(inner))inner+='<w:p>'+dxPPr({after:0})+'</w:p>';
      x+='<w:tc><w:tcPr>'+tcp+'</w:tcPr>'+inner+'</w:tc>';c+=cs;
    }
    x+='</w:tr>';
  });
  x+='</w:tbl>';
  if(!ctx.inTable)x+=dxPara("",{after:80});
  return x;
}
function dxBlock(el,ctx){
  var tag=el.tagName,cls=" "+(el.className||"")+" ";
  if(/ runhead /.test(cls)||/ certfoot /.test(cls)||el.hidden)return "";
  if(/ secno /.test(cls))return dxPara(dxRun(dxText(el),{b:1,sz:36,color:"D9B45A"}),{after:20,jc:"center"});
  if(/ certfirm /.test(cls))return dxBlocks(el,Object.assign({},ctx,{jc:"center",bold:1,sz:24,color:"1F3A5F",sp:20}));
  if(tag==="DIV"&&/ center /.test(cls))return dxBlocks(el,Object.assign({},ctx,{jc:"center"}));
  if(tag==="TABLE")return dxTable(el,ctx);
  if(tag==="UL"||tag==="OL")return dxList(el,ctx,0);
  var hm=/^H([1-6])$/.exec(tag);
  if(hm){var lv=+hm[1],items=[];for(var i=0;i<el.childNodes.length;i++)dxInline(el.childNodes[i],{},items);var r=dxRuns(items);if(!r)return "";
    if(ctx.inTable)return dxPara(dxRuns(items.map(function(x){if(x.f)x.f.b=1;return x;})),{after:40});
    if(/ decl /.test(cls)&&ctx.cert)return dxPara(dxRuns(items.map(function(x){if(x.f)x.f={b:1,sz:48,color:"1F3A5F",sp:40};return x;})),{before:100,after:20,jc:"center",keepNext:true});
    var st=lv===1?"Title":"Heading"+Math.min(4,lv-1);return dxPara(r,{style:st,keepNext:true,before:/ center /.test(cls)?0:(lv<=2?240:160),after:/ center /.test(cls)?20:80,jc:/ center /.test(cls)?"center":""});}
  if(tag==="P"){var it=[],base=dxBase(ctx);if(/ note /.test(cls)||/ sub /.test(cls)){base.i=1;base.sz=18;base.color="5A6676";}if(/ key /.test(cls))base.b=1;if(/ cemark /.test(cls)){base.b=1;base.sz=32;base.color="1F3A5F";base.sp=10;for(var jc=0;jc<el.childNodes.length;jc++)dxInline(el.childNodes[jc],base,it);return dxPara(dxRuns(it),{before:0,after:40,jc:"center",keepNext:true});}
    for(var j=0;j<el.childNodes.length;j++)dxInline(el.childNodes[j],base,it);var rr=dxRuns(it);if(!rr)return "";
    if(/ sub /.test(cls)&&ctx.cert)return dxPara(rr,{after:140,jc:"center",gold:true});
    return dxPara(rr,{after:ctx.inTable?20:120,jc:/ center /.test(cls)?"center":ctx.jc,border:/ key /.test(cls)&&!ctx.inTable});}
  if(tag==="SECTION"){var pb=(ctx.sec=(ctx.sec||0)+1)>1?'<w:p><w:r><w:br w:type="page"/></w:r></w:p>':"";return pb+dxBlocks(el,ctx);}
  if(tag==="LI")return dxBlocks(el,ctx);
  return dxBlocks(el,ctx);
}
var DX_STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="tr-TR" w:eastAsia="tr-TR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
 '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'+
 '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="18212B"/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>'+
 [1,2,3,4].map(function(n){return '<w:style w:type="paragraph" w:styleId="Heading'+n+'"><w:name w:val="heading '+n+'"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="'+(n-1)+'"/></w:pPr><w:rPr><w:b/><w:color w:val="'+(n<3?"1F3A5F":"18212B")+'"/><w:sz w:val="'+[30,24,22,20][n-1]+'"/><w:szCs w:val="'+[30,24,22,20][n-1]+'"/></w:rPr></w:style>';}).join("")+
 '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>';
function dxField(code){return '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> '+code+' </w:instrText></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>';}
async function htmlToDocx(JSZip,html,title,foot){
  var dom=new DOMParser().parseFromString('<div id="dx-root">'+html+'</div>',"text/html"),root=dom.getElementById("dx-root");
  DX_MEDIA=[];var CERT=!!root.querySelector(".certframe");var body=dxBlocks(root,CERT?{cert:1}:{});var media=DX_MEDIA.slice();
  body=body.replace(/<w:p><w:pPr><w:spacing w:before="0" w:after="80"\/><\/w:pPr><\/w:p>$/,'<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>');
  var NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  var docXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+NS+'><w:body>'+body+'<w:sectPr><w:footerReference w:type="default" r:id="rIdF"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="'+(CERT?900:1134)+'" w:right="1134" w:bottom="'+(CERT?900:1134)+'" w:left="1134" w:header="567" w:footer="'+(CERT?700:567)+'" w:gutter="0"/>'+(CERT?'<w:pgBorders w:offsetFrom="page">'+["top","left","bottom","right"].map(function(sd){return '<w:'+sd+' w:val="thinThickThinSmallGap" w:sz="24" w:space="24" w:color="1F3A5F"/>';}).join("")+'</w:pgBorders>':"")+'</w:sectPr></w:body></w:document>';
  var g={sz:16,color:"5A6676"};
  var ftr='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr '+NS+'><w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="AAB4C1"/></w:pBdr><w:tabs><w:tab w:val="right" w:pos="9638"/></w:tabs><w:spacing w:before="0" w:after="0"/></w:pPr>'+dxRun(foot||"",g)+'<w:r><w:tab/></w:r>'+dxRun("Sayfa ",g)+dxField("PAGE")+dxRun(" / ",g)+dxField("NUMPAGES")+'</w:p></w:ftr>';
  var now=new Date().toISOString().replace(/\.\d+Z$/,"Z");
  var z=new JSZip();
  z.file("[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>');
  z.file("_rels/.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
  z.file("word/_rels/document.xml.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rIdF" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'+media.map(function(m,i){return '<Relationship Id="rIdImg'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image'+(i+1)+'.'+m.ext+'"/>';}).join("")+'</Relationships>');
  media.forEach(function(m,i){z.file("word/media/image"+(i+1)+"."+m.ext,m.b64,{base64:true});});
  z.file("word/document.xml",docXml);z.file("word/styles.xml",DX_STYLES);z.file("word/footer1.xml",ftr);
  z.file("word/settings.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="709"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>');
  z.file("docProps/core.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>'+xe(title||"")+'</dc:title><dc:creator>'+xe(T("unvan")||"Kalite Sistemi")+'</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'+now+'</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">'+now+'</dcterms:modified></cp:coreProperties>');
  z.file("docProps/app.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Modul E Kalite El Kitabi</Application></Properties>');
  return z.generateAsync({type:"uint8array",compression:"DEFLATE",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}

/* ---------- Word dışa aktarma ---------- */
function firmShort(){return T("unvan")||"Firma";}
function kekFoot(){return (T("dokKod")||"KEK-01")+" Kalite El Kitabı · Rev. "+(T("revNo")||"00")+" · "+firmShort();}
function tplFoot(kod){var d=docOf(kod)||{rev:"00"};return kod+" · Rev. "+(d.rev||"00")+" · "+firmShort();}
async function wordOne(name,html,title,foot){
  var JSZip;try{JSZip=await loadJSZip();}catch(_){setStatus("err","Word aracı yüklenemedi; internet bağlantınızı kontrol edin");return;}
  try{var data=await htmlToDocx(JSZip,html,title,foot);await saveFile(name,data);}catch(e){setStatus("err","Word dosyası oluşturulamadı");}
}
function kyAllYears(){var s={};kyAllTypes().forEach(function(t){(S.kayit&&S.kayit[t]||[]).forEach(function(r){if(r.yil)s[r.yil]=1;});});return Object.keys(s).sort();}
async function wordAll(yilOnly){
  setStatus("","Word dosyaları hazırlanıyor…");
  var JSZip;try{JSZip=await loadJSZip();}catch(_){setStatus("err","Word aracı yüklenemedi; internet bağlantınızı kontrol edin");return;}
  kyInit();
  var z=new JSZip(),n=0,fails=0;
  async function add(path,html,title,foot){try{z.file(path,await htmlToDocx(JSZip,html,title,foot));n++;if(n%10===0)setStatus("",n+" Word dosyası hazırlandı…");}catch(_){fails++;}}
  if(!yilOnly){await add("0-Kalite-El-Kitabi/"+safeName((T("dokKod")||"KEK-01")+" Kalite El Kitabi")+".docx",manualHTML(),"Kalite El Kitabı",kekFoot());
  var dirs={PR:"1-Prosedurler",TL:"2-Talimatlar",FR:"3-Formlar"};
  if(!yilOnly)for(var i=0;i<S.dokumanlar.length;i++){var d=S.dokumanlar[i];if(d.durum==="İptal"||!d.kod)continue;
    await add((dirs[d.kod.slice(0,2)]||"4-Diger")+"/"+safeName(d.kod+" "+d.ad)+".docx",tplDocHTML(d.kod),d.ad,tplFoot(d.kod));}}
  var years=yilOnly?[String(yilOnly)]:kyAllYears();
  for(var y=0;y<years.length;y++){var Y=years[y],B="5-Uygulama-Kayitlari/"+Y+"/",ff=function(k){return k+" · "+firmShort();};
    await add(B+"0-"+Y+" Yillik Faaliyet Takvimi.docx",docTakvim(Y),Y+" Yıllık Faaliyet Takvimi",ff(Y+" Faaliyet Takvimi"));
    var E=kyList("egitim",Y);if(E.length){await add(B+"1-Egitim/FR-04.02 Yillik Egitim Plani "+Y+".docx",docEgitimPlan(Y),"Yıllık Eğitim Planı",ff("FR-04.02"));
      for(var a=0;a<E.length;a++){var r=E[a];if(r.durum==="İptal")continue;await add(B+"1-Egitim/"+safeName("FR-04.03 "+(r.tarih||"")+" "+(r.konu||""))+".docx",docEgitimKatilim(r),"Eğitim Katılım ve Etkinlik Formu",ff("FR-04.03"));await add(B+"1-Egitim/Duyurular/"+safeName(duyuruNo("egitim",r)+" "+(r.konu||""))+".docx",docDuyuru("egitim",r),"Eğitim Duyurusu",ff(duyuruNo("egitim",r)));}}
    var A=kyList("tetkik",Y);if(A.length){await add(B+"2-Ic-Tetkik/FR-15.01 Yillik Ic Tetkik Plani "+Y+".docx",docTetkikPlan(Y),"Yıllık İç Tetkik Planı",ff("FR-15.01"));
      for(var b=0;b<A.length;b++){var t=A[b];if(t.durum==="İptal")continue;await add(B+"2-Ic-Tetkik/"+safeName("FR-15.02 "+(t.no||"")+" "+(t.alan||""))+".docx",docTetkikRapor(t),"İç Tetkik Raporu",ff("FR-15.02 "+(t.no||"")));await add(B+"2-Ic-Tetkik/Duyurular/"+safeName(duyuruNo("tetkik",t)+" "+(t.alan||""))+".docx",docDuyuru("tetkik",t),"İç Tetkik Duyurusu",ff(duyuruNo("tetkik",t)));}}
    var G=kyList("ygg",Y);for(var c=0;c<G.length;c++){var g=G[c];if(g.durum==="İptal")continue;await add(B+"3-YGG/"+safeName("FR-15.03 "+(g.no||g.tarih||""))+".docx",docYgg(g),"YGG Tutanağı",ff("FR-15.03 "+(g.no||"")));await add(B+"3-YGG/"+safeName(duyuruNo("ygg",g)+" Toplanti Daveti")+".docx",docDuyuru("ygg",g),"YGG Toplantı Daveti",ff(duyuruNo("ygg",g)));}
    var PJ=kyList("proje",Y);if(PJ.length){for(var py=0;py<PRJ_YEARLY.length;py++){await add(B+"4-Montaj-Projeleri/"+prjDocName(PJ[0],PRJ_YEARLY[py])+".docx",docPrj(PJ[0],PRJ_YEARLY[py]),prjDocTitle(PRJ_YEARLY[py]),ff(PRJ_YEARLY[py]==="fr0903"?"FR-09.03":"FR-12.04"));}}
    for(var xt=0;xt<KYX_TYPES.length;xt++){var XT=KYX_TYPES[xt],XL=kyList(XT,Y);if(!XL.length)continue;var XX=KYX[XT];for(var xd=0;xd<XX.def.docs.length;xd++){var xk=XX.def.docs[xd][0];if(XX.yearly.indexOf(xk)>=0){await add(B+KYX_FOLD[XT]+"/"+safeName(XX.name(XL[0],xk))+".docx",XX.doc(XL[0],xk),XX.def.docs[xd][1],ff(XX.name(XL[0],xk)));continue;}for(var xr=0;xr<XL.length;xr++){await add(B+KYX_FOLD[XT]+"/"+safeName(XX.name(XL[xr],xk))+".docx",XX.doc(XL[xr],xk),XX.def.docs[xd][1],ff(XX.name(XL[xr],xk)));}}}
    for(var pj=0;pj<PJ.length;pj++){var pr=PJ[pj];if(pr.durum==="İptal")continue;for(var pd=0;pd<PRJ_DOCS.length;pd++){var dk=PRJ_DOCS[pd][0];if(PRJ_YEARLY.indexOf(dk)>=0)continue;await add(B+"4-Montaj-Projeleri/"+safeName(pr.no||"Proje")+"/"+prjDocName(pr,dk)+".docx",docPrj(pr,dk),prjDocTitle(dk),ff((pr.no||"")+" "+(PRJ_DOCS[pd][1].split(" ")[0])));}}
  }
  setStatus("",n+" Word dosyası paketleniyor…");
  try{var data=await z.generateAsync({type:"uint8array",compression:"STORE"});await saveFile(fileBase()+(yilOnly?"-Word-uygulama-kayitlari-"+yilOnly:"-Word-dokumanlar")+".zip",data);if(fails)setStatus("err",fails+" doküman Word'e dönüştürülemedi; diğerleri indirildi");}catch(_){setStatus("err","ZIP oluşturulamadı");}
}

/* ---------- Görünümler ---------- */
function blobDownload(name,data){try{var mime=/\.html$/.test(name)?"text/html":/\.json$/.test(name)?"application/json":/\.csv$/.test(name)?"text/csv":/\.zip$/.test(name)?"application/zip":"application/octet-stream";var b=new Blob([data],{type:mime+(typeof data==="string"?";charset=utf-8":"")});var u=URL.createObjectURL(b);var a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},5000);setStatus("saved",name+" indirildi");return true;}catch(_){setStatus("err","Dosya indirilemedi");return false;}}
function fileBase(){return ((T("kisaKod")||"firma")+"-"+(T("dokKod")||"KEK-01")+"-Rev"+(T("revNo")||"00")).replace(/[^\w\-]+/g,"_");}
function printCSS(){
  var css="body{font-family:'IBM Plex Sans',Arial,sans-serif;color:#18212b;background:#fff;margin:0;padding:24px;line-height:1.5;font-size:11pt}"+
  "h1{font-size:20pt;margin:0 0 4px}h2{font-size:15pt;margin:0 0 8px}h3{font-size:12pt;margin:14px 0 4px}p,li{margin:0 0 6px}"+
  "table{border-collapse:collapse;width:100%;margin:4px 0 12px;font-size:9.5pt}th,td{border:1px solid #9aa4b1;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eef1f4}"+
  "tr.grp td{background:#e3edf5;font-weight:600}.dochead .firm{text-align:center;vertical-align:middle}.dochead .firm img{display:block;max-height:56px;max-width:100%;margin:0 auto 4px}.dochead td{font-size:10pt}.dochead .firm{font-weight:700;width:30%}.dochead .title{text-align:center;font-weight:700;font-size:14pt}.dochead .title small{display:block;font-weight:400;font-size:9pt}"+
  ".runhead{display:flex;justify-content:space-between;font-family:monospace;font-size:8.5pt;color:#5a6676;border-bottom:1px solid #d5dbe3;margin-bottom:4px}"+
  "section{page-break-before:always;padding-top:4px}section:first-of-type{page-break-before:auto}.key{border-left:3px solid #1f5a85;padding-left:8px;font-weight:500}"+
  ".note{font-size:9pt;color:#5a6676;border:1px dashed #9aa4b1;padding:6px}.ph{background:#fff4dd;color:#9a5b00;border:1px dashed #9a5b00;padding:0 3px}.sign td{height:36px}"+
  "@media print{body{padding:0}@page{size:A4;margin:16mm 14mm}}";
  return css+".tplbody h4{font-size:11pt;margin:10px 0 4px}td.box,th.box{text-align:center;width:40px}table.sig td{height:26px}.sl{color:#5a6676;font-size:8.5pt}table.kv th{width:34%}table.kv2 th{background:#eef1f4;text-align:left}table.bakim td.star{font-weight:800;text-align:center}table.kv.tall td,table.kv tr.tall td,table.t.tall tbody td{height:40px}h1.decl{text-align:center;letter-spacing:.08em}.certframe{border:6px double #1f3a5f;outline:1px solid #b8963e;outline-offset:-13px;padding:26px 30px 12px}.certtop,.certfirm{text-align:center}.certtop img{display:block;margin:0 auto 6px}.certfirm{font-weight:700;font-size:12pt;letter-spacing:.08em;text-transform:uppercase;color:#1f3a5f}.certframe h1.decl{font-size:24pt;color:#1f3a5f;letter-spacing:.14em;margin:10px 0 2px}.certframe p.sub{padding-bottom:8px;background:linear-gradient(#b8963e,#b8963e) center bottom/120px 2px no-repeat}table.sform th.sec{border-top:3px solid #fff;background:#1f3a5f!important;color:#fff;text-align:center;vertical-align:middle;-webkit-print-color-adjust:exact;print-color-adjust:exact}table.sform .secno{font-size:18pt;font-weight:800;color:#d9b45a}table.sform .sect{font-size:8.5pt}table.sform th:not(.sec){background:#f2f5f9;color:#1f3a5f;-webkit-print-color-adjust:exact;print-color-adjust:exact}table.sform tr.colh th:not(.sec){background:#e3edf5}p.cemark{text-align:center;font-size:20pt;font-weight:800;color:#1f3a5f;margin:6px 0 0}.certfoot{text-align:center;font-family:monospace;font-size:8pt;color:#5a6676;margin-top:8px}p.center{text-align:center}p.sub{color:#5a6676;font-style:italic;font-size:9pt}.tplbody table.t td{height:20px}ul.warn li{color:#7a1d16}.tplbody{margin-top:8px}";
}
function wrapDoc(title,body){return '<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>'+printCSS()+'</style></head><body>'+body+'</body></html>';}
function standaloneHTML(){return wrapDoc((T("unvan")||"Firma")+" – "+(T("dokKod")||"KEK-01")+" Kalite El Kitabı",manualHTML());}
function csvDocs(){var q=function(s){s=String(s==null?"":s);return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  return "﻿Kod;Doküman adı;Bölüm;Rev;Yayın tarihi;Durum\n"+S.dokumanlar.map(function(d){return [d.kod,d.ad,d.bolum,d.rev,fmtD(d.tarih),d.durum].map(q).join(";");}).join("\n");}
S = merge(defaults(), env.state || {});
return {
  get S() { return S; },
  setState: function (s) { S = merge(defaults(), s || {}); return S; },
  defaults: defaults, merge: merge, FIELD_GROUPS: FIELD_GROUPS, LABELS: LABELS, FIELD_TYPE: FIELD_TYPE,
  REQUIRED: REQUIRED, T: T, completeness: completeness, esc: esc, fmtD: fmtD,
  manualHTML: manualHTML, standaloneHTML: standaloneHTML, wrapDoc: wrapDoc, printCSS: printCSS, csvDocs: csvDocs,
  SECTIONS: SECTIONS, tplDocHTML: tplDocHTML, tplContent: tplContent, tplStandalone: tplStandalone, isCert: isCert,
  docOf: docOf, docName: docName, TPL: TPL, safeName: safeName, fileBase: fileBase,
  kekFoot: kekFoot, tplFoot: tplFoot, htmlToDocx: htmlToDocx, wordOne: wordOne, wordAll: wordAll, zipAll: zipAll,
  kyInit: kyInit, kyAllTypes: kyAllTypes, kyAllYears: kyAllYears, KY_TYPES: KY_TYPES, KYX: KYX, kyList: kyList, kyFind: kyFind,
  kyNew: kyNew, kyTitle: kyTitle, kyDocHTML: kyDocHTML, kyDocName: kyDocName, kyDoc: function () { return kyDoc; },
  docTakvim: docTakvim, kyEvents: kyEvents, kyOrnek: kyOrnek, KY_DEF: KY_DEF, PRJ_DOCS: PRJ_DOCS,
  fid: function () { return kyId(); }, todayISO: todayISO,
  setYil: function (y) { kyYil = String(y); }, getYil: function () { return kyYil; }, kyYears: kyYears, KY_STATUS: KY_STATUS,
  kyState: kyState, kyDocFor: kyDocHTML, ayOf: ayOf, AYLAR: AYLAR, kyRemoveDefaults: function () {},
};
}
