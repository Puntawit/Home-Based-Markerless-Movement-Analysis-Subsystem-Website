import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type TabItem<T extends string> = {
  label: string;
  value: T;
  content: ReactNode;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function Tabs<T extends string>({ items, value, onChange }: TabsProps<T>) {
  const activeItem = items.find((item) => item.value === value);

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition",
              item.value === value
                ? "bg-cyan-700 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div>{activeItem?.content}</div>
    </div>
  );
}
