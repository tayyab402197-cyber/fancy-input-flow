import { useEffect, useRef, useState } from "react";

import robot from "@/assets/white-robot.png";
import { DISHES } from "@/lib/menu";

/**
 * A glossy white robot that trails the cursor while the restaurant's signature
 * dishes hang beneath it on an elastic string — each bead chases the one above
 * with its own spring, so the rope stretches, whips and settles as you move.
 */

type Bead = { x: number; y: number; vx: number; vy: number };

const ITEMS = DISHES.slice(0, 5);
const SIZES = [40, 34, 30, 26, 22];

export function CursorRobot() {
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLImageElement>(null);
  const beadRefs = useRef<(HTMLImageElement | null)[]>([]);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const head: Bead = { x: target.x, y: target.y, vx: 0, vy: 0 };
    const beads: Bead[] = ITEMS.map(() => ({ x: target.x, y: target.y, vx: 0, vy: 0 }));
    let tilt = 0;
    let visible = 0;
    let squash = 1;

    // Interactive surfaces where the trailing robot would get in the way of
    // reading, typing or clicking: it fades out while the pointer is over them.
    const QUIET_ZONE =
      'a, button, input, textarea, select, label, [role="button"], [role="link"], [role="textbox"], [role="menuitem"], [role="tab"], [role="option"], [contenteditable="true"], [data-no-cursor-robot]';

    const isQuiet = (t: EventTarget | null) =>
      t instanceof Element ? Boolean(t.closest(QUIET_ZONE)) : false;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      visible = isQuiet(e.target) ? 0 : 1;
    };
    const onLeave = () => {
      visible = 0;
    };
    const onDown = () => {
      squash = 0.78;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);

    // spring integration: stiffness / damping per link, looser further down
    const step = (b: Bead, tx: number, ty: number, k: number, d: number) => {
      b.vx = (b.vx + (tx - b.x) * k) * d;
      b.vy = (b.vy + (ty - b.y) * k) * d;
      b.x += b.vx;
      b.y += b.vy;
    };

    let raf = 0;
    let opacity = 0;

    const frame = () => {
      // stiffer, quickly-settling springs: the string barely stretches now
      step(head, target.x, target.y, 0.45, 0.55);

      let px = head.x;
      let py = head.y;
      beads.forEach((b, i) => {
        const k = 0.42 - i * 0.02;
        const gap = 26 + i * 2;
        // hang point: a little below the bead above it (near-rigid link)
        step(b, px, py + gap, Math.max(0.3, k), 0.52);
        px = b.x;
        py = b.y;
      });

      tilt += (Math.max(-12, Math.min(12, head.vx * 0.8)) - tilt) * 0.15;

      squash += (1 - squash) * 0.12;
      opacity += (visible - opacity) * 0.12;

      if (wrapRef.current) wrapRef.current.style.opacity = String(opacity);
      if (headRef.current) {
        headRef.current.style.transform = `translate3d(${head.x - 34}px, ${head.y - 34}px, 0) rotate(${tilt}deg) scale(${squash})`;
      }
      beads.forEach((b, i) => {
        const el = beadRefs.current[i];
        if (!el) return;
        const s = SIZES[i]!;
        el.style.transform = `translate3d(${b.x - s / 2}px, ${b.y - s / 2}px, 0) rotate(${tilt * (1 - i * 0.12)}deg)`;
      });

      if (pathRef.current) {
        const pts = [{ x: head.x, y: head.y }, ...beads];
        let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
        for (let i = 1; i < pts.length; i += 1) {
          const a = pts[i - 1]!;
          const b = pts[i]!;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2 + 2; // barely any sag in the string
          d += ` Q ${mx} ${my} ${b.x} ${b.y}`;
        }
        pathRef.current.setAttribute("d", d);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none fixed inset-0 z-[900] hidden opacity-0 md:block"
      aria-hidden="true"
    >
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <path
          ref={pathRef}
          d=""
          fill="none"
          stroke="var(--color-flame)"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="5 6"
        />
      </svg>

      {ITEMS.map((dish, i) => (
        <img
          key={dish.slug}
          ref={(el) => {
            beadRefs.current[i] = el;
          }}
          src={dish.image}
          alt=""
          style={{
            width: `${SIZES[i]}px`,
            height: `${SIZES[i]}px`,
            maxWidth: "none",
            willChange: "transform",
          }}
          className="absolute left-0 top-0 rounded-full border-2 border-cream bg-cream object-cover shadow-[0_6px_16px_rgba(0,0,0,0.28)]"
          loading="lazy"
          decoding="async"
        />
      ))}

      <img
        ref={headRef}
        src={robot}
        alt=""
        width={816}
        height={816}
        style={{ width: "68px", height: "68px", maxWidth: "none", willChange: "transform" }}
        className="absolute left-0 top-0 drop-shadow-[0_10px_18px_rgba(0,0,0,0.35)]" loading="lazy" decoding="async" />
    </div>
  );
}
