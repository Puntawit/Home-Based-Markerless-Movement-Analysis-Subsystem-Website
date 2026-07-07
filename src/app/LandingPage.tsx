import { Activity, Stethoscope, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-8 font-thai text-slate-950">
      <section className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-cyan-700 text-white">
            <Activity className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-semibold">MoveCheck</h1>
        </div>

        <div className="space-y-4">
          <Button
            className="h-20 w-full rounded-lg text-xl font-semibold"
            icon={<UserRound className="h-7 w-7" />}
            onClick={() => navigate("/auth/login?type=patient")}
            size="lg"
          >
            ฉันเป็นผู้ป่วย
          </Button>
          <Button
            className="h-20 w-full rounded-lg text-xl font-semibold"
            icon={<Stethoscope className="h-7 w-7" />}
            onClick={() => navigate("/auth/login?type=doctor")}
            size="lg"
            variant="outline"
          >
            ฉันเป็นแพทย์
          </Button>
        </div>
      </section>
    </main>
  );
}
