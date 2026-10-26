// Sohbet botunun mantığı (tarayıcıda ve eğitim betiğinde aynı kod çalışır).
// 1) sorudaki tür ve yer adları bulunur, 2) bu adlar maskelenip model soruyu sınıflandırır (niyet),
// 3) cevap, tür verisinden her seferinde farklı cümle kalıplarıyla kurulur. Hiçbir sunucuya istek gitmez.
import { fold, predict } from './chatmodel.js';

const SKIP_NAME = new Set(['dag', 'kara', 'yer', 'ada', 'gol', 'cay', 'tas', 'bir', 'icin', 'nasil', 'nerede', 'nedir', 'hangi', 'mi', 'mu']);
const SKIP_PLACE = new Set(['cevresi', 'civari', 'koyu', 'koyleri', 'yoresi', 'dagi', 'daglari', 'golu', 'vadisi', 'adasi', 'mevkii', 'mahallesi', 'kasabasi',
  'ilcesi', 'belediyesi', 'milli', 'parki', 'merkez', 'bolgesi', 'arasinda', 'kuzey', 'guney', 'dogu', 'bati', 'yakini', 'kiyilari', 'sahili', 'hatti']);
const ws = (s) => fold(s).replace(/[<>]/g, '').split(' ').filter((w) => w.length >= 2);
// "kelaynagi" ile "kelaynak" gibi ek almış biçimler eşleşsin
const same = (a, b) => {
  if (a === b) return true;
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i >= 4 && i >= Math.min(a.length, b.length) - 2;
};

// ---- Çiçeklenme ayı ve tehlike düzeyi: veriden hesaplanan listeler ----
const MON = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
const MON_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const SEASON = [['ilkbahar', 'İlkbahar', [2, 3, 4]], ['sonbahar', 'Sonbahar', [8, 9, 10]]];
const range = (a, b) => { const o = []; for (let i = a; ; i = (i + 1) % 12) { o.push(i); if (i === b) break; } return o; };
// "Nisan sonu – Haziran" → {3,4,5}; parantez içi notlar (meyve dönemi vb.) sayılmaz
export function floweringMonths(str) {
  if (!str) return null;
  const clean = str.replace(/\([^)]*\)/g, ' ');
  const f = fold(clean);
  const re = /(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)|ilkbahar\w*|sonbahar\w*|\bkis sonu|\bkis\b/g;
  const men = []; let m;
  while ((m = re.exec(f))) {
    if (m[1]) men.push([MON.indexOf(m[1])]);
    else if (m[0].startsWith('ilkbahar')) men.push([2, 3, 4]);
    else if (m[0].startsWith('sonbahar')) men.push([8, 9, 10]);
    else if (m[0] === 'kis sonu') men.push([1]);
    else men.push([11, 0, 1]);
  }
  if (!men.length) return null;
  if (men.length > 1 && /[–-]/.test(clean)) return new Set(range(men[0][0], men[men.length - 1].slice(-1)[0]));
  return new Set(men.flat());
}
export const threatLevels = (s) => new Set(((s.statusIntl || '') + ' ' + (s.statusNational || '')).match(/\b(CR|EN|VU)\b/g) || []);
export const listTitle = (t) => t;
export const listCtx = (title, names) => `liste | ${title} | sayı: ${names.length} | türler: ${names.length ? names.slice(0, 8).join(', ') + (names.length > 8 ? ` ve ${names.length - 8} tür daha` : '') : 'yok'}`;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const cap = (s) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);

