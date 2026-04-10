import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/ui/Button";

export interface SidebarItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

interface SidebarProps {
  title: string;
  subtitle: string;
  items: SidebarItem[];
  className?: string;
  onNavigate?: () => void;
  onCloseMobile?: () => void;
}

export function Sidebar({
  title,
  subtitle,
  items,
  className,
  onNavigate,
  onCloseMobile,
}: SidebarProps) {
  return (
    <aside className={cn("sidebar", className)}>
      <div className="sidebar-header">
        <div className="brand-lockup">
          <div className="brand-mark">D</div>
          <div className="stack-sm">
            <strong>{title}</strong>
            <span className="meta">{subtitle}</span>
          </div>
        </div>

        {onCloseMobile ? (
          <Button
            variant="ghost"
            className="sidebar-close-button"
            onClick={onCloseMobile}
            aria-label="Cerrar menu"
          >
            <X size={18} />
          </Button>
        ) : null}
      </div>

      <nav className="nav-list">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/professional" || item.to === "/patient"}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              onClick={onNavigate}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
