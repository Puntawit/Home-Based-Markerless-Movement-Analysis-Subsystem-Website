import { LayoutDashboard, User } from "lucide-react";

export function AdminSidebar() {
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700">
          <User className="h-6 w-6" />
        </span>
        <div>
          <p className="text-lg font-bold text-cyan-700">Admin Console</p>
          <p className="text-xs font-medium text-slate-500">Movement Analysis System</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6">
        <span className="flex h-14 w-full items-center gap-3 rounded-lg bg-cyan-50 px-4 text-left text-sm font-semibold text-cyan-700">
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </span>
      </nav>

      <p className="p-4 text-center text-xs font-medium text-slate-400">v1.0.0</p>
    </aside>
  );
}
