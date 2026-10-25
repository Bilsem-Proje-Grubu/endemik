import { defineConfig } from 'vite';
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

// Çevrimdışı çalışma için: uygulamanın temel dosyalarını (sayfa, JS, CSS, ikonlar) listeler.
// Service worker kurulurken bunları önceden indirir. Tür fotoğrafları (species-img) büyük olduğu için
// buraya girmez; Ayarlar'daki "Çevrimdışı indir" düğmesiyle kullanıcının isteğiyle indirilir.
const precacheList = () => {
  let out = 'dist';
  return {
    name: 'endemik-precache',
    apply: 'build',
    configResolved(cfg) { out = cfg.build.outDir; },
    closeBundle() {
      const files = walk(out).map((p) => relative(out, p).split('\\').join('/'))
        .filter((f) => f !== 'precache.json' && f !== 'sw.js' && f !== 'species.json' && !f.startsWith('species-img/'));
      // Sohbet botu (Supabase fonksiyonu) tür bilgilerini bu dosyadan okur.
      const all = JSON.parse(readFileSync('src/data/species.json', 'utf8'));
      writeFileSync(join(out, 'species.json'), JSON.stringify(all.map((s) => ({
        id: s.id, name: s.name, sci: s.sci, group: s.group, description: s.description, morphology: s.morphology,
        flowering: s.flowering, statusNational: s.statusNational, statusIntl: s.statusIntl, places: s.localities.map((l) => l.name),
      }))));
      writeFileSync(join(out, 'precache.json'), JSON.stringify({ core: ['./', ...files.map((f) => './' + f)] }));
    },
  };
};

// GitHub Pages alt dizinde (/endemik/) yayınlandığı için göreli yol kullanılır.
export default defineConfig({
  base: './',
  plugins: [precacheList()],
});
