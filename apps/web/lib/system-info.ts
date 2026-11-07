"use client";

import { useSyncExternalStore } from "react";
import { AI_WORKER_URL } from "@/lib/api";

/** What the AI worker reports at GET /health — the single source for model names in the UI. */
export interface WorkerInfo {
  sceneLlm?: { provider: string; model: string };
  whisperModel?: string;
  tts?: string;
}

export type ServiceState = "checking" | "ok" | "down";

interface Snapshot {
  state: ServiceState;
  info: WorkerInfo | null;
}

const POLL_MS = 15000;
let snapshot: Snapshot = { state: "checking", info: null };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function emit(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

async function check() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`${AI_WORKER_URL}/health`, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as WorkerInfo & { ok?: boolean };
    emit({ state: "ok", info: body });
  } catch {
    emit({ state: "down", info: snapshot.info });
  } finally {
    clearTimeout(t);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    check();
    timer = setInterval(check, POLL_MS);
    window.addEventListener("focus", check);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer) clearInterval(timer);
      timer = null;
      window.removeEventListener("focus", check);
    }
  };
}

const serverSnapshot: Snapshot = { state: "checking", info: null };

/** Shared AI-worker health + configured models (one poller for the whole app). */
export function useWorkerInfo(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
}

/**
 * Human label for the scene-splitting model, e.g. "Groq · qwen3.8-27b".
 * null while unknown (worker offline or an older worker without model info).
 */
export function sceneModelLabel(info: WorkerInfo | null): string | null {
  if (!info?.sceneLlm) return null;
  const { provider, model } = info.sceneLlm;
  if (provider === "Heuristic") return "Chia theo câu";
  return `${provider} · ${model.split("/").pop()}`;
}
