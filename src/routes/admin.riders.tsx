import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Bike, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, isBackendConfigured, tokens } from "@/lib/api/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  DangerButton,
  Field,
  GhostButton,
  GoldButton,
  Money,
  Panel,
  StatCard,
  fieldClass,
} from "@/components/admin/bits";
import {
  deleteRider,
  money,
  riderLoad,
  saveRider,
  setRiderStatus,
  setRiderVerified,
  settleRiderCash,
  syncLiveBackendData,
  timeAgo,
  useAdmin,
  type Rider,
} from "@/lib/admin-store";

import { readAccount } from "@/lib/auth";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/riders")({
  ssr: false,
  component: Riders,
});

const tooltipStyle = {
  background: "oklch(0.22 0.02 40)",
  border: "1px solid oklch(0.85 0.15 88 / 0.3)",
  borderRadius: 14,
  color: "oklch(0.947 0.041 87.5)",
  fontSize: 12,
  fontWeight: 700,
};

const empty = {
  name: "",
  phone: "",
  email: "",
  bike: "",
  plate: "",
  cnic: "",
  zone: "Narowal",
};

type PendingItem = {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  tier: number;
  cnic?: string;
  vehicle?: string;
  zone?: string;
  joined_at: string;
};

type PendingData = {
  tier1: PendingItem[];
  tier2: PendingItem[];
};

