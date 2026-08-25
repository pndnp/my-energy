import api from "./api";

// Public VAPID key (статичная EC-пара, не секрет, истекает никогда)
const VAPID_PUBLIC_KEY =
  "BP16fsrwNyI7pTOanPjs4NsqgDqnE6lLkKKyPZhtPEFOewgsgmdboUwVT3M3cDQzqpHco5JaPwcuDYdx92IkWyE";

// У lib.dom нет типа PushSubscriptionChangeEvent в ServiceWorkerRegistrationEventMap,
// само событие имеет поля `new` / `old` (оба PushSubscription | null)
interface PushSubscriptionChangeLike extends Event {
  readonly new: PushSubscription | null;
  readonly old: PushSubscription | null;
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function toServerSubscription(subscription: PushSubscription): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint ?? subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  };
}

export async function sendSubscriptionToServer(
  subscription: PushSubscription | null,
): Promise<void> {
  if (!subscription) return;
  await api.post("/push-subscriptions", toServerSubscription(subscription));
}

export async function removeSubscriptionFromServer(endpoint: string): Promise<void> {
  try {
    await api.delete(`/push-subscriptions/${encodeURIComponent(endpoint)}`);
  } catch {
    // сервер сам удаляет мёртвые подписки по 410 Gone от push-сервиса
  }
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Listener на ротацию/отзыв подписки браузером регистрируется ОДИН раз на приложение
// (у приложения один SW-scope, поэтому повторные вызовы subscribeToPush его не дублируют).
let changeListenerAttached = false;

function attachSubscriptionChangeListener(registration: ServiceWorkerRegistration): void {
  if (changeListenerAttached) return;
  changeListenerAttached = true;
  const handler = (event: Event): void => {
    const changeEvent = event as PushSubscriptionChangeLike;
    void (async () => {
      if (changeEvent.new === null) {
        await removeSubscriptionFromServer(changeEvent.old?.endpoint ?? "");
        return;
      }
      await sendSubscriptionToServer(changeEvent.new);
    })().catch(() => {});
  };
  // lib.dom не знает про событие pushsubscriptionchange в EventMap'е
  // (оно есть только в lib webworker), поэтому используем строковую
  // перегрузку addEventListener(type: string, ...)
  registration.addEventListener("pushsubscriptionchange", handler);
}

/**
 * Подписка на Web Push + синхронизация с бэкендом.
 * Идемпотентна: при уже выданном разрешении subscribe() возвращает ту же
 * (или обновлённую) подписку и повторно записывает её на сервер —
 * это восстанавливает запись после «потери» подписки браузером (ротация ключей,
 * рестарт браузера), поэтому вызывать можно и при логине, и при восстановлении
 * сессии через /auth/me.
 *
 * Опция silent: не показывать диалог разрешения от браузера, а подписаться только
 * если разрешение уже выдано (для тихого восстановления сессии).
 */
export interface SubscribeOptions {
  silent?: boolean;
}

export async function subscribeToPush(options: SubscribeOptions = {}): Promise<void> {
  if (!isPushSupported()) return;

  if (options.silent) {
    // Тихий режим: без диалога, только при уже данном разрешении
    if (Notification.permission !== "granted") return;
  } else {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
  }

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = base64UrlToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
  await sendSubscriptionToServer(subscription);
  attachSubscriptionChangeListener(registration);
}

export { base64UrlToUint8Array };
