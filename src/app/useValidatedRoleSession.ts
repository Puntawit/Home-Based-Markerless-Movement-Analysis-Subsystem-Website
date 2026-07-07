import { useEffect, useState } from "react";
import type { AuthRole } from "@/lib/backendApi";
import {
  clearBackendAuthTokenForRole,
  getBackendAuthTokenForRole,
  validateBackendAuthToken,
} from "@/lib/backendApi";

export type ValidatedRoleSessionStatus = "authenticated" | "checking" | "unauthenticated";

export function useValidatedRoleSession(role: AuthRole) {
  const [status, setStatus] = useState<ValidatedRoleSessionStatus>(() =>
    getBackendAuthTokenForRole(role) ? "checking" : "unauthenticated",
  );

  useEffect(() => {
    let active = true;
    const token = getBackendAuthTokenForRole(role);

    if (!token) {
      setStatus("unauthenticated");
      return () => {
        active = false;
      };
    }

    setStatus("checking");

    void validateBackendAuthToken(role, token)
      .then(() => {
        if (active) {
          setStatus("authenticated");
        }
      })
      .catch(() => {
        clearBackendAuthTokenForRole(role);
        if (active) {
          setStatus("unauthenticated");
        }
      });

    return () => {
      active = false;
    };
  }, [role]);

  return status;
}
