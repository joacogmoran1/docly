import { type PropsWithChildren, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Sidebar, type SidebarItem } from "@/shared/components/Sidebar";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/utils/cn";

interface AppShellProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  items: SidebarItem[];
}

export function AppShell({
  title,
  subtitle,
  items,
  children,
}: AppShellProps) {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className={cn("app-shell", mobileNavOpen && "app-shell-nav-open")}>
      <div
        className="app-shell-sidebar-backdrop"
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      <Sidebar
        title={title}
        subtitle={subtitle}
        items={items}
        className="app-shell-sidebar"
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <main className="content-shell">
        <header className="app-shell-mobile-header">
          <Button
            variant="ghost"
            className="app-shell-menu-button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </Button>

          <div className="stack-sm">
            <strong>{title}</strong>
            <span className="meta">{subtitle}</span>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
