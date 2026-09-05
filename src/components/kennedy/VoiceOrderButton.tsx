/**
 * VoiceOrderButton — Takii, the Kennedy AI Voice Host
 * Powered by @elevenlabs/react (Official Conversational AI WebRTC SDK)
 *
 * Features:
 *   • Direct real-time bidirectional audio with ultra-low latency (<300ms)
 *   • Auto-passes authenticated user session & dynamicVariables (name, phone, user_id, address)
 *   • Natural speech interruptibility, audio visualization & live Urdu transcripts
 *   • Live Order placement & tracking linked to Django database
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, Square, X, Loader2, Volume2, LogIn, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useAccount } from "@/lib/auth";
import { tokens, API_BASE_URL, normalizePath } from "@/lib/api/client";
import { ELEVENLABS } from "@/lib/api/endpoints";
import caddyAvatar from "@/assets/caddy-avatar.jpg";

type Turn = { role: "user" | "assistant"; content: string };

/* ─── Fetch signed URL from Django backend ──────────────────────────────────── */
async function fetchSignedUrl(): Promise<{
  signed_url: string;
  is_guest: boolean;
  user: {
    user_id: string;
    full_name: string;
    phone: string;
    delivery_address: string;
    delivery_area: string;
    username: string;
  } | null;
}> {
  const accessToken = tokens.access();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  // Single source of truth for URL shape: client.normalizePath() adds the
  // Django /api prefix + trailing slash exactly once.
  const url = `${API_BASE_URL}${normalizePath(ELEVENLABS.signedUrl)}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Signed URL fetch failed");
  return res.json();
}

/* ─── Inner Voice Component (inside ConversationProvider) ─────────────────────── */
function VoiceOrderButtonInner() {
  const { account, isLoading: authLoading } = useAccount();
  const isLoggedIn = !!account;

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Urdu mein bolein — menu, mashwara aur order.");
  const [isStarting, setIsStarting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Official ElevenLabs React hook
  const conversation = useConversation({
    onConnect: () => {
      setIsStarting(false);
      setError(null);
    },
    onDisconnect: () => {
      setIsStarting(false);
    },
    onMessage: (message) => {
      if (typeof message === "object" && message !== null) {
        const text = (message as { message?: string; text?: string }).message || (message as { text?: string }).text;
        const source = (message as { source?: string }).source;
        if (text) {
          setTurns((prev) => [
            ...prev,
            { role: source === "user" ? "user" : "assistant", content: text },
          ]);
        }
      }
    },
    onError: (rawErr: unknown) => {
      const err = rawErr as unknown;
      setIsStarting(false);
      const msg = typeof err === "string" ? err : err instanceof Error ? err.message : "Voice connection error.";
      setError(msg);
    },
  });

  const isConnected = conversation.status === "connected";
  const isConnecting = conversation.status === "connecting" || isStarting;
  const isSpeaking = conversation.isSpeaking;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, isSpeaking]);

  /* ── Start ElevenLabs Conversation ────────────────────────────────────────── */
  const handleStartSession = useCallback(async () => {
    setError(null);
    setIsStarting(true);
    try {
      // 1. Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Fetch signed URL + user info from Django
      let signed_url = "";
      let is_guest = true;
      let user = null;

      try {
        const data = await fetchSignedUrl();
        signed_url = data.signed_url;
        is_guest = data.is_guest;
        user = data.user;
      } catch {
        /* fallback to public agentId if signedUrl fails */
      }

      // 3. Build dynamic variables for ElevenLabs agent
      const dynamicVariables: Record<string, string> = {};
      if (!is_guest && user) {
        setGreeting(`Khush aamdeed ${user.full_name}! Aaj kya order karein?`);
        dynamicVariables.user_id = user.user_id;
        dynamicVariables.customer_name = user.full_name;
        dynamicVariables.customer_phone = user.phone;
        dynamicVariables.delivery_address = user.delivery_address || user.delivery_area;
      } else {
        setGreeting("Urdu mein bolein — menu, mashwara aur order.");
      }

      // 4. Start official ElevenLabs WebRTC session
      if (signed_url) {
        await conversation.startSession({
          signedUrl: signed_url,
          dynamicVariables,
        });
      } else {
        await conversation.startSession({
          agentId: "agent_0301m16yv1tke08bd29ztzt95j9b",
          dynamicVariables,
        });
      }
    } catch (err) {
      try {
        await conversation.startSession({
          agentId: "agent_0301m16yv1tke08bd29ztzt95j9b",
        });
      } catch (fallbackErr) {
        setIsStarting(false);
        setError(
          fallbackErr instanceof Error
            ? fallbackErr.message
            : "Microphone ya session connection error. Dobara try karein."
        );
      }
    }
  }, [conversation]);

  /* ── End session ──────────────────────────────────────────────────────────── */
  const handleEndSession = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      /* ignore */
    }
  }, [conversation]);

  /* ── Close panel ──────────────────────────────────────────────────────────── */
  const closePanel = useCallback(() => {
    setOpen(false);
    void handleEndSession();
  }, [handleEndSession]);

  /* ── Open panel & launch session ──────────────────────────────────────────── */
  const handleOpen = useCallback(() => {
    setOpen(true);
    if (isLoggedIn && !isConnected && !isConnecting) {
      void handleStartSession();
    }
  }, [isLoggedIn, isConnected, isConnecting, handleStartSession]);

  if (authLoading) return null;

  return (
    <>
      {/* Floating launcher button: Takii — Kennedy AI Voice Host */}
      <motion.button
        type="button"
        onClick={handleOpen}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.8 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          bottom: "calc(1.25rem + var(--kmg-cart-bar, 0px) + env(safe-area-inset-bottom))",
        }}
        className="fixed right-4 z-[150] flex cursor-pointer items-center gap-2.5 rounded-full border border-gold/50 bg-charcoal/95 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md sm:right-8 sm:py-2 sm:pl-2 sm:pr-4"
        aria-label="Takii — your Urdu voice guide"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full bg-gold/40"
            animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
            aria-hidden="true"
          />
          <img
            src={caddyAvatar}
            alt=""
            aria-hidden="true"
            className="relative h-9 w-9 rounded-full border-2 border-gold/80 object-cover" loading="lazy" decoding="async" />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-charcoal ${
              isConnected ? "bg-emerald-400 animate-pulse" : "bg-emerald-500"
            }`}
            aria-hidden="true"
          />
        </span>
        <span className="hidden flex-col items-start text-left leading-none sm:flex">
          <span className="flex items-center gap-1 font-display text-xs font-black tracking-wider text-cream uppercase">
            Takii <Sparkles className="h-3 w-3 text-gold" />
          </span>
          <span className="mt-0.5 text-[0.65rem] font-semibold tracking-wider text-gold">
            {isConnected ? "Live Voice..." : "Urdu Voice Host"}
          </span>
        </span>
        <Mic
          className={`hidden h-4 w-4 sm:block ${isConnected ? "animate-bounce text-emerald-400" : "text-gold"}`}
          aria-hidden="true"
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-end justify-center bg-charcoal/70 p-0 backdrop-blur-md sm:items-center sm:p-6"
            onClick={closePanel}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-[#FFFDF9] shadow-[0_-20px_70px_rgba(0,0,0,0.5)] sm:rounded-3xl border border-gold/20"
            >
              {/* Header */}
              <div className="relative flex items-center gap-3 bg-gradient-to-r from-charcoal via-[#221f1d] to-charcoal px-5 py-4 text-cream border-b border-gold/30">
                <div className="relative">
                  <img
                    src={caddyAvatar}
                    alt="Takii, your voice guide"
                    className="h-11 w-11 rounded-full border-2 border-gold/80 object-cover shadow" loading="lazy" decoding="async" />
                  {isConnected && (
                    <motion.span
                      className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white font-bold ring-2 ring-charcoal"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ✓
                    </motion.span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-extrabold uppercase tracking-wide text-cream">
                      Takii · AI Food Host
                    </p>
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[0.65rem] font-bold text-gold border border-gold/30">
                      Roman Urdu
                    </span>
                  </div>
                  <p className="font-body text-xs text-cream/75 truncate mt-0.5">{greeting}</p>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Close"
                  className="rounded-full bg-cream/10 p-2 text-cream/80 hover:bg-cream/20 hover:text-cream transition cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Body: Not logged in */}
              {!isLoggedIn ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center bg-cream/30">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold border border-gold/30">
                    <LogIn className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-charcoal">
                      Login to Order by Voice
                    </p>
                    <p className="font-body text-xs text-charcoal/65 mt-1 max-w-xs">
                      Apne account se voice order karne ke liye pehle login karein taake order aapki history mein save ho.
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={closePanel}
                    className="mt-2 flex items-center gap-2 rounded-full bg-flame hover:bg-flame-dark px-6 py-3 font-display text-xs font-extrabold uppercase tracking-wider text-cream shadow-[0_8px_20px_rgba(200,40,20,0.3)] transition"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In / Sign Up
                  </Link>
                </div>
              ) : (
                <>
                  {/* Live Conversation Transcript */}
                  <div ref={scrollRef} className="min-h-[220px] max-h-[320px] flex-1 space-y-3 overflow-y-auto p-5 bg-[#FAF7F2]">
                    {isConnecting && (
                      <div className="flex items-center justify-center gap-2 rounded-2xl bg-charcoal/5 px-4 py-3 font-body text-xs text-charcoal/70 border border-charcoal/10">
                        <Loader2 className="h-4 w-4 animate-spin text-gold" />
                        Takii AI se connect ho raha hai...
                      </div>
                    )}

                    {!isConnecting && turns.length === 0 && !error && (
                      <div className="rounded-2xl bg-gold/10 p-5 text-center font-body text-xs text-charcoal/80 border border-gold/25 space-y-2">
                        <p className="font-bold text-sm text-charcoal">🎙️ Boliye, main sun raha hoon!</p>
                        <p className="text-charcoal/70">
                          Misaal: <span className="font-semibold text-flame">"Ek Regular Kennedy Inferno Pizza Circular Road par bhej dein"</span>
                        </p>
                      </div>
                    )}

                    {turns.map((t, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`max-w-[85%] rounded-2xl px-4 py-3 font-body text-xs sm:text-sm leading-relaxed shadow-sm ${
                          t.role === "user"
                            ? "ml-auto bg-flame text-cream font-medium"
                            : "mr-auto bg-white text-charcoal border border-charcoal/10"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[0.65rem] opacity-75 font-bold uppercase tracking-wider">
                          {t.role === "user" ? "Aap" : "Takii (AI Host)"}
                        </div>
                        {t.content}
                      </motion.div>
                    ))}

                    {isSpeaking && (
                      <div className="mr-auto flex items-center gap-2 rounded-2xl bg-gold/15 px-4 py-2 font-body text-xs text-charcoal font-semibold border border-gold/30">
                        <Volume2 className="h-4 w-4 text-gold animate-bounce" /> Takii bol raha hai...
                      </div>
                    )}

                    {error && (
                      <div className="rounded-2xl bg-red-50 p-4 font-body text-xs text-red-600 border border-red-200">
                        <p className="font-bold">⚠️ Connection Issue:</p>
                        <p className="mt-0.5">{error}</p>
                      </div>
                    )}
                  </div>

                  {/* Audio Controls & Pulse Ring */}
                  <div className="flex flex-col items-center justify-center gap-3 border-t border-charcoal/10 bg-white px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                    <div className="relative flex items-center justify-center">
                      {/* Pulsing ring when connected/speaking */}
                      {isConnected && (
                        <motion.div
                          className={`absolute -inset-3 rounded-full ${
                            isSpeaking ? "bg-gold/40" : "bg-emerald-400/30"
                          }`}
                          animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0.2, 0.7] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        />
                      )}

                      <motion.button
                        type="button"
                        disabled={isConnecting}
                        onClick={isConnected ? handleEndSession : handleStartSession}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.94 }}
                        className={`relative flex h-18 w-18 items-center justify-center rounded-full text-cream shadow-[0_12px_28px_rgba(0,0,0,0.3)] transition cursor-pointer ${
                          isConnecting
                            ? "bg-charcoal/60 cursor-not-allowed"
                            : isConnected
                              ? "bg-charcoal hover:bg-charcoal/90 ring-4 ring-emerald-400/50"
                              : "bg-flame hover:bg-flame-dark ring-4 ring-gold/40"
                        }`}
                        aria-label={isConnected ? "Call khatam karein" : "Baat shuru karein"}
                      >
                        {isConnecting ? (
                          <Loader2 className="h-7 w-7 animate-spin" />
                        ) : isConnected ? (
                          <Square className="h-7 w-7 text-red-400" />
                        ) : (
                          <Mic className="h-8 w-8 text-cream" />
                        )}
                      </motion.button>
                    </div>

                    <div className="text-center">
                      <p className="font-display text-xs font-bold text-charcoal uppercase tracking-wider">
                        {isConnecting
                          ? "Connecting..."
                          : isConnected
                            ? isSpeaking
                              ? "Takii is speaking..."
                              : "Sun raha hoon... Boliye!"
                            : "Tap mic to talk in Urdu"}
                      </p>
                      <p className="font-body text-[0.7rem] text-charcoal/60 mt-0.5">
                        {isConnected ? "Microphone active · Real-time duplex" : "Automatic order placement & status tracking"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Export wrapped in ConversationProvider for SSR & Self-contained safety ─── */
export function VoiceOrderButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <ConversationProvider>
      <VoiceOrderButtonInner />
    </ConversationProvider>
  );
}
