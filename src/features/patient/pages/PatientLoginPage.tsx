
import type { FormEvent } from "react";
import { useState } from "react";
import { Activity, LogIn, Stethoscope } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthLoadingScreen } from "@/app/AuthLoadingScreen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { mockLogin } from "@/features/patient/api/patientApi";
import { MobileScreen } from "@/features/patient/components/MobileScreen";
import { useValidatedRoleSession } from "@/app/useValidatedRoleSession";

export function PatientLoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionStatus = useValidatedRoleSession("patient");
  const [username, setUsername] = useState("PATIENT-7712");
  const [password, setPassword] = useState("");
  const patientId = username.trim();

  const loginMutation = useMutation({
    mutationFn: (patientId: string) => {
      if (!patientId) {
        throw new Error("กรุณากรอกรหัสผู้ป่วย");
      }
      return mockLogin(patientId);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["patient"] });
      navigate("/patient/home");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate(patientId);
  }

  if (sessionStatus === "checking") {
    return <AuthLoadingScreen message="กำลังตรวจสอบสิทธิ์..." />;
  }

  if (sessionStatus === "authenticated") {
    return <Navigate replace to="/patient/home" />;
  }

  return (
    <MobileScreen className="justify-center">
      <div className="flex min-h-full flex-col justify-center px-1 py-4">
        <div className="space-y-8">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-700 text-white shadow-soft">
              <Activity className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-semibold text-slate-950">MoveCheck</p>
              <p className="text-sm leading-6 text-slate-500">
                ระบบติดตามการเคลื่อนไหวสำหรับผู้ป่วย เพื่อส่งวิดีโอให้แพทย์ประเมิน
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="รหัสผู้ป่วย"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="เช่น PATIENT-7712"
              value={username}
            />
            <Input
              label="รหัสผ่าน"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="กรอกรหัสผ่านหรือรหัสผู้ป่วย"
              type="password"
              value={password}
            />
            <Button
              className="h-12 w-full bg-cyan-700 hover:bg-cyan-800 focus-visible:ring-cyan-600"
              data-testid="patient-login-submit"
              disabled={loginMutation.isPending}
              icon={<LogIn className="h-4 w-4" />}
              size="lg"
              type="submit"
            >
              {loginMutation.isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
            <Button
              className="h-12 w-full"
              icon={<Stethoscope className="h-4 w-4" />}
              onClick={() => navigate("/doctor/login")}
              size="lg"
              variant="outline"
              type="button"
            >
              เป็นหมอใช่ไหม? ไปหน้าเข้าสู่ระบบแพทย์
            </Button>
            {loginMutation.isError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {loginMutation.error instanceof Error
                  ? loginMutation.error.message
                  : "ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบว่า backend ยังทำงานอยู่"}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </MobileScreen>
  );
}
