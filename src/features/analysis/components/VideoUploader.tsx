import { UploadCloud, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type VideoUploaderProps = {
  file?: File | null;
  onFileSelect: (file: File | null) => void;
};

const acceptedVideoTypes = ["video/mp4", "video/quicktime", "video/webm"];

function isValidVideo(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return acceptedVideoTypes.includes(file.type) || ["mp4", "mov", "webm"].includes(extension ?? "");
}

export function VideoUploader({ file, onFileSelect }: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (selectedFile?: File) => {
    if (!selectedFile) return;

    if (!isValidVideo(selectedFile)) {
      setError("Please upload an MP4, MOV, or WEBM video.");
      onFileSelect(null);
      return;
    }

    setError(null);
    onFileSelect(selectedFile);
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-8 text-center transition",
          isDragging && "border-cyan-600 bg-cyan-50",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files[0]);
        }}
      >
        <UploadCloud className="h-10 w-10 text-cyan-700" />
        <h3 className="mt-3 text-base font-semibold text-slate-950">
          Drop movement video here
        </h3>
        <p className="mt-1 text-sm text-slate-500">Supported formats: MP4, MOV, WEBM</p>
        <Button className="mt-5" variant="outline" onClick={() => inputRef.current?.click()}>
          Choose Video
        </Button>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </div>

      {file ? (
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="truncate text-sm font-medium text-slate-700">{file.name}</span>
          <button
            type="button"
            className="text-slate-500 hover:text-rose-600"
            aria-label="Remove selected video"
            onClick={() => onFileSelect(null)}
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
