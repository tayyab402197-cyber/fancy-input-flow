import { useEffect, useRef, useState } from "react";

import { updateOrderStatus } from "@/lib/account";
import { api, isBackendConfigured, tokens } from "@/lib/api/client";
import { ORDERS } from "@/lib/api/endpoints";
import type { OrderStatusKey } from "@/lib/orders";
import { simulateTracking, type LatLng, type TrackingSnapshot } from "@/lib/tracking";

type BackendLocation = {
  lat: number;
  lng: number;
  status: OrderStatusKey;
  eta_minutes?: number;
  updated_at?: string;
};

export function useOrderTracking(
  order:
    | {
        id: string;
        order_code: string;
        created_at: string;
        status: OrderStatusKey;
      }
    | null
    | undefined,
  target?: LatLng | null,
  options?: { onStatusChange?: (status: OrderStatusKey) => void },
): TrackingSnapshot | null {
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const lastStatus = useRef<OrderStatusKey | null>(null);
  const onStatusChange = options?.onStatusChange;

  useEffect(() => {
    if (!order) {
      setSnapshot(null);
      lastStatus.current = null;
      return;
    }

    let isMounted = true;

    const tick = async () => {
      let livePos: LatLng | null = null;
      let liveEta: number | undefined;
      let liveStatus: OrderStatusKey = order.status;

      if (isBackendConfigured() && tokens.access() && order.id && !order.id.startsWith("local-")) {
        try {
          const loc = await api.get<BackendLocation | null>(ORDERS.riderLocation(order.id));
          if (loc && loc.lat && loc.lng) {
            livePos = { lat: loc.lat, lng: loc.lng };
            if (loc.status) liveStatus = loc.status;
            if (loc.eta_minutes != null) liveEta = loc.eta_minutes;
          }
        } catch {
          /* ignore network errors */
        }
      }

      if (!isMounted) return;

      const next = simulateTracking({
        orderCode: order.order_code,
        createdAt: order.created_at,
        status: isBackendConfigured() ? liveStatus : liveStatus,
        target: target ?? null,
      });

      if (isBackendConfigured()) {
        next.status = liveStatus;
        next.delivered = liveStatus === "delivered";
      }

      if (livePos) {
        next.courier = livePos;
      }
      if (liveEta != null) {
        next.etaMinutes = liveEta;
      }

      setSnapshot(next);

      if (liveStatus !== lastStatus.current) {
        lastStatus.current = liveStatus;
        onStatusChange?.(liveStatus);
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 3000);
    return () => {
      isMounted = false;
      window.clearInterval(id);
    };
  }, [order?.id, order?.order_code, order?.created_at, order?.status, target?.lat, target?.lng, onStatusChange]);

  return snapshot;
}

