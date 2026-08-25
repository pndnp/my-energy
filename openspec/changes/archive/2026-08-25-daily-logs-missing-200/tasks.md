# Tasks: daily-logs-missing-200

## 1. Backend

- [x] 1.1 `GET /api/daily-logs/:date` без записи возвращает `200 OK` с телом `null` вместо `404` (`backend/src/modules/daily-logs/routes.controller.ts` → `getDailyLog`). Проверить, что `PUT` по отсутствующей дате по-прежнему возвращает `404`.

## 2. Frontend

- [x] 2.1 Убрать ручной перехват 404 в `TodayEnergy` (`frontend/src/pages/DashboardPage.tsx`, try/catch в `queryFn`) — хук уже типизирован `DailyLog | null`, `null` из 200-ответа придёт в `res.data` напрямую.

## 3. Проверка

- [x] 3.1 `tsc --noEmit` (backend) и `tsc -b` (frontend) — без ошибок.
- [x] 3.2 Live-проверка dev-окружения: `curl` GET на свободную дату → `200` + `null`; GET на заполненную дату → `200` + объект; PUT на свободную дату → `404`.
- [x] 3.3 UI-проверка Dashboard: страница «Энергия дня» для пустого дня рендерится без ошибок (пустая сетка метрик).
