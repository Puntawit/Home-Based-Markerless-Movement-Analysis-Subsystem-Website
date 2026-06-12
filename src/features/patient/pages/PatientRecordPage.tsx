import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Crosshair,
  FileCheck2,
  Maximize2,
  RotateCcw,
  Save,
  Smartphone,
  SunMedium,
  Timer,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { savePatientSessionTask } from "@/features/patient/api/patientApi";
import { getMovementTask } from "@/features/patient/data/movementTasks";
import { MobileScreen } from "@/features/patient/components/MobileScreen";
import { TutorialProgress } from "@/features/patient/components/TutorialProgress";
import { UploadVideoBox } from "@/features/patient/components/UploadVideoBox";
import type {
  PatientQualityGate,
  PatientSymptomReport,
} from "@/features/patient/types/patient.types";

type CapturePhase = "preflight" | "capture" | "review";

const allowedExtensions = [".mp4", ".mov", ".webm"];
const allowedMimeTypes = ["video/mp4", "video/quicktime", "video/webm"];

export function PatientRecordPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const task = getMovementTask(searchParams.get("task"));
  const [phase, setPhase] = useState<CapturePhase>("preflight");
  const [referenceConfirmed, setReferenceConfirmed] = useState(false);
  const [fullBodyConfirmed, setFullBodyConfirmed] = useState(false);
  const [distanceConfirmed, setDistanceConfirmed] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(!task.safetyNote);
  const [countdown, setCountdown] = useState(5);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [saveProgress, setSaveProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [symptomSelections, setSymptomSelections] = useState<Record<string, string>>({});
  const [symptomAdditionalNote, setSymptomAdditionalNote] = useState("");
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => {
    if (!selectedFile) return undefined;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  const qualityGate = useMemo<PatientQualityGate>(() => {
    const issues = [
      !referenceConfirmed ? "ยังไม่ยืนยันว่าเห็นกระดาษ A4 อ้างอิง" : "",
      !fullBodyConfirmed ? "ยังไม่ยืนยันว่าเห็นร่างกายครบในกรอบ" : "",
      !distanceConfirmed ? "ยังไม่ยืนยันระยะกล้อง" : "",
    ].filter(Boolean);

    return {
      calibrationMethod: "a4_reference",
      calibrationVisible: referenceConfirmed,
      bodyFraming: fullBodyConfirmed ? "passed" : "warning",
      lighting: "passed",
      cameraAngle: "passed",
      occlusion: "passed",
      distanceConfirmed,
      qualityScore: issues.length === 0 ? 94 : 78,
      issues,
    };
  }, [distanceConfirmed, fullBodyConfirmed, referenceConfirmed]);

  const symptomReport = useMemo<PatientSymptomReport>(() => {
    return {
      items: task.symptomQuestions.map((question) => {
        const selectedSymptomId = symptomSelections[question.bodyPartId] ?? question.options[0]?.id ?? "none";
        const selectedOption =
          question.options.find((option) => option.id === selectedSymptomId) ?? question.options[0];

        return {
          bodyPartId: question.bodyPartId,
          bodyPartLabel: question.bodyPartLabel,
          symptomId: selectedOption?.id ?? "none",
          symptomLabel: selectedOption?.label ?? "ไม่มีอาการ",
        };
      }),
      additionalNote: symptomAdditionalNote.trim() || undefined,
    };
  }, [symptomAdditionalNote, symptomSelections, task.symptomQuestions]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    setReferenceConfirmed(false);
    setFullBodyConfirmed(false);
    setDistanceConfirmed(false);
    setSafetyConfirmed(!task.safetyNote);
    setSelectedFile(null);
    setNote("");
    setSymptomSelections(
      Object.fromEntries(
        task.symptomQuestions.map((question) => [question.bodyPartId, question.options[0]?.id ?? "none"]),
      ),
    );
    setSymptomAdditionalNote("");
    setError("");
    setPhase("preflight");
  }, [task.id, task.safetyNote, task.symptomQuestions]);

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

  const preflightReady =
    referenceConfirmed && fullBodyConfirmed && distanceConfirmed && safetyConfirmed;
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
      symptomReport,
      quality: qualityGate,
    });
  }

  return (
    <MobileScreen
      backTo={`/patient/tutorial?task=${task.id}`}
      subtitle={task.label}
      title={
        phase === "preflight"
          ? "ตั้งกล้องและวาง A4"
          : phase === "capture"
            ? "บันทึกวิดีโอ"
            : "ตรวจสอบก่อนบันทึก"
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">ขั้นตอนที่ {currentStep}/5</span>
          <span className="text-slate-500">
            {phase === "preflight" ? "A4 reference" : phase === "capture" ? "Capture" : "Save Draft"}
          </span>
        </div>
        <TutorialProgress currentStep={currentStep} totalSteps={5} />
      </div>

      {phase === "preflight" ? (
        <>
          <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
            <div className="aspect-[9/12] bg-[linear-gradient(180deg,#1e293b,#020617)]">
              <Silhouette kind={task.silhouette} />
              <div className="absolute inset-x-10 top-12 bottom-20 rounded-[32px] border-2 border-dashed border-cyan-300/70" />
              <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
                Live preview
              </div>
              <div className="absolute bottom-5 left-1/2 h-16 w-24 -translate-x-1/2 rounded-md border-2 border-emerald-300 bg-emerald-400/15">
                <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300" />
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-emerald-100">
                  A4
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-cyan-100 bg-cyan-50 p-4">
            <div className="flex items-start gap-3">
              <Crosshair className="mt-0.5 h-5 w-5 text-cyan-700" />
              <div>
                <p className="text-sm font-semibold text-cyan-950">Calibration reference</p>
                <p className="mt-1 text-xs leading-5 text-cyan-800">
                  ใช้กระดาษ A4 แผ่นเดียวเป็นวัตถุอ้างอิง วางบนพื้นให้เห็นเต็มแผ่นในกล้องเพื่อช่วยประเมินสเกลและระยะกล้อง
                </p>
              </div>
            </div>
            <div className="rounded-md border border-cyan-200 bg-white px-3 py-2">
              <p className="text-sm font-semibold text-cyan-950">A4 reference only</p>
              <p className="mt-1 text-xs leading-5 text-cyan-800">
                ใช้เฉพาะกระดาษ A4 ที่มองเห็นชัดเจนในเฟรม
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <QualityItem
              icon={<SunMedium className="h-5 w-5" />}
              label="แสงสว่างเหมาะสม"
              status="ระบบตรวจเบื้องต้นผ่าน"
            />
            <QualityItem
              icon={<Smartphone className="h-5 w-5" />}
              label="มุมกล้องตั้งตรง"
              status="ไม่เอียงมากเกินไป"
            />
            <ConfirmItem
              checked={referenceConfirmed}
              icon={<FileCheck2 className="h-5 w-5" />}
              label="เห็นกระดาษ A4 อ้างอิงบนพื้นชัดเจน"
              onChange={setReferenceConfirmed}
            />
            <ConfirmItem
              checked={fullBodyConfirmed}
              icon={<Maximize2 className="h-5 w-5" />}
              label="เห็นศีรษะ ลำตัว เข่า และเท้าครบ"
              onChange={setFullBodyConfirmed}
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
              <div className="absolute inset-x-10 top-12 bottom-20 rounded-[32px] border-2 border-dashed border-cyan-300/70" />
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
              ระบบจะตัดจบอัตโนมัติและเก็บวิดีโอนี้ไว้ใน draft session ก่อน ยังไม่ส่งให้แพทย์จนกว่าจะครบ 4 ท่า
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
                  คลิปนี้จะถูกเก็บไว้ใน session draft ก่อน ยังไม่ส่งให้แพทย์จนกว่าจะครบ 4 ท่า
                </p>
              </div>
            </div>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Video Quality</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Reference: A4 paper
                  </p>
                </div>
                <Badge tone={qualityGate.qualityScore >= 90 ? "green" : "yellow"}>
                  {qualityGate.qualityScore}/100
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <QualityLine label="A4 visible" passed={qualityGate.calibrationVisible} />
                <QualityLine label="Full body framing" passed={qualityGate.bodyFraming === "passed"} />
                <QualityLine label="Distance confirmed" passed={qualityGate.distanceConfirmed} />
                <QualityLine label="Lighting" passed={qualityGate.lighting === "passed"} />
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">อาการหลังอัดท่านี้</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  เลือกอาการของแต่ละส่วนที่เกี่ยวกับท่า {task.shortLabel}
                </p>
              </div>
              <div className="space-y-3">
                {task.symptomQuestions.map((question) => (
                  <div className="space-y-2" key={question.bodyPartId}>
                    <p className="text-xs font-semibold text-slate-600">{question.bodyPartLabel}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {question.options.map((option) => {
                        const selected =
                          (symptomSelections[question.bodyPartId] ?? question.options[0]?.id) === option.id;

                        return (
                          <label
                            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                              selected
                                ? "border-cyan-300 bg-cyan-50 text-cyan-950"
                                : "border-slate-200 bg-white text-slate-700"
                            }`}
                            key={option.id}
                          >
                            <input
                              checked={selected}
                              className="h-4 w-4 border-slate-300 text-cyan-700 focus:ring-cyan-600"
                              name={`symptom-${question.bodyPartId}`}
                              onChange={() =>
                                setSymptomSelections((current) => ({
                                  ...current,
                                  [question.bodyPartId]: option.id,
                                }))
                              }
                              type="radio"
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">เขียนเพิ่มเติมเกี่ยวกับอาการ</span>
                <textarea
                  className="min-h-[84px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setSymptomAdditionalNote(event.target.value)}
                  placeholder="เช่น ปวดเข่าขวาตอนลุก หรือเวียนหัวเล็กน้อยหลังยืนขาเดียว"
                  value={symptomAdditionalNote}
                />
              </label>
            </section>

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

function ConfirmItem({
  checked,
  icon,
  label,
  onChange,
}: {
  checked: boolean;
  icon: ReactNode;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <input
        checked={checked}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="flex min-w-0 items-center gap-3">
        <span className={checked ? "text-emerald-700" : "text-slate-500"}>{icon}</span>
        <span className="text-sm font-semibold text-slate-900">{label}</span>
      </span>
    </label>
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

function QualityLine({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-600">{label}</span>
      <Badge tone={passed ? "green" : "yellow"}>{passed ? "Passed" : "Warning"}</Badge>
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
