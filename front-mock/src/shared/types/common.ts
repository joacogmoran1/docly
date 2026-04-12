export interface SelectOption {
  label: string;
  value: string;
}

export interface SummaryMetric {
  label: string;
  value: string;
  trend?: string;
  tone?: "default" | "success" | "warning" | "critical";
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "record" | "appointment" | "prescription" | "study" | "audit";
}
