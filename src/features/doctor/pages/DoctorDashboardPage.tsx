import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Layers,
  LogOut,
  Play,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Stethoscope,
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
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { DoctorEventMarker, DoctorPatient, DoctorRiskLevel, DoctorSession, EventSeverity } from "@/features/doctor/data/doctor.mock";
import {
  getDoctorPatients,
  getDoctorTaskVideoUrl,
  retryAnalysisJob,
  submitDoctorFeedback,
} from "@/features/doctor/api/doctorApi";
import { formatShortDate } from "@/lib/formatDate";
import { cn } from "@/lib/cn";
import { clearDoctorBackendAuthToken, isAuthExpiredError } from "@/lib/backendApi";
import type { DoctorFeedbackSeverity } from "@/features/patient/types/patient.types";

const riskBadge: Record<DoctorRiskLevel, { label: string; tone: "green" | "yellow" | "red" }> = {
  high: { label: "High Risk", tone: "red" },
  low: { label: "Low Risk", tone: "green" },
  moderate: { label: "Moderate Risk", tone: "yellow" },
  unknown: { label: "Unknown Risk", tone: "yellow" },
};

const statusBadge = {
  analysis_failed: { label: "Analysis failed", tone: "red" as const },
  pending_review: { label: "Ready for review", tone: "yellow" as const },
  processing: { label: "Processing", tone: "blue" as const },
  reviewed: { label: "Reviewed", tone: "green" as const },
};

const eventTone: Record<EventSeverity, string> = {
  critical: "bg-rose-400",
  info: "bg-cyan-300",
  warning: "bg-amber-300",
};

function feedbackSeverityForRisk(riskLevel: DoctorRiskLevel): DoctorFeedbackSeverity {
  if (riskLevel === "high") return "high";
  if (riskLevel === "moderate") return "moderate";
  return "low";
}

function getLatestSession(patient: DoctorPatient) {
  return patient.sessions[0];
}

function getPatientInitials(patient: DoctorPatient) {
  const source = patient.displayName && patient.displayName !== patient.id ? patient.displayName : patient.id;
  const words = source
    .replace(/patient[-_\s]*/i, "")
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return (words[0] ?? patient.id).slice(0, 2).toUpperCase();
}

function formatSessionCount(count: number) {
  return `${count} ${count === 1 ? "session" : "sessions"}`;
}

