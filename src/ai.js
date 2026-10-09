// DEMO: Gerçek yapay zekâ henüz bağlı değil. Önce veri setindeki türle eşleşmeyi dener,
// yoksa genel bir taslak üretir. İleride bu fonksiyon bir sunucusuz fonksiyona (ör. Cloudflare Worker)
// istek atacak şekilde değiştirilecek; arayüz aynı kalır.
const norm = (s) => s.toLocaleLowerCase('tr').trim();

export async function aiFillSpeciesInfo(name, species) {
  await new Promise((r) => setTimeout(r, 700));
  const q = norm(name);
  const hit = species.find((s) => norm(s.name) === q || norm(s.sci || '') === q) ||
              species.find((s) => norm(s.name).includes(q) || (s.sci && norm(s.sci).includes(q)));
  if (hit) {
    return { demo: true, matched: hit.id, name: hit.name, sci: hit.sci, group: hit.group,
      description: hit.description || '', morphology: hit.morphology || '', flowering: hit.flowering || '',
      statusNational: hit.statusNational || '', statusIntl: hit.statusIntl || '' };
  }
  return { demo: true, matched: null, name, sci: '', group: '',
    description: `${name} için otomatik bilgi (demo): Tür adı veri setinde bulunamadı. Gerçek yapay zekâ bağlandığında genel bilgiler burada otomatik dolacak.`,
    morphology: '', flowering: '', statusNational: '', statusIntl: '' };
}
