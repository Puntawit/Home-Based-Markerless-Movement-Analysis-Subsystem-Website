import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileText,
  Filter,
  HelpCircle,
  LogOut,
  Phone,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getAdminPatients, type AdminPatientRecentAssessment, type AdminPatientSummary, type AdminRiskLevel } from "@/features/admin/api/adminApi";
import { AdminSidebar } from "@/features/admin/components/AdminNavigation";
import { clearAdminBackendAuthToken, isAuthExpiredError } from "@/lib/backendApi";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/formatDate";

const pageSize = 10;

type EnrichedAdminPatient = AdminPatientSummary & {
  assignedDoctorName: string;
  age: number;
  gender: string;
  phone: string;
  nextAppointmentAt: string | null;
  riskScore: number | null;
  recentAssessments: AdminPatientRecentAssessment[];
};

const demoPatients = [
  { name: "James Smith", gender: "Male", age: 68, phone: "(555) 123-4567", appointmentOffsetDays: 6, appointmentHour: 10, appointmentMinute: 30 },
  { name: "Maria Rodriguez", gender: "Female", age: 62, phone: "(555) 234-5678", appointmentOffsetDays: 4, appointmentHour: 14, appointmentMinute: 0 },
  { name: "William Thompson", gender: "Male", age: 71, phone: "(555) 345-6789", appointmentOffsetDays: 10, appointmentHour: 9, appointmentMinute: 0 },
  { name: "Emily Lee", gender: "Female", age: 59, phone: "(555) 456-7890", appointmentOffsetDays: 3, appointmentHour: 11, appointmentMinute: 0 },
  { name: "Daniel Carter", gender: "Male", age: 74, phone: "(555) 567-8901", appointmentOffsetDays: null, appointmentHour: 0, appointmentMinute: 0 },
  { name: "Sophia Patel", gender: "Female", age: 66, phone: "(555) 678-9012", appointmentOffsetDays: 5, appointmentHour: 15, appointmentMinute: 30 },
  { name: "Robert Johnson", gender: "Male", age: 70, phone: "(555) 789-0123", appointmentOffsetDays: 5, appointmentHour: 13, appointmentMinute: 0 },
  { name: "Aisha Khan", gender: "Female", age: 64, phone: "(555) 890-1234", appointmentOffsetDays: 9, appointmentHour: 10, appointmentMinute: 0 },
  { name: "Michael Tan", gender: "Male", age: 73, phone: "(555) 901-2345", appointmentOffsetDays: null, appointmentHour: 0, appointmentMinute: 0 },
  { name: "Lisa Gomez", gender: "Female", age: 61, phone: "(555) 012-3456", appointmentOffsetDays: 11, appointmentHour: 14, appointmentMinute: 30 },
];

const fallbackDoctors = ["Dr. Sarah Johnson", "Dr. David Lee", "Dr. Michael Patel"];

const fallbackAssessments = [
  { label: "Gait Analysis", score: 76 },
  { label: "Balance Test", score: 72 },
  { label: "Mobility Test", score: 69 },
  { label: "Posture Analysis", score: 65 },
];

const riskMeta: Record<
  AdminRiskLevel,
  { label: string; badge: "green" | "yellow" | "red" | "slate"; dot: string; score: number | null; scoreClass: string }
> = {
  high: { label: "High", badge: "red", dot: "bg-orange-600", score: 78, scoreClass: "text-orange-600" },
  moderate: { label: "Medium", badge: "yellow", dot: "bg-orange-400", score: 72, scoreClass: "text-orange-500" },
  low: { label: "Low", badge: "green", dot: "bg-emerald-500", score: 65, scoreClass: "text-emerald-600" },
  unknown: { label: "Unknown", badge: "slate", dot: "bg-slate-400", score: null, scoreClass: "text-slate-500" },
};

function initialsFor(name: string, fallback: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0] ?? fallback).slice(0, 2).toUpperCase();
}

