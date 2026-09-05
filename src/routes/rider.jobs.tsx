import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Bike, CheckCircle2, MapPin, Package, Search, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ensureRiderLocation, isSharingLocation } from "@/lib/rider-location";
import {
  CHART,
  ColumnChart,
  EmptyRow,
  fieldClass,
  GhostButton,
  GoldButton,
  Money,
  Panel,
  PaymentBadge,
  PriorityTag,
  SectionTitle,
  SegmentedTabs,
  StatusBadge,
} from "@/components/admin/bits";
import {
  dateTime,
  getActiveRider,
  money,
  PAYMENT_LABEL,
  riderDaySeries,
  riderQueue,
  syncLiveBackendData,
  timeAgo,
  useAdmin,
  type Order,
} from "@/lib/admin-store";
import {
  useRiderAcceptOrderMutation,
  useRiderCompleteOrderMutation,
  useRiderRejectOrderMutation,
} from "@/hooks/use-order-mutations";
import { useEffect } from "react";

export const Route = createFileRoute("/rider/jobs")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Delivery Jobs — Kennedy Rider Console" },
      {
        name: "description",
        content:
          "Browse the open delivery pool, accept jobs, review the full order breakdown and close finished runs.",
      },
      { property: "og:title", content: "Delivery Jobs — Kennedy Rider Console" },
      {
        property: "og:description",
        content: "Open pool, assigned offers, active runs and completed deliveries in one board.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RiderJobs,
});

type TabId = "pool" | "offered" | "active" | "done";

