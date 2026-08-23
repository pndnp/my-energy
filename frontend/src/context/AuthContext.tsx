import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
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

const TOKEN_KEY = "token";

function saveTokenToStorage(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeTokenFromStorage(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pushRequestedRef = useRef(false);

  useEffect(() => {
    // Проверяем авторизацию через API (cookie уже отправляются автоматически с withCredentials: true)
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // После успешного входа просим разрешение на push и сохраняем подписку на бэкенд (один раз за сессию)
  const requestPushAfterLogin = (): void => {
    if (pushRequestedRef.current) return;
    pushRequestedRef.current = true;
    setTimeout(() => {
      void subscribeToPush().catch(() => {});
    }, 0);
  };

  const login = async (email: string, password: string): Promise<void> => {
    const res = await api.post("/auth/login", { email, password });
    const token = res.data.token;
    if (token) {
      saveTokenToStorage(token);
    }
    setUser(res.data.user);
    requestPushAfterLogin();
  };

  const register = async (email: string, password: string): Promise<void> => {
    const res = await api.post("/auth/register", { email, password });
    const token = res.data.token;
    if (token) {
      saveTokenToStorage(token);
    }
    setUser(res.data.user);
    requestPushAfterLogin();
  };

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    removeTokenFromStorage();
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
