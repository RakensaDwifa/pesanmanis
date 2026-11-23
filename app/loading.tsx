import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-surface px-5 text-center">
      <Loader2 className="h-9 w-9 text-primary animate-spin mb-3" />
      <p className="text-body-md text-on-surface-variant">Memuat halaman…</p>
    </div>
  );
}
