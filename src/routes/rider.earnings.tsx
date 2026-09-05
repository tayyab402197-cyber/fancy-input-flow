import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Coins, TrendingUp, Wallet } from "lucide-react";

import {
  CHART,
  ColumnChart,
  EmptyRow,
  LuxAreaChart,
  Money,
  Panel,
  PaymentBadge,
  SectionTitle,
  SegmentedTabs,
  StatCard,
} from "@/components/admin/bits";
import {
  dateTime,
  getActiveRider,
  money,
  PAYMENT_LABEL,
  riderDaySeries,
  riderQueue,
  useAdmin,
} from "@/lib/admin-store";

export const Route = createFileRoute("/rider/earnings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Earnings & Payout Records — Kennedy Rider Console" },
      {
        name: "description",
        content:
          "Track delivery earnings, cash collected, payout records and per-day performance as a Kennedy delivery partner.",
      },
      { property: "og:title", content: "Earnings — Kennedy Rider Console" },
      {
        property: "og:description",
        content: "Daily earnings graphs, cash-in-hand totals and a full payout ledger.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RiderEarnings,
});

const RANGES = [
  { id: "7", label: "7 days" },
  { id: "14", label: "14 days" },
  { id: "30", label: "30 days" },
] as const;

function RiderEarnings() {
  const state = useAdmin();
  const rider = getActiveRider(state);
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("7");

  const series = useMemo(
    () => (rider ? riderDaySeries(state.orders, rider.id, Number(range)) : []),
    [state.orders, rider, range],
  );
  const queue = rider ? riderQueue(state, rider.id) : null;

  if (!rider || !queue) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lux border-t-transparent" />
        <p className="text-xs uppercase tracking-[0.16em] text-slate-dim">Loading earnings ledger…</p>
      </div>
    );
  }

  const done = queue.completed;
  const cash = done
    .filter((o) => o.payment.method === "cod")
    .reduce((n, o) => n + o.total, 0);
  const fees = done.reduce((n, o) => n + o.delivery, 0);
  const avg = done.length ? fees / done.length : 0;

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Money"
        title="Earnings & payouts"
        subtitle="Everything you have earned, the cash you are carrying, and a permanent record of each delivery payout."
        action={<SegmentedTabs value={range} onChange={setRange} options={RANGES as never} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total earnings"
          value={money(rider.earnings)}
          tone="gold"
          icon={<Wallet className="h-4 w-4" />}
          series={series.map((s) => s.earnings)}
        />
        <StatCard
          label="Delivery fees"
          value={money(fees)}
          hint={`${done.length} completed drops`}
          tone="good"
          icon={<Coins className="h-4 w-4" />}
        />
        <StatCard
          label="Cash collected"
          value={money(cash)}
          hint="Hand over at counter"
          tone="flame"
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Avg fee / drop"
          value={money(avg)}
          tone="info"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Earnings curve" subtitle={`Last ${range} days`}>
          <LuxAreaChart
            data={series}
            xKey="day"
            height={280}
            areas={[{ key: "earnings", name: "Earnings", color: CHART.lux }]}
          />
        </Panel>
        <Panel title="Drops per day" subtitle="Volume rhythm">
          <ColumnChart
            data={series}
            xKey="day"
            height={280}
            bars={[{ key: "drops", name: "Drops", color: CHART.jade }]}
          />
        </Panel>
      </div>

      <Panel title="Payout record" subtitle="Permanent ledger of completed deliveries">
        {done.length === 0 ? (
          <EmptyRow>No completed deliveries yet.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-line/70 text-[10px] uppercase tracking-[0.18em] text-slate-dim">
                  <th className="py-2 pr-4 font-black">Order</th>
                  <th className="py-2 pr-4 font-black">Delivered</th>
                  <th className="py-2 pr-4 font-black">Method</th>
                  <th className="py-2 pr-4 font-black">Payment</th>
                  <th className="py-2 pr-4 text-right font-black">Order total</th>
                  <th className="py-2 text-right font-black">Your fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {done.map((o) => (
                  <tr key={o.id} className="row-lux">
                    <td className="num-lux py-3 pr-4 text-lux">{o.code}</td>
                    <td className="py-3 pr-4 text-mist">{dateTime(o.deliveredAt ?? o.createdAt)}</td>
                    <td className="py-3 pr-4 text-mist">{PAYMENT_LABEL[o.payment.method]}</td>
                    <td className="py-3 pr-4">
                      <PaymentBadge status={o.payment.status} />
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Money value={o.total} className="text-frost" />
                    </td>
                    <td className="py-3 text-right">
                      <Money value={o.delivery} className="text-lux" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
