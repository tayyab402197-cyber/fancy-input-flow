import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  DangerButton,
  GhostButton,
  GoldButton,
  Money,
  Panel,
  PaymentBadge,
  StatCard,
  fieldClass,
} from "@/components/admin/bits";
import {
  isMutating,
  money,
  orderStats,
  PAYMENT_LABEL,
  paymentBreakdown,
  revenueSeries,
  timeAgo,
  useAdmin,
  verifyPayment,
  type PaymentStatus,
} from "@/lib/admin-store";

import { readAccount } from "@/lib/auth";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/payments")({
  ssr: false,
  component: Payments,
});

const COLORS = ["var(--color-lux)", "var(--color-jade)", "var(--color-amber-lux)", "var(--color-azure)"];
const tooltipStyle = {
  background: "oklch(0.22 0.02 40)",
  border: "1px solid oklch(0.85 0.15 88 / 0.3)",
  borderRadius: 14,
  color: "oklch(0.947 0.041 87.5)",
  fontSize: 12,
  fontWeight: 700,
};

function Payments() {
  const state = useAdmin();
  const stats = orderStats(state.orders);
  const mix = paymentBreakdown(state.orders);
  const series = revenueSeries(state.orders, 10);
  const [tab, setTab] = useState<PaymentStatus | "all">("pending");
  const [refs, setRefs] = useState<Record<string, string>>({});

  const rows = state.orders
    .filter((o) => (tab === "all" ? true : o.payment.status === tab))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lux/70">Finance</p>
        <h1 className="mt-1 font-hero num-lux text-4xl tracking-wide">Payment records</h1>
        <p className="mt-1 text-sm text-slate-dim">
          Match wallet references, confirm cash and keep the ledger spotless.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Verified revenue" value={money(stats.revenue)} tone="gold" icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Awaiting verification" value={stats.unverified} tone={stats.unverified ? "bad" : "good"} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="Uncollected value" value={money(stats.pending)} hint="Mostly cash on delivery" />
        <StatCard label="Average ticket" value={money(stats.avgOrder)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Collected by method" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ left: -10, right: 8 }}>
                <CartesianGrid stroke="oklch(0.947 0.041 87.5 / 0.08)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "oklch(0.947 0.041 87.5 / 0.45)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "oklch(0.947 0.041 87.5 / 0.45)", fontSize: 11 }} tickLine={false} axisLine={false} width={62} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
                <Bar dataKey="revenue" fill="var(--color-lux)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Method share" subtitle="Orders per payment method">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mix} dataKey="count" nameKey="label" outerRadius={95} stroke="none">
                  {mix.map((m, i) => (
                    <Cell key={m.method} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {mix.map((m, i) => (
              <li key={m.method} className="flex items-center gap-2 text-mist">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {m.label}
                <Money value={m.amount} className="ml-auto text-lux" />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        title="Ledger"
        subtitle="Verify, refund or flag any transaction"
        action={
          <div className="flex flex-wrap gap-1.5">
            {(["pending", "verified", "failed", "refunded", "all"] as (PaymentStatus | "all")[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  tab === t
                    ? "rounded-full border border-lux/50 bg-lux/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-lux"
                    : "rounded-full border border-lux/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-dim hover:text-frost"
                }
              >
                {t}
              </button>
            ))}
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-lux/15 text-[10px] font-black uppercase tracking-[0.16em] text-slate-dim">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lux/10">
              {rows.map((o) => (
                <tr key={o.id} className="transition hover:bg-frost/5">
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/orders/$id"
                      params={{ id: o.id }}
                      className="font-hero num-lux text-base tracking-wide text-frost hover:text-lux"
                    >
                      {o.code}
                    </Link>
                    <p className="text-[11px] text-slate-dim">{timeAgo(o.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-frost">
                    {o.customer.name}
                    <p className="text-[11px] text-slate-dim">{o.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-mist">{PAYMENT_LABEL[o.payment.method]}</td>
                  <td className="px-4 py-3">
                    <input
                      value={refs[o.id] ?? o.payment.reference ?? ""}
                      onChange={(e) => setRefs((prev) => ({ ...prev, [o.id]: e.target.value }))}
                      placeholder="Add reference"
                      className={`${fieldClass} max-w-40 font-mono text-xs`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Money value={o.total} className="text-lux" />
                    <p className="text-[11px] text-slate-dim">paid {money(o.payment.amountPaid)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge status={o.payment.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <GoldButton
                        onClick={async () => {
                          if (await verifyPayment(o.id, {
                            status: "verified",
                            reference: refs[o.id] ?? o.payment.reference,
                          })) {
                            toast.success(`${o.code} payment verified`);
                          }
                        }}
                        disabled={isMutating(`payment:${o.id}`)}
                      >
                        <BadgeCheck className="h-3.5 w-3.5" /> Verify
                      </GoldButton>
                      <GhostButton
                        onClick={async () => {
                          if (await verifyPayment(o.id, { status: "refunded", amountPaid: 0 })) {
                            toast.success("Marked refunded");
                          }
                        }}
                        disabled={isMutating(`payment:${o.id}`)}
                      >
                        Refund
                      </GhostButton>
                      <DangerButton
                        onClick={async () => {
                          if (await verifyPayment(o.id, { status: "failed", amountPaid: 0 })) {
                            toast.success("Marked failed");
                          }
                        }}
                        disabled={isMutating(`payment:${o.id}`)}
                      >
                        Fail
                      </DangerButton>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-dim">
                    Nothing in this bucket.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