function Riders() {
  const state = useAdmin();
  const loads = riderLoad(state);
  const [form, setForm] = useState<Partial<Rider> & typeof empty>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingData>({ tier1: [], tier2: [] });
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  async function loadPending() {
    if (isBackendConfigured() && tokens.access()) {
      try {
        const res = await api.get<PendingData>("/admin/pending-approvals/");
        if (res && (res.tier1 || res.tier2)) {
          setPending(res);
        }
      } catch {
        /* ignore */
      }
    }
  }

  useEffect(() => {
    void loadPending();
  }, []);

  async function handleApprove(userId: number) {
    try {
      await api.post(`/admin/riders/${userId}/approve/`, {});
      toast.success("Account approved and activated in database!");
      void loadPending();
      void syncLiveBackendData();
    } catch {
      toast.error("Failed to approve account");
    }
  }

  async function handleVerify(userId: number) {
    try {
      await api.post(`/admin/riders/${userId}/fleet-verify/`, { verified: true });
      toast.success("Fleet verification complete in database!");
      void loadPending();
      void syncLiveBackendData();
    } catch {
      toast.error("Failed to verify fleet profile");
    }
  }

  async function handleReject(userId: number) {
    try {
      await api.post(`/admin/riders/${userId}/reject/`, { reason: rejectReason || "Rejected via UI" });
      toast.success("Application rejected and account permanently removed.");
      setRejectTarget(null);
      setRejectReason("");
      void loadPending();
    } catch {
      toast.error("Failed to reject application");
    }
  }

  const online = state.riders.filter((r) => r.status !== "offline").length;
  const chart = loads.map(({ rider, active, delivered }) => ({
    name: (rider.name || "Rider").split(" ")[0] || "Rider",
    active,
    delivered,
  }));
  const fleetScore = state.riders.length
    ? Math.round(
        (state.riders.reduce((s, r) => s + r.rating, 0) / (state.riders.length * 5)) * 100,
      )
    : 0;

  function submit() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    saveRider({ ...form, id: editing ?? undefined });
    toast.success(editing ? "Rider profile updated" : "Rider profile created");
    setForm(empty);
    setEditing(null);
  }

  const totalPending = pending.tier1.length + pending.tier2.length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lux/70">Fleet</p>
        <h1 className="mt-1 font-hero num-lux text-4xl tracking-wide">Delivery riders</h1>
        <p className="mt-1 text-sm text-slate-dim">
          Create profiles, verify documents, watch live locations and see who is carrying the load.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Riders" value={state.riders.length} icon={<Bike className="h-4 w-4" />} />
        <StatCard label="On duty" value={online} tone="good" />
        <StatCard
          label="Verified"
          value={state.riders.filter((r) => r.verified).length}
          tone="gold"
          icon={<BadgeCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Pending Approvals"
          value={totalPending}
          tone={totalPending > 0 ? "good" : "plain"}
          hint="Tier 1 & Tier 2 queue"
          icon={<Star className="h-4 w-4" />}
        />
      </div>

      {totalPending > 0 && (
        <Panel title="Pending Applications Queue" subtitle="Two-tier review — approve account activation or verify fleet credentials directly">
          <div className="space-y-4">
            {pending.tier1.map((item) => (
              <div key={`t1-${item.user_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-lux/30 bg-amber-lux/5 p-4">
                <div>
                  <span className="rounded-full border border-amber-lux/40 bg-amber-lux/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-lux">
                    ⏳ Tier 1 · Account Pending ({item.role})
                  </span>
                  <h3 className="mt-1 text-base font-bold text-frost">{item.full_name || item.username}</h3>
                  <p className="text-xs text-slate-dim">
                    @{item.username} · {item.phone || "No phone"} · {item.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <GoldButton onClick={() => void handleApprove(item.user_id)}>
                    <BadgeCheck className="h-3.5 w-3.5" /> Approve & Activate
                  </GoldButton>
                  {rejectTarget === item.user_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rejection reason..."
                        className="rounded-full border border-ruby/30 bg-charcoal px-3 py-1 text-xs text-frost outline-none"
                      />
                      <DangerButton onClick={() => void handleReject(item.user_id)}>
                        Confirm Reject
                      </DangerButton>
                      <GhostButton onClick={() => setRejectTarget(null)}>Cancel</GhostButton>
                    </div>
                  ) : (
                    <DangerButton onClick={() => setRejectTarget(item.user_id)}>
                      Reject
                    </DangerButton>
                  )}
                </div>
              </div>
            ))}

            {pending.tier2.map((item) => (
              <div key={`t2-${item.user_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-azure/30 bg-azure/5 p-4">
                <div>
                  <span className="rounded-full border border-azure/40 bg-azure/10 px-2 py-0.5 text-[10px] font-bold uppercase text-azure">
                    🔍 Tier 2 · Fleet Verification Pending
                  </span>
                  <h3 className="mt-1 text-base font-bold text-frost">{item.full_name || item.username}</h3>
                  <p className="text-xs text-slate-dim">
                    CNIC: {item.cnic || "—"} · Vehicle: {item.vehicle || "—"} · Zone: {item.zone || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <GoldButton onClick={() => void handleVerify(item.user_id)}>
                    <BadgeCheck className="h-3.5 w-3.5" /> Mark Fleet Verified
                  </GoldButton>
                  {rejectTarget === item.user_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rejection reason..."
                        className="rounded-full border border-ruby/30 bg-charcoal px-3 py-1 text-xs text-frost outline-none"
                      />
                      <DangerButton onClick={() => void handleReject(item.user_id)}>
                        Confirm Reject
                      </DangerButton>
                      <GhostButton onClick={() => setRejectTarget(null)}>Cancel</GhostButton>
                    </div>
                  ) : (
                    <DangerButton onClick={() => setRejectTarget(item.user_id)}>
                      Reject
                    </DangerButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Workload" subtitle="Active jobs vs delivered" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ left: -18, right: 8 }}>
                <CartesianGrid stroke="oklch(0.947 0.041 87.5 / 0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "oklch(0.947 0.041 87.5 / 0.5)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "oklch(0.947 0.041 87.5 / 0.45)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="delivered" fill="var(--color-lux)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="active" fill="var(--color-jade)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Fleet health" subtitle="Share of riders on duty">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={[
                  {
                    name: "On duty",
                    value: state.riders.length ? Math.round((online / state.riders.length) * 100) : 0,
                  },
                ]}
                innerRadius="65%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={20} fill="var(--color-lux)" background={{ fill: "oklch(0.947 0.041 87.5 / 0.08)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center font-hero num-lux text-3xl text-lux">
            {state.riders.length ? Math.round((online / state.riders.length) * 100) : 0}%
          </p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          title={editing ? "Edit rider profile" : "Create rider profile"}
          subtitle="Owner-side onboarding — riders can also self-register in the rider app"
        >
          <div className="space-y-3">
            <Field label="Full name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={fieldClass} />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={fieldClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bike">
                <input value={form.bike} onChange={(e) => setForm({ ...form, bike: e.target.value })} className={fieldClass} />
              </Field>
              <Field label="Plate">
                <input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} className={fieldClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CNIC">
                <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} className={fieldClass} />
              </Field>
              <Field label="Zone">
                <input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} className={fieldClass} />
              </Field>
            </div>
            <div className="flex gap-2">
              <GoldButton onClick={submit}>
                <Plus className="h-3.5 w-3.5" /> {editing ? "Save profile" : "Add rider"}
              </GoldButton>
              {editing ? (
                <GhostButton
                  onClick={() => {
                    setEditing(null);
                    setForm(empty);
                  }}
                >
                  Cancel
                </GhostButton>
              ) : null}
            </div>
          </div>
        </Panel>

        <div className="space-y-4 xl:col-span-2">
          {loads.map(({ rider, active, delivered, revenue }) => (
            <Panel key={rider.id} bodyClassName="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-lux/30 bg-lux/10 font-hero num-lux text-xl text-lux">
                  {(rider.name || "Rider")
                    .split(" ")
                    .map((n) => n[0] || "")
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-48 flex-1">
                  <p className="flex items-center gap-2 font-hero num-lux text-xl tracking-wide text-frost">
                    {rider.name}
                    {rider.verified ? <BadgeCheck className="h-4 w-4 text-emerald-300" /> : null}
                  </p>
                  <p className="text-xs text-slate-dim">
                    {rider.bike} · {rider.plate} · {rider.zone}
                  </p>
                  <p className="text-xs text-slate-dim">
                    {rider.phone} · {rider.email || "no email"}
                  </p>
                  <p className="text-[11px] text-slate-dim">CNIC {rider.cnic || "—"} · joined {timeAgo(rider.joinedAt)}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-dim">
                    <MapPin className="h-3.5 w-3.5 text-lux" />
                    {rider.location?.sharing
                      ? `${rider.location.lat.toFixed(4)}, ${rider.location.lng.toFixed(4)} · ${timeAgo(rider.location.at)}`
                      : "Location sharing off"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="font-hero num-lux text-xl text-ruby">{active}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-dim">Active</p>
                  </div>
                  <div>
                    <p className="font-hero num-lux text-xl text-frost">{delivered}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-dim">Done</p>
                  </div>
                  <div>
                    <p className="font-hero num-lux text-xl text-lux">{rider.rating || "—"}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-dim">Rating</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-lux/10 pt-4">
                <select
                  value={rider.status}
                  onChange={(e) => setRiderStatus(rider.id, e.target.value as Rider["status"])}
                  className="rounded-full border border-lux/20 bg-panel/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-frost"
                >
                  <option value="online">Online</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
                <GhostButton
                  onClick={async () => {
                    const next = !rider.verified;
                    const ok = await setRiderVerified(rider.id, next);
                    if (ok) {
                      toast.success(next ? "Rider verified in database!" : "Verification removed");
                    }
                  }}
                >
                  {rider.verified ? "Unverify" : "Verify rider"}
                </GhostButton>
                {(rider.cashInHand || 0) > 0 && (
                  <GoldButton
                    onClick={async () => {
                      const ok = await settleRiderCash(rider.id);
                      if (ok) {
                        toast.success(`Settled Rs ${rider.cashInHand} cash for ${rider.name}`);
                      }
                    }}
                    className="text-xs"
                  >
                    Settle Cash ({money(rider.cashInHand || 0)})
                  </GoldButton>
                )}
                <GhostButton
                  onClick={() => {
                    setEditing(rider.id);
                    setForm({ ...empty, ...rider });
                  }}
                >
                  Edit profile
                </GhostButton>
                <span className="text-[11px] text-slate-dim">
                  Earnings <Money value={rider.earnings} className="text-lux" /> · Cash in hand{" "}
                  <span className={(rider.cashInHand || 0) > 0 ? "font-bold text-amber-lux" : "text-frost"}>
                    {money(rider.cashInHand || 0)}
                  </span>{" "}
                  · delivered value {money(revenue)}
                </span>
                <div className="ml-auto flex gap-2">
                  {confirm === rider.id ? (
                    <>
                      <DangerButton
                        onClick={() => {
                          deleteRider(rider.id);
                          setConfirm(null);
                          toast.success("Rider removed");
                        }}
                      >
                        Confirm remove
                      </DangerButton>
                      <GhostButton onClick={() => setConfirm(null)}>Keep</GhostButton>
                    </>
                  ) : (
                    <DangerButton onClick={() => setConfirm(rider.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </DangerButton>
                  )}
                </div>
              </div>
            </Panel>
          ))}
          <Link
            to="/rider"
            className="inline-flex text-[11px] font-black uppercase tracking-[0.16em] text-lux"
          >
            Open the rider app →
          </Link>
        </div>
      </div>
    </div>
  );
}
