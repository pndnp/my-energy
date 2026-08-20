# Auth Token — Problem & Solution Log

## 🎯 Оригинальное решение (из спецификации)

В спецификации (`specs/auth/spec.md`) описан подход **только httpOnly cookie**:

> _"httpOnly cookie or Bearer token response"_

Теория была простой: браузер автоматически шлёт `Cookie: token=...` с каждым запросом к тому же домену. Никакого JavaScript-управления токеном, нет XSS через localStorage.

```ts
// Backend предполагалось:
res.cookie('token', jwtToken, {
  httpOnly: true,
  secure: false,        // для dev
  sameSite: 'strict',
  path: '/',
});

// frontend/src/lib/api.ts не нужно было хранить токен нигде
// Браузер сам добавлял Cookie к каждому запросу
```

---

## 🔥 Где это сломалось

### Проблема 1: Vite-прокси ломает Set-Cookie

Когда frontend запущен через Docker и подключается к backend через Vite dev-server:

```
Браузер → localhost:5173/api/auth/login      ← страница на этом origin
         ↓ (Vite proxy forward)
     backend-dev:3000/api/auth/login          ← бэкенд внутри Docker
```

Проблемы:

1. **Vite-прокси** меняет Origin с `localhost:5173` на `backend-dev:3000` (при `changeOrigin: true`)
2. **CORS middleware** требует `Origin === FRONTEND_URL` — если Origin подменился, CORS блокирует ответ
3. Даже при правильном Origin — cookie ставится с флагами `sameSite=strict`, что запрещает их передачу через прокси
4. Результат: cookie **не сохраняется** в браузере или теряется при следующем запросе

### Проблема 2: docker-compose.yml не мог задать переменные окружения из .env файла

Ранее `docker-compose.yml` хардкодил `DATABASE_URL` и `JWT_SECRET` в секции `environment:`. Это создавало рассинхрон между локальной разработкой и docker-окружением. Фикс — использовать `env_file: .env` вместо явного задания переменных.

### Проблема 3: Бэкенд не стучался в базу по адресу "postgres"

`.env.development` содержал `DATABASE_URL="postgresql://postgres:password@localhost:5432/energy_day"`, но внутри Docker-сети сервис называется `postgres`, а `localhost` указывает на сам контейнер backend, а не на соседний postgres. В результате сервер падал с ошибкой подключения к БД.

### Проблема 4: Маршрут /me не использовал middleware

При пересборке образа файл `backend/src/modules/auth/routes.ts` потерял `authMiddleware` — маршрут `/api/auth/me` стал всегда возвращать 401 без проверки токена. Исправлено добавлением middleware в routes.

### Проблема 5: Axios не знал префикса /api

В `frontend/src/lib/api.ts` стояло `baseURL: "/"`, поэтому запросы вида `api.post('/auth/login')` превращались в `POST /auth/login` без префикса `/api`. Vite-прокси настроен на `/api/*` — такие запросы получали 404. Исправлено установкой `baseURL: "/api"`.

### Проблема 6: Циклическая перезагрузка страницы /login

Это была самая коварная ошибка. Когда пользователь заходит на `/login`:

1. `AuthProvider` при монтировании делает `GET /api/auth/me` (в `useEffect`)
2. Токена нет → бэкенд отвечает **401 Unauthorized**
3. Axios interceptor видит 401 и делает `window.location.href = '/login'`
4. Страница перезагружается → шаг 1 повторяется бесконечно

Фикс: проверка `window.location.pathname !== '/login'` перед редиректом в интерсепторе:

```ts
if (error.response?.status === 401) {
  const currentPath = window.location.pathname;
  if (currentPath !== '/login' && currentPath !== '/register') {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}
```

---

## ✅ Найденное рабочее решение

Замена httpOnly-cookie на **localStorage + Bearer Authorization header**:

```ts
// frontend/src/lib/api.ts
const api = axios.create({ baseURL: "/api", withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// login.ts / register.ts — токен сохраняется одновременно в cookie и localStorage
// Cookie как fallback (на случай если Bearer недоступен)
res.cookie('token', token, {...});
localStorage.setItem('token', res.data.token);
```

Преимущества этого подхода:

