import { defineConfig } from 'vite';

// Göreli yol: uygulama herhangi bir alt dizinde (ör. GitHub Pages) çalışsın.
export default defineConfig({
  base: './',
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
});
