import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  HelpCircle,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  User,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  createAdminUser,
  exportAdminMediaPipePayload,
  getAdminOverview,
  getAdminUserDetail,
  getAdminUsers,
  type AdminCreateUserPayload,
  type AdminRiskLevel,
  type AdminUserRole,
  type AdminUserStatus,
  type AdminUserSummary,
} from "@/features/admin/api/adminApi";
import { AdminSidebar, adminSectionLabels, getAdminSection, type AdminSection } from "@/features/admin/components/AdminNavigation";
import { clearAdminBackendAuthToken, isAuthExpiredError } from "@/lib/backendApi";
import { cn } from "@/lib/cn";

type UserTab = "patient" | "doctor" | "all";
type AddUserMode = AdminUserRole;

const pageSize = 10;

const riskBadge: Record<AdminRiskLevel, { label: string; tone: "green" | "yellow" | "red" | "slate" }> = {
  high: { label: "High Risk", tone: "red" },
  low: { label: "Processed", tone: "green" },
  moderate: { label: "At Risk", tone: "yellow" },
  unknown: { label: "No Result", tone: "slate" },
};

const statusBadge: Record<AdminUserStatus, { label: string; tone: "green" | "yellow" | "slate" }> = {
  active: { label: "Active", tone: "green" },
  at_risk: { label: "At Risk", tone: "yellow" },
  inactive: { label: "Inactive", tone: "slate" },
};

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function initials(name: string, fallback: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0] ?? fallback).slice(0, 2).toUpperCase();
}

function roleIconClass(role: AdminUserRole) {
  return role === "patient" ? "bg-blue-50 text-blue-600" : "bg-cyan-50 text-cyan-700";
}

