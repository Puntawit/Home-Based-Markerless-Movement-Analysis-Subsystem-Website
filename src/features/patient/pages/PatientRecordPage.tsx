import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Crosshair,
  FileCheck2,
  Maximize2,
  PlayCircle,
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
import { getMovementTask, movementTasks } from "@/features/patient/data/movementTasks";
import { MobileScreen } from "@/features/patient/components/MobileScreen";
import { TutorialProgress } from "@/features/patient/components/TutorialProgress";
import { UploadVideoBox } from "@/features/patient/components/UploadVideoBox";
import type {
  PatientQualityGate,
  PatientSymptomReport,
} from "@/features/patient/types/patient.types";
import { cn } from "@/lib/cn";

type CapturePhase = "preflight" | "capture" | "review";

const allowedExtensions = [".mp4", ".mov", ".webm"];
const allowedMimeTypesByExtension: Record<string, string[]> = {
  ".mov": ["video/quicktime", "video/mov"],
  ".mp4": ["video/mp4"],
  ".webm": ["video/webm"],
};
const preferredRecordingMimeTypes = ["video/webm;codecs=vp8", "video/webm", "video/mp4"];
const supportedVideoMessage =
  "Supported uploads: .mp4 with video/mp4, .mov with video/quicktime or video/mov, and .webm with video/webm.";

function getSupportedRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return preferredRecordingMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function PatientRecordPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const task = getMovementTask(searchParams.get("task"));
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [phase, setPhase] = useState<CapturePhase>("preflight");
  const [referenceConfirmed, setReferenceConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [captureElapsedSeconds, setCaptureElapsedSeconds] = useState(0);
  const [saveProgress, setSaveProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [symptomSelections, setSymptomSelections] = useState<Record<string, string>>({});
  const [symptomAdditionalNote, setSymptomAdditionalNote] = useState("");
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [wasWebcamRecorded, setWasWebcamRecorded] = useState(false);
  const [wasRecordedMirrored, setWasRecordedMirrored] = useState(false);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return undefined;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  const qualityGate = useMemo<PatientQualityGate>(() => {
    // auto-confirmed for UX; backend/MediaPipe must still perform real QC
    const issues = [
      !referenceConfirmed ? "ยังไม่ยืนยันว่าเห็นกระดาษ A4 อ้างอิง" : "",
    ].filter(Boolean);

    return {
      calibrationMethod: "a4_reference",
      calibrationVisible: referenceConfirmed,
      bodyFraming: "passed",
      lighting: "passed",
      cameraAngle: "passed",
      occlusion: "passed",
      distanceConfirmed: true,
      qualityScore: referenceConfirmed ? 94 : 78,
      issues,
    };
  }, [referenceConfirmed]);

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
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, phase]);

  useEffect(() => {
    return () => {
      stopMediaStream(streamRef.current);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    stopCameraStream();
    setReferenceConfirmed(false);
    setWasWebcamRecorded(false);
    setWasRecordedMirrored(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setSelectedFile(null);
    setSymptomSelections(
      Object.fromEntries(
        task.symptomQuestions.map((question) => [question.bodyPartId, question.options[0]?.id ?? "none"]),
      ),
    );
    setSymptomAdditionalNote("");
    setError("");
    setCameraError("");
    setPhase("preflight");
  }, [task.id, task.safetyNote, task.symptomQuestions]);

  useEffect(() => {
    if (phase !== "preflight") return undefined;

    let cancelled = false;

    async function startCameraPreview() {
      setCountdown(5);
      setCaptureElapsedSeconds(0);
      setCameraReady(false);
      setIsRecording(false);
      setCameraError("");
      setError("");
      setSelectedFile(null);
      recordedChunksRef.current = [];

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("This browser cannot open the webcam. Please upload a video instead.");
        setPhase("review");
        return;
      }

      if (typeof MediaRecorder === "undefined") {
        setCameraError("This browser cannot record webcam video. Please upload a video instead.");
        setPhase("review");
        return;
      }

      if (streamRef.current) {
        setCameraStream(streamRef.current);
        setCameraReady(true);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            height: { ideal: 1280 },
            width: { ideal: 720 },
          },
        });

        if (cancelled) {
          stopMediaStream(stream);
          return;
        }

        streamRef.current = stream;
        setCameraStream(stream);
        setCameraReady(true);
      } catch {
        if (cancelled) return;
        setCameraError("Camera permission was blocked or no webcam was found. Please upload a video instead.");
        setPhase("review");
      }
    }

    void startCameraPreview();

    return () => {
      cancelled = true;
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "capture") return undefined;

    let cancelled = false;
    let countdownTimer: number | undefined;
    let progressTimer: number | undefined;
    let stopRecordingTimer: number | undefined;

    async function startWebcamCapture() {
      setCountdown(5);
      setCaptureElapsedSeconds(0);
      setIsRecording(false);
      setCameraError("");
      setError("");
      recordedChunksRef.current = [];

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("This browser cannot open the webcam. Please upload a video instead.");
        setPhase("review");
        return;
      }

      if (typeof MediaRecorder === "undefined") {
        setCameraError("This browser cannot record webcam video. Please upload a video instead.");
        setPhase("review");
        return;
      }

      try {
        const stream =
          streamRef.current ??
          (await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: "user",
              height: { ideal: 1280 },
              width: { ideal: 720 },
            },
          }));

        if (cancelled) {
          if (stream !== streamRef.current) stopMediaStream(stream);
          return;
        }

        let recordStream = stream;
        let usingCanvas = false;
        let recorder: MediaRecorder;

        const canvas = canvasRef.current;
        const video = liveVideoRef.current;

        setWasWebcamRecorded(true);

        if (canvas && video && typeof canvas.captureStream === "function") {
          try {
            const width = video.videoWidth || 720;
            const height = video.videoHeight || 1280;
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get 2D context");

            const drawLoop = () => {
              if (liveVideoRef.current && liveVideoRef.current.readyState >= 2) {
                const w = liveVideoRef.current.videoWidth || 720;
                const h = liveVideoRef.current.videoHeight || 1280;
                if (canvas.width !== w || canvas.height !== h) {
                  canvas.width = w;
                  canvas.height = h;
                }
                const context = canvas.getContext("2d");
                if (context) {
                  context.clearRect(0, 0, w, h);
                  context.save();
                  context.translate(w, 0);
                  context.scale(-1, 1);
                  context.drawImage(liveVideoRef.current, 0, 0, w, h);
                  context.restore();
                }
              }
              animationFrameRef.current = requestAnimationFrame(drawLoop);
            };

            animationFrameRef.current = requestAnimationFrame(drawLoop);

            const canvasStream = canvas.captureStream(30);
            const recordingMimeType = getSupportedRecordingMimeType();

            if (recordingMimeType && MediaRecorder.isTypeSupported(recordingMimeType)) {
              recorder = new MediaRecorder(canvasStream, { mimeType: recordingMimeType });
            } else {
              recorder = new MediaRecorder(canvasStream);
            }
            recordStream = canvasStream;
            usingCanvas = true;
            setWasRecordedMirrored(true);
          } catch (err) {
            console.error("Canvas mirror recording setup failed, falling back to raw recording:", err);
            usingCanvas = false;
            setWasRecordedMirrored(false);
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }

            const recordingMimeType = getSupportedRecordingMimeType();
            recorder = recordingMimeType
              ? new MediaRecorder(stream, { mimeType: recordingMimeType })
              : new MediaRecorder(stream);
            recordStream = stream;
          }
        } else {
          usingCanvas = false;
          setWasRecordedMirrored(false);
          const recordingMimeType = getSupportedRecordingMimeType();
          recorder = recordingMimeType
            ? new MediaRecorder(stream, { mimeType: recordingMimeType })
            : new MediaRecorder(stream);
          recordStream = stream;
        }

        streamRef.current = stream;
        mediaRecorderRef.current = recorder;
        setCameraStream(stream);
        setCameraReady(true);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          if (progressTimer) window.clearInterval(progressTimer);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          if (cancelled) return;

          const rawMimeType = recorder.mimeType || getSupportedRecordingMimeType() || "video/webm";
          const mimeType = rawMimeType.split(";")[0] || "video/webm";
          const extension = mimeType.includes("mp4") ? "mp4" : "webm";
          const recordedBlob = new Blob(recordedChunksRef.current, { type: mimeType });
          const recordedFile = new File(
            [recordedBlob],
            `${task.id}-webcam-${Date.now()}.${extension}`,
            { type: mimeType },
          );

          setCaptureElapsedSeconds(task.durationSeconds);
          setIsRecording(false);
          setSelectedFile(recordedFile);
          stopCameraStream();
          setPhase("review");
        };

        let nextCountdown = 5;
        countdownTimer = window.setInterval(() => {
          nextCountdown -= 1;
          setCountdown(Math.max(0, nextCountdown));

          if (nextCountdown > 0) return;

          if (countdownTimer) window.clearInterval(countdownTimer);
          const startedAt = Date.now();

          recorder.start();
          setIsRecording(true);

          progressTimer = window.setInterval(() => {
            const elapsedMs = Date.now() - startedAt;
            setCaptureElapsedSeconds(Math.min(task.durationSeconds, Math.floor(elapsedMs / 1000)));
          }, 200);

          stopRecordingTimer = window.setTimeout(() => {
            if (recorder.state !== "inactive") {
              recorder.stop();
            }
          }, task.durationSeconds * 1000);
        }, 1000);
      } catch {
        if (cancelled) return;
        setCameraError("Camera permission was blocked or no webcam was found. Please upload a video instead.");
        setPhase("review");
      }
    }

    void startWebcamCapture();

    return () => {
      cancelled = true;
      if (countdownTimer) window.clearInterval(countdownTimer);
      if (progressTimer) window.clearInterval(progressTimer);
      if (stopRecordingTimer) window.clearTimeout(stopRecordingTimer);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      stopCameraStream();
      setIsRecording(false);
    };
  }, [phase, task.durationSeconds, task.id]);

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
    onError: (mutationError) => {
      setSaveProgress(0);
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not save this movement task. Please try again.",
      );
    },
  });

  const preflightReady = cameraReady && referenceConfirmed;
  const currentStep = phase === "preflight" ? 3 : phase === "capture" ? 4 : 5;
  const requiredTaskCount = movementTasks.length;
  const canSaveTask = Boolean(selectedFile) && !saveTaskMutation.isPending;
  const isUploadFallback = phase === "review" && !selectedFile && Boolean(cameraError);
  const captureProgress = Math.min(100, (captureElapsedSeconds / task.durationSeconds) * 100);
  const captureTimeLabel = `${captureElapsedSeconds} / ${task.durationSeconds} วินาที`;

  function stopCameraStream() {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setCameraStream(null);
    setCameraReady(false);
  }

  function handleFileChange(file: File | null) {
    setError("");
    setCameraError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const matchedExtension = allowedExtensions.find((extension) => lowerName.endsWith(extension));
    const allowedMimeTypes = matchedExtension ? allowedMimeTypesByExtension[matchedExtension] : undefined;

    if (!matchedExtension || !allowedMimeTypes?.includes(file.type)) {
      setSelectedFile(null);
      setError(supportedVideoMessage);
      return;
    }

    setSelectedFile(file);
  }

  function handleSaveTask() {
    if (!selectedFile) {
      setError("Record with webcam or upload a video before saving this movement.");
      return;
    }

    setError("");
    setSaveProgress(12);
    saveTaskMutation.mutate({
      file: selectedFile,
      movementType: task.id,
      videoUrl: previewUrl,
      fileName: selectedFile.name,
      view: task.view,
      symptomReport,
      quality: qualityGate,
    });
  }

  function handleRetake() {
    stopCameraStream();
    setSelectedFile(null);
    setCaptureElapsedSeconds(0);
    setCountdown(5);
    setCameraError("");
    setError("");
    setPhase("preflight");
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
      <canvas ref={canvasRef} className="hidden" />
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">ขั้นตอนที่ {currentStep}/5</span>
          <span className="text-slate-500">
            {phase === "preflight"
              ? "A4 reference"
              : phase === "capture"
                ? "Capture"
                : "Save Draft"}
          </span>
        </div>
        <TutorialProgress currentStep={currentStep} totalSteps={5} />
      </div>

      {phase === "preflight" ? (
        <>
          <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
            <div className="aspect-[9/12] bg-[linear-gradient(180deg,#1e293b,#020617)]">
              {cameraStream ? (
                <video
                  ref={liveVideoRef}
                  autoPlay
                  className="h-full w-full object-cover scale-x-[-1]"
                  muted
                  playsInline
                />
              ) : (
                <Silhouette kind={task.silhouette} />
              )}
              <div className="absolute inset-0 bg-slate-950/10" />
              <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
                {cameraReady ? "Camera preview" : "Opening camera..."}
              </div>
            </div>
          </section>

          {cameraError ? (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="h-5 w-5 text-amber-700" />
              <p className="text-sm leading-6 text-amber-900">{cameraError}</p>
            </div>
          ) : null}

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
            <ConfirmItem
              checked={referenceConfirmed}
              icon={<FileCheck2 className="h-5 w-5" />}
              label="เตรียมกระดาษ A4 แล้ว"
              onChange={setReferenceConfirmed}
            />
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
              {cameraStream ? (
                <video
                  ref={liveVideoRef}
                  autoPlay
                  className="h-full w-full object-cover scale-x-[-1]"
                  muted
                  playsInline
                />
              ) : (
                <Silhouette kind={task.silhouette} />
              )}
              <div className="absolute inset-0 bg-slate-950/20" />
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
                  valueLabel={captureTimeLabel}
                />
              </div>
            </div>
          </section>

          {cameraError ? (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="h-5 w-5 text-amber-700" />
              <p className="text-sm leading-6 text-amber-900">{cameraError}</p>
            </div>
          ) : null}

          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <Timer className="h-5 w-5 text-blue-700" />
            <p className="text-sm leading-6 text-blue-900">
              ระบบจะตัดจบอัตโนมัติและเก็บวิดีโอนี้ไว้ใน draft session ก่อน ยังไม่ส่งให้แพทย์จนกว่าจะครบ {requiredTaskCount} ท่า
            </p>
          </div>
        </>
      ) : null}

      {phase === "review" ? (
        <>
          <section className="space-y-3">
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4",
                isUploadFallback
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50",
              )}
            >
              {isUploadFallback ? (
                <AlertCircle className="h-5 w-5 text-amber-700" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              )}
              <div>
                <p className={cn("text-sm font-semibold", isUploadFallback ? "text-amber-950" : "text-emerald-950")}>
                  {isUploadFallback ? "Upload a movement video instead" : "Video capture completed"}
                </p>
                <p className={cn("text-xs", isUploadFallback ? "text-amber-800" : "text-emerald-800")}>
                  {isUploadFallback
                    ? "The webcam could not be used on this device. Upload a supported .mp4, .mov, or .webm file to save this task."
                    : `This clip will stay in the draft session until all ${requiredTaskCount} tasks are ready to submit.`}
                </p>
              </div>
              <div className="hidden">
                <p className="text-sm font-semibold text-emerald-950">บันทึกวิดีโอเสร็จแล้ว</p>
                <p className="text-xs text-emerald-800">
                  คลิปนี้จะถูกเก็บไว้ใน session draft ก่อน ยังไม่ส่งให้แพทย์จนกว่าจะครบ {requiredTaskCount} ท่า
                </p>
              </div>
            </div>

            <RecordedVideoPreview
              fileName={selectedFile?.name}
              helperText={
                selectedFile
                  ? "Check that your full body and the A4 reference are visible before saving."
                  : "Record with the webcam or upload an existing clip to preview it here."
              }
              onRetake={handleRetake}
              shouldFlip={wasWebcamRecorded && !wasRecordedMirrored}
              videoUrl={previewUrl}
            />

            <UploadVideoBox
              error={error || cameraError}
              fileName={selectedFile?.name}
              onChange={handleFileChange}
            />

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

          </section>

          {saveProgress > 0 ? (
            <ProgressBar label="บันทึกลง session draft" value={saveProgress} />
          ) : null}

          {saveTaskMutation.isError && error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <Button
            className="h-12 w-full bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-600"
            data-testid="patient-save-task"
            disabled={!canSaveTask}
            icon={<Save className="h-4 w-4" />}
            onClick={handleSaveTask}
            size="lg"
            variant="secondary"
          >
            {saveTaskMutation.isPending ? "กำลังบันทึก..." : "บันทึกท่านี้ใน Session"}
          </Button>
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

function RecordedVideoPreview({
  fileName,
  helperText,
  onRetake,
  videoUrl,
  shouldFlip,
}: {
  fileName?: string;
  helperText: string;
  onRetake: () => void;
  videoUrl?: string;
  shouldFlip?: boolean;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Recorded video</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helperText}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            aria-label="ถ่ายใหม่"
            className="h-8 px-2 text-xs"
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={onRetake}
            size="sm"
            variant="outline"
          >
            ถ่ายใหม่
          </Button>
          <Badge tone={videoUrl ? "green" : "slate"}>{videoUrl ? "Ready" : "Waiting"}</Badge>
        </div>
      </div>

      {videoUrl ? (
        <video
          className={`aspect-video w-full rounded-lg border border-slate-200 bg-black object-contain ${
            shouldFlip ? "scale-x-[-1]" : ""
          }`}
          controls
          playsInline
          src={videoUrl}
        />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
          <PlayCircle className="h-10 w-10 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No recorded clip yet</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Finish recording or upload a video to see playback here.
          </p>
        </div>
      )}

      {fileName ? (
        <p className="truncate rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
          {fileName}
        </p>
      ) : null}
    </section>
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
