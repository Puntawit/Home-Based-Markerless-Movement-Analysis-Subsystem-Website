import { cn } from "@/lib/cn";

type TutorialProgressProps = {
  currentStep: number;
  totalSteps: number;
};

export function TutorialProgress({ currentStep, totalSteps }: TutorialProgressProps) {
  return (
    <div className="flex gap-2" aria-label={`ขั้นตอนที่ ${currentStep} จาก ${totalSteps}`}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const step = index + 1;
        const isActive = step <= currentStep;

        return (
          <span
            key={step}
            className={cn(
              "h-2 flex-1 rounded-full transition",
              isActive ? "bg-cyan-700" : "bg-slate-200",
            )}
          />
        );
      })}
    </div>
  );
}
