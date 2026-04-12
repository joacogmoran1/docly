import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  return <span className={cn("badge", `badge-${variant}`)}>{children}</span>;
}
