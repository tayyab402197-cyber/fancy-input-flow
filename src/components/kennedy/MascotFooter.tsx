import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Facebook, Instagram, Phone, Globe, Youtube, Music2, Flame } from "lucide-react";
import { OrderButton } from "./OrderButton";
import mascotLeft from "@/assets/mascot-munsters.png";
import mascotRight from "@/assets/mascot-kennedy.png";

/**
 * Big red "mascot band" footer: two 3D characters peek in from both edges
 * holding pizza, with a centered badge, headline and CTA.
 * Framer Motion handles cursor parallax + scroll drift + idle float.
 */
export function MascotFooter() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 90, damping: 18, mass: 0.6 };
  const leftX = useSpring(useTransform(mx, [-0.5, 0.5], [-26, 18]), spring);
  const leftY = useSpring(useTransform(my, [-0.5, 0.5], [-14, 10]), spring);
  const rightX = useSpring(useTransform(mx, [-0.5, 0.5], [-18, 26]), spring);
  const rightY = useSpring(useTransform(my, [-0.5, 0.5], [10, -14]), spring);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end end"],
  });
  const riseLeft = useTransform(scrollYProgress, [0, 1], [90, 0]);
  const riseRight = useTransform(scrollYProgress, [0, 1], [130, 0]);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <footer className="relative bg-cream">
      <div
        ref={sectionRef}
        onMouseMove={handleMove}
        onMouseLeave={() => {
          mx.set(0);
          my.set(0);
        }}
        className="relative isolate overflow-hidden rounded-t-[2.5rem] bg-flame px-5 pt-16 pb-0 sm:rounded-t-[4rem] sm:px-8 sm:pt-24"
      >
        {/* soft glow behind the copy */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 left-1/2 -z-10 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember/40 blur-[90px]"
        />

        {/* left mascot */}
        <motion.img
          src={mascotLeft}
          alt=""
          aria-hidden="true"
          loading="lazy"
          style={reduce ? undefined : { x: leftX, y: riseLeft, translateY: leftY }}
          className="pointer-events-none absolute bottom-[13rem] -left-[14%] z-0 w-[46%] sm:bottom-[6.5rem] max-w-[30rem] origin-bottom drop-shadow-[0_24px_40px_rgba(60,10,10,0.45)] sm:-left-[6%] sm:w-[34%] lg:left-[-2%] lg:w-[26%]"
        />
        {/* right mascot */}
        <motion.img
          src={mascotRight}
          alt=""
          aria-hidden="true"
          loading="lazy"
          style={reduce ? undefined : { x: rightX, y: riseRight, translateY: rightY }}
          className="pointer-events-none absolute -right-[16%] bottom-[13rem] z-0 w-[48%] sm:bottom-[6.5rem] max-w-[32rem] origin-bottom drop-shadow-[0_24px_40px_rgba(60,10,10,0.45)] sm:-right-[6%] sm:w-[36%] lg:right-[-2%] lg:w-[28%]"
        />

        {/* centered copy */}
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center pb-[38vw] text-center sm:pb-[26vw] lg:pb-40">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-cream px-5 py-2 font-display text-xs font-extrabold tracking-[0.22em] text-flame uppercase shadow-[var(--shadow-pill)] sm:text-sm"
          >
            <Flame className="h-4 w-4" aria-hidden="true" /> Boost your craving
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 font-hero text-[10vw] leading-[0.92] text-cream uppercase sm:text-6xl lg:text-7xl"
          >
            Turning cravings
            <br />
            into flavour.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 max-w-md font-body text-sm text-cream/85 sm:text-base"
          >
            The full heat of Kennedy comes from stone-baked dough, flame-charred
            toppings and chillies we roast fresh every morning.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.3 }}
            className="mt-8"
          >
            <OrderButton size="md" variant="cream">
              Grab a Slice
            </OrderButton>
          </motion.div>
        </div>

        {/* bottom bar */}
        <div className="relative z-20 mt-6 rounded-t-[1.75rem] border-t border-cream/25 bg-flame px-5 shadow-[0_-18px_40px_rgba(60,10,10,0.35)] sm:mt-0 sm:rounded-none sm:bg-transparent sm:px-0 sm:shadow-none">
          <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-6 py-7 text-cream sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="font-display text-xs font-extrabold tracking-[0.2em] uppercase">
                Contact Us
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" /> +31 123 355-8900
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 shrink-0" aria-hidden="true" /> www.kennedy.com
              </p>
            </div>
            <img
              src="/images/logo.png"
              alt="Kennedy"
              width={1024}
              height={295}
              loading="lazy"
              className="mx-auto h-12 w-auto" decoding="async" />
            <div className="sm:text-right">
              <p className="font-display text-xs font-extrabold tracking-[0.2em] uppercase">
                Social Me
              </p>
              <div className="mt-2 flex gap-3 sm:justify-end">
                {[Instagram, Facebook, Youtube, Music2].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    aria-label="Kennedy social profile"
                    className="rounded-md bg-cream/15 p-1.5 transition-transform duration-200 hover:scale-110"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
