# Proposal: PWA + Push Notifications — «Энергия дня»

## Why

Приложение работает как обычный сайт, но не может работать автономно или напоминать пользователю о заполнении дневника. Пользователи теряют контекст при закрытии вкладки, а нет регулярных напоминаний — падают показатели заполнения дневников (daily log fill rate). Необходимо превратить приложение в Progressive Web App (PWA) с push-уведомлениями для ежедневного напоминания в 20:00.

## What Changes

- **PWA**: Приложение становится installable на устройства (Chrome/Android/Desktop), кэшируется offline через Service Worker
- **Push Notifications**: Сервер отправляет push-напоминание ровно в 20:00 серверного времени (Europe/Moscow), если пользователь не заполнил дневник за день
- **Подписка на уведомления**: Браузер отправляет VAPID-подписку на бэкенд, бэкенд хранит её и отправляет пуш через web-push
- **Переключатель уведомлений (TODO)**: В будущем у пользователя будет настройка "присылать ли пуш" — сейчас закладываем поле в базу, но функционал отключения временно скрыт

## Capabilities

### New Capabilities

- `pwa-installable`: Приложение устанавливается как нативное (manifest.json, icons, Service Worker cache-strategy)
- `push-notifications`: Подписка устройств → хранение подписок на бэкенде → cron-запрос в 20:00 → отправка push через VAPID/web-push API

### Modified Capabilities

- `user` (из `auth`): Добавляем поле `pushNotificationsEnabled` (Boolean @default(true)) для будущей настройки уведомлений без миграции данных позже

## Impact

- **Frontend**: manifest.json, Service Worker (@vitejs/plugin-pwa), запрос разрешения Notification API, отправка подписки на POST /api/subscriptions
- **Backend**: Новая таблица `PushSubscription` в Prisma, VAPID ключи, endpoint POST /api/subscriptions + DELETE /api/subscriptions/:endpoint, node-cron планировщик, webhook обработчик ошибок推送失败
- **Database**: Таблица `push_subscriptions`, поле `pushNotificationsEnabled` в таблице `users`
- **Dependencies**: web-push, @vitejs/plugin-pwa, node-cron
- **Docker Compose**: Добавить TZ=Europe/Moscow в env backend-dev и backend
