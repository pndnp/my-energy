## 1. Setup

- [x] 1.1 Добавить shadcn-компонент `alert`: `cd frontend && npx shadcn@4.18.0 add alert --yes`; обработать возможную папку-баг `@` (см. AGENTS.md)

## 2. Core Implementation

- [x] 2.1 Создать хелпер `frontend/src/lib/api-error.ts`: функция `getApiErrorMessage(error: unknown): string` — извлекает `error.response?.data?.error?.code` из axios-ошибки и возвращает русский текст по мэппингу кодов: `UNAUTHORIZED` → «Неверный email или пароль», `CONFLICT` → «Пользователь с таким email уже существует», `VALIDATION_ERROR` → «Проверьте правильность введённых данных», `INTERNAL_ERROR` → «Внутренняя ошибка сервера, попробуйте позже»; нет ответа/неизвестный код → «Что-то пошло не так, попробуйте позже»
- [x] 2.2 LoginPage: `onSubmit` оборачивает `login()` в try/catch, при ошибке сохраняет текст в `formError` state, при старте отправки очищает; под формой рендерит `<Alert variant="destructive">` с сообщением (только если `formError`)
- [x] 2.3 RegisterPage: то же самое для `register()` (401/409/400/500 + network fallback)
- [x] 2.4 Русские сообщения client-side валидации в zod-схемах: `email` → «Введите корректный email», `min(8)` → «Пароль должен содержать не менее 8 символов», refine (несовпадение паролей) → «Пароли не совпадают» (LoginPage + RegisterPage)

## 3. Verification

- [x] 3.1 `tsc -b` (frontend) и линтер — чисто
- [x] 3.2 Live-проверка в dev (docker `--profile dev`, http://localhost:5173): (a) логин с неверным паролем → «Неверный email или пароль»; (b) логин с несуществующим email → «Неверный email или пароль»; (c) регистрация с занятым email → «Пользователь с таким email уже существует»; (d) повторная отправка очищает старую ошибку; (e) успешный логин → переход на /dashboard без ошибок
