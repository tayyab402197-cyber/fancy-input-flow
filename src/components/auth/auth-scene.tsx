import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChefHat, Flame, ShieldCheck, Sparkles } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Flame, title: "Flame-grilled nightly", copy: "Every order fired to order in the Kennedy pit." },
  { icon: ShieldCheck, title: "Verified payments", copy: "Cash, card and wallet receipts logged for the owner." },
  { icon: Sparkles, title: "Live rider tracking", copy: "Watch your pin move from grill to gate." },
];

export function AuthScene({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="auth-stage min-h-screen px-4 py-8 sm:px-6 lg:px-10 lg:py-14">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
        {/* Brand side */}
        <motion.section
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="order-2 hidden lg:order-1 lg:block"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-xs font-extrabold tracking-[0.24em] text-flame-dark uppercase"
          >
            <ChefHat className="h-4 w-4" /> Kennedy Moon Grill
          </Link>
          <h2 className="mt-5 font-display text-5xl leading-[0.95] font-black tracking-tight text-charcoal uppercase xl:text-6xl">
            The whole
            <span className="block text-flame">grill house</span>
            in one account.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-charcoal/70">
            One sign-in for guests, kitchen staff and delivery partners — with the
            right console waiting on the other side.
          </p>

          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((h, i) => (
              <motion.li
                key={h.title}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-3 rounded-2xl border border-charcoal/10 bg-white/60 p-4 backdrop-blur-sm"
              >
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-flame/12 text-flame">
                  <h.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-display text-xs font-extrabold tracking-[0.16em] text-charcoal uppercase">
                    {h.title}
                  </span>
                  <span className="text-xs text-charcoal/65">{h.copy}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.section>

        {/* Card side */}
        <motion.section
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="auth-card order-1 w-full p-6 sm:p-8 lg:order-2"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-[11px] font-extrabold tracking-[0.24em] text-flame-dark uppercase lg:hidden"
          >
            <ChefHat className="h-4 w-4" /> Kennedy Moon Grill
          </Link>
          <p className="mt-4 font-display text-[11px] font-extrabold tracking-[0.28em] text-flame uppercase lg:mt-0">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl leading-none font-black tracking-tight text-charcoal uppercase sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-charcoal/65">{subtitle}</p>

          <div className="mt-6">{children}</div>

          <div className="mt-6 border-t border-charcoal/10 pt-4 text-center text-xs text-charcoal/65">
            {footer}
          </div>
        </motion.section>
      </div>
    </main>
  );
}
