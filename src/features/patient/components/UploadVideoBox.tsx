import type { ChangeEvent } from "react";
import { FileVideo, UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";

type UploadVideoBoxProps = {
  fileName?: string;
  error?: string;
  onChange: (file: File | null) => void;
};

export function UploadVideoBox({ fileName, error, onChange }: UploadVideoBoxProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null);
  }

  return (
    <div className="space-y-3">
      <label
        className={cn(
          "flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-slate-50 px-4 py-5 text-center transition hover:border-cyan-300 hover:bg-cyan-50/50",
          error ? "border-rose-300 bg-rose-50" : "border-slate-300",
        )}
      >
        <input
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          className="sr-only"
          data-testid="patient-video-upload"
          onChange={handleChange}
          type="file"
        />
        <div className="space-y-3">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
            <UploadCloud className="h-7 w-7" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {fileName ? "Replace selected video" : "Upload movement video"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Supports MP4, MOV, or WEBM files</p>
          </div>
        </div>
      </label>
      {fileName ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <FileVideo className="h-4 w-4 text-cyan-700" />
          <span className="min-w-0 flex-1 truncate">{fileName}</span>
        </div>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
