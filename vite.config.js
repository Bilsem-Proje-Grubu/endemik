import { defineConfig } from 'vite';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
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
        .filter((f) => f !== 'precache.json' && f !== 'sw.js' && !f.startsWith('species-img/') && !f.startsWith('model/'));
      writeFileSync(join(out, 'precache.json'), JSON.stringify({ core: ['./', ...files.map((f) => './' + f)] }));
    },
  };
};

// GitHub Pages alt dizinde (/endemik/) yayınlandığı için göreli yol kullanılır.
export default defineConfig({
  base: './',
  plugins: [precacheList()],
});
