# Tasks: PWA + Push Notifications

## 1. Dependencies & Configuration

- [x] 1.1 Install `vite-plugin-pwa` (прим.: пакет называется `vite-plugin-pwa`, НЕ `@vitejs/plugin-pwa`) with bundled `workbox-*` in frontend
- [x] 1.2 Install `web-push` and `node-cron` packages in backend
- [x] 1.3 Generate VAPID keys once: `npx web-push generate-vapid-keys` → save the SAME pair to `.env` (prod backend) and `.env.development` (dev backend) as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`; keys never expire — no scheduled re-generation
- [x] 1.4 Timezone: pass `{ timezone: 'Europe/Moscow' }` option to `cron.schedule()` in code; compute "today MSK" at startup via `Intl.DateTimeFormat(undefined, { timeZone: 'Europe/Moscow', ... }).formatToParts(new Date())` — no `TZ` env var, no tz library

## 2. Database Schema Changes

- [x] 2.1 Add `pushNotificationsEnabled Boolean @default(true)` field to User model in `prisma/schema.prisma`
- [x] 2.2 Create new `PushSubscription` model with fields: id, userId, endpoint (unique), p256dhKey, authSecret, lastReminderSent (DateTime?, MSK date of last pushed reminder), createdAt, updatedAt
- [x] 2.3 Run `npx prisma migrate dev --name add_push_infrastructure` to apply migrations (прим.: миграция создана вручную как `backend/prisma/migrations/2_add_push_infrastructure/migration.sql` в стиле репо — VARCHAR(255)/TIMESTAMPTZ, применена через `prisma migrate deploy`; drift от `migrate diff` здесь не используется)
- [x] 2.4 Verify migration works: `docker compose exec postgres psql -U energy_user -d energy_day -c "\d push_subscriptions"`

## 3. Backend — Subscription Endpoints

- [x] 3.1 Create `backend/src/modules/push/` directory structure with `routes.ts`, `controller.ts`, `service.ts`, `schema.ts` (фактические имена файлов: `routes.controller.ts`, `routes.ts`, `service.ts`, `schema.ts`)
- [x] 3.2 Implement Zod schema for subscription validation (endpoint string required, p256dh string required, auth string required)
- [x] 3.3 Implement `POST /api/push-subscriptions` controller: parse body, upsert subscription linked to req.userId, return 201 or 200 (прим.: роут смонтирован под `authMiddleware` — идентично daily-logs; авторизация по httpOnly-cookie)
- [x] 3.4 Implement `DELETE /api/push-subscriptions/:endpoint` controller: delete by endpoint, return 200 or 404 (прим.: браузерный endpoint содержит слэши, параметр `:endpoint` не работает — используется wildcard `router.delete("*")` с парсингом endpoint из `req.url`; фронтенд шлёт `encodeURIComponent(endpoint)`; scope'd по userId)
- [x] 3.5 Register routes in `backend/src/app.ts` under `/api/push-subscriptions` prefix (no auth middleware needed for POST—auth via token passed separately)

## 4. Backend — Cron Reminder Job

- [x] 4.1 Create `backend/src/modules/push/cron.ts` with node-cron scheduled at `'0 20 * * *'` with timezone option `'Europe/Moscow'`
- [x] 4.2 Implement query: find all users where `pushNotificationsEnabled === true` AND no `daily_logs` entry exists for today (MSK date)
- [x] 4.3 For each matching user, fetch their active subscriptions from `push_subscriptions` table
- [x] 4.4 Send web-push notification to each subscription with payload: `{title: "Незаполненный дневник", body: "Напоминание: заполните показатели за сегодня", icon: "/icons/icon-192.png"}` (прим.: в исходной задаче `/icon-192.png` — опечатка; реальный путь иконки `/icons/icon-192.png`, как и fallback в SW)
- [x] 4.5 Before sending to a subscription, skip it if its `lastReminderSent` is already today's MSK date; after a successful send, set `push_subscriptions.lastReminderSent` to that date (one push per device per day)
- [x] 4.6 Handle errors gracefully: catch `web-push` errors, log them, skip failed subscriptions without stopping the loop; HTTP 410/404 от push-сервиса → удалить подписку из БД
- [x] 4.7 Schedule cron only when `NODE_ENV === 'production'` to avoid running during development (primes guard `startDailyReminderCron()` ставится вокруг `schedule()`, а `runDailyReminder()` экспортируется без гварда для ручного вызова; добавлен `NODE_ENV="production"` в корневой `.env`)

## 5. Frontend — PWA Manifest & Icons

- [x] 5.1 Create `public/manifest.json` with required fields: name, short_name, description, start_url, display (standalone), theme_color, background_color, icons array (192x192, 512x512 PNG paths)
- [x] 5.2 Generate icon files: download or create `icon-192.png` (192×192 PNG) and `icon-512.png` (512×512 PNG) → place in `public/icons/`
- [x] 5.3 Add `<link rel="manifest" href="/manifest.json">` to `frontend/index.html` head section
- [x] 5.4 Optionally add `<meta name="theme-color" content="#3b82f6">` to `index.html` for browser chrome color

## 6. Frontend — Service Worker Configuration

- [x] 6.1 Configure `vite-plugin-pwa` in `frontend/vite.config.ts`: strategy `injectManifest`, precaching via workbox, runtime caching for API GET (`NetworkFirst`), registerType 'autoUpdate'
- [x] 6.2 Ensure service worker registers on app load: `registerSW({ immediate: true })` from `virtual:pwa-register` in main.tsx (plugin auto-generated module)
- [x] 6.3 Test Service Worker activation: open Chrome DevTools → Application → Service Workers → verify installed and active
- [x] 6.4 Test offline mode: disconnect network, reload page, verify cached assets still load

## 7. Frontend — Push Permission Flow

- [x] 7.1 In `frontend/src/context/AuthContext.tsx` or a new hook, add function `requestPushPermission()` that calls `Notification.requestPermission()` after successful login (прим.: реализовано как `subscribeToPush()` в `frontend/src/lib/push.ts`, вызывается из AuthContext через `requestPushAfterLogin()` — fire-and-forget catch, one-shot ref-guard)
- [x] 7.2 If permission granted, generate PushSubscription using `registration.pushManager.subscribe()` with VAPID public key (прим.:** requirement on `navigator.serviceWorker.controller` убрано — используется `.ready`)
- [x] 7.3 Send subscription object to backend via `POST /api/push-subscriptions` with auth header token (прим.: ключи берутся через `subscription.toJSON()` — у типа `PushSubscription` нет свойства `keys` в lib.dom)
- [x] 7.4 Handle `pushsubscriptionchange` on the SW registration: if `event.new` is a subscription → POST it to the backend (upsert by endpoint); if `event.new === null` (permission revoked / subscription invalidated) → `DELETE /api/push-subscriptions/:endpoint` for the old endpoint (прим.: event не типизирован в lib.dom — локальный интерфейс + cast; DELETE шлёт `encodeURIComponent(endpoint)` на wildcard-роут)
- [x] 7.5 Do NOT delete the subscription on unmount/unload/close-tab: the server-side record must persist while the app is closed, since that is exactly when reminders need to be delivered. Deletion happens only via the `pushsubscriptionchange` flow above or server-side 410-Gone cleanup

## 8. Frontend — Push Notification Handler (Service Worker)

- [x] 8.1 Create Service Worker (`frontend/src/service-worker.ts`, bundled to `/service-worker.js` by vite-plugin-pwa injectManifest) with `push` event listener
- [x] 8.2 In push listener: parse notification data JSON, extract title/body/icon/badge
- [x] 8.3 Call `self.registration.showNotification(title, {body, icon, badge})` with parsed values
- [x] 8.4 Handle `notificationclick` event: close notification, focus/open app window at specified URL (`data.url`)

## 9. Integration Testing

- [x] 9.1 Test subscription flow end-to-end: login → permission prompt → accept → check DB has subscription record (прим.: проверено на REST-уровне — JWT register/login, POST `/api/push-subscriptions` → 201, дубликат → 200 upsert (1 строка в БД), DELETE encoded endpoint → 200, повторный → 404; плюс живой browser-e2e: логин → разрешение уведомлений → реальная FCM-подписка (`https://fcm.googleapis.com/fcm/send/...`) легла в `push_subscriptions`)
- [x] 9.2 Test manual push via curl/WASM: send test push to stored subscription endpoint manually to verify delivery (прим.: доставка верифицирована через локальный HTTPS-stub с self-signed cert и валидным 65-байтовым P-256 ключом — получен шифрованный POST от web-push; финальная проверка — реальный FCM-пуш до живого браузера: dev-роут `POST /api/push-subscriptions/test-push` → бэкенд `sent:1, failed:0` → SW `[sw] push received` + `[sw] notification shown` → системный баннер появился (условие: уведомления сайта включены в настройках браузера и вкладка без фокуса — Chrome прячет баннеры для активного окна))
- [x] 9.3 Test daily cron trigger manually: run cron function directly in Node REPL to simulate 20:00 execution (прим.: `runDailyReminder()` вызвана напрямую из tsx-скрипта, гвард prod обходится экспортом без гварда)
- [x] 9.4 Verify no reminders sent when daily log exists for current MSK date (прим.: юзер с DailyLog за сегодня не фигурирует в attempted sends; контроль — юзер без лога получил попытку)
- [x] 9.5 Verify reminders NOT sent when `pushNotificationsEnabled = false` (прим.: пользователь полностью исключается из totalUsers)
- [x] 9.6 Verify duplicate prevention: cron runs twice same day → only one reminder per user (прим.: второй прогон того же дня дал `skipped: 1`)

