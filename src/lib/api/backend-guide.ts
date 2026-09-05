/**
 * Dev-console onboarding for whoever wires the Django backend.
 * Prints once on boot in development with the exact swap points.
 */
import { API_BASE_URL, AUTH_MODE, isBackendConfigured } from "@/lib/api/client";
import { ADMIN, AUTH, MENU, ORDERS, PROFILE, RIDER } from "@/lib/api/endpoints";

let printed = false;

export function logBackendGuide() {
  if (printed || typeof window === "undefined" || !import.meta.env.DEV) return;
  printed = true;

  const style = "color:#e8a33d;font-weight:700";
  /* eslint-disable no-console */
  console.groupCollapsed("%c🍕 Kennedy Moon Grill — backend integration guide", style);
  console.log(
    isBackendConfigured()
      ? `Django base URL: ${API_BASE_URL} (auth mode: ${AUTH_MODE})`
      : "No VITE_API_BASE_URL set — running on local demo data (localStorage stubs).",
  );
  console.log("Set VITE_API_BASE_URL and VITE_API_AUTH_MODE, then replace these stubs:");
  console.table([
    { screen: "login / signup", stub: "src/lib/auth.ts", endpoint: `${AUTH.login} · ${AUTH.register} · ${AUTH.me}` },
    { screen: "profile", stub: "src/lib/account.ts → fetchProfile/saveProfile", endpoint: PROFILE.detail },
    { screen: "orders + tracking", stub: "src/lib/account.ts → fetchOrders/createOrder", endpoint: `${ORDERS.list} · ${ORDERS.detail("{code}")}` },
    { screen: "menu / menu book", stub: "src/lib/menu.ts → DISHES", endpoint: MENU.dishes },
    { screen: "owner console", stub: "src/lib/admin-store.ts", endpoint: `${ADMIN.orders} · ${ADMIN.stats}` },
    { screen: "rider console", stub: "src/lib/admin-store.ts + rider-location.ts", endpoint: `${RIDER.jobs} · ${RIDER.location}` },
  ]);
  console.log("All HTTP goes through src/lib/api/client.ts — never call fetch() from a component.");
  console.groupEnd();
  /* eslint-enable no-console */
}
