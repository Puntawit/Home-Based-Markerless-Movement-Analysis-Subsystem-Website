export function AuthLoadingScreen({ message = "กำลังตรวจสอบสถานะผู้ใช้..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center font-thai">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-cyan-700 border-t-transparent" />
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}
