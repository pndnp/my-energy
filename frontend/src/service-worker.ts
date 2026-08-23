import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

type PrecacheEntry = string | { url: string; revision: string | null };

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: PrecacheEntry[];
};

const wbManifest: PrecacheEntry[] = self.__WB_MANIFEST;

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();

precacheAndRoute(wbManifest);

if (wbManifest.length > 0) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL("/index.html"), {
      denylist: [/^\/api\//],
    }),
  );
}

registerRoute(
  ({ url, request }) => url.pathname.startsWith("/api/") && request.method === "GET",
  new NetworkFirst({ cacheName: "api-cache", networkTimeoutSeconds: 4 }),
  "GET",
);

interface PushNotificationData {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
}

self.addEventListener("push", (event) => {
  let data: PushNotificationData = {};
  if (event.data) {
    try {
      data = event.data.json() as PushNotificationData;
    } catch {
      // невалидный payload — показываем уведомление по умолчанию
    }
  }
  const title = data.title ?? "Энергия дня";
  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon ?? "/icons/icon-192.png",
    badge: data.badge,
    data: { url: data.url ?? "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null | undefined)?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if (client.url && new URL(client.url).origin === self.location.origin) {
          await client.focus();
          await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    }),
  );
});
