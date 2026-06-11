import { PlayCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnalysisStatus } from "@/features/analysis/components/AnalysisStatus";
import { VideoPreview } from "@/features/analysis/components/VideoPreview";
import { VideoUploader } from "@/features/analysis/components/VideoUploader";
import { useCreateAnalysisSession } from "@/features/analysis/hooks/useAnalysis";
import {
  movementTypeLabels,
  type MovementType,
  type ProcessingState,
} from "@/features/analysis/types/analysis.types";

const movementOptions = Object.entries(movementTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function NewAnalysisPage() {
  const navigate = useNavigate();
  const createSession = useCreateAnalysisSession();
  const [file, setFile] = useState<File | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [movementType, setMovementType] = useState<MovementType>("squat");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<ProcessingState>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const isBusy = state === "uploading" || state === "processing" || createSession.isPending;

  const simulateUpload = () =>
    new Promise<void>((resolve) => {
      setProgress(0);
      const timer = window.setInterval(() => {
        setProgress((current) => {
          const next = Math.min(100, current + 12);
          if (next >= 100) {
            window.clearInterval(timer);
            resolve();
          }
          return next;
        });
      }, 120);
    });

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    setState("idle");
    setProgress(0);
    setFormError(null);

    if (selectedFile && !sessionName) {
      setSessionName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setFormError("Please upload a movement video first.");
      return;
    }

    if (!sessionName.trim()) {
      setFormError("Please enter a session name.");
      return;
    }

    try {
      setFormError(null);
      setState("uploading");
      await simulateUpload();
      setState("uploaded");
      await wait(450);
      setState("processing");
      await wait(1200);

      const videoUrl = URL.createObjectURL(file);
      const session = await createSession.mutateAsync({
        name: sessionName.trim(),
        movementType,
        note: note.trim() || undefined,
        videoUrl,
      });

      setState("success");
      navigate(`/analysis/${session.id}`);
    } catch (error) {
      setState("error");
      setFormError(error instanceof Error ? error.message : "Analysis failed.");
    }
  };

  return (
    <div>
      <PageHeader
        title="New Analysis"
        description="Upload a movement video and run a mock analysis workflow."
      />

      <form className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <VideoUploader file={file} onFileSelect={handleFileSelect} />
              <VideoPreview file={file} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Session Name"
                name="sessionName"
                placeholder="Example: Morning squat baseline"
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
              />
              <Select
                label="Movement Type"
                name="movementType"
                value={movementType}
                options={movementOptions}
                onChange={(event) => setMovementType(event.target.value as MovementType)}
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Note</span>
                <textarea
                  className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  placeholder="Optional note for this session"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                icon={<PlayCircle className="h-5 w-5" />}
                disabled={isBusy}
              >
                Analyze Movement
              </Button>
            </CardContent>
          </Card>

          <AnalysisStatus state={state} />
          {(state === "uploading" || state === "uploaded" || state === "processing") && (
            <ProgressBar value={progress} label="Upload progress" />
          )}
        </div>
      </form>
    </div>
  );
}
