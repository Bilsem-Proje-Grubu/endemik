// species.json üretir: node scripts/build-species.mjs
import { writeFileSync } from 'node:fs';
import { fauna, flora, BASE_PDF } from './species-list.mjs';
import { details } from './details.mjs';

const slug = (s) => s.toLocaleLowerCase('tr')
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const out = [];
for (const [name, sci, pdf] of fauna) out.push({ name, sci, group: 'fauna', pdf: BASE_PDF + encodeURIComponent(pdf).replace(/%2F/g, '/') });
for (const [name, sci] of flora) {
  const pdf = `${sci.split(' subsp.')[0].split(' var.')[0]} (${name}).pdf`;
  out.push({ name, sci, group: 'flora', pdf: null, pdfGuess: pdf });
}

const list = out.map((s) => ({
  id: slug(s.name),
  name: s.name,
  sci: s.sci,
  group: s.group,
  image: null,
  description: '',
  morphology: '',
  flowering: '',
  statusNational: '',
  statusIntl: '',
  localities: [],
  pdf: s.pdf,
  ...(details[s.name] || {}),
}));

// Ayrıntısı olan türler başa gelsin.
list.sort((a, b) => (b.localities.length > 0) - (a.localities.length > 0));

const ids = new Set();
for (const s of list) { if (ids.has(s.id)) throw new Error('Yinelenen id: ' + s.id); ids.add(s.id); }
writeFileSync(new URL('../src/data/species.json', import.meta.url), JSON.stringify(list, null, 2));
console.log(list.length, 'tür yazıldı;', list.filter((s) => s.localities.length).length, 'tanesinde lokalite var');
