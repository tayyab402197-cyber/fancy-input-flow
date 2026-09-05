/**
 * Pure order mutation API calls (Slice I).
 * No local/optimistic writes — callers sync from the server after success.
 */
import { api, ApiError, isBackendConfigured, tokens } from "@/lib/api/client";
import { ADMIN, ORDERS, RIDER } from "@/lib/api/endpoints";

export type MutationOrderStatus =
  | "pending"
  | "confirmed"
  | "kitchen"
  | "packed"
  | "onway"
  | "delivered"
  | "cancelled";

export type MutationPaymentStatus = "pending" | "verified" | "failed" | "refunded";
export type MutationPriority = "normal" | "rush" | "vip";

function requireBackendAuth() {
  if (!isBackendConfigured()) {
    throw new ApiError(0, "Backend is not configured (VITE_API_BASE_URL).");
  }
  if (!tokens.access()) {
    throw new ApiError(401, "Not authenticated — sign in again.");
  }
}

export async function apiSetOrderStatus(id: string, status: MutationOrderStatus, note = "") {
  requireBackendAuth();
  return api.patch<{ order_code: string; status: string }>(ORDERS.status(id), {
    status,
    note,
  });
}

export async function apiSetOrderPriority(id: string, priority: MutationPriority) {
  requireBackendAuth();
  return api.patch(ORDERS.controls(id), { priority });
}

export async function apiSetOrderEta(id: string, etaMinutes: number) {
  requireBackendAuth();
  return api.patch(ORDERS.controls(id), { eta_minutes: etaMinutes });
}

export async function apiSetOrderNotes(id: string, notes: string) {
  requireBackendAuth();
  return api.patch(ORDERS.controls(id), { internal_notes: notes });
}

export async function apiAssignRider(id: string, riderUserId: number) {
  requireBackendAuth();
  return api.post(ORDERS.assignRider(id), { rider_user_id: riderUserId });
}

export async function apiVerifyPayment(
  id: string,
  input: { status: MutationPaymentStatus; reference?: string | null; amountPaid?: number },
) {
  requireBackendAuth();
  if (input.status === "verified") {
    return api.post(ADMIN.verifyPayment(id), {
      reference: input.reference ?? "",
      amount: input.amountPaid !== undefined ? String(input.amountPaid) : undefined,
    });
  }
  // Django exposes only GET /api/orders/{id}/payment-status/ — non-verified
  // transitions go through the same POST verify-payment endpoint.
  return api.post(ADMIN.verifyPayment(id), {
    payment_status: input.status,
    reference: input.reference ?? "",
  });
}

export async function apiDeleteOrder(id: string) {
  requireBackendAuth();
  return api.delete<{ detail: string; id: number; order_code: string }>(ORDERS.detail(id));
}

export async function apiRiderAcceptOrder(orderId: string) {
  requireBackendAuth();
  return api.patch(ORDERS.status(orderId), { status: "onway" });
}

export async function apiRiderRejectOrder(orderId: string, reason: string) {
  requireBackendAuth();
  return api.post(RIDER.reject(orderId), { reason });
}

export async function apiRiderCompleteOrder(orderId: string) {
  requireBackendAuth();
  return api.patch(ORDERS.status(orderId), { status: "delivered" });
}

export async function apiSetRiderStatus(status: "online" | "offline" | "busy") {
  requireBackendAuth();
  return api.post(RIDER.dutyStatus, { duty_status: status });
}

export async function apiSetRiderLocation(location: { lat: number; lng: number } | null) {
  requireBackendAuth();
  if (location) {
    return api.post(RIDER.locationShare, { lat: location.lat, lng: location.lng });
  } else {
    return api.post(RIDER.locationShare, { lat: null, lng: null });
  }
}
