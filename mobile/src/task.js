// Arka plan görevi: uygulama kapalıyken de konum gelir; yeni bir türün bölgesine girilince bildirim atılır.
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speciesNear } from './geo';
import species from '../data/species.json';

export const TASK = 'endemik-konum';
const COOLDOWN_MS = 24 * 3600 * 1000;

// Yüksek öncelikli kanal: telefon bildirimi sessizce çubuğa atmasın, açılır pencereyle göstersin.
export const CHANNEL = 'endemik-bolge';
export async function ensureChannel() {
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Bölge bildirimleri',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });
  } catch { /* yoksay */ }
}

// Tanı kaydı: arka planda neyin ne zaman çalıştığını uygulama açılınca görebilmek için.
export async function log(text) {
  try {
    const l = JSON.parse((await AsyncStorage.getItem('endemik.log')) || '[]');
    l.push(`${new Date().toLocaleTimeString('tr-TR')} ${text}`);
    await AsyncStorage.setItem('endemik.log', JSON.stringify(l.slice(-8)));
  } catch { /* yoksay */ }
}
export async function readLog() {
  try { return JSON.parse((await AsyncStorage.getItem('endemik.log')) || '[]'); } catch { return []; }
}

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
  await ensureChannel();
  for (const { sp, loc } of hits) {
    if (seen[sp.id] && now - seen[sp.id] < COOLDOWN_MS) continue;
    seen[sp.id] = now;
    await Notifications.scheduleNotificationAsync({
      content: { title: `Yakınınızda: ${sp.name}`, body: `${loc.name} çevresinde ${sp.name} (${sp.sci || sp.group}) yaşar.` },
      trigger: { channelId: CHANNEL },
    });
  }
  try { await AsyncStorage.setItem('endemik.seen', JSON.stringify(seen)); } catch { /* yoksay */ }
});

// Deneme: gerçek konum görevi gibi, uygulama kapalıyken de çalışan ayrı bir görev kullanır.
export const TEST_TASK = 'endemik-deneme';

TaskManager.defineTask(TEST_TASK, async ({ data, error }) => {
  if (error) { await log('hata: ' + error.message); return; }
  let t = null;
  try { t = JSON.parse((await AsyncStorage.getItem('endemik.test')) || 'null'); } catch { /* yoksay */ }
  if (!t) return;
  if (Date.now() < t.due) { await log('görev çalıştı, bekliyor'); return; }
  await AsyncStorage.removeItem('endemik.test');
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: `Yakınınızda: ${t.name}`, body: `[DENEME] ${t.loc} çevresinde ${t.name} (${t.sci}) yaşar.` },
    trigger: { channelId: CHANNEL },
  });
  await log('BİLDİRİM GÖNDERİLDİ');
  try { await Location.stopLocationUpdatesAsync(TEST_TASK); } catch { /* yoksay */ }
});

export async function testNotification() {
  const sp = species[Math.floor(Math.random() * species.length)];
  const loc = sp.localities[0];
  await AsyncStorage.setItem('endemik.log', '[]');
  await log('deneme başladı');
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
