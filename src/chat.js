// Sohbet botu istemcisi: her şey cihazda çalışır (sunucuya soru gönderilmez).
// 1) src/chatmodel.js + chatlogic.js: soru neyle ilgili, hangi tür/yer? (projede eğitilen sınıflandırıcı)
// 2) src/lm.js: projede sıfırdan eğitilen küçük dil modeli, bilgi parçasını okuyup cevabı kendi cümleleriyle yazar
// 3) Model bilgi dışı bir şey yazarsa (uydurma kontrolü) hazır kalıp cevaba dönülür.
import species from './data/species.json';
import model from './data/chat-model.json';
import { createBot } from './chatlogic.js';
import { loadLM, generate, unsupportedWords, repair } from './lm.js';

export const chatAvailable = true;
const bot = createBot(species, model);
export const preloadLM = () => loadLM().catch(() => null);

// ctx: { lastIds } — "Peki nerede yaşar?" gibi devam soruları son konuşulan türe bağlanır.
export async function ask(question, ctx) {
  const r = bot.reply(question, ctx);
  const lm = await preloadLM();
  if (!lm) return { ...r, source: 'kalip' };
  const out = []; let fromModel = 0;
  for (let i = 0; i < r.prompts.length; i++) {
    let t = null;
    try { t = await generate(lm, r.prompts[i], { temp: 0.7 }); } catch { t = null; }
    if (t) t = repair(lm, r.prompts[i], t);
    if (t && !unsupportedWords(lm, r.prompts[i], t).length) { out.push(t); fromModel++; }
    else out.push(r.parts[i] ?? r.parts[0]);
  }
  return { ...r, text: out.join('\n\n'), source: fromModel === out.length ? 'model' : fromModel ? 'karisik' : 'kalip' };
}
