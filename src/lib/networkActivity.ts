import { useSyncExternalStore } from "react";

type NetworkActivitySnapshot = {
  pendingCount: number;
  visible: boolean;
};

type TrackedRequestOptions = RequestInit & {
  loaderMode?: "default" | "immediate";
  skipGlobalLoader?: boolean;
};

const SHOW_DELAY_MS = 150;
const MIN_VISIBLE_MS = 250;

let pendingCount = 0;
let visible = false;
let showTimer: number | null = null;
let hideTimer: number | null = null;
let visibleSince = 0;
let snapshot: NetworkActivitySnapshot = { pendingCount: 0, visible: false };

const listeners = new Set<() => void>();

function emit() {
  snapshot = { pendingCount, visible };
  listeners.forEach((listener) => listener());
}

function updateVisible(nextVisible: boolean) {
  if (visible === nextVisible) return;
  visible = nextVisible;
  visibleSince = nextVisible ? Date.now() : 0;
  emit();
}

function clearTimer(timer: number | null) {
  if (timer !== null && typeof window !== "undefined") {
    window.clearTimeout(timer);
  }
}

function scheduleVisibility(loaderMode: "default" | "immediate") {
  if (typeof window === "undefined") return;

  clearTimer(showTimer);
  showTimer = null;

  clearTimer(hideTimer);
  hideTimer = null;

  if (pendingCount > 0) {
    if (visible) return;
    if (loaderMode === "immediate") {
      updateVisible(true);
      return;
    }
    showTimer = window.setTimeout(() => {
      showTimer = null;
      if (pendingCount > 0) updateVisible(true);
    }, SHOW_DELAY_MS);
    return;
  }

  if (!visible) return;

  const elapsed = Date.now() - visibleSince;
  const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
  hideTimer = window.setTimeout(() => {
    hideTimer = null;
    if (pendingCount === 0) updateVisible(false);
  }, remaining);
}

function beginRequest(loaderMode: "default" | "immediate") {
  pendingCount += 1;
  emit();
  scheduleVisibility(loaderMode);

  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    pendingCount = Math.max(0, pendingCount - 1);
    emit();
    scheduleVisibility("default");
  };
}

export function getNetworkActivitySnapshot(): NetworkActivitySnapshot {
  return snapshot;
}

export function subscribeToNetworkActivity(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNetworkActivity() {
  return useSyncExternalStore(subscribeToNetworkActivity, getNetworkActivitySnapshot, getNetworkActivitySnapshot);
}

export async function trackedFetch(input: RequestInfo | URL, init: TrackedRequestOptions = {}) {
  const { skipGlobalLoader = false, loaderMode = "default", ...requestInit } = init;
  const endTracking = skipGlobalLoader ? null : beginRequest(loaderMode);
  try {
    return await fetch(input, requestInit);
  } finally {
    endTracking?.();
  }
}

export function waitForNextPaint() {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}
