import pizzaWhite from "@/assets/pizza-white.png";
import pulao from "@/assets/pulao.png";
import karahi from "@/assets/karahi.jpg";
import steak from "@/assets/steak.png";
import skewers from "@/assets/skewers.png";
import { api, isBackendConfigured } from "@/lib/api/client";
import { MENU } from "@/lib/api/endpoints";

export type Dish = {
  id?: number;
  slug: string;
  tag: string;
  name: string;
  desc: string;
  image: string;
  price: string;
  oldPrice: string;
  heat: string;
  time: string;
  accent: "flame" | "ember" | "gold" | "char" | "leaf";
  ribbon?: "hot" | "new" | "demand" | "signature";
  /** long-form details shown on the dedicated product page */
  story: string;
  ingredients: string[];
  allergens: string[];
  serves: string;
  weight: string;
  calories: number;
  spiceLevel: number; // 1..5
  chef: string;
  categorySlug?: string;
  categoryName?: string;
};

export type BackendDish = {
  id: number;
  category: number;
  category_name: string;
  category_slug: string;
  name: string;
  slug: string;
  tag: string;
  description: string;
  image_url: string;
  base_price: string;
  old_price: string | null;
  heat_label: string;
  time_label: string;
  accent: "flame" | "ember" | "gold" | "char" | "leaf";
  ribbon: "hot" | "new" | "demand" | "signature" | null;
  story: string;
  ingredients: string[];
  allergens: string[];
  serves: string;
  weight: string;
  calories: number;
  spice_level: number;
  chef: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_spicy: boolean;
  sizes: { id: number; size: string; price: string }[];
};

export type MenuCategory = {
  id: number;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  dishes: BackendDish[];
};

export const DISHES: Dish[] = [
  {
    slug: "spicy-white-pizza",
    tag: "Signature",
    name: "Spicy White Pizza",
    desc: "Creamy garlic base, charred chicken, basil and a fiery chili finish.",
    image: pizzaWhite,
    price: "1450",
    oldPrice: "1750",
    heat: "Hot",
    time: "18m",
    accent: "flame",
    ribbon: "hot",
    story:
      "Our house dough is cold-fermented for 48 hours, then stretched by hand and slid straight onto the stone deck. A white garlic cream replaces tomato, so the charred chicken, smoked mozzarella and crushed red chili can hit you in layers — creamy first, then smoke, then heat.",
    ingredients: [
      "48-hour cold-fermented dough",
      "Roasted garlic cream",
      "Smoked mozzarella",
      "Charcoal-charred chicken",
      "Fresh basil",
      "Crushed red chili",
    ],
    allergens: ["Gluten", "Dairy"],
    serves: "2 people",
    weight: "780 g",
    calories: 1120,
    spiceLevel: 4,
    chef: "Chef Kennedy",
  },
  {
    slug: "seekh-malai-boti",
    tag: "Charcoal",
    name: "Seekh & Malai Boti",
    desc: "Hand-skewered, smoked over live charcoal until edges catch fire.",
    image: skewers,
    price: "1150",
    oldPrice: "1400",
    heat: "Medium",
    time: "22m",
    accent: "ember",
    ribbon: "demand",
    story:
      "Minced twice, kneaded with roasted spices and rested overnight. Skewers go over live charcoal so the fat drips, flares and perfumes the meat. The malai boti is marinated in cream and cheese for a soft, buttery contrast.",
    ingredients: [
      "Hand-minced chicken",
      "Cream & cheddar marinade",
      "Roasted cumin and coriander",
      "Green chili paste",
      "Charcoal smoke finish",
    ],
    allergens: ["Dairy"],
    serves: "2 people",
    weight: "650 g",
    calories: 890,
    spiceLevel: 3,
    chef: "Ustad Nadeem",
  },
  {
    slug: "chicken-karahi",
    tag: "House Classic",
    name: "Chicken Karahi",
    desc: "Wok-fired tomatoes, ginger julienne and crushed red chili.",
    image: karahi,
    price: "1650",
    oldPrice: "1950",
    heat: "Extra Hot",
    time: "25m",
    accent: "char",
    ribbon: "hot",
    story:
      "Cooked to order in a black iron karahi over a roaring burner. Nothing but tomatoes, chicken, ginger and whole spices — no cream, no shortcuts — reduced until the oil separates and the gravy clings to every piece.",
    ingredients: [
      "Farm chicken, bone-in",
      "Vine tomatoes",
      "Ginger julienne",
      "Crushed red chili",
      "Black pepper & coriander seed",
    ],
    allergens: [],
    serves: "3 people",
    weight: "1.1 kg",
    calories: 1340,
    spiceLevel: 5,
    chef: "Chef Kennedy",
  },
  {
    slug: "kabuli-pulao",
    tag: "Slow Cooked",
    name: "Kabuli Pulao",
    desc: "Golden basmati, tender lamb shank, cashew, almond and raisin.",
    image: pulao,
    price: "1350",
    oldPrice: "1600",
    heat: "Mild",
    time: "30m",
    accent: "gold",
    ribbon: "signature",
    story:
      "Lamb shank simmers for five hours in its own stock, and that stock is what cooks the aged basmati. Caramelised carrot, raisin and toasted nuts go on last so every spoon has sweetness against the meat.",
    ingredients: [
      "Aged basmati rice",
      "Slow-braised lamb shank",
      "Caramelised carrot & raisin",
      "Cashew and almond",
      "Whole garam masala",
    ],
    allergens: ["Tree nuts"],
    serves: "3 people",
    weight: "1.2 kg",
    calories: 1260,
    spiceLevel: 1,
    chef: "Ustad Nadeem",
  },
  {
    slug: "flame-grilled-steak",
    tag: "Premium",
    name: "Flame Grilled Steak",
    desc: "Prime cut, rosemary butter basted, cracked pepper crust.",
    image: steak,
    price: "2450",
    oldPrice: "2900",
    heat: "Medium",
    time: "20m",
    accent: "leaf",
    ribbon: "new",
    story:
      "A thick prime cut, dry-brined for 24 hours, seared hard on the grill bars and basted with rosemary butter until the pepper crust crackles. Rested eight minutes before it leaves the pass.",
    ingredients: [
      "Prime beef cut",
      "Rosemary butter",
      "Cracked black pepper",
      "Sea salt",
      "Grilled seasonal vegetables",
    ],
    allergens: ["Dairy"],
    serves: "1 person",
    weight: "420 g",
    calories: 980,
    spiceLevel: 2,
    chef: "Chef Kennedy",
  },
];

