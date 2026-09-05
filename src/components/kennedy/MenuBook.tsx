import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";

import { fetchDishes, DISHES } from "@/lib/menu";
import { addToCart } from "@/lib/cart";
import { isMuted, playSfx } from "@/lib/sfx";
import caddyAvatar from "@/assets/caddy-avatar.jpg";

type BookDish = {
  slug: string;
  name: string;
  course: string;
  price: string;
  description: string;
  notes: string[];
  image: string;
};

function formatDishes(source: typeof DISHES): BookDish[] {
  return [...source]
    .sort((a, b) => {
      const aIsPizza = a.slug.includes("pizza") || a.tag.toLowerCase().includes("pizza") || a.name.toLowerCase().includes("pizza");
      const bIsPizza = b.slug.includes("pizza") || b.tag.toLowerCase().includes("pizza") || b.name.toLowerCase().includes("pizza");
      if (aIsPizza && !bIsPizza) return -1;
      if (!aIsPizza && bIsPizza) return 1;
      return 0;
    })
    .map((dish) => ({
      slug: dish.slug,
      name: dish.name,
      course: dish.tag,
      price: `PKR ${dish.price}`,
      description: dish.desc,
      notes: [`${dish.serves} · ${dish.weight}`, `Ready in ${dish.time}`, dish.ingredients[0] || "Caddy Oven Special"],
      image: dish.image,
    }));
}

/** Soft page-turn whoosh + a whispered dish name when a page is uncovered. */
function speak(text: string) {
  if (typeof window === "undefined" || isMuted()) return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.92;
  utter.pitch = 0.9;
  utter.volume = 0.6;
  synth.speak(utter);
}

