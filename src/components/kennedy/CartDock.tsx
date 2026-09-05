import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

import {
  removeFromCart,
  setAllSelected,
  setCartQty,
  toggleCartSelected,
  useCart,
} from "@/lib/cart";

/**
 * Floating cart dock — visible on every page so an "Add to cart" tap always
 * has somewhere to land. Items can be ticked and pushed to checkout at once.
 */
export function CartDock() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { items, selected, count, selectedSubtotal } = useCart();
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (!count) return;
    setBump(true);
    const t = window.setTimeout(() => setBump(false), 420);
    return () => window.clearTimeout(t);
  }, [count]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const hidden = pathname === "/cart" || pathname === "/auth";

  /**
   * Publishes the height of the mobile cart bar so other floating widgets
   * (e.g. the voice host) can sit above it instead of overlapping CTAs.
   */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    el.style.setProperty("--kmg-cart-bar", !hidden && count > 0 ? "4.5rem" : "0px");
    return () => el.style.setProperty("--kmg-cart-bar", "0px");
  }, [count, hidden]);

  if (hidden) return null;

  return (
    <>
      {/* Desktop / tablet: compact floating bag */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Cart, ${count} items`}
        animate={bump ? { scale: [1, 1.16, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed bottom-5 left-5 z-[160] hidden h-14 w-14 items-center justify-center rounded-full bg-flame text-cream shadow-[0_16px_34px_rgba(180,40,20,0.4)] sm:flex"
      >
        <ShoppingBag className="h-6 w-6" aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-cream bg-charcoal px-1 font-display text-[11px] font-extrabold text-cream">
            {count}
          </span>
        )}
      </motion.button>

      {/* Mobile: one persistent money bar — count, live total, single action */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 90 }}
            animate={{ y: 0 }}
            exit={{ y: 90 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-[160] pb-[env(safe-area-inset-bottom)] sm:hidden"
          >
            <div className="mx-3 mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-charcoal/10 bg-charcoal px-3 py-2.5 shadow-[0_18px_38px_rgba(20,14,10,0.35)]">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex min-w-0 items-center gap-2.5 text-left"
                aria-label={`Open cart, ${count} items`}
              >
                <motion.span
                  animate={bump ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-flame text-cream"
                >
                  <ShoppingBag className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-charcoal bg-cream px-1 font-display text-[10px] font-extrabold text-charcoal">
                    {count}
                  </span>
                </motion.span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[11px] font-extrabold tracking-[0.16em] text-cream/60 uppercase">
                    {selected.length}/{items.length} selected
                  </span>
                  <span className="block font-display text-base font-extrabold text-cream">
                    Rs {selectedSubtotal}
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={() => void navigate({ to: "/cart" })}
                className="shrink-0 rounded-xl bg-flame px-4 py-3 font-display text-[11px] font-extrabold tracking-[0.16em] text-cream uppercase disabled:opacity-50"
              >
                Checkout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[155] bg-charcoal/40 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[160] flex max-h-[70vh] flex-col overflow-hidden rounded-3xl border-2 border-charcoal/10 bg-cream shadow-[0_30px_70px_rgba(20,14,10,0.28)] sm:inset-x-auto sm:bottom-24 sm:left-4 sm:w-[min(24rem,calc(100vw-2rem))]"
            >
              <header className="flex items-center justify-between border-b border-charcoal/10 px-5 py-3.5">
                <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-charcoal">
                  Your cart
                </h2>
                <button
                  type="button"
                  aria-label="Close cart"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-charcoal/60 hover:text-flame"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </header>

              {items.length === 0 ? (
                <p className="px-5 py-10 text-center font-body text-sm text-charcoal/60">
                  Cart khali hai — menu se koi dish add karein.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between px-5 py-2.5">
                    <span className="font-body text-[11px] uppercase tracking-widest text-charcoal/50">
                      {selected.length}/{items.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setAllSelected(selected.length !== items.length)}
                      className="font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-flame"
                    >
                      {selected.length === items.length ? "Unselect all" : "Select all"}
                    </button>
                  </div>

                  <ul className="flex-1 space-y-2 overflow-y-auto px-3 pb-2">
                    {items.map((i) => (
                      <li
                        key={`${i.slug}-${i.size}`}
                        className={`flex items-center gap-2.5 rounded-2xl p-2.5 ${
                          i.selected ? "bg-flame/8 ring-2 ring-flame/35" : "bg-charcoal/5"
                        }`}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={i.selected}
                          aria-label={`Select ${i.dish.name}`}
                          onClick={() => toggleCartSelected(i.slug, i.size)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                            i.selected ? "border-flame bg-flame text-cream" : "border-charcoal/25"
                          }`}
                        >
                          {i.selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        </button>
                        <img
                          src={i.dish.image}
                          alt={i.dish.name}
                          className="h-12 w-12 shrink-0 rounded-xl object-cover" loading="lazy" decoding="async" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-xs font-extrabold uppercase text-charcoal">
                            {i.dish.name}
                          </p>
                          <p className="font-body text-[11px] text-charcoal/60">
                            {i.size} · Rs {i.lineTotal}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-cream p-0.5">
                          <button
                            type="button"
                            aria-label="Decrease"
                            onClick={() => setCartQty(i.slug, i.size, i.qty - 1)}
                            className="rounded-full p-1"
                          >
                            <Minus className="h-3 w-3" aria-hidden="true" />
                          </button>
                          <span className="w-4 text-center font-display text-xs font-extrabold">
                            {i.qty}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase"
                            onClick={() => setCartQty(i.slug, i.size, Math.min(20, i.qty + 1))}
                            className="rounded-full p-1"
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${i.dish.name}`}
                          onClick={() => removeFromCart(i.slug, i.size)}
                          className="rounded-full p-1.5 text-charcoal/45 hover:text-flame"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <footer className="border-t border-charcoal/10 px-5 py-4">
                    <div className="flex items-center justify-between font-body text-sm">
                      <span className="text-charcoal/60">Selected total</span>
                      <span className="font-display text-lg font-extrabold text-flame">
                        Rs {selectedSubtotal}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={selected.length === 0}
                      onClick={() => {
                        setOpen(false);
                        void navigate({ to: "/cart" });
                      }}
                      className="mt-3 w-full rounded-full bg-flame py-3.5 font-display text-xs font-extrabold uppercase tracking-[0.16em] text-cream shadow-[0_12px_26px_rgba(180,40,20,0.32)] disabled:opacity-50"
                    >
                      Push {selected.length || ""} to order
                    </button>
                  </footer>
                </>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
