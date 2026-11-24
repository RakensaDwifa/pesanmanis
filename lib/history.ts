"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseContentHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Panggil saat content di-set secara programatik (restore draft / load edit) agar tidak masuk history. */
  markRestored: () => void;
}

/**
 * Melacak perubahan `current` dan menyediakan undo/redo.
 * - Perubahan dalam window `coalesceMs` digabung jadi satu step (typing batch).
 * - `apply` dipakai untuk men-set state dari luar (undo/redo) tanpa masuk history lagi.
 */
export function useContentHistory<T>(
  current: T,
  apply: (next: T) => void,
  coalesceMs = 600,
  maxSteps = 50
): UseContentHistoryReturn {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const prev = useRef<T>(current);
  const lastPushAt = useRef(0);
  const skipNext = useRef(false);
  const [availability, setAvailability] = useState({ canUndo: false, canRedo: false });

  const syncAvailability = useCallback(() => {
    const nextUndo = past.current.length > 0;
    const nextRedo = future.current.length > 0;
    setAvailability((curr) =>
      curr.canUndo === nextUndo && curr.canRedo === nextRedo
        ? curr
        : { canUndo: nextUndo, canRedo: nextRedo }
    );
  }, []);

  useEffect(() => {
    if (Object.is(prev.current, current)) return;

    if (skipNext.current) {
      skipNext.current = false;
      prev.current = current;
      const id = queueMicrotask(syncAvailability);
      void id;
      return;
    }

    const now = Date.now();
    if (now - lastPushAt.current > coalesceMs) {
      past.current.push(prev.current);
      if (past.current.length > maxSteps) past.current.shift();
      future.current = [];
      lastPushAt.current = now;
    } else {
      lastPushAt.current = now;
    }
    prev.current = current;
    queueMicrotask(syncAvailability);
  }, [current, coalesceMs, maxSteps, syncAvailability]);

  const undo = useCallback(() => {
    const entry = past.current.pop();
    if (entry === undefined) return;
    future.current.push(prev.current);
    lastPushAt.current = 0;
    skipNext.current = true;
    syncAvailability();
    apply(entry);
  }, [apply, syncAvailability]);

  const redo = useCallback(() => {
    const entry = future.current.pop();
    if (entry === undefined) return;
    past.current.push(prev.current);
    lastPushAt.current = 0;
    skipNext.current = true;
    syncAvailability();
    apply(entry);
  }, [apply, syncAvailability]);

  const markRestored = useCallback(() => {
    skipNext.current = true;
    past.current = [];
    future.current = [];
    lastPushAt.current = 0;
    syncAvailability();
  }, [syncAvailability]);

  return {
    canUndo: availability.canUndo,
    canRedo: availability.canRedo,
    undo,
    redo,
    markRestored,
  };
}
