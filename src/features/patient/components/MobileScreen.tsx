import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type MobileScreenProps = {
  title?: string;
  subtitle?: string;
  backTo?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function MobileScreen({
  title,
  subtitle,
  backTo,
  children,
  footer,
  className,
}: MobileScreenProps) {
  const navigate = useNavigate();

  return (
    <section
      className={cn(
        "flex min-h-full w-full flex-col rounded-2xl border border-slate-200 bg-white shadow-soft",
        className,
      )}
    >
      {(title || subtitle || backTo) && (
        <header className="space-y-3 border-b border-slate-100 px-5 pb-4 pt-5">
          {backTo ? (
            <Button
              aria-label="ย้อนกลับ"
              className="-ml-2 h-9 w-9 rounded-full"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(backTo)}
              size="icon"
              variant="ghost"
            />
          ) : null}
          <div className="space-y-1">
            {title ? <h1 className="text-xl font-semibold text-slate-950">{title}</h1> : null}
            {subtitle ? <p className="text-sm leading-6 text-slate-500">{subtitle}</p> : null}
          </div>
        </header>
      )}
      <div className="flex-1 space-y-5 px-5 py-5">{children}</div>
      {footer ? <footer className="border-t border-slate-100 px-5 py-4">{footer}</footer> : null}
    </section>
  );
}
