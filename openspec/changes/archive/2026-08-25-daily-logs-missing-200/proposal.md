# Proposal: daily-logs-missing-200

## Why

`GET /api/daily-logs/:date` возвращает 404 Not Found, когда лог за дату отсутствует. Отсутствие записи — штатное состояние (пользователь ещё не заполнял день), а не ошибка. Клиентам приходится перехватывать 404 и конвертировать его в `null` (сделано в `DashboardPage`), что раздувает код и превращает нормальный ответ в «ошибку» с точки зрения HTTP-семантики, логики и ретраев.

## What Changes

- **BREAKING** (для внешних потребителей API): `GET /api/daily-logs/:date` при отсутствии записи возвращает `200 OK` с телом `null` вместо `404 Not Found`.
- `PUT /api/daily-logs/:date` при отсутствии записи НЕ меняется — остаётся `404 Not Found` (semantics: нельзя обновить несуществующее; создание — через `POST`).
- Frontend: убрать ручной перехват 404 в `DashboardPage` (query-хук уже типизирован как `DailyLog | null`).

## Capabilities

### Modified Capabilities

- `daily-logs`: requirement «Get daily log by date» — сценарий «No log for date» меняется с `404 Not Found` на `200 OK` с `null`.

## Impact

- `backend/src/modules/daily-logs/routes.controller.ts` — `getDailyLog`: вместо 404 вернуть 200 с `null`.
- `frontend/src/pages/DashboardPage.tsx` — убрать try/catch-перехват 404 (линия 19–27).
- API-контракт: любое стороннее потребление `GET /api/daily-logs/:date` ожидает 200/null, а не 404.
