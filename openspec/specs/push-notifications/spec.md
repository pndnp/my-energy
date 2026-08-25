# Push Notifications Specification

## Purpose

Sends daily reminder push notifications to users who have not filled their daily log by 20:00 server time (Europe/Moscow). The system uses VAPID web-push protocol to deliver native-like notifications even when the app is closed.

## Requirements

### Requirement: Device Subscription

The system MUST allow user devices to register a push subscription and send it to the backend for storage.

#### Scenario: Successful subscription registration

- **WHEN** the frontend calls `POST /api/push-subscriptions` with a valid VAPID subscription object (endpoint, keys)
- **THEN** the server saves or updates the subscription linked to the authenticated user's ID in the `push_subscriptions` table and returns 201 Created

#### Scenario: Subscription already exists

- **WHEN** the frontend sends the same subscription endpoint that is already stored
- **THEN** the server updates the existing record with new auth/p256dh keys if changed and returns 200 OK

#### Scenario: Invalid subscription format

- **WHEN** the frontend sends malformed JSON or missing required fields (endpoint, p256dh, auth)
- **THEN** the server returns 400 Bad Request with an error message describing the required fields

### Requirement: Daily Reminder Logic

The system MUST check every day at 20:00 (server timezone Europe/Moscow) whether each user has a daily log entry for the current date, and send a reminder if not.

#### Scenario: Reminder sent when log missing

- **WHEN** cron job executes at 20:00 Moscow time
- **THEN** the server queries all users who do NOT have a daily log for today AND have `pushNotificationsEnabled = true`

#### Scenario: No duplicate reminders

- **WHEN** a cron run targets a subscription whose `lastReminderSent` field already equals today's MSK date
- **THEN** that subscription is skipped — each device receives only ONE reminder per calendar day (tracked via `lastReminderSent` on `push_subscriptions`, updated after every successful send)

#### Scenario: Reminder NOT sent when log exists

- **WHEN** a user has already created a daily log entry for today before 20:00
- **THEN** no reminder push notification is sent to that user

#### Scenario: Reminder skipped for disabled users

- **WHEN** a user has `pushNotificationsEnabled = false`
- **THEN** no reminder is sent regardless of daily log status

### Requirement: Push Notification Payload

The system MUST send push notifications with a structured payload containing title, body, and optional icon/badge URLs.

#### Scenario: Valid push payload structure

- **WHEN** the push notification is delivered to the device
- **THEN** the payload contains JSON with `title`, `body`, `icon`, `badge`, and `data` fields matching the template below:

```json
{
  "title": "Незаполненный дневник",
  "body": "Напоминание: заполните показатели за сегодня",
  "icon": "/icons/icon-192.png",
  "badge": "/icons/badge-72.png",
  "data": {
    "url": "/dashboard",
    "timestamp": 1723987200000
  }
}
```

#### Scenario: Notification appears on locked screen

- **WHEN** the user device is locked or the app is in background
- **THEN** the native push notification banner/alert appears with the configured title and body text

### Requirement: Unsubscription Handling

The system MUST handle browser-initiated unsubscriptions and failed pushes automatically.

#### Scenario: Expired subscription cleanup

- **WHEN** `web-push.sendNotification()` returns HTTP 410 Gone (subscription expired)
- **THEN** the server deletes the subscription from the database immediately without sending further attempts

#### Scenario: User clicks dismiss button

- **WHEN** the user receives a push notification and swipes it away or taps outside
- **THEN** no action is taken — the subscription remains active for next day's check

#### Scenario: User revokes notification permission in browser

- **WHEN** the Service Worker fires `pushsubscriptionchange` with `event.new === null` (permission revoked or subscription invalidated by the platform)
- **THEN** the frontend calls `DELETE /api/push-subscriptions/:endpoint` for the previous endpoint, and no further reminders are sent to that device

#### Scenario: Subscription keys rotated by browser

- **WHEN** the Service Worker fires `pushsubscriptionchange` with a non-null `event.new` (same endpoint but new auth/p256dh keys)
- **THEN** the frontend re-sends the new subscription via `POST /api/push-subscriptions`, and the server upserts it so subsequent pushes use the current keys

### Requirement: Cron Job Scheduling

The system MUST schedule the daily check using a timezone-aware cron expression via an explicit `timezone: 'Europe/Moscow'` option passed to `node-cron.schedule()` (independent of the process/host `TZ`).

#### Scenario: Schedule set to 20:00 Moscow time

- **WHEN** the backend starts the cron module (production only)
- **THEN** the job executes once daily at exactly 20:00 MSK (UTC+3), equivalent to 17:00 UTC, computed by node-cron from its `timezone` option without any host/container `TZ` setting

#### Scenario: Cron runs only in production

- **WHEN** the backend process starts with `NODE_ENV !== 'production'` (e.g., dev container)
- **THEN** the cron job is NOT scheduled — reminder dispatching happens exclusively from the production deployment, so local development never sends real pushes

#### Scenario: MSK date computed without host timezone

- **WHEN** the cron run determines "today" for log matching and `lastReminderSent` comparison
- **THEN** it uses the value computed at startup from `Intl.DateTimeFormat({ timeZone: 'Europe/Moscow' })`, independent of the container/host `TZ` and of the user's client timezone
