import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler, Platform, StatusBar, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { TASK } from './src/task';

const SITE = 'https://bilsem-proje-grubu.github.io/endemik/';

export default function App() {
  const web = useRef(null);
  const [canBack, setCanBack] = useState(false);
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { Location.hasStartedLocationUpdatesAsync(TASK).then(setOn).catch(() => {}); }, []);
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().catch(() => {});
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canBack && web.current) { web.current.goBack(); return true; }
      return false;
    });
    return () => h.remove();
  }, [canBack]);

  async function enable() {
    const n = await Notifications.requestPermissionsAsync();
    if (!n.granted) return setMsg('Bildirim izni verilmedi.');
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) return setMsg('Konum izni verilmedi.');
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (!bg.granted) return setMsg('Konum iznini "Her zaman izin ver" yapın (Ayarlar → Uygulamalar → Endemik → Konum).');
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 300,
      deferredUpdatesInterval: 60000,
      pausesUpdatesAutomatically: false,
      foregroundService: { notificationTitle: 'Endemik', notificationBody: 'Yakındaki türler izleniyor' },
    });
    setOn(true); setMsg('');
  }
  async function disable() {
    await Location.stopLocationUpdatesAsync(TASK).catch(() => {});
    setOn(false);
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1218" />
      <WebView
        ref={web}
        source={{ uri: SITE }}
        style={s.web}
        geolocationEnabled
        javaScriptEnabled
        domStorageEnabled
        onNavigationStateChange={(st) => setCanBack(st.canGoBack)}
        onShouldStartLoadWithRequest={(r) => {
          if (r.url.startsWith(SITE) || r.url.startsWith('about:') || r.url.startsWith('blob:') || r.url.startsWith('data:')) return true;
          if (/^https?:/.test(r.url) && /tile\.openstreetmap|unpkg|cdnjs|supabase|wikimedia|gbif|inaturalist/.test(r.url)) return true;
          Linking.openURL(r.url).catch(() => {});
          return false;
        }}
      />
      <View style={s.bar}>
        <Pressable style={[s.btn, on && s.off]} onPress={on ? disable : enable}>
          <Text style={s.bt}>{on ? '🔔 Bölge bildirimi açık · kapat' : '🔕 Bölge bildirimini aç'}</Text>
        </Pressable>
        {!!msg && <Text style={s.err}>{msg}</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1218', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 40 },
  web: { flex: 1 },
  bar: { padding: 8, backgroundColor: '#0b1218' },
  btn: { backgroundColor: '#2a7f4f', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  off: { backgroundColor: '#3b4a55' },
  bt: { color: '#fff', fontSize: 15, fontWeight: '600' },
  err: { color: '#ff8a80', marginTop: 6, fontSize: 13 },
});
