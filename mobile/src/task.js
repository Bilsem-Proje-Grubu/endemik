// Arka plan görevi: uygulama kapalıyken de konum gelir; yeni bir türün bölgesine girilince bildirim atılır.
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
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

// Deneme: gerçek konum görevi gibi, uygulama kapalıyken de çalışan ayrı bir görev kullanır.
export const TEST_TASK = 'endemik-deneme';

TaskManager.defineTask(TEST_TASK, async ({ data, error }) => {
  if (error) return;
  let t = null;
  try { t = JSON.parse((await AsyncStorage.getItem('endemik.test')) || 'null'); } catch { /* yoksay */ }
  if (!t || Date.now() < t.due) return;
  await AsyncStorage.removeItem('endemik.test');
  await Notifications.scheduleNotificationAsync({
    content: { title: `Yakınınızda: ${t.name}`, body: `[DENEME] ${t.loc} çevresinde ${t.name} (${t.sci}) yaşar.` },
    trigger: null,
  });
  try { await Location.stopLocationUpdatesAsync(TEST_TASK); } catch { /* yoksay */ }
});

export async function testNotification() {
  const sp = species[Math.floor(Math.random() * species.length)];
  const loc = sp.localities[0];
  await AsyncStorage.setItem('endemik.test', JSON.stringify({ due: Date.now() + 10000, name: sp.name, loc: loc.name, sci: sp.sci || sp.group }));
  await Location.startLocationUpdatesAsync(TEST_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 3000,
    distanceInterval: 0,
    pausesUpdatesAutomatically: false,
    foregroundService: { notificationTitle: 'Endemik deneme', notificationBody: 'Deneme bildirimi bekleniyor' },
  });
  return sp.name;
}
