import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  CheckCircle2,
  Clock,
  Flame,
  MapPin,
  Navigation,
  Package,
  Phone,
  Star,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ensureRiderLocation } from "@/lib/rider-location";
import {
  CHART,
  ColumnChart,
  EmptyRow,
  GaugeChart,
  GhostButton,
  GoldButton,
  Money,
  Panel,
  PaymentBadge,
  PriorityTag,
  SectionTitle,
  StatCard,
  StatusBadge,
  TrendLines,
} from "@/components/admin/bits";
import { TrackMap } from "@/components/kennedy/TrackMap";
import {
  dateTime,
  getActiveRider,
  money,
  PAYMENT_LABEL,
  riderDaySeries,
  riderQueue,
  timeAgo,
  useAdmin,
  type Order,
  type Rider,
} from "@/lib/admin-store";
import {
  useRiderAcceptOrderMutation,
  useRiderCompleteOrderMutation,
  useRiderRejectOrderMutation,
  useSetOrderStatusMutation,
  useSetRiderLocationMutation,
} from "@/hooks/use-order-mutations";

export const Route = createFileRoute("/rider/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Shift — Kennedy Rider Console" },
      {
        name: "description",
        content:
          "Manage your live shift: track today's drops, accept open orders, simulate GPS updates and review real-time route progress.",
      },
      { property: "og:title", content: "My Shift — Kennedy Rider Console" },
      {
        property: "og:description",
        content: "Live shift dashboard for Kennedy Moon Grill delivery partners.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RiderShift,
});

