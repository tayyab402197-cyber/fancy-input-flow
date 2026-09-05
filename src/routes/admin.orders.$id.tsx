import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Bike,
  MapPin,
  Phone,
  Receipt,
  ShieldAlert,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  DangerButton,
  Field,
  GhostButton,
  GoldButton,
  Money,
  Panel,
  PaymentBadge,
  PriorityTag,
  StatusBadge,
  fieldClass,
} from "@/components/admin/bits";
import {
  dateTime,
  money,
  PAYMENT_LABEL,
  STATUS_FLOW,
  STATUS_LABEL,
  timeAgo,
  useAdmin,
  type OrderStatus,
  type Priority,
} from "@/lib/admin-store";
import {
  useAssignRiderMutation,
  useDeleteOrderMutation,
  useSetEtaMutation,
  useSetOrderNotesMutation,
  useSetOrderStatusMutation,
  useSetPriorityMutation,
  useVerifyPaymentMutation,
} from "@/hooks/use-order-mutations";
import { readAccount } from "@/lib/auth";

export const Route = createFileRoute("/admin/orders/$id")({
  ssr: false,
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const state = useAdmin();
  const navigate = useNavigate();
  const account = readAccount();
  const isKitchen = account?.role === "kitchen" || account?.role === "staff";
  const order = state.orders.find((o) => o.id === id);

  const statusMutation = useSetOrderStatusMutation();
  const priorityMutation = useSetPriorityMutation();
  const etaMutation = useSetEtaMutation();
  const notesMutation = useSetOrderNotesMutation();
  const assignMutation = useAssignRiderMutation();
  const paymentMutation = useVerifyPaymentMutation();
  const deleteMutation = useDeleteOrderMutation();

  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [eta, setEtaValue] = useState(order?.etaMinutes ?? 35);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!order) {
    return (
      <div className="rounded-3xl border border-lux/15 bg-panel/60 p-10 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-ruby" />
        <h1 className="mt-3 font-hero num-lux text-2xl">Order not found</h1>
        <p className="mt-1 text-sm text-slate-dim">It may have been deleted from the desk.</p>
        <Link
          to="/admin/orders"
          className="mt-5 inline-flex rounded-full border border-lux/30 px-5 py-2 text-xs font-black uppercase tracking-[0.16em] text-frost"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  const rider = state.riders.find((r) => r.id === order.riderId);
  const stageIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-dim transition hover:text-lux"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Order desk
          </Link>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 font-hero num-lux text-4xl tracking-wide">
            {order.code}
            <StatusBadge status={order.status} />
            <PriorityTag priority={order.priority} />
          </h1>
          <p className="mt-1 text-sm text-slate-dim">
            Placed {dateTime(order.createdAt)} · {timeAgo(order.createdAt)}
          </p>
        </div>
        {!isKitchen && (
          <div className="flex flex-wrap gap-2">
            {confirmDelete ? (
              <>
                <DangerButton
                  onClick={async () => {
                    const ok = await deleteMutation
                      .mutateAsync({ id: order.id })
                      .then(() => true)
                      .catch(() => false);
                    if (ok) {
                      toast.success("Order deleted");
                      void navigate({ to: "/admin/orders" });
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  Delete permanently
                </DangerButton>
                <GhostButton onClick={() => setConfirmDelete(false)}>Keep order</GhostButton>
              </>
            ) : (
              <DangerButton onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete order
              </DangerButton>
            )}
          </div>
        )}
      </header>
 
      {/* stage rail */}
      <Panel title="Journey" subtitle="Tap a stage to move the order there">
        <div className="grid gap-2 sm:grid-cols-6">
          {STATUS_FLOW.map((s, i) => {
            const isCompleted = stageIndex > i && order.status !== "cancelled";
            const isCurrent = stageIndex === i && order.status !== "cancelled";
            const isNextValid = stageIndex >= 0 && i === stageIndex + 1 && order.status !== "cancelled";
            const isDisabled = !isNextValid || statusMutation.isPending;

            let buttonStyle = "rounded-2xl border border-lux/10 bg-panel/30 px-3 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-dim/40 cursor-not-allowed opacity-40";
            if (isCurrent || isCompleted) {
              buttonStyle = "rounded-2xl border border-lux/50 bg-gradient-to-b from-lux/25 to-transparent px-3 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-lux cursor-default";
            } else if (isNextValid) {
              buttonStyle = "rounded-2xl border-2 border-lux bg-lux/20 px-3 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-frost hover:bg-lux/30 transition cursor-pointer shadow-md";
            }

            return (
              <button
                key={s}
                onClick={async () => {
                  if (!isNextValid) return;
                  const ok = await statusMutation
                    .mutateAsync({ id: order.id, status: s })
                    .then(() => true)
                    .catch(() => false);
                  if (ok) toast.success(`Moved to ${STATUS_LABEL[s]}`);
                }}
                disabled={isDisabled}
                className={buttonStyle}
              >
                {STATUS_LABEL[s]}
                {isNextValid ? " →" : isCurrent ? " (Current)" : ""}
              </button>
            );
          })}
          <div className="rounded-2xl border border-red-400/25 px-3 py-3">
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Cancel reason"
              className="w-full bg-transparent text-[11px] font-bold text-frost outline-none placeholder:text-slate-dim"
            />
            <button
              onClick={async () => {
                const ok = await statusMutation
                  .mutateAsync({ id: order.id, status: "cancelled", note: cancelReason || "No reason given" })
                  .then(() => true)
                  .catch(() => false);
                if (ok) {
                  toast.success("Order cancelled");
                }
              }}
              disabled={statusMutation.isPending}
              className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-300"
            >
              Cancel order
            </button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Items" subtitle="Kitchen ticket" bodyClassName="p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-lux/15 text-[10px] font-black uppercase tracking-[0.16em] text-slate-dim">
                  <th className="px-5 py-3">Dish</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3">Qty</th>
                  <th className="px-5 py-3 text-right">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lux/10">
                {order.items.map((it) => (
                  <tr key={`${it.name}-${it.size}`}>
                    <td className="px-5 py-3 font-bold text-frost">{it.name}</td>
                    <td className="px-5 py-3 text-mist">{it.size}</td>
                    <td className="px-5 py-3 text-mist">{it.qty}</td>
                    <td className="px-5 py-3 text-right">
                      <Money value={it.qty * it.price} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="space-y-1.5 border-t border-lux/15 px-5 py-4 text-sm">
              <div className="flex justify-between text-mist">
                <dt>Subtotal</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-mist">
                <dt>Delivery</dt>
                <dd>{money(order.delivery)}</dd>
              </div>
              {order.discount ? (
                <div className="flex justify-between text-emerald-300">
                  <dt>Discount</dt>
                  <dd>−{money(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-lux/10 pt-2 font-hero num-lux text-xl text-lux">
                <dt>Total</dt>
                <dd>{money(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Payment record" subtitle="Verify the transaction before dispatch">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-lux/15 p-4 text-sm">
                <p className="flex justify-between text-mist">
                  <span>Method</span>
                  <span className="font-bold text-frost">{PAYMENT_LABEL[order.payment.method]}</span>
                </p>
                <p className="flex justify-between text-mist">
                  <span>Status</span>
                  <PaymentBadge status={order.payment.status} />
                </p>
                <p className="flex justify-between text-mist">
                  <span>Reference</span>
                  <span className="font-mono text-xs text-frost">
                    {order.payment.reference ?? "—"}
                  </span>
                </p>
                <p className="flex justify-between text-mist">
                  <span>Amount paid</span>
                  <Money value={order.payment.amountPaid} className="text-lux" />
                </p>
                <p className="flex justify-between text-mist">
                  <span>Paid at</span>
                  <span className="text-frost">
                    {order.payment.paidAt ? dateTime(order.payment.paidAt) : "—"}
                  </span>
                </p>
                <p className="flex justify-between text-mist">
                  <span>Verified by</span>
                  <span className="text-frost">{order.payment.verifiedBy ?? "—"}</span>
                </p>
              </div>
              <div className="space-y-3">
                <Field label="Transaction / TID reference">
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={order.payment.reference ?? "e.g. JC908231"}
                    className={fieldClass}
                  />
                </Field>
                {!isKitchen && (
                  <div className="flex flex-wrap gap-2">
                    <GoldButton
                      onClick={async () => {
                        const ok = await paymentMutation
                          .mutateAsync({
                            id: order.id,
                            status: "verified",
                            reference: reference || order.payment.reference,
                          })
                          .then(() => true)
                          .catch(() => false);
                        if (ok) {
                          toast.success("Payment verified");
                        }
                      }}
                      disabled={paymentMutation.isPending}
                    >
                      <BadgeCheck className="h-3.5 w-3.5" /> Mark verified
                    </GoldButton>
                    <GhostButton
                      onClick={async () => {
                        const ok = await paymentMutation
                          .mutateAsync({ id: order.id, status: "pending" })
                          .then(() => true)
                          .catch(() => false);
                        if (ok) {
                          toast.success("Marked unverified");
                        }
                      }}
                      disabled={paymentMutation.isPending}
                    >
                      Unverify
                    </GhostButton>
                    <GhostButton
                      onClick={async () => {
                        const ok = await paymentMutation
                          .mutateAsync({ id: order.id, status: "refunded", amountPaid: 0 })
                          .then(() => true)
                          .catch(() => false);
                        if (ok) {
                          toast.success("Marked refunded");
                        }
                      }}
                      disabled={paymentMutation.isPending}
                    >
                      Refund
                    </GhostButton>
                    <DangerButton
                      onClick={async () => {
                        const ok = await paymentMutation
                          .mutateAsync({ id: order.id, status: "failed", amountPaid: 0 })
                          .then(() => true)
                          .catch(() => false);
                        if (ok) {
                          toast.success("Marked failed");
                        }
                      }}
                      disabled={paymentMutation.isPending}
                    >
                      Failed
                    </DangerButton>
                  </div>
                )}
                <p className="flex items-start gap-2 text-[11px] text-slate-dim">
                  <Receipt className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Cash orders auto-verify the moment the rider marks the order delivered.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Timeline" subtitle="Everything that happened, newest first">
            <ol className="space-y-3">
              {[...order.timeline].reverse().map((ev, i) => (
                <li key={`${ev.at}-${i}`} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lux" />
                  <div>
                    <p className="text-sm font-bold text-frost">{ev.label}</p>
                    <p className="text-[11px] text-slate-dim">
                      {dateTime(ev.at)} · {ev.actor}
                      {ev.note ? ` · ${ev.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 font-bold text-frost">
                <User className="h-4 w-4 text-lux" /> {order.customer.name}
              </p>
              <a
                href={`tel:${order.customer.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 text-mist hover:text-lux"
              >
                <Phone className="h-4 w-4 text-lux" /> {order.customer.phone}
              </a>
              <p className="text-slate-dim">{order.customer.email}</p>
              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-lux/15 p-3 text-mist">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lux" />
                <span>
                  {order.address.street}, {order.address.area}, {order.address.city}
                  {order.address.notes ? (
                    <em className="mt-1 block text-[11px] not-italic text-slate-dim">
                      “{order.address.notes}”
                    </em>
                  ) : null}
                </span>
              </div>
              <Link
                to="/admin/customers"
                className="inline-flex text-[11px] font-black uppercase tracking-[0.16em] text-lux"
              >
                Customer history
              </Link>
            </div>
          </Panel>

          <Panel title="Delivery assignment">
            <Field label="Assigned rider">
              <select
                value={order.riderId ?? ""}
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) {
                    toast.info("Select a valid rider to assign");
                    return;
                  }
                  const ok = await assignMutation
                    .mutateAsync({ id: order.id, riderUserId: Number(val) })
                    .then(() => true)
                    .catch(() => false);
                  if (ok) {
                    toast.success("Rider assigned");
                  }
                }}
                disabled={assignMutation.isPending}
                className={fieldClass}
              >
                <option value="">Unassigned</option>
                {state.riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.zone} · {r.status} {!r.verified ? "(Unverified)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            {rider ? (
              <div className="mt-3 space-y-1.5 rounded-2xl border border-lux/15 p-3 text-sm">
                <p className="flex items-center gap-2 font-bold text-frost">
                  <Bike className="h-4 w-4 text-lux" /> {rider.name}
                </p>
                <p className="text-mist">
                  {rider.bike} · {rider.plate}
                </p>
                <p className="text-mist">{rider.phone}</p>
                <p className="text-slate-dim text-[11px]">
                  {rider.location?.sharing
                    ? `Live location ${rider.location.lat.toFixed(4)}, ${rider.location.lng.toFixed(4)} · ${timeAgo(rider.location.at)}`
                    : "Location sharing off"}
                </p>
                <p className="text-[11px] text-slate-dim">
                  {order.acceptedAt ? `Accepted ${timeAgo(order.acceptedAt)}` : "Not accepted yet"}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-dim">
                No rider yet — pick one above or let a rider claim it in the rider app.
              </p>
            )}
          </Panel>

          {!isKitchen && (
            <Panel title="Controls">
              <div className="space-y-3">
                <Field label="Priority">
                  <select
                    value={order.priority}
                    onChange={async (e) => {
                      const ok = await priorityMutation
                        .mutateAsync({ id: order.id, priority: e.target.value as any })
                        .then(() => true)
                        .catch(() => false);
                      if (ok) {
                        toast.success("Priority updated");
                      }
                    }}
                    disabled={priorityMutation.isPending}
                    className={fieldClass}
                  >
                    {(["normal", "rush", "vip"] as Priority[]).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ETA (minutes)">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={eta}
                      onChange={(e) => setEtaValue(Number(e.target.value))}
                      className={fieldClass}
                    />
                    <GhostButton
                      onClick={async () => {
                        const ok = await etaMutation
                          .mutateAsync({ id: order.id, etaMinutes: eta })
                          .then(() => true)
                          .catch(() => false);
                        if (ok) {
                          toast.success("ETA updated");
                        }
                      }}
                      disabled={etaMutation.isPending}
                    >
                      Save
                    </GhostButton>
                  </div>
                </Field>
                <Field label="Internal note">
                  <textarea
                    value={notes}
                    rows={3}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Kitchen or rider instructions"
                    className={fieldClass}
                  />
                </Field>
                <GoldButton
                  onClick={async () => {
                    const ok = await notesMutation
                      .mutateAsync({ id: order.id, notes })
                      .then(() => true)
                      .catch(() => false);
                    if (ok) {
                      toast.success("Note saved");
                    }
                  }}
                  disabled={notesMutation.isPending}
                >
                  Save note
                </GoldButton>
                <p className="text-[11px] text-slate-dim">
                  Order status: <strong className="text-frost">{STATUS_LABEL[order.status]}</strong> ·
                  rating {order.rating ?? "—"}
                </p>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
