"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Aktuálny čas, obnovuje sa pravidelne a pri návrate do appky. */
export function useNow(ms = 20000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const t = setInterval(tick, ms);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ms]);
  return now;
}

/** Vybraný člen rodiny ("all" = všetci), pamätá sa medzi obrazovkami. */
export function useMemberFilter() {
  const [id, setId] = useState<string>(() => {
    try {
      return localStorage.getItem("lb.member") || "all";
    } catch {
      return "all";
    }
  });
  const set = (v: string) => {
    setId(v);
    try {
      localStorage.setItem("lb.member", v);
    } catch {}
  };
  return [id, set] as const;
}

/* ---------- Odložené pripomienky ---------- */

type SnoozeMap = Record<string, number>;
const SNOOZE_KEY = "lb.snooze";
const EMPTY: SnoozeMap = {};
let cache: SnoozeMap | null = null;
const listeners = new Set<() => void>();

function readSnoozes(): SnoozeMap {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}") as SnoozeMap;
  } catch {
    cache = {};
  }
  return cache;
}

export function snooze(key: string, minutes: number) {
  const next: SnoozeMap = { ...readSnoozes(), [key]: Date.now() + minutes * 60000 };
  for (const k of Object.keys(next)) {
    if (next[k] < Date.now() - 86400000) delete next[k];
  }
  cache = next;
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSnoozes(): SnoozeMap {
  return useSyncExternalStore(subscribe, readSnoozes, () => EMPTY);
}

/** URL pre zobrazenie uloženej fotky. */
export function useObjectUrl(blob?: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
