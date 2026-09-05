/**
 * Tiny WebAudio sound kit — click, notification and success chimes.
 * No audio assets required, so it works offline and adds zero page weight.
 *
 * If you drop real files into `public/audio/` they win automatically:
 *   public/audio/click.mp3
 *   public/audio/notify.mp3
 *   public/audio/urdu-ai.mp3   <- pre-recorded Urdu AI greeting
 */

import clickAsset from "@/assets/click.wav.asset.json";

export type SfxName =
  | "click"
  | "hover"
  | "notify"
  | "success"
  | "error"
  | "warn"
  | "pop"
  | "toggle"
  | "cart"
  | "coin"
  | "swoosh"
  | "orderAlert";

const FILES: Record<SfxName, string> = {
  // Real UI click sound (CDN asset uploaded by the owner).
  click: clickAsset.url,
  hover: "/audio/hover.mp3",
  notify: "/audio/notify.mp3",
  success: "/audio/success.mp3",
  error: "/audio/error.mp3",
  warn: "/audio/warn.mp3",
  pop: "/audio/pop.mp3",
  toggle: "/audio/toggle.mp3",
  cart: "/audio/cart.mp3",
  coin: "/audio/coin.mp3",
  swoosh: "/audio/swoosh.mp3",
  orderAlert: "/audio/notify.mp3",
};


const MUTE_KEY = "kennedy.sound.muted";

let ctx: AudioContext | null = null;
const fileCache = new Map<string, HTMLAudioElement | null>();

export function isMuted() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean) {
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  window.dispatchEvent(new Event("kennedy:sound"));
}

function audioCtx() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Short synthesized blip. */
function blip(freq: number, duration: number, type: OscillatorType, gain = 0.06) {
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  vol.gain.setValueAtTime(0.0001, ac.currentTime);
  vol.gain.exponentialRampToValueAtTime(gain, ac.currentTime + 0.008);
  vol.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(vol).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration + 0.02);
}

/** Try a real file first; fall back to the synth. */
function tryFile(name: SfxName): boolean {
  if (fileCache.has(FILES[name])) {
    const cached = fileCache.get(FILES[name]);
    if (!cached) return false;
    const node = cached.cloneNode() as HTMLAudioElement;
    node.volume = 0.6;
    void node.play().catch(() => undefined);
    return true;
  }
  return false;
}

/** Warm the cache for any real audio files that exist in /public/audio. */
export function preloadSfx() {
  if (typeof window === "undefined") return;
  (Object.keys(FILES) as SfxName[]).forEach((name) => {
    const url = FILES[name];
    if (fileCache.has(url)) return;
    const el = new Audio(url);
    el.preload = "auto";
    el.addEventListener("canplaythrough", () => fileCache.set(url, el), { once: true });
    el.addEventListener("error", () => fileCache.set(url, null), { once: true });
  });
}

export function playSfx(name: SfxName) {
  if (typeof window === "undefined" || isMuted()) return;
  if (tryFile(name)) return;

  switch (name) {
    case "click":
      blip(880, 0.055, "triangle", 0.05);
      break;
    case "notify":
      blip(660, 0.09, "sine", 0.07);
      window.setTimeout(() => blip(990, 0.12, "sine", 0.06), 90);
      break;
    case "success":
      blip(587, 0.08, "sine", 0.06);
      window.setTimeout(() => blip(784, 0.09, "sine", 0.06), 80);
      window.setTimeout(() => blip(1046, 0.16, "sine", 0.05), 170);
      break;
    case "error":
      blip(320, 0.16, "sawtooth", 0.05);
      window.setTimeout(() => blip(240, 0.2, "sawtooth", 0.04), 120);
      break;
    case "warn":
      blip(520, 0.1, "square", 0.035);
      window.setTimeout(() => blip(420, 0.14, "square", 0.03), 110);
      break;
    case "hover":
      blip(1320, 0.03, "sine", 0.018);
      break;
    case "pop":
      blip(1180, 0.05, "sine", 0.045);
      window.setTimeout(() => blip(1560, 0.05, "sine", 0.03), 45);
      break;
    case "toggle":
      blip(700, 0.045, "square", 0.03);
      window.setTimeout(() => blip(1040, 0.06, "square", 0.028), 55);
      break;
    case "cart":
      blip(880, 0.06, "triangle", 0.05);
      window.setTimeout(() => blip(1318, 0.09, "triangle", 0.045), 70);
      break;
    case "coin":
      blip(988, 0.06, "square", 0.04);
      window.setTimeout(() => blip(1319, 0.14, "square", 0.035), 60);
      break;
    case "swoosh":
      blip(420, 0.14, "sine", 0.03);
      window.setTimeout(() => blip(300, 0.16, "sine", 0.022), 70);
      break;
    case "orderAlert":
      // Bright, distinct 4-tone ascending alert chime for newly assigned orders
      blip(784, 0.12, "triangle", 0.09); // G5
      window.setTimeout(() => blip(1046, 0.12, "triangle", 0.09), 110); // C6
      window.setTimeout(() => blip(1318, 0.16, "triangle", 0.09), 230); // E6
      window.setTimeout(() => blip(1568, 0.28, "sine", 0.08), 370); // G6
      break;
  }
}


/* ------------------------- pre-loaded Urdu AI voice ------------------------ */

const URDU_CLIP = "/audio/urdu-ai.mp3";
let urduEl: HTMLAudioElement | null = null;
let urduAvailable: boolean | null = null;

/** Preload the Urdu greeting clip so the tap plays instantly. */
export function preloadUrduVoice() {
  if (typeof window === "undefined" || urduEl) return;
  const el = new Audio(URDU_CLIP);
  el.preload = "auto";
  el.addEventListener("canplaythrough", () => {
    urduAvailable = true;
  }, { once: true });
  el.addEventListener("error", () => {
    urduAvailable = false;
  }, { once: true });
  urduEl = el;
}

/**
 * Plays the pre-recorded Urdu greeting. Returns false when no clip is
 * bundled, so the caller can fall back to live AI text-to-speech.
 */
export async function playUrduVoice(): Promise<boolean> {
  if (typeof window === "undefined" || isMuted()) return false;
  preloadUrduVoice();
  if (urduAvailable === false || !urduEl) return false;
  try {
    urduEl.currentTime = 0;
    await urduEl.play();
    return true;
  } catch {
    return false;
  }
}

/** Play base64 mp3 returned by the AI voice endpoint. */
export function playBase64Mp3(base64: string) {
  if (typeof window === "undefined" || isMuted()) return null;
  const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
  void audio.play().catch(() => undefined);
  return audio;
}
