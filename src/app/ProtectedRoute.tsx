import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthLoadingScreen } from "@/app/AuthLoadingScreen";
import { useValidatedRoleSession } from "@/app/useValidatedRoleSession";

type ProtectedRouteProps = {
  children: ReactNode;
  loginPath: string;
  role: "admin" | "doctor" | "patient";
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
        state={{ from: location.pathname, message: "Please sign in before continuing." }}
        to={loginPath}
      />
    );
  }

  return <>{children}</>;
}
