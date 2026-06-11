import { Activity, BarChart3, History, UploadCloud } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

const mobileLinks = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { label: "New", href: "/analysis/new", icon: UploadCloud },
  { label: "History", href: "/analysis/history", icon: History },
];

export function Topbar() {
  return (
    <header className="print-hidden sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 md:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-700 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Movement Analysis</p>
            <p className="text-xs text-slate-500">Dashboard</p>
          </div>
        </div>

        <div className="hidden text-sm text-slate-500 md:block">
          Internship_project_Movement_Analysis
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            Mock API
          </span>
          <span className="text-sm font-medium text-slate-700">Patient ID: PAT-2048</span>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
        {mobileLinks.map((link) => (
          <NavLink
            key={link.href}
            to={link.href}
            className={({ isActive }) =>
              cn(
                "inline-flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                isActive ? "bg-cyan-50 text-cyan-800" : "text-slate-600",
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
