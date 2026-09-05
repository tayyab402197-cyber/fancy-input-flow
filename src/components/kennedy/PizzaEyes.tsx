import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

const EYE_OFFSET = 9; // max pupil travel in local svg units

function Eye({ cx }: { cx: number }) {
  const reduce = useReducedMotion();
  const socketRef = useRef<SVGEllipseElement | null>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 300, damping: 20 });
  const y = useSpring(rawY, { stiffness: 300, damping: 20 });

  useEffect(() => {
    if (reduce) return;
    const handleMove = (event: MouseEvent) => {
      const el = socketRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const distance = Math.hypot(dx, dy) || 1;
      // convert px -> svg units using rendered socket size
      const unitsPerPx = r.width ? 60 / r.width : 1;
      const scale = Math.min(distance * unitsPerPx, EYE_OFFSET) / distance;
      rawX.set(dx * scale);
      rawY.set(dy * scale);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [rawX, rawY, reduce]);

  return (
    <g>
      <motion.g
        style={{ transformOrigin: `${cx}px 74px` }}
        animate={reduce ? undefined : { scaleY: [1, 1, 0.08, 1, 1] }}
        transition={{
          duration: 4.5,
          times: [0, 0.9, 0.94, 0.98, 1],
          repeat: Infinity,
          repeatDelay: 0.6,
          ease: "easeInOut",
        }}
      >
        <ellipse
          ref={socketRef}
          cx={cx}
          cy={74}
          rx={30}
          ry={36}
          fill="#fffdf6"
          stroke="#231007"
          strokeWidth="7"
        />
        <motion.g style={{ x, y }}>
          <ellipse cx={cx} cy={76} rx={12} ry={15} fill="#231007" />
          <circle cx={cx - 4} cy={69} r={3.5} fill="#fffdf6" />
        </motion.g>
      </motion.g>
    </g>
  );
}

/** Blinking, cursor-tracking mascot eyes overlaid on the hero pizza. */
export function PizzaEyes() {
  return (
    <svg
      viewBox="0 0 200 120"
      aria-hidden="true"
      className="pointer-events-none absolute top-[2%] left-[30%] w-[26%] max-w-[190px]"
    >
      <path
        d="M14 26 Q38 6 66 20"
        fill="none"
        stroke="#231007"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M108 20 Q136 6 160 26"
        fill="none"
        stroke="#231007"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <Eye cx={45} />
      <Eye cx={130} />
    </svg>
  );
}