function RiderShift() {
  const state = useAdmin();
  const rider = getActiveRider(state);
  const statusMutation = useSetOrderStatusMutation();
  const completeMutation = useRiderCompleteOrderMutation();

  if (!rider) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lux border-t-transparent" />
        <p className="text-xs uppercase tracking-[0.16em] text-slate-dim">Loading your shift board…</p>
      </div>
    );
  }

  const queue = riderQueue(state, rider.id);
  const week = riderDaySeries(state.orders, rider.id, 7);
  const today = week[week.length - 1]!;
  const activeOrder = queue.active[0] ?? null;
  const cashToDeposit = typeof rider.cashInHand === "number" && rider.cashInHand >= 0
    ? rider.cashInHand
    : queue.completed
        .filter((o) => o.payment.method === "cod")
        .reduce((s, o) => s + o.total, 0);
  const onTime = queue.completed.filter(
    (o) => (o.deliveredAt ?? 0) - o.createdAt <= o.etaMinutes * 60_000 + 5 * 60_000,
  ).length;

  const [simStep, setSimStep] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const locationMutation = useSetRiderLocationMutation();

  const startLat = 32.0959;
  const startLng = 74.8843;
  const destLat = (activeOrder?.address as any)?.lat ? Number((activeOrder?.address as any).lat) : 32.1009;
  const destLng = (activeOrder?.address as any)?.lng ? Number((activeOrder?.address as any).lng) : 74.8711;

  useEffect(() => {
    if (!simulating || !activeOrder) return;
    const interval = setInterval(() => {
      setSimStep((prev) => {
        const next = Math.min(10, prev + 1);
        const ratio = next / 10;
        const lat = startLat + (destLat - startLat) * ratio;
        const lng = startLng + (destLng - startLng) * ratio;
        void locationMutation.mutateAsync({ location: { lat, lng } });
        if (next >= 10) setSimulating(false);
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [simulating, activeOrder]);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow={`${rider.zone} zone`}
        title={`Salam, ${rider.name.split(" ")[0]}`}
        subtitle="Your live shift board — new offers, the running delivery, cash in hand and today's performance."
        action={
          <div className="flex gap-2">
            <Link to="/rider/jobs" className="btn-ghost-lux">
              Open pool ({queue.pool.length})
            </Link>
            <Link to="/rider/profile" className="btn-lux">
              My profile
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Drops today"
          value={today.drops}
          hint={`${queue.completed.length} lifetime`}
          tone="gold"
          icon={<Package className="h-4 w-4" />}
          series={week.map((w) => w.drops)}
        />
        <StatCard
          label="Earnings today"
          value={money(today.earnings)}
          hint={`${money(rider.earnings)} total`}
          tone="good"
          icon={<Wallet className="h-4 w-4" />}
          series={week.map((w) => w.earnings)}
        />
        <StatCard
          label="Cash in hand"
          value={money(cashToDeposit)}
          hint="Deposit at the counter"
          tone="flame"
          icon={<Flame className="h-4 w-4" />}
        />
        <StatCard
          label="Rating"
          value={rider.rating ? rider.rating.toFixed(1) : "—"}
          hint={`${rider.deliveries} deliveries`}
          tone="info"
          icon={<Star className="h-4 w-4" />}
        />
      </div>

      {/* offers */}
      <Panel
        title="Assigned to you"
        subtitle="Dispatch sent these directly — accept to start the run."
      >
        {queue.offered.length === 0 ? (
          <EmptyRow>No new offers. Grab something from the open pool.</EmptyRow>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {queue.offered.map((o) => (
              <OfferCard key={o.id} order={o} rider={rider} />
            ))}
          </ul>
        )}
      </Panel>

      {/* active run */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel
          title="Running delivery"
          subtitle={activeOrder ? `Order ${activeOrder.code}` : "Nothing on the road right now"}
        >
          {!activeOrder ? (
            <EmptyRow>Accept an order to see the live route here.</EmptyRow>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={activeOrder.status} />
                <PaymentBadge status={activeOrder.payment.status} />
                <PriorityTag priority={activeOrder.priority} />
                <span className="ml-auto text-[11px] text-slate-dim">
                  Placed {timeAgo(activeOrder.createdAt)}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-line/70 bg-ink/50 p-4">
                  <p className="eyebrow">Drop to</p>
                  <p className="mt-1 text-sm font-black text-frost">{activeOrder.customer.name}</p>
                  <p className="text-xs text-mist">
                    {activeOrder.address.street}, {activeOrder.address.area}
                  </p>
                  <a
                    href={`tel:${activeOrder.customer.phone.replace(/\s/g, "")}`}
                    className="btn-ghost-lux mt-3"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call customer
                  </a>
                </div>
                <div className="rounded-2xl border border-line/70 bg-ink/50 p-4">
                  <p className="eyebrow">Collect</p>
                  <p className="num-lux mt-1 text-2xl text-lux">{money(activeOrder.total)}</p>
                  <p className="text-xs text-mist">
                    {PAYMENT_LABEL[activeOrder.payment.method]} ·{" "}
                    {activeOrder.payment.status === "verified" ? "already paid" : "collect cash"}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-dim">
                    <Clock className="h-3.5 w-3.5" /> ETA {activeOrder.etaMinutes} min
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-line/70">
                <TrackMap
                  riderName={rider.name}
                  rideStarted
                  target={
                    (activeOrder.address as any)?.lat && (activeOrder.address as any)?.lng
                      ? { lat: Number((activeOrder.address as any).lat), lng: Number((activeOrder.address as any).lng) }
                      : { lat: 32.1009, lng: 74.8711 }
                  }
                  targetLabel={`${activeOrder.address.street || ""}, ${activeOrder.address.area || ""}`}
                  courier={rider.location ? { lat: rider.location.lat, lng: rider.location.lng } : null}
                />
              </div>

              <div className="rounded-xl border border-lux/30 bg-lux/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-lux flex items-center gap-1.5">
                    <Navigation className="h-3.5 w-3.5" /> Local GPS Test Simulator
                  </span>
                  <span className="text-[11px] text-mist">
                    {simulating ? `Driving step ${simStep}/10…` : `Progress ${simStep * 10}%`}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <GhostButton
                    onClick={() => {
                      setSimStep(0);
                      setSimulating(true);
                    }}
                    disabled={simulating}
                    className="text-xs"
                  >
                    {simulating ? "Simulating Drive..." : "Auto-Drive to Customer"}
                  </GhostButton>
                  <GhostButton
                    onClick={() => {
                      const next = Math.min(10, simStep + 2);
                      setSimStep(next);
                      const ratio = next / 10;
                      const lat = startLat + (destLat - startLat) * ratio;
                      const lng = startLng + (destLng - startLng) * ratio;
                      void locationMutation.mutateAsync({ location: { lat, lng } });
                    }}
                    className="text-xs"
                  >
                    Nudge +20% Forward
                  </GhostButton>
                  <GhostButton
                    onClick={() => {
                      setSimStep(0);
                      setSimulating(false);
                      void locationMutation.mutateAsync({ location: { lat: startLat, lng: startLng } });
                    }}
                    className="text-xs"
                  >
                    Reset at Restaurant
                  </GhostButton>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeOrder.status !== "onway" ? (
                  <GhostButton
                    onClick={async () => {
                      const ok = await statusMutation
                        .mutateAsync({ id: activeOrder.id, status: "onway" })
                        .then(() => true)
                        .catch(() => false);
                      if (ok) {
                        toast.success("Marked on the way");
                      }
                    }}
                    disabled={statusMutation.isPending}
                  >
                    <Navigation className="h-3.5 w-3.5" /> Start ride
                  </GhostButton>
                ) : null}
                <GoldButton
                  onClick={() => setConfirmingOrder(activeOrder)}
                  disabled={completeMutation.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark delivered
                </GoldButton>
              </div>
            </div>
          )}
        </Panel>

        {/* Payment & Delivery Handover Confirmation Modal */}
        <Dialog open={Boolean(confirmingOrder)} onOpenChange={(open) => !open && setConfirmingOrder(null)}>
          <DialogContent className="max-w-md bg-ink border-lux/30 text-frost p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-lux flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-lux" /> Confirm Delivery & Payment
              </DialogTitle>
              <DialogDescription className="text-xs text-mist mt-1">
                Please verify cash collection and meal handover before closing order {confirmingOrder?.code}.
              </DialogDescription>
            </DialogHeader>

            {confirmingOrder ? (
              <div className="space-y-4 my-3">
                <div className="rounded-xl border border-line/70 bg-ink/70 p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-dim">Order Code:</span>
                    <span className="font-mono font-bold text-lux">{confirmingOrder.code}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-dim">Customer:</span>
                    <span className="font-bold text-frost">{confirmingOrder.customer.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-dim">Drop Location:</span>
                    <span className="text-mist truncate max-w-[200px]">{confirmingOrder.address.area}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-center">
                  <p className="text-xs text-slate-dim uppercase tracking-wider font-bold">
                    {confirmingOrder.payment.method === "cod" ? "Cash Collection Required" : "Prepaid Order"}
                  </p>
                  <p className="text-2xl font-black text-lux mt-1">
                    {money(confirmingOrder.total)}
                  </p>
                  <p className="text-xs text-mist mt-1">
                    {confirmingOrder.payment.method === "cod"
                      ? "⚡ Have you received the full cash amount from the customer?"
                      : "✓ Order paid online — confirm meal handover."}
                  </p>
                </div>
              </div>
            ) : null}

            <DialogFooter className="flex gap-2 sm:justify-end">
              <GhostButton onClick={() => setConfirmingOrder(null)}>
                Cancel
              </GhostButton>
              <GoldButton
                onClick={async () => {
                  if (!confirmingOrder) return;
                  if (!(await ensureRiderLocation(rider))) return;
                  const targetOrder = confirmingOrder;
                  setConfirmingOrder(null);
                  const ok = await completeMutation
                    .mutateAsync({ orderId: targetOrder.id })
                    .then(() => true)
                    .catch(() => false);
                  if (ok) {
                    toast.success(`Order ${targetOrder.code} delivered! Payment confirmed.`);
                  }
                }}
                disabled={completeMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm Received & Handed Over
              </GoldButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="space-y-4">
          <Panel title="On-time score" subtitle="Deliveries inside the promised ETA">
            <GaugeChart
              value={onTime}
              max={Math.max(1, queue.completed.length)}
              label="On time"
              color={CHART.jade}
            />
          </Panel>
          <Panel title="This week" subtitle="Drops completed per day">
            <TrendLines
              data={week}
              xKey="day"
              height={200}
              lines={[{ key: "drops", name: "Drops", color: CHART.lux }]}
            />
          </Panel>
        </div>
      </div>

      <Panel title="Cash collected" subtitle="Cash-on-delivery totals per day">
        <ColumnChart
          data={week}
          xKey="day"
          moneyFormat
          bars={[{ key: "cash", name: "Cash", color: CHART.amber }]}
        />
      </Panel>

      <Panel title="Recent runs" subtitle="Your last completed deliveries">
        {queue.completed.length === 0 ? (
          <EmptyRow>No completed deliveries yet.</EmptyRow>
        ) : (
          <ul className="divide-y divide-line/50">
            {queue.completed
              .slice()
              .sort((a, b) => (b.deliveredAt ?? 0) - (a.deliveredAt ?? 0))
              .slice(0, 8)
              .map((o) => (
                <li key={o.id} className="row-lux flex flex-wrap items-center gap-3 px-2 py-3">
                  <span className="num-lux text-sm text-lux">{o.code}</span>
                  <span className="text-xs text-mist">{o.customer.name}</span>
                  <span className="text-[11px] text-slate-dim">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {o.address.area}
                  </span>
                  <PaymentBadge status={o.payment.status} />
                  <span className="ml-auto text-[11px] text-slate-dim">
                    {dateTime(o.deliveredAt ?? o.createdAt)}
                  </span>
                  <Money value={o.total} className="text-frost" />
                </li>
              ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function OfferCard({ order, rider }: { order: Order; rider: Rider }) {
  const riderId = rider.id;
  const acceptMutation = useRiderAcceptOrderMutation();
  const rejectMutation = useRiderRejectOrderMutation();

  return (
    <li className="rounded-2xl border border-lux/20 bg-gradient-to-br from-lux/8 to-transparent p-4">
      <div className="flex items-center gap-2">
        <span className="num-lux text-sm text-lux">{order.code}</span>
        <PriorityTag priority={order.priority} />
        <span className="ml-auto text-[11px] text-slate-dim">{timeAgo(order.createdAt)}</span>
      </div>
      <p className="mt-2 text-sm font-black text-frost">{order.customer.name}</p>
      <p className="text-xs text-mist">
        {order.address.street}, {order.address.area}
      </p>
      <p className="mt-2 text-[11px] text-slate-dim">
        {order.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="num-lux text-lg text-frost">{money(order.total)}</span>
        <span className="text-[11px] text-slate-dim">{PAYMENT_LABEL[order.payment.method]}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <GoldButton
          className="flex-1"
          onClick={async () => {
            if (!(await ensureRiderLocation(rider))) return;
            const ok = await acceptMutation
              .mutateAsync({ orderId: order.id })
              .then(() => true)
              .catch(() => false);
            if (ok) {
              toast.success(`Accepted ${order.code}`);
            }
          }}
          disabled={acceptMutation.isPending}
        >
          <Bike className="h-3.5 w-3.5" /> Accept
        </GoldButton>
        <GhostButton
          onClick={async () => {
            const ok = await rejectMutation
              .mutateAsync({ orderId: order.id, reason: "Too far from my zone" })
              .then(() => true)
              .catch(() => false);
            if (ok) {
              toast.message(`Declined ${order.code}`);
            }
          }}
          disabled={rejectMutation.isPending}
        >
          <XCircle className="h-3.5 w-3.5" /> Decline
        </GhostButton>
      </div>
    </li>
  );
}
