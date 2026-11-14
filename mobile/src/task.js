// Arka plan görevi: uygulama kapalıyken de konum gelir; yeni bir türün bölgesine girilince bildirim atılır.
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speciesNear } from './geo';
import species from '../data/species.json';

export const TASK = 'endemik-konum';
const COOLDOWN_MS = 24 * 3600 * 1000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const p = data.locations[data.locations.length - 1].coords;
  const hits = speciesNear({ lat: p.latitude, lng: p.longitude });
  if (!hits.length) return;
  let seen = {};
  try { seen = JSON.parse((await AsyncStorage.getItem('endemik.seen')) || '{}'); } catch { /* yoksay */ }
  const now = Date.now();
  for (const { sp, loc } of hits) {
    if (seen[sp.id] && now - seen[sp.id] < COOLDOWN_MS) continue;
    seen[sp.id] = now;
    await Notifications.scheduleNotificationAsync({
      content: { title: `Yakınınızda: ${sp.name}`, body: `${loc.name} çevresinde ${sp.name} (${sp.sci || sp.group}) yaşar.` },
      trigger: null,
    });
  }
  try { await AsyncStorage.setItem('endemik.seen', JSON.stringify(seen)); } catch { /* yoksay */ }
});

// Deneme: rastgele bir türün bölgesindeymiş gibi davranıp 10 sn sonra bildirim gönderir (uygulama kapatılabilir).
export async function testNotification() {
  const sp = species[Math.floor(Math.random() * species.length)];
  const loc = sp.localities[0];
  const hits = speciesNear({ lat: loc.lat, lng: loc.lng }).filter((h) => h.sp.id === sp.id);
  const h = hits[0] || { sp, loc };
  await Notifications.scheduleNotificationAsync({
    content: { title: `Yakınınızda: ${h.sp.name}`, body: `[DENEME] ${h.loc.name} çevresinde ${h.sp.name} (${h.sp.sci || h.sp.group}) yaşar.` },
    trigger: { type: 'timeInterval', seconds: 10 },
  });
  return h.sp.name;
}
