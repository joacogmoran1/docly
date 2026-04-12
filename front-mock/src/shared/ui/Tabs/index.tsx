import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

export interface TabItem {
  value: string;
  label: string;
  content?: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  contentClassName?: string;
}

export function Tabs({ tabs, value, onChange, className, contentClassName }: TabsProps) {
  const current = tabs.find((tab) => tab.value === value);

  return (
    <div className={cn("tabs-root", className)}>
      <div className="tabs-list">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={cn("tabs-trigger", value === tab.value && "active")}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={contentClassName}>{current?.content}</div>
    </div>
  );
}
