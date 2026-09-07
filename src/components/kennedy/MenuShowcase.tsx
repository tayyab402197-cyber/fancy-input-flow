import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, ShoppingCart, ArrowRight, ArrowLeft, Search, Box } from "lucide-react";
import { toast } from "sonner";
import { DISHES, fetchDishes, arViewUrl, type Dish } from "@/lib/menu";
import { addToCart, useWishlist } from "@/lib/cart";
import { GiftRibbon } from "./GiftRibbon";

const ALL = "all";

/** Groups dishes into browsable categories using backend category names first. */
function categoryOf(dish: Dish) {
  return dish.categoryName || dish.tag || "Signature";
}

type CardProps = {
  dish: Dish;
  index: number;
  reduce: boolean;
  liked: boolean;
  onToggleWish: (dish: Dish) => void;
  onAdd: (dish: Dish) => void;
  onOrder: (dish: Dish) => void;
};

const DishGlassCard = memo(function DishGlassCard({
  dish,
  index,
  reduce,
  liked,
  onToggleWish,
  onAdd,
  onOrder,
}: CardProps) {
  const ar = arViewUrl(dish);
  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.8,
        delay: 0.06 * Math.min(index, 6),
        ease: [0.34, 1.3, 0.64, 1],
      }}
      whileHover={reduce ? undefined : { y: -12, scale: 1.02 }}
      className="glass-card group w-[calc(100vw-2.5rem)] shrink-0 snap-center sm:w-auto sm:max-w-none sm:shrink"
      style={{ contentVisibility: "auto" }}
      data-accent={dish.accent}
    >
      <div className="glass-card__top">
        <div className="glass-card__price-area">
          <span className="glass-card__old-price">Rs {dish.oldPrice}</span>
          <span className="glass-card__new-price">Rs {dish.price}</span>
        </div>
        <div className="glass-card__like-area">
          <button
            type="button"
            aria-label={`Add ${dish.name} to wishlist`}
            aria-pressed={liked}
            data-active={liked}
            onClick={() => onToggleWish(dish)}
            className="glass-card__like"
          >
            <Heart
              className="h-[19px] w-[19px]"
              fill={liked ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <Link
        to="/dish/$slug"
        params={{ slug: dish.slug }}
        className="glass-card__image block"
        aria-label={`${dish.name} — full details`}
      >
        {dish.ribbon && <GiftRibbon kind={dish.ribbon} />}
        <img src={dish.image} alt={dish.name} loading="lazy" width={900} height={700} decoding="async" />
        <span className="glass-card__zoom">
          <Search className="h-4 w-4" aria-hidden="true" />
          View details
        </span>
      </Link>

      <div className="glass-card__content">
        <h3 className="glass-card__name">{dish.name}</h3>
        <p className="glass-card__subtitle">
          {dish.tag} · {dish.desc}
        </p>

        <div className="glass-card__stats">
          <div className="glass-card__stat">
            <p className="glass-card__stat-value">{dish.heat}</p>
            <p className="glass-card__stat-label">Heat</p>
          </div>
          <div className="glass-card__stat">
            <p className="glass-card__stat-value">{dish.time}</p>
            <p className="glass-card__stat-label">Ready In</p>
          </div>
          <div className="glass-card__stat">
            <p className="glass-card__stat-value">4.9</p>
            <p className="glass-card__stat-label">Rating</p>
          </div>
        </div>
      </div>

      {ar && (
        <div className="glass-card__ar-row">
          <a
            href={ar}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card__ar"
            aria-label={`View ${dish.name} in AR`}
          >
            <Box className="h-4 w-4" aria-hidden="true" />
            View in AR
          </a>
        </div>
      )}

      <div className="glass-card__bottom">
        <button type="button" className="glass-card__cart" onClick={() => onAdd(dish)}>
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          Add to Cart
        </button>
        <button type="button" className="glass-card__shop" onClick={() => onOrder(dish)}>
          Order Now
          <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
        </button>
      </div>
    </motion.article>
  );
});

function MenuSkeleton() {
  return (
    <div
      className="scrollbar-none -mx-5 mt-3 flex gap-4 overflow-hidden px-5 pb-2 sm:hidden"
      aria-hidden="true"
    >
      {[0, 1].map((i) => (
        <div key={i} className="menu-skeleton w-[calc(100vw-2.5rem)] shrink-0 p-4">
          <div className="menu-skeleton__block h-[172px] w-full" />
          <div className="menu-skeleton__block mt-4 h-5 w-2/3" />
          <div className="menu-skeleton__block mt-2 h-3 w-5/6" />
          <div className="menu-skeleton__block mt-4 h-12 w-full" />
          <div className="menu-skeleton__block mt-3 h-11 w-full" />
        </div>
      ))}
    </div>
  );
}

