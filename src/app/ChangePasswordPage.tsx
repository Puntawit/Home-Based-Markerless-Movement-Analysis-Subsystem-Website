import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BackendRequestError, changePassword, getBackendAuthTokenForRole } from "@/lib/backendApi";
import type { AuthRole } from "@/lib/backendApi";

const homePathByRole: Record<AuthRole, string> = {
  admin: "/admin/dashboard",
  doctor: "/doctor",
  patient: "/patient",
};

const loginPathByRole: Record<AuthRole, string> = {
  admin: "/admin/login",
  doctor: "/auth/login?type=doctor",
  patient: "/auth/login?type=patient",
};

function getRole(value: string | null): AuthRole | null {
  return value === "admin" || value === "doctor" || value === "patient" ? value : null;
}

export function ChangePasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = getRole(searchParams.get("type"));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!role) throw new Error("ไม่พบประเภทผู้ใช้งาน");
      if (!currentPassword) throw new Error("กรุณากรอกรหัสผ่านปัจจุบัน");
      if (newPassword !== confirmPassword) throw new Error("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return changePassword(role, currentPassword, newPassword);
    },
    onSuccess: () => {
      if (!role) return;
      queryClient.removeQueries({ queryKey: [role] });
      navigate(homePathByRole[role], { replace: true });
    },
  });

  const errorMessage = useMemo(() => {
    const error = mutation.error;
    if (!error) return "";
    if (error instanceof BackendRequestError) {
      if (error.status === 401) return "รหัสผ่านปัจจุบันไม่ถูกต้อง";
      if (error.status === 400) return error.message;
    }
    if (error instanceof Error) return error.message;
    return "ไม่สามารถเปลี่ยนรหัสผ่านได้";
  }, [mutation.error]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  if (!role) {
    return <Navigate replace to="/" />;
  }

  // The user just authenticated, so a missing token means they landed here directly.
  if (!getBackendAuthTokenForRole(role)) {
    return <Navigate replace to={loginPathByRole[role]} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-8 font-thai text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="space-y-7">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-cyan-700 text-white">
              <KeyRound className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold">ตั้งรหัสผ่านใหม่</h1>
            <p className="text-base leading-7 text-slate-600">
              บัญชีนี้ใช้รหัสผ่านชั่วคราว กรุณาตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              className="h-14 rounded-lg text-lg"
              data-testid="change-password-current"
              label="รหัสผ่านปัจจุบัน"
              name="currentPassword"
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              value={currentPassword}
            />
            <Input
              className="h-14 rounded-lg text-lg"
              data-testid="change-password-new"
              label="รหัสผ่านใหม่ (อย่างน้อย 12 ตัวอักษร)"
              name="newPassword"
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
            <Input
              className="h-14 rounded-lg text-lg"
              data-testid="change-password-confirm"
              label="ยืนยันรหัสผ่านใหม่"
              name="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
            <Button
              className="h-16 w-full rounded-lg text-lg font-semibold"
              data-testid="change-password-submit"
              disabled={mutation.isPending}
              size="lg"
              type="submit"
            >
              {mutation.isPending ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
            </Button>
            {mutation.isError ? (
              <p
                className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-base leading-6 text-rose-800"
                data-testid="change-password-error"
              >
                {errorMessage}
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
