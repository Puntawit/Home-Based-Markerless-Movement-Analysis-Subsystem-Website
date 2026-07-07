import type { FormEvent } from "react";
import { useState } from "react";
import { Activity, LogIn, ShieldCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginAdminWithPassword } from "@/lib/backendApi";

export function AdminLoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("admin");
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
      if (!username.trim()) {
        throw new Error("Please enter an admin username.");
      }
      if (!password.trim()) {
        throw new Error("Please enter the admin password.");
      }
      return loginAdminWithPassword({ password, username: username.trim() });
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["admin"] });
      navigate("/admin/dashboard");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 font-thai text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-7">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Admin Login</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Credentials are verified by the backend from environment config.
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
                label="Username"
                name="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                value={username}
              />
              <Input
                data-testid="admin-password"
                label="Password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Stored outside Git"
                type="password"
                value={password}
              />
              <Button
                className="h-12 w-full bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-600"
                data-testid="admin-login-submit"
                disabled={loginMutation.isPending}
                icon={<LogIn className="h-4 w-4" />}
                size="lg"
                type="submit"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in as admin"}
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

        <section className="flex flex-col justify-between bg-slate-950 p-8 text-white sm:p-10">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <Activity className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-semibold">MoveCheck</p>
                <p className="text-sm text-slate-300">Administration portal</p>
              </div>
            </div>

            <div className="max-w-md space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
                Admin Access
              </p>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Monitor system health, users, and audit activity.
              </h1>
              <p className="text-sm leading-6 text-slate-300">
                Sign in with the demo admin account to review operational metrics,
                patient lists, service status, and security audit summaries.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <p className="font-semibold text-white">Users</p>
              <p className="mt-1">Track patient, doctor, and admin counts.</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <p className="font-semibold text-white">Services</p>
              <p className="mt-1">Check backend and data service status.</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <p className="font-semibold text-white">Audits</p>
              <p className="mt-1">Review recent security-relevant events.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
