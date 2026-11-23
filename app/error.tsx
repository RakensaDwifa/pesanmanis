"use client";

import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-surface px-5">
      <div className="max-w-md w-full text-center">
        <h1 className="font-heading text-headline-md text-primary mb-2">
          Ups, terjadi kendala
        </h1>
        <p className="text-body-md text-on-surface-variant mb-6">
          Halaman gagal dimuat. Silakan coba lagi atau kembali ke beranda.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-full text-label-lg font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <Home className="h-4 w-4" />
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
