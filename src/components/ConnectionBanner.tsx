import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloudOff, Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import {
  API_BASE_URL,
  API_OFFLINE_EVENT,
  API_ONLINE_EVENT,
  API_SLOW_DONE_EVENT,
  API_SLOW_EVENT,
  isBackendConfigured,
} from "@/lib/api/client";

/**
 * Global connection status.
 *  - "waking up" strip while a request is slow (server cold start)
 *  - a blocking-looking (but dismiss-free) card when the device is offline or
 *    the kitchen server can't be reached, with a manual retry
 *  - a green "back online" toast the moment the connection returns
 * Purely presentational — it never signs anyone out.
 */
export function ConnectionBanner() {
  const [waking, setWaking] = useState(false);
  const [offline, setOffline] = useState(false); // device has no network
  const [serverDown, setServerDown] = useState(false); // network ok, API unreachable
  const [checking, setChecking] = useState(false);
  const wasDown = useRef(false);

  const down = offline || serverDown;

  const ping = useCallback(async () => {
    if (!isBackendConfigured()) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/menu/`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      return res.ok || res.status < 500;
    } catch {
      return false;
    }
  }, []);

  const retry = useCallback(async () => {
    setChecking(true);
    const alive = await ping();
    setChecking(false);
    if (alive) {
      setServerDown(false);
      setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    } else {
      toast.error("Still no connection", {
        description: "Check your mobile data or Wi-Fi and try again.",
      });
    }
  }, [ping]);

  useEffect(() => {
    const slow = () => setWaking(true);
    const doneSlow = () => setWaking(false);
    const off = () => setOffline(true);
    const on = () => {
      setOffline(false);
      void retry();
    };
    const apiDown = () => setServerDown(true);
    const apiUp = () => setServerDown(false);

    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    window.addEventListener(API_SLOW_EVENT, slow);
    window.addEventListener(API_SLOW_DONE_EVENT, doneSlow);
    window.addEventListener(API_OFFLINE_EVENT, apiDown);
    window.addEventListener(API_ONLINE_EVENT, apiUp);
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      window.removeEventListener(API_SLOW_EVENT, slow);
      window.removeEventListener(API_SLOW_DONE_EVENT, doneSlow);
      window.removeEventListener(API_OFFLINE_EVENT, apiDown);
      window.removeEventListener(API_ONLINE_EVENT, apiUp);
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
    };
  }, [retry]);

  // Auto re-check every 8s while we're down.
  useEffect(() => {
    if (!down) return;
    const id = window.setInterval(() => {
      void (async () => {
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;
        if (await ping()) {
          setServerDown(false);
          setOffline(false);
        }
      })();
    }, 8000);
    return () => window.clearInterval(id);
  }, [down, ping]);

  // Announce recovery once.
  useEffect(() => {
    if (down) {
      wasDown.current = true;
      return;
    }
    if (wasDown.current) {
      wasDown.current = false;
      toast.success("Back online", {
        description: "Connection restored — you can continue your order.",
        icon: <Wifi className="h-4 w-4" aria-hidden />,
      });
    }
  }, [down]);

  return (
    <>
      {waking && !down ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-[95] flex items-center justify-center gap-2 bg-charcoal/95 px-4 py-2 text-center font-display text-[11px] font-extrabold tracking-[0.12em] text-cream uppercase backdrop-blur"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          <CloudOff className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
          Waking up the kitchen — this can take up to 30 seconds
        </div>
      ) : null}

      <AnimatePresence>
        {down ? (
          <motion.div
            key="conn"
            role="alertdialog"
            aria-live="assertive"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed inset-x-3 bottom-3 z-[110] mx-auto max-w-md rounded-3xl border-2 border-charcoal/10 bg-cream p-4 shadow-[0_24px_60px_rgba(30,10,10,0.35)] sm:inset-x-auto sm:right-5 sm:bottom-5"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-flame/12 text-flame">
                <WifiOff className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-extrabold uppercase tracking-[0.1em] text-charcoal">
                  {offline ? "You're offline" : "Can't reach the kitchen"}
                </p>
                <p className="mt-1 font-body text-xs leading-relaxed text-charcoal/70">
                  {offline
                    ? "Please turn on mobile data or connect to Wi-Fi. Your cart and sign-in are safe — we'll reconnect automatically."
                    : "Our server isn't responding right now. We keep retrying every few seconds — nothing you've entered is lost."}
                </p>
                <button
                  type="button"
                  onClick={() => void retry()}
                  disabled={checking}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-2 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-cream transition-colors hover:bg-flame disabled:opacity-60"
                >
                  {checking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {checking ? "Checking…" : "Try again"}
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