function dateWithOffset(offsetDays: number | null, hour: number, minute: number) {
  if (offsetDays === null) return null;
  const base = new Date("2025-05-18T00:00:00");
  base.setDate(base.getDate() + offsetDays);
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
}

function enrichPatient(patient: AdminPatientSummary, index: number): EnrichedAdminPatient {
  const demo = demoPatients[index % demoPatients.length];
  const fallbackName = patient.patientName === patient.patientId ? demo.name : patient.patientName;
  const recentAssessments =
    patient.recentAssessments.length > 0
      ? patient.recentAssessments
      : fallbackAssessments.map((assessment, assessmentIndex) => ({
          ...assessment,
          date: dateWithOffset(-(assessmentIndex * 12 + 8), 0, 0),
        }));

  return {
    ...patient,
    patientName: fallbackName,
    initials: patient.initials || initialsFor(fallbackName, patient.patientId),
    assignedDoctorName: patient.assignedDoctorName ?? fallbackDoctors[index % fallbackDoctors.length],
    age: patient.age ?? demo.age,
    gender: patient.gender ?? demo.gender,
    phone: patient.phone ?? demo.phone,
    nextAppointmentAt: patient.nextAppointmentAt ?? dateWithOffset(demo.appointmentOffsetDays, demo.appointmentHour, demo.appointmentMinute),
    riskScore: patient.riskScore ?? riskMeta[patient.riskLevel].score,
    recentAssessments,
  };
}

function formatTrend(value: number, tone: "green" | "orange" = "green") {
  return (
    <span className={cn("text-xs font-semibold", tone === "green" ? "text-emerald-600" : "text-orange-600")}>
      Up {value}% vs last month
    </span>
  );
}

function formatOptionalDate(value?: string | null) {
  return value ? formatShortDate(value) : "--";
}

function formatOptionalDateTime(value?: string | null) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTableDateTime(value?: string | null) {
  if (!value) return { date: "--", time: "" };
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date),
  };
}

function Topbar({ onAudit, onLogout, onSettings }: { onAudit: () => void; onLogout: () => void; onSettings: () => void }) {
  return (
    <div className="flex items-center justify-end gap-4">
      <button className="hidden h-12 min-w-56 items-center justify-between rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm md:flex" onClick={onSettings} type="button">
        <span className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-cyan-700" />
          Cityview Hospital
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </button>
      <button aria-label="Help" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={onSettings} type="button">
        <HelpCircle className="h-5 w-5" />
      </button>
      <button aria-label="Notifications" className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={onAudit} type="button">
        <Bell className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-700 text-[10px] font-bold text-white">3</span>
      </button>
      <button aria-label="Sign out" className="rounded-full bg-white p-2 text-slate-500 shadow-sm hover:bg-slate-100" onClick={onLogout} type="button">
        <LogOut className="h-5 w-5" />
      </button>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  tone,
  trend,
  trendTone,
  value,
}: {
  icon: typeof Users;
  label: string;
  tone: string;
  trend: number;
  trendTone?: "green" | "orange";
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-sm", tone)}>
          <Icon className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-500">{label}</p>
          <p className="text-2xl font-bold leading-tight text-slate-950">{value}</p>
          {formatTrend(trend, trendTone)}
        </div>
      </div>
    </div>
  );
}

