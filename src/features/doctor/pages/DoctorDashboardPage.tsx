import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  Dumbbell,
  FileText,
  Layers,
  Play,
  RotateCcw,
  Search,
  Send,
  Stethoscope,
  Target,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  doctorPatientsMock,
  type DoctorEventMarker,
  type DoctorRiskLevel,
  type EventSeverity,
} from "@/features/doctor/data/doctor.mock";
import { getDoctorPatients, submitDoctorFeedback } from "@/features/doctor/api/doctorApi";
import { formatThaiShortDate } from "@/lib/formatDate";
import { cn } from "@/lib/cn";

const riskBadge: Record<DoctorRiskLevel, { label: string; tone: "green" | "yellow" | "red" }> = {
  low: { label: "Low Risk", tone: "green" },
  moderate: { label: "Moderate Risk", tone: "yellow" },
  high: { label: "High Risk", tone: "red" },
};

const statusBadge = {
  pending_review: { label: "รอตรวจ", tone: "yellow" as const },
  reviewed: { label: "ตรวจแล้ว", tone: "green" as const },
  processing: { label: "กำลังประมวลผล", tone: "blue" as const },
};

const eventTone: Record<EventSeverity, string> = {
  info: "bg-cyan-300",
  warning: "bg-amber-300",
  critical: "bg-rose-400",
};

