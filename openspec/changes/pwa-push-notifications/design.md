# Design: PWA + Push Notifications

## Context

The application currently runs as a standard web app served via Vite dev server and Nginx production build. It has React 19, Tailwind CSS v4, shadcn/ui components, and TanStack Query on the frontend. The backend is Express.js with Prisma ORM connected to PostgreSQL. No service worker, no manifest, and no push infrastructure exists yet.

The user's requirement is simple: convert the app to an installable PWA and add daily push reminders at exactly 20:00 Moscow time (server-side) for users who haven't filled their daily log. Future work will include per-user notification toggles; the database schema should be ready for it now.

## Goals / Non-Goals

**Goals:**
- Make the app installable (manifest.json, icons, Service Worker) following Progressive Web App standards
- Cache static assets (HTML, CSS, JS, fonts) for offline access
- Send daily reminder push notifications at 20:00 MSK via VAPID/web-push protocol
- Store device subscriptions in `push_subscriptions` table linked to `user_id`
- Add `pushNotificationsEnabled` Boolean field to `User` model (default `true`) to future-proof user settings

**Non-Goals:**
- Per-user timezone selection — all cron scheduling passes an explicit `{ timezone: 'Europe/Moscow' }` to `node-cron` in code (no host/container TZ dependency)
- iOS/Apple Push Notification Service (APNs) support — only Web Push (Chrome/Firefox/Android/Desktop)
- Rich notification actions (reply buttons, inline input) — simple title/body notifications only
- Analytics/metrics for push delivery rates — basic success/failure logging only
- Background sync or periodic sync — not required for MVP

## Decisions

### 1. PWA Plugin: @vitejs/plugin-pwa instead of manual Service Worker

**Decision:** Use `@vitejs/plugin-pwa` (workbox-based) to auto-generate and register the Service Worker.

```bash
npm i @vitejs/plugin-pwa workbox-precaching workbox-routing workbox-strategies
```

**Rationale:**
- Manual SW requires writing fetch handlers, cache strategies, versioning logic from scratch
- The plugin handles precaching, runtime caching, update detection, and registration automatically
- Compatible with Vite's build pipeline — outputs `sw.js` and injects `<link rel="manifest">` into `index.html`
- Configurable via Vite config object (no file changes required in `public/` except icons)

**Alternatives considered:**
- **Manual Service Worker + workbox-cli** — more control but doubles maintenance burden
- **PWA Builder / Generate Service Worker tools** — less flexible, harder to customize

### 2. Push Protocol: Standard VAPID / Web Push API

**Decision:** Use the `web-push` npm package for backend push delivery. Users register their browser's PushSubscription endpoint → stored in DB → cron sends push using VAPID keys.

```typescript
import webpush from 'web-push';
webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);
await webpush.sendNotification(subscription, payload);
```

**Rationale:**
- `web-push` is the de-facto standard Node.js library for Web Push
- Supports VAPID authentication automatically (required by spec since 2018)
- Handles subscription expiration detection (HTTP 410 Gone)
- Works with Chrome, Firefox, Edge, Android WebView, desktop Chrome

**Alternatives considered:**
- **Firebase Cloud Messaging (FCM)** — free push service, but adds Google dependency and heavier SDK
- **Custom WebSocket long-polling** — complex, battery-draining, doesn't work offline
- **Server-Sent Events (SSE)** — one-way only, requires persistent connection

### 3. Scheduling: node-cron with explicit timezone option in code

**Decision:** Use `node-cron` with an explicit `timezone: 'Europe/Moscow'` option in code (no `TZ` env var). "Today MSK" is computed once at startup via `Intl.DateTimeFormat(undefined, { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())` — no third-party tz library.

```typescript
import cron from 'node-cron';
cron.schedule('0 20 * * *', async () => {
  // Check logs, send reminders
}, { name: 'daily-reminder', timezone: 'Europe/Moscow' });
```
(`name` is optional but recommended by node-cron docs; available `TaskOptions`: `timezone`, `name`, `noOverlap`, `maxExecutions`, …)

