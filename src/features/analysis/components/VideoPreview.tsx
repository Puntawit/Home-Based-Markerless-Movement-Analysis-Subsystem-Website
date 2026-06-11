import { Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type VideoPreviewProps = {
  file?: File | null;
  videoUrl?: string;
};

export function VideoPreview({ file, videoUrl }: VideoPreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!file) {
      setObjectUrl(undefined);
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const source = useMemo(() => videoUrl ?? objectUrl, [objectUrl, videoUrl]);

  if (!source) {
    return (
      <div className="flex aspect-video min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100">
        <div className="text-center">
          <Video className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-600">Video preview will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <video
      className="aspect-video w-full rounded-lg border border-slate-200 bg-slate-950 object-contain"
      src={source}
      controls
    />
  );
}
