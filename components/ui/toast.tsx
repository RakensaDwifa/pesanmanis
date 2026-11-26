"use client";

import { useSyncExternalStore } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Toaster } from "sonner";

function subscribeDarkMode(callback: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getIsDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function ToasterWrapper() {
  const isDark = useSyncExternalStore(
    subscribeDarkMode,
    getIsDarkMode,
    () => false
  );

  return (
    <Toaster
      position="top-center"
      theme={isDark ? "dark" : "light"}
      visibleToasts={1}
      expand={false}
      duration={2400}
      offset={{ top: 88 }}
      mobileOffset={{ top: 84, left: 16, right: 16 }}
      icons={{
        success: (
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ),
        error: (
          <AlertCircle className="h-4.5 w-4.5 text-red-600 dark:text-red-400 shrink-0" />
        ),
        info: (
          <Info className="h-4.5 w-4.5 text-primary shrink-0" />
        ),
        loading: (
          <Loader2 className="h-4.5 w-4.5 text-primary animate-spin shrink-0" />
        ),
      }}
      toastOptions={{
        style: { fontFamily: "inherit" },
        classNames: {
          toast:
            "!rounded-2xl sm:!rounded-full !bg-surface/95 !backdrop-blur-md !text-on-surface !border !border-outline-variant/45 !shadow-[0_10px_30px_rgba(36,25,20,0.14)] dark:!shadow-[0_12px_34px_rgba(0,0,0,0.45)] !px-4 !py-3 sm:!px-5 !gap-2.5 sm:!inset-x-0 sm:!mx-auto sm:!w-fit !max-w-[calc(100vw-2rem)] sm:!max-w-md",
          title: "!text-[13.5px] !font-semibold !leading-snug",
          description: "!text-xs !text-on-surface-variant",
          icon: "!m-0 !w-auto !h-auto",
        },
      }}
    />
  );
}
