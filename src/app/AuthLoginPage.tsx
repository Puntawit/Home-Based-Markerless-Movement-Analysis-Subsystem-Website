import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { ArrowLeft, LogIn, Stethoscope, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLoadingScreen } from "@/app/AuthLoadingScreen";
import { useValidatedRoleSession } from "@/app/useValidatedRoleSession";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BackendRequestError, loginWithPassword } from "@/lib/backendApi";
import type { AuthRole } from "@/lib/backendApi";

type LoginType = Extract<AuthRole, "doctor" | "patient">;

const loginCopy: Record<LoginType, {
  alternateLabel: string;
  alternateType: LoginType;
  icon: LucideIcon;
  idLabel: string;
  idPlaceholder: string;
  pendingLabel: string;
  submitLabel: string;
  subtitle: string;
  title: string;
}> = {
  doctor: {
    alternateLabel: "เปลี่ยนเป็นผู้ป่วย",
    alternateType: "patient",
    icon: Stethoscope,
    idLabel: "รหัสแพทย์",
    idPlaceholder: "กรอกรหัสแพทย์",
    pendingLabel: "กำลังเข้าสู่ระบบ...",
    submitLabel: "เข้าสู่ระบบแพทย์",
    subtitle: "สำหรับแพทย์ที่ต้องตรวจผลและส่งคำแนะนำให้ผู้ป่วย",
    title: "เข้าสู่ระบบแพทย์",
  },
  patient: {
    alternateLabel: "เปลี่ยนเป็นแพทย์",
    alternateType: "doctor",
    icon: UserRound,
    idLabel: "รหัสผู้ป่วย",
    idPlaceholder: "กรอกรหัสผู้ป่วย",
    pendingLabel: "กำลังเข้าสู่ระบบ...",
    submitLabel: "เข้าสู่ระบบผู้ป่วย",
    subtitle: "สำหรับผู้ป่วยที่ต้องบันทึกหรืออัปโหลดวิดีโอการเคลื่อนไหว",
    title: "เข้าสู่ระบบผู้ป่วย",
  },
};

function getLoginType(value: string | null): LoginType | null {
  return value === "doctor" || value === "patient" ? value : null;
}

export function AuthLoginPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loginType = getLoginType(searchParams.get("type"));
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [password, setPassword] = useState("");

  const activeLoginType = loginType ?? "patient";
  const sessionStatus = useValidatedRoleSession(activeLoginType);
  const copy = loginCopy[activeLoginType];
  const LoginIcon = copy.icon;
  const sessionMessage = useMemo(() => {
    if (typeof location.state !== "object" || location.state === null) return "";
    if (!("message" in location.state) || typeof location.state.message !== "string") return "";
    return location.state.message;
  }, [location.state]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!loginType) {
        throw new Error("กรุณาเลือกประเภทผู้ใช้งานก่อนเข้าสู่ระบบ");
      }

      const identifier = (loginType === "patient" ? patientId : doctorId).trim();
      if (!identifier) {
        throw new Error(loginType === "patient" ? "กรุณากรอกรหัสผู้ป่วย" : "กรุณากรอกรหัสแพทย์");
      }
      if (!password) {
        throw new Error("กรุณากรอกรหัสผ่าน");
      }
      return loginWithPassword(loginType, identifier, password);
    },
    onSuccess: (result) => {
      if (!loginType) return;
      queryClient.removeQueries({ queryKey: [loginType] });
      if (result.mustChangePassword) {
        navigate(`/auth/change-password?type=${loginType}`, { replace: true });
        return;
      }
      navigate(loginType === "patient" ? "/patient" : "/doctor", { replace: true });
    },
  });

  const loginErrorMessage = useMemo(() => {
    const error = loginMutation.error;
    if (!error) return "";
    if (error instanceof BackendRequestError) {
      if (error.status === 401) return "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
      if (error.status === 403) return "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
      if (error.status === 429) return "พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
    }
    if (error instanceof Error) return error.message;
    return "ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบว่า backend ทำงานอยู่";
  }, [loginMutation.error]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate();
  }

  if (!loginType) {
    return <Navigate replace to="/" />;
  }

  if (sessionStatus === "checking") {
    return <AuthLoadingScreen message="กำลังตรวจสอบสิทธิ์..." />;
  }

  if (sessionStatus === "authenticated") {
    return <Navigate replace to={loginType === "patient" ? "/patient" : "/doctor"} />;
  }

  const idValue = loginType === "patient" ? patientId : doctorId;
  const setIdValue = loginType === "patient" ? setPatientId : setDoctorId;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-8 font-thai text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <button
          className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-base font-medium text-slate-700 hover:bg-slate-100"
          onClick={() => navigate("/")}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
          กลับไปเลือกประเภท
        </button>

        <div className="space-y-7">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-cyan-700 text-white">
              <LoginIcon className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-500">MoveCheck</p>
              <h1 className="text-2xl font-semibold">{copy.title}</h1>
              <p className="text-base leading-7 text-slate-600">{copy.subtitle}</p>
            </div>
          </div>

          {sessionMessage ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900">
              {sessionMessage}
            </p>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              className="h-14 rounded-lg text-lg"
              label={copy.idLabel}
              name="userId"
              onChange={(event) => setIdValue(event.target.value)}
              placeholder={copy.idPlaceholder}
              value={idValue}
            />
            <Input
              className="h-14 rounded-lg text-lg"
              data-testid={`${loginType}-password`}
              label="รหัสผ่าน"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="กรอกรหัสผ่านของคุณ"
              type="password"
              value={password}
            />
            <Button
              className="h-16 w-full rounded-lg text-lg font-semibold"
              data-testid={`${loginType}-login-submit`}
              disabled={loginMutation.isPending}
              icon={<LogIn className="h-6 w-6" />}
              size="lg"
              type="submit"
            >
              {loginMutation.isPending ? copy.pendingLabel : copy.submitLabel}
            </Button>
            <Button
              className="h-14 w-full rounded-lg text-base"
              onClick={() => navigate(`/auth/login?type=${copy.alternateType}`)}
              size="lg"
              type="button"
              variant="outline"
            >
              {copy.alternateLabel}
            </Button>
            {loginMutation.isError ? (
              <p
                className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-base leading-6 text-rose-800"
                data-testid="login-error"
              >
                {loginErrorMessage}
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
