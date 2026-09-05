/**
 * React Query mutations for admin/kitchen order desk (Slice I).
 * On success they refresh admin-store from the live Django API.
 */
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  apiAssignRider,
  apiDeleteOrder,
  apiSetOrderEta,
  apiSetOrderNotes,
  apiSetOrderPriority,
  apiSetOrderStatus,
  apiVerifyPayment,
  apiRiderAcceptOrder,
  apiRiderRejectOrder,
  apiRiderCompleteOrder,
  apiSetRiderStatus,
  apiSetRiderLocation,
  type MutationOrderStatus,
  type MutationPaymentStatus,
  type MutationPriority,
} from "@/lib/api/order-mutations";
import { createOrder } from "@/lib/account";
import { syncLiveBackendData, patchOrder, patchCurrentRiderLocation } from "@/lib/admin-store";
import type { Address, PaymentMethod } from "@/lib/orders";

async function afterOrderMutation() {
  await syncLiveBackendData();
}

function mutationErrorMessage(err: unknown, fallback: string) {
  console.error("[Mutation Error]", err);
  if (err && typeof err === "object") {
    const e = err as any;
    if (typeof e.message === "string" && e.message.trim().length > 0) {
      return e.message;
    }
    if (typeof e.detail === "string" && e.detail.trim().length > 0) {
      return e.detail;
    }
  }
  return fallback;
}

export function useSetOrderStatusMutation() {
  return useMutation({
    mutationKey: ["orders", "status"],
    mutationFn: async (input: { id: string; status: MutationOrderStatus; note?: string }) => {
      await apiSetOrderStatus(input.id, input.status, input.note ?? "");
      await afterOrderMutation();
    },
    onError: (err) => toast.error(mutationErrorMessage(err, "Failed to update status")),
  });
}

export function useSetPriorityMutation() {
  return useMutation({
    mutationKey: ["orders", "priority"],
    mutationFn: async (input: { id: string; priority: MutationPriority }) => {
      await apiSetOrderPriority(input.id, input.priority);
      await afterOrderMutation();
    },
    onError: (err) => toast.error(mutationErrorMessage(err, "Failed to update priority")),
  });
}

export function useSetEtaMutation() {
  return useMutation({
    mutationKey: ["orders", "eta"],
    mutationFn: async (input: { id: string; etaMinutes: number }) => {
      await apiSetOrderEta(input.id, input.etaMinutes);
      await afterOrderMutation();
    },
    onError: (err) => toast.error(mutationErrorMessage(err, "Failed to update ETA")),
  });
}

export function useSetOrderNotesMutation() {
  return useMutation({
    mutationKey: ["orders", "notes"],
    mutationFn: async (input: { id: string; notes: string }) => {
      await apiSetOrderNotes(input.id, input.notes);
      await afterOrderMutation();
    },
    onError: (err) => toast.error(mutationErrorMessage(err, "Failed to save note")),
  });
}

export function useAssignRiderMutation() {
  return useMutation({
    mutationKey: ["orders", "assign-rider"],
    mutationFn: async (input: { id: string; riderUserId: number }) => {
      await apiAssignRider(input.id, input.riderUserId);
      await afterOrderMutation();
    },
    onError: (err) => toast.error(mutationErrorMessage(err, "Failed to assign rider")),
  });
}

export function useVerifyPaymentMutation() {
  return useMutation({
    mutationKey: ["orders", "payment"],
    mutationFn: async (input: {
      id: string;
      status: MutationPaymentStatus;
      reference?: string | null;
      amountPaid?: number;
    }) => {
      await apiVerifyPayment(input.id, input);
      await afterOrderMutation();
    },
    onError: (err) => toast.error(mutationErrorMessage(err, "Failed to update payment")),
  });
}

export function useDeleteOrderMutation() {
  return useMutation({
    mutationKey: ["orders", "delete"],
    mutationFn: async (input: { id: string }) => {
      await apiDeleteOrder(input.id);
      await afterOrderMutation();
    },
    onError: (err) => toast.error(mutationErrorMessage(err, "Failed to delete order")),
  });
}

