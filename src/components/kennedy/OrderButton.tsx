import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "flame" | "cream";
  className?: string;
  onClick?: () => void;
};

const sizes = {
  sm: "px-6 py-2.5 text-lg",
  md: "px-9 py-3.5 text-2xl",
  lg: "px-12 py-5 text-3xl sm:text-4xl",
};

export function OrderButton({ children, size = "md", variant = "flame", className, onClick }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={reduce ? undefined : { scale: 1.06, rotate: -1 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 20 }}

      className={cn(
        "order-blob uppercase will-change-transform",
        variant === "cream" && "bg-cream text-flame hover:bg-cream-deep",
        sizes[size],
        className,
      )}
    >
      {children}
      <span className="order-blob__leaf" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 text-[oklch(0.62_0.15_150)]"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      </span>
    </motion.button>
  );
}
