import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Bike,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Heart,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  ShoppingBag,
  Timer,
  TrendingUp,
  UtensilsCrossed,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { getLocalUser } from "@/hooks/use-session";
import { isEmailVerified, signOut } from "@/lib/auth";
import { requireRole } from "@/lib/auth-guard";
import {
  ORDER_STAGES,
  PAYMENTS,
  loadAddresses,
  type Address,
  type OrderStatusKey,
} from "@/lib/orders";
import { fetchOrders, fetchProfile, type DbOrder } from "@/lib/account";

import { addToCart, dishBySlug, useLikes, useWishlist } from "@/lib/cart";
import { fetchAssignedCaddy, type CaddyStatus } from "@/lib/caddy";
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { CaddyCard } from "@/components/profile/CaddyCard";
import { OrderTracking } from "@/components/profile/OrderTracking";
import { SecurityCard } from "@/components/profile/SecurityCard";

import { useOrderTracking } from "@/hooks/use-order-tracking";

export const Route = createFileRoute("/profile")({
  // Client-rendered + guarded before render, so the page never flashes before
  // an unauthenticated visitor is redirected.
  ssr: false,
  beforeLoad: requireRole(["customer"]),
  head: () => ({
    meta: [
      { title: "My Account & Order Tracking — Kennedy Moon Grill" },
      {
        name: "description",
        content:
          "Track your live delivery, review past orders, manage addresses and payments, and keep your favourite dishes in one place.",
      },
      { property: "og:title", content: "My Account — Kennedy Moon Grill" },
      {
        property: "og:description",
        content:
          "Live delivery tracking, order history, saved dishes and account settings in one simple screen.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const money = (n: number | string) => `Rs ${Number(n).toLocaleString("en-PK")}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const paymentLabel = (id: string) => PAYMENTS.find((p) => p.id === id)?.label ?? id.toUpperCase();
const stageLabel = (key: OrderStatusKey) =>
  ORDER_STAGES.find((s) => s.key === key)?.label ?? "Confirmed";

type AddressWithCoords = DbOrder["address"] & { lat?: number; lng?: number };

const TABS = [
  { id: "home", label: "Home" },
  { id: "orders", label: "Orders" },
  { id: "saved", label: "Saved" },
  { id: "account", label: "Account" },
] as const;
type TabId = (typeof TABS)[number]["id"] | "live";

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("home");
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const wishlist = useWishlist();
  const likes = useLikes();

  useEffect(() => {
    // Access + role are already enforced by the route guard (beforeLoad).
    const local = getLocalUser();
    if (!local) return;
    setUserId(local.id);
    setEmail(local.email);
    setJoined(local.created_at);
    void loadAddresses().then((addrs) => setSavedAddresses(addrs || []));
  }, [navigate]);

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", userId],
    queryFn: () => fetchOrders(userId!),
    enabled: !!userId,
    refetchInterval: 20000,
  });

  const caddyStatus: CaddyStatus | null = ordersQuery.data?.some((o) => o.status !== "delivered")
    ? ordersQuery.data.some((o) => o.status === "onway")
      ? "onway"
      : "picking"
    : null;

  const caddyQuery = useQuery({
    queryKey: ["assigned-caddy", userId, caddyStatus],
    queryFn: () => fetchAssignedCaddy(caddyStatus),
    enabled: !!userId && !!caddyStatus,
  });
  const caddy = caddyQuery.data ?? null;

  const orders = ordersQuery.data ?? [];
  const current = useMemo(() => orders.find((o) => o.status !== "delivered"), [orders]);
  const past = useMemo(() => orders.filter((o) => o !== current), [orders, current]);
  const profile = profileQuery.data;

  const spent = orders.reduce((n, o) => n + Number(o.total), 0);
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const avg = orders.length ? Math.round(spent / orders.length) : 0;
  const favouriteDish = useMemo(() => {
    const tally = new Map<string, number>();
    orders.forEach((o) => tally.set(o.dish_name, (tally.get(o.dish_name) ?? 0) + o.qty));
    return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  }, [orders]);
  const favouritePayment = useMemo(() => {
    const tally = new Map<string, number>();
    orders.forEach((o) => tally.set(o.payment, (tally.get(o.payment) ?? 0) + 1));
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return top ? paymentLabel(top) : "—";
  }, [orders]);

  /** Address book = saved addresses + every address ever used on an order. */
  const addressBook = useMemo(() => {
    const map = new Map<string, { address: Address; uses: number; last: string | null }>();
    savedAddresses.forEach((a) => {
      const key = `${a.street}|${a.area}|${a.city}`.toLowerCase();
      map.set(key, { address: a, uses: 0, last: null });
    });
    orders.forEach((o) => {
      const a = o.address;
      if (!a) return;
      const key = `${a.street}|${a.area}|${a.city}`.toLowerCase();
      const found = map.get(key);
      if (found) {
        found.uses += 1;
        if (!found.last || found.last < o.created_at) found.last = o.created_at;
      } else {
        map.set(key, { address: a, uses: 1, last: o.created_at });
      }
    });
    return [...map.values()].sort((a, b) => b.uses - a.uses);
  }, [savedAddresses, orders]);

  /** Payment ledger grouped by method. */
  const paymentSummary = useMemo(
    () =>
      PAYMENTS.map((p) => {
        const rows = orders.filter((o) => o.payment === p.id);
        return {
          ...p,
          count: rows.length,
          total: rows.reduce((n, o) => n + Number(o.total), 0),
        };
      }),
    [orders],
  );

  const notifications = useMemo(
    () =>
      orders.slice(0, 12).map((o) => ({
        id: o.id,
        title:
          o.status === "delivered"
            ? `${o.dish_name} delivered`
            : `${stageLabel(o.status)} — ${o.dish_name}`,
        body: `${o.order_code} · ${money(o.total)} · ${paymentLabel(o.payment)}`,
        at: o.created_at,
        live: o.status !== "delivered",
      })),
    [orders],
  );

  const resetLocal = async () => {
    signOut();
    await queryClient.cancelQueries();
    queryClient.clear();
    toast.success("Signed out successfully");
    void navigate({ to: "/login", replace: true });
  };

  const displayName = profile?.full_name || email.split("@")[0] || "Kennedy guest";

  const address = (current?.address ?? null) as AddressWithCoords | null;
  const target = useMemo(
    () => (address?.lat != null && address?.lng != null ? { lat: address.lat, lng: address.lng } : null),
    [address?.lat, address?.lng],
  );

  const onTrackingStatus = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["orders", userId] });
  }, [queryClient, userId]);

  const tracking = useOrderTracking(current ?? null, target, {
    onStatusChange: onTrackingStatus,
  });

  const savedCount = wishlist.slugs.length + likes.slugs.length;

  return (
    <main className="min-h-screen bg-cream px-4 pb-14 pt-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-charcoal/70 hover:text-flame"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back to menu
          </Link>
          <button
            type="button"
            onClick={() => void resetLocal()}
            className="hidden items-center gap-1.5 rounded-full border-2 border-charcoal/12 px-4 py-2 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-charcoal/70 hover:border-flame hover:text-flame sm:flex"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
          </button>
        </div>

        {/* compact header */}
        <ProfileBanner
          name={displayName}
          email={email}
          joined={joined}
          avatarUrl={avatarPreview || profile?.avatar_url || null}
          stats={[
            { label: "Orders", value: String(orders.length) },
            { label: "Spent", value: money(spent) },
            { label: "Saved", value: String(savedCount) },
          ]}
          onPickAvatar={(file) => {
            setAvatarPreview(URL.createObjectURL(file));
            toast.success("Profile photo updated");
          }}
        />

        {/* tabs */}
        <nav className="scrollbar-none sticky top-0 z-30 -mx-4 mt-5 grid grid-cols-4 gap-2 bg-cream/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:flex sm:flex-wrap sm:px-0 sm:backdrop-blur-none">
          {TABS.map((t) => {
            const active = tab === t.id || (t.id === "orders" && tab === "live");
            const badge =
              t.id === "orders"
                ? String(orders.length)
                : t.id === "saved"
                  ? String(savedCount)
                  : null;
            return (
              <motion.button
                key={t.id}
                type="button"
                data-sfx="pop"
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                onClick={() => setTab(t.id)}
                className={`rounded-full border-2 px-3 py-2 font-display text-[10px] font-extrabold uppercase tracking-[0.12em] transition-colors sm:px-4 sm:text-[11px] sm:tracking-[0.16em] ${
                  active
                    ? "border-flame bg-flame text-cream shadow-[0_10px_22px_-12px_rgba(210,35,31,0.9)]"
                    : "border-charcoal/12 bg-white/60 text-charcoal/65 hover:border-flame hover:text-flame"
                }`}
              >
                {t.label}
                {badge && badge !== "0" && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 font-body text-[10px] ${
                      active ? "bg-cream/20" : "bg-charcoal/10"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="mt-4"
          >
            {tab === "home" && (
              <section className="space-y-5">
                {/* 1 — active order first */}
                {current ? (
                  <article className="rounded-[1.75rem] border-2 border-flame/25 bg-white/80 p-4 shadow-[0_18px_40px_-28px_rgba(210,35,31,0.8)] sm:p-5">
                    <div className="flex items-center gap-3">
                      {current.dish_image && (
                        <img
                          src={current.dish_image}
                          alt={current.dish_name}
                          className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-display text-[10px] font-extrabold uppercase tracking-[0.18em] text-flame">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-flame" />
                          {stageLabel(tracking?.status ?? current.status)}
                        </p>
                        <p className="truncate font-display text-sm font-extrabold uppercase text-charcoal">
                          {current.dish_name}
                        </p>
                        <p className="truncate font-body text-[11px] text-charcoal/55">
                          {current.order_code} · {money(current.total)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-lg font-black text-charcoal">
                          {tracking?.delivered ? "—" : `${tracking?.etaMinutes ?? current.eta_minutes}`}
                        </p>
                        <p className="font-body text-[10px] uppercase tracking-widest text-charcoal/50">
                          min away
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab("live")}
                      className="mt-4 w-full rounded-full bg-flame py-3 font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-cream transition-colors hover:bg-charcoal"
                    >
                      Track order
                    </button>
                  </article>
                ) : (
                  <EmptyState
                    title="No active order"
                    body="Your next grill is one tap away."
                    actionLabel="Browse menu"
                    to="/"
                  />
                )}

                {caddy && (
                  <CaddyCard caddy={caddy} onMessage={() => toast.info("Chat with your rider is coming soon.")} />
                )}

                {/* 2 — quick actions */}
                <div className="grid grid-cols-3 gap-2.5">
                  <QuickAction
                    icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                    label="Addresses"
                    onClick={() => setTab("account")}
                  />
                  <QuickAction
                    icon={<Heart className="h-4 w-4" aria-hidden="true" />}
                    label="Saved"
                    onClick={() => setTab("saved")}
                  />
                  <QuickAction
                    icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
                    label="Payments"
                    onClick={() => setTab("account")}
                  />
                </div>

                {/* 3 — recent orders */}
                <section className="rounded-[1.75rem] border-2 border-charcoal/10 bg-white/60 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-charcoal">
                      Recent orders
                    </h2>
                    {orders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setTab("orders")}
                        className="font-display text-[10px] font-extrabold uppercase tracking-[0.14em] text-flame"
                      >
                        See all
                      </button>
                    )}
                  </div>
                  {orders.length === 0 ? (
                    <p className="mt-3 font-body text-sm text-charcoal/60">
                      Your order history will appear here after your first order.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {orders.slice(0, 3).map((o) => (
                        <OrderRow key={o.id} order={o} />
                      ))}
                    </ul>
                  )}
                </section>

                {/* 4 — lifetime stats, last */}
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  <Stat
                    icon={<Package className="h-4 w-4" aria-hidden="true" />}
                    label="Delivered"
                    value={String(delivered)}
                    hint={`${orders.length - delivered} in progress`}
                  />
                  <Stat
                    icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
                    label="Average order"
                    value={money(avg)}
                    hint={`Lifetime ${money(spent)}`}
                  />
                  <Stat
                    icon={<Heart className="h-4 w-4" aria-hidden="true" />}
                    label="Favourite dish"
                    value={favouriteDish}
                    hint="Ordered most often"
                  />
                  <Stat
                    icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
                    label="Top payment"
                    value={favouritePayment}
                    hint="Your usual method"
                  />
                </div>
              </section>
            )}

            {tab === "live" && (
              <section>
                <button
                  type="button"
                  onClick={() => setTab("home")}
                  className="mb-3 flex items-center gap-1.5 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-charcoal/60 hover:text-flame"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
                </button>
                {current && tracking ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 rounded-[1.75rem] border-2 border-charcoal/10 bg-white/70 p-4 sm:p-5 lg:grid-cols-2">
                      <div>
                        <div className="flex items-center gap-3">
                          {current.dish_image && (
                            <img
                              src={current.dish_image}
                              alt={current.dish_name}
                              className="h-16 w-16 rounded-xl object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-display text-sm font-extrabold uppercase text-charcoal">
                              {current.dish_name}
                            </p>
                            <p className="font-body text-xs text-charcoal/60">
                              {current.order_code} · {current.size} · {current.qty} items ·{" "}
                              {money(current.total)}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 rounded-2xl bg-charcoal/5 px-4 py-3 font-body text-[12px] text-charcoal/65">
                          <MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                          {[address?.street, address?.area, address?.city].filter(Boolean).join(", ") ||
                            "Delivery address saved with your order"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 self-start">
                        <MiniFact
                          icon={<CreditCard className="h-3.5 w-3.5" aria-hidden="true" />}
                          label="Payment"
                          value={paymentLabel(current.payment)}
                        />
                        <MiniFact
                          icon={<Timer className="h-3.5 w-3.5" aria-hidden="true" />}
                          label="ETA"
                          value={tracking.delivered ? "Delivered" : `~${tracking.etaMinutes} min`}
                        />
                        <MiniFact
                          icon={<Bike className="h-3.5 w-3.5" aria-hidden="true" />}
                          label="Rider"
                          value={current.rider?.name ?? "Being assigned"}
                        />
                        <MiniFact
                          icon={<Phone className="h-3.5 w-3.5" aria-hidden="true" />}
                          label="Rider phone"
                          value={current.rider?.phone ?? "—"}
                        />
                      </div>
                    </div>

                    <OrderTracking
                      snapshot={tracking}
                      riderName={current.rider?.name ?? "Rider"}
                      targetLabel={
                        [address?.street, address?.area, address?.city].filter(Boolean).join(", ") ||
                        "Your location"
                      }
                    />
                  </div>
                ) : (
                  <EmptyState
                    title="Nothing to track right now"
                    body="Order something and follow your rider live on the map."
                    actionLabel="Browse menu"
                    to="/"
                  />
                )}
              </section>
            )}

            {tab === "orders" && (
              <section>
                <h2 className="flex items-center gap-2 font-display text-base font-extrabold uppercase tracking-[0.16em] text-charcoal sm:text-lg">
                  <ReceiptText className="h-4 w-4" aria-hidden="true" /> Your orders
                </h2>
                {orders.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      title="No orders yet"
                      body="Once you order, every receipt lands here."
                      actionLabel="Browse menu"
                      to="/"
                    />
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {current && (
                      <li>
                        <button
                          type="button"
                          onClick={() => setTab("live")}
                          className="flex w-full items-center gap-3 rounded-2xl border-2 border-flame/30 bg-flame/5 p-3 text-left"
                        >
                          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-flame" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-display text-xs font-extrabold uppercase text-charcoal">
                              {current.dish_name} — {stageLabel(tracking?.status ?? current.status)}
                            </span>
                            <span className="block font-body text-[11px] text-charcoal/55">
                              Tap to track live
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-flame" aria-hidden="true" />
                        </button>
                      </li>
                    )}
                    {past.map((o) => (
                      <OrderRow key={o.id} order={o} expandable />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {tab === "saved" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <SavedGrid
                  title="Wishlist"
                  icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />}
                  slugs={wishlist.slugs}
                  emptyText="Tap the heart on any dish to save it here."
                  onRemove={wishlist.toggle}
                />
                <SavedGrid
                  title="Liked recipes"
                  icon={<Heart className="h-4 w-4" aria-hidden="true" />}
                  slugs={likes.slugs}
                  emptyText="Like a recipe and find it again in one tap."
                  onRemove={likes.toggle}
                />
              </div>
            )}

            {tab === "account" && (
              <section className="space-y-4">
                {/* account details */}
                <div className="overflow-hidden rounded-[1.5rem] border-2 border-charcoal/10">
                  <div className="grid gap-px bg-charcoal/10 sm:grid-cols-3">
                    <Detail icon={<UserIcon className="h-4 w-4" aria-hidden="true" />} label="Name">
                      {profile?.full_name || displayName}
                    </Detail>
                    <Detail icon={<Phone className="h-4 w-4" aria-hidden="true" />} label="Phone">
                      {profile?.phone || "Added with your first order"}
                    </Detail>
<Detail icon={<Mail className="h-4 w-4" aria-hidden="true" />} label="Email">
                      {email || "—"}
                    </Detail>
                  </div>
                </div>

                {/* addresses */}
                <section className="rounded-[1.75rem] border-2 border-charcoal/10 bg-white/60 p-4 sm:p-5">
                  <h2 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-[0.18em] text-charcoal">
                    <MapPin className="h-4 w-4" aria-hidden="true" /> Delivery addresses
                  </h2>
                  {addressBook.length === 0 ? (
                    <div className="mt-3">
                      <EmptyState
                        title="No saved addresses"
                        body="Add an address so checkout takes one tap."
                        actionLabel="Add an address"
                        to="/cart"
                      />
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {addressBook.map(({ address: a, uses, last }, i) => (
                        <article key={`${a.id}-${i}`} className="rounded-2xl border-2 border-charcoal/10 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-flame/10 px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-[0.18em] text-flame">
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              {a.label || "Address"}
                            </span>
                            {i === 0 && uses > 0 && (
                              <span className="rounded-full bg-charcoal/8 px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-widest text-charcoal/60">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-2 font-display text-sm font-extrabold text-charcoal">{a.name}</p>
                          <p className="mt-1 font-body text-sm leading-relaxed text-charcoal/70">
                            {a.street}
                            {a.area ? `, ${a.area}` : ""}
                            {a.city ? `, ${a.city}` : ""}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 border-t-2 border-dashed border-charcoal/10 pt-3 font-body text-xs text-charcoal/60">
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                              {a.phone || "—"}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5" aria-hidden="true" />
                              {uses} order{uses === 1 ? "" : "s"}
                            </span>
                            {last && <span>Last: {when(last)}</span>}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                {/* payments */}
                <section className="rounded-[1.75rem] border-2 border-charcoal/10 bg-white/60 p-4 sm:p-5">
                  <h2 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-[0.18em] text-charcoal">
                    <Wallet className="h-4 w-4" aria-hidden="true" /> Payment methods
                  </h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {paymentSummary.map((p) => (
                      <div key={p.id} className="rounded-2xl border-2 border-charcoal/10 p-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal/8 px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-[0.18em] text-charcoal/70">
                          <CreditCard className="h-3 w-3" aria-hidden="true" />
                          {p.label}
                        </span>
                        <p className="mt-2 font-display text-xl font-black text-charcoal">{money(p.total)}</p>
                        <p className="mt-1 font-body text-xs text-charcoal/60">
                          {p.count} payment{p.count === 1 ? "" : "s"}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* notifications */}
                <section className="rounded-[1.75rem] border-2 border-charcoal/10 bg-white/60 p-4 sm:p-5">
                  <h2 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-[0.18em] text-charcoal">
                    <Bell className="h-4 w-4" aria-hidden="true" /> Notifications
                  </h2>
                  {notifications.length === 0 ? (
                    <p className="mt-3 font-body text-sm text-charcoal/60">
                      Order updates will appear here.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {notifications.map((n) => (
                        <li key={n.id} className="flex items-start gap-3 rounded-2xl border-2 border-charcoal/10 p-3">
                          <span
                            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                              n.live ? "bg-flame" : "bg-charcoal/25"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-xs font-extrabold uppercase text-charcoal">
                              {n.title}
                            </p>
                            <p className="truncate font-body text-[11px] text-charcoal/55">{n.body}</p>
                          </div>
                          <span className="shrink-0 font-body text-[11px] text-charcoal/45">
                            {new Date(n.at).toLocaleDateString("en-GB")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <SecurityCard verified={isEmailVerified() ?? false} />



                <button
                  type="button"
                  onClick={() => void resetLocal()}
                  className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-charcoal/12 bg-white/70 py-3 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-charcoal/70 hover:border-flame hover:text-flame"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                </button>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

function OrderRow({ order, expandable }: { order: DbOrder; expandable?: boolean }) {
  const [open, setOpen] = useState(false);
  const addr = order.address as AddressWithCoords | null;

  return (
    <li className="overflow-hidden rounded-2xl border-2 border-charcoal/10 bg-white/70">
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        aria-expanded={expandable ? open : undefined}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {order.dish_image && (
          <img
            src={order.dish_image}
            alt={order.dish_name}
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xs font-extrabold uppercase text-charcoal">
            {order.dish_name}
          </p>
          <p className="truncate font-body text-[11px] text-charcoal/55">
            {stageLabel(order.status)} · {new Date(order.created_at).toLocaleDateString("en-GB")}
          </p>
        </div>
        <span className="shrink-0 font-display text-sm font-extrabold text-flame">{money(order.total)}</span>
        {expandable && (
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-charcoal/35 transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>

      {expandable && open && (
        <dl className="mx-3 mb-3 grid gap-2 rounded-2xl bg-charcoal/5 p-3 sm:grid-cols-2">
          {[
            ["Order", order.order_code],
            ["Size", order.size],
            ["Quantity", String(order.qty)],
            ["Payment", paymentLabel(order.payment)],
            ["Rider", order.rider?.name ?? "—"],
            ["Rider phone", order.rider?.phone ?? "—"],
            ["Address", [addr?.street, addr?.area, addr?.city].filter(Boolean).join(", ") || "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-body text-[10px] uppercase tracking-widest text-charcoal/45">{k}</dt>
              <dd className="font-body text-[12px] text-charcoal/80">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  to,
}: {
  title: string;
  body: string;
  actionLabel: string;
  to: "/" | "/cart";
}) {
  return (
    <div className="rounded-[1.75rem] border-2 border-dashed border-charcoal/15 bg-white/50 px-5 py-7 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-flame/10 text-flame">
        <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 font-display text-sm font-extrabold uppercase tracking-[0.14em] text-charcoal">
        {title}
      </p>
      <p className="mt-1 font-body text-sm text-charcoal/60">{body}</p>
      <Link
        to={to}
        className="mt-4 inline-block rounded-full bg-flame px-6 py-2.5 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-cream transition-colors hover:bg-charcoal"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-charcoal/10 bg-white/70 px-2 py-3 font-display text-[10px] font-extrabold uppercase tracking-[0.14em] text-charcoal/70 transition-colors hover:border-flame hover:text-flame"
    >
      <span className="text-flame">{icon}</span>
      {label}
    </button>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-charcoal/10 bg-white/70 p-3.5">
      <span className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-widest text-charcoal/50">
        {icon}
        {label}
      </span>
      <p className="mt-1 truncate font-display text-base font-extrabold uppercase text-charcoal">{value}</p>
      <p className="truncate font-body text-[11px] text-charcoal/45">{hint}</p>
    </div>
  );
}

function MiniFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-charcoal/5 px-3 py-2">
      <span className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-widest text-charcoal/45">
        {icon}
        {label}
      </span>
      <p className="truncate font-display text-xs font-extrabold uppercase text-charcoal">{value}</p>
    </div>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-charcoal px-5 py-4">
      <span className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-widest text-cream/55">
        {icon}
        {label}
      </span>
      <span className="mt-1 block truncate font-display text-sm font-extrabold uppercase text-cream">
        {children}
      </span>
    </div>
  );
}

function SavedGrid({
  title,
  icon,
  slugs,
  emptyText,
  onRemove,
}: {
  title: string;
  icon: React.ReactNode;
  slugs: string[];
  emptyText: string;
  onRemove: (slug: string) => void;
}) {
  const dishes = slugs.map(dishBySlug).filter(Boolean);

  return (
    <section className="rounded-[1.75rem] border-2 border-charcoal/10 bg-white/60 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-[0.18em] text-charcoal">
        {icon}
        {title}
        <span className="ml-auto font-body text-[11px] font-normal text-charcoal/50">{dishes.length}</span>
      </h2>

      {dishes.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="Nothing saved yet" body={emptyText} actionLabel="Explore favourites" to="/" />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {dishes.map((d) => (
            <li key={d!.slug} className="flex items-center gap-3 rounded-2xl bg-charcoal/5 p-2.5">
              <img
                src={d!.image}
                alt={d!.name}
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to="/dish/$slug"
                  params={{ slug: d!.slug }}
                  className="block truncate font-display text-xs font-extrabold uppercase text-charcoal hover:text-flame"
                >
                  {d!.name}
                </Link>
                <span className="font-body text-[11px] text-charcoal/55">{money(d!.price)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  addToCart(d!.slug);
                  toast.success(`${d!.name} added to cart`);
                }}
                className="shrink-0 rounded-full bg-flame px-3 py-1.5 font-display text-[10px] font-extrabold uppercase tracking-[0.14em] text-cream"
              >
                Add
              </button>
              <button
                type="button"
                aria-label={`Remove ${d!.name}`}
                onClick={() => onRemove(d!.slug)}
                className="shrink-0 rounded-full p-1.5 text-charcoal/45 hover:text-flame"
              >
                <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
