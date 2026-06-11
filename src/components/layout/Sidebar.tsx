import { Activity, BarChart3, History, UploadCloud } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

const links = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { label: "New Analysis", href: "/analysis/new", icon: UploadCloud },
  { label: "History", href: "/analysis/history", icon: History },
];

export function Sidebar() {
  return (
    <aside className="print-hidden fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 md:block">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-700 text-white">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950">Movement Analysis</p>
          <p className="text-xs text-slate-500">Clinical dashboard</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.href}
            to={link.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                isActive ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-100",
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
