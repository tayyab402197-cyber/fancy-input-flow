import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bike,
  Clock,
  CreditCard,
  Flame,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  Bar as MiniBar,
  CHART,
  CHART_PALETTE,
  ColumnChart,
  DonutChart,
  EmptyRow,
  GaugeChart,
  GhostButton,
  GoldButton,
  Legendette,
  Money,
  Panel,
  PriorityTag,
  RevenueChart,
  SectionTitle,
  StatCard,
  StatusBadge,
  TrendLines,
} from "@/components/admin/bits";
import {
  hourlySeries,
  money,
  orderStats,
  paymentBreakdown,
  revenueSeries,
  riderLoad,
  statusBreakdown,
  timeAgo,
  topDishes,
  useAdmin,
} from "@/lib/admin-store";

import { readAccount } from "@/lib/auth";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const state = useAdmin();
  const stats = orderStats(state.orders);
  const series = revenueSeries(state.orders);
  const hours = hourlySeries(state.orders);
  const statuses = statusBreakdown(state.orders).filter((s) => s.count > 0);
  const payments = paymentBreakdown(state.orders);
  const dishes = topDishes(state.orders).slice(0, 5);
  const loads = riderLoad(state).sort((a, b) => b.active - a.active);
  const queue = state.orders
    .filter((o) => !["delivered", "cancelled"].includes(o.status))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);
  const maxDishRevenue = dishes[0]?.revenue ?? 1;
  const totalOrders = stats.delivered + stats.live;
  const fulfilment = totalOrders ? Math.round((stats.delivered / totalOrders) * 100) : 0;

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Tonight at a glance"
        title="Dashboard"
        subtitle="Every order, rupee and rider in one calm, gold-trimmed view."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/orders">
              <GoldButton>Open order desk</GoldButton>
            </Link>
            <Link to="/admin/payments">
              <GhostButton>Verify payments</GhostButton>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Revenue verified"
          value={money(stats.revenue)}
          hint={`${money(stats.pending)} still to collect`}
          tone="gold"
          icon={<Wallet className="h-4 w-4" />}
          series={series.map((s) => s.revenue)}
        />
        <StatCard
          label="Live orders"
          value={stats.live}
          hint={`${stats.unassigned} waiting for a rider`}
          tone="flame"
          icon={<Flame className="h-4 w-4" />}
          series={series.map((s) => s.orders)}
        />
        <StatCard
          label="Delivered"
          value={stats.delivered}
          hint={`${stats.cancelled} cancelled all-time`}
          tone="good"
          icon={<BadgeCheck className="h-4 w-4" />}
          series={series.map((s) => s.delivered ?? 0)}
        />
        <StatCard
          label="Average ticket"
          value={money(stats.avgOrder)}
          hint={`${stats.todayOrders} orders today · ${money(stats.todayRevenue)}`}
          tone="info"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Revenue · last 14 days"
          subtitle="Champagne area is money, blue is order count"
          className="xl:col-span-2"
        >
          <RevenueChart data={series} height={300} />
        </Panel>

        <Panel title="Order pipeline" subtitle="Where every ticket sits right now">
          <DonutChart
            data={statuses.map((s, i) => ({
              name: s.label,
              value: s.count,
              color: CHART_PALETTE[i % CHART_PALETTE.length]!,
            }))}
            centerLabel="Tickets"
            centerValue={String(statuses.reduce((n, s) => n + s.count, 0))}
            height={210}
          />
          <div className="mt-3">
            <Legendette
              items={statuses.map((s, i) => ({
                name: s.label,
                value: String(s.count),
                color: CHART_PALETTE[i % CHART_PALETTE.length]!,
              }))}
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Busy hours" subtitle="Orders by kitchen slot">
          <ColumnChart
            data={hours}
            xKey="hour"
            height={230}
            bars={[{ key: "orders", name: "Orders", color: CHART.amber }]}
          />
        </Panel>

        <Panel title="Payment mix" subtitle="Value collected per method">
          <ColumnChart
            data={payments}
            xKey="label"
            height={230}
            moneyFormat
            bars={[{ key: "amount", name: "Collected", color: CHART.jade }]}
          />
        </Panel>

        <Panel title="Delivery pace" subtitle="Orders placed vs delivered">
          <TrendLines
            data={series}
            xKey="day"
            height={230}
            lines={[
              { key: "orders", name: "Placed", color: CHART.lux },
              { key: "delivered", name: "Delivered", color: CHART.jade },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Live queue"
          subtitle="Newest tickets first"
          className="xl:col-span-2"
          action={
            <Link
              to="/admin/orders"
              className="eyebrow text-lux underline-offset-4 hover:underline"
            >
              See all
            </Link>
          }
          bodyClassName="p-2"
        >
          <div className="divide-y divide-line/50">
            {queue.map((o) => {
              const rider = state.riders.find((r) => r.id === o.riderId);
              return (
                <Link
                  key={o.id}
                  to="/admin/orders/$id"
                  params={{ id: o.id }}
                  className="row-lux flex flex-wrap items-center gap-3 rounded-xl px-3 py-3"
                >
                  <div className="min-w-32">
                    <p className="num-lux text-sm text-lux">{o.code}</p>
                    <p className="text-[11px] text-slate-dim">{timeAgo(o.createdAt)}</p>
                  </div>
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-bold text-frost">{o.customer.name}</p>
                    <p className="text-[11px] text-slate-dim">
                      {o.items.length} item{o.items.length > 1 ? "s" : ""} · {o.address.area}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                  <PriorityTag priority={o.priority} />
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-mist">
                    <Bike className="h-3.5 w-3.5" />
                    {rider?.name ?? "Unassigned"}
                  </span>
                  <Money value={o.total} className="ml-auto text-lux" />
                </Link>
              );
            })}
            {queue.length === 0 ? <EmptyRow>Kitchen is clear.</EmptyRow> : null}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Fulfilment rate" subtitle="Delivered share of all tickets">
            <GaugeChart value={fulfilment} max={100} label="Delivered" />
          </Panel>

          <Panel title="Best sellers" subtitle="By revenue">
            <ul className="space-y-3">
              {dishes.map((d) => (
                <li key={d.name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs font-bold">
                    <span className="text-frost">{d.name}</span>
                    <Money value={d.revenue} className="text-lux" />
                  </div>
                  <MiniBar value={d.revenue} max={maxDishRevenue} />
                  <p className="text-[11px] text-slate-dim">{d.qty} sold</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Rider load"
            subtitle="Active jobs per rider"
            action={
              <Link to="/admin/riders" className="eyebrow text-lux hover:underline">
                Manage
              </Link>
            }
          >
            <ul className="space-y-3">
              {loads.map(({ rider, active, delivered }) => (
                <li key={rider.id} className="flex items-center gap-3">
                  <span
                    className={
                      rider.status === "online"
                        ? "h-2 w-2 rounded-full bg-jade"
                        : rider.status === "busy"
                          ? "h-2 w-2 rounded-full bg-lux"
                          : "h-2 w-2 rounded-full bg-slate-dim/50"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-frost">{rider.name}</p>
                    <p className="text-[11px] text-slate-dim">
                      {rider.zone} · {delivered} delivered
                    </p>
                  </div>
                  <span className="num-lux text-base text-lux">{active}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Avg rating"
              value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
              tone="info"
              icon={<Star className="h-4 w-4" />}
            />
            <StatCard
              label="To verify"
              value={stats.unverified}
              tone={stats.unverified ? "bad" : "good"}
              icon={<CreditCard className="h-4 w-4" />}
            />
          </div>
          <StatCard
            label="Promised ETA"
            value="35 min"
            hint="Average across live orders"
            icon={<Clock className="h-4 w-4" />}
          />
        </div>
      </div>
    </div>
  );
}
