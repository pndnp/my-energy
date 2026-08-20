# Tasks: PWA + Push Notifications

## 1. Dependencies & Configuration

- [ ] 1.1 Install `@vitejs/plugin-pwa` and `workbox-*` packages in frontend
- [ ] 1.2 Install `web-push` and `node-cron` packages in backend
- [ ] 1.3 Generate VAPID keys: `npx web-push generate-vapid-keys` → save to `.env.development` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`
- [ ] 1.4 Add `TZ=Europe/Moscow` to docker-compose.yml environment block for both `backend-dev` and `backend` services

## 2. Database Schema Changes

- [ ] 2.1 Add `pushNotificationsEnabled Boolean @default(true)` field to User model in `prisma/schema.prisma`
- [ ] 2.2 Create new `PushSubscription` model with fields: id, userId, endpoint (unique), p256dhKey, authSecret, createdAt, updatedAt
- [ ] 2.3 Run `npx prisma migrate dev --name add_push_infrastructure` to apply migrations
- [ ] 2.4 Verify migration works: `docker compose exec postgres psql -U energy_user -d energy_day -c "\d push_subscriptions"`

## 3. Backend — Subscription Endpoints

- [ ] 3.1 Create `backend/src/modules/push/` directory structure with `routes.ts`, `controller.ts`, `service.ts`, `schema.ts`
- [ ] 3.2 Implement Zod schema for subscription validation (endpoint string required, p256dh string required, auth string required)
- [ ] 3.3 Implement `POST /api/push-subscriptions` controller: parse body, upsert subscription linked to req.userId, return 201 or 200
- [ ] 3.4 Implement `DELETE /api/push-subscriptions/:endpoint` controller: delete by endpoint, return 200 or 404
- [ ] 3.5 Register routes in `backend/src/app.ts` under `/api/push-subscriptions` prefix (no auth middleware needed for POST—auth via token passed separately)

## 4. Backend — Cron Reminder Job

- [ ] 4.1 Create `backend/src/modules/push/cron.ts` with node-cron scheduled at `'0 20 * * *'` with timezone option `'Europe/Moscow'`
- [ ] 4.2 Implement query: find all users where `pushNotificationsEnabled === true` AND no `daily_logs` entry exists for today (MSK date)
- [ ] 4.3 For each matching user, fetch their active subscriptions from `push_subscriptions` table
- [ ] 4.4 Send web-push notification to each subscription with payload: `{title: "Незаполненный дневник", body: "Напоминание: заполните показатели за сегодня", icon: "/icon-192.png"}`
- [ ] 4.5 Track that reminder was sent: update `lastReminderSent` field in `daily_logs` for today's date (upsert if not exists, just timestamp)
- [ ] 4.6 Handle errors gracefully: catch `web-push` errors, log them, skip failed subscriptions without stopping the loop
- [ ] 4.7 Schedule cron only when `NODE_ENV === 'production'` to avoid running during development

## 5. Frontend — PWA Manifest & Icons

- [ ] 5.1 Create `public/manifest.json` with required fields: name, short_name, description, start_url, display (standalone), theme_color, background_color, icons array (192x192, 512x512 PNG paths)
- [ ] 5.2 Generate icon files: download or create `icon-192.png` (192×192 PNG) and `icon-512.png` (512×512 PNG) → place in `public/icons/`
- [ ] 5.3 Add `<link rel="manifest" href="/manifest.json">` to `frontend/index.html` head section
- [ ] 5.4 Optionally add `<meta name="theme-color" content="#3b82f6">` to `index.html` for browser chrome color

## 6. Frontend — Service Worker Configuration

- [ ] 6.1 Configure `@vitejs/plugin-pwa` in `frontend/vite.config.ts`: enable precaching, configure runtime caching for API responses, set registerType to 'autoUpdate'
- [ ] 6.2 Ensure service worker registers on app load: plugin should auto-inject registration code in main.tsx or provide manual integration
- [ ] 6.3 Test Service Worker activation: open Chrome DevTools → Application → Service Workers → verify installed and active
- [ ] 6.4 Test offline mode: disconnect network, reload page, verify cached assets still load

## 7. Frontend — Push Permission Flow

- [ ] 7.1 In `frontend/src/context/AuthContext.tsx` or a new hook, add function `requestPushPermission()` that calls `Notification.requestPermission()` after successful login
- [ ] 7.2 If permission granted, generate PushSubscription using `registration.pushManager.subscribe()` with VAPID public key
- [ ] 7.3 Send subscription object to backend via `POST /api/push-subscriptions` with auth header token
- [ ] 7.4 Handle subscription update scenario: listen for `pushsubscriptionchange` event on SW registration → re-send new subscription to backend
- [ ] 7.5 On app unload/unmount: call `DELETE /api/push-subscriptions/:endpoint` if browser fires `beforeunload` or component unmounts

## 8. Frontend — Push Notification Handler (Service Worker)

- [ ] 8.1 Create `frontend/public/sw.js` (or let plugin generate it) with `push` event listener
- [ ] 8.2 In push listener: parse notification data JSON, extract title/body/icon/badge
- [ ] 8.3 Call `self.registration.showNotification(title, {body, icon, badge})` with parsed values
- [ ] 8.4 Handle `notificationclick` event: close notification, focus/open app window at specified URL (`data.url`)

## 9. Integration Testing

- [ ] 9.1 Test subscription flow end-to-end: login → permission prompt → accept → check DB has subscription record
- [ ] 9.2 Test manual push via curl/WASM: send test push to stored subscription endpoint manually to verify delivery
- [ ] 9.3 Test daily cron trigger manually: run cron function directly in Node REPL to simulate 20:00 execution
- [ ] 9.4 Verify no reminders sent when daily log exists for current MSK date
- [ ] 9.5 Verify reminders NOT sent when `pushNotificationsEnabled = false`
- [ ] 9.6 Verify duplicate prevention: cron runs twice same day → only one reminder per user

## 10. Production Readiness

- [ ] 10.1 Verify HTTPS requirement: production must serve over HTTPS (nginx config already handles SSL?)
- [ ] 10.2 Update `nginx.conf` to serve `/icons/icon-192.png` and `/icons/icon-512.png` with correct MIME type
- [ ] 10.3 Set `NODE_ENV=production` check so cron job doesn't run in development
- [ ] 10.4 Document VAPID key regeneration procedure in README (keys expire ~24h in some browsers)
- [ ] 10.5 Add monitoring: log count of reminders sent per day to application logs
- [ ] 10.6 Test installability: deploy to staging, visit on Chrome Android/Desktop, verify "Add to Home Screen" banner appears
