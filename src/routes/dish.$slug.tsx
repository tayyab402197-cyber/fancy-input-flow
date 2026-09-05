import { useRef, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  Clock,
  Flame,
  Heart,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Star,
  ThumbsUp,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";

import { DISHES, fetchDishBySlug, getDish } from "@/lib/menu";
import { SIZES, addToCart, sizeExtra, useLikes, useWishlist } from "@/lib/cart";


export const Route = createFileRoute("/dish/$slug")({
  loader: async ({ params }) => {
    const dish = (await fetchDishBySlug(params.slug)) || getDish(params.slug);
    if (!dish) throw notFound();
    return { dish };
  },
  head: ({ loaderData }) => {
    const dish = loaderData?.dish;
    const title = dish ? `${dish.name} — Kennedy Moon Grill Narowal` : "Dish — Kennedy";
    const description = dish
      ? `${dish.desc} Rs ${dish.price}, ready in ${dish.time}, serves ${dish.serves}.`
      : "Explore the Kennedy Moon Grill menu.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-cream p-6 text-center">
      <div>
        <p className="font-display text-2xl font-extrabold uppercase text-charcoal">Dish not found</p>
        <Link to="/" className="mt-3 inline-block font-display text-sm uppercase text-flame">
          Back to menu
        </Link>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center bg-cream p-6 text-center">
      <p className="font-display text-xl font-extrabold uppercase text-charcoal">
        Something went wrong loading this dish.
      </p>
    </div>
  ),
  component: DishPage,
});

function DishPage() {
  const { dish } = Route.useLoaderData();
  const navigate = useNavigate();
  const wishlist = useWishlist();
  const likes = useLikes();

  const [size, setSize] = useState("Regular");
  const [qty, setQty] = useState(1);

  // magnifying glass
  const imgWrap = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{ x: number; y: number; show: boolean }>({
    x: 0,
    y: 0,
    show: false,
  });

  const unit = Number(dish.price) + sizeExtra(size);
  const total = unit * qty;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imgWrap.current?.getBoundingClientRect();
    if (!rect) return;
    setLens({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      show: true,
    });
  };

  const add = (then?: () => void) => {
    addToCart(dish.slug, size, qty);
    toast.success(`${dish.name} × ${qty} cart mein add`, { description: `${size} · Rs ${total}` });
    then?.();
  };

  const related = DISHES.filter((d) => d.slug !== dish.slug).slice(0, 3);

  return (
    <main className="min-h-screen bg-cream pb-20">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-display text-xs font-extrabold uppercase tracking-[0.18em] text-charcoal/70 hover:text-flame"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back to menu
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          {/* image + magnifier */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              ref={imgWrap}
              onMouseMove={onMove}
              onMouseLeave={() => setLens((l) => ({ ...l, show: false }))}
              className="relative overflow-hidden rounded-3xl border-2 border-charcoal/10 bg-charcoal/5 shadow-[var(--shadow-card)]"
            >
              <img
                src={dish.image}
                alt={dish.name}
                width={1200}
                height={900}
                className="h-[280px] w-full object-cover sm:h-[420px]" loading="lazy" decoding="async" />

              {lens.show && (
                <span
                  className="pointer-events-none absolute h-40 w-40 rounded-full border-[3px] border-cream shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                  style={{
                    left: `calc(${lens.x}% - 5rem)`,
                    top: `calc(${lens.y}% - 5rem)`,
                    backgroundImage: `url(${dish.image})`,
                    backgroundSize: "300% 300%",
                    backgroundPosition: `${lens.x}% ${lens.y}%`,
                    boxShadow:
                      "0 18px 40px rgba(0,0,0,0.35), inset 0 0 24px rgba(255,255,255,0.35)",
                  }}
                  aria-hidden="true"
                />
              )}

              <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-charcoal/80 px-3 py-1.5 font-display text-[10px] font-extrabold uppercase tracking-[0.16em] text-cream">
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                Hover to magnify
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { l: "Serves", v: dish.serves },
                { l: "Weight", v: dish.weight },
                { l: "Calories", v: `${dish.calories} kcal` },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-charcoal/5 p-3 text-center">
                  <p className="font-display text-sm font-extrabold text-charcoal">{s.v}</p>
                  <p className="font-body text-[10px] uppercase tracking-widest text-charcoal/50">
                    {s.l}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* details */}
          <div>
            <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.22em] text-flame">
              {dish.tag}
            </span>
            <h1 className="mt-1 font-display text-3xl font-extrabold uppercase leading-tight text-charcoal sm:text-5xl">
              {dish.name}
            </h1>
            <p className="mt-3 font-body text-sm text-charcoal/75 sm:text-base">{dish.desc}</p>

            <div className="mt-4 flex items-end gap-3">
              <span className="font-display text-3xl font-extrabold text-flame">Rs {unit}</span>
              <span className="pb-1 font-body text-sm text-charcoal/50 line-through">
                Rs {dish.oldPrice}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { Icon: Flame, v: dish.heat, l: "Heat" },
                { Icon: Clock, v: dish.time, l: "Ready" },
                { Icon: Star, v: "4.9", l: "Rating" },
              ].map(({ Icon, v, l }) => (
                <div key={l} className="rounded-2xl bg-charcoal/5 p-3 text-center">
                  <Icon className="mx-auto h-4 w-4 text-flame" aria-hidden="true" />
                  <p className="mt-1 font-display text-sm font-extrabold text-charcoal">{v}</p>
                  <p className="font-body text-[10px] uppercase tracking-widest text-charcoal/50">
                    {l}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-6 font-display text-xs font-extrabold uppercase tracking-[0.2em] text-charcoal/60">
              Size
            </p>
            <div className="mt-2 flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setSize(s.label)}
                  className={`flex-1 rounded-2xl border-2 px-3 py-2.5 font-display text-xs font-extrabold uppercase transition-colors ${
                    size === s.label
                      ? "border-flame bg-flame text-cream"
                      : "border-charcoal/15 text-charcoal/70"
                  }`}
                >
                  {s.label}
                  {s.extra > 0 && <span className="block text-[10px]">+{s.extra}</span>}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 rounded-full bg-charcoal/5 p-1.5">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="rounded-full bg-cream p-2 shadow-sm"
                >
                  <Minus className="h-4 w-4 text-charcoal" aria-hidden="true" />
                </button>
                <span className="w-6 text-center font-display text-lg font-extrabold text-charcoal">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(20, q + 1))}
                  className="rounded-full bg-cream p-2 shadow-sm"
                >
                  <Plus className="h-4 w-4 text-charcoal" aria-hidden="true" />
                </button>
              </div>
              <div className="text-right">
                <p className="font-body text-[11px] uppercase tracking-widest text-charcoal/50">
                  Total
                </p>
                <p className="font-display text-2xl font-extrabold text-flame">Rs {total}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => add()}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-charcoal/15 py-3.5 font-display text-xs font-extrabold uppercase tracking-[0.16em] text-charcoal"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                Add to Cart
              </button>
              <button
                type="button"
                onClick={() => add(() => void navigate({ to: "/cart" }))}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-flame py-3.5 font-display text-xs font-extrabold uppercase tracking-[0.16em] text-cream shadow-[0_14px_30px_rgba(180,40,20,0.35)]"
              >
                Order Now
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => wishlist.toggle(dish.slug)}
                aria-pressed={wishlist.has(dish.slug)}
                aria-label="Save to wishlist"
                className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 ${
                  wishlist.has(dish.slug)
                    ? "border-flame bg-flame/10 text-flame"
                    : "border-charcoal/15 text-charcoal/60"
                }`}
              >
                <Heart
                  className="h-5 w-5"
                  fill={wishlist.has(dish.slug) ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  likes.toggle(dish.slug);
                  toast.success(
                    likes.has(dish.slug) ? "Recipe unliked" : "Recipe liked — profile mein save",
                  );
                }}
                aria-pressed={likes.has(dish.slug)}
                aria-label="Like this recipe"
                className={`flex h-[52px] items-center gap-2 rounded-full border-2 px-5 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] ${
                  likes.has(dish.slug)
                    ? "border-flame bg-flame/10 text-flame"
                    : "border-charcoal/15 text-charcoal/60"
                }`}
              >
                <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                Like recipe
              </button>

            </div>
          </div>
        </div>

        {/* long form */}
        <section className="mt-14 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl font-extrabold uppercase text-charcoal">
              The story
            </h2>
            <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/75">{dish.story}</p>

            <h3 className="mt-8 font-display text-xl font-extrabold uppercase text-charcoal">
              What&apos;s inside
            </h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {dish.ingredients.map((ing: string) => (
                <li
                  key={ing}
                  className="flex items-center gap-2 rounded-xl bg-charcoal/5 px-3 py-2 font-body text-sm text-charcoal/80"
                >
                  <Utensils className="h-3.5 w-3.5 shrink-0 text-flame" aria-hidden="true" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-3xl bg-charcoal/5 p-5">
            <h3 className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-charcoal">
              Kitchen sheet
            </h3>
            <dl className="mt-4 space-y-3 font-body text-sm">
              {[
                ["Chef", dish.chef],
                ["Spice level", `${dish.spiceLevel}/5`],
                ["Prep time", dish.time],
                ["Allergens", dish.allergens.length ? dish.allergens.join(", ") : "None declared"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-charcoal/55">{k}</dt>
                  <dd className="text-right font-semibold text-charcoal">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex gap-1" aria-label={`Spice level ${dish.spiceLevel} of 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Flame
                  key={i}
                  className={`h-4 w-4 ${i < dish.spiceLevel ? "text-flame" : "text-charcoal/20"}`}
                  fill={i < dish.spiceLevel ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              ))}
            </div>
          </aside>
        </section>

        {/* related */}
        <section className="mt-14">
          <h2 className="font-display text-xl font-extrabold uppercase text-charcoal">
            Goes well with
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((d) => (
              <Link
                key={d.slug}
                to="/dish/$slug"
                params={{ slug: d.slug }}
                className="group overflow-hidden rounded-2xl bg-cream shadow-[var(--shadow-card)]"
              >
                <img
                  src={d.image}
                  alt={d.name}
                  loading="lazy"
                  className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-105" decoding="async" />
                <div className="p-3">
                  <p className="font-display text-sm font-extrabold text-charcoal">{d.name}</p>
                  <p className="font-body text-xs text-charcoal/60">Rs {d.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
