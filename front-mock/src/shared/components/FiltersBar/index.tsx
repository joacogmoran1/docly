import type { PropsWithChildren } from "react";

interface FiltersBarProps extends PropsWithChildren {
  title?: string;
}

export function FiltersBar({ title, children }: FiltersBarProps) {
  return (
    <section className="panel stack-md">
      <div className="row-between">
        <strong>{title ?? "Filtros"}</strong>
      </div>
      <div className="row-wrap">{children}</div>
    </section>
  );
}
