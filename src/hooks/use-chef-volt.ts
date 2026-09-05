import { useCallback, useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

export type VoltMood = "idle" | "watching" | "happy" | "excited" | "pressed" | "shy" | "success";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const DOUGH_LEVELS = ["NOT LOOKING", "TOO THIN", "GETTING THERE", "STONE BAKED", "DEEP DISH"];

export const pickLine = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T;

/**
 * Chef Volt — the dough-guarding robot that reacts to the auth form.
 * Pure presentation state; no auth logic lives here.
 */
export function useChefVolt(firstLine: string) {
  const reducedMotion = useReducedMotion();
  const reducedRef = useRef(false);
  reducedRef.current = reducedMotion;
  const [mood, setMood] = useState<VoltMood>("idle");
  const [turned, setTurned] = useState(false);
  const [hyped, setHyped] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [blink, setBlink] = useState(false);
  const [done, setDone] = useState(false);
  const [line, setLine] = useState(firstLine);
  const [popKey, setPopKey] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ ry: 0, rx: 0 });
  const [strength, setStrength] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState(DOUGH_LEVELS[0]!);

  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const robotRef = useRef<HTMLDivElement | null>(null);
  const lastSaid = useRef(firstLine);
  const doneRef = useRef(false);

  const say = useCallback((text: string) => {
    if (lastSaid.current === text) return;
    lastSaid.current = text;
    setLine(text);
    setPopKey((k) => k + 1);
  }, []);

  const setMoodSafe = useCallback((m: VoltMood) => {
    if (!doneRef.current) setMood(m);
  }, []);

  const follow = useCallback((value: string) => {
    if (reducedRef.current) return;
    const r = Math.min(value.length / 22, 1);
    setLook({ x: -6 + 12 * r, y: 5 });
    setTilt({ ry: -5 + 10 * r, rx: -8 });
  }, []);

  const scorePassword = useCallback((v: string) => {
    let score = 0;
    if (v.length >= 8) score++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^a-zA-Z0-9]/.test(v)) score++;
    if (v.length > 0 && score === 0) score = 1;
    setStrength(v.length === 0 ? 0 : score);
    setStrengthLabel(v.length === 0 ? DOUGH_LEVELS[0]! : (DOUGH_LEVELS[score] ?? DOUGH_LEVELS[0]!));
  }, []);

  // idle blinking
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(
        () => {
          if (!doneRef.current && !turned && !reducedRef.current) {
            setBlink(true);
            setTimeout(() => setBlink(false), 150);
          }
          loop();
        },
        2600 + Math.random() * 2600,
      );
    };
    loop();
    return () => clearTimeout(t);
  }, [turned]);

  // eye / head tracking
  useEffect(() => {
    let pending = false;
    const onMove = (e: MouseEvent) => {
      const active = document.activeElement;
      if (doneRef.current || reducedRef.current || (active && active.tagName === "INPUT")) return;
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const el = robotRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 260));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 260));
        setLook({ x: dx * 7, y: dy * 6 });
        if (!turned) setTilt({ ry: dx * 12, rx: -dy * 9 });
      });
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [turned]);

  const confetti = useCallback(() => {
    if (reducedRef.current) return;
    const host = sceneRef.current;
    const origin = btnRef.current?.getBoundingClientRect();
    if (!host || !origin) return;
    const hostRect = host.getBoundingClientRect();
    const ox = origin.left - hostRect.left + origin.width / 2;
    const oy = origin.top - hostRect.top;
    const colors = ["#c9241d", "#e8a33d", "#f2e6cd", "#3f2c20", "#4f9d54"];
    for (let i = 0; i < 60; i++) {
      const bit = document.createElement("span");
      bit.className = "kp-confetti";
      bit.style.background = pickLine(colors);
      if (Math.random() > 0.5) bit.style.borderRadius = "50%";
      host.appendChild(bit);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 220 + Math.random() * 360;
      bit.animate(
        [
          { transform: `translate(${ox}px, ${oy}px) rotate(0deg) scale(1)`, opacity: 1 },
          {
            transform: `translate(${ox + Math.cos(angle) * speed}px, ${
              oy + Math.sin(angle) * speed + 320
            }px) rotate(${540 * (Math.random() > 0.5 ? 1 : -1)}deg) scale(.6)`,
            opacity: 0,
          },
        ],
        { duration: 1100 + Math.random() * 700, easing: "cubic-bezier(.15,.6,.35,1)" },
      ).onfinish = () => bit.remove();
    }
  }, []);

  const complain = useCallback(
    (text: string) => {
      setTimeout(() => {
        say(text);
        setMoodSafe("watching");
      }, 320);
      if (!reducedRef.current) {
        setShaking(false);
        requestAnimationFrame(() => setShaking(true));
        setTimeout(() => setShaking(false), 460);
      }
    },
    [say, setMoodSafe],
  );

  const celebrate = useCallback(
    (text: string) => {
      doneRef.current = true;
      setDone(true);
      setTurned(false);
      setHyped(false);
      setMood("success");
      say(text);
      setLook({ x: 0, y: 0 });
      setTilt({ ry: 0, rx: 0 });
      if (!reducedRef.current) {
        setSpinning(true);
        setTimeout(() => setSpinning(false), 950);
        confetti();
      }
    },
    [confetti, say],
  );

  const hype = useCallback(
    (on: boolean) => {
      if (doneRef.current) return;
      setHyped(on);
      if (on) {
        setTurned(false);
        setMoodSafe("excited");
        say(pickLine(["Ooh. Press it. Pizza awaits.", "This is my favourite part."]));
      } else {
        setMoodSafe("idle");
        say("The button misses you already.");
      }
    },
    [say, setMoodSafe],
  );

  return {
    reducedMotion,
    mood,
    turned,
    hyped,
    spinning,
    shaking,
    blink,
    done,
    line,
    popKey,
    look,
    tilt,
    strength,
    strengthLabel,
    sceneRef,
    btnRef,
    robotRef,
    say,
    setMood,
    setMoodSafe,
    setTurned,
    setPressedMood: (p: boolean) => {
      if (!doneRef.current) setMood(p ? "pressed" : "excited");
    },
    follow,
    scorePassword,
    complain,
    celebrate,
    hype,
    resetLook: () => {
      setLook({ x: 0, y: 0 });
      setTilt({ ry: 0, rx: 0 });
    },
  };
}

export type ChefVolt = ReturnType<typeof useChefVolt>;