export type CreateOrderMutationInput = {
  payment: PaymentMethod;
  address: Address;
  items?: { dish_slug?: string; dish_id?: number; size: string; qty: number }[];
  dishSlug?: string;
  dishName?: string;
  dishImage?: string;
  size?: string;
  qty?: number;
  total?: number;
};

export function useCreateOrderMutation() {
  return useMutation({
    mutationKey: ["orders", "create"],
    mutationFn: async (input: CreateOrderMutationInput) => {
      const id = await createOrder(input);
      return id;
    },
    onError: (err) => toast.error(mutationErrorMessage(err, "Failed to place order")),
  });
}

export function useRiderAcceptOrderMutation() {
  return useMutation({
    mutationKey: ["rider", "accept"],
    mutationFn: async (input: { orderId: string }) => {
      console.log("[Rider API] Accepting order:", input.orderId);
      await apiRiderAcceptOrder(input.orderId);
      patchOrder(input.orderId, (o) => ({
        ...o,
        acceptedAt: Date.now(),
      }));
      await afterOrderMutation();
    },
    onSuccess: () => {
      toast.success("Order Accepted!", {
        description: "The order is now active in your shift queue.",
      });
    },
    onError: (err) => {
      const msg = mutationErrorMessage(err, "Failed to accept order");
      toast.error("Accept Failed", { description: msg });
    },
  });
}

export function useRiderRejectOrderMutation() {
  return useMutation({
    mutationKey: ["rider", "reject"],
    mutationFn: async (input: { orderId: string; reason: string }) => {
      console.log("[Rider API] Rejecting order:", input.orderId, input.reason);
      await apiRiderRejectOrder(input.orderId, input.reason);
      await afterOrderMutation();
    },
    onSuccess: () => {
      toast.message("Order Declined", {
        description: "The job has been unassigned and returned to dispatch.",
      });
    },
    onError: (err) => {
      const msg = mutationErrorMessage(err, "Failed to reject order");
      toast.error("Decline Failed", { description: msg });
    },
  });
}

export function useRiderCompleteOrderMutation() {
  return useMutation({
    mutationKey: ["rider", "complete"],
    mutationFn: async (input: { orderId: string }) => {
      console.log("[Rider API] Completing order delivery:", input.orderId);
      await apiRiderCompleteOrder(input.orderId);
      await afterOrderMutation();
    },
    onSuccess: () => {
      toast.success("Order Delivered!", {
        description: "Delivery complete and recorded to your daily earnings.",
      });
    },
    onError: (err) => {
      const msg = mutationErrorMessage(err, "Failed to mark order delivered");
      toast.error("Delivery Update Failed", { description: msg });
    },
  });
}

export function useSetRiderStatusMutation() {
  return useMutation({
    mutationKey: ["rider", "status"],
    mutationFn: async (input: { status: "online" | "offline" | "busy" }) => {
      console.log("[Rider API] Updating duty status:", input.status);
      await apiSetRiderStatus(input.status);
      await afterOrderMutation();
    },
    onSuccess: (_, input) => {
      toast.success("Duty Status Updated", {
        description: `Your status is now ${input.status.toUpperCase()}`,
      });
    },
    onError: (err) => {
      const msg = mutationErrorMessage(err, "Failed to update status");
      toast.error("Status Update Failed", { description: msg });
    },
  });
}

export function useSetRiderLocationMutation() {
  return useMutation({
    mutationKey: ["rider", "location"],
    mutationFn: async (input: { location: { lat: number; lng: number } | null }) => {
      console.log("[Rider API] Sharing GPS location:", input.location);
      await apiSetRiderLocation(input.location);
      patchCurrentRiderLocation(input.location);
      await afterOrderMutation();
    },
    onSuccess: (_, input) => {
      if (input.location) {
        toast.success("GPS Location Live", {
          description: `Dispatched lat: ${input.location.lat.toFixed(4)}, lng: ${input.location.lng.toFixed(4)}`,
        });
      } else {
        toast.message("Location Sharing Stopped");
      }
    },
    onError: (err) => {
      const msg = mutationErrorMessage(err, "Failed to share location");
      toast.error("Location Share Failed", { description: msg });
    },
  });
}