export function DoctorDashboardPage() {
  const queryClient = useQueryClient();
  const doctorQuery = useQuery({
    queryKey: ["doctor", "sessions"],
    queryFn: getDoctorPatients,
  });
  const [query, setQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(doctorPatientsMock[0].id);
  const [selectedSessionId, setSelectedSessionId] = useState(doctorPatientsMock[0].sessions[0].id);
  const [selectedTaskId, setSelectedTaskId] = useState(doctorPatientsMock[0].sessions[0].tasks[0].id);
  const [reviewFrame, setReviewFrame] = useState(46);
  const [clinicalSummary, setClinicalSummary] = useState(
    "พบ pelvic drop ระหว่าง single-leg stance และ knee valgus tendency ระหว่าง sit-to-stand ควรติดตาม balance และ knee control",
  );
  const [patientSummary, setPatientSummary] = useState(
    "โดยรวมทำได้ดี แต่ควรฝึกการทรงตัวใกล้เก้าอี้ และถ่ายท่ายืนขาเดียวใหม่ให้เห็นเท้าชัดเจน",
  );
  const doctorPatients = doctorQuery.data?.length ? doctorQuery.data : doctorPatientsMock;
  const feedbackMutation = useMutation({
    mutationFn: submitDoctorFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor", "sessions"] });
    },
  });

  const filteredPatients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return doctorPatients;
    return doctorPatients.filter((patient) => patient.id.toLowerCase().includes(normalized));
  }, [doctorPatients, query]);

  const selectedPatient =
    doctorPatients.find((patient) => patient.id === selectedPatientId) ?? doctorPatients[0];
  const selectedSession =
    selectedPatient.sessions.find((session) => session.id === selectedSessionId) ??
    selectedPatient.sessions[0];
  const selectedTask =
    selectedSession.tasks.find((task) => task.id === selectedTaskId) ?? selectedSession.tasks[0];
  const sessionRisk = riskBadge[selectedSession.riskLevel];
  const taskRisk = riskBadge[selectedTask.riskLevel];
  const topFlags = selectedSession.tasks.flatMap((task) => task.flags).slice(0, 3);
  const averageQuality = Math.round(
    selectedSession.tasks.reduce((total, task) => total + task.qualityScore, 0) /
      selectedSession.tasks.length,
  );
  const selectedTaskVideoUrl = (selectedTask as typeof selectedTask & { videoUrl?: string }).videoUrl;

  function handleSelectPatient(patientId: string) {
    const patient = doctorPatients.find((item) => item.id === patientId);
    const nextSession = patient?.sessions[0];
    setSelectedPatientId(patientId);
    setSelectedSessionId(nextSession?.id ?? "");
    setSelectedTaskId(nextSession?.tasks[0]?.id ?? "");
    setReviewFrame(nextSession?.tasks[0]?.eventMarkers[0]?.frame ?? 42);
  }

  function handleSelectSession(sessionId: string) {
    const session = selectedPatient.sessions.find((item) => item.id === sessionId);
    setSelectedSessionId(sessionId);
    setSelectedTaskId(session?.tasks[0]?.id ?? "");
    setReviewFrame(session?.tasks[0]?.eventMarkers[0]?.frame ?? 42);
  }

  function handleSelectTask(taskId: string) {
    const task = selectedSession.tasks.find((item) => item.id === taskId);
    setSelectedTaskId(taskId);
    setReviewFrame(task?.eventMarkers[0]?.frame ?? 42);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1500px] flex-col gap-4 lg:min-h-[calc(100vh-3rem)]">
        <header className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-slate-950">Doctor Motion Review</h1>
              <p className="text-sm text-slate-500">
                Review one patient session with 4 movement videos, event markers, and structured feedback
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="yellow">รอตรวจ 1 session</Badge>
            <Badge tone="red">High risk 1 session</Badge>
            <Badge tone={averageQuality >= 90 ? "green" : "yellow"}>Avg quality {averageQuality}</Badge>
          </div>
        </header>

        <div className="grid flex-1 gap-4 xl:grid-cols-[290px_minmax(520px,1fr)_430px]">
          <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <Input
                aria-label="ค้นหาด้วย Patient ID"
                className="pl-9"
                name="patient-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหา Patient ID"
                value={query}
              />
              <Search className="pointer-events-none -mt-7 ml-3 h-4 w-4 text-slate-400" />
            </div>

            <div className="max-h-[calc(100vh-220px)] overflow-y-auto p-3">
              {filteredPatients.map((patient) => (
                <div className="space-y-2" key={patient.id}>
                  <button
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition",
                      selectedPatient.id === patient.id
                        ? "border-cyan-300 bg-cyan-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                    onClick={() => handleSelectPatient(patient.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{patient.id}</p>
                        <p className="mt-1 text-xs text-slate-500">Age {patient.age}</p>
                      </div>
                      <Badge tone={statusBadge[patient.sessions[0].status].tone}>
                        {statusBadge[patient.sessions[0].status].label}
                      </Badge>
                    </div>
                  </button>

                  {selectedPatient.id === patient.id ? (
                    <div className="ml-3 space-y-2 border-l border-slate-200 pl-3">
                      {patient.sessions.map((session) => (
                        <button
                          className={cn(
                            "w-full rounded-md px-3 py-2 text-left text-sm transition",
                            selectedSession.id === session.id
                              ? "bg-slate-900 text-white"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                          )}
                          key={session.id}
                          onClick={() => handleSelectSession(session.id)}
                          type="button"
                        >
                          <span className="block font-medium">Assessment Session</span>
                          <span className="mt-1 flex items-center gap-1 text-xs opacity-75">
                            <CalendarDays className="h-3 w-3" />
                            {formatThaiShortDate(session.createdAt)}
                          </span>
                          <span className="mt-1 flex items-center gap-1 text-xs opacity-75">
                            <Layers className="h-3 w-3" />
                            {session.tasks.length} movement videos
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{selectedPatient.id}</p>
                  <p className="text-sm text-slate-500">
                    Assessment Session | {selectedSession.tasks.length} movement videos
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={sessionRisk.tone}>Session: {sessionRisk.label}</Badge>
                  <Badge tone={averageQuality >= 90 ? "green" : "yellow"}>Video quality {averageQuality}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {selectedSession.tasks.map((task) => (
                  <button
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-xs font-medium transition",
                      selectedTask.id === task.id
                        ? "border-cyan-300 bg-cyan-50 text-cyan-950"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                    key={task.id}
                    onClick={() => handleSelectTask(task.id)}
                    type="button"
                  >
                    <span className="block">{task.taskLabel}</span>
                    <span className="mt-1 block text-[11px] opacity-70">Q {task.qualityScore}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                <div className="aspect-video bg-[linear-gradient(145deg,#1e293b,#020617)]">
                  {selectedTaskVideoUrl ? (
                    <video
                      className="h-full w-full object-contain"
                      controls
                      playsInline
                      src={selectedTaskVideoUrl}
                    />
                  ) : (
                    <SkeletonOverlay />
                  )}
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
                    <Play className="h-3.5 w-3.5 fill-white" />
                    {selectedTask.taskLabel}
                  </div>
                  <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
                    Frame {reviewFrame}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/50 p-3">
                    <div className="relative mb-2 h-4">
                      {selectedTask.eventMarkers.map((marker) => (
                        <button
                          aria-label={marker.label}
                          className={cn(
                            "absolute top-1 h-3 w-3 -translate-x-1/2 rounded-full ring-2 ring-white/80",
                            eventTone[marker.severity],
                          )}
                          key={`${marker.frame}-${marker.label}`}
                          onClick={() => setReviewFrame(marker.frame)}
                          style={{ left: `${marker.frame}%` }}
                          type="button"
                        />
                      ))}
                    </div>
                    <input
                      aria-label="Frame timeline"
                      className="h-2 w-full accent-cyan-400"
                      max={100}
                      min={0}
                      onChange={(event) => setReviewFrame(Number(event.target.value))}
                      type="range"
                      value={reviewFrame}
                    />
                    <div className="mt-2 flex justify-between text-xs text-white/70">
                      <span>Frame {reviewFrame}</span>
                      <span>{nearestMarker(selectedTask.eventMarkers, reviewFrame)?.label ?? selectedTask.flags[0]}</span>
                    </div>
                  </div>
                </div>
              </div>

              <section className="grid gap-3 md:grid-cols-[1fr_220px]">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-700" />
                    <p className="text-sm font-semibold text-slate-950">Clinical Kinematic Graphs</p>
                  </div>
                  <div className="mt-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedTask.chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="frame" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="knee" name="Knee angle" stroke="#0e7490" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="hip" name="Hip / trunk" stroke="#059669" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="symmetry" name="Symmetry" stroke="#b45309" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-950">Reference Compare</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs">
                    <div className="rounded-md bg-slate-50 p-3">
                      <MiniSkeleton tone="cyan" />
                      <p className="mt-2 font-medium text-slate-700">Patient</p>
                    </div>
                    <div className="rounded-md bg-emerald-50 p-3">
                      <MiniSkeleton tone="emerald" />
                      <p className="mt-2 font-medium text-slate-700">Reference</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    V1 uses a visual reference placeholder inspired by motion lab review tools. No external dataset is imported yet.
                  </p>
                </div>
              </section>

              <div className="grid gap-3 md:grid-cols-3">
                {selectedTask.metrics.map((metric) => (
                  <div
                    className={cn(
                      "rounded-lg border p-4",
                      metric.tone === "rose"
                        ? "border-rose-200 bg-rose-50"
                        : metric.tone === "amber"
                          ? "border-amber-200 bg-amber-50"
                          : metric.tone === "cyan"
                            ? "border-cyan-200 bg-cyan-50"
                            : "border-slate-200 bg-slate-50",
                    )}
                    key={metric.label}
                  >
                    <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <section className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Clinical Summary</p>
                  <p className="mt-1 text-xs text-slate-500">Session-level triage</p>
                </div>
                <Badge tone={sessionRisk.tone}>{sessionRisk.label}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                <SummaryStat label="AI confidence" value={`${selectedTask.confidence}%`} />
                <SummaryStat label="Video quality" value={`${selectedTask.qualityScore}/100`} />
              </div>
              <div className="mt-4 rounded-md bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended action</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{selectedTask.recommendedAction}</p>
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-sm font-semibold text-slate-950">Top Flags</p>
              {topFlags.map((flag) => (
                <div
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800"
                  key={flag}
                >
                  {flag}
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <p className="text-sm font-semibold text-slate-950">Event Markers</p>
              {selectedTask.eventMarkers.map((marker) => (
                <button
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                  key={`${marker.frame}-${marker.label}`}
                  onClick={() => setReviewFrame(marker.frame)}
                  type="button"
                >
                  <span>{marker.label}</span>
                  <Badge tone={marker.severity === "critical" ? "red" : marker.severity === "warning" ? "yellow" : "cyan"}>
                    F{marker.frame}
                  </Badge>
                </button>
              ))}
            </section>

            {selectedTask.qualityIssues.length > 0 ? (
              <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <p className="text-sm font-semibold text-amber-950">Video Quality Issue</p>
                </div>
                {selectedTask.qualityIssues.map((issue) => (
                  <p className="text-sm leading-6 text-amber-900" key={issue}>{issue}</p>
                ))}
              </section>
            ) : null}

            <section className="space-y-3 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-950">Structured Feedback Builder</p>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-500">Clinical note</span>
                <textarea
                  className="min-h-[86px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setClinicalSummary(event.target.value)}
                  value={clinicalSummary}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-500">Patient-friendly summary</span>
                <textarea
                  className="min-h-[86px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setPatientSummary(event.target.value)}
                  value={patientSummary}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <FeedbackAction icon={<Dumbbell className="h-4 w-4" />} label="Exercise plan" />
                <FeedbackAction icon={<RotateCcw className="h-4 w-4" />} label="Retake task" />
              </div>
              <Button
                className="w-full"
                icon={<Send className="h-4 w-4" />}
                onClick={() =>
                  feedbackMutation.mutate({
                    clinicalSummary,
                    patientSummary,
                    sessionId: selectedSession.id,
                  })
                }
              >
                {feedbackMutation.isPending ? "กำลังส่ง..." : "ส่ง Structured Feedback"}
              </Button>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function nearestMarker(markers: DoctorEventMarker[], frame: number) {
  return markers.reduce<DoctorEventMarker | undefined>((nearest, marker) => {
    if (!nearest) return marker;
    return Math.abs(marker.frame - frame) < Math.abs(nearest.frame - frame) ? marker : nearest;
  }, undefined);
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-base font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-slate-500">{label}</p>
    </div>
  );
}

function FeedbackAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function MiniSkeleton({ tone }: { tone: "cyan" | "emerald" }) {
  const color = tone === "cyan" ? "bg-cyan-600" : "bg-emerald-600";
  return (
    <div className="mx-auto h-20 w-12">
      <div className={cn("mx-auto h-5 w-5 rounded-full", color)} />
      <div className={cn("mx-auto mt-1 h-8 w-1 rounded-full", color)} />
      <div className="mx-auto mt-1 flex justify-center gap-4">
        <div className={cn("h-8 w-1 rotate-12 rounded-full", color)} />
        <div className={cn("h-8 w-1 -rotate-12 rounded-full", color)} />
      </div>
    </div>
  );
}

function SkeletonOverlay() {
  const joints = [
    [50, 18],
    [50, 30],
    [38, 38],
    [62, 38],
    [34, 56],
    [66, 56],
    [43, 70],
    [57, 70],
    [39, 90],
    [61, 90],
  ];
  const lines = [
    [0, 1],
    [1, 2],
    [1, 3],
    [2, 4],
    [3, 5],
    [1, 6],
    [1, 7],
    [6, 8],
    [7, 9],
  ];

  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {lines.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          stroke="#67e8f9"
          strokeLinecap="round"
          strokeWidth="1.2"
          x1={joints[from][0]}
          x2={joints[to][0]}
          y1={joints[from][1]}
          y2={joints[to][1]}
        />
      ))}
      {joints.map(([x, y], index) => (
        <circle cx={x} cy={y} fill="#ecfeff" key={index} r="1.7" />
      ))}
    </svg>
  );
}
