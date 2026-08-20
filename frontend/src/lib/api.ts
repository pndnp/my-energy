import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Добавляем Bearer token из localStorage как дополнение к httpOnly cookie
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // При 401 — очищаем токен и перенаправляем на логин,
    // НО только если мы УЖЕ не на странице логина/регистрации
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      localStorage.removeItem("token");
      // Не перенаправляем, если пользователь уже на /login или /register
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
