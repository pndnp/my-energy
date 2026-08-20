import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

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

  useEffect(() => {
    // Проверяем авторизацию через API (cookie уже отправляются автоматически с withCredentials: true)
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await api.post("/auth/login", { email, password });
    const token = res.data.token;
    if (token) {
      saveTokenToStorage(token);
    }
    setUser(res.data.user);
  };

  const register = async (email: string, password: string): Promise<void> => {
    const res = await api.post("/auth/register", { email, password });
    const token = res.data.token;
    if (token) {
      saveTokenToStorage(token);
    }
    setUser(res.data.user);
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
