"use client";

import { useSyncExternalStore } from "react";

function subscribeMediaQuery(query: string, callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(query);
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", callback);
    return () => mq.removeEventListener("change", callback);
  }
  mq.addListener(callback);
  return () => mq.removeListener(callback);
}

function getMediaQuerySnapshot(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(query).matches;
}

const getServerFalse = () => false;

const COARSE_QUERY = "(pointer: coarse)";
const MOBILE_OR_COARSE_QUERY = "(pointer: coarse), (max-width: 767px)";

/**
 * SSR-safe hook detecting primary touch / coarse-pointer devices (phones & tablets).
 */
export function useIsCoarsePointer(): boolean {
  return useSyncExternalStore(
    (cb) => subscribeMediaQuery(COARSE_QUERY, cb),
    () => getMediaQuerySnapshot(COARSE_QUERY),
    getServerFalse
  );
}

/**
 * SSR-safe hook detecting touch devices OR narrow mobile viewports (< 768px).
 */
export function useIsTouchOrMobile(): boolean {
  return useSyncExternalStore(
    (cb) => subscribeMediaQuery(MOBILE_OR_COARSE_QUERY, cb),
    () => getMediaQuerySnapshot(MOBILE_OR_COARSE_QUERY),
    getServerFalse
  );
}
