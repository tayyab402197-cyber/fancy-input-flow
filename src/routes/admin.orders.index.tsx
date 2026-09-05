import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Eye, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  DangerButton,
  Field,
  GhostButton,
  LuxSearch,
  Money,
  Panel,
  PaymentBadge,
  PriorityTag,
  StatusBadge,
  fieldClass,
} from "@/components/admin/bits";
import {
  money,
  PAYMENT_LABEL,
  STATUS_FLOW,
  STATUS_LABEL,
  timeAgo,
  useAdmin,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/admin-store";
import {
  useAssignRiderMutation,
  useDeleteOrderMutation,
  useSetOrderStatusMutation,
} from "@/hooks/use-order-mutations";

const searchSchema = z.object({
  toast: z.string().optional(),
});

export const Route = createFileRoute("/admin/orders/")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: OrdersDesk,
});

const STATUS_OPTIONS: (OrderStatus | "all")[] = ["all", ...STATUS_FLOW, "cancelled"];
const PAY_OPTIONS: (PaymentStatus | "all")[] = ["all", "pending", "verified", "failed", "refunded"];

function OrdersDesk() {
  const { toast: toastParam } = Route.useSearch();
  const statusMutation = useSetOrderStatusMutation();
  const assignMutation = useAssignRiderMutation();
  const deleteMutation = useDeleteOrderMutation();

  useEffect(() => {
    if (toastParam === "admin_only") {
      toast.error("This section is admin-only");
    }
  }, [toastParam]);

  const state = useAdmin();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [pay, setPay] = useState<PaymentStatus | "all">("all");
  const [rider, setRider] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.orders
      .filter((o) => (status === "all" ? true : o.status === status))
      .filter((o) => (pay === "all" ? true : o.payment.status === pay))
      .filter((o) =>
        rider === "all"
          ? true
          : rider === "unassigned"
            ? !o.riderId
            : o.riderId === rider,
      )
      .filter((o) =>
        term
          ? [o.code, o.customer.name, o.customer.phone, o.address.area, o.payment.reference ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(term)
          : true,
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [state.orders, search, status, pay, rider]);

  const totalValue = rows.reduce((s, o) => s + o.total, 0);

  const filtersActive = search.trim() !== "" || status !== "all" || pay !== "all" || rider !== "all";
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setPay("all");
    setRider("all");
  };

  // Two-tap shortcuts for the jobs staff actually do all shift.
  const quickFilters: { key: string; label: string; count: number; active: boolean; apply: () => void }[] = [
    {
      key: "live",
      label: "Live",
      count: state.orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
      active: false,
      apply: clearFilters,
    },
    {
      key: "unassigned",
      label: "Needs rider",
      count: state.orders.filter((o) => !o.riderId && !["delivered", "cancelled"].includes(o.status)).length,
      active: rider === "unassigned",
      apply: () => setRider(rider === "unassigned" ? "all" : "unassigned"),
    },
    {
      key: "unverified",
      label: "To verify",
      count: state.orders.filter((o) => o.payment.status === "pending").length,
      active: pay === "pending",
      apply: () => setPay(pay === "pending" ? "all" : "pending"),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lux/70">
            Order desk
          </p>
          <h1 className="mt-1 font-hero num-lux text-3xl tracking-wide sm:text-4xl">Orders</h1>
          <p className="mt-1 text-sm text-slate-dim">
            {rows.length} order{rows.length === 1 ? "" : "s"} shown · {money(totalValue)} in value
          </p>
        </div>
      </header>

      {/* Quick filters: one tap for the three shifts staff care about */}
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {quickFilters.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={q.apply}
            aria-pressed={q.active}
            className={
              q.active
                ? "inline-flex shrink-0 items-center gap-2 rounded-full border border-lux/60 bg-lux/15 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-lux"
                : "inline-flex shrink-0 items-center gap-2 rounded-full border border-lux/20 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-mist transition hover:border-lux/50 hover:text-frost"
            }
          >
            {q.label}
            <span className="num-lux text-sm">{q.count}</span>
          </button>
        ))}
        {filtersActive ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-transparent px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-dim transition hover:text-ruby"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        ) : null}
      </div>

      <Panel bodyClassName="p-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Field label="Search" className="sm:col-span-2 md:col-span-1">
            <LuxSearch
              value={search}
              onChange={setSearch}
              placeholder="Code, customer, reference"
              ariaLabel="Search orders"
            />
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
              className={fieldClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment">
            <select
              value={pay}
              onChange={(e) => setPay(e.target.value as PaymentStatus | "all")}
              className={fieldClass}
            >
              {PAY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All payments" : p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rider">
            <select value={rider} onChange={(e) => setRider(e.target.value)} className={fieldClass}>
              <option value="all">All riders</option>
              <option value="unassigned">Unassigned</option>
              {state.riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Panel>


      <div className="space-y-3">
        {rows.map((o) => (
          <Panel key={o.id} bodyClassName="p-0">
            <div className="grid gap-4 p-4 lg:grid-cols-[1.15fr_1fr_1.1fr_1.05fr] lg:items-start">
              {/* identity */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Link
                    to="/admin/orders/$id"
                    params={{ id: o.id }}
                    className="font-hero num-lux text-lg tracking-wide text-frost hover:text-lux"
                  >
                    {o.code}
                  </Link>
                  <PriorityTag priority={o.priority} />
                </div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-dim">
                  {timeAgo(o.createdAt)}
                </p>
                <p className="pt-1 text-sm font-bold text-frost">{o.customer.name}</p>
                <p className="text-[11px] text-slate-dim">
                  {o.customer.phone} · {o.address.area}
                </p>
              </div>

              {/* basket */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-dim">
                  Basket · {o.items.reduce((s, it) => s + it.qty, 0)} items
                </p>
                <p className="text-[12px] leading-relaxed text-mist">
                  {o.items.map((it) => `${it.qty}× ${it.name}`).join(" · ")}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Money value={o.total} className="text-lux" />
                  <PaymentBadge status={o.payment.status} />
                </div>
                <p className="text-[11px] text-slate-dim">{PAYMENT_LABEL[o.payment.method]}</p>
              </div>

              {/* controls */}
              <div className="space-y-2">
                <Field label="Status">
                  <select
                    value={o.status}
                    onChange={async (e) => {
                      const next = e.target.value as OrderStatus;
                      const ok = await statusMutation
                        .mutateAsync({ id: o.id, status: next })
                        .then(() => true)
                        .catch(() => false);
                      if (ok) toast.success(`${o.code} → ${STATUS_LABEL[next]}`);
                    }}
                    disabled={statusMutation.isPending && statusMutation.variables?.id === o.id}
                    className={fieldClass}
                  >
                    {[...STATUS_FLOW, "cancelled" as OrderStatus].map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <StatusBadge status={o.status} />
              </div>

              {/* rider + actions */}
              <div className="space-y-2">
                <Field label="Rider">
                  <select
                    value={o.riderId ?? ""}
                    onChange={async (e) => {
                      const riderId = e.target.value || null;
                      if (!riderId) {
                        toast.info("Unassign rider from the order detail page");
                        return;
                      }
                      const ok = await assignMutation
                        .mutateAsync({ id: o.id, riderUserId: Number(riderId) })
                        .then(() => true)
                        .catch(() => false);
                      if (ok) toast.success("Rider assigned");
                    }}
                    disabled={assignMutation.isPending && assignMutation.variables?.id === o.id}
                    className={fieldClass}
                  >
                    <option value="">Unassigned</option>
                    {state.riders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} · {r.zone} {!r.verified ? "(Unverified)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                {o.acceptedAt ? (
                  <p className="text-[11px] text-emerald-300">Accepted {timeAgo(o.acceptedAt)}</p>
                ) : o.riderId ? (
                  <p className="text-[11px] text-lux">Awaiting acceptance</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Link
                    to="/admin/orders/$id"
                    params={{ id: o.id }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-lux/25 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-frost transition hover:border-lux/60"
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </Link>
                  {confirmDelete === o.id ? (
                    <>
                      <DangerButton
                        onClick={async () => {
                          const ok = await deleteMutation
                            .mutateAsync({ id: o.id })
                            .then(() => true)
                            .catch(() => false);
                          if (ok) {
                            setConfirmDelete(null);
                            toast.success(`${o.code} deleted`);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        Confirm
                      </DangerButton>
                      <GhostButton onClick={() => setConfirmDelete(null)}>Cancel</GhostButton>
                    </>
                  ) : (
                    <DangerButton onClick={() => setConfirmDelete(o.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DangerButton>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        ))}
        {rows.length === 0 ? (
          <Panel bodyClassName="p-10 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-lux/50" />
            <p className="mt-3 text-sm font-bold text-frost">
              {filtersActive ? "No orders match these filters" : "No orders yet tonight"}
            </p>
            <p className="mt-1 text-[12px] text-slate-dim">
              {filtersActive
                ? "Try widening the search or clearing the filters."
                : "New tickets appear here the moment a customer checks out."}
            </p>
            {filtersActive ? (
              <div className="mt-4 flex justify-center">
                <GhostButton onClick={clearFilters}>Clear filters</GhostButton>
              </div>
            ) : null}
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
