import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bell,
  FileText,
  Home,
  MessageSquare,
  Settings,
  ShieldAlert,
  User,
  Users,
  Video,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/cn";

export type AdminSection = "users" | "videos" | "feedback" | "payload" | "analytics" | "audit" | "settings";

type AdminNavItem = {
  badge?: string;
  href: string;
  icon: LucideIcon;
  label: string;
  section?: AdminSection;
};

export const adminSectionLabels: Record<AdminSection, string> = {
  analytics: "Analytics",
  audit: "Audit Logs",
  feedback: "Doctor Feedback",
  payload: "MediaPipe Payload",
  settings: "System Settings",
  users: "Users",
  videos: "Movement Videos",
};

export const adminSections = Object.keys(adminSectionLabels) as AdminSection[];

export const adminNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: Home, section: "users" },
  { label: "Patients", href: "/admin/patients", icon: Users },
  { label: "Movement Videos", href: "/admin/dashboard?section=videos", icon: Video, section: "videos" },
  { label: "Doctor Feedback", href: "/admin/dashboard?section=feedback", icon: MessageSquare, section: "feedback" },
  { label: "MediaPipe Payload", href: "/admin/dashboard?section=payload", icon: FileText, section: "payload" },
  { label: "Analytics", href: "/admin/dashboard?section=analytics", icon: BarChart3, section: "analytics" },
  { label: "Risk Alerts", href: "/admin/dashboard?section=analytics", icon: ShieldAlert, section: "analytics" },
  { label: "Audit Logs", href: "/admin/dashboard?section=audit", icon: FileText, section: "audit" },
  { label: "System Settings", href: "/admin/dashboard?section=settings", icon: Settings, section: "settings" },
];

export function getAdminSection(value: string | null): AdminSection {
  return value && adminSections.includes(value as AdminSection) ? (value as AdminSection) : "users";
}

function isAdminNavActive(pathname: string, search: string, item: AdminNavItem) {
  if (item.href === "/admin/patients") return pathname === "/admin/patients";
  if (pathname !== "/admin/dashboard") return false;

  const currentSection = getAdminSection(new URLSearchParams(search).get("section"));
  return item.section === currentSection;
}

export function AdminSidebar({
  dark = false,
  systemStatus = "All Systems Operational",
}: {
  dark?: boolean;
  systemStatus?: string;
}) {
  const location = useLocation();

  if (dark) {
    return (
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-[#082244] text-white shadow-2xl lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg">
            <Activity className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-bold leading-tight">Movement Analysis</p>
            <p className="text-sm text-slate-300">Subsystem</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-3 py-6">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isAdminNavActive(location.pathname, location.search, item);
            return (
              <Link
                className={cn(
                  "flex h-12 items-center justify-between rounded-md px-3 text-sm font-semibold transition",
                  active ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg" : "text-slate-200 hover:bg-white/10",
                )}
                key={item.label}
                to={item.href}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  {item.label}
                </span>
                {item.badge ? <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">{item.badge}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-md px-1 py-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-sm font-bold shadow-lg shadow-blue-950/20">AD</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">Admin User</p>
              <p className="truncate text-xs text-slate-300">System Administrator</p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

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

      <nav className="flex-1 space-y-2 px-3 py-6">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const active = isAdminNavActive(location.pathname, location.search, item);
          return (
            <NavLink
              className={cn(
                "flex h-14 w-full items-center justify-between rounded-lg px-4 text-left text-sm font-semibold transition",
                active ? "bg-cyan-50 text-cyan-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
              key={item.label}
              to={item.href}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {item.label}
              </span>
              {item.badge ? (
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-orange-500 px-2 text-xs font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <p className="text-sm font-semibold text-slate-900">System Status</p>
          </div>
          <p className="mt-3 text-sm text-slate-500">{systemStatus}</p>
        </div>
        <p className="mt-5 text-center text-xs font-medium text-slate-400">v1.0.0</p>
      </div>
    </aside>
  );
}
