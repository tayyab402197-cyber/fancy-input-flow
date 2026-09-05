import { useEffect, useState } from "react";
import { CloudOff, Loader2, WifiOff } from "lucide-react";

import { API_SLOW_DONE_EVENT, API_SLOW_EVENT } from "@/lib/api/client";

/**
 * Global connection banner.
 *  - "waking up" while a request is slow (Railway free tier cold start)
 *  - "offline" when the browser loses its connection
 * Purely presentational — it never signs anyone out.
 */
export function ConnectionBanner() {
  const [waking, setWaking] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const slow = () => setWaking(true);
    const done = () => setWaking(false);
    const off = () => setOffline(true);
    const on = () => setOffline(false);
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    window.addEventListener(API_SLOW_EVENT, slow);
    window.addEventListener(API_SLOW_DONE_EVENT, done);
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      window.removeEventListener(API_SLOW_EVENT, slow);
      window.removeEventListener(API_SLOW_DONE_EVENT, done);
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
    };
  }, []);

  if (!waking && !offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[95] flex items-center justify-center gap-2 bg-charcoal/95 px-4 py-2 text-center font-display text-[11px] font-extrabold tracking-[0.12em] text-cream uppercase backdrop-blur"
    >
      {offline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
          You're offline — we'll retry as soon as you're back
        </>
      ) : (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          <CloudOff className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
          Waking up the kitchen — this can take up to 30 seconds
        </>
      )}
    </div>
  );
}
