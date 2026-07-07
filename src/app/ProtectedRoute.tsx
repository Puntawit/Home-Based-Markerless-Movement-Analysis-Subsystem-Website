import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthLoadingScreen } from "@/app/AuthLoadingScreen";
import { useValidatedRoleSession } from "@/app/useValidatedRoleSession";
import type { AuthRole } from "@/lib/backendApi";

type ProtectedRouteProps = {
  children: ReactNode;
  loginPath: string;
  role: AuthRole;
};

export function ProtectedRoute({ children, loginPath, role }: ProtectedRouteProps) {
  const location = useLocation();
  const status = useValidatedRoleSession(role);

  if (status === "checking") {
    return <AuthLoadingScreen message="กำลังตรวจสอบสิทธิ์..." />;
  }

  if (status !== "authenticated") {
    return (
      <Navigate
        replace
        state={{ from: location.pathname, message: "กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้" }}
        to={loginPath}
      />
    );
  }

  return <>{children}</>;
}