// In-memory cache of live dishes
const dishCache = new Map<string, Dish>();
const FALLBACK_IMAGES: Record<string, string> = {
  "spicy-white-pizza": pizzaWhite,
  "seekh-malai-boti": skewers,
  "chicken-karahi": karahi,
  "kabuli-pulao": pulao,
  "flame-grilled-steak": steak,
};

const DEFAULT_FOOD_IMAGE = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600";

function resolveDishImage(b: BackendDish): string {
  if (b.image_url && b.image_url.startsWith("http")) {
    return b.image_url;
  }
  if (FALLBACK_IMAGES[b.slug]) {
    return FALLBACK_IMAGES[b.slug];
  }
  if (b.slug.includes("pizza") || b.name.toLowerCase().includes("pizza")) {
    return pizzaWhite;
  }
  if (b.slug.includes("karahi") || b.name.toLowerCase().includes("karahi")) {
    return karahi;
  }
  if (b.slug.includes("pulao") || b.name.toLowerCase().includes("pulao") || b.name.toLowerCase().includes("rice")) {
    return pulao;
  }
  if (b.slug.includes("steak") || b.name.toLowerCase().includes("steak")) {
    return steak;
  }
  if (b.slug.includes("boti") || b.slug.includes("kebab") || b.name.toLowerCase().includes("boti")) {
    return skewers;
  }
  return b.image_url && b.image_url.length > 0 ? b.image_url : DEFAULT_FOOD_IMAGE;
}

export function normaliseBackendDish(b: BackendDish): Dish {
  const image = resolveDishImage(b);
  return {
    id: b.id,
    slug: b.slug,
    tag: b.tag || (b.category_name ? b.category_name : "Signature"),
    name: b.name,
    desc: b.description,
    image,
    price: String(Math.round(Number(b.base_price))),
    oldPrice: b.old_price ? String(Math.round(Number(b.old_price))) : "",
    heat: b.heat_label || "Medium",
    time: b.time_label || "20m",
    accent: b.accent || "flame",
    ribbon: b.ribbon || undefined,
    story: b.story || b.description,
    ingredients: Array.isArray(b.ingredients) && b.ingredients.length ? b.ingredients : ["House recipe"],
    allergens: Array.isArray(b.allergens) ? b.allergens : [],
    serves: b.serves || "2 people",
    weight: b.weight || "700 g",
    calories: b.calories || 950,
    spiceLevel: b.spice_level || 3,
    chef: b.chef || "Chef Kennedy",
    categorySlug: b.category_slug,
    categoryName: b.category_name,
  };
}

export function cacheDishes(dishes: Dish[]) {
  dishes.forEach((d) => dishCache.set(d.slug, d));
}

export async function fetchDishes(categorySlug?: string): Promise<Dish[]> {
  if (!isBackendConfigured()) return DISHES;
  try {
    const raw = await api.get<BackendDish[]>(MENU.dishes, {
      query: categorySlug ? { category: categorySlug } : undefined,
    });
    const normalised = raw.map(normaliseBackendDish);
    cacheDishes(normalised);
    return normalised;
  } catch {
    return DISHES;
  }
}

export async function fetchDishBySlug(slug: string): Promise<Dish | undefined> {
  if (!isBackendConfigured()) return getDish(slug);
  try {
    const raw = await api.get<BackendDish>(MENU.dish(slug));
    const dish = normaliseBackendDish(raw);
    dishCache.set(dish.slug, dish);
    return dish;
  } catch {
    return getDish(slug);
  }
}

export async function fetchMenuCategories(): Promise<MenuCategory[]> {
  if (!isBackendConfigured()) return [];
  try {
    const cats = await api.get<MenuCategory[]>(MENU.categories);
    cats.forEach((cat) => {
      if (Array.isArray(cat.dishes)) {
        cacheDishes(cat.dishes.map(normaliseBackendDish));
      }
    });
    return cats;
  } catch {
    return [];
  }
}

export function getDish(slug: string): Dish | undefined {
  return dishCache.get(slug) || DISHES.find((d) => d.slug === slug);
}

export const MENU_TEXT = DISHES.map(
  (d) =>
    `${d.name} (${d.tag}) — Rs ${d.price}, heat: ${d.heat}, ready in ${d.time}. ${d.desc}`,
).join("\n");
