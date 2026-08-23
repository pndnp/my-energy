import api from "./api";

// Public VAPID key (статичная EC-пара, не секрет, истекает никогда)
const VAPID_PUBLIC_KEY =
  "BP16fsrwNyI7pTOanPjs4NsqgDqnE6lLkKKyPZhtPEFOewgsgmdboUwVT3M3cDQzqpHco5JaPwcuDYdx92IkWyE";

// У lib.dom нет типа PushSubscriptionChangeEvent в ServiceWorkerRegistrationEventMap,
// но само событие имеет поля `new` / `old` (оба PushSubscription | null)
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

export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported()) return;

  // Если разрешение уже было дано ранее, запрос вернёт "granted" без диалога,
  // а subscribe() вернёт ту же подписку — повторный upsert идемпотентен.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = base64UrlToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
  await sendSubscriptionToServer(subscription);

  // Обновление ключей / отзыв подписки браузером → синхронизируем с бэкендом
  registration.addEventListener("pushsubscriptionchange", (event: Event) => {
    const changeEvent = event as PushSubscriptionChangeLike;
    void (async () => {
      if (changeEvent.new === null) {
        await removeSubscriptionFromServer(changeEvent.old?.endpoint ?? "");
        return;
      }
      await sendSubscriptionToServer(changeEvent.new);
    })().catch(() => {});
  });
}

export { base64UrlToUint8Array };
