import { useEffect, useRef } from "react";
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Bike, ClipboardCheck, LayoutDashboard, MapPin, Store, Wallet, IdCard, LogOut, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { ConsoleShell } from "@/components/admin/console-shell";
import { getActiveRider, money, riderQueue, useAdmin } from "@/lib/admin-store";
import { useSetRiderStatusMutation } from "@/hooks/use-order-mutations";
import { apiSetRiderLocation } from "@/lib/api/order-mutations";
import { isBackendConfigured } from "@/lib/api/client";
import { captureRiderLocation } from "@/lib/rider-location";
import { readAccount, signOut, verifyRole, type AuthAccount } from "@/lib/auth";
import { playSfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rider")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Avoid SSR redirect crashes in browserless Nitro runtime
    if (typeof window === "undefined") return;
    const account = readAccount();
    if (!account) {
      throw redirect({
        to: "/login",
        search: { next: location.pathname },
      });
    }
    // Backend-verified role with robust fallback to cached authenticated account
    let role = account.role;
    try {
      const verified = await verifyRole();
      if (verified) role = verified;
    } catch {
      role = account.role;
    }
    // Block customers and redirect to their profile
    if (role === "customer") {
      throw redirect({
        to: "/profile",
      });
    }
    // Kitchen staff redirected to admin orders
    if (role === "kitchen" || role === "staff") {
      throw redirect({
        to: "/admin/orders",
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Rider Console — Kennedy Moon Grill" },
      {
        name: "description",
        content:
          "Delivery partner console: build your rider profile, accept assigned orders, share live location and track earnings for Kennedy Moon Grill.",
      },
      { property: "og:title", content: "Rider Console — Kennedy Moon Grill" },
      {
        property: "og:description",
        content: "Accept orders, share live location and track your delivery earnings.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RiderLayout,
});

const NAV = [
  { to: "/rider", label: "Shift", icon: LayoutDashboard, exact: true },
  { to: "/rider/jobs", label: "Jobs", icon: ClipboardCheck },
  { to: "/rider/earnings", label: "Earnings", icon: Wallet },
  { to: "/rider/profile", label: "Profile", icon: IdCard },
] as const;

function RiderLayout() {
  const account = readAccount();
  const state = useAdmin();
  const statusMutation = useSetRiderStatusMutation();
  const rider = getActiveRider(state);
  const queue = rider ? riderQueue(state, rider.id) : null;

  // Real-world dispatch sound alert: chime + haptic vibrate when an order is newly assigned
  const prevAssignedIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!queue) return;
    const currentActive = [...queue.offered, ...queue.active];
    const currentIds = new Set(currentActive.map((o) => o.id));

    // First mount: snapshot existing orders so we don't alert for past orders
    if (prevAssignedIdsRef.current === null) {
      prevAssignedIdsRef.current = currentIds;
      return;
    }

    // Check if any order was newly added to offered/active
    const newlyAssigned = currentActive.filter((o) => !prevAssignedIdsRef.current!.has(o.id));
    if (newlyAssigned.length > 0) {
      playSfx("orderAlert");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([300, 150, 300, 150, 400]);
        } catch {
          /* ignore vibration error */
        }
      }
      const newest = newlyAssigned[0]!;
      toast.info("🛵 New Order Assigned!", {
        description: `Order #${newest.code} is assigned to you. Tap to view and accept.`,
        duration: 9000,
      });
    }

    prevAssignedIdsRef.current = currentIds;
  }, [queue?.offered, queue?.active]);

  // Auto-dispatch live GPS coordinates to backend/Channels every 12 seconds when online
  useEffect(() => {
    if (!rider || rider.status === "offline") return;
    let isGpsBusy = false;

    const interval = setInterval(() => {
      if (isGpsBusy) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      if (typeof navigator !== "undefined" && "geolocation" in navigator) {
        isGpsBusy = true;
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (isBackendConfigured()) {
              try {
                await apiSetRiderLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              } catch {
                /* silent catch for background location interval */
              } finally {
                isGpsBusy = false;
              }
            } else {
              isGpsBusy = false;
            }
          },
          () => {
            isGpsBusy = false;
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [rider?.id, rider?.status]);

  // If rider account is unapproved / pending approval, show on-theme status card
  if (account?.status === "pending_approval") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-charcoal text-frost">
        <div className="panel-lux max-w-md p-8 text-center border-amber-lux/30 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-lux/10 text-amber-lux border border-amber-lux/30 text-3xl mb-4">
            🛵
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-lux/40 bg-amber-lux/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-lux mb-3">
            <Clock className="h-3.5 w-3.5" /> Application Received
          </span>
          <h2 className="text-xl font-bold text-frost">Pending Admin Approval</h2>
          <p className="mt-2 text-xs text-mist leading-relaxed">
            Welcome, <strong className="text-frost">{account.name}</strong>! Your delivery rider application has been submitted to the Kennedy Moon Grill operations team. Once our dispatcher reviews and activates your account, your full shift board and live order queue will unlock.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/" className="btn-lux w-full text-xs">
              Return to Storefront
            </Link>
            <button
              onClick={() => {
                signOut();
                toast.success("Signed out");
                window.location.href = "/login";
              }}
              className="btn-ghost-lux w-full text-xs text-ruby hover:text-ruby"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConsoleShell
      brand="Moon Grill"
      title="Rider Console"
      nav={NAV}
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-lux/40 bg-lux/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-lux">
          <Bike className="h-3 w-3" /> Delivery partner
        </span>
      }
      sidebar={
        rider ? (
          <div className="panel-lux p-4">
            <p className="text-sm font-black text-frost">{rider.name}</p>
            <p className="text-[11px] text-slate-dim">{rider.zone} zone</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]",
                  rider.status === "online"
                    ? "border-jade/45 bg-jade/12 text-jade"
                    : rider.status === "busy"
                      ? "border-amber-lux/45 bg-amber-lux/12 text-amber-lux"
                      : "border-line text-slate-dim",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {rider.status}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]",
                  rider.verified
                    ? "border-lux/45 bg-lux/10 text-lux"
                    : "border-ruby/45 bg-ruby/10 text-ruby",
                )}
              >
                {rider.verified ? "Verified" : "Unverified"}
              </span>
            </div>
            <button
              onClick={async () => {
                const nextStatus = rider.status === "online" ? "offline" : "online";
                const ok = await statusMutation
                  .mutateAsync({ status: nextStatus })
                  .then(() => true)
                  .catch(() => false);
                if (ok) {
                  toast.success(`Status updated to ${nextStatus}`);
                }
              }}
              disabled={statusMutation.isPending}
              className="btn-ghost-lux mt-3 w-full"
            >
              {rider.status === "online" ? "Go offline" : "Go online"}
            </button>
            <button
              onClick={() => captureRiderLocation(rider.id)}
              className={cn("btn-lux mt-2 w-full", !rider.location?.sharing && "pulse-ring")}
            >
              <MapPin className="h-3.5 w-3.5" /> Share location
            </button>
            {rider.location?.sharing ? (
              <p className="mt-2 text-center text-[10px] text-jade">
                Sharing · {rider.location.lat.toFixed(4)}, {rider.location.lng.toFixed(4)}
              </p>
            ) : (
              <p className="mt-2 text-center text-[10px] text-ruby">
                Location off · required to accept jobs
              </p>
            )}
          </div>
        ) : null
      }
      footer={
        <>
          {queue ? (
            <div className="panel-lux mb-2 p-4 text-xs">
              <p className="eyebrow">Right now</p>
              <p className="mt-2 flex items-center justify-between">
                <span className="text-slate-dim">New offers</span>
                <span className="num-lux text-lg text-lux">{queue.offered.length}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-dim">Active runs</span>
                <span className="num-lux text-lg text-azure">{queue.active.length}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-dim">Open pool</span>
                <span className="num-lux text-lg text-jade">{queue.pool.length}</span>
              </p>
              <p className="mt-2 flex items-center justify-between border-t border-lux/10 pt-2">
                <span className="text-slate-dim">Earnings</span>
                <span className="font-bold text-frost">{money(rider?.earnings ?? 0)}</span>
              </p>
            </div>
          ) : null}
          {account?.role === "admin" && (
            <Link to="/admin" className="btn-ghost-lux w-full">
              Owner console
            </Link>
          )}
          <Link to="/" className="btn-ghost-lux w-full">
            <Store className="h-3.5 w-3.5" /> Storefront
          </Link>
          <button
            onClick={() => {
              signOut();
              toast.success("Signed out");
              window.location.href = "/login";
            }}
            className="btn-ghost-lux w-full text-ruby hover:border-ruby/40 hover:text-ruby"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </>
      }
    >
      <Outlet />
    </ConsoleShell>
  );
}
