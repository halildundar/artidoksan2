// "Alçak durak kapıları" risk analizi madde kataloğu (grup: alcak-durak-kapilari): standart madde + uygulama
// maddeleri. Tekrar çalıştırmak güvenlidir (aynı metin varsa eklenmez).
import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';

if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(','));

const GRUP = 'alcak-durak-kapilari';
const MADDELER = [
  {
    standart: true,
    metin: '5.3.2.1 Height- Landing doors and car doors shall be such that a minimum clear height of the entrance is 2 m.(5.3.2.1 Yükseklik - Durak ve kabin kapıları, girişin asgari net yüksekliği 2 m olacak şekilde olmalıdır)',
  },
  { standart: false, metin: '- The ceiling of the machine room work area should be covered with fireproof, smoke-free and soft material.(Makine dairesi çalışma alanı tavanı yanmaz,duman yaymayan ve yumuşak malzeme ile kaplanması)' },
  { standart: false, metin: '- Emergency lighting and helmets for dangerous area(Tehlikeli alan için acil aydınlatma ve baret konulması)' },
  { standart: false, metin: '- Placing warning signs and instructions in visible places (Görülebilir yerlere uyarı işaret ve talimatlar konulması)' },
  { standart: false, metin: '- Dangerous areas are marked with yellow and black markings (Tehlikeli alanlar sarı-siyah renkte işaretlemeler ile belirtilmesi)' },
];

await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/artidoksan2');
const col = mongoose.connection.db.collection('riskMaddeleri');
let eklenen = 0;
for (const m of MADDELER) {
  if (await col.findOne({ grup: GRUP, metin: m.metin })) continue;
  const simdi = new Date();
  await col.insertOne({ grup: GRUP, metin: m.metin, standart: m.standart, createdAt: simdi, updatedAt: simdi });
  eklenen++;
}
console.log(`eklenen: ${eklenen}, toplam: ${await col.countDocuments({ grup: GRUP })}`);
await mongoose.disconnect();