function RiderJobs() {
  useEffect(() => {
    void syncLiveBackendData();
  }, []);

  const router = useRouter();
  const state = useAdmin();
  const rider = getActiveRider(state);
  const acceptMutation = useRiderAcceptOrderMutation();
  const rejectMutation = useRiderRejectOrderMutation();
  const completeMutation = useRiderCompleteOrderMutation();
  const [tab, setTab] = useState<TabId>("pool");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Order | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);

  const queue = useMemo(
    () => (rider ? riderQueue(state, rider.id) : null),
    [state, rider],
  );

  if (!rider || !queue) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lux border-t-transparent" />
        <p className="text-xs uppercase tracking-[0.16em] text-slate-dim">Loading delivery jobs…</p>
      </div>
    );
  }

  const lists: Record<TabId, Order[]> = {
    pool: queue.pool,
    offered: queue.offered,
    active: queue.active,
    done: queue.completed,
  };
  const rows = lists[tab].filter((o) =>
    [o.code, o.customer.name, o.address.area].join(" ").toLowerCase().includes(q.toLowerCase()),
  );
  const week = riderDaySeries(state.orders, rider.id, 7);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Dispatch board"
        title="Delivery jobs"
        subtitle="Every job you can take, are running, or have already closed — with the full order breakdown before you accept."
      />

      {!rider.verified && (
        <div className="lux-rise flex flex-wrap items-center gap-3 rounded-2xl border border-amber-lux/40 bg-amber-lux/10 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-lux/20 text-amber-lux">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-lux">
              Account Verification Pending
            </p>
            <p className="text-xs text-mist">
              Your profile is awaiting manager review. Order acceptance will unlock once verified by the restaurant owner.
            </p>
          </div>
        </div>
      )}

      {isSharingLocation(rider) ? null : (
        <div className="lux-rise flex flex-wrap items-center gap-3 rounded-2xl border border-ruby/40 bg-ruby/10 p-4">
          <span className="pulse-ring inline-flex h-9 w-9 items-center justify-center rounded-full bg-ruby/20 text-ruby">
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ruby">
              Location required
            </p>
            <p className="text-xs text-mist">
              Share your live pin before accepting or closing any delivery.
            </p>
          </div>
          <GoldButton className="ml-auto" onClick={() => ensureRiderLocation(rider)}>
            <MapPin className="h-3.5 w-3.5" /> Share location
          </GoldButton>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel
          title="Job list"
          subtitle={`${rows.length} shown`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-dim" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Code, name, area"
                  className={`${fieldClass} pl-8`}
                />
              </div>
            </div>
          }
          bodyClassName="space-y-4"
        >
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            options={[
              { id: "pool", label: "Open pool", count: queue.pool.length },
              { id: "offered", label: "Offered", count: queue.offered.length },
              { id: "active", label: "Running", count: queue.active.length },
              { id: "done", label: "Completed", count: queue.completed.length },
            ]}
          />

          {rows.length === 0 ? (
            <EmptyRow>Nothing here right now.</EmptyRow>
          ) : (
            <ul className="space-y-3">
              {rows.map((o) => (
                <li
                  key={o.id}
                  className="row-lux rounded-2xl border border-line/70 bg-ink/40 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setOpen(o)}
                      className="num-lux text-sm text-lux underline-offset-4 hover:underline"
                    >
                      {o.code}
                    </button>
                    <StatusBadge status={o.status} />
                    <PaymentBadge status={o.payment.status} />
                    <PriorityTag priority={o.priority} />
                    <span className="ml-auto text-[11px] text-slate-dim">
                      {timeAgo(o.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mist">
                    <span className="font-bold text-frost">{o.customer.name}</span>
                    <span>
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {o.address.street}, {o.address.area}
                    </span>
                    <span>
                      <Package className="mr-1 inline h-3 w-3" />
                      {o.items.reduce((n, i) => n + i.qty, 0)} items
                    </span>
                    <span>{PAYMENT_LABEL[o.payment.method]}</span>
                    <Money value={o.total} className="ml-auto text-frost" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tab === "pool" || tab === "offered" ? (
                      <GoldButton
                        onClick={async () => {
                          if (!rider.verified) {
                            toast.error("Fleet verification required before accepting orders.");
                            return;
                          }
                          if (!(await ensureRiderLocation(rider))) return;
                          const ok = await acceptMutation
                            .mutateAsync({ orderId: o.id })
                            .then(() => true)
                            .catch(() => false);
                          if (ok) {
                            toast.success(`Accepted ${o.code}`);
                            void router.navigate({ to: "/rider" });
                          }
                        }}
                        disabled={acceptMutation.isPending || !rider.verified}
                      >
                        <Bike className="h-3.5 w-3.5" /> {rider.verified ? "Accept job" : "Verification Required"}
                      </GoldButton>
                    ) : null}
                    {tab === "offered" ? (
                      <GhostButton
                        onClick={async () => {
                          const ok = await rejectMutation
                            .mutateAsync({ orderId: o.id, reason: "Not available" })
                            .then(() => true)
                            .catch(() => false);
                          if (ok) {
                            toast.message(`Declined ${o.code}`);
                          }
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Decline
                      </GhostButton>
                    ) : null}
                    {tab === "active" ? (
                      <GoldButton
                        onClick={() => setConfirmingOrder(o)}
                        disabled={completeMutation.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark delivered
                      </GoldButton>
                    ) : null}
                    <GhostButton onClick={() => setOpen(o)}>Order details</GhostButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Your week" subtitle="Drops per day">
            <ColumnChart
              data={week}
              xKey="day"
              height={200}
              bars={[{ key: "drops", name: "Drops", color: CHART.lux }]}
            />
          </Panel>
          <Panel title="Order breakdown" subtitle={open ? open.code : "Pick an order"}>
            {!open ? (
              <EmptyRow>Tap an order code to inspect every line item.</EmptyRow>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={open.status} />
                  <PaymentBadge status={open.payment.status} />
                </div>
                <p className="text-slate-dim">Placed {dateTime(open.createdAt)}</p>
                <div className="rounded-2xl border border-line/70 bg-ink/50 p-3">
                  <p className="eyebrow">Customer</p>
                  <p className="mt-1 font-bold text-frost">{open.customer.name}</p>
                  <p className="text-mist">{open.customer.phone}</p>
                  <p className="text-mist">
                    {open.address.street}, {open.address.area}, {open.address.city}
                  </p>
                  {open.address.notes ? (
                    <p className="mt-1 text-lux">Note: {open.address.notes}</p>
                  ) : null}
                </div>
                <ul className="divide-y divide-line/50">
                  {open.items.map((i, idx) => (
                    <li key={idx} className="flex items-center justify-between py-2">
                      <span className="text-mist">
                        {i.qty}× {i.name}{" "}
                        <span className="text-slate-dim">({i.size})</span>
                      </span>
                      <Money value={i.price * i.qty} className="text-frost" />
                    </li>
                  ))}
                </ul>
                <dl className="space-y-1">
                  <Row label="Subtotal" value={money(open.subtotal)} />
                  <Row label="Delivery" value={money(open.delivery)} />
                  <Row label="Discount" value={`- ${money(open.discount)}`} />
                  <Row label="Total" value={money(open.total)} strong />
                </dl>
              </div>
            )}
          </Panel>
        </div>
      </div>

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
                  setTab("done");
                }
              }}
              disabled={completeMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm Received & Handed Over
            </GoldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-dim">{label}</dt>
      <dd className={strong ? "num-lux text-base text-lux" : "font-bold text-frost"}>{value}</dd>
    </div>
  );
}
