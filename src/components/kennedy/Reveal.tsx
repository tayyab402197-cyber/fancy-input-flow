/**
 * REVEAL — scroll-triggered entrance animation.
 *
 * Wrap any block to make it fade + travel in the first time it enters the
 * viewport. Respects the user's reduced-motion preference.
 */
import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Direction = "up" | "down" | "left" | "right" | "fade" | "zoom";

const OFFSET: Record<Direction, { x?: number; y?: number; scale?: number }> = {
  up: { y: 42 },
  down: { y: -42 },
  left: { x: -56 },
  right: { x: 56 },
  fade: {},
  zoom: { scale: 0.9 },
};

/**
 * Reveals trigger as soon as any part of the block scrolls in, with a small
 * bottom margin so it starts just before it is fully on screen. Ratio-based
 * thresholds are avoided on purpose: a block taller than the viewport (very
 * common on phones) could never satisfy them and stayed invisible forever.
 */
const VIEWPORT = { once: true, amount: "some", margin: "0px 0px -12% 0px" } as const;

export function Reveal({
  children,
  from = "up",
  delay = 0,
  duration = 0.7,
  amount: _amount = 0.25,
  className,
}: {
  children: ReactNode;
  from?: Direction;
  delay?: number;
  duration?: number;
  amount?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: 0, y: 0, scale: 1, ...OFFSET[from] }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={VIEWPORT}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}


/** Staggered children container — pair with <RevealItem>. */
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 34 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}


export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
