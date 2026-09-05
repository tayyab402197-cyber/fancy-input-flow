import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { OrderButton } from "./OrderButton";
import sticker from "@/assets/pizza-sticker.png";
import selfie from "@/assets/slice-selfie.png";
import cheeseBite from "@/assets/cheese-bite.png";
import malaiBotti from "@/assets/malai-botti.png";

const CARDS = [
  {
    src: selfie,
    alt: "Guest taking a selfie with a fresh malai boti pizza slice",
    tilt: -7,
    depth: 34,
    lift: "sm:mt-10",
  },
  {
    src: cheeseBite,
    alt: "Cheesy pizza slice being pulled straight from the box",
    tilt: 5,
    depth: 58,
    lift: "sm:-mt-6",
  },
  {
    src: malaiBotti,
    alt: "Malai boti pizza served fresh at the Kennedy counter",
    tilt: -4,
    depth: 42,
    lift: "sm:mt-6",
  },
] as const;

function TiltCard({
  card,
  index,
  mx,
  my,
}: {
  card: (typeof CARDS)[number];
  index: number;
  mx: ReturnType<typeof useMotionValue<number>>;
  my: ReturnType<typeof useMotionValue<number>>;
}) {
  const reduce = useReducedMotion();
  const strength = card.depth / 58;

  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-16 * strength, 16 * strength]), {
    stiffness: 140,
    damping: 16,
  });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [12 * strength, -12 * strength]), {
    stiffness: 140,
    damping: 16,
  });
  const shiftX = useSpring(useTransform(mx, [-0.5, 0.5], [-card.depth, card.depth]), {
    stiffness: 90,
    damping: 18,
  });
  const shiftY = useSpring(useTransform(my, [-0.5, 0.5], [-card.depth * 0.45, card.depth * 0.45]), {
    stiffness: 90,
    damping: 18,
  });

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 60, rotate: card.tilt * 2 }}
      whileInView={{ opacity: 1, y: 0, rotate: card.tilt }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay: 0.1 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { scale: 1.05, zIndex: 20 }}
      style={
        reduce
          ? undefined
          : { rotateX, rotateY, x: shiftX, y: shiftY, transformStyle: "preserve-3d" }
      }
      className={`slice-card ${card.lift}`}
    >
      <div className="slice-card__inner">
        <img
          src={card.src}
          alt={card.alt}
          loading="lazy"
          className="h-full w-full object-cover" decoding="async" />
        <span className="slice-card__sheen" aria-hidden="true" />
      </div>
    </motion.div>
  );
}

export function SliceGallery() {
  const reduce = useReducedMotion();
  const zoneRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const stickerX = useSpring(useTransform(mx, [-0.5, 0.5], [22, -22]), {
    stiffness: 80,
    damping: 16,
  });
  const stickerY = useSpring(useTransform(my, [-0.5, 0.5], [16, -16]), {
    stiffness: 80,
    damping: 16,
  });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <section className="slice-section" aria-labelledby="slice-heading">
      <div
        ref={zoneRef}
        onMouseMove={handleMove}
        onMouseLeave={() => {
          mx.set(0);
          my.set(0);
        }}
        className="relative mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-24 [perspective:1400px]"
      >
        {/* floating sticker mascot */}
        <motion.img
          src={sticker}
          alt=""
          aria-hidden="true"
          loading="lazy"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotate: -14 }}
          whileInView={{ opacity: 1, scale: 1, rotate: -8 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ type: "spring", stiffness: 110, damping: 12 }}
          style={reduce ? undefined : { x: stickerX, y: stickerY }}
          className="pointer-events-none absolute top-2 left-2 z-30 w-28 drop-shadow-[0_14px_20px_rgba(60,20,10,0.28)] sm:top-4 sm:left-8 sm:w-44 lg:w-52"
        />

        <div className="relative z-20 flex flex-col items-center gap-4 text-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="slice-eyebrow"
          >
            Straight Out The Stone Oven
          </motion.span>
          <motion.h2
            id="slice-heading"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="slice-heading"
          >
            Every Slice Tells A Story
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-xl font-display text-base font-semibold text-charcoal/70 sm:text-lg"
          >
            Cheese pulls, charcoal smoke and a table full of laughter — this is how Narowal eats
            at Kennedy.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <OrderButton size="md">Order Now</OrderButton>
          </motion.div>
        </div>

        <div className="relative z-10 mt-12 grid grid-cols-1 justify-items-center gap-8 sm:mt-16 sm:grid-cols-3 sm:gap-4">
          {CARDS.map((card, i) => (
            <TiltCard key={card.src} card={card} index={i} mx={mx} my={my} />
          ))}
        </div>
      </div>
    </section>
  );
}
