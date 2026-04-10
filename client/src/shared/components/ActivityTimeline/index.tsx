import type { ActivityItem } from "@/shared/types/common";
import { formatDateTime } from "@/shared/utils/date";

interface ActivityTimelineProps {
  items: ActivityItem[];
}

export function ActivityTimeline({ items }: ActivityTimelineProps) {
  return (
    <div className="timeline">
      {items.map((item) => (
        <div key={item.id} className="timeline-item">
          <div className="timeline-dot" />
          <div className="stack-sm">
            <strong>{item.title}</strong>
            <p className="meta">{item.description}</p>
            <span className="helper-text">{formatDateTime(item.timestamp)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
