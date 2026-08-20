import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Главная", icon: "⚡" },
  { to: "/history", label: "История", icon: "📅" },
  { to: "/analytics", label: "Аналитика", icon: "📊" },
  { to: "/ai-insights", label: "AI Наблюдения", icon: "🔮" },
];

interface LayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: LayoutProps) {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-1">
            <div className="flex gap-1 sm:hidden">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to}>
                  {({ isActive }) => (
                    <Button variant="ghost" size="icon-sm" className={cn(isActive && "bg-muted")}>
                      {item.icon}
                    </Button>
                  )}
                </NavLink>
              ))}
            </div>
            <div className="hidden sm:flex gap-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === "/dashboard"}>
                  {({ isActive }) => (
                    <Button variant="ghost" size="sm" className={cn(isActive && "bg-muted")}>
                      <span className="mr-1">{item.icon}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </Button>
                  )}
                </NavLink>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              Выход
            </Button>
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
