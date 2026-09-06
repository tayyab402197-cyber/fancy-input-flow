import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, Loader2, MapPin, Minus, Plus, Trash2, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { getLocalUser, useSession } from "@/hooks/use-session";
import {
  clearSelected,
  removeFromCart,
  setAllSelected,
  setCartQty,
  toggleCartSelected,
  useCart,
} from "@/lib/cart";
import {
  PAYMENTS,
  loadAddresses,
  loadAddressesLocal,
  saveAddress,
  type Address,
  type PaymentMethod,
} from "@/lib/orders";
import { createOrder, getLastOrderCode, saveProfile } from "@/lib/account";
import {
  formatPkPhoneInput,
  normalizePkPhone,
  validateCity,
  validateName,
  validatePkPhone,
  validateStreet,
} from "@/lib/validation";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart & Checkout — Kennedy Moon Grill Narowal" },
      {
        name: "description",
        content:
          "Review your Kennedy order, share your live delivery location and pay with JazzCash, EasyPaisa or cash on delivery.",
      },
      { property: "og:title", content: "Your Cart — Kennedy Moon Grill" },
      {
        property: "og:description",
        content: "One place to add items, share your location and place the order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

type FieldKey = "name" | "phone" | "street" | "area" | "city" | "notes";

function CartPage() {
  const navigate = useNavigate();
  const { items, selected, selectedSubtotal: subtotal } = useCart();
  const { isSignedIn, isLoading } = useSession();

  const [form, setForm] = useState({
    label: "Home",
    name: "",
    phone: "",
    street: "",
    area: "",
    city: "Narowal",
    notes: "",
  });
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [payment, setPayment] = useState<PaymentMethod>("jazzcash");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [placing, setPlacing] = useState(false);

  // Saved addresses (repeat orders should not retype anything)
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string>("new");

  useEffect(() => {
    const local = loadAddressesLocal();
    if (local.length) {
      setAddresses(local);
      setSelectedAddr(String((local.find((a) => a.is_default) ?? local[0])!.id ?? "new"));
    }
    void loadAddresses()
      .then((list) => {
        if (!list.length) return;
        setAddresses(list);
        setSelectedAddr((cur) =>
          cur !== "new" && list.some((a) => String(a.id) === cur)
            ? cur
            : String((list.find((a) => a.is_default) ?? list[0])!.id ?? "new"),
        );
      })
      .catch(() => undefined);
  }, []);

  const savedAddress = useMemo(
    () => addresses.find((a) => String(a.id) === selectedAddr) ?? null,
    [addresses, selectedAddr],
  );
  const usingNew = selectedAddr === "new" || !savedAddress;

  const errors = useMemo(() => {
    if (!usingNew) return {} as Partial<Record<FieldKey, string>>;
    const e: Partial<Record<FieldKey, string>> = {};
    const checks = [
      ["name", validateName(form.name)],
      ["phone", validatePkPhone(form.phone)],
      ["street", validateStreet(form.street)],
      ["city", validateCity(form.city)],
    ] as const;
    for (const [key, check] of checks) if (!check.ok) e[key] = check.message;
    return e;
  }, [form, usingNew]);

  const activeCoords = coords ??
    (savedAddress?.lat && savedAddress?.lng ? { lat: savedAddress.lat, lng: savedAddress.lng } : null);

  const fee = PAYMENTS.find((p) => p.id === payment)?.fee ?? 0;
  const delivery = subtotal >= 2000 || subtotal === 0 ? 0 : 120;
  const total = subtotal + delivery + fee;

  const firstFieldError = (["name", "phone", "street", "city"] as const)
    .map((k) => errors[k])
    .find(Boolean);

  const blockReason: string | null = isLoading
    ? "Checking your account…"
    : !isSignedIn
      ? "Sign in first to place this order"
      : selected.length === 0
        ? "Tick at least one item above"
        : firstFieldError
          ? firstFieldError
          : !activeCoords
            ? "Share your live location so the rider can find you"
            : null;

  const shareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("This browser can't share your location");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Location shared", {
          description: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        });
      },
      () => {
        setLocating(false);
        toast.error("Please allow location access", {
          description: "The rider needs it to reach your door.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const placeOrder = async () => {
    if (blockReason) {
      setTouched({ name: true, phone: true, street: true, city: true });
      if (!isSignedIn && !isLoading) {
        toast.info("Please sign in first to place your order");
        void navigate({ to: "/login" });
        return;
      }
      toast.error("Almost there", { description: blockReason });
      return;
    }

    setPlacing(true);
    try {
      const user = getLocalUser();

      const address: Address = usingNew
        ? {
            label: form.label || "Home",
            name: form.name.trim(),
            phone: normalizePkPhone(form.phone),
            street: form.street.trim(),
            area: form.area.trim() || "Central",
            city: form.city.trim() || "Narowal",
            notes: form.notes.trim(),
            ...(activeCoords ?? {}),
          }
        : { ...savedAddress!, ...(activeCoords ?? {}) };

      const first = selected[0]!;

      await createOrder({
        userId: user?.id,
        items: selected.map((i) => ({
          dish_slug: i.slug,
          dish_id: i.dish?.id,
          size: i.size,
          qty: i.qty,
        })),
        dishName:
          selected.length > 1
            ? `${first.dish.name} + ${selected.length - 1} more`
            : first.dish.name,
        dishImage: first.dish.image,
        size: first.size,
        qty: selected.reduce((n, i) => n + i.qty, 0),
        total,
        payment,
        address,
      });

      // Remember this address for the next order
      if (usingNew) await saveAddress({ id: crypto.randomUUID(), ...address }).catch(() => undefined);

      if (user?.id) {
        await saveProfile({
          id: user.id,
          full_name: address.name,
          phone: address.phone,
        }).catch(() => undefined);
      }

      clearSelected();
      const code = getLastOrderCode();
      toast.success(code ? `Order ${code} confirmed` : "Order confirmed", {
        description: "Live rider tracking has started on your profile.",
        duration: 6000,
      });
      void navigate({ to: "/profile" });
    } catch (err) {
      toast.error("We couldn't place your order", {
        description: err instanceof Error ? err.message : "Please try again in a moment.",
      });
    } finally {
      setPlacing(false);
    }
  };

  const fieldClass = (key: FieldKey) =>
    `mt-1 w-full rounded-xl border-2 bg-cream px-3 py-2.5 font-body text-sm text-charcoal outline-none ${
      touched[key] && errors[key]
        ? "border-flame focus:border-flame"
        : "border-charcoal/12 focus:border-flame"
    }`;

  return (
    <main className="min-h-screen bg-cream pb-20">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-display text-xs font-extrabold uppercase tracking-[0.18em] text-charcoal/70 hover:text-flame"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Keep browsing
        </Link>

        <h1 className="mt-4 font-display text-3xl font-extrabold uppercase text-charcoal sm:text-5xl">
          Your Cart
        </h1>

        {items.length === 0 ? (
          <p className="mt-6 font-body text-sm text-charcoal/70">
            Your cart is empty —{" "}
            <Link to="/" className="font-semibold text-flame">
              see the menu
            </Link>
            .
          </p>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            {/* items + checkout form */}
            <div>
              <div className="mb-3 flex items-center justify-between rounded-2xl border-2 border-charcoal/10 px-4 py-2.5">
                <span className="font-body text-xs text-charcoal/70">
                  {selected.length} of {items.length} items selected
                </span>
                <button
                  type="button"
                  onClick={() => setAllSelected(selected.length !== items.length)}
                  className="font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-flame"
                >
                  {selected.length === items.length ? "Unselect all" : "Select all"}
                </button>
              </div>
              <div className="space-y-3">
                {items.map((i) => (
                  <div
                    key={`${i.slug}-${i.size}`}
                    className={`flex items-center gap-3 rounded-2xl p-3 transition-colors ${
                      i.selected ? "bg-flame/8 ring-2 ring-flame/40" : "bg-charcoal/5"
                    }`}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={i.selected}
                      aria-label={`Select ${i.dish.name}`}
                      onClick={() => toggleCartSelected(i.slug, i.size)}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                        i.selected ? "border-flame bg-flame text-cream" : "border-charcoal/25"
                      }`}
                    >
                      {i.selected && <Check className="h-4 w-4" aria-hidden="true" />}
                    </button>
                    <img
                      src={i.dish.image}
                      alt={i.dish.name}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" decoding="async" />

                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-extrabold uppercase text-charcoal">
                        {i.dish.name}
                      </p>
                      <p className="font-body text-xs text-charcoal/60">
                        {i.size} · Rs {i.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-cream p-1">
                      <button
                        type="button"
                        aria-label="Decrease"
                        onClick={() => setCartQty(i.slug, i.size, i.qty - 1)}
                        className="rounded-full p-1.5"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="w-5 text-center font-display text-sm font-extrabold">
                        {i.qty}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase"
                        onClick={() => setCartQty(i.slug, i.size, Math.min(20, i.qty + 1))}
                        className="rounded-full p-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${i.dish.name}`}
                      onClick={() => removeFromCart(i.slug, i.size)}
                      className="rounded-full p-2 text-charcoal/50 hover:text-flame"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <h2 className="mt-8 font-display text-lg font-extrabold uppercase text-charcoal">
                Delivery details
              </h2>

              {addresses.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="font-body text-[11px] uppercase tracking-widest text-charcoal/50">
                    Deliver to a saved address
                  </p>
                  {addresses.map((a) => (
                    <button
                      key={String(a.id)}
                      type="button"
                      onClick={() => setSelectedAddr(String(a.id))}
                      className={`flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left ${
                        String(a.id) === selectedAddr ? "border-flame bg-flame/5" : "border-charcoal/12"
                      }`}
                    >
                      <span
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                          String(a.id) === selectedAddr ? "border-flame bg-flame" : "border-charcoal/25"
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block font-display text-xs font-extrabold uppercase text-charcoal">
                          {a.label} · {a.name}
                        </span>
                        <span className="block font-body text-xs text-charcoal/65">
                          {a.street}, {a.area}, {a.city} · {a.phone}
                        </span>
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedAddr("new")}
                    className={`flex w-full items-center gap-2 rounded-2xl border-2 border-dashed p-3 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] ${
                      usingNew ? "border-flame text-flame" : "border-charcoal/25 text-charcoal/70"
                    }`}
                  >
                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                    Use a new address
                  </button>
                </div>
              )}

              {usingNew && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["name", "Full name"],
                      ["phone", "Phone number"],
                      ["street", "House / street"],
                      ["area", "Area"],
                      ["city", "City"],
                      ["notes", "Notes for the rider (optional)"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="font-body text-[11px] uppercase tracking-widest text-charcoal/50">
                        {label}
                      </span>
                      <input
                        value={form[key]}
                        {...(key === "phone"
                          ? {
                              type: "tel",
                              inputMode: "tel" as const,
                              maxLength: 15,
                              placeholder: "0300 1234567",
                              autoComplete: "tel",
                            }
                          : {})}
                        aria-invalid={Boolean(touched[key] && errors[key])}
                        onBlur={() => setTouched((t) => ({ ...t, [key]: true }))}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [key]: key === "phone" ? formatPkPhoneInput(e.target.value) : e.target.value,
                          })
                        }
                        className={fieldClass(key)}
                      />
                      {touched[key] && errors[key] && (
                        <span className="mt-1 block font-body text-[11px] font-semibold text-flame">
                          {errors[key]}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={shareLocation}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 py-3 font-display text-xs font-extrabold uppercase tracking-[0.16em] ${
                  activeCoords
                    ? "border-flame bg-flame/10 text-flame"
                    : "border-dashed border-charcoal/25 text-charcoal/70"
                }`}
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                )}
                {locating
                  ? "Finding you…"
                  : activeCoords
                    ? `Location shared · ${activeCoords.lat.toFixed(4)}, ${activeCoords.lng.toFixed(4)}`
                    : "Share my live location (required)"}
              </button>
            </div>

            {/* summary */}
            <aside className="h-fit rounded-3xl bg-charcoal/5 p-5">
              <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-charcoal">
                Payment
              </h2>
              <div className="mt-3 space-y-2">
                {PAYMENTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPayment(p.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border-2 p-3 text-left ${
                      payment === p.id ? "border-flame bg-flame/5" : "border-charcoal/12"
                    }`}
                  >
                    <span>
                      <span className="block font-display text-sm font-extrabold uppercase text-charcoal">
                        {p.label}
                      </span>
                      <span className="block font-body text-xs text-charcoal/60">{p.note}</span>
                    </span>
                    {p.fee > 0 && (
                      <span className="font-body text-xs text-charcoal/60">+Rs {p.fee}</span>
                    )}
                  </button>
                ))}
              </div>

              <dl className="mt-5 space-y-2 font-body text-sm">
                <div className="flex justify-between">
                  <dt className="text-charcoal/60">Subtotal</dt>
                  <dd className="text-charcoal">Rs {subtotal}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-charcoal/60">Delivery</dt>
                  <dd className="text-charcoal">{delivery ? `Rs ${delivery}` : "Free"}</dd>
                </div>
                {fee > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-charcoal/60">COD fee</dt>
                    <dd className="text-charcoal">Rs {fee}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-charcoal/10 pt-2">
                  <dt className="font-display font-extrabold uppercase text-charcoal">Total</dt>
                  <dd className="font-display text-xl font-extrabold text-flame">Rs {total}</dd>
                </div>
              </dl>

              <button
                type="button"
                disabled={placing || Boolean(blockReason)}
                aria-busy={placing}
                {...(blockReason ? { title: blockReason } : {})}
                onClick={() => void placeOrder()}
                className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-flame py-4 font-display text-sm font-extrabold uppercase tracking-[0.16em] text-cream shadow-[0_14px_30px_rgba(180,40,20,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {placing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {placing
                  ? "Placing your order…"
                  : `Place order · Rs ${total}`}
              </button>

              <p
                className={`mt-2 text-center font-body text-[11px] ${
                  blockReason ? "font-semibold text-flame" : "text-charcoal/50"
                }`}
                role={blockReason ? "status" : undefined}
              >
                {blockReason ?? "Live rider tracking opens on your profile right after you order."}
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
