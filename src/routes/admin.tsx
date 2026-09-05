import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import {
  BarChart3,
  Bike,
  ClipboardList,
  CreditCard,
  Crown,
  LogOut,
  RotateCcw,
  Store,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { ConsoleShell } from "@/components/admin/console-shell";
import { resetDemoData, useAdmin, orderStats } from "@/lib/admin-store";
import { readAccount, signOut, verifyRole, ROLE_HOME } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
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
    // Role is confirmed with the backend with safe fallback to cached role
    let role = account.role;
    try {
      const verified = await verifyRole();
      if (verified) role = verified;
    } catch {
      role = account.role;
    }
    // Block customers and direct them to their profile
    if (role === "customer") {
      throw redirect({
        to: "/profile",
      });
    }
    // Block riders and direct them to the rider console
    if (role === "rider") {
      throw redirect({
        to: "/rider",
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Owner Console — Kennedy Moon Grill" },
      {
        name: "description",
        content:
          "Luxury owner console for Kennedy Moon Grill: live orders, revenue graphs, payment verification, rider assignment and delivery tracking.",
      },
      { property: "og:title", content: "Owner Console — Kennedy Moon Grill" },
      {
        property: "og:description",
        content: "Live orders, revenue graphs, payment verification and rider dispatch.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/riders", label: "Riders", icon: Bike },
  { to: "/admin/customers", label: "Customers", icon: Users },
] as const;

const KITCHEN_NAV = [
  { to: "/admin", label: "Kitchen Shift", icon: BarChart3, exact: true },
  { to: "/admin/orders", label: "Live Orders", icon: ClipboardList },
] as const;

function AdminLayout() {
  const state = useAdmin();
  const stats = orderStats(state.orders);
  const account = readAccount();
  const isKitchen = account?.role === "kitchen" || account?.role === "staff";
  const nav = isKitchen ? KITCHEN_NAV : ADMIN_NAV;

  return (
    <ConsoleShell
      brand="Moon Grill"
      title={isKitchen ? "Kitchen Console" : "Owner Console"}
      nav={nav}
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-lux/40 bg-lux/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-lux">
          <Crown className="h-3 w-3" /> {isKitchen ? "Kitchen staff" : "Full control"}
        </span>
      }
      sidebar={
        <div className="panel-lux p-4 text-xs">
          <p className="eyebrow">Right now</p>
          <p className="mt-2 flex items-center justify-between">
            <span className="text-mist">Live orders</span>
            <span className="num-lux text-lg text-lux">{stats.live}</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-mist">Unassigned</span>
            <span className="num-lux text-lg text-ruby">{stats.unassigned}</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-mist">To verify</span>
            <span className="num-lux text-lg text-amber-lux">{stats.unverified}</span>
          </p>
        </div>
      }
      footer={
        <>
          {!isKitchen && (
            <Link to="/rider" className="btn-ghost-lux w-full">
              <Bike className="h-3.5 w-3.5" /> Rider app
            </Link>
          )}
          <Link to="/" className="btn-ghost-lux w-full">
            <Store className="h-3.5 w-3.5" /> Storefront
          </Link>
          <button
            onClick={() => {
              resetDemoData();
              toast.success("Sample data restored");
            }}
            className="btn-ghost-lux w-full"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset data
          </button>
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