function SelectFilter({
  icon: Icon,
  label,
  onChange,
  value,
  values,
}: {
  icon?: typeof CalendarDays;
  label: string;
  onChange: (value: string) => void;
  value: string;
  values: { label: string; value: string }[];
}) {
  return (
    <label className="flex h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm">
      <span className="whitespace-nowrap font-semibold text-slate-600">{label}</span>
      {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
      <select
        className="min-w-20 bg-transparent text-sm font-semibold text-slate-800 outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {values.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function riskMatches(patient: EnrichedAdminPatient, filter: string) {
  return filter === "all" || patient.riskLevel === filter;
}

function statusMatches(patient: EnrichedAdminPatient, filter: string) {
  return filter === "all" || patient.status === filter;
}

function appointmentMatches(patient: EnrichedAdminPatient, filter: string) {
  if (filter === "all") return true;
  if (filter === "none") return !patient.nextAppointmentAt;
  if (!patient.nextAppointmentAt) return false;

  const appointmentTime = new Date(patient.nextAppointmentAt).getTime();
  const today = new Date("2025-05-18T00:00:00").getTime();
  const sevenDays = today + 7 * 24 * 60 * 60 * 1000;
  return filter === "upcoming" ? appointmentTime >= today : appointmentTime >= today && appointmentTime <= sevenDays;
}

function Avatar({
  className,
  initials,
  seed,
  size = "sm",
}: {
  className?: string;
  initials: string;
  seed: string;
  size?: "sm" | "md" | "lg";
}) {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-pink-100 text-pink-700",
    "bg-amber-100 text-amber-700",
  ];
  const index = seed.charCodeAt(seed.length - 1) % colors.length;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        colors[index],
        size === "lg" ? "h-20 w-20 text-xl" : size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs",
        className,
      )}
    >
      {initials}
    </span>
  );
}

function DoctorAvatar({ name }: { name: string }) {
  return <Avatar className="ring-2 ring-white" initials={initialsFor(name, "DR")} seed={name} size="sm" />;
}

