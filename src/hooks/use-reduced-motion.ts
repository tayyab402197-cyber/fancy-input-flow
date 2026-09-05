import { useEffect, useState } from "react";

/**
 * Tracks the OS "reduce motion" setting *and* an in-app override the user can
 * flip from the Chef Volt calm-mode toggle. SSR-safe: always starts `false`
 * and settles after hydration.
 */
const OVERRIDE_KEY = "kmg.calm-mode.v1";
const EVENT = "kmg-calm-mode";

export function readCalmOverride(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(OVERRIDE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCalmOverride(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (on) localStorage.setItem(OVERRIDE_KEY, "1");
    else localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    const sync = () => setReduced(!!mq?.matches || readCalmOverride());
    sync();
    mq?.addEventListener?.("change", sync);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      mq?.removeEventListener?.("change", sync);
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return reduced;
}