**Rationale:**
- `node-cron` computes fire times itself via the `timezone` option (backed by Intl) — a process-wide `TZ` would be dead weight for scheduling; it only affects incidental `toString()` log formatting and behaves inconsistently across Node versions
- `Intl`-based date computation is deterministic per spec, whereas `new Date().toLocaleString('en-US', { timeZone })` reparsing (old plan) breaks if locale data shifts — avoid
- No external scheduler needed (no Redis, no Celery, no Kubernetes CronJob)

**Alternatives considered:**
- **`setInterval` every hour checking clock** — wasteful, hard to schedule precisely at :00
- **Cron daemon on host machine** — requires modifying docker-compose.yml volume mounts
- **BullMQ/Redis job queue** — overkill for single daily run

### 4. Subscription Storage: Dedicated `PushSubscription` Prisma Model

**Decision:** Create a new table `push_subscriptions` with fields: `id`, `userId`, `endpoint` (unique), `p256dhKey`, `authSecret`. Each user can have multiple subscriptions (desktop + mobile).

```prisma
model PushSubscription {
  id         String   @id @default(cuid())
  userId     String
  endpoint   String   @unique
  p256dhKey  String
  authSecret String
  lastReminderSent DateTime? // MSK date of the last reminder pushed; null = never sent
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([userId])
}
```

**Rationale:**
- Multiple devices per user is common (phone + laptop) — store each separately
- `endpoint` is globally unique across all users (browser-generated URI) — enforce uniqueness
- `@@index([userId])` for fast lookup during cron scan
- `lastReminderSent` on the subscription itself (not on `daily_logs`) keeps the dedupe key local: every push attempt targets a subscription, and the "already reminded today" check must happen per-device anyway (a user with phone+laptop should get one notification on each device, not two on the same one)

**Alternatives considered:**
- **Embed subscriptions in User JSON field** — loses query performance, breaks migration paths
- **Store in separate non-Prisma collection** — inconsistent data layer

### 5. User Toggle Field: `pushNotificationsEnabled` on User model (future-ready)

**Decision:** Add `Boolean @default(true)` to `User` model immediately. Backend filters by this field in cron; frontend hides toggle UI until Phase X.

```prisma
model User {
  email                String   @unique
  hash                 String
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  pushNotificationsEnabled Boolean @default(true) // For future toggle UI
}
```