function Topbar({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Link aria-label="Open patients page" className="rounded-md p-2 text-slate-500 hover:bg-slate-100" to="/admin/patients">
          <ChevronLeft className="h-5 w-5 rotate-180" />
        </Link>
        <Link className="inline-flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50" to="/admin/dashboard?section=settings">
          CityCare Medical Center
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <Link aria-label="Notifications" className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100" to="/admin/dashboard?section=audit">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-bold text-white">3</span>
        </Link>
        <Link aria-label="Help" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" to="/admin/dashboard?section=settings">
          <HelpCircle className="h-5 w-5" />
        </Link>
        <Link className="flex items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-slate-50" to="/admin/dashboard?section=settings">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">AD</span>
          <span className="hidden sm:block">
            <span className="block text-sm font-bold text-slate-900">Admin</span>
            <span className="block text-xs text-slate-500">Administrator</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </Link>
        <button aria-label="Logout" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={onLogout} type="button">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function CountCard({
  icon,
  label,
  trend,
  value,
}: {
  icon: ReactNode;
  label: string;
  trend: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-sm">
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className="mt-1 flex items-end gap-3">
            <p className="text-3xl font-bold text-slate-950">{value}</p>
            <p className="pb-1 text-xs font-semibold text-emerald-600">{trend}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserTable({
  onSelect,
  selectedId,
  users,
}: {
  onSelect: (user: AdminUserSummary) => void;
  selectedId?: string;
  users: AdminUserSummary[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[930px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
            <tr>
              <th className="px-4 py-4">Role</th>
              <th className="px-4 py-4">Name</th>
              <th className="px-4 py-4">ID</th>
              <th className="px-4 py-4">Assigned Doctor/Patient</th>
              <th className="px-4 py-4">Last Session</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => {
              const status = statusBadge[user.status];
              const selected = selectedId === user.id;
              return (
                <tr
                  className={cn("cursor-pointer transition hover:bg-cyan-50/50", selected && "bg-cyan-50")}
                  key={user.id}
                  onClick={() => onSelect(user)}
                >
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", roleIconClass(user.role))}>
                        {user.role === "patient" ? <User className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
                      </span>
                      {user.role === "patient" ? "Patient" : "Doctor"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900">{user.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{user.subtitle ?? "--"}</p>
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-700">{user.id}</td>
                  <td className="px-4 py-4 text-slate-600">{user.assignedLabel ?? "--"}</td>
                  <td className="px-4 py-4 text-slate-600">{formatDateTime(user.lastSessionAt)}</td>
                  <td className="px-4 py-4">
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-3 text-slate-600">
                      <button aria-label={`View ${user.name}`} className="rounded-full p-1 hover:bg-slate-100" onClick={(event) => { event.stopPropagation(); onSelect(user); }} type="button">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JsonPreview({ payload }: { payload: Record<string, unknown> }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

function sumRecord(values?: Record<string, number>) {
  return Object.values(values ?? {}).reduce((total, value) => total + value, 0);
}

function SectionPanel({
  detail,
  isLoading,
  onCreate,
  onExportPayload,
  onRefresh,
  overview,
  section,
}: {
  detail?: Awaited<ReturnType<typeof getAdminUserDetail>>;
  isLoading: boolean;
  onCreate: (mode: AddUserMode) => void;
  onExportPayload: () => void;
  onRefresh: () => void;
  overview?: Awaited<ReturnType<typeof getAdminOverview>>;
  section: AdminSection;
}) {
  if (section === "users") return null;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <LoadingSpinner label={`Loading ${adminSectionLabels[section]}`} />
      </div>
    );
  }

  if (section === "videos") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid="admin-section-videos">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-950">Movement Videos</h1>
            <p className="mt-1 text-sm text-slate-500">Latest videos for the selected patient.</p>
          </div>
          <Button icon={<RefreshCw className="h-4 w-4" />} onClick={onRefresh} size="sm" variant="outline">Refresh</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(detail?.videos ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 md:col-span-2">Select a patient with submitted videos to preview playback links.</div>
          ) : (
            detail!.videos.map((video) => {
              const risk = riskBadge[video.riskLevel];
              return (
                <div className="rounded-lg border border-slate-200 p-3" key={`${video.sessionId}-${video.taskId}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{video.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(video.createdAt)}</p>
                    </div>
                    <Badge tone={risk.tone}>{risk.label}</Badge>
                  </div>
                  {video.videoUrl ? (
                    <a className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-cyan-700" href={video.videoUrl}>
                      <Download className="h-4 w-4" />
                      Open video
                    </a>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No playback link available.</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    );
  }

  if (section === "feedback") {
    const feedback = detail?.latestFeedback;
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid="admin-section-feedback">
        <h1 className="text-xl font-bold text-slate-950">Doctor Feedback</h1>
        {feedback ? (
          <div className="mt-4 rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">{feedback.doctorName}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(feedback.createdAt)}</p>
              </div>
              <Badge tone={riskBadge[feedback.riskLevel].tone}>{riskBadge[feedback.riskLevel].label}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{feedback.clinicalSummary || feedback.patientSummary}</p>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No feedback exists for the selected user yet.</div>
        )}
      </section>
    );
  }

  if (section === "payload") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid="admin-section-payload">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-950">MediaPipe Payload</h1>
            <p className="mt-1 text-sm text-slate-500">Latest available normalized or raw payload for the selected patient.</p>
          </div>
          <Button disabled={!detail?.mediaPipePayload?.analysisResultId} onClick={onExportPayload} size="sm" variant="outline">Export JSON</Button>
        </div>
        <div className="mt-4">
          {detail?.mediaPipePayload ? <JsonPreview payload={detail.mediaPipePayload.payload} /> : <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No payload available for this user.</div>}
        </div>
      </section>
    );
  }

  if (section === "analytics") {
    return (
      <section className="grid gap-4 md:grid-cols-3">
        <CountCard icon={<Users className="h-8 w-8" />} label="Observed Users" trend="from backend" value={overview?.userCounts.total ?? 0} />
        <CountCard icon={<Video className="h-8 w-8" />} label="Uploads" trend={`${formatBytes(overview?.uploadStats.totalSizeBytes)} total`} value={overview?.uploadStats.totalUploads ?? 0} />
        <CountCard icon={<FileText className="h-8 w-8" />} label="Feedback" trend={`${sumRecord(overview?.analysisJobCounts)} jobs`} value={overview?.feedbackCount ?? 0} />
      </section>
    );
  }

  if (section === "audit") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-950">Audit Logs</h1>
          <Button icon={<RefreshCw className="h-4 w-4" />} onClick={onRefresh} size="sm" variant="outline">Refresh</Button>
        </div>
        <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {(overview?.recentAuditEvents ?? []).length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No audit events yet.</div>
          ) : (
            overview!.recentAuditEvents.map((event) => (
              <div className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_120px_160px]" key={event.eventId || `${event.timestamp}-${event.action}`}>
                <span className="font-semibold text-slate-900">{event.action}</span>
                <Badge tone={event.outcome === "success" ? "green" : "red"}>{event.outcome}</Badge>
                <span className="text-slate-500">{formatDateTime(event.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h1 className="text-xl font-bold text-slate-950">System Settings</h1>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-bold text-slate-900">Backend</p>
          <p className="mt-1 text-sm text-slate-500">{overview?.serviceHealth.backend ?? "unknown"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-bold text-slate-900">MongoDB</p>
          <p className="mt-1 text-sm text-slate-500">{overview?.serviceHealth.mongodb ?? "unknown"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4 md:col-span-2">
          <p className="text-sm font-bold text-slate-900">MediaPipe Service</p>
          <p className="mt-1 text-sm text-slate-500">{overview?.serviceHealth.mediapipeServiceUrl ?? "Not configured"}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => onCreate("patient")} variant="outline">Add Patient</Button>
        <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => onCreate("doctor")}>Add Doctor</Button>
      </div>
    </section>
  );
}

function DetailPanel({
  isLoading,
  onClose,
  onExportPayload,
  onOpenSection,
  onRefresh,
  selected,
}: {
  isLoading: boolean;
  onClose: () => void;
  onExportPayload: () => void;
  onOpenSection: (section: AdminSection) => void;
  onRefresh: () => void;
  selected?: Awaited<ReturnType<typeof getAdminUserDetail>>;
}) {
  if (isLoading) {
    return (
      <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <LoadingSpinner label="Loading selected user" />
      </aside>
    );
  }

  if (!selected) {
    return (
      <aside className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        Select a user to inspect movement videos, feedback, and MediaPipe payload.
      </aside>
    );
  }

  const selectedInitials = initials(selected.user.name, selected.user.id);
  const feedback = selected.latestFeedback;
  const mediaPipe = selected.mediaPipePayload;

  return (
    <aside className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:max-h-[calc(100vh-6.5rem)] xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
            {selectedInitials}
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-950">{selected.user.name}</h2>
            <p className="text-sm text-slate-500">
              {selected.user.role === "patient" ? "Patient" : "Doctor"} <span className="px-1">.</span> {selected.user.id}
            </p>
            <p className="mt-1 text-sm text-slate-500">{selected.user.subtitle ?? "No profile details"}</p>
          </div>
        </div>
        <button aria-label="Close inspector" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">
          <X className="h-5 w-5" />
        </button>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-950">Movement Videos ({selected.videos.length})</h3>
          <button className="text-sm font-bold text-cyan-700" onClick={() => onOpenSection("videos")} type="button">View All</button>
        </div>
        <div className="space-y-2">
          {selected.videos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No movement videos yet.</div>
          ) : (
            selected.videos.slice(0, 3).map((video) => {
              const risk = riskBadge[video.riskLevel];
              return (
                <div className="flex gap-3 rounded-lg border border-slate-200 p-3" key={`${video.sessionId}-${video.taskId}`}>
                  <div className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-900 text-cyan-100">
                    {video.videoUrl ? (
                      <video
                        className="h-full w-full object-cover"
                        muted
                        onError={onRefresh}
                        preload="metadata"
                        src={video.videoUrl}
                      />
                    ) : (
                      <Video className="h-6 w-6" />
                    )}
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">00:15</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{video.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(video.createdAt)} {formatBytes(video.sizeBytes) ? ` . ${formatBytes(video.sizeBytes)}` : ""}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <Badge tone={risk.tone}>{risk.label}</Badge>
                      {video.videoUrl ? (
                        <a aria-label={`Download ${video.title}`} className="text-slate-500 hover:text-cyan-700" href={video.videoUrl}>
                          <Download className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-950">Latest Doctor Feedback</h3>
          <button className="text-sm font-bold text-cyan-700" onClick={() => onOpenSection("feedback")} type="button">View All</button>
        </div>
        {feedback ? (
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {initials(feedback.doctorName, "DR")}
                </span>
                <div>
                  <p className="font-bold text-slate-900">{feedback.doctorName}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(feedback.createdAt)}</p>
                </div>
              </div>
              <Badge tone={riskBadge[feedback.riskLevel].tone}>{riskBadge[feedback.riskLevel].label}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{feedback.clinicalSummary || feedback.patientSummary}</p>
            {feedback.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {feedback.tags.map((tag) => (
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700" key={tag}>{tag}</span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No doctor feedback yet.</div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-950">MediaPipe Payload</h3>
            <p className="text-xs text-slate-500">Latest Session</p>
          </div>
          <Button disabled={!mediaPipe?.analysisResultId} onClick={onExportPayload} size="sm" variant="outline">
            Export JSON
          </Button>
        </div>
        {mediaPipe ? <JsonPreview payload={mediaPipe.payload} /> : <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No MediaPipe payload yet.</div>}
      </section>
    </aside>
  );
}

function AddUserModal({
  doctors,
  mode,
  onClose,
  onModeChange,
  onSubmit,
  pending,
}: {
  doctors: AdminUserSummary[];
  mode: AddUserMode;
  onClose: () => void;
  onModeChange: (mode: AddUserMode) => void;
  onSubmit: (payload: AdminCreateUserPayload) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedDoctorId, setAssignedDoctorId] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      age: age ? Number(age) : null,
      assignedDoctorId: mode === "patient" ? assignedDoctorId || undefined : undefined,
      email: email || undefined,
      gender: mode === "patient" ? gender || undefined : undefined,
      name,
      phone: phone || undefined,
      role: mode,
      specialty: mode === "doctor" ? specialty || undefined : undefined,
      userId: userId || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Add User</h2>
            <p className="mt-1 text-sm text-slate-500">Create a patient or doctor profile for admin tracking.</p>
          </div>
          <button aria-label="Close add user modal" className="rounded-full p-1 text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(["patient", "doctor"] as AddUserMode[]).map((item) => (
            <button
              className={cn("h-10 rounded-md text-sm font-bold", mode === item ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600")}
              key={item}
              onClick={() => onModeChange(item)}
              type="button"
            >
              {item === "patient" ? "Patient" : "Doctor"}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input label="Name" name="name" onChange={(event) => setName(event.target.value)} required value={name} />
          <Input label="User ID" name="userId" onChange={(event) => setUserId(event.target.value)} placeholder={mode === "patient" ? "P-1008" : "D-2004"} value={userId} />
          {mode === "patient" ? (
            <>
              <Input label="Age" name="age" onChange={(event) => setAge(event.target.value)} type="number" value={age} />
              <Input label="Gender" name="gender" onChange={(event) => setGender(event.target.value)} placeholder="Female" value={gender} />
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Assigned Doctor</span>
                <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setAssignedDoctorId(event.target.value)} value={assignedDoctorId}>
                  <option value="">Unassigned</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <Input className="sm:col-span-2" label="Specialty" name="specialty" onChange={(event) => setSpecialty(event.target.value)} placeholder="Physiotherapy" value={specialty} />
          )}
          <Input label="Email" name="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
          <Input label="Phone" name="phone" onChange={(event) => setPhone(event.target.value)} value={phone} />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="outline">Cancel</Button>
          <Button disabled={pending} icon={<Plus className="h-4 w-4" />} type="submit">
            {pending ? "Creating..." : `Add ${mode === "patient" ? "Patient" : "Doctor"}`}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const activeSection = getAdminSection(searchParams.get("section"));
  const [activeTab, setActiveTab] = useState<UserTab>("patient");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addMode, setAddMode] = useState<AddUserMode>("patient");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const usersQuery = useQuery({
    queryFn: getAdminUsers,
    queryKey: ["admin", "users"],
  });

  const overviewQuery = useQuery({
    queryFn: getAdminOverview,
    queryKey: ["admin", "overview"],
  });

  const users = usersQuery.data?.users ?? [];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0];
  const detailQuery = useQuery({
    enabled: Boolean(selectedUser?.id),
    queryFn: () => getAdminUserDetail(selectedUser!.id),
    queryKey: ["admin", "users", selectedUser?.id, "detail"],
  });

  const createUserMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setSelectedUserId(created.id);
      setIsAddOpen(false);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("section", "users");
        next.set("user", created.id);
        next.delete("create");
        return next;
      });
    },
  });

  useEffect(() => {
    const error = usersQuery.error ?? detailQuery.error ?? overviewQuery.error;
    if (!isAuthExpiredError(error)) return;
    clearAdminBackendAuthToken();
    queryClient.removeQueries({ queryKey: ["admin"] });
    navigate("/admin/login", {
      replace: true,
      state: { message: "Your admin session expired. Please sign in again." },
    });
  }, [detailQuery.error, navigate, overviewQuery.error, queryClient, usersQuery.error]);

  useEffect(() => {
    const requestedUserId = searchParams.get("user");
    if (requestedUserId && users.some((user) => user.id === requestedUserId)) {
      setSelectedUserId(requestedUserId);
    }
  }, [searchParams, users]);

  useEffect(() => {
    const createMode = searchParams.get("create");
    if (createMode === "patient" || createMode === "doctor") {
      setAddMode(createMode);
      setIsAddOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, query]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesTab = activeTab === "all" || user.role === activeTab;
      const matchesQuery =
        !normalized ||
        user.name.toLowerCase().includes(normalized) ||
        user.id.toLowerCase().includes(normalized) ||
        (user.assignedLabel ?? "").toLowerCase().includes(normalized);
      return matchesTab && matchesQuery;
    });
  }, [activeTab, query, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const doctors = users.filter((user) => user.role === "doctor");

  function updateDashboardParams(updates: { create?: AddUserMode | null; section?: AdminSection; user?: string | null }) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (updates.section) next.set("section", updates.section);
      if (updates.user === null) next.delete("user");
      if (updates.user) next.set("user", updates.user);
      if (updates.create === null) next.delete("create");
      if (updates.create) next.set("create", updates.create);
      return next;
    });
  }

  function openCreateUser(mode: AddUserMode) {
    setAddMode(mode);
    setIsAddOpen(true);
    updateDashboardParams({ create: mode, section: "users" });
  }

  function closeCreateUser() {
    setIsAddOpen(false);
    updateDashboardParams({ create: null });
  }

  function handleSelectUser(user: AdminUserSummary) {
    setSelectedUserId(user.id);
    updateDashboardParams({ user: user.id });
  }

  function handleLogout() {
    clearAdminBackendAuthToken();
    queryClient.removeQueries({ queryKey: ["admin"] });
    navigate("/admin/login");
  }

  async function handleExportPayload() {
    const payload = detailQuery.data?.mediaPipePayload;
    if (!payload?.analysisResultId) return;
    const exported = await exportAdminMediaPipePayload(payload.analysisResultId);
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payload.analysisResultId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950" data-testid="admin-dashboard">
      <div className="flex min-h-screen">
        <AdminSidebar systemStatus={overviewQuery.data?.serviceHealth.backend === "ok" ? "Backend and MongoDB reachable" : "Backend status unknown"} />
        <section className="min-w-0 flex-1">
          <Topbar onLogout={handleLogout} />

          <div className="grid gap-5 p-4 lg:p-6 xl:grid-cols-[minmax(0,1fr)_560px]">
            <div className="min-w-0 space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_160px_160px]">
                <CountCard icon={<Users className="h-8 w-8" />} label="Patient Count" trend="+12 this week" value={usersQuery.data?.patientCount ?? 0} />
                <CountCard icon={<Stethoscope className="h-8 w-8" />} label="Doctor Count" trend="+2 this week" value={usersQuery.data?.doctorCount ?? 0} />
                <Button className="h-full min-h-16 bg-white text-cyan-700 hover:bg-cyan-50" icon={<UserPlus className="h-5 w-5" />} onClick={() => openCreateUser("patient")} variant="outline">
                  Add Patient
                </Button>
                <Button className="h-full min-h-16" icon={<UserPlus className="h-5 w-5" />} onClick={() => openCreateUser("doctor")}>
                  Add Doctor
                </Button>
              </div>

              <SectionPanel
                detail={detailQuery.data}
                isLoading={overviewQuery.isLoading || (detailQuery.isFetching && activeSection !== "analytics" && activeSection !== "audit" && activeSection !== "settings")}
                onCreate={openCreateUser}
                onExportPayload={handleExportPayload}
                onRefresh={() => {
                  usersQuery.refetch();
                  overviewQuery.refetch();
                  detailQuery.refetch();
                }}
                overview={overviewQuery.data}
                section={activeSection}
              />

              <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="grid rounded-lg border border-slate-200 bg-slate-50 p-1 sm:grid-cols-3 lg:w-[430px]">
                  {[
                    { label: "Patients", value: "patient" as const },
                    { label: "Doctors", value: "doctor" as const },
                    { label: "All Users", value: "all" as const },
                  ].map((tab) => (
                    <button
                      className={cn("h-10 rounded-md text-sm font-bold", activeTab === tab.value ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600")}
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                  <div className="relative min-w-0 flex-1 lg:max-w-80">
                    <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search users..."
                      value={query}
                    />
                  </div>
                  <button aria-label="Clear user filters" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" onClick={() => { setQuery(""); setActiveTab("all"); }} type="button">
                    <Filter className="h-5 w-5" />
                  </button>
                  <button aria-label="Refresh users" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" onClick={() => usersQuery.refetch()} type="button">
                    <RefreshCw className={cn("h-5 w-5", usersQuery.isFetching && "animate-spin")} />
                  </button>
                </div>
              </div>

              {usersQuery.isLoading ? (
                <div className="rounded-lg border border-slate-200 bg-white p-10">
                  <LoadingSpinner label="Loading admin users" />
                </div>
              ) : null}

              {usersQuery.isError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-900">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-bold">Admin users could not be loaded</p>
                      <p className="mt-1 text-sm">{usersQuery.error instanceof Error ? usersQuery.error.message : "Start the backend and try again."}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!usersQuery.isLoading && !usersQuery.isError ? (
                <>
                  <UserTable onSelect={handleSelectUser} selectedId={selectedUser?.id} users={pagedUsers} />
                  <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm md:flex-row md:items-center md:justify-between">
                    <p>
                      Showing {filteredUsers.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length} users
                    </p>
                    <div className="flex items-center gap-2">
                      <button aria-label="Previous page" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="flex h-9 min-w-9 items-center justify-center rounded-md bg-cyan-600 px-3 text-sm font-bold text-white">{page}</span>
                      <span className="px-1 text-slate-400">/</span>
                      <span className="font-bold text-slate-700">{totalPages}</span>
                      <button aria-label="Next page" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <DetailPanel
              isLoading={detailQuery.isFetching}
              onClose={() => {
                setSelectedUserId("");
                updateDashboardParams({ user: null });
              }}
              onExportPayload={handleExportPayload}
              onOpenSection={(section) => updateDashboardParams({ section })}
              onRefresh={() => detailQuery.refetch()}
              selected={detailQuery.data}
            />
          </div>
        </section>
      </div>

      {isAddOpen ? (
        <AddUserModal
          doctors={doctors}
          mode={addMode}
          onClose={closeCreateUser}
          onModeChange={setAddMode}
          onSubmit={(payload) => createUserMutation.mutate(payload)}
          pending={createUserMutation.isPending}
        />
      ) : null}

      {createUserMutation.isError ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 shadow-lg">
          {createUserMutation.error instanceof Error ? createUserMutation.error.message : "Could not create user."}
        </div>
      ) : null}
    </main>
  );
}
