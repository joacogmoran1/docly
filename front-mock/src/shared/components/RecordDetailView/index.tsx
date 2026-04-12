import { Card } from "@/shared/ui/Card";
import { formatDateTime } from "@/shared/utils/date";

interface RecordDetailViewProps {
  title: string;
  timestamp: string;
  body: string;
}

export function RecordDetailView({
  title,
  timestamp,
  body,
}: RecordDetailViewProps) {
  return (
    <Card title={title} description={formatDateTime(timestamp)} className="panel-separated">
      <p className="meta">{body}</p>
    </Card>
  );
}
