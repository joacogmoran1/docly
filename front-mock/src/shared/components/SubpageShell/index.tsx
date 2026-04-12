import type { PropsWithChildren, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/ui/Button";

interface SubpageShellProps extends PropsWithChildren {
  onBack: () => void;
  backLabel?: string;
  headerAction?: ReactNode;
  className?: string;
}

export function SubpageShell({
  children,
  onBack,
  backLabel = "Volver",
  headerAction,
  className,
}: SubpageShellProps) {
  return (
    <div className={cn("page-stack", className)}>
      <div className="subpage-header">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={16} />
          {backLabel}
        </Button>
        {headerAction}
      </div>

      {children}
    </div>
  );
}