export function DoctorDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const doctorQuery = useQuery({
    queryKey: ["doctor", "sessions"],
    queryFn: getDoctorPatients,
  });
  const [query, setQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [expandedPatientId, setExpandedPatientId] = useState("");

  // reviewFrame tracks 0-100 progress of the video
  const [reviewFrame, setReviewFrame] = useState(0);
  const [clinicalSummary, setClinicalSummary] = useState(
    "Review movement quality, risk flags, and video quality before sending feedback.",
  );
  const [patientSummary, setPatientSummary] = useState(
    "Your movement videos were reviewed. Please follow the recommendations from your care team.",
  );
  const [recommendationsText, setRecommendationsText] = useState(
    "Continue the home exercise plan and stop if pain or dizziness increases.",
  );
  const [retakeSelectedTask, setRetakeSelectedTask] = useState(false);
  const [exerciseTitle, setExerciseTitle] = useState("Supported range-of-motion practice");
  const [exerciseFrequency, setExerciseFrequency] = useState("Daily");
  const [exerciseSets, setExerciseSets] = useState("2 sets");
  const [exerciseReps, setExerciseReps] = useState("8-10 reps");
  const [exerciseSafetyNote, setExerciseSafetyNote] = useState(
    "Use a stable chair or counter for support and stop if symptoms worsen.",
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthExpiredError(doctorQuery.error)) return;

    clearDoctorBackendAuthToken();
    queryClient.removeQueries({ queryKey: ["doctor"] });
    navigate("/doctor/login", {
      replace: true,
      state: { message: "Your doctor session expired. Please sign in again." },
    });
  }, [doctorQuery.error, navigate, queryClient]);

  const feedbackMutation = useMutation({
    mutationFn: submitDoctorFeedback,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctor", "sessions"] }),
  });
  const retryMutation = useMutation({
    mutationFn: retryAnalysisJob,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctor", "sessions"] }),
  });

  const doctorPatients = doctorQuery.data ?? [];
  const filteredPatients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return doctorPatients;
    return doctorPatients.filter((patient) =>
      [patient.id, patient.displayName].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [doctorPatients, query]);

  const selectedPatient = doctorPatients.find((patient) => patient.id === selectedPatientId) ?? doctorPatients[0];
  const selectedSession =
    selectedPatient?.sessions.find((session) => session.id === selectedSessionId) ?? selectedPatient?.sessions[0];
  const selectedTask =
    selectedSession?.tasks.find((task) => task.id === selectedTaskId) ?? selectedSession?.tasks[0];
  const selectedTaskFileId = selectedTask?.fileId;
  const videoUrlQuery = useQuery({
    enabled: Boolean(selectedTaskFileId),
    queryFn: () => getDoctorTaskVideoUrl(selectedTaskFileId!),
    queryKey: ["doctor", "video-url", selectedTaskFileId],
    staleTime: 1000 * 60 * 4,
  });

  useEffect(() => {
    if (expandedPatientId || doctorPatients.length === 0) return;
    setExpandedPatientId(doctorPatients[0].id);
  }, [doctorPatients, expandedPatientId]);

  // Sync video state and reset on task change
  useEffect(() => {
    const firstMarkerFrame = selectedTask?.eventMarkers?.[0]?.frame ?? 0;
    setReviewFrame(firstMarkerFrame);
    setVideoLoadError(null);
    setDuration(0);
    if (videoRef.current) {
      videoRef.current.load();
    }
    if (selectedTask) {
      setRetakeSelectedTask(selectedTask.riskLevel === "high" || (selectedTask.qualityScore ?? 100) < 80);
    }
  }, [selectedPatientId, selectedSessionId, selectedTaskId, selectedTask]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setDuration(video.duration || 0);
    setVideoLoadError(null);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration) {
      setReviewFrame((video.currentTime / video.duration) * 100);
    }
  };

  const handleVideoError = () => {
    setVideoLoadError("Failed to load task video. Refreshing the secure playback link may fix an expired token.");
    if (selectedTaskFileId) {
      queryClient.invalidateQueries({ queryKey: ["doctor", "video-url", selectedTaskFileId] });
    }
  };

  const handleFrameChange = (framePercent: number) => {
    setReviewFrame(framePercent);
    if (videoRef.current && duration) {
      videoRef.current.currentTime = (duration * framePercent) / 100;
    }
  };

  function handleLogout() {
    clearDoctorBackendAuthToken();
    queryClient.removeQueries({ queryKey: ["doctor"] });
    navigate("/doctor/login", {
      replace: true,
      state: { message: "ออกจากระบบเรียบร้อยแล้ว" },
    });
  }

  if (doctorQuery.isLoading) {
    return <DoctorShell><LoadingSpinner label="Loading doctor sessions" /></DoctorShell>;
  }

  if (doctorQuery.isError) {
    const errorMessage =
      doctorQuery.error instanceof Error
        ? doctorQuery.error.message
        : "Start MongoDB and the FastAPI backend, then refresh this page.";

    return (
      <DoctorShell>
        <StatusPanel
          tone="rose"
          title="Doctor sessions could not be loaded"
          body={errorMessage}
          actionHref="/doctor/login"
          actionLabel="Go to doctor login"
        />
      </DoctorShell>
    );
  }

  if (!selectedPatient || !selectedSession) {
    return (
      <DoctorShell>
        <StatusPanel
          tone="slate"
          title="No submitted sessions yet"
          body="Submit a patient assessment first. This dashboard now shows only sessions loaded from the backend."
        />
      </DoctorShell>
    );
  }

  const sessionRisk = selectedSession ? riskBadge[selectedSession.riskLevel] : { label: "Unknown Risk", tone: "yellow" as const };
  const taskRisk = selectedTask ? riskBadge[selectedTask.riskLevel] : { label: "Unknown Risk", tone: "yellow" as const };
  const selectedTaskVideoUrl = videoUrlQuery.data;

  const topFlags = selectedSession.tasks ? selectedSession.tasks.flatMap((task) => task.flags).slice(0, 4) : [];
  const averageQuality = selectedSession.tasks && selectedSession.tasks.length > 0
    ? Math.round(
        selectedSession.tasks.reduce((total, task) => total + (task.qualityScore ?? 0), 0) / selectedSession.tasks.length,
      )
    : "N/A";

  const canSendFeedback = selectedSession.status === "pending_review" || selectedSession.status === "reviewed";
  const canRetry = selectedSession.status === "analysis_failed" && Boolean(selectedSession.analysisJobId);

  const recommendations = recommendationsText
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const taskNotes = selectedSession.tasks.map((task) => {
    const severity = feedbackSeverityForRisk(task.riskLevel);
    return {
      clinicalNote:
        task.flags.length > 0
          ? `${task.taskLabel}: ${task.flags.join("; ")}`
          : `${task.taskLabel}: no major movement flags detected.`,
      movementType: task.movementType,
      patientAction:
        severity === "high"
          ? "Please repeat this movement only if your care team asks you to, and use support for safety."
          : severity === "moderate"
            ? "Move slowly, keep support nearby, and follow the home practice plan."
            : "Continue practicing this movement gently within a comfortable range.",
      severity,
      title: task.recommendedAction,
    };
  });
  const exercisePlan = exerciseTitle.trim()
    ? [
        {
          frequency: exerciseFrequency.trim() || "Daily",
          id: "home-rom-practice",
          reps: exerciseReps.trim() || "8-10 reps",
          safetyNote: exerciseSafetyNote.trim() || "Stop if pain or dizziness increases.",
          sets: exerciseSets.trim() || "2 sets",
          title: exerciseTitle.trim(),
        },
      ]
    : [];
  const retakeRequests =
    retakeSelectedTask && selectedTask
      ? [
          {
            movementType: selectedTask.movementType,
            priority: feedbackSeverityForRisk(selectedTask.riskLevel),
            reason: `Please retake ${selectedTask.taskLabel} because the current review needs a clearer clip or manual follow-up.`,
          },
        ]
      : [];

  const isFeedbackEmpty = clinicalSummary.trim() === "" && patientSummary.trim() === "";
  const isSendDisabled = !canSendFeedback || feedbackMutation.isPending || isFeedbackEmpty;

  function handleSelectPatient(patientId: string) {
    const patient = doctorPatients.find((item) => item.id === patientId);
    const nextSession = patient?.sessions[0];
    const isCurrentPatient = selectedPatient?.id === patientId;

    if (isCurrentPatient) {
      setExpandedPatientId((currentPatientId) => (currentPatientId === patientId ? "" : patientId));
      return;
    }

    setSelectedPatientId(patientId);
    setSelectedSessionId(nextSession?.id ?? "");
    setSelectedTaskId(nextSession?.tasks[0]?.id ?? "");
    setExpandedPatientId(patientId);
  }

  function handleSelectSession(sessionId: string) {
    const session = selectedPatient.sessions.find((item) => item.id === sessionId);
    setSelectedSessionId(sessionId);
    setSelectedTaskId(session?.tasks[0]?.id ?? "");
  }

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 lg:p-6" data-testid="doctor-dashboard">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1500px] flex-col gap-4">
        <header className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-slate-950">Doctor Motion Review</h1>
              <p className="text-sm text-slate-500">Backend-backed demo dashboard for submitted movement sessions</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusBadge[selectedSession.status].tone}>{statusBadge[selectedSession.status].label}</Badge>
            <Badge tone={sessionRisk.tone}>{sessionRisk.label}</Badge>
            <Badge tone={averageQuality !== "N/A" && averageQuality >= 90 ? "green" : "yellow"}>
              Avg quality {averageQuality}
            </Badge>
            <Button
              aria-label="ออกจากระบบ"
              className="h-10 w-10 shrink-0 rounded-full sm:h-9 sm:w-9"
              icon={<LogOut className="h-4 w-4" />}
              onClick={handleLogout}
              size="icon"
              variant="outline"
              title="ออกจากระบบ"
            >
              <span className="sr-only">ออกจากระบบ</span>
            </Button>
          </div>
        </header>

        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Demo mode: authentication uses local mock tokens that expire based on the backend TTL. Sign in again when a session expires.
        </p>

        {selectedSession.status === "analysis_failed" ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Analysis failed</p>
                <p className="mt-1 leading-6">{selectedSession.analysisJobError ?? "MediaPipe analysis failed."}</p>
              </div>
              {canRetry ? (
                <Button
                  disabled={retryMutation.isPending}
                  icon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => retryMutation.mutate(selectedSession.analysisJobId!)}
                  size="sm"
                  variant="outline"
                >
                  Retry
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid flex-1 gap-4 xl:grid-cols-[340px_minmax(520px,1fr)_430px]">
          <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="space-y-5 border-b border-slate-100 p-4">
              <div className="relative">
                <Input
                  aria-label="Search patient"
                  className="h-12 rounded-lg pl-11 text-base"
                  name="patient-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search patient"
                  value={query}
                />
                <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-950">Patients</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">
                    {doctorPatients.length}
                  </span>
                </div>
                <span aria-hidden="true" className="rounded-md p-1.5 text-slate-500">
                  <SlidersHorizontal className="h-5 w-5" />
                </span>
              </div>
            </div>
            <div className="max-h-[calc(100vh-250px)] space-y-3 overflow-y-auto p-3">
              {filteredPatients.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No patients match this search.
                </div>
              ) : (
                filteredPatients.map((patient) => {
                  const latestSession = getLatestSession(patient);
                  const isSelectedPatient = selectedPatient.id === patient.id;
                  const isExpandedPatient = expandedPatientId === patient.id;
                  const sessionListId = `patient-sessions-${patient.id}`;

                  return (
                    <div className="space-y-2" key={patient.id}>
                      <button
                        aria-controls={latestSession ? sessionListId : undefined}
                        aria-expanded={latestSession ? isExpandedPatient : undefined}
                        className={cn(
                          "w-full rounded-lg border p-4 text-left transition",
                          isSelectedPatient
                            ? "border-cyan-500 bg-cyan-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                        )}
                        onClick={() => handleSelectPatient(patient.id)}
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold",
                              isSelectedPatient ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {getPatientInitials(patient)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-slate-950">{patient.id}</p>
                                <p className="mt-1 truncate text-sm text-slate-500">{patient.displayName}</p>
                              </div>
                              {latestSession ? (
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                                    isSelectedPatient
                                      ? "bg-cyan-100 text-cyan-700"
                                      : latestSession.status === "analysis_failed"
                                        ? "bg-rose-50 text-rose-700"
                                        : "bg-amber-50 text-amber-700",
                                  )}
                                >
                                  {formatSessionCount(patient.sessions.length)}
                                </span>
                              ) : (
                                <Badge tone="slate">No Sessions</Badge>
                              )}
                            </div>
                            {isSelectedPatient && latestSession ? (
                              <p className="mt-2 text-xs text-slate-600">
                                Last update {formatShortDate(latestSession.createdAt)}
                              </p>
                            ) : null}
                          </div>
                          {isSelectedPatient ? (
                            isExpandedPatient ? (
                              <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                            )
                          ) : (
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                          )}
                        </div>
                      </button>

                      {isExpandedPatient && latestSession ? (
                        <div className="ml-8 border-l-2 border-cyan-500 pb-2 pl-5" id={sessionListId}>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="-ml-[27px] h-px w-5 bg-cyan-500" />
                            <p className="text-sm font-semibold text-slate-950">Sessions</p>
                          </div>
                          <div className="space-y-3">
                            {patient.sessions.map((session) => (
                              <SessionListButton
                                isSelected={selectedSession.id === session.id}
                                key={session.id}
                                onSelect={() => handleSelectSession(session.id)}
                                session={session}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {selectedSession.tasks.length === 0 ? (
            <div className="col-span-1 xl:col-span-2 flex h-[500px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
              <AlertTriangle className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">No tasks in this session</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-md">
                This assessment session does not contain any movement videos. Please record or upload a task first.
              </p>
            </div>
          ) : (
            <>
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{selectedPatient.id}</p>
                      <p className="text-sm text-slate-500">Assessment Session | {selectedSession.tasks.length} videos</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={sessionRisk.tone}>Session: {sessionRisk.label}</Badge>
                      <Badge tone={averageQuality !== "N/A" && averageQuality >= 90 ? "green" : "yellow"}>
                        Video quality {averageQuality}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                    {selectedSession.tasks.map((task) => (
                      <button
                        className={cn(
                          "rounded-md border px-3 py-2 text-left text-xs font-medium transition",
                          selectedTask?.id === task.id
                            ? "border-cyan-300 bg-cyan-50 text-cyan-950"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                        )}
                        key={task.id}
                        onClick={() => handleSelectTask(task.id)}
                        type="button"
                      >
                        <span className="block">{task.taskLabel}</span>
                        <span className="mt-1 block text-[11px] opacity-70">Q {task.qualityScore ?? "N/A"}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                    <div className="aspect-video bg-[linear-gradient(145deg,#1e293b,#020617)] relative flex items-center justify-center">
                      {selectedTaskVideoUrl ? (
                        <>
                          <video
                            ref={videoRef}
                            className="h-full w-full object-contain"
                            controls
                            playsInline
                            src={selectedTaskVideoUrl}
                            onLoadedMetadata={handleLoadedMetadata}
                            onTimeUpdate={handleTimeUpdate}
                            onError={handleVideoError}
                          />
                          {videoLoadError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-4 text-center">
                              <AlertTriangle className="h-10 w-10 text-rose-500 mb-2 animate-bounce" />
                              <p className="text-sm font-semibold text-white">{videoLoadError}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-4">
                          <SkeletonOverlay />
                          <p className="mt-2 text-sm text-cyan-200/80">
                            {videoUrlQuery.isFetching ? "Preparing secure playback link..." : "No uploaded video for this task."}
                          </p>
                        </div>
                      )}

                      {selectedTask && (
                        <>
                          <div className="absolute left-4 top-4 pointer-events-none flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
                            <Play className="h-3.5 w-3.5 fill-white" />
                            {selectedTask.taskLabel}
                          </div>
                          <div className="absolute right-4 top-4 pointer-events-none rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white">
                            Frame {Math.round(reviewFrame)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedTask && (
                    <div className="relative h-24 rounded-lg bg-slate-900 border border-slate-800 p-1">
                      <Timeline
                        frame={reviewFrame}
                        markers={selectedTask.eventMarkers}
                        onFrameChange={handleFrameChange}
                        fallbackLabel={selectedTask.flags[0]}
                      />
                    </div>
                  )}

                  <section className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-700" />
                      <p className="text-sm font-semibold text-slate-950">Clinical Kinematic Graphs</p>
                    </div>
                    <div className="mt-4 h-56 flex items-center justify-center">
                      {!selectedTask || !selectedTask.chartData || selectedTask.chartData.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-500 text-sm">
                          No analysis metrics yet
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </section>

                  {!selectedTask || !selectedTask.metrics || selectedTask.metrics.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                      No analysis metrics yet
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-3">
                      {selectedTask.metrics.map((metric) => (
                        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4" key={metric.label}>
                          <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">{metric.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                {selectedTask && (
                  <section className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Clinical Summary</p>
                        <p className="mt-1 text-xs text-slate-500">Session-level triage</p>
                      </div>
                      <Badge tone={taskRisk.tone}>{taskRisk.label}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                      <SummaryStat label="AI confidence" value={selectedTask.confidence === null ? "N/A" : `${selectedTask.confidence}%`} />
                      <SummaryStat label="Video quality" value={selectedTask.qualityScore === null ? "N/A" : `${selectedTask.qualityScore}/100`} />
                    </div>
                    <div className="mt-4 rounded-md bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Recommended action</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{selectedTask.recommendedAction}</p>
                    </div>
                  </section>
                )}

                <section className="space-y-2">
                  <p className="text-sm font-semibold text-slate-950">Top Flags</p>
                  {topFlags.length === 0 ? (
                    <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
                      No flags triggered.
                    </div>
                  ) : (
                    topFlags.map((flag) => (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800" key={flag}>
                        {flag}
                      </div>
                    ))
                  )}
                </section>

                <section className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-950">Structured Feedback Builder</p>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-slate-500">Clinical note</span>
                    <textarea
                      className="min-h-[86px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      onChange={(event) => setClinicalSummary(event.target.value)}
                      value={clinicalSummary}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-slate-500">Patient-friendly summary</span>
                    <textarea
                      className="min-h-[86px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      data-testid="doctor-feedback-patient-summary"
                      onChange={(event) => setPatientSummary(event.target.value)}
                      value={patientSummary}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-slate-500">Patient recommendations</span>
                    <textarea
                      className="min-h-[70px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      onChange={(event) => setRecommendationsText(event.target.value)}
                      value={recommendationsText}
                    />
                  </label>
                  <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-slate-500">Exercise plan</p>
                    <input
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                      onChange={(event) => setExerciseTitle(event.target.value)}
                      placeholder="Exercise title"
                      value={exerciseTitle}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm"
                        onChange={(event) => setExerciseFrequency(event.target.value)}
                        placeholder="Frequency"
                        value={exerciseFrequency}
                      />
                      <input
                        className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm"
                        onChange={(event) => setExerciseSets(event.target.value)}
                        placeholder="Sets"
                        value={exerciseSets}
                      />
                      <input
                        className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm"
                        onChange={(event) => setExerciseReps(event.target.value)}
                        placeholder="Reps"
                        value={exerciseReps}
                      />
                    </div>
                    <input
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                      onChange={(event) => setExerciseSafetyNote(event.target.value)}
                      placeholder="Safety note"
                      value={exerciseSafetyNote}
                    />
                  </div>
                  {selectedTask ? (
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
                      <input
                        checked={retakeSelectedTask}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
                        onChange={(event) => setRetakeSelectedTask(event.target.checked)}
                        type="checkbox"
                      />
                      <span>
                        <span className="block font-semibold text-slate-900">Request retake for {selectedTask.taskLabel}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          This adds a patient-visible retake request to the feedback.
                        </span>
                      </span>
                    </label>
                  ) : null}
                  {!canSendFeedback ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Feedback is disabled until analysis is ready for doctor review.
                    </p>
                  ) : null}
                  {feedbackMutation.isSuccess && (
                    <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" data-testid="doctor-feedback-success">
                      Feedback sent to patient.
                    </p>
                  )}
                  {feedbackMutation.isError && (
                    <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                      {feedbackMutation.error instanceof Error
                        ? feedbackMutation.error.message
                        : "Failed to send feedback. Please try again."}
                    </p>
                  )}
                  <Button
                    className="w-full"
                    data-testid="doctor-send-feedback"
                    disabled={isSendDisabled}
                    icon={<Send className="h-4 w-4" />}
                    onClick={() =>
                      feedbackMutation.mutate({
                        clinicalSummary,
                        exercisePlan,
                        patientSummary,
                        recommendations,
                        retakeRequests,
                        sessionId: selectedSession.id,
                        taskNotes,
                      })
                    }
                  >
                    {feedbackMutation.isPending ? "Sending..." : "Send Structured Feedback"}
                  </Button>
                </section>
              </aside>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function DoctorShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1500px] items-center justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}

function StatusPanel({
  actionHref,
  actionLabel,
  body,
  title,
  tone,
}: {
  actionHref?: string;
  actionLabel?: string;
  body: string;
  title: string;
  tone: "rose" | "slate";
}) {
  return (
    <div className={cn("max-w-2xl rounded-lg border p-6", tone === "rose" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white")}>
      <p className={cn("text-lg font-semibold", tone === "rose" ? "text-rose-800" : "text-slate-950")}>{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      {actionHref && actionLabel ? (
        <Link
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800"
          to={actionHref}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function SessionListButton({
  isSelected,
  onSelect,
  session,
}: {
  isSelected: boolean;
  onSelect: () => void;
  session: DoctorSession;
}) {
  const status = statusBadge[session.status];

  return (
    <button
      className={cn(
        "w-full rounded-lg border p-3 text-left transition",
        isSelected
          ? "border-slate-900 bg-slate-950 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50",
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
            isSelected ? "border-white/10 bg-white text-slate-900" : "border-slate-200 bg-slate-50 text-slate-700",
          )}
        >
          <CalendarDays className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("font-semibold", isSelected ? "text-white" : "text-slate-950")}>Assessment Session</p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                isSelected && session.status === "pending_review" && "bg-transparent text-amber-300 ring-amber-400",
                isSelected && session.status === "analysis_failed" && "bg-transparent text-rose-200 ring-rose-300",
                isSelected && session.status === "processing" && "bg-transparent text-cyan-200 ring-cyan-300",
                isSelected && session.status === "reviewed" && "bg-transparent text-emerald-200 ring-emerald-300",
                !isSelected && status.tone === "yellow" && "bg-amber-50 text-amber-700 ring-amber-200",
                !isSelected && status.tone === "red" && "bg-rose-50 text-rose-700 ring-rose-200",
                !isSelected && status.tone === "blue" && "bg-blue-50 text-blue-700 ring-blue-200",
                !isSelected && status.tone === "green" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
              )}
            >
              {status.label}
            </span>
          </div>
          <span className={cn("mt-2 flex items-center gap-1.5 text-sm", isSelected ? "text-white/80" : "text-slate-500")}>
            <CalendarDays className="h-4 w-4" />
            {formatShortDate(session.createdAt)}
          </span>
          <span className={cn("mt-1 flex items-center gap-1.5 text-sm", isSelected ? "text-white/80" : "text-slate-500")}>
            <Layers className="h-4 w-4" />
            {session.tasks.length} movement videos
          </span>
        </div>
      </div>
    </button>
  );
}

function Timeline({
  fallbackLabel,
  frame,
  markers,
  onFrameChange,
}: {
  fallbackLabel?: string;
  frame: number;
  markers: DoctorEventMarker[];
  onFrameChange: (frame: number) => void;
}) {
  return (
    <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/50 p-3">
      <div className="relative mb-2 h-4">
        {markers.map((marker) => (
          <button
            aria-label={marker.label}
            className={cn("absolute top-1 h-3 w-3 -translate-x-1/2 rounded-full ring-2 ring-white/80", eventTone[marker.severity])}
            key={`${marker.frame}-${marker.label}`}
            onClick={() => onFrameChange(marker.frame)}
            style={{ left: `${marker.frame}%` }}
            type="button"
          />
        ))}
      </div>
      <input
        aria-label="Frame timeline"
        className="h-2 w-full accent-cyan-400 cursor-pointer"
        max={100}
        min={0}
        onChange={(event) => onFrameChange(Number(event.target.value))}
        type="range"
        value={frame}
      />
      <div className="mt-2 flex justify-between text-xs text-white/70">
        <span>Frame {Math.round(frame)}</span>
        <span>{nearestMarker(markers, frame)?.label ?? fallbackLabel}</span>
      </div>
    </div>
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
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SkeletonOverlay() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative h-48 w-48 text-cyan-200/80">
        <span className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-current" />
        <span className="absolute left-1/2 top-9 h-20 w-px -translate-x-1/2 bg-current" />
        <span className="absolute left-[32%] top-14 h-px w-16 rotate-12 bg-current" />
        <span className="absolute right-[32%] top-14 h-px w-16 -rotate-12 bg-current" />
        <span className="absolute left-[38%] top-28 h-px w-14 rotate-[55deg] bg-current" />
        <span className="absolute right-[38%] top-28 h-px w-14 -rotate-[55deg] bg-current" />
      </div>
    </div>
  );
}
