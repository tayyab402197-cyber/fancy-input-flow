import { motion, useReducedMotion } from "framer-motion";
import { OrderButton } from "./OrderButton";

type Props = {
  image: string;
  alt: string;
  title: string;
  index: number;
};

export function DishCard({ image, alt, title, index }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.55,
        delay: 0.15 + index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={reduce ? undefined : { y: -4 }}
      className="group flex flex-col gap-3 rounded-2xl bg-cream p-3 shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)] will-change-transform"
    >
      <div className="overflow-hidden rounded-xl bg-charcoal/10">
        <img
          src={image}
          alt={alt}
          width={800}
          height={600}
          loading="lazy"
          className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-[1.06] sm:h-36" decoding="async" />
      </div>
      <p className="font-display text-sm leading-snug font-bold text-charcoal">{title}</p>
      <OrderButton size="sm" className="self-start">
        Order Now
      </OrderButton>
    </motion.article>
  );
}
