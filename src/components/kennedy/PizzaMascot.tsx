import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import gsap from "gsap";
import { PizzaEyes } from "./PizzaEyes";


/**
 * Hero pizza mascot.
 * - Framer Motion: entrance spring, cursor-follow 3D tilt, cheese-pull stretch, blinking eyes.
 * - GSAP: infinite steam drift loop + infinite hand bounce loop (with a hover "tap").
 * Libraries never drive the same element.
 */
export function PizzaMascot() {
  const reduce = useReducedMotion();
  const steamRefs = useRef<Array<HTMLImageElement | null>>([]);
  const handRef = useRef<HTMLDivElement | null>(null);
  const floatRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const handTap = useRef<gsap.core.Tween | null>(null);
  
  const [settled, setSettled] = useState(false);

  // --- cursor parallax tilt (Framer Motion) ---
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-11, 11]), {
    stiffness: 150,
    damping: 18,
  });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [11, -11]), {
    stiffness: 150,
    damping: 18,
  });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  // --- GSAP loops ---
  useEffect(() => {
    if (reduce) return;
    const ctx = gsap.context(() => {
      steamRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, { opacity: 0, y: 0, x: 0, scale: 0.85 });
        gsap
          .timeline({ repeat: -1, delay: i * 1 })
          .to(el, { opacity: 0.8, duration: 0.9, ease: "sine.out" }, 0)
          .to(el, { y: -20, scale: 1.12, duration: 3, ease: "none" }, 0)
          .to(el, { x: 12, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0)
          .to(el, { opacity: 0, duration: 1.6, ease: "sine.in" }, 1.4);
      });

      if (floatRef.current) {
        gsap
          .timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } })
          .to(floatRef.current, { y: -18, duration: 3.2 }, 0)
          .to(floatRef.current, { rotate: 3.5, duration: 4.6 }, 0)
          .to(floatRef.current, { scale: 1.015, duration: 3.8 }, 0);
      }

      if (glowRef.current) {
        gsap.to(glowRef.current, {
          scale: 1.12,
          opacity: 0.9,
          duration: 2.8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }

      if (handRef.current) {
        gsap.to(handRef.current, {
          y: -8,
          duration: 1.2,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });
      }
    });
    return () => ctx.revert();
  }, [reduce]);

  function tapHand() {
    if (reduce || !handRef.current) return;
    handTap.current?.kill();
    handTap.current = gsap.fromTo(
      handRef.current,
      { scale: 0.95 },
      { scale: 1.05, duration: 0.16, ease: "power2.out", yoyo: true, repeat: 1 },
    );
  }




  return (
    <div
      className="relative mx-auto w-full max-w-[46rem] [perspective:1200px]"
      onMouseMove={handleMove}
      onMouseEnter={tapHand}
      onMouseLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      {/* steam wisps */}
      <div className="pointer-events-none absolute inset-x-[30%] top-[-2%] z-20 flex justify-between">
        {[0, 1, 2].map((i) => (
          <img
            key={i}
            ref={(el) => {
              steamRefs.current[i] = el;
            }}
            src="/images/steam-wisp.png"
            alt=""
            aria-hidden="true"
            width={1024}
            height={682}
            className="h-20 w-28 rotate-[-78deg] opacity-0 will-change-transform sm:h-28 sm:w-40"
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>

      {/* warm luxury glow */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="hero-glow pointer-events-none absolute inset-[8%_6%_14%_6%] z-0 opacity-70 blur-[2px] will-change-transform"
      />

      {/* pizza + tilt */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, rotate: -6 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -2 }}
        transition={
          reduce
            ? { duration: 0.4, delay: 0.3 }
            : { type: "spring", stiffness: 90, damping: 13, delay: 0.4 }
        }
        onAnimationComplete={() => setSettled(true)}
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative z-10 will-change-transform"
      >
        <div ref={floatRef} className="will-change-transform">
        {/* cheese-pull rubber-band stretch, once after settle */}
        <motion.div
          animate={settled && !reduce ? { scaleY: [1, 1.04, 0.985, 1] } : undefined}
          transition={{ duration: 1, times: [0, 0.4, 0.7, 1], ease: "easeInOut" }}
          style={{ transformOrigin: "50% 90%" }}
          className="relative"
        >
          <img
            src="/images/pizza-hero.png"
            alt="Kennedy signature spicy pepperoni and jalapeño pizza with a cheese-pull slice"
            width={1024}
            height={625}
            fetchPriority="high"
            className="w-full drop-shadow-[0_18px_14px_rgba(60,20,10,0.28)] drop-shadow-[0_44px_54px_rgba(60,20,10,0.4)]" decoding="async" />

          {/* mascot eyes + brows */}
          <PizzaEyes />

        </motion.div>
        </div>
      </motion.div>

      {/* pointing hand */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="pointer-events-none absolute top-[20%] right-[2%] z-30 w-[28%] max-w-[210px]"
      >
        <div ref={handRef} className="will-change-transform">
          <img
            src="/images/hand-pointing.png"
            alt=""
            aria-hidden="true"
            width={1024}
            height={1024}
            className="w-full drop-shadow-[0_10px_18px_rgba(60,20,10,0.35)]" loading="lazy" decoding="async" />
        </div>
      </motion.div>
    </div>
  );
}
