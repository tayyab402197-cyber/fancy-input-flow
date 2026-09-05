import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogIn, Menu, UserRound, X } from "lucide-react";

import { useSession } from "@/hooks/use-session";





import { OrderButton } from "@/components/kennedy/OrderButton";
import { PizzaMascot } from "@/components/kennedy/PizzaMascot";
import { BonusTape } from "@/components/kennedy/BonusTape";
import { MenuShowcase } from "@/components/kennedy/MenuShowcase";
import { MenuBook } from "@/components/kennedy/MenuBook";
import { SliceGallery } from "@/components/kennedy/SliceGallery";
import { MascotFooter } from "@/components/kennedy/MascotFooter";
import { VoiceOrderButton } from "@/components/kennedy/VoiceOrderButton";
import { Reveal } from "@/components/kennedy/Reveal";
import tomato from "@/assets/tomato.png";
import cheeseSlice from "@/assets/cheese-slice.png";
import cheeseLogo from "@/assets/cheese-logo.png";
import meat from "@/assets/meat.png";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kennedy — Spicy Pizza Specialist | Moon Grill Narowal" },
      {
        name: "description",
        content:
          "Kennedy serves the spiciest pizza in Narowal plus authentic malai boti, seekh kebab and charcoal grills. Order fiery flavors crafted fresh.",
      },
      { property: "og:title", content: "Kennedy — Spicy Pizza Specialist | Moon Grill Narowal" },
      {
        property: "og:description",
        content:
          "Kennedy serves the spiciest pizza in Narowal plus authentic malai boti, seekh kebab and charcoal grills. Order fiery flavors crafted fresh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const NAV = ["Menu", "Grills", "Pizza", "About"];

const FLOATERS = [
  {
    src: tomato,
    className: "left-[4%] top-[26%] w-16 sm:w-24 lg:w-28",
    rotate: -12,
    range: 22,
    duration: 6,
    delay: 0,
  },
  {
    src: cheeseSlice,
    className: "right-[5%] top-[20%] w-20 sm:w-32 lg:w-40",
    rotate: 10,
    range: 28,
    duration: 7.5,
    delay: 0.4,
  },
  {
    src: cheeseLogo,
    className: "left-[12%] bottom-[14%] w-14 sm:w-24 lg:w-28",
    rotate: 14,
    range: 18,
    duration: 5.5,
    delay: 0.8,
  },
  {
    src: meat,
    className: "right-[10%] bottom-[12%] w-16 sm:w-28 lg:w-32",
    rotate: -8,
    range: 24,
    duration: 8,
    delay: 1.2,
  },
] as const;



function Index() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { isSignedIn, isLoading } = useSession();
  const [navOpen, setNavOpen] = useState(false);

  const handleOrderNow = () => {
    if (isLoading) return;
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  // scroll-zoom hero removed — hero stays fixed size on all screens
  const rise = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 36 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="relative overflow-x-clip bg-cream">
      <div className="relative">
      <motion.div
        className="relative min-h-[86svh] overflow-hidden sm:min-h-screen"
      >

      {/* red wave backdrop behind the hero band */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[70px] h-[560px] sm:top-[100px] sm:h-[760px]"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1440 560"
          preserveAspectRatio="none"
          className="h-full w-full"
          fill="var(--color-flame)"
        >
          <path d="M0 40 C 260 -30, 420 130, 720 70 C 1010 12, 1180 140, 1440 60 L1440 430 C 1160 520, 980 360, 720 430 C 430 508, 250 360, 0 440 Z" />
        </svg>
      </div>

      {/* floating ingredient stickers */}
      <div className="pointer-events-none absolute inset-0 z-[80]" aria-hidden="true">
        {FLOATERS.map((f) => (
          <motion.img
            key={f.src}
            src={f.src}
            alt=""
            loading="lazy"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={
              reduce
                ? { opacity: 1, scale: 1 }
                : {
                    opacity: 1,
                    scale: 1,
                    y: [0, -f.range, 0, f.range, 0],
                    rotate: [f.rotate - 6, f.rotate + 6, f.rotate - 6],
                  }
            }
            transition={
              reduce
                ? { duration: 0.4 }
                : {
                    opacity: { duration: 0.6, delay: f.delay },
                    scale: { duration: 0.6, delay: f.delay },
                    y: { duration: f.duration, repeat: Infinity, ease: "easeInOut", delay: f.delay },
                    rotate: {
                      duration: f.duration * 1.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: f.delay,
                    },
                  }
            }
            style={{ rotate: f.rotate }}
            className={`absolute drop-shadow-[0_16px_22px_rgba(60,20,10,0.32)] ${f.className}`}
          />
        ))}
      </div>



      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col px-5 sm:px-8">
        {/* header */}
        <header className="relative z-[110] flex shrink-0 items-center justify-between gap-3 py-3 sm:py-5">
          <motion.img
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            src="/images/logo.png"
            alt="Kennedy"
            width={1024}
            height={295}
            fetchPriority="high"
            className="h-11 w-auto shrink-0 sm:h-20"
          />
          <motion.nav
            {...rise(0.5)}
            className="hidden items-center gap-8 lg:flex"
            aria-label="Main"
          >
            {NAV.map((item) => (
              <a
                key={item}
                href="#menu"
                className="font-display text-sm font-extrabold tracking-[0.18em] text-flame-dark uppercase transition-colors hover:text-flame"
              >
                {item}
              </a>
            ))}
            <Link
              to={isSignedIn ? "/profile" : "/login"}
              className="flex items-center gap-1.5 font-display text-sm font-extrabold tracking-[0.18em] text-flame-dark uppercase transition-colors hover:text-flame"
            >
              {isSignedIn ? (
                <UserRound className="h-4 w-4" aria-hidden="true" />
              ) : (
                <LogIn className="h-4 w-4" aria-hidden="true" />
              )}
              {isSignedIn ? "Profile" : "Login"}
            </Link>
          </motion.nav>

          <div className="flex shrink-0 items-center gap-2">
            <motion.div {...rise(0.62)} className="hidden shrink-0 sm:block">
              <OrderButton size="lg" onClick={handleOrderNow}>
                Order Now
              </OrderButton>
            </motion.div>

            {/* Phone: one tidy cream cluster — order, profile, menu */}
            <motion.div {...rise(0.62)} className="nav-cluster lg:hidden">
              <button
                type="button"
                onClick={handleOrderNow}
                className="nav-cluster-btn w-auto gap-1.5 bg-flame px-4 font-display text-[11px] font-extrabold tracking-[0.12em] text-cream uppercase shadow-[0_8px_16px_rgba(180,40,20,0.4)]"
              >
                Order
              </button>
              <span aria-hidden="true" className="h-6 w-px bg-charcoal/10" />
              <Link
                to={isSignedIn ? "/profile" : "/login"}
                aria-label={isSignedIn ? "Your profile" : "Log in"}
                className="nav-cluster-btn text-flame active:bg-flame/10"
              >
                {isSignedIn ? (
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <LogIn className="h-5 w-5" aria-hidden="true" />
                )}
              </Link>
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={navOpen}
                onClick={() => setNavOpen((v) => !v)}
                className="nav-cluster-btn text-charcoal active:bg-flame/10"
              >
                {navOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </motion.div>
          </div>

          <AnimatePresence>
            {navOpen && (
              <motion.nav
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                aria-label="Mobile"
                className="absolute right-0 top-full z-[120] w-52 overflow-hidden rounded-2xl bg-cream p-2 shadow-[0_20px_44px_rgba(0,0,0,0.28)] lg:hidden"
              >
                {NAV.map((item) => (
                  <a
                    key={item}
                    href="#menu"
                    onClick={() => setNavOpen(false)}
                    className="block rounded-xl px-4 py-3 font-display text-sm font-extrabold tracking-[0.16em] text-charcoal uppercase active:bg-flame/10"
                  >
                    {item}
                  </a>
                ))}
                <Link
                  to={isSignedIn ? "/profile" : "/login"}
                  onClick={() => setNavOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 font-display text-sm font-extrabold tracking-[0.16em] text-flame uppercase active:bg-flame/10"
                >
                  {isSignedIn ? (
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isSignedIn ? "Profile" : "Login"}
                </Link>

              </motion.nav>
            )}
          </AnimatePresence>
        </header>


        {/* hero */}
        <section className="grid min-h-0 flex-1 content-center items-center gap-2 pb-4 sm:gap-4 sm:pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-4 lg:pb-16">
          <div className="relative z-[100] order-2 lg:order-1 lg:pr-4">
            <h1 className="hero-title text-[11vw] leading-[0.9] uppercase sm:text-5xl lg:text-[5.2rem] xl:text-[6rem]">
              {["Spicy Pizza", "Specialist"].map((line, li) => (
                <span key={line} className="block overflow-hidden">
                  <span className="inline-block">
                    {line.split("").map((ch, ci) => (
                      <motion.span
                        key={`${li}-${ci}`}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: "60%" }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.45,
                          delay: 0.25 + li * 0.35 + ci * 0.035,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="inline-block will-change-transform"
                      >
                        {ch === " " ? "\u00a0" : ch}
                      </motion.span>
                    ))}
                  </span>
                </span>
              ))}
            </h1>
            <motion.p
              {...rise(0.95)}
              className="mt-3 inline-block rounded-lg bg-cream px-3 py-1.5 font-display text-sm font-extrabold tracking-[0.1em] text-charcoal uppercase shadow-[var(--shadow-card)] sm:mt-5 sm:px-4 sm:py-2 sm:text-2xl"
            >
              Moon Grill Narowal Legacy
            </motion.p>
          </div>


          <div className="relative z-[90] order-1 mx-auto w-[72%] max-w-[22rem] lg:order-2 lg:w-full lg:max-w-none">
            <PizzaMascot />
          </div>
        </section>

      </div>

      </motion.div>
      </div>

      {/* next section slides over the zoomed hero */}
      <div className="relative z-10 bg-cream">
        <Reveal from="up" amount={0.15}>
          <SliceGallery />
        </Reveal>

        <Reveal from="left" className="relative z-20 -mt-20 sm:-mt-28" amount={0.3}>
          <BonusTape />
        </Reveal>

        <Reveal from="right" className="relative z-10" amount={0.12}>
          <MenuShowcase />
        </Reveal>

        <Reveal from="zoom" className="relative z-10" amount={0.12}>
          <MenuBook />
        </Reveal>
      </div>


      {/* footer */}
      <Reveal from="up" amount={0.1}>
        <MascotFooter />
      </Reveal>

      <VoiceOrderButton />
    </div>
  );
}
