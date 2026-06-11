import { Outlet } from "react-router-dom";

export function PatientLayout() {
  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 text-slate-950 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[430px] items-stretch justify-center sm:min-h-[calc(100vh-3rem)]">
        <Outlet />
      </div>
    </main>
  );
}