function PatientsTable({
  onSelect,
  patients,
  selectedPatientId,
}: {
  onSelect: (patient: EnrichedAdminPatient) => void;
  patients: EnrichedAdminPatient[];
  selectedPatientId?: string;
}) {
  return (
    <div className="overflow-hidden border-x border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-y border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
            <tr>
              <th className="w-12 px-4 py-3">
                <input aria-label="Select all patients" className="h-4 w-4 rounded border-slate-300" type="checkbox" />
              </th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Patient ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Risk Level</th>
              <th className="px-4 py-3">Assigned Doctor</th>
              <th className="px-4 py-3">Next Appointment</th>
              <th className="px-4 py-3">Last Assessment</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.map((patient) => {
              const risk = riskMeta[patient.riskLevel];
              const isSelected = selectedPatientId === patient.patientId;
              const appointment = formatTableDateTime(patient.nextAppointmentAt);
              return (
                <tr
                  className={cn("cursor-pointer bg-white transition hover:bg-cyan-50/50", isSelected && "bg-cyan-50/70")}
                  key={patient.patientId}
                  onClick={() => onSelect(patient)}
                >
                  <td className="px-4 py-4">
                    <input
                      aria-label={`Select ${patient.patientName}`}
                      className="h-4 w-4 rounded border-slate-300"
                      onClick={(event) => event.stopPropagation()}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar initials={patient.initials} seed={patient.patientId} />
                      <span className="font-semibold text-slate-900">{patient.patientName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-700">{patient.patientId}</td>
                  <td className="px-4 py-4">
                    <Badge tone={patient.status === "active" ? "green" : "slate"}>
                      {patient.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className={cn("h-2 w-2 rounded-full", risk.dot)} />
                      {risk.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    <div className="flex items-center gap-2">
                      <DoctorAvatar name={patient.assignedDoctorName} />
                      <span>{patient.assignedDoctorName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    <span className="block">{appointment.date}</span>
                    {appointment.time ? <span className="block">{appointment.time}</span> : null}
                  </td>
                  <td className="px-4 py-4 text-slate-700">{formatOptionalDate(patient.lastAssessmentAt)}</td>
                  <td className="px-4 py-4 text-right text-slate-500">
                    <ChevronRight className="h-5 w-5" />
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

function PatientDetailPanel({
  onOpenDashboard,
  patient,
}: {
  onOpenDashboard: (section: "users" | "videos" | "feedback" | "payload") => void;
  patient?: EnrichedAdminPatient;
}) {
  if (!patient) {
    return (
      <aside className="rounded-lg border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-500 shadow-sm">
        Select a patient to preview details.
      </aside>
    );
  }

  const risk = riskMeta[patient.riskLevel];

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex justify-end">
        <button aria-label="Close preview" className="rounded-full p-1 text-slate-500 hover:bg-slate-100" type="button">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="-mt-1 flex items-center gap-4">
        <Avatar initials={patient.initials} seed={patient.patientId} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-slate-950">{patient.patientName}</h2>
          <p className="text-sm font-semibold text-slate-500">{patient.patientId}</p>
          <p className="mt-1 text-sm text-slate-500">
            {patient.gender} <span className="px-1">.</span> {patient.age} years
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <Phone className="h-4 w-4" />
            {patient.phone}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Risk Level</p>
            <Badge className="mt-2" tone={risk.badge}>
              {risk.label}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500">Risk Score</p>
            <p className={cn("mt-2 text-2xl font-bold", risk.scoreClass)}>
              {patient.riskScore ?? "--"}
              <span className="text-sm font-semibold text-slate-600"> /100</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 border-b border-slate-100 pb-4">
        <p className="text-sm font-bold text-slate-900">Assigned Doctor</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <DoctorAvatar name={patient.assignedDoctorName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{patient.assignedDoctorName}</p>
              <p className="text-xs text-slate-500">Neurologist</p>
            </div>
          </div>
          <button className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={() => onOpenDashboard("users")} type="button">
            View Profile
          </button>
        </div>
      </div>

      <div className="mt-4 border-b border-slate-100 pb-4">
        <p className="text-sm font-bold text-slate-900">Next Appointment</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate">{formatOptionalDateTime(patient.nextAppointmentAt)}</span>
          </p>
          <button className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={() => onOpenDashboard("users")} type="button">
            Schedule
          </button>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">Recent Assessments</p>
          <button className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" onClick={() => onOpenDashboard("videos")} type="button">
            View All
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {patient.recentAssessments.map((assessment) => (
            <div className="flex items-center gap-3 text-sm" key={`${patient.patientId}-${assessment.label}-${assessment.date}`}>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="min-w-0 flex-1 truncate text-slate-700">{assessment.label}</span>
              <span className="text-xs text-slate-500">{formatOptionalDate(assessment.date)}</span>
              <span className="w-16 text-right font-semibold text-orange-600">
                {assessment.score === null || assessment.score === undefined ? "--" : `${assessment.score} /100`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-2 border-t border-slate-100 pt-4">
        <p className="text-sm font-bold text-slate-900">Quick Actions</p>
        <button className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-cyan-700 to-teal-600 text-sm font-bold text-white hover:from-cyan-800 hover:to-teal-700" onClick={() => onOpenDashboard("users")} type="button">
          <UserPlus className="h-4 w-4" />
          Open Patient Profile
        </button>
        <button className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-cyan-600 text-sm font-bold text-cyan-700 hover:bg-cyan-50" onClick={() => onOpenDashboard("feedback")} type="button">
          <FileText className="h-4 w-4" />
          View Feedback
        </button>
        <button className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-cyan-600 text-sm font-bold text-cyan-700 hover:bg-cyan-50" onClick={() => onOpenDashboard("videos")} type="button">
          <CalendarDays className="h-4 w-4" />
          View Movement Videos
        </button>
      </div>
    </aside>
  );
}

export function AdminPatientsPage() {
  const navigate = useNavigate();
  const patientsQuery = useQuery({
    queryFn: getAdminPatients,
    queryKey: ["admin", "patients"],
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [appointmentFilter, setAppointmentFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>();

  const rawPatients = patientsQuery.data?.patients ?? [];
  const stats = patientsQuery.data?.stats;

  const patients = useMemo(() => rawPatients.map(enrichPatient), [rawPatients]);

  const doctorOptions = useMemo(() => {
    const names = Array.from(new Set(patients.map((patient) => patient.assignedDoctorName))).sort();
    return [{ label: "All", value: "all" }, ...names.map((name) => ({ label: name, value: name }))];
  }, [patients]);

  const filteredPatients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return patients.filter((patient) => {
      const matchesQuery =
        !normalized ||
        patient.patientName.toLowerCase().includes(normalized) ||
        patient.patientId.toLowerCase().includes(normalized) ||
        patient.phone.toLowerCase().includes(normalized);
      const matchesDoctor = doctorFilter === "all" || patient.assignedDoctorName === doctorFilter;
      return matchesQuery && matchesDoctor && appointmentMatches(patient, appointmentFilter) && statusMatches(patient, statusFilter) && riskMatches(patient, riskFilter);
    });
  }, [appointmentFilter, doctorFilter, patients, query, riskFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const pagedPatients = filteredPatients.slice((page - 1) * pageSize, page * pageSize);
  const selectedPatient = filteredPatients.find((patient) => patient.patientId === selectedPatientId) ?? filteredPatients[0];

  function handleLogout() {
    clearAdminBackendAuthToken();
    navigate("/admin/login");
  }

  function openPatientDashboard(section: "users" | "videos" | "feedback" | "payload", patient = selectedPatient) {
    if (!patient) {
      navigate(`/admin/dashboard?section=${section}`);
      return;
    }
    navigate(`/admin/dashboard?section=${section}&user=${encodeURIComponent(patient.patientId)}`);
  }

  function exportFilteredPatients() {
    const headers = ["Patient ID", "Name", "Status", "Risk Level", "Assigned Doctor", "Phone", "Last Assessment"];
    const rows = filteredPatients.map((patient) => [
      patient.patientId,
      patient.patientName,
      patient.status,
      patient.riskLevel,
      patient.assignedDoctorName,
      patient.phone,
      patient.lastAssessmentAt ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-patients.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!isAuthExpiredError(patientsQuery.error)) return;

    clearAdminBackendAuthToken();
    navigate("/admin/login", {
      replace: true,
      state: { message: "Your admin session expired. Please sign in again." },
    });
  }, [navigate, patientsQuery.error]);

  useEffect(() => {
    setPage(1);
  }, [appointmentFilter, doctorFilter, query, riskFilter, statusFilter]);

  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].patientId);
    }
  }, [patients, selectedPatientId]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <AdminSidebar dark />
        <section className="min-w-0 flex-1 px-4 py-5 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">Patients</h1>
              <p className="mt-1 text-sm text-slate-600">Manage patients and their movement assessment records</p>
            </div>
            <Topbar
              onAudit={() => navigate("/admin/dashboard?section=audit")}
              onLogout={handleLogout}
              onSettings={() => navigate("/admin/dashboard?section=settings")}
            />
          </div>

          {patientsQuery.isLoading ? (
            <div className="mt-16 rounded-lg border border-slate-200 bg-white p-10">
              <LoadingSpinner label="Loading admin patient records" />
            </div>
          ) : null}

          {patientsQuery.isError ? (
            <div className="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">Patient records could not be loaded</p>
                  <p className="mt-1 text-sm">
                    {patientsQuery.error instanceof Error ? patientsQuery.error.message : "Start the backend and try again."}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {stats && !patientsQuery.isError ? (
            <>
              <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard icon={Users} label="Total Patients" tone="bg-cyan-700" trend={5.2} value={stats.totalPatients.toLocaleString()} />
                <StatCard icon={CheckCircle2} label="Active Patients" tone="bg-teal-600" trend={4.3} value={stats.activePatients.toLocaleString()} />
                <StatCard icon={AlertTriangle} label="High Risk" tone="bg-amber-500" trend={12.7} trendTone="orange" value={stats.highRiskPatients.toLocaleString()} />
                <StatCard icon={ClipboardCheck} label="Assessments (30 Days)" tone="bg-cyan-700" trend={8.1} value={stats.assessmentsLast30Days.toLocaleString()} />
                <StatCard icon={CheckCircle2} label="Completed" tone="bg-emerald-600" trend={7.4} value={stats.completedAssessments.toLocaleString()} />
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0">
                  <div className="rounded-t-lg border border-b-0 border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row">
                      <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <input
                          className="h-12 w-full rounded-md border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search patients by name, ID, or phone..."
                          value={query}
                        />
                      </div>
                      <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-cyan-700 to-teal-600 px-5 text-sm font-bold text-white hover:from-cyan-800 hover:to-teal-700" onClick={() => navigate("/admin/dashboard?section=users&create=patient")} type="button">
                        <Plus className="h-5 w-5" />
                        Add Patient
                      </button>
                      <button aria-label="Export patients" className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" onClick={exportFilteredPatients} type="button">
                        <Download className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <SelectFilter
                        label="Status"
                        onChange={setStatusFilter}
                        value={statusFilter}
                        values={[
                          { label: "All", value: "all" },
                          { label: "Active", value: "active" },
                          { label: "Inactive", value: "inactive" },
                        ]}
                      />
                      <SelectFilter label="Assigned Doctor" onChange={setDoctorFilter} value={doctorFilter} values={doctorOptions} />
                      <SelectFilter
                        icon={CalendarDays}
                        label="Appointment Date"
                        onChange={setAppointmentFilter}
                        value={appointmentFilter}
                        values={[
                          { label: "All Time", value: "all" },
                          { label: "Upcoming", value: "upcoming" },
                          { label: "Next 7 Days", value: "next7" },
                          { label: "None", value: "none" },
                        ]}
                      />
                      <SelectFilter
                        label="Risk Level"
                        onChange={setRiskFilter}
                        value={riskFilter}
                        values={[
                          { label: "All", value: "all" },
                          { label: "High", value: "high" },
                          { label: "Medium", value: "moderate" },
                          { label: "Low", value: "low" },
                          { label: "Unknown", value: "unknown" },
                        ]}
                      />
                      <button className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50" onClick={() => openPatientDashboard("users")} type="button">
                        <Filter className="h-4 w-4" />
                        Open Selected
                      </button>
                      <button
                        className="h-11 px-3 text-sm font-semibold text-slate-500 hover:text-slate-800"
                        onClick={() => {
                          setQuery("");
                          setStatusFilter("all");
                          setDoctorFilter("all");
                          setAppointmentFilter("all");
                          setRiskFilter("all");
                        }}
                        type="button"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {filteredPatients.length === 0 ? (
                    <div className="rounded-b-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
                      <Users className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-3 font-bold text-slate-900">No patients found</p>
                      <p className="mt-1 text-sm text-slate-500">Try clearing search or filters.</p>
                    </div>
                  ) : (
                    <PatientsTable
                      onSelect={(patient) => setSelectedPatientId(patient.patientId)}
                      patients={pagedPatients}
                      selectedPatientId={selectedPatient?.patientId}
                    />
                  )}

                  <div className="flex flex-col gap-3 rounded-b-lg border border-t-0 border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm md:flex-row md:items-center md:justify-between">
                    <p>
                      Showing {filteredPatients.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
                      {Math.min(page * pageSize, filteredPatients.length)} of {filteredPatients.length} patients
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        aria-label="Previous page"
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
                        disabled={page === 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        type="button"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: Math.min(3, totalPages) }, (_, index) => index + 1).map((pageNumber) => (
                        <button
                          className={cn(
                            "h-9 w-9 rounded-md border text-sm font-bold",
                            pageNumber === page ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-200 text-slate-700",
                          )}
                          key={pageNumber}
                          onClick={() => setPage(pageNumber)}
                          type="button"
                        >
                          {pageNumber}
                        </button>
                      ))}
                      {totalPages > 3 ? <span className="px-2 text-slate-400">...</span> : null}
                      {totalPages > 3 ? (
                        <button
                          className="h-9 min-w-10 rounded-md border border-slate-200 px-2 text-sm font-bold text-slate-700"
                          onClick={() => setPage(totalPages)}
                          type="button"
                        >
                          {totalPages}
                        </button>
                      ) : null}
                      <button
                        aria-label="Next page"
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
                        disabled={page === totalPages}
                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        type="button"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <PatientDetailPanel onOpenDashboard={openPatientDashboard} patient={selectedPatient} />
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
