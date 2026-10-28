// Sohbet botu istemcisi: her şey cihazda çalışır (sunucuya soru gönderilmez).
// 1) src/chatmodel.js + chatlogic.js: soru neyle ilgili, hangi tür/yer? (projede eğitilen sınıflandırıcı)
// 2) src/lm.js: projede sıfırdan eğitilen küçük dil modeli, bilgi parçasını okuyup cevabı kendi cümleleriyle yazar
// 3) Model bilgi dışı bir şey yazarsa (uydurma kontrolü) hazır kalıp cevaba dönülür.
import species from './data/species.json';
import model from './data/chat-model.json';
import wiki from './data/wiki.json';
import small from './data/chat-small.json';
import tpl from './data/chat-templates.json';
import { fold } from './chatmodel.js';
import { createBot } from './chatlogic.js';
import { loadLM, generate, explain, repair } from './lm.js';
import { onlineEnabled, extractQuery, lookupWikipedia, lookupTopic } from './online.js';

export const chatAvailable = true;
const bot = createBot(species, model, wiki, small, tpl);
export const preloadLM = () => loadLM().catch(() => null);

// ctx: { lastIds } — "Peki nerede yaşar?" gibi devam soruları son konuşulan türe bağlanır.
export async function ask(question, ctx) {
  const res = await askCore(question, ctx);
  // Bölge/yaşam alanı soruları: kendi kayıtlarımızdaki liste yanında, izin varsa Vikipedi'den genel bilgi eklenir
  if (res.topic) {
    if (onlineEnabled() && navigator.onLine !== false) {
      const hit = await lookupTopic(res.topic).catch(() => null);
      if (hit) return { ...res, text: `${res.text}\n\n🌐 Vikipedi'den genel bilgi (${hit.title}): ${hit.text}`, src: { title: hit.title, url: hit.url }, online: true };
      return { ...res, text: `${res.text}\n\n(Vikipedi'de ${res.topic.region} için ayrı bir fauna/flora maddesi bulamadım; yukarıdaki liste yalnızca bu uygulamadaki 94 türe aittir.)` };
    }
    return { ...res, text: `${res.text}\n\nBu liste yalnızca uygulamadaki 94 türü kapsar. Bölgedeki diğer canlılar için Vikipedi'de arayabilirim: Ayarlar'dan “Bilmediğim canlıları Vikipedi'de ara”yı açın.` };
  }
  return res;
}

async function askCore(question, ctx) {
  let r = bot.reply(question, ctx);
  // Yerel kayıtlarda bulunamayan canlı adı: izin verilmişse Vikipedi'de aranır (aranan ad tr.wikipedia.org'a gider)
  if (r.unresolved && onlineEnabled() && navigator.onLine !== false) {
    const query = extractQuery(question);
    if (query) {
      const hit = await lookupWikipedia(query).catch(() => null);
      if (!hit) return { ...r, text: `Vikipedi'de «${query}» adlı bir canlı maddesi bulamadım. ${r.text}`, source: 'kalip', debug: [{ prompt: '(internet araması)', raw: '', fixed: '', ok: false, why: `Vikipedi araması «${query}» için uygun madde bulamadı (başlık soruyla eşleşmedi ya da canlı maddesi değil).` }] };
      const prompt = `<bilgi> kaynak | ${hit.title} | ${hit.text} <soru> ${fold(question).replace(/[<>]/g, '')} <cevap>`;
      r = { ...r, intent: 'wiki-online', ids: [], text: `${hit.title} için Vikipedi'de şöyle yazıyor: ${hit.text}`, src: { title: hit.title, url: hit.url }, online: true, prompts: [prompt], facts: [[hit.text]], allowed: [null], parts: [`${hit.title} için Vikipedi'de şöyle yazıyor: ${hit.text}`] };
    }
  }
  if (!r.prompts.length) return { ...r, source: 'kalip', debug: [{ prompt: '(modele bilgi parçası verilmedi)', raw: '', fixed: '', ok: false, why: 'Bu soru türü için model kullanılmıyor; hazır kalıp gösterildi.' }] };
  const lm = await preloadLM();
  if (!lm) return { ...r, source: 'kalip', debug: [{ prompt: '', raw: '', fixed: '', ok: false, why: 'Model dosyası yüklenemedi.' }] };
  const out = [], debug = []; let fromModel = 0;
  for (let i = 0; i < r.prompts.length; i++) {
    let raw = null, err = '';
    try { raw = await generate(lm, r.prompts[i], { temp: 0.7 }); } catch (e) { err = String(e?.message || e); }
    const fixed = raw ? repair(lm, r.prompts[i], raw) : null;
    const v = explain(lm, r.prompts[i], fixed, r.facts[i]);
    if (v.ok && r.allowed?.[i] && !r.allowed[i].includes(fold(fixed))) { v.ok = false; v.why = 'Model bu soru türüne uymayan bir cümle yazdı (sohbet cümleleri sabit bir kümeden olmalı).'; }
    debug.push({ prompt: r.prompts[i], raw: raw || '', fixed: fixed && fixed !== raw ? fixed : '', ok: v.ok, why: err || v.why });
    if (v.ok) { out.push(fixed); fromModel++; } else out.push(r.parts[i] ?? r.parts[0]);
  }
  return { ...r, text: out.join('\n\n'), source: fromModel === out.length ? 'model' : fromModel ? 'karisik' : 'kalip', debug };
}
