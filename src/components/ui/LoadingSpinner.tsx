import { cn } from "@/lib/cn";

type LoadingSpinnerProps = {
  label?: string;
  className?: string;
};

export function LoadingSpinner({ label = "Loading", className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center gap-3 text-sm text-slate-600", className)}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-700" />
      <span>{label}</span>
    </div>
  );
}
