// Sohbet botu istemcisi: her şey cihazda çalışır (sunucuya soru gönderilmez).
// 1) src/chatmodel.js + chatlogic.js: soru neyle ilgili, hangi tür/yer? (projede eğitilen sınıflandırıcı)
// 2) src/lm.js: projede sıfırdan eğitilen küçük dil modeli, bilgi parçasını okuyup cevabı kendi cümleleriyle yazar
// 3) Model bilgi dışı bir şey yazarsa (uydurma kontrolü) hazır kalıp cevaba dönülür.
import species from './data/species.json';
import model from './data/chat-model.json';
import wiki from './data/wiki.json';
import { createBot } from './chatlogic.js';
import { loadLM, generate, explain, repair } from './lm.js';

export const chatAvailable = true;
const bot = createBot(species, model, wiki);
export const preloadLM = () => loadLM().catch(() => null);

// ctx: { lastIds } — "Peki nerede yaşar?" gibi devam soruları son konuşulan türe bağlanır.
export async function ask(question, ctx) {
  const r = bot.reply(question, ctx);
  if (!r.prompts.length) return { ...r, source: 'kalip', debug: [{ prompt: '(modele bilgi parçası verilmedi)', raw: '', fixed: '', ok: false, why: 'Bu soru türü için model kullanılmıyor; hazır kalıp gösterildi.' }] };
  const lm = await preloadLM();
  if (!lm) return { ...r, source: 'kalip', debug: [{ prompt: '', raw: '', fixed: '', ok: false, why: 'Model dosyası yüklenemedi.' }] };
  const out = [], debug = []; let fromModel = 0;
  for (let i = 0; i < r.prompts.length; i++) {
    let raw = null, err = '';
    try { raw = await generate(lm, r.prompts[i], { temp: 0.7 }); } catch (e) { err = String(e?.message || e); }
    const fixed = raw ? repair(lm, r.prompts[i], raw) : null;
    const v = explain(lm, r.prompts[i], fixed, r.facts[i]);
    debug.push({ prompt: r.prompts[i], raw: raw || '', fixed: fixed && fixed !== raw ? fixed : '', ok: v.ok, why: err || v.why });
    if (v.ok) { out.push(fixed); fromModel++; } else out.push(r.parts[i] ?? r.parts[0]);
  }
  return { ...r, text: out.join('\n\n'), source: fromModel === out.length ? 'model' : fromModel ? 'karisik' : 'kalip', debug };
}
