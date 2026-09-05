import { useCallback, useEffect, useState } from "react";

import { DISHES, getDish, type Dish } from "@/lib/menu";
import { api, isBackendConfigured, tokens } from "@/lib/api/client";
import { FAVOURITES } from "@/lib/api/endpoints";

export type CartLine = {
  slug: string;
  size: string;
  qty: number;
  /** Whether this line is included in the next "push to order". */
  selected?: boolean;
};

const CART_KEY = "kennedy.cart";
const WISH_KEY = "kennedy.wishlist";
const LIKE_KEY = "kennedy.likes";
const FAV_ID_MAP_KEY = "kennedy.fav.idmap";
const EVT = "kennedy:store";

export const SIZES = [
  { label: "Regular", extra: 0 },
  { label: "Large", extra: 350 },
  { label: "Family", extra: 700 },
];

export const sizeExtra = (size: string) => SIZES.find((s) => s.label === size)?.extra ?? 0;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(EVT));
}

/* ---------------------------------- cart --------------------------------- */

export function loadCart(): CartLine[] {
  return read<CartLine[]>(CART_KEY, []).map((l) => ({ ...l, selected: l.selected !== false }));
}

export function addToCart(slug: string, size = "Regular", qty = 1) {
  const cart = loadCart();
  const found = cart.find((l) => l.slug === slug && l.size === size);
  if (found) {
    found.qty = Math.min(20, found.qty + qty);
    found.selected = true;
  } else {
    cart.push({ slug, size, qty, selected: true });
  }
  write(CART_KEY, cart);
}

export function setCartQty(slug: string, size: string, qty: number) {
  const cart = loadCart()
    .map((l) => (l.slug === slug && l.size === size ? { ...l, qty } : l))
    .filter((l) => l.qty > 0);
  write(CART_KEY, cart);
}

export function removeFromCart(slug: string, size: string) {
  write(
    CART_KEY,
    loadCart().filter((l) => !(l.slug === slug && l.size === size)),
  );
}

export function toggleCartSelected(slug: string, size: string) {
  write(
    CART_KEY,
    loadCart().map((l) =>
      l.slug === slug && l.size === size ? { ...l, selected: !l.selected } : l,
    ),
  );
}

export function setAllSelected(selected: boolean) {
  write(
    CART_KEY,
    loadCart().map((l) => ({ ...l, selected })),
  );
}

export function clearCart() {
  write(CART_KEY, []);
}

/** Removes only the lines that were just ordered, keeping the rest of the cart. */
export function clearSelected() {
  write(
    CART_KEY,
    loadCart().filter((l) => !l.selected),
  );
}

export type CartItem = CartLine & {
  dish: Dish;
  unit: number;
  lineTotal: number;
  selected: boolean;
};

export function hydrateCart(lines: CartLine[]): CartItem[] {
  return lines.flatMap((l) => {
    const dish = getDish(l.slug) || DISHES.find((d) => d.slug === l.slug);
    if (!dish) return [];
    const unit = Number(dish.price) + sizeExtra(l.size);
    return [{ ...l, selected: l.selected !== false, dish, unit, lineTotal: unit * l.qty }];
  });
}

/* --------------------------- wishlist + likes ----------------------------- */

type BackendFavourite = {
  id: number;
  dish_slug: string;
  dish_name: string;
  dish_image: string;
  price: string;
  kind: "wishlist" | "like";
  created_at: string;
};

export function loadWishlist(): string[] {
  return read<string[]>(WISH_KEY, []);
}

export function loadLikes(): string[] {
  return read<string[]>(LIKE_KEY, []);
}

export async function syncFavouritesFromBackend() {
  if (!isBackendConfigured() || !tokens.access()) return;
  try {
    const items = await api.get<BackendFavourite[]>(FAVOURITES.list);
    const wishlistSlugs: string[] = [];
    const likeSlugs: string[] = [];
    const idMap: Record<string, number> = {};

    items.forEach((item) => {
      idMap[`${item.kind}:${item.dish_slug}`] = item.id;
      if (item.kind === "wishlist") wishlistSlugs.push(item.dish_slug);
      if (item.kind === "like") likeSlugs.push(item.dish_slug);
    });

    write(FAV_ID_MAP_KEY, idMap);
    write(WISH_KEY, Array.from(new Set(wishlistSlugs)));
    write(LIKE_KEY, Array.from(new Set(likeSlugs)));
  } catch {
    /* ignore offline/auth error */
  }
}

