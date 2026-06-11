import type { FormEvent } from "react";
import { useState } from "react";
import { Activity, LogIn } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { mockLogin } from "@/features/patient/api/patientApi";
import { MobileScreen } from "@/features/patient/components/MobileScreen";

export function PatientLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("PATIENT-7712");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: mockLogin,
    onSuccess: () => navigate("/patient/home"),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate();
  }

  return (
    <MobileScreen className="justify-center">
      <div className="space-y-8">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-700 text-white shadow-soft">
            <Activity className="h-10 w-10" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-950">MoveCheck</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              ระบบติดตามการเคลื่อนไหวสำหรับผู้ป่วยที่ส่งวิดีโอให้แพทย์ประเมิน
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
            placeholder="กรอกรหัสผ่านหรือ patient code"
            type="password"
            value={password}
          />
          <Button
            className="h-12 w-full bg-cyan-700 hover:bg-cyan-800 focus-visible:ring-cyan-600"
            disabled={loginMutation.isPending}
            icon={<LogIn className="h-4 w-4" />}
            size="lg"
            type="submit"
          >
            {loginMutation.isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
      </div>
    </MobileScreen>
  );
}
