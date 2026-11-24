"use client";

import { useState, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_KEY = "up_theme";
const emptySubscribe = () => () => {};

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

function readPreferredDark(): boolean {
  if (typeof window === "undefined") return false;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(THEME_KEY);
  } catch {
    // ignore
  }
  return (
    stored === "dark" ||
    (stored === null &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const initialDark = useSyncExternalStore(
    emptySubscribe,
    readPreferredDark,
    () => false
  );
  const [overrideDark, setOverrideDark] = useState<boolean | null>(null);
  const dark = overrideDark ?? initialDark;

  const toggle = () => {
    const next = !dark;
    setOverrideDark(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={dark ? "Mode terang" : "Mode gelap"}
      className={`p-2.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary-fixed/20 transition-colors ${className}`}
    >
      {mounted && dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
