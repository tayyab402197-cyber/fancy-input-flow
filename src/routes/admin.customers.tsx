import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Users } from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Bar as MiniBar, LuxSearch, Money, Panel, StatCard } from "@/components/admin/bits";
import { customerRows, money, revenueSeries, timeAgo, useAdmin } from "@/lib/admin-store";

import { readAccount } from "@/lib/auth";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/customers")({
  ssr: false,
  component: Customers,
});

const tooltipStyle = {
  background: "oklch(0.22 0.02 40)",
  border: "1px solid oklch(0.85 0.15 88 / 0.3)",
  borderRadius: 14,
  color: "oklch(0.947 0.041 87.5)",
  fontSize: 12,
  fontWeight: 700,
};

function Customers() {
  const state = useAdmin();
  const [search, setSearch] = useState("");
  const rows = customerRows(state).sort((a, b) => b.spent - a.spent);
  const term = search.trim().toLowerCase();
  const filtered = term
    ? rows.filter((r) =>
        [r.customer.name, r.customer.phone, r.customer.email, r.customer.area]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : rows;
  const topSpend = rows[0]?.spent ?? 1;
  const lifetime = rows.reduce((s, r) => s + r.spent, 0);
  const series = revenueSeries(state.orders, 14);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lux/70">Guests</p>
        <h1 className="mt-1 font-hero num-lux text-4xl tracking-wide">Customers</h1>
        <p className="mt-1 text-sm text-slate-dim">
          Who orders, how often and how much they are worth to the grill.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={rows.length} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Lifetime value" value={money(lifetime)} tone="gold" />
        <StatCard
          label="Gold tier"
          value={rows.filter((r) => r.customer.tier === "gold").length}
          icon={<Crown className="h-4 w-4" />}
        />
        <StatCard
          label="Avg per guest"
          value={money(rows.length ? lifetime / rows.length : 0)}
        />
      </div>

      <Panel title="Order flow" subtitle="Daily orders over the last two weeks">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: -20, right: 8 }}>
              <CartesianGrid stroke="oklch(0.947 0.041 87.5 / 0.08)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "oklch(0.947 0.041 87.5 / 0.45)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "oklch(0.947 0.041 87.5 / 0.45)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="orders" stroke="var(--color-lux)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel
        title="Customer book"
        action={
          <LuxSearch
            value={search}
            onChange={setSearch}
            placeholder="Search guests"
            ariaLabel="Search guests"
            className="w-full sm:w-64"
          />
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-lux/15 text-[10px] font-black uppercase tracking-[0.16em] text-slate-dim">
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Spend</th>
                <th className="px-4 py-3">Share</th>
                <th className="px-4 py-3">Last order</th>
                <th className="px-4 py-3 text-right">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lux/10">
              {filtered.map((r) => (
                <tr key={r.customer.id} className="transition hover:bg-frost/5">
                  <td className="px-4 py-3">
                    <p className="font-bold text-frost">{r.customer.name}</p>
                    <p className="text-[11px] text-slate-dim">{r.customer.phone}</p>
                    <p className="text-[11px] text-slate-dim">{r.customer.email}</p>
                  </td>
                  <td className="px-4 py-3 text-mist">{r.customer.area}</td>
                  <td className="px-4 py-3 text-frost">
                    {r.orders}
                    {r.cancelled ? (
                      <span className="ml-1 text-[11px] text-red-300">({r.cancelled} cancelled)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Money value={r.spent} className="text-lux" />
                  </td>
                  <td className="px-4 py-3 w-40">
                    <MiniBar value={r.spent} max={topSpend} />
                  </td>
                  <td className="px-4 py-3 text-mist">
                    {r.lastOrder ? timeAgo(r.lastOrder) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        r.customer.tier === "gold"
                          ? "rounded-full border border-lux bg-lux/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-lux"
                          : r.customer.tier === "regular"
                            ? "rounded-full border border-amber-lux/50 bg-amber-lux/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-lux"
                            : "rounded-full border border-line/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-mist"
                      }
                    >
                      {r.customer.tier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Link to="/admin/orders" className="inline-flex text-[11px] font-black uppercase tracking-[0.16em] text-lux">
        Back to order desk →
      </Link>
    </div>
  );
}
