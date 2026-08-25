import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { subscribeToPush } from "../lib/push";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pushRequestedRef = useRef(false);
  const silentRestoreRef = useRef(false);

  // После успешного входа просим разрешение на push (браузерный диалог)
  // и сохраняем подписку на бэкенд (один раз за сессию)
  const requestPushAfterLogin = useCallback((): void => {
    if (pushRequestedRef.current) return;
    pushRequestedRef.current = true;
    setTimeout(() => {
      void subscribeToPush().catch(() => {});
    }, 0);
  }, []);

  // Тихое восстановление подписки при возврате со старым куки-входом:
  // без браузерного диалога — только если пользователь уже разрешал уведомления.
  // Вызывается один раз на жизненный цикл компонента: отдельный guard-реф
  // защищает от повторного входа в React.StrictMode
  // и не блокирует явный запрос разрешения после повторного логина.
  const restorePushSilently = useCallback((): void => {
    if (silentRestoreRef.current) return;
    silentRestoreRef.current = true;
    setTimeout(() => {
      void subscribeToPush({ silent: true }).catch(() => {});
    }, 0);
  }, []);

  useEffect(() => {
    // Проверяем авторизацию через API (httpOnly cookie отправляются
    // браузером автоматически благодаря withCredentials: true в lib/api)
    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data);
        // Восстановление сессии — тихая перерегистрация подписки (без диалога),
        // подстраховывает случай, когда браузер потерял/завёл подписку,
        // а пользователь просто перезагрузил страницу.
        restorePushSilently();
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [restorePushSilently]);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await api.post("/auth/login", { email, password });
    setUser(res.data.user);
    requestPushAfterLogin();
  };

  const register = async (email: string, password: string): Promise<void> => {
    const res = await api.post("/auth/register", { email, password });
    setUser(res.data.user);
    requestPushAfterLogin();
  };

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