export function createBot(species, model, wiki = []) {
  const byId = new Map(species.map((s) => [s.id, s]));
  const idx = species.map((s) => ({ id: s.id, nameW: ws(s.name).filter((w) => !SKIP_NAME.has(w)), sciW: ws(s.sci) }));
  const df = new Map();
  for (const e of idx) for (const w of new Set(e.nameW)) df.set(w, (df.get(w) || 0) + 1);
  // yer adı → o yerde bilinen türler
  const places = new Map(), placeDisp = new Map();
  for (const s of species) for (const l of s.localities) for (const raw of l.name.split(/[^\p{L}\p{N}]+/u).filter(Boolean)) {
    const w = fold(raw);
    if (w.length < 4 || SKIP_PLACE.has(w)) continue;
    if (!places.has(w)) { places.set(w, new Set()); placeDisp.set(w, raw); }
    places.get(w).add(s.id);
  }

  // ---- Vikipedi parçaları (CC BY-SA 4.0): madde adı/takma adı soruda geçiyorsa o parça bulunur ----
  const STOP = new Set(['nedir', 'hakkinda', 'bilgi', 'anlat', 'anlatir', 'misin', 'verir', 'ver', 'nasil', 'bir', 'nerede', 'yasar', 'neye', 'benzer', 'benziyor', 'kimdir', 'turu', 'ozellikleri', 'neler']);
  // her madde için adlar: başlık ve takma adlar ("X ya da Y" biçimindeki parçalar ayrı ayrı); herhangi biri soruda eksiksiz geçerse madde bulunur
  const wikiIdx = wiki.map((w, i) => ({ i, groups: [w.t, ...(w.a || '').split(/ ya da | veya /)].map((n) => [...new Set(ws(n))].filter((x) => x.length >= 3 && !STOP.has(x))).filter((g) => g.length) }));
  const wdf = new Map(); for (const e of wikiIdx) for (const g of e.groups) for (const t of g) wdf.set(t, (wdf.get(t) || 0) + 1);
  function findWiki(qw) {
    let best = null;
    for (const e of wikiIdx) for (const g of e.groups) {
      let hit = 0, len = 0, raw = 0;
      for (const t of g) if (qw.some((q) => same(q, t))) { hit++; raw += t.length; len += t.length / wdf.get(t); }
      const need = Math.max(1, Math.ceil(g.length * 0.5));
      const cand = { len, w: wiki[e.i], complete: hit === g.length };
      if (hit >= need && raw >= 5 && (!best || (cand.complete && !best.complete) || (cand.complete === best.complete && len > best.len))) best = cand;
    }
    return best;
  }

  function findSpecies(qw) {
    const hits = [];
    for (const e of idx) {
      let score = 0; const used = new Set(); let all = e.nameW.length > 0;
      e.nameW.forEach((w) => {
        let hit = false;
        qw.forEach((q, i) => { if (same(q, w)) { score += w.length / (df.get(w) ** 2); used.add(i); hit = true; } });
        if (!hit) all = false;
      });
      if (all) score += 10 + e.nameW.length; // türün adındaki tüm sözcükler soruda varsa kesin eşleşme
      e.sciW.forEach((w) => qw.forEach((q, i) => { if (q === w) { score += w.length; used.add(i); } }));
      if (score >= 2.5) hits.push({ id: e.id, score, used, strong: all });
    }
    hits.sort((a, b) => b.score - a.score);
    const top = hits[0]?.score || 0;
    return hits.filter((h) => h.score >= top * 0.6).slice(0, 3);
  }

  function findPlaces(qw, speciesWords) {
    const found = []; const used = new Set(); let disp = '';
    qw.forEach((q, i) => {
      if (speciesWords.has(i) || q.length < 4) return;
      // yer adı ya aynen yazılır ya da ek alır ("Ankara'da" → ankarada); kısa ekten fazlası eşleşme sayılmaz
      for (const [w, set] of places) if (q === w || (q.startsWith(w) && q.length - w.length <= 4)) { found.push(...set); used.add(i); disp = disp || placeDisp.get(w); break; }
    });
    return { ids: [...new Set(found)], used, disp };
  }

  function findTime(qw, skip) {
    const idx = new Set(); let title = '', months = null;
    qw.forEach((w, i) => {
      if (skip.has(i) || w.length < 3) return;
      const mi = MON.findIndex((m) => w === m || (w.startsWith(m) && w.length - m.length <= 4));
      const si = SEASON.findIndex(([k]) => w.startsWith(k));
      const sea = si >= 0 ? SEASON[si] : (['yaz', 'yazin', 'yazda'].includes(w) ? ['yaz', 'Yaz', [5, 6, 7]] : ['kis', 'kisin', 'kista'].includes(w) ? ['kis', 'Kış', [11, 0, 1]] : null);
      if (mi >= 0) { idx.add(i); if (!months) { months = new Set([mi]); title = `${MON_TR[mi]} ayında çiçek açan bitki türleri`; } }
      else if (sea) { idx.add(i); if (!months) { months = new Set(sea[2]); title = `${sea[1]} döneminde çiçek açan bitki türleri`; } }
    });
    return { idx, months, title };
  }
  const groupWord = (q) => (q.includes('hayvan') ? 'hayvan' : q.includes('bitki') ? 'bitki' : null);
  const listNamesFull = (ids) => ids.map((i) => byId.get(i).name);
  const kind = (s) => (s.group === 'fauna' ? 'hayvan' : 'bitki');
  const listNames = (ids, n = 10) => {
    const names = ids.map((i) => byId.get(i).name);
    return names.slice(0, n).join(', ') + (names.length > n ? ` ve ${names.length - n} tür daha` : '');
  };

  const listText = ({ title, names }) => !names.length ? `${title} için kayıtlarda tür bulamadım.`
    : `${cap(title)}: ${listing(names)}. Toplam ${names.length} tür.`;

  function compose(intent, sp, ctx) {
    const s = sp;
    const nm = s ? s.name : '';
    switch (intent) {
      case 'ozet': return pick([
        `${nm} (${s.sci}), Türkiye'nin korunan ${kind(s)} türlerinden biri. ${s.description || ''}`,
        `${nm} için kısaca şunu söyleyebilirim: ${s.description || 'ayrıntılı bir açıklama yok.'} Bilimsel adı ${s.sci}.`,
        `${cap(kind(s))} türü olan ${nm} (${s.sci}) şöyle tanıtılıyor: ${s.description || 'açıklaması henüz eklenmemiş.'}`,
      ]).trim();
      case 'yer': {
        if (!s.localities.length) return `${nm} için kayıtlarımda yayılış yeri bilgisi yok.`;
        const l = s.localities.map((x) => x.name);
        const txt = l.slice(0, 6).join(', ') + (l.length > 6 ? ` ve ${l.length - 6} yer daha` : '');
        return pick([
          `${nm} şu yerlerde biliniyor: ${txt}. (Bunlar genel yayılış bilgisidir, tam nokta değildir.)`,
          `Kayıtlara göre ${nm} ${txt} çevresinde yaşıyor. Tam yerini paylaşmıyoruz, çünkü nadir türler korunmalı.`,
          `${nm} için bilinen yerler: ${txt}. Türün sayfasındaki haritada bu yerleri görebilirsin.`,
        ]);
      }
      case 'gorunum': return s.morphology
        ? pick([`${nm} şöyle tarif ediliyor: ${s.morphology}`, `Görünüş olarak ${nm}: ${s.morphology}`, `${nm} için kayıtlı özellikler: ${s.morphology}`])
        : `${nm} için görünüşüyle ilgili ayrıntılı bir kayıt yok. ${s.description || ''}`.trim();
      case 'cicek':
        if (s.group === 'fauna') return pick([`${nm} bir hayvan olduğu için çiçek açmaz. İstersen görünüşünü anlatabilirim.`, `Çiçeklenme bitkilere özgüdür; ${nm} bir hayvan. Nerede yaşadığını sorabilirsin.`]);
        return s.flowering
          ? pick([`${nm} için çiçeklenme dönemi: ${s.flowering}`, `${nm} şu dönemde çiçek açıyor: ${s.flowering}`, `Çiçeklenme zamanı olarak kayıtlarda ${s.flowering} yazıyor (${nm}).`])
          : `${nm} için çiçeklenme tarihi kayıtlarımda yok. Bu bilgi tür eylem planında verilmemiş.`;
      case 'statu': {
        const parts = [];
        const end = (x) => (/[.!?]$/.test(x.trim()) ? x.trim() : x.trim() + '.');
        if (s.statusNational) parts.push(end(`Ulusal durumu: ${s.statusNational}`));
        if (s.statusIntl) parts.push(end(`Uluslararası durumu: ${s.statusIntl}`));
        if (!parts.length) return `${nm} için korunma durumu bilgisi kayıtlarımda yok.`;
        return pick([`${nm} için korunma durumu şöyle. ${parts.join(' ')}`, `${nm} koruma altında. ${parts.join(' ')}`, `Korunma açısından ${nm}: ${parts.join(' ')}`]);
      }
    }
    return '';
  }

  const EXAMPLES = ['Kelaynak nerede yaşar?', 'Hopa engereği neye benziyor?', 'Ankara çevresinde hangi türler var?', 'Truva kardeleni ne zaman çiçek açar?', 'Endemik ne demek?'];

  // Modele verilecek bilgi parçaları (ml/build_data.py'deki biçimle birebir aynı olmalı)
  const listing = (names, n = 8) => names.slice(0, n).join(', ') + (names.length > n ? ` ve ${names.length - n} tür daha` : '');
  function speciesCtx(s, intent) {
    const n = s.name;
    if (intent === 'ozet') return `${n} | özet | ${kind(s)} | ${s.sci} | ${s.description || 'yok'}`;
    if (intent === 'yer') return `${n} | yer | ` + (s.localities.length ? s.localities.slice(0, 6).map((x) => x.name).join('; ') + (s.localities.length > 6 ? ` ve ${s.localities.length - 6} yer daha` : '') : 'yok');
    if (intent === 'gorunum') return `${n} | görünüş | ${s.morphology || 'yok'}`;
    if (intent === 'cicek') return `${n} | çiçeklenme | ` + (s.group === 'fauna' ? 'hayvan' : (s.flowering || 'yok'));
    return `${n} | statü | ulusal: ${s.statusNational || 'yok'} | uluslararası: ${s.statusIntl || 'yok'}`;
  }
  const sample = (a, n) => a.slice().sort(() => Math.random() - 0.5).slice(0, n);

  function replyCore(question, ctx, info) {
    const raw = fold(question).replace(/[<>]/g, '').split(' ').filter(Boolean);
    const qw = raw.map((w) => (w.length >= 2 ? w : ''));
    let sp = findSpecies(qw);
    const wkEarly = findWiki(qw);
    // Vikipedi maddesinin adı soruda tam geçiyor ve türlerimizden biri adıyla tam eşleşmiyorsa (ör. "Abant alabalığı" ≠ "Karadeniz Alabalığı") Vikipedi'ye öncelik ver
    if (wkEarly?.complete && !sp.some((h) => h.strong)) sp = [];
    const strongWords = new Set(sp.filter((h) => h.strong).flatMap((h) => [...h.used]));
    // "Hatay", "Malatya" hem yer hem tür adının parçası: yer olarak bulunduysa, adı tam yazılmamış türler elenir
    const early = findTime(qw, strongWords), hasFlower = raw.some((w) => w.startsWith('cicek'));
    const pl = findPlaces(qw, new Set([...strongWords, ...(hasFlower ? early.idx : [])]));
    if (pl.ids.length) sp = sp.filter((h) => h.strong);
    const spWords = new Set(sp.flatMap((h) => [...h.used]));
    const tm = findTime(qw, new Set([...spWords, ...pl.used]));
    const masked = raw.map((w, i) => (spWords.has(i) ? 'tur' : pl.used.has(i) ? 'yer' : tm.idx.has(i) ? 'ay' : w)).filter((w, i, a) => !((w === 'tur' || w === 'yer' || w === 'ay') && a[i - 1] === w)).join(' '); // "Fırat kaplumbağası" iki sözcük ama tek tür
    let { intent, prob } = predict(model, masked);
    if (prob < 0.4) intent = 'bilinmiyor';
    Object.assign(info, { intent, pl, tm, qf: raw.join(' ') });

    const wk = !sp.length && !pl.ids.length && !tm.months && !['selam', 'tesekkur', 'yardim', 'endemik'].includes(intent) ? wkEarly?.w : null;
    if (wk) { info.wiki = wk; return { text: `${wk.t} için Vikipedi'de şöyle yazıyor: ${wk.x}`, ids: [], intent: 'wiki', src: { title: wk.t, url: wk.u } }; }
    if (intent === 'selam') return { text: pick(['Merhaba! Ben Endemik. Türkiye\'nin korunan türlerini sorabilirsin.', 'Selam! Hangi türü merak ediyorsun?', 'Merhaba, hoş geldin! Bir tür adı yaz, sana anlatayım.']), ids: [], intent };
    if (intent === 'tesekkur') return { text: pick(['Rica ederim!', 'Ne demek, başka merak ettiğin bir tür var mı?', 'Memnun oldum. Doğayı korumak hepimizin işi.']), ids: [], intent };
    if (intent === 'yardim') return { text: `Şunları sorabilirsin: bir türün nerede yaşadığını, neye benzediğini, ne zaman çiçek açtığını, korunma durumunu ya da bir yerde hangi türlerin bulunduğunu. Örneğin: "${pick(EXAMPLES)}" Şimdilik yalnızca bu uygulamadaki ${species.length} türün kayıtlarını biliyorum.`, ids: [], intent };
    if (intent === 'endemik') return { text: pick([
      'Endemik, bir canlının yalnızca belirli bir bölgede doğal olarak yaşaması, dünyanın başka yerinde bulunmaması demek. Türkiye\'de çok sayıda endemik bitki ve hayvan var; bu uygulamadaki türlerin hepsi koruma altında.',
      'Endemik tür, sadece tek bir bölgeye ya da ülkeye özgü olan türdür. O bölgede yok olursa dünyadan da yok olmuş olur; bu yüzden korunmaları çok önemli.',
    ]), ids: [], intent };
    if (intent === 'zaman') {
      if (!tm.months) return { text: 'Hangi ayı ya da mevsimi soruyorsun? Örneğin: "Nisan ayında hangi bitkiler çiçek açar?"', ids: [], intent };
      const ids = species.filter((x) => { const m = floweringMonths(x.flowering); return m && [...tm.months].some((k) => m.has(k)); }).map((x) => x.id);
      info.list = { title: tm.title, names: listNamesFull(ids) };
      return { text: listText(info.list), ids: ids.slice(0, 3), intent };
    }
    if (intent === 'tehdit') {
      const g = groupWord(masked + ' ' + raw.join(' '));
      const lv = raw.some((w) => w.startsWith('kritik')) ? ['CR'] : raw.some((w) => w.startsWith('hassas')) ? ['VU'] : ['CR', 'EN', 'VU'];
      const ids = species.filter((x) => (!g || (g === 'hayvan' ? x.group === 'fauna' : x.group === 'flora')) && lv.some((l) => threatLevels(x).has(l))).map((x) => x.id);
      const lead = lv.length === 1 ? (lv[0] === 'CR' ? 'kritik tehlikedeki' : 'hassas durumdaki') : 'nesli tehlike altındaki';
      info.list = { title: `${lead} ${g ? g + ' türleri' : 'türler'}`, names: listNamesFull(ids) };
      return { text: listText(info.list), ids: ids.slice(0, 3), intent };
    }
    if (intent === 'liste') {
      const gw = groupWord(raw.join(' '));
      if (pl.ids.length && gw) {
        const ids = pl.ids.filter((i) => (gw === 'hayvan' ? byId.get(i).group === 'fauna' : byId.get(i).group === 'flora'));
        info.list = { title: `${pl.disp} çevresinde kayıtlı ${gw} türleri`, names: listNamesFull(ids) };
        return { text: listText(info.list), ids: ids.slice(0, 3), intent };
      }
      if (pl.ids.length) return { text: pick([
        `Bu yerle ilgili kayıtlı ${pl.ids.length} tür var: ${listNames(pl.ids)}.`,
        `Kayıtlarda şu türler o çevrede geçiyor: ${listNames(pl.ids)}.`,
      ]), ids: pl.ids.slice(0, 3), intent };
      const wantFauna = /hayvan|fauna|kus|balik|surungen|memeli/.test(masked), wantFlora = /bitki|flora|cicek|ot\b/.test(masked);
      const pool = species.filter((s) => (wantFauna ? s.group === 'fauna' : wantFlora ? s.group === 'flora' : true));
      const ex = pool.slice().sort(() => Math.random() - 0.5).slice(0, 5).map((s) => s.name).join(', ');
      return { text: `Elimde ${species.length} tür var: ${species.filter((s) => s.group === 'fauna').length} hayvan, ${species.filter((s) => s.group === 'flora').length} bitki. Örneğin: ${ex}. Bir tür adı yazarsan ayrıntısını anlatırım; bir yer adı yazarsan oradaki türleri söylerim.`, ids: [], intent };
    }
    if (intent === 'disi') return { text: pick(['Ben yalnızca Türkiye\'nin korunan türleri ve doğa hakkında konuşabiliyorum.', 'Bu konuda yardımcı olamam; ama bir türün nerede yaşadığını ya da neye benzediğini anlatabilirim.']) + ` Örneğin: "${pick(EXAMPLES)}"`, ids: [], intent };
    if (intent === 'bilinmiyor') return { text: `Bunu tam anlayamadım. Şöyle sorabilirsin: "${pick(EXAMPLES)}"`, ids: [], intent };

    let ids = sp.map((h) => h.id);
    if (!ids.length) ids = ctx.lastIds || [];
    if (!ids.length) return { text: `Hangi türü soruyorsun? Tür adını yazarsan söyleyebilirim. Örneğin: "${pick(EXAMPLES)}"`, ids: [], intent };
    info.ids = ids.slice(0, 2);
    const use = ids.slice(0, 2).map((i) => byId.get(i));
    const text = use.map((s) => compose(intent, s)).join('\n\n');
    return { text, ids, intent };
  }

  // Dil modeline verilecek bilgi parçaları + modelin yazamadığı durumlarda gösterilecek yedek cevap
  function reply(question, ctx = {}) {
    const info = {}; const r = replyCore(question, ctx, info);
    const q = info.qf || fold(question), e = pick(EXAMPLES), W = (t) => `<bilgi> ${t} <soru> ${q} <cevap>`;
    let prompts;
    if (info.wiki) prompts = [W(`kaynak | ${info.wiki.t} | ${info.wiki.x}`)];
    else if (info.ids?.length && ['ozet', 'yer', 'gorunum', 'cicek', 'statu'].includes(info.intent)) prompts = info.ids.map((i) => W(speciesCtx(byId.get(i), info.intent)));
    else if (['selam', 'tesekkur', 'endemik'].includes(info.intent)) prompts = [W(`sohbet | ${info.intent}`)];
    else if (info.intent === 'yardim') prompts = [W(`sohbet | yardım | örnek: ${e} | tür sayısı: ${species.length}`)];
    else if (info.list) prompts = [W(listCtx(info.list.title, info.list.names))];
    else if (info.intent === 'liste') {
      if (info.pl?.ids.length) prompts = [W(`yer | ${info.pl.disp} | türler: ${listing(info.pl.ids.map((i) => byId.get(i).name))}`)];
      else { const nf = species.filter((s) => s.group === 'fauna').length; const pool = species.filter((s) => (q.includes('hayvan') ? s.group === 'fauna' : q.includes('bitki') ? s.group === 'flora' : true)); prompts = [W(`genel | ${species.length} tür: ${nf} hayvan, ${species.length - nf} bitki | örnekler: ${sample(pool, 5).map((s) => s.name).join(', ')}`)]; }
    } else if (info.intent === 'zaman') prompts = [];
    else if (['disi', 'bilinmiyor'].includes(info.intent)) prompts = [W(`sohbet | konu dışı | örnek: ${e}`)];
    else prompts = [W(`sohbet | tür belirsiz | örnek: ${e}`)];
    // Cevapta eksiksiz geçmesi gereken bilgiler (uydurma/karıştırma kontrolü)
    let facts;
    if (info.wiki) facts = [[info.wiki.x]];
    else if (info.ids?.length && ['ozet', 'yer', 'gorunum', 'cicek', 'statu'].includes(info.intent)) facts = info.ids.map((i) => {
      const s = byId.get(i);
      if (info.intent === 'ozet') return [s.description];
      if (info.intent === 'yer') return [s.localities.slice(0, 6).map((x) => x.name).join(', ')];
      if (info.intent === 'gorunum') return [s.morphology];
      if (info.intent === 'cicek') return [s.group === 'flora' ? s.flowering : null];
      return [s.statusNational, s.statusIntl];
    });
    else if (info.list) facts = [[info.list.names.slice(0, 8).join(', ')]];
    else if (info.intent === 'liste' && info.pl?.ids.length) facts = [[info.pl.ids.map((i) => byId.get(i).name).slice(0, 8).join(', ')]];
    else facts = prompts.map(() => []);
    return { ...r, facts, prompts, parts: info.ids?.length && ['ozet', 'yer', 'gorunum', 'cicek', 'statu'].includes(info.intent) ? info.ids.map((i) => compose(info.intent, byId.get(i))) : [r.text] };
  }

  return { reply, findSpecies: (q) => findSpecies(ws(q)).map((h) => h.id), predict: (q) => predict(model, q) };
}
