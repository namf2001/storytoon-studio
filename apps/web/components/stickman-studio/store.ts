"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseStickmanRig, type StickmanRig } from "@storytoon/video-engine";

const LIBRARY_KEY = "storytoon.stickman.library.v1";
const HISTORY_LIMIT = 100;

/** SavedCharacter is one entry of the local character library. */
export interface SavedCharacter {
  id: string;
  rig: StickmanRig;
  updatedAt: number;
}

/** loadLibrary reads saved characters from localStorage, tolerating old or broken data. */
export function loadLibrary(): SavedCharacter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((e) => e && typeof e.id === "string")
      .map((e) => ({ id: e.id, rig: parseStickmanRig(e.rig), updatedAt: Number(e.updatedAt) || 0 }));
  } catch {
    return [];
  }
}

/** saveLibrary writes the whole library back to localStorage. */
export function saveLibrary(entries: SavedCharacter[]): void {
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries));
}

/** newId creates a short unique id for a library entry. */
export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * useRigHistory keeps the edited rig with undo/redo.
 * `set(next, false)` replaces the present without a history step (used while dragging);
 * call `checkpoint()` once when a drag starts so the whole drag is one undo step.
 */
export function useRigHistory(initial: StickmanRig) {
  const [present, setPresent] = useState(initial);
  const past = useRef<StickmanRig[]>([]);
  const future = useRef<StickmanRig[]>([]);
  const [, force] = useState(0);
  const presentRef = useRef(present);
  presentRef.current = present;

  const checkpoint = useCallback(() => {
    past.current = [...past.current.slice(-HISTORY_LIMIT + 1), presentRef.current];
    future.current = [];
    force((n) => n + 1);
  }, []);

  const set = useCallback(
    (next: StickmanRig, record = true) => {
      if (record) checkpoint();
      setPresent(next);
    },
    [checkpoint],
  );

  const reset = useCallback((next: StickmanRig) => {
    past.current = [];
    future.current = [];
    setPresent(next);
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(presentRef.current);
    setPresent(prev);
  }, []);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(presentRef.current);
    setPresent(next);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return {
    rig: present,
    set,
    checkpoint,
    reset,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