export function MenuShowcase() {
  const reduce = !!useReducedMotion();
  const navigate = useNavigate();
  const wishlist = useWishlist();
  const [active, setActive] = useState<string>(ALL);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const { data: dishes = DISHES, isLoading } = useQuery({
    queryKey: ["menu-dishes"],
    queryFn: () => fetchDishes(),
  });

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of dishes) {
      const c = categoryOf(d);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count }));
  }, [dishes]);

  const visible = useMemo(
    () => (active === ALL ? dishes : dishes.filter((d) => categoryOf(d) === active)),
    [dishes, active],
  );

  const syncEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({
      start: el.scrollLeft <= 4,
      end: max <= 4 || el.scrollLeft >= max - 4,
    });
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    syncEdges();
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncEdges);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [syncEdges, visible.length]);

  // Always move exactly one card per arrow tap.
  const scrollRail = useCallback((dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : el.clientWidth;
    const index = Math.round(el.scrollLeft / step);
    el.scrollTo({ left: Math.max(0, (index + dir) * step), behavior: "smooth" });
  }, []);

  const handleToggleWish = useCallback(
    (dish: Dish) => {
      const wasLiked = wishlist.has(dish.slug);
      wishlist.toggle(dish.slug);
      toast(wasLiked ? "Wishlist se hata diya" : "Wishlist mein save ho gaya", {
        description: dish.name,
      });
    },
    [wishlist],
  );

  const handleAdd = useCallback((dish: Dish) => {
    addToCart(dish.slug, "Regular", 1);
    toast.success(`${dish.name} cart mein add ho gaya`, {
      description: "Cart se ek hi jagah pura order place karein.",
    });
  }, []);

  const handleOrder = useCallback(
    (dish: Dish) => {
      handleAdd(dish);
      void navigate({ to: "/cart" });
    },
    [handleAdd, navigate],
  );

  return (
    <section id="menu" className="relative overflow-x-clip bg-cream py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0 menu-grain" aria-hidden="true" />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8">
        {/* heading */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <span className="relative -top-1 -rotate-6 inline-block font-poster text-3xl text-ember uppercase [-webkit-text-stroke:6px_var(--color-cream)] [paint-order:stroke_fill] sm:text-5xl">
            The Best
          </span>

          <h2 className="poster-title mt-1 text-[19vw] sm:text-[14vw] lg:text-[11rem]">
            <span className="block">Our Finest</span>
            <span className="block">Fire Picks</span>
          </h2>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <p className="max-w-xl font-body text-sm text-charcoal/75 sm:text-base">
              Hand-crafted plates from the Moon Grill Narowal legacy — charcoal smoke,
              stone-baked crusts and chili heat tuned to your taste. Tap any photo for the
              full story, zoom and nutrition.
            </p>
            <span className="font-display text-xs font-extrabold tracking-[0.24em] text-charcoal/70 uppercase">
              {visible.length} Items
            </span>
          </div>
        </motion.div>

        {/* sticky category rail — the main way to browse on a phone */}
        <div className="sticky top-0 z-40 -mx-5 mt-6 border-y border-charcoal/10 bg-cream/92 px-5 py-2.5 backdrop-blur-md sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
          <div
            className="scrollbar-none flex gap-2 overflow-x-auto"
            role="tablist"
            aria-label="Menu categories"
          >
            {[{ name: ALL, count: dishes.length }, ...categories].map((c) => {
              const on = active === c.name;
              return (
                <motion.button
                  key={c.name}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    setActive(c.name);
                    railRef.current?.scrollTo({ left: 0, behavior: "smooth" });
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 font-display text-[11px] font-extrabold tracking-[0.14em] uppercase transition-all duration-300 ${
                    on
                      ? "border-flame bg-flame text-cream shadow-[0_8px_18px_rgba(180,40,20,0.28)]"
                      : "border-charcoal/15 bg-cream/70 text-charcoal/70 hover:border-flame/40 hover:text-charcoal"
                  }`}
                >
                  {c.name === ALL ? "All" : c.name}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                      on ? "bg-cream/25 text-cream" : "bg-charcoal/10 text-charcoal/60"
                    }`}
                  >
                    {c.count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* mobile hint */}
        <div className="mt-6 flex items-center gap-2 sm:hidden">
          <motion.span
            aria-hidden="true"
            animate={reduce ? undefined : { x: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="font-display text-[11px] font-extrabold tracking-[0.18em] text-charcoal/60 uppercase"
          >
            Swipe to explore →
          </motion.span>
        </div>

        {/* mobile-only loading skeleton */}
        {isLoading && <MenuSkeleton />}

        {/* cards */}
        <div
          ref={railRef}
          className={`scrollbar-none -mx-5 mt-3 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto overscroll-x-contain px-5 pb-2 [scroll-behavior:smooth] [-webkit-overflow-scrolling:touch] sm:mx-0 sm:mt-14 sm:grid sm:snap-none sm:gap-8 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-3 ${isLoading ? "max-sm:hidden" : ""}`}
        >
          {visible.map((dish, i) => (
            <DishGlassCard
              key={dish.slug}
              dish={dish}
              index={i}
              reduce={reduce}
              liked={wishlist.has(dish.slug)}
              onToggleWish={handleToggleWish}
              onAdd={handleAdd}
              onOrder={handleOrder}
            />
          ))}
        </div>

        {/* mobile arrows */}
        <div className="mt-5 flex items-center justify-center gap-4 sm:hidden">
          <motion.button
            type="button"
            aria-label="Previous dish"
            disabled={edges.start}
            whileTap={{ scale: 0.9 }}
            onClick={() => scrollRail(-1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-charcoal/15 bg-cream text-charcoal shadow-[0_6px_14px_rgba(60,20,10,0.15)] transition-opacity duration-300 disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </motion.button>
          <motion.button
            type="button"
            aria-label="Next dish"
            disabled={edges.end}
            whileTap={{ scale: 0.9 }}
            onClick={() => scrollRail(1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-flame bg-flame text-cream shadow-[0_8px_18px_rgba(180,40,20,0.28)] transition-opacity duration-300 disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </motion.button>
        </div>
      </div>
    </section>
  );
}
