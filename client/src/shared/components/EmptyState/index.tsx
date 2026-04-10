import type { ReactNode } from "react";
import { Button } from "@/shared/ui/Button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon}
      <h3 className="title-md">{title}</h3>
      <p className="meta">{description}</p>
      {actionLabel ? (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