- Не зависит от настроек cookie-domain/path/sameSite
- Работает независимо от прокси (Vite / Nginx / reverse-proxy)
- Предсказуемое поведение во всех окружениях (dev, docker, prod)

Недостатки:

- ⚠️ Уязвимость к XSS — любой скрипт на странице может прочитать токен
- Нужно вручную управлять очисткой (logout удаляет из localStorage)
- Нарушается безопасность httpOnly-cookie подхода

---

## 💡 Альтернативные варианты решения

### Вариант 1: Настроить Vite-прокси правильно для cookies

Можно настроить proxy так, чтобы он сохранял все заголовки ответа включая Set-Cookie:

```ts
// frontend/vite.config.ts
proxy: {
  '/api': {
    target: 'http://backend-dev:3000',
    changeOrigin: true,
    cookieDomainRewrite: { '*': 'localhost' },
    cookiePathRewrite: { '*': '' },
  },
}
```

Также нужно убедиться, что cookie ставятся с `domain: '.localhost'` или аналогичным.

Плюсы: возвращается к httpOnly-cookie подходу
Минусы: сложно отладить, работает только в dev, нестабильно в разных браузерах

### Вариант 2: Навсегда уйти на Bearer token без cookies вообще

Убрать `res.cookie()` полностью из backend:

```ts
// Только Bearer token
const payload = { userId: user.id };
const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

return res.status(200).json({ token, user: { id, email } });

// Интерфейс входа:
interface LoginResponse {
  token: string;
  user: { id: string; email: string };
}
```

Плюсы: чисто, нет дублирования логики, ясно откуда берётся токен
Минусы: полностью httpOnly cookie защита от CSRF (нужны другие механизмы защиты)

### Вариант 3: Использовать SameSite=Lax вместо Strict

Если cookies всё же хочется оставить основным механизмом авторизации:

```ts
res.cookie('token', token, {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'lax',    // вместо 'strict'
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 дней явно
});
```

`sameSite: 'lax'` позволяет cookies работать при кросс-доменных навигациях, включая редиректы.

Плюсы: ближе к оригинальному плану
Минусы: cookies всё равно могут теряться при проксировании в Docker

### Вариант 4: Единый домен — поднять backend на порту 80 вместе с frontend

Использовать nginx для раздачи обоих сервисов через один домен:

```nginx
server {
  listen 80;

  location / {
    root /usr/share/nginx/html;
    index index.html;
  }

  location /api/ {
    proxy_pass http://backend:3000/;
    proxy_set_header Host $host;
  }
}
```

В таком случае фронтенд и API живут на одном домене `http://localhost/`, cookie работают корректно без проблем с cross-origin.

Плюсы: cookie работают идеально
Минусы: сложнее конфигурация, не работает для локальной разработки где бэкэнд на другом порту

### Вариант 5: Refresh token rotation

Создать долгосрочный refresh token (хранится в БД, привязан к устройству) и короткоживущий access token. При истечении access токена — использовать refresh для получения нового.

Плюсы: безопаснее, можно отзывать отдельные сессии
Минусы: сложная архитектура, много новых эндпоинтов, больше состояний для тестирования

---

## 📝 Текущее состояние

| Компонент | Статус |
|-----------|--------|
| HTTP-only cookies | ❌ Отключены (fallback в коде, но не используются) |
| LocalStorage + Bearer | ✅ Основной механизм |
| Interceptor on 401 | ✅ С проверкой pathname чтобы избежать циклов |
| JWT_SECRET | ✅ Генерируется криптографически случайно |
| CORS настройка | ✅ changeOrigin: false + explicit origin header |
| Database connection | ✅ postgres имя сервиса в docker-compose |

---

## 🧭 Рекомендации

Для MVP текущего приложения — localStorage + Bearer OK, главное помнить:

1. Не хранить чувствительные данные в localStorage
2. Использовать HTTPS в production (тогда можно включать `secure: true`)
3. Делать logout на клиенте обязательным перед закрытием страницы
4. Ревьюить код на наличие потенциальных XSS уязвимостей — они станут критическими при наличии stored token

Для будущих итераций рекомендуется рассмотреть **Вариант 4** (единый домен через nginx) — это решит проблему cookies навсегда и вернёт к более безопасному httpOnly-cookie подходу.
