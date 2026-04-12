import type { PropsWithChildren, ReactNode } from "react";

interface CardProps extends PropsWithChildren {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function Card({
  title,
  description,
  action,
  className,
  children,
}: CardProps) {
  return (
    <section className={`panel stack-md ${className ?? ""}`.trim()}>
      {(title || description || action) && (
        <div className="row-between">
          <div className="stack-sm">
            {title ? <h3 className="title-md">{title}</h3> : null}
            {description ? <p className="meta">{description}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
