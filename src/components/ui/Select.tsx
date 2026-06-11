import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: SelectOption[];
};

export function Select({ label, options, className, id, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <label className="block space-y-1.5" htmlFor={selectId}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <select
        id={selectId}
        className={cn(
          "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
