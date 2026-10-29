// Tarayıcı bildirimi: sadece kullanıcı izin verdiyse ve ayarı açtıysa. Baskı/korku dili yok.

export const supported = () => typeof Notification !== 'undefined';

/** İzin ister. 'granted' | 'denied' | 'default' | 'unsupported' döner. */
export async function ask() {
  if (!supported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Bildirim gösterir (izin yoksa sessizce geçer). */
export async function show(title, body, tag) {
  if (!supported() || Notification.permission !== 'granted') return;
  try {
    const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
    if (reg && reg.showNotification) {
      await reg.showNotification(title, { body, tag, icon: './icons/icon-192.png', badge: './icons/icon-192.png' });
    } else {
      new Notification(title, { body, tag, icon: './icons/icon-192.png' });
    }
  } catch {
    /* yoksay */
  }
}