## 10. Production Readiness

- [ ] 10.1 Verify HTTPS requirement: production must serve over HTTPS (nginx config already handles SSL?) (прим.: НЕ выполнено — `nginx.conf` слушает только :80; ssl-блок (Let's Encrypt/Caddy) добавляется при деплое на VPS; PWA/Web Push без TLS не работают)
- [x] 10.2 Update `nginx.conf` to serve `/icons/icon-192.png` and `/icons/icon-512.png` with correct MIME type (прим.: статика отдаётся штатным `root /usr/share/nginx/html` + mime.types nginx (`image/png`) — явные location не нужны; дополнительно по рекомендации AGENTS.md добавлены `Cache-Control: no-cache` для `/service-worker.js` и `/manifest.json`, чтобы клиенты вовремя видели новый билд)
- [x] 10.3 Set `NODE_ENV=production` check so cron job doesn't run in development (прим.: guard в `startDailyReminderCron()` — `process.env.NODE_ENV !== 'production'`; в корневом `.env` добавлено `NODE_ENV="production"`, в `.env.development` — `"development"`)
- [x] 10.4 Document VAPID key handling in README: keys are a static EC pair, generated once and do not expire (the per-request VAPID JWT ≤24h is handled by web-push automatically); rotation only on suspected compromise (new pair in `.env` + new public key in frontend) (прим.: секция «PWA и Push Notifications» добавлена в README после «Запуск окружений» (секция 12))
- [x] 10.5 Add monitoring: log count of reminders sent per day to application logs (прим.: `runDailyReminder()` логирует итог `{totalUsers, reminded, sent, skipped, failed, removed}` + MSK-дату в `[push] daily reminder (...)` один раз за прогон)
- [ ] 10.6 Test installability: deploy to staging, visit on Chrome Android/Desktop, verify "Add to Home Screen" banner appears
