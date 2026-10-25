// Sohbet botu istemcisi: model ve cevaplar tamamen cihazda çalışır (sunucuya soru gönderilmez).
// Model: scripts/train-chat.mjs ile bu projede eğitilir (src/data/chat-model.json). Mantık: src/chatlogic.js
import species from './data/species.json';
import model from './data/chat-model.json';
import { createBot } from './chatlogic.js';

export const chatAvailable = true;
const bot = createBot(species, model);

// ctx: { lastIds } — "Peki nerede yaşar?" gibi devam soruları son konuşulan türe bağlanır.
export async function ask(question, ctx) {
  await new Promise((r) => setTimeout(r, 350 + Math.random() * 450)); // yazıyormuş gibi kısa bekleme
  return bot.reply(question, ctx);
}