export function toggleWishlist(slug: string) {
  const list = loadWishlist();
  const willHave = !list.includes(slug);
  const next = willHave ? [...list, slug] : list.filter((s) => s !== slug);
  write(WISH_KEY, next);

  if (isBackendConfigured() && tokens.access()) {
    const dish = getDish(slug) || DISHES.find((d) => d.slug === slug);
    const idMap = read<Record<string, number>>(FAV_ID_MAP_KEY, {});
    const mapKey = `wishlist:${slug}`;

    if (willHave) {
      void api
        .post<BackendFavourite>(FAVOURITES.add, {
          dish_slug: slug,
          dish_name: dish?.name || slug,
          dish_image: dish?.image || "",
          price: dish?.price || "0",
          kind: "wishlist",
        })
        .then((res) => {
          idMap[mapKey] = res.id;
          write(FAV_ID_MAP_KEY, idMap);
        })
        .catch(() => undefined);
    } else {
      const favId = idMap[mapKey];
      if (favId) {
        void api.delete(FAVOURITES.remove(favId)).catch(() => undefined);
        delete idMap[mapKey];
        write(FAV_ID_MAP_KEY, idMap);
      }
    }
  }
}

export function toggleLike(slug: string) {
  const list = loadLikes();
  const willHave = !list.includes(slug);
  const next = willHave ? [...list, slug] : list.filter((s) => s !== slug);
  write(LIKE_KEY, next);

  if (isBackendConfigured() && tokens.access()) {
    const dish = getDish(slug) || DISHES.find((d) => d.slug === slug);
    const idMap = read<Record<string, number>>(FAV_ID_MAP_KEY, {});
    const mapKey = `like:${slug}`;

    if (willHave) {
      void api
        .post<BackendFavourite>(FAVOURITES.add, {
          dish_slug: slug,
          dish_name: dish?.name || slug,
          dish_image: dish?.image || "",
          price: dish?.price || "0",
          kind: "like",
        })
        .then((res) => {
          idMap[mapKey] = res.id;
          write(FAV_ID_MAP_KEY, idMap);
        })
        .catch(() => undefined);
    } else {
      const favId = idMap[mapKey];
      if (favId) {
        void api.delete(FAVOURITES.remove(favId)).catch(() => undefined);
        delete idMap[mapKey];
        write(FAV_ID_MAP_KEY, idMap);
      }
    }
  }
}

export const dishBySlug = (slug: string) => getDish(slug) || DISHES.find((d) => d.slug === slug);

/* --------------------------------- hooks --------------------------------- */

function useStore<T>(reader: () => T, empty: T) {
  const [value, setValue] = useState<T>(empty);

  useEffect(() => {
    const sync = () => setValue(reader());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

export function useCart() {
  const lines = useStore<CartLine[]>(loadCart, []);
  const items = hydrateCart(lines);
  const selected = items.filter((i) => i.selected);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + i.lineTotal, 0);
  const selectedCount = selected.reduce((n, i) => n + i.qty, 0);
  const selectedSubtotal = selected.reduce((n, i) => n + i.lineTotal, 0);
  return { items, selected, count, subtotal, selectedCount, selectedSubtotal };
}

export function useWishlist() {
  const slugs = useStore<string[]>(loadWishlist, []);
  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  useEffect(() => {
    void syncFavouritesFromBackend();
  }, []);

  return { slugs, has, toggle: toggleWishlist };
}

export function useLikes() {
  const slugs = useStore<string[]>(loadLikes, []);
  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  useEffect(() => {
    void syncFavouritesFromBackend();
  }, []);

  return { slugs, has, toggle: toggleLike };
}
