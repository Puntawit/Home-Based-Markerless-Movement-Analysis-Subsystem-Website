import type { FormEvent } from "react";
import { useState } from "react";
import { Activity, LogIn, Stethoscope } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLoadingScreen } from "@/app/AuthLoadingScreen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginDoctorDemo } from "@/lib/backendApi";
import { useValidatedRoleSession } from "@/app/useValidatedRoleSession";

export function DoctorLoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionStatus = useValidatedRoleSession("doctor");
  const [doctorId, setDoctorId] = useState("DOCTOR-DEMO");
  const [password, setPassword] = useState("");
  const sessionMessage =
    typeof location.state === "object" &&
    location.state !== null &&
    "message" in location.state &&
    typeof location.state.message === "string"
      ? location.state.message
      : "";

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!doctorId.trim()) {
        throw new Error("Please enter a doctor ID.");
      }
      return loginDoctorDemo();
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["doctor"] });
      navigate("/doctor/dashboard");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate();
  }

  if (sessionStatus === "checking") {
    return <AuthLoadingScreen message="กำลังตรวจสอบสิทธิ์..." />;
  }

  if (sessionStatus === "authenticated") {
    return <Navigate replace to="/doctor/dashboard" />;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 font-thai text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between bg-slate-950 p-8 text-white sm:p-10">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-500 text-white">
                <Activity className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-semibold">MoveCheck</p>
                <p className="text-sm text-slate-300">Clinical review portal</p>
              </div>
            </div>

            <div className="max-w-md space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
                Doctor Access
              </p>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Review patient movement sessions with clinical context.
              </h1>
              <p className="text-sm leading-6 text-slate-300">
                Sign in with the demo doctor account to inspect submitted sessions,
                movement flags, video playback, and feedback tools.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <p className="font-semibold text-white">Sessions</p>
              <p className="mt-1">Review queued patient submissions.</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <p className="font-semibold text-white">Risk Flags</p>
              <p className="mt-1">Check analysis status and warnings.</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <p className="font-semibold text-white">Feedback</p>
              <p className="mt-1">Send clinical and patient summaries.</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-7">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                <Stethoscope className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Doctor Login</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Demo account: DOCTOR-DEMO
                </p>
              </div>
            </div>

            {sessionMessage ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {sessionMessage}
              </p>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Doctor ID"
                name="doctorId"
                onChange={(event) => setDoctorId(event.target.value)}
                placeholder="DOCTOR-DEMO"
                value={doctorId}
              />
              <Input
                label="Password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Demo password is not checked yet"
                type="password"
                value={password}
              />
              <Button
                className="h-12 w-full"
                data-testid="doctor-login-submit"
                disabled={loginMutation.isPending}
                icon={<LogIn className="h-4 w-4" />}
                size="lg"
                type="submit"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in as doctor"}
              </Button>
              {loginMutation.isError ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {loginMutation.error instanceof Error
                    ? loginMutation.error.message
                    : "Could not sign in. Please check that the backend is running."}
                </p>
              ) : null}
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
