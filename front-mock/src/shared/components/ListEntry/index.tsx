import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

interface ListEntryProps extends PropsWithChildren {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
  mainClassName?: string;
  actionClassName?: string;
  titleClassName?: string;
}

export function ListEntry({
  title,
  action,
  children,
  className,
  mainClassName,
  actionClassName,
  titleClassName,
}: ListEntryProps) {
  return (
    <div className={cn("slot-entry", className)}>
      <div className={cn("slot-entry-main", mainClassName)}>
        <strong className={titleClassName}>{title}</strong>
        {children}
      </div>
      {action ? (
        <div className={cn("slot-entry-actions", actionClassName)}>{action}</div>
      ) : null}
    </div>
  );
}
