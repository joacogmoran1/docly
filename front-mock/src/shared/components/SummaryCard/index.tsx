import type { SummaryMetric } from "@/shared/types/common";
import { Badge } from "@/shared/ui/Badge";

interface SummaryCardProps {
  metric: SummaryMetric;
}

export function SummaryCard({ metric }: SummaryCardProps) {
  const variant =
    metric.tone === "success"
      ? "success"
      : metric.tone === "warning"
        ? "warning"
        : metric.tone === "critical"
          ? "danger"
          : "info";

  return (
    <article className="metric-card stack-sm">
      <span className="meta">{metric.label}</span>
      <span className="summary-card-value">{metric.value}</span>
      {metric.trend ? <Badge variant={variant}>{metric.trend}</Badge> : null}
    </article>
  );
}
