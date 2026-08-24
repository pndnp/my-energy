import axios from "axios";

// Авторизация только по httpOnly-cookie: браузер сам отправляет их с каждым
// запросом к тому же origin (dev — через vite-proxy, prod — через nginx).
// Токен в localStorage/JS не хранится (см. design.md §1 mvp-application).
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // При 401 — редирект на логин (cookie httpOnly, JS её читать/чистить не может),
    // НО только если мы УЖЕ не на странице логина/регистрации
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
