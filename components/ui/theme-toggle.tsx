"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_KEY = "up_theme";
const THEME_EVENT = "up-theme-change";

function subscribeTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemChange = () => {
    try {
      if (window.localStorage.getItem(THEME_KEY) === null) {
        document.documentElement.classList.toggle("dark", media.matches);
        onStoreChange();
      }
    } catch {
      onStoreChange();
    }
  };
  window.addEventListener(THEME_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  media.addEventListener("change", handleSystemChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
    media.removeEventListener("change", handleSystemChange);
  };
}

function getSnapshot(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore(subscribeTheme, getSnapshot, () => false);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={dark ? "Mode terang" : "Mode gelap"}
      className={`p-2.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary-fixed/20 transition-colors cursor-pointer ${className}`}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
