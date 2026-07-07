import { Navigate } from "react-router-dom";
import { AuthLoadingScreen } from "@/app/AuthLoadingScreen";
import { useValidatedRoleSession } from "@/app/useValidatedRoleSession";
import type { AuthRole } from "@/lib/backendApi";

type RoleEntryRouteProps = {
  loginPath: string;
  role: AuthRole;
  successPath: string;
};

export function RoleEntryRoute({ loginPath, role, successPath }: RoleEntryRouteProps) {
  const status = useValidatedRoleSession(role);

  if (status === "checking") {
    return <AuthLoadingScreen message="กำลังตรวจสอบสิทธิ์..." />;
  }

  return <Navigate replace to={status === "authenticated" ? successPath : loginPath} />;
}
