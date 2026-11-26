"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="id">
      <head>
        <title>Error - PesanManis</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen flex items-center justify-center bg-surface px-5">
        <div className="max-w-md w-full px-5 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/12 flex items-center justify-center mx-auto mb-6">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01M10.29 3.86l-8.04 14A1.994 1.994 0 003.98 21h16.04a1.994 1.994 0 001.73-3.14l-8.04-14a1.994 1.994 0 00-3.42 0z"
              />
            </svg>
          </div>
          <h1 className="font-heading text-headline-md text-primary mb-2">
            Terjadi Kesalahan Server
          </h1>
          <p className="text-body-md text-on-surface-variant mb-6 text-center max-w-md mx-auto">
            Maaf, terjadi kesalahan pada server. Tim teknis kami sudah diberitahu.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Coba Lagi
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Full reload saat RootLayout crash */}
            <a
              href="/"
              className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-full text-label-lg font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}