export function MenuBook() {
  const [dishes, setDishes] = useState<BookDish[]>(() => formatDishes(DISHES));
  const pageCount = dishes.length + 1;
  const [open, setOpen] = useState<boolean[]>(() => Array(pageCount).fill(false));
  const coverOpen = open[0];
  const lockRef = useRef(0);

  useEffect(() => {
    fetchDishes()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const fresh = formatDishes(data);
          setDishes(fresh);
          setOpen(Array(fresh.length + 1).fill(false));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const toggle = useCallback(
    (index: number, voice?: string) => {
      const now = Date.now();
      if (now - lockRef.current < 320) return;
      lockRef.current = now;

      // Decide the outcome here (not inside the state updater) so the sound
      // always matches the page that is being revealed right now.
      const willOpen = !open[index];
      setOpen((prev) => prev.map((value, i) => (i === index ? !value : value)));
      playSfx(willOpen ? "swoosh" : "pop");
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      if (willOpen && voice) {
        speak(voice);
      } else if (!willOpen && index > 1 && dishes[index - 2]) {
        speak(`Previous recipe: ${dishes[index - 2].name}`);
      }
    },
    [open, dishes],
  );

  const closeAll = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setOpen((prev) => {
      if (prev.some(Boolean)) playSfx("pop");
      return Array(pageCount).fill(false);
    });
  }, []);

  const order = useCallback((slug: string, name: string) => {
    addToCart(slug);
    playSfx("cart");
    toast.success(`${name} added to your order`);
  }, []);

  return (
    <section id="menu-book" className="menu-scene" onClick={closeAll}>
      <div className="menu-scene__glow" aria-hidden="true" />

      <div className="menu-bg-type" aria-hidden="true">
        <span>MENU</span>
        <span>BOOK</span>
      </div>

      <header className="menu-head">
        <span className="menu-head__kicker">Est. 2014 · Charcoal &amp; Dum Kitchen</span>
        <h2 className="menu-head__title">The Menu Book</h2>
        <p className="menu-head__hint">
          {coverOpen
            ? "Keep flipping — tap outside to close the book"
            : "Tap the cover to open the menu"}
        </p>
      </header>

      <div className={`menu-book${open.some(Boolean) ? " is-open" : ""}`}>
        {/* Cover Sheet (Sheet 0) */}
        <div
          role="button"
          tabIndex={0}
          className={`menu-book__page menu-book__page--cover${coverOpen ? " is-open" : ""}`}
          style={{ "--i": 0 } as CSSProperties}
          onClick={(event) => {
            event.stopPropagation();
            toggle(
              0,
              `Recipe 1: ${dishes[0]!.name}. ${dishes[0]!.description}. Price: ${dishes[0]!.price}`
            );
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            toggle(
              0,
              `Recipe 1: ${dishes[0]!.name}. ${dishes[0]!.description}. Price: ${dishes[0]!.price}`
            );
          }}
          aria-pressed={coverOpen}
          aria-label="Open the menu book"
        >
          <div className="menu-page menu-page--cover-front">
            <span className="menu-cover__frame" aria-hidden="true" />
            <span className="menu-cover__crest menu-cover__crest--caddy">
              <img src={caddyAvatar} alt="" aria-hidden="true" loading="lazy" decoding="async" />
            </span>
            <span className="menu-cover__kicker">Takii · Caddy Kitchen</span>
            <span className="menu-cover__title">Kennedy</span>
            <span className="menu-cover__flourish" aria-hidden="true">
              <span />
              <i />
              <span />
            </span>
            <span className="menu-cover__sub">Charcoal · Dum · Wood-Fired</span>

            <span className="menu-cover__cta">
              <span className="menu-cover__finger" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v5a5 5 0 0 1-5 5h-2.2a4 4 0 0 1-3.1-1.5L5 15.5a1.6 1.6 0 0 1 2.3-2.2L9 15" />
                </svg>
              </span>
              Tap to explore
            </span>
            <span className="menu-cover__pulse" aria-hidden="true" />
          </div>

          {/* COVER BACK: Displays Recipe 1 Details on the LEFT side on 1st click */}
          <div className="menu-page menu-page--back">
            <div className="flex items-center justify-between">
              <span className="menu-page__no">
                RECIPE 01 / {String(dishes.length).padStart(2, "0")}
              </span>
              <button
                type="button"
                className="text-[10px] uppercase font-bold text-lux bg-lux/10 hover:bg-lux/20 px-2 py-1 rounded border border-lux/30 transition-colors flex items-center gap-1"
                onClick={(event) => {
                  event.stopPropagation();
                  speak(`${dishes[0]!.name}. ${dishes[0]!.description}. Price: ${dishes[0]!.price}`);
                }}
              >
                🔊 Listen Recipe
              </button>
            </div>
            <span className="menu-page__backname">{dishes[0]!.name}</span>
            <span className="menu-page__rule" />
            <p className="menu-page__desc">{dishes[0]!.description}</p>
            <div className="menu-page__notes">
              {dishes[0]!.notes.map((note) => (
                <span key={note}>{note}</span>
              ))}
            </div>
            <div className="menu-page__buy">
              <span className="menu-page__backprice">{dishes[0]!.price}</span>
              <button
                type="button"
                data-sfx="cart"
                className="menu-page__order"
                onClick={(event) => {
                  event.stopPropagation();
                  order(dishes[0]!.slug, dishes[0]!.name);
                }}
              >
                Order this
              </button>
            </div>
          </div>
        </div>

        {/* Dish pages: Sheet i (1 <= i < dishes.length) */}
        {dishes.slice(0, dishes.length - 1).map((dish, i) => {
          const index = i + 1; // Sheet index (1, 2, 3...)
          const facingPhotoDish = dishes[i]; // Photo of Recipe i facing on the RIGHT side
          const nextRecipeDish = dishes[i + 1]; // Next Recipe (i+1) details facing on the LEFT side when flipped

          return (
            <div
              role="button"
              tabIndex={0}
              key={dish.slug}
              className={`menu-book__page${open[index] ? " is-open" : ""}`}
              style={{ "--i": index } as CSSProperties}
              onClick={(event) => {
                event.stopPropagation();
                toggle(
                  index,
                  `Recipe ${index + 1}: ${nextRecipeDish!.name}. ${nextRecipeDish!.description}. Price: ${nextRecipeDish!.price}`
                );
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                event.stopPropagation();
                toggle(
                  index,
                  `Recipe ${index + 1}: ${nextRecipeDish!.name}. ${nextRecipeDish!.description}. Price: ${nextRecipeDish!.price}`
                );
              }}
              aria-pressed={open[index]}
              aria-label={`${nextRecipeDish!.name} — ${nextRecipeDish!.price}`}
            >
              {/* FRONT OF SHEET: displays Recipe i Photo on the RIGHT side */}
              <div className="menu-page menu-page--front">
                <img src={facingPhotoDish.image} alt={facingPhotoDish.name} loading="lazy" decoding="async" />
                <span className="menu-page__veil" aria-hidden="true" />
                <span className="menu-page__gloss" aria-hidden="true" />
                <span className="menu-page__label">
                  <span className="menu-page__course">{facingPhotoDish.course}</span>
                  <span className="menu-page__name">{facingPhotoDish.name}</span>
                  <span className="menu-page__price">{facingPhotoDish.price}</span>
                </span>
              </div>

              {/* BACK OF SHEET: displays Recipe i+1 Details & Buy Button on the LEFT side */}
              <div className="menu-page menu-page--back">
                <div className="flex items-center justify-between">
                  <span className="menu-page__no">
                    RECIPE {String(index + 1).padStart(2, "0")} / {String(dishes.length).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    className="text-[10px] uppercase font-bold text-lux bg-lux/10 hover:bg-lux/20 px-2 py-1 rounded border border-lux/30 transition-colors flex items-center gap-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      speak(`${nextRecipeDish!.name}. ${nextRecipeDish!.description}. Price: ${nextRecipeDish!.price}`);
                    }}
                  >
                    🔊 Listen Recipe
                  </button>
                </div>
                <span className="menu-page__backname">{nextRecipeDish!.name}</span>
                <span className="menu-page__rule" />
                <p className="menu-page__desc">{nextRecipeDish!.description}</p>
                <div className="menu-page__notes">
                  {nextRecipeDish!.notes.map((note) => (
                    <span key={note}>{note}</span>
                  ))}
                </div>
                <div className="menu-page__buy">
                  <span className="menu-page__backprice">{nextRecipeDish!.price}</span>
                  <button
                    type="button"
                    data-sfx="cart"
                    className="menu-page__order"
                    onClick={(event) => {
                      event.stopPropagation();
                      order(nextRecipeDish!.slug, nextRecipeDish!.name);
                    }}
                  >
                    Order this
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="menu-foot">
        <span>Charcoal grill</span>
        <span className="menu-foot__dot" aria-hidden="true" />
        <span>Dum biryani</span>
        <span className="menu-foot__dot" aria-hidden="true" />
        <span>Wood-fired oven</span>
      </div>
    </section>
  );
}
