import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, ShoppingCart, ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";
import { DISHES, fetchDishes, type Dish } from "@/lib/menu";
import { addToCart, useWishlist } from "@/lib/cart";
import { GiftRibbon } from "./GiftRibbon";

const ALL = "all";

/** Groups dishes into browsable categories using backend category names first. */
function categoryOf(dish: Dish) {
  return dish.categoryName || dish.tag || "Signature";
}

export function MenuShowcase() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const wishlist = useWishlist();
  const [active, setActive] = useState<string>(ALL);

  const { data: dishes = DISHES } = useQuery({
    queryKey: ["menu-dishes"],
    queryFn: () => fetchDishes(),
  });

  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const d of dishes) {
      const c = categoryOf(d);
      if (!seen.includes(c)) seen.push(c);
    }
    return seen;
  }, [dishes]);

  const visible = useMemo(
    () => (active === ALL ? dishes : dishes.filter((d) => categoryOf(d) === active)),
    [dishes, active],
  );


  const add = (slug: string, name: string, then?: () => void) => {
    addToCart(slug, "Regular", 1);
    toast.success(`${name} cart mein add ho gaya`, {
      description: "Cart se ek hi jagah pura order place karein.",
    });
    then?.();
  };

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
            {[ALL, ...categories].map((c) => {
              const on = active === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(c)}
                  className={`shrink-0 rounded-full border px-4 py-2 font-display text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors ${
                    on
                      ? "border-flame bg-flame text-cream shadow-[0_8px_18px_rgba(180,40,20,0.28)]"
                      : "border-charcoal/15 bg-cream text-charcoal/70"
                  }`}
                >
                  {c === ALL ? "All" : c}
                </button>
              );
            })}
          </div>
        </div>

        {/* cards */}
        <div className="mt-8 grid gap-8 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((dish, i) => (
            <motion.article
              key={dish.slug}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.8,
                delay: 0.06 * i,
                ease: [0.34, 1.3, 0.64, 1],
              }}
              whileHover={reduce ? undefined : { y: -12, scale: 1.02 }}
              className="glass-card group"
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
                    aria-pressed={wishlist.has(dish.slug)}
                    data-active={wishlist.has(dish.slug)}
                    onClick={() => {
                      wishlist.toggle(dish.slug);
                      toast(
                        wishlist.has(dish.slug)
                          ? "Wishlist se hata diya"
                          : "Wishlist mein save ho gaya",
                        { description: dish.name },
                      );
                    }}
                    className="glass-card__like"
                  >
                    <Heart
                      className="h-[19px] w-[19px]"
                      fill={wishlist.has(dish.slug) ? "currentColor" : "none"}
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

              <div className="glass-card__bottom">
                <button
                  type="button"
                  className="glass-card__cart"
                  onClick={() => add(dish.slug, dish.name)}
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  Add to Cart
                </button>
                <button
                  type="button"
                  className="glass-card__shop"
                  onClick={() => add(dish.slug, dish.name, () => void navigate({ to: "/cart" }))}
                >
                  Order Now
                  <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
