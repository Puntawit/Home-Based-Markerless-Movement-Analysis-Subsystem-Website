import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Play, Ruler } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getMovementTask } from "@/features/patient/data/movementTasks";
import { MobileScreen } from "@/features/patient/components/MobileScreen";
import { TutorialProgress } from "@/features/patient/components/TutorialProgress";

export function PatientTutorialPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const task = getMovementTask(searchParams.get("task"));
  const [videoWatched, setVideoWatched] = useState(false);

  useEffect(() => {
    setVideoWatched(false);
    const timer = window.setTimeout(() => setVideoWatched(true), 1600);
    return () => window.clearTimeout(timer);
  }, [task.id]);

  return (
    <MobileScreen
      backTo="/patient"
      subtitle="ดูตัวอย่างท่าก่อนเริ่มตั้งกล้องและบันทึกวิดีโอ"
      title={task.label}
      footer={
        <Button
          className="h-12 w-full bg-cyan-700 hover:bg-cyan-800 focus-visible:ring-cyan-600"
          data-testid="patient-tutorial-continue"
          disabled={!videoWatched}
          icon={<ChevronRight className="h-4 w-4" />}
          onClick={() => navigate(`/patient/record?task=${task.id}`)}
          size="lg"
        >
          ถัดไป
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">ขั้นตอนที่ 2/5</span>
          <span className="text-slate-500">วิดีโอสอน</span>
        </div>
        <TutorialProgress currentStep={2} totalSteps={5} />
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white">
        <div className="relative aspect-video">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#155e75_0,#0f172a_58%)]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
              <Play className="h-8 w-8 fill-white" />
            </span>
            <p className="px-6 text-center text-sm font-semibold">{task.tutorialTitle}</p>
          </div>
          <div
            className="absolute bottom-0 left-0 h-1 bg-cyan-400 transition-all duration-1000"
            style={{ width: videoWatched ? "100%" : "72%" }}
          />
        </div>
        <div className="space-y-3 border-t border-white/10 p-4">
          <p className="text-sm leading-6 text-slate-100">{task.tutorialBody}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="cyan">{task.distance}</Badge>
            <Badge tone="green">{task.durationSeconds} วินาที</Badge>
          </div>
        </div>
      </section>

      {task.safetyNote ? (
        <section className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-sm leading-6 text-amber-900">{task.safetyNote}</p>
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <Ruler className="h-5 w-5 text-cyan-700" />
          <div>
            <p className="text-sm font-semibold text-slate-900">ระยะกล้อง</p>
            <p className="text-xs text-slate-500">{task.distance}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          <p className="text-sm text-emerald-900">
            {videoWatched ? "ดูวิดีโอสอนครบแล้ว" : "กำลังเล่นวิดีโอสอน"}
          </p>
        </div>
      </section>
    </MobileScreen>
  );
}
