import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Minus,
  Plus,
  X,
  Flame,
  Clock,
  Star,
  CheckCircle2,
  MapPin,
  Wallet,
  Phone,
  ChevronLeft,
  Bike,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { Dish } from "@/lib/menu";
import {
  PAYMENTS,
  ORDER_STAGES,
  buildOrder,
  loadAddresses,
  saveAddress,
  type Address,
  type Order,
  type PaymentMethod,
} from "@/lib/orders";
import { TrackMap } from "./TrackMap";
import { createOrder, updateOrderStatus } from "@/lib/account";
import { getLocalUser } from "@/hooks/use-session";
import { api, isBackendConfigured } from "@/lib/api/client";

export type OrderIntent = { dish: Dish; mode: "cart" | "order" } | null;

const SIZES = [
  { label: "Regular", extra: 0 },
  { label: "Large", extra: 350 },
  { label: "Family", extra: 700 },
];

type Step = "details" | "address" | "payment" | "placing" | "tracking";

const emptyForm = {
  label: "Home",
  name: "",
  phone: "",
  street: "",
  area: "",
  city: "Narowal",
  notes: "",
};

export function OrderDialog({ intent, onClose }: { intent: OrderIntent; onClose: () => void }) {
  const [step, setStep] = useState<Step>("details");
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState("Regular");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [payment, setPayment] = useState<PaymentMethod>("jazzcash");
  const [order, setOrder] = useState<Order | null>(null);
  const [stage, setStage] = useState(0);
  const [dbOrderId, setDbOrderId] = useState<string | null>(null);
  const [courier, setCourier] = useState<{ lat: number; lng: number } | null>(null);

  const dish = intent?.dish;

  useEffect(() => {
    if (!intent) return;
    let cancelled = false;
    void (async () => {
      const list = await loadAddresses();
      if (cancelled) return;
      setAddresses(list);
      setSelectedAddr(list[0]?.id != null ? String(list[0].id) : null);
      setAdding(list.length === 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [intent]);

  // Demo-only simulated stage progression when backend is not configured
  useEffect(() => {
    if (step !== "tracking" || isBackendConfigured()) return;
    const t = window.setInterval(() => {
      setStage((s) => {
        const next = Math.min(ORDER_STAGES.length - 1, s + 1);
        if (next !== s) {
          toast.success(ORDER_STAGES[next]!.label, { description: ORDER_STAGES[next]!.hint });
        }
        return next;
      });
    }, 7000);
    return () => window.clearInterval(t);
  }, [step]);

  // Poll live rider GPS location & order status for customer map tracking
  useEffect(() => {
    if (step !== "tracking" || !dbOrderId) return;

    let inFlight = false;
    let stopped = false;
    let interval: any = null;

    const pollLocation = async () => {
      if (!isBackendConfigured() || inFlight || stopped) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      inFlight = true;
      try {
        const res = await api.get<{ lat?: number; lng?: number; status?: string }>(`/orders/${dbOrderId}/rider-location/`);
        if (res && !stopped) {
          if (typeof res.lat === "number" && typeof res.lng === "number") {
            setCourier({ lat: res.lat, lng: res.lng });
          }
          if (res.status) {
            const idx = ORDER_STAGES.findIndex((s) => s.key === res.status);
            if (idx !== -1) {
              setStage(idx);
            }
          }
          if (res.status === "delivered") {
            stopped = true;
            if (interval) clearInterval(interval);
            setStage(ORDER_STAGES.length - 1);
            toast.success("Order Delivered!", {
              description: "Your hot meal has been handed over. Enjoy your food!",
            });
            setTimeout(() => {
              close();
            }, 3500);
          } else if (res.status === "cancelled") {
            stopped = true;
            if (interval) clearInterval(interval);
            toast.error("Order Cancelled", {
              description: "This order was cancelled.",
            });
          }
        }
      } catch {
        /* ignore periodic location poll error */
      } finally {
        inFlight = false;
      }
    };

    void pollLocation();
    interval = setInterval(pollLocation, 6000);

    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
    };
  }, [step, dbOrderId]);

  const unit = dish ? Number(dish.price) + (SIZES.find((s) => s.label === size)?.extra ?? 0) : 0;
  const fee = PAYMENTS.find((p) => p.id === payment)?.fee ?? 0;
  const subtotal = unit * qty;
  const delivery = subtotal >= 2000 ? 0 : 120;
  const total = subtotal + delivery + fee;

  const activeAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddr) ?? null,
    [addresses, selectedAddr],
  );

  const close = () => {
    onClose();
    window.setTimeout(() => {
      setStep("details");
      setQty(1);
      setSize("Regular");
      setOrder(null);
      setStage(0);
      setForm(emptyForm);
    }, 250);
  };

  const submitAddress = async () => {
    if (!form.name.trim() || !/^[0-9+\-\s]{10,}$/.test(form.phone) || !form.street.trim()) {
      toast.error("Adhoori maloomat", { description: "Naam, sahi phone number aur address zaroori hai." });
      return;
    }
    const addr: Address = { id: crypto.randomUUID(), ...form };
    const all = await saveAddress(addr);
    setAddresses(all);
    setSelectedAddr(String(addr.id));
    setAdding(false);
    toast.success("Address saved", { description: `${addr.label} · ${addr.street}` });
  };

  const placeOrder = () => {
    if (!dish || !activeAddress) return;
    setStep("placing");
    window.setTimeout(() => {
      void (async () => {
        const o = buildOrder({ dish, size, qty, total, payment, address: activeAddress });
        setOrder(o);
        setStep("tracking");
        setStage(0);
        toast.success(`Order ${o.id} placed`, {
          description: `${o.rider.name} aap ka order laa raha hai.`,
        });

        // Save to the account so it shows up in Profile → order tracking.
        try {
          const id = await createOrder({
            userId: getLocalUser()?.id ?? "",
            orderCode: o.id,
            dishName: dish.name,
            dishImage: dish.image,
            size,
            qty,
            total,
            payment,
            address: activeAddress,
            rider: o.rider,
          });
          setDbOrderId(id);
        } catch {
          /* tracking still works locally */
        }
      })();
    }, 1400);
  };

  return (
    <AnimatePresence>
      {intent && dish && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[400] flex items-end justify-center bg-charcoal/65 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={dish.name}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 70, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream shadow-[0_-20px_60px_rgba(0,0,0,0.35)] sm:rounded-3xl"
          >
            {/* header image */}
            {step !== "tracking" && (
              <div className="relative">
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="h-40 w-full object-cover sm:h-52"
                  loading="lazy" decoding="async" />
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="absolute right-3 top-3 rounded-full bg-charcoal/60 p-2 text-cream"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                {step !== "details" && (
                  <button
                    type="button"
                    onClick={() => setStep(step === "payment" ? "address" : "details")}
                    aria-label="Back"
                    className="absolute left-3 top-3 rounded-full bg-charcoal/60 p-2 text-cream"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <div className="absolute inset-x-0 bottom-0 flex gap-1.5 bg-gradient-to-t from-charcoal/70 to-transparent p-3">
                  {(["details", "address", "payment"] as Step[]).map((s, i) => (
                    <span
                      key={s}
                      className={`h-1.5 flex-1 rounded-full ${
                        ["details", "address", "payment"].indexOf(step) >= i
                          ? "bg-flame"
                          : "bg-cream/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="p-5 sm:p-6">
              {/* STEP 1 — product details */}
              {step === "details" && (
                <>
                  <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.22em] text-flame">
                    {dish.tag}
                  </span>
                  <h3 className="mt-1 font-display text-2xl font-extrabold uppercase leading-tight text-charcoal sm:text-3xl">
                    {dish.name}
                  </h3>
                  <p className="mt-2 font-body text-sm text-charcoal/70">{dish.desc}</p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
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

                  <p className="mt-5 font-display text-xs font-extrabold uppercase tracking-[0.2em] text-charcoal/60">
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

                  <div className="mt-5 flex items-center justify-between">
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
                        Subtotal
                      </p>
                      <p className="font-display text-2xl font-extrabold text-flame">Rs {subtotal}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep("address")}
                    className="mt-5 w-full rounded-full bg-flame py-4 font-display text-sm font-extrabold uppercase tracking-[0.16em] text-cream shadow-[0_14px_30px_rgba(180,40,20,0.35)] active:scale-[0.98]"
                  >
                    {intent.mode === "cart" ? "Continue to Checkout" : "Order Now"}
                  </button>
                </>
              )}

              {/* STEP 2 — address */}
              {step === "address" && (
                <>
                  <h3 className="font-display text-xl font-extrabold uppercase text-charcoal">
                    Delivery Address
                  </h3>
                  <p className="mt-1 font-body text-sm text-charcoal/60">
                    Saved address chunein ya naya add karein.
                  </p>

                  <div className="mt-4 space-y-2">
                    {addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAddr(String(a.id));
                          setAdding(false);
                        }}
                        className={`flex w-full gap-3 rounded-2xl border-2 p-3 text-left transition-colors ${
                          selectedAddr === a.id && !adding
                            ? "border-flame bg-flame/5"
                            : "border-charcoal/12"
                        }`}
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-flame" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block font-display text-sm font-extrabold uppercase text-charcoal">
                            {a.label} · {a.name}
                          </span>
                          <span className="block truncate font-body text-xs text-charcoal/65">
                            {a.street}, {a.area} {a.city}
                          </span>
                          <span className="block font-body text-xs text-charcoal/50">{a.phone}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  {!adding && (
                    <button
                      type="button"
                      onClick={() => setAdding(true)}
                      className="mt-3 w-full rounded-2xl border-2 border-dashed border-charcoal/25 py-3 font-display text-xs font-extrabold uppercase tracking-[0.18em] text-charcoal/70"
                    >
                      + Add New Address
                    </button>
                  )}

                  {adding && (
                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2">
                        {["Home", "Work", "Other"].map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setForm({ ...form, label: l })}
                            className={`flex-1 rounded-xl border-2 py-2 font-display text-[11px] font-extrabold uppercase ${
                              form.label === l ? "border-flame bg-flame text-cream" : "border-charcoal/15 text-charcoal/70"
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                      {(
                        [
                          ["name", "Full name"],
                          ["phone", "Phone number (03xx-xxxxxxx)"],
                          ["street", "House / street"],
                          ["area", "Area / mohalla"],
                          ["city", "City"],
                          ["notes", "Delivery notes (optional)"],
                        ] as const
                      ).map(([k, ph]) => (
                        <input
                          key={k}
                          value={form[k]}
                          onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                          placeholder={ph}
                          inputMode={k === "phone" ? "tel" : "text"}
                          className="w-full rounded-2xl border-2 border-charcoal/12 bg-cream px-4 py-3 font-body text-sm text-charcoal outline-none placeholder:text-charcoal/40 focus:border-flame"
                        />
                      ))}
                      <button
                        type="button"
                        onClick={submitAddress}
                        className="w-full rounded-full bg-charcoal py-3 font-display text-xs font-extrabold uppercase tracking-[0.18em] text-cream"
                      >
                        Save Address
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!activeAddress || adding}
                    onClick={() => setStep("payment")}
                    className="mt-5 w-full rounded-full bg-flame py-4 font-display text-sm font-extrabold uppercase tracking-[0.16em] text-cream shadow-[0_14px_30px_rgba(180,40,20,0.35)] disabled:opacity-40"
                  >
                    Continue to Payment
                  </button>
                </>
              )}

              {/* STEP 3 — payment */}
              {step === "payment" && (
                <>
                  <h3 className="font-display text-xl font-extrabold uppercase text-charcoal">
                    Payment Method
                  </h3>
                  <div className="mt-4 space-y-2">
                    {PAYMENTS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPayment(p.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left ${
                          payment === p.id ? "border-flame bg-flame/5" : "border-charcoal/12"
                        }`}
                      >
                        <Wallet className="h-4 w-4 shrink-0 text-flame" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-sm font-extrabold uppercase text-charcoal">
                            {p.label}
                          </span>
                          <span className="block font-body text-xs text-charcoal/60">{p.note}</span>
                        </span>
                        <span className="font-display text-xs font-extrabold text-charcoal/70">
                          {p.fee ? `+Rs ${p.fee}` : "Free"}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 space-y-1.5 rounded-2xl bg-charcoal/5 p-4 font-body text-sm text-charcoal/75">
                    <div className="flex justify-between">
                      <span>
                        {qty} × {dish.name} ({size})
                      </span>
                      <span>Rs {subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery</span>
                      <span>{delivery ? `Rs ${delivery}` : "Free"}</span>
                    </div>
                    {fee > 0 && (
                      <div className="flex justify-between">
                        <span>Cash handling</span>
                        <span>Rs {fee}</span>
                      </div>
                    )}
                    <div className="mt-2 flex justify-between border-t border-charcoal/10 pt-2 font-display text-lg font-extrabold text-flame">
                      <span>Total</span>
                      <span>Rs {total}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={placeOrder}
                    className="mt-5 w-full rounded-full bg-flame py-4 font-display text-sm font-extrabold uppercase tracking-[0.16em] text-cream shadow-[0_14px_30px_rgba(180,40,20,0.35)] active:scale-[0.98]"
                  >
                    Place Order · Rs {total}
                  </button>
                </>
              )}

              {step === "placing" && (
                <div className="py-14 text-center">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-flame" aria-hidden="true" />
                  <p className="mt-4 font-display text-sm font-extrabold uppercase tracking-[0.18em] text-charcoal">
                    Placing your order…
                  </p>
                </div>
              )}

              {/* STEP 4 — tracking */}
              {step === "tracking" && order && (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.22em] text-flame">
                        Order {order.id}
                      </span>
                      <h3 className="mt-1 font-display text-xl font-extrabold uppercase text-charcoal">
                        {ORDER_STAGES[stage]!.label}
                      </h3>
                      <p className="font-body text-sm text-charcoal/65">{ORDER_STAGES[stage]!.hint}</p>
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close"
                      className="rounded-full bg-charcoal/10 p-2 text-charcoal"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-4 flex gap-1.5">
                    {ORDER_STAGES.map((s, i) => (
                      <span
                        key={s.key}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= stage ? "bg-flame" : "bg-charcoal/12"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="mt-4">
                    <TrackMap
                      riderName={order.rider.name}
                      target={
                        activeAddress
                          ? { lat: activeAddress.lat ?? 32.1009, lng: activeAddress.lng ?? 74.8711 }
                          : { lat: 32.1009, lng: 74.8711 }
                      }
                      targetLabel={activeAddress ? `${activeAddress.street}, ${activeAddress.area}` : undefined}
                      courier={courier}
                      rideStarted={stage >= 2}
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-2xl bg-charcoal/5 p-3">
                    <span className="rounded-full bg-flame p-2 text-cream">
                      <Bike className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-sm font-extrabold uppercase text-charcoal">
                        {order.rider.name}
                      </span>
                      <span className="block font-body text-xs text-charcoal/60">
                        {order.rider.bike}
                      </span>
                    </span>
                    <a
                      href={`tel:${order.rider.phone.replace(/[^0-9+]/g, "")}`}
                      className="flex items-center gap-1.5 rounded-full bg-charcoal px-4 py-2 font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-cream"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      Call
                    </a>
                  </div>

                  <div className="mt-4 space-y-1 rounded-2xl border-2 border-charcoal/10 p-4 font-body text-sm text-charcoal/75">
                    <p className="flex items-center gap-2 font-display text-xs font-extrabold uppercase tracking-[0.16em] text-charcoal">
                      <CheckCircle2 className="h-4 w-4 text-flame" aria-hidden="true" />
                      {order.qty} × {order.dishName} ({order.size}) — Rs {order.total}
                    </p>
                    <p>
                      {order.address.label}: {order.address.street}, {order.address.area}{" "}
                      {order.address.city}
                    </p>
                    <p>
                      {order.address.name} · {order.address.phone} ·{" "}
                      {PAYMENTS.find((p) => p.id === order.payment)?.label}
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
