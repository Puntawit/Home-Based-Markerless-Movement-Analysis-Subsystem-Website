import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  RotateCcw,
  Save,
  Smartphone,
  SunMedium,
  Timer,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { savePatientSessionTask } from "@/features/patient/api/patientApi";
import { getMovementTask } from "@/features/patient/data/movementTasks";
import { MobileScreen } from "@/features/patient/components/MobileScreen";
import { TutorialProgress } from "@/features/patient/components/TutorialProgress";
import { UploadVideoBox } from "@/features/patient/components/UploadVideoBox";

type CapturePhase = "preflight" | "capture" | "review";

const allowedExtensions = [".mp4", ".mov", ".webm"];
const allowedMimeTypes = ["video/mp4", "video/quicktime", "video/webm"];

export function PatientRecordPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const task = getMovementTask(searchParams.get("task"));
  const [phase, setPhase] = useState<CapturePhase>("preflight");
  const [distanceConfirmed, setDistanceConfirmed] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(!task.safetyNote);
  const [countdown, setCountdown] = useState(5);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [saveProgress, setSaveProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => {
    if (!selectedFile) return undefined;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    setDistanceConfirmed(false);
    setSafetyConfirmed(!task.safetyNote);
    setSelectedFile(null);
    setNote("");
    setPhase("preflight");
  }, [task.id, task.safetyNote]);

  useEffect(() => {
    if (phase !== "capture") return undefined;

    setCountdown(5);
    setCaptureProgress(0);
    const timer = window.setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1));
      setCaptureProgress((value) => {
        const nextValue = Math.min(100, value + 10);
        if (nextValue === 100) {
          window.clearInterval(timer);
          window.setTimeout(() => setPhase("review"), 300);
        }
        return nextValue;
      });
    }, 500);

    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (saveProgress === 0 || saveProgress >= 100) return undefined;

    const timer = window.setInterval(() => {
      setSaveProgress((value) => Math.min(100, value + 18));
    }, 160);

    return () => window.clearInterval(timer);
  }, [saveProgress]);

  const saveTaskMutation = useMutation({
    mutationFn: savePatientSessionTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", "draft-session"] });
      navigate("/patient/home");
    },
  });

  const preflightReady = distanceConfirmed && safetyConfirmed;
  const currentStep = phase === "preflight" ? 3 : phase === "capture" ? 4 : 5;

  function handleFileChange(file: File | null) {
    setError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some((extension) => lowerName.endsWith(extension));
    const hasValidMimeType = allowedMimeTypes.includes(file.type);

    if (!hasValidExtension && !hasValidMimeType) {
      setSelectedFile(null);
      setError("กรุณาเลือกไฟล์วิดีโอ MP4, MOV หรือ WEBM เท่านั้น");
      return;
    }

    setSelectedFile(file);
  }

  function handleSaveTask() {
    setSaveProgress(12);
    saveTaskMutation.mutate({
      movementType: task.id,
      note,
      videoUrl: previewUrl,
      fileName: selectedFile?.name ?? `${task.id}-capture.webm`,
      view: task.view,
    });
  }

  return (
    <MobileScreen
      backTo={`/patient/tutorial?task=${task.id}`}
      subtitle={task.label}
      title={
        phase === "preflight"
          ? "เช็กกล้องก่อนถ่าย"
          : phase === "capture"
            ? "บันทึกวิดีโอ"
            : "ตรวจสอบวิดีโอ"
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">ขั้นตอนที่ {currentStep}/5</span>
          <span className="text-slate-500">
            {phase === "preflight" ? "Quality Gate" : phase === "capture" ? "Capture" : "Save Draft"}
          </span>
        </div>
        <TutorialProgress currentStep={currentStep} totalSteps={5} />
      </div>

      {phase === "preflight" ? (
        <>
          <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
            <div className="aspect-[9/12] bg-[linear-gradient(180deg,#1e293b,#020617)]">
              <Silhouette kind={task.silhouette} />
              <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
                Live preview
              </div>
              <div className="absolute bottom-5 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border border-emerald-300 bg-emerald-400/20">
                <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300" />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <QualityItem
              icon={<Smartphone className="h-5 w-5" />}
              label="มุมกล้องตั้งตรง"
              status="ผ่าน"
            />
            <QualityItem
              icon={<SunMedium className="h-5 w-5" />}
              label="แสงสว่างเหมาะสม"
              status="ผ่าน"
            />
            <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <input
                checked={distanceConfirmed}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
                onChange={(event) => setDistanceConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  ยืนยันระยะห่างจากกล้อง
                </span>
                <span className="text-xs leading-5 text-slate-500">{task.distance}</span>
              </span>
            </label>
            {task.safetyNote ? (
              <label className="flex cursor-pointer gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <input
                  checked={safetyConfirmed}
                  className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-600"
                  onChange={(event) => setSafetyConfirmed(event.target.checked)}
                  type="checkbox"
                />
                <span className="text-sm leading-6 text-amber-900">{task.safetyNote}</span>
              </label>
            ) : null}
          </section>

          <Button
            className="h-12 w-full bg-cyan-700 hover:bg-cyan-800 focus-visible:ring-cyan-600"
            disabled={!preflightReady}
            icon={<Camera className="h-4 w-4" />}
            onClick={() => setPhase("capture")}
            size="lg"
          >
            เริ่มบันทึกวิดีโอ
          </Button>
        </>
      ) : null}

      {phase === "capture" ? (
        <>
          <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
            <div className="aspect-[9/12] bg-[linear-gradient(180deg,#0f172a,#111827)]">
              <Silhouette kind={task.silhouette} />
              <div className="absolute left-0 right-0 top-6 text-center">
                <p className="text-sm font-medium text-white/70">
                  {countdown > 0 ? "เตรียมตัว" : "กำลังบันทึก"}
                </p>
                <p className="text-6xl font-semibold text-white">{countdown > 0 ? countdown : "REC"}</p>
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <ProgressBar
                  className="text-white"
                  label={`${task.durationSeconds} วินาที`}
                  value={captureProgress}
                />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <Timer className="h-5 w-5 text-blue-700" />
            <p className="text-sm leading-6 text-blue-900">
              ระบบจะตัดจบอัตโนมัติเพื่อให้วิดีโอไม่ยาวเกินขอบเขตการประมวลผล
            </p>
          </div>
        </>
      ) : null}

      {phase === "review" ? (
        <>
          <section className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              <div>
                <p className="text-sm font-semibold text-emerald-950">บันทึกวิดีโอเสร็จแล้ว</p>
                <p className="text-xs text-emerald-800">
                  ระบบจะเก็บคลิปนี้ไว้ใน session draft ก่อน ยังไม่ส่งให้แพทย์จนกว่าจะครบ 4 ท่า
                </p>
              </div>
            </div>

            <UploadVideoBox
              error={error}
              fileName={selectedFile?.name}
              onChange={handleFileChange}
              videoUrl={previewUrl}
            />
          </section>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">บันทึกเพิ่มเติมของท่านี้</span>
            <textarea
              className="min-h-[96px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setNote(event.target.value)}
              placeholder="เช่น เวียนศีรษะ เจ็บเข่า หรือมีคนช่วยพยุง"
              value={note}
            />
          </label>

          {saveProgress > 0 ? (
            <ProgressBar label="บันทึกลง session draft" value={saveProgress} />
          ) : null}

          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button
              aria-label="ถ่ายใหม่"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => setPhase("preflight")}
              size="icon"
              variant="outline"
            />
            <Button
              className="h-12 bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-600"
              disabled={saveTaskMutation.isPending}
              icon={<Save className="h-4 w-4" />}
              onClick={handleSaveTask}
              size="lg"
              variant="secondary"
            >
              {saveTaskMutation.isPending ? "กำลังบันทึก..." : "บันทึกท่านี้ใน Session"}
            </Button>
          </div>
        </>
      ) : null}
    </MobileScreen>
  );
}

