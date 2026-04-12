import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/Button";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  showBackButton?: boolean;
  backLabel?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  showBackButton = false,
  backLabel = "Volver",
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="page-header">
      <div className="page-header-main stack-sm">
        {showBackButton ? (
          <div>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
              {backLabel}
            </Button>
          </div>
        ) : null}
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="title-xl">{title}</h1>
        {description ? <p className="meta">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}
