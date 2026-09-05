import { useEffect, useMemo, useRef, useState } from "react";
import { Bike, MapPin, Route as RouteIcon, Timer } from "lucide-react";
import { toast } from "sonner";

/** Kennedy Moon Grill, Narowal. */
export const RESTAURANT = { lat: 32.0959, lng: 74.8843, name: "Kennedy Moon Grill" };

const LANDMARKS = [
  { name: "Ghazali Flower School", type: "school", lat: 32.095157, lng: 74.8774099 },
  { name: "Fusion College of Sciences", type: "college", lat: 32.0933766, lng: 74.8701769 },
  { name: "The Heritage College Narowal", type: "college", lat: 32.0933982, lng: 74.8709982 },
  {
    name: "Allama Iqbal Institute of Life Sciences",
    type: "college",
    lat: 32.0923377,
    lng: 74.8720696,
  },
  { name: "Sara Cash & Carry", type: "shop", lat: 32.1055138, lng: 74.8794054 },
  { name: "Anarkali Centre", type: "shop", lat: 32.1009208, lng: 74.8711315 },
  { name: "Al Raheem Market", type: "shop", lat: 32.1017695, lng: 74.8705139 },
] as const;

const COLOR: Record<string, string> = {
  school: "#3b82c4",
  college: "#7b4fc9",
  shop: "#2e9e5b",
};
const LABEL: Record<string, string> = {
  school: "School",
  college: "College",
  shop: "Shop/Market",
};

/** Great-circle distance in km. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const pin = (color: string, glyph: string) =>
  `<div style="position:relative;width:30px;height:38px">
     <div style="position:absolute;inset:0;background:${color};width:30px;height:30px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 6px 14px rgba(20,14,10,.35)"></div>
     <div style="position:absolute;left:0;top:3px;width:30px;text-align:center;font:700 13px/24px system-ui;color:#fff">${glyph}</div>
   </div>`;

export type TrackMapProps = {
  riderName: string;
  /** Customer drop-off coordinates captured at checkout. */
  target?: { lat: number; lng: number } | null;
  /** Human readable delivery address, shown on the target pin. */
  targetLabel?: string;
  /** Simulated ride only starts once the order leaves the kitchen. */
  rideStarted?: boolean;
  /**
   * Externally driven courier position (from `useOrderTracking` / Django).
   * When provided, the map stops running its own rider animation and simply
   * follows this coordinate.
   */
  courier?: { lat: number; lng: number } | null;
};

