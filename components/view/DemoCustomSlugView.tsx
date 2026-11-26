"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { listUcapan } from "@/lib/store";
import PublicView from "@/components/view/PublicView";

const emptySubscribe = () => () => {};

/**
 * Resolves `/u/[customSlug]` in local Demo Mode against `localStorage` so
 * custom slug links generated during demo checkout open seamlessly.
 */
export default function DemoCustomSlugView({
  customSlug,
}: {
  customSlug: string;
}) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const matched = useMemo(() => {
    if (!isClient) return null;
    const normalized = customSlug.trim().toLowerCase();
    return (
      listUcapan().find(
        (u) => u.paid && u.customSlug?.trim().toLowerCase() === normalized
      ) ?? null
    );
  }, [customSlug, isClient]);

  if (!isClient) {
    return <div className="min-h-screen bg-surface" />;
  }

  if (!matched) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-5 text-center">
        <p className="font-heading text-headline-md text-on-surface mb-3">
          Link ucapan tidak ditemukan
        </p>
        <p className="text-body-md text-on-surface-variant mb-6 max-w-md">
          Ucapan dengan link <span className="font-mono font-semibold">/u/{customSlug}</span> tidak ditemukan di Mode Demo browser ini.
        </p>
        <Link
          href="/dashboard"
          className="px-7 py-3 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md"
        >
          Ke Dashboard
        </Link>
      </div>
    );
  }

  return <PublicView id={matched.id} />;
}