function QualityItem({
  icon,
  label,
  status,
}: {
  icon: ReactNode;
  label: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <span className="text-emerald-700">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-emerald-950">{label}</p>
        <p className="text-xs text-emerald-800">{status}</p>
      </div>
      <CheckCircle2 className="h-5 w-5 text-emerald-700" />
    </div>
  );
}

function Silhouette({ kind }: { kind: "front" | "side-chair" }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative h-[62%] w-[38%]">
        <div className="absolute left-1/2 top-0 h-12 w-12 -translate-x-1/2 rounded-full border-2 border-cyan-200/80" />
        <div className="absolute left-1/2 top-14 h-36 w-20 -translate-x-1/2 rounded-[999px] border-2 border-cyan-200/70" />
        <div className="absolute left-[8%] top-[34%] h-28 w-1 rotate-12 rounded-full bg-cyan-200/70" />
        <div className="absolute right-[8%] top-[34%] h-28 w-1 -rotate-12 rounded-full bg-cyan-200/70" />
        <div className="absolute left-[35%] top-[64%] h-32 w-1 rotate-6 rounded-full bg-cyan-200/70" />
        <div className="absolute right-[35%] top-[64%] h-32 w-1 -rotate-6 rounded-full bg-cyan-200/70" />
        {kind === "side-chair" ? (
          <div className="absolute -right-12 bottom-12 h-16 w-16 border-b-2 border-r-2 border-cyan-200/60" />
        ) : null}
      </div>
    </div>
  );
}