export function TrackMap({
  riderName,
  target,
  targetLabel = "Delivery target",
  rideStarted = true,
  courier,
}: TrackMapProps) {

  const ref = useRef<HTMLDivElement | null>(null);
  const [eta, setEta] = useState(18);

  // Stabilise coordinates so a new object each render never rebuilds the map.
  const dropLat = target?.lat ?? null;
  const dropLng = target?.lng ?? null;
  const drop = useMemo(
    () => (dropLat != null && dropLng != null ? { lat: dropLat, lng: dropLng } : null),
    [dropLat, dropLng],
  );
  const km = useMemo(() => (drop ? distanceKm(RESTAURANT, drop) : null), [drop]);

  /** External courier control (courier prop present) vs internal animation. */
  const externallyDriven = courier !== undefined;
  const courierRef = useRef(courier);
  courierRef.current = courier;
  const riderRefs = useRef<{ marker: any; line: any } | null>(null);


  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;

    void (async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      const map = L.map(ref.current, { zoomControl: true }).setView(
        [RESTAURANT.lat, RESTAURANT.lng],
        15,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const icon = (color: string, glyph: string) =>
        L.divIcon({ className: "", html: pin(color, glyph), iconSize: [30, 38], iconAnchor: [15, 34] });

      // Restaurant pin
      L.marker([RESTAURANT.lat, RESTAURANT.lng], { icon: icon("#d6331f", "R") })
        .addTo(map)
        .bindPopup(`<b>${RESTAURANT.name}</b><br>Pickup point`);

      L.circle([RESTAURANT.lat, RESTAURANT.lng], {
        radius: 300,
        color: "#d6331f",
        fillColor: "#d6331f",
        fillOpacity: 0.08,
      }).addTo(map);

      LANDMARKS.forEach((p) => {
        const dot = L.divIcon({
          className: "",
          html: `<div style="background:${COLOR[p.type]};width:10px;height:10px;border-radius:50%;border:2px solid #fff;"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        L.marker([p.lat, p.lng], { icon: dot })
          .addTo(map)
          .bindPopup(`<b>${p.name}</b><br>${LABEL[p.type]}`);
      });

      // Delivery target pin + straight-line route
      if (drop) {
        L.marker([drop.lat, drop.lng], { icon: icon("#1f7a4d", "T") })
          .addTo(map)
          .bindPopup(`<b>Target</b><br>${targetLabel}`)
          .openPopup();

        const line = L.polyline(
          [
            [RESTAURANT.lat, RESTAURANT.lng],
            [drop.lat, drop.lng],
          ],
          { color: "#1f7a4d", weight: 3, dashArray: "8, 8" },
        ).addTo(map);
        line.bindTooltip(`${distanceKm(RESTAURANT, drop).toFixed(2)} km to target`, {
          permanent: true,
          direction: "center",
          className: "kennedy-route-label",
        });
        map.fitBounds(line.getBounds().pad(0.4));
      }

      // Externally driven courier (useOrderTracking / Django live location).
      if (externallyDriven && drop) {
        const riderIcon = L.divIcon({
          className: "",
          html: '<div style="background:#e8a93b;width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 2px #d6331f;"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const start = courierRef.current ?? { lat: RESTAURANT.lat, lng: RESTAURANT.lng };
        const riderMarker = L.marker([start.lat, start.lng], { icon: riderIcon })
          .addTo(map)
          .bindPopup(`${riderName} · on the way`);
        const riderLine = L.polyline(
          [
            [start.lat, start.lng],
            [drop.lat, drop.lng],
          ],
          { color: "#d6331f", weight: 3 },
        ).addTo(map);
        if (!courierRef.current) {
          riderMarker.setOpacity(0);
          riderLine.setStyle({ opacity: 0 });
        }
        riderRefs.current = { marker: riderMarker, line: riderLine };

        cleanup = () => {
          riderRefs.current = null;
          map.remove();
        };
        return;
      }

      // Rider simulation only once the ride has actually started.
      if (rideStarted && drop) {
        let riderLat = RESTAURANT.lat;
        let riderLng = RESTAURANT.lng;

        const riderIcon = L.divIcon({
          className: "",
          html: '<div style="background:#e8a93b;width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 2px #d6331f;"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const riderMarker = L.marker([riderLat, riderLng], { icon: riderIcon })
          .addTo(map)
          .bindPopup(`${riderName} · on the way`);
        const riderLine = L.polyline(
          [
            [riderLat, riderLng],
            [drop.lat, drop.lng],
          ],
          { color: "#d6331f", weight: 3 },
        ).addTo(map);

        const totalSteps = 20;
        let step = 0;
        const moveInterval = window.setInterval(() => {
          step += 1;
          const progress = step / totalSteps;
          riderLat = RESTAURANT.lat + (drop.lat - RESTAURANT.lat) * progress;
          riderLng = RESTAURANT.lng + (drop.lng - RESTAURANT.lng) * progress;
          riderMarker.setLatLng([riderLat, riderLng]);
          riderLine.setLatLngs([
            [riderLat, riderLng],
            [drop.lat, drop.lng],
          ]);
          setEta(Math.max(1, Math.round(18 * (1 - progress))));
          if (step >= totalSteps) {
            window.clearInterval(moveInterval);
            riderMarker.bindPopup(`${riderName} has arrived!`).openPopup();
            toast.success("Rider arrived", { description: "Aap ka order darwazay par hai." });
          }
        }, 1500);

        cleanup = () => {
          window.clearInterval(moveInterval);
          map.remove();
        };
        return;
      }

      cleanup = () => map.remove();
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [riderName, drop, targetLabel, rideStarted, externallyDriven]);

  /** Follow the external courier coordinate without rebuilding the map. */
  useEffect(() => {
    const refs = riderRefs.current;
    if (!externallyDriven || !refs || !courier || !drop) return;
    refs.marker.setOpacity(1);
    refs.line.setStyle({ opacity: 1 });
    refs.marker.setLatLng([courier.lat, courier.lng]);
    refs.line.setLatLngs([
      [courier.lat, courier.lng],
      [drop.lat, drop.lng],
    ]);
  }, [courier?.lat, courier?.lng, drop, externallyDriven]);


  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-lux/20">
        <div ref={ref} className="h-64 w-full sm:h-80" />
        <span className="pointer-events-none absolute right-3 top-3 z-[500] rounded-full border border-lux/30 bg-ink/85 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-lux">
          {externallyDriven
            ? courier
              ? "Live · caddy moving"
              : "Waiting for caddy"
            : rideStarted && drop
              ? `ETA ${eta} min`
              : "Waiting for rider"}

        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Stat icon={<MapPin className="h-4 w-4" aria-hidden="true" />} label="From">
          {RESTAURANT.name}
        </Stat>
        <Stat icon={<RouteIcon className="h-4 w-4" aria-hidden="true" />} label="Total length">
          {km !== null ? `${km.toFixed(2)} km to target` : "Target location pending"}
        </Stat>
        <Stat
          icon={
            rideStarted && drop ? (
              <Bike className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Timer className="h-4 w-4" aria-hidden="true" />
            )
          }
          label="Ride"
        >
          {rideStarted && drop ? `${riderName} on the way` : "Waiting for rider to start"}
        </Stat>
      </div>

      {!drop && (
        <p className="text-xs text-slate-dim">
          No customer pin was shared with this order, so the drop marker cannot be placed.
        </p>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line/70 bg-panel/60 px-3.5 py-2.5">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-dim">
        {icon}
        {label}
      </span>
      <span className="mt-0.5 block text-xs font-black uppercase tracking-wide text-frost">
        {children}
      </span>
    </div>
  );
}