**Rationale:**
- One-time DB migration now vs. emergency migration later when feature goes live
- Default `true` maintains current behavior (everyone gets reminders)
- Frontend simply ignores the field until permissions/settings page is built

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Browser permission revocation** — users can disable notifications in OS/browser settings, causing silent failures | Handle `web-push` HTTP 410 responses; delete expired subscriptions on next login attempt or via `pushsubscriptionchange` event |
| **Mobile Safari/APNs not supported** — iOS Safari does not implement Web Push spec | Limit expectations to Chrome/Android/Desktop for MVP; iOS native push is a separate Phase N effort |
| **Cron double-fire on container restart** | The `'0 20 * * *'` window never overlaps an actual restart (job runs once per day, ~seconds of work), so this cannot happen in practice. Still make the run idempotent (in-memory "sent for today MSK date" guard): if it ever did double-run within the same calendar day, re-sending is at worst a duplicate reminder — acceptable, no extra state needed. A `lastReminderSent` column on `daily_logs` would NOT solve this (the row doesn't exist when the log is unfilled) and adds no value. |
| **VAPID key leak** — private key from `.env` leaked into git/logs, allowing third parties to send pushes on behalf of the app | VAPID keys do NOT expire and need no scheduled rotation (generate the pair once, per web-push docs). Regenerate only upon compromise: new pair in `.env` + new public key in frontend; after rotation old subscriptions may fail validation until users re-subscribe. The per-request JWT (≤24h lifetime) is built automatically by the library on every push — no manual handling. |
| **Large subscription tables growth** — stale subscriptions accumulate over years | Monthly cleanup job deletes subscriptions inactive > 90 days (deferred to Phase X) |
| **Timezone mismatch between containers** — frontend calculates dates locally, cron uses its own tz computation | Document clearly: "All times are Moscow time." Backend computes the MSK date via `Intl` (deterministic, no host TZ); frontend displays dates as returned by the server. No per-user TZ setting initially. |

## Migration Plan

1. **Database migration**: `npx prisma migrate dev --name add_push_infrastructure`
   - Creates `push_subscriptions` table (incl. `lastReminderSent DateTime?`)
   - Adds `pushNotificationsEnabled` column to `users`
   - Run before any code changes — zero downtime

2. **Backend changes** (non-breaking):
   - Install `web-push`, `node-cron`
   - Generate VAPID keys once: `npx web-push generate-vapid-keys` → save to `.env`; pass the subject string (`mailto:admin@example.com`) as first arg of `setVapidDetails()`
   - Add endpoints: `POST /api/push-subscriptions`, `DELETE /api/push-subscriptions/:endpoint`
   - Add cron job module (`src/modules/push/cron.ts`), guarded by `NODE_ENV === 'production'`

3. **Docker configuration**:
   ```yaml
   backend:
     env_file: [.env]          # VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY from .env
   ```
   No `TZ` needed here — `node-cron.schedule()` receives `{ timezone: 'Europe/Moscow' }` explicitly in code (the cron library computes fire times via Intl; a process-wide `TZ` only affects log timestamps and would drift if the host clock is off).

4. **Frontend changes** (non-breaking):
   - Install `@vitejs/plugin-pwa`
   - Configure Vite plugin in `vite.config.ts`
   - Add icons to `public/icons/`
   - On successful auth: request `Notification.requestPermission()` → if granted, POST subscription to `/api/push-subscriptions`

5. **VPS / production rollout** (order matters — Web Push requires HTTPS end-to-end):
   - Domain with DNS A record pointing at the server
   - TLS termination in front of nginx (Let's Encrypt / Caddy) + `listen 443 ssl`; redirect 80 → 443
   - nginx headers: `no-cache` for `/sw.js` and `/manifest.json`, long cache for hashed build assets
   - Firewall: open 80 (ACME) and 443 only; keep postgres bound to 127.0.0.1
   - Deploy backend first (new endpoints + cron start), then frontend (SW activates on reload)
   - Monitor logs for `sendNotification` errors → clean up 410 Gone subs

6. **Rollback**: Safe — dropping Prisma models or removing env vars doesn't affect existing data.

## Decisions Resolved from Explore Session

### 1. Notification click target: deep-link to `/dashboard`

**Decision:** Push notification payload includes `data.url = "/dashboard"` — clicking notification navigates directly to the dashboard page where today's daily log form is available.

**Rationale:** Reduces friction between reminder and action. User doesn't need to navigate manually — one tap opens the form ready to fill.

### 2. MSK date computation for cron check

**Decision:** Compute "today in Moscow timezone" once at process startup via `Intl.DateTimeFormat(undefined, { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())`. All comparisons (cron check, daily log matching, `lastReminderSent` tracking) use this same computed value. No third-party tz library.

**Rationale:** Single source of truth for "today" date prevents edge cases where local UTC time differs from Moscow time across midnight boundary. `Intl.formatToParts` is deterministic and part of Node core; the old `new Date(toLocaleString(...))` reparsing trick breaks if locale data shifts. The cron fire time itself comes from `node-cron`'s own `timezone` option — consistent by construction. No per-user timezone setting needed.

### 3. Rate limiting on subscription endpoints: not needed for MVP

**Decision:** Skip rate limiting on `POST /api/push-subscriptions` and `DELETE /api/push-subscriptions/:endpoint` for now.

**Rationale:** Personal app with single user — no risk of flooding attacks. Can add `express-rate-limit` later if the app becomes publicly hosted.

### 4. Push batching: not possible with standard Web Push API

**Decision:** Send individual `web-push.sendNotification()` calls per subscription endpoint. No batching layer.

**Rationale:** The Web Push protocol does not support batch requests — each browser vendor (FCM for Android, Mozilla Push for Firefox, direct APNS for Safari) requires a separate HTTPS POST. For MVP, average user has 0-2 subscriptions, so 0-2 calls per cron run is negligible (~50ms each).

## Open Questions

<!-- None remaining. All decisions resolved in "Decisions Resolved from Explore Session" above. -->
