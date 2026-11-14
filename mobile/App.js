import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { TASK } from './src/task';
import { speciesNear } from './src/geo';

export default function App() {
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState('');
  const [near, setNear] = useState(null);

  useEffect(() => { Location.hasStartedLocationUpdatesAsync(TASK).then(setOn).catch(() => {}); }, []);

  async function enable() {
    const n = await Notifications.requestPermissionsAsync();
    if (!n.granted) return setMsg('Bildirim izni verilmedi.');
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) return setMsg('Konum izni verilmedi.');
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (!bg.granted) return setMsg('Uygulama kapalıyken çalışması için konum iznini "Her zaman izin ver" yapın (Ayarlar → Uygulamalar → Endemik → Konum).');
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
  async function check() {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) return setMsg('Konum izni verilmedi.');
    const p = await Location.getCurrentPositionAsync({});
    setNear(speciesNear({ lat: p.coords.latitude, lng: p.coords.longitude }));
  }

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h1}>Endemik</Text>
      <Text style={s.p}>Bir türün yaşadığı bölgeye girince telefonunuza bildirim gelir. Konumunuz yalnızca telefonda kalır.</Text>
      <Pressable style={[s.btn, on && s.off]} onPress={on ? disable : enable}>
        <Text style={s.bt}>{on ? 'Bildirimi kapat' : 'Bildirimi aç'}</Text>
      </Pressable>
      {!!msg && <Text style={s.err}>{msg}</Text>}
      <Pressable style={[s.btn, s.off]} onPress={check}><Text style={s.bt}>Şu an buradaki türler</Text></Pressable>
      {near && (near.length
        ? near.map(({ sp, loc }) => <Text key={sp.id} style={s.item}>• {sp.name} — {loc.name}</Text>)
        : <Text style={s.p}>Bulunduğunuz yerde kayıtlı tür yok.</Text>)}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 24, paddingTop: Platform.OS === 'android' ? 60 : 80, gap: 14 },
  h1: { fontSize: 28, fontWeight: '700' },
  p: { fontSize: 16, color: '#444' },
  btn: { backgroundColor: '#2a7f4f', padding: 14, borderRadius: 10, alignItems: 'center' },
  off: { backgroundColor: '#5b6b75' },
  bt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  err: { color: '#b00020' },
  item: { fontSize: 16 },
});
