/**
 * "Live tracking" panel — one screen with the courier map, progress bar,
 * timeline with real timestamps and the live delivery stats.
 *
 * Pure presentation: every number arrives from a `TrackingSnapshot`
 * (`src/lib/tracking.ts`), so switching to the Django endpoint changes nothing
 * in here. See src/components/profile/README.md for the field mapping.
 */
import { motion } from "framer-motion";
import { Bike, CheckCircle2, Clock, Gauge, MapPin, Route as RouteIcon, Timer } from "lucide-react";

import { TrackMap } from "@/components/kennedy/TrackMap";
import { formatClock, type TrackingSnapshot } from "@/lib/tracking";

type Props = {
  snapshot: TrackingSnapshot;
  riderName: string;
  targetLabel: string;
};

export function OrderTracking({ snapshot, riderName, targetLabel }: Props) {
  const pct = Math.round(snapshot.progress * 100);

  return (
    <div className="space-y-5">
      <div className="rounded-[1.75rem] border-2 border-charcoal/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-charcoal/60">
              Order {snapshot.orderCode}
            </p>
            <h3 className="mt-0.5 font-display text-xl font-extrabold uppercase text-charcoal">
              {snapshot.delivered
                ? "Delivered — enjoy!"
                : (snapshot.stages.find((s) => s.active)?.label ?? "On track")}
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-flame/12 px-3 py-1.5 font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-flame">
            {snapshot.delivered ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flame" aria-hidden="true" />
            )}
            {snapshot.delivered ? "Complete" : `ETA ${snapshot.etaMinutes} min`}
          </span>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-charcoal/10">
          <motion.div
            className="h-full rounded-full bg-flame"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <p className="mt-2 font-body text-[11px] text-charcoal/55">
          {pct}% complete · placed {formatClock(snapshot.placedAt)} · expected by{" "}
          {formatClock(snapshot.etaAt)}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <LiveStat
            icon={<RouteIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Distance left"
            value={`${snapshot.remainingKm.toFixed(2)} km`}
            hint={`of ${snapshot.totalKm.toFixed(2)} km`}
          />
          <LiveStat
            icon={<Timer className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Arriving in"
            value={snapshot.delivered ? "Arrived" : `${snapshot.etaMinutes} min`}
            hint={`by ${formatClock(snapshot.etaAt)}`}
          />
          <LiveStat
            icon={<Gauge className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Caddy speed"
            value={snapshot.speedKmh ? `${snapshot.speedKmh.toFixed(0)} km/h` : "Parked"}
            hint={snapshot.courier ? "Live on the road" : "Still at the grill"}
          />
          <LiveStat
            icon={<Bike className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Route done"
            value={`${Math.round(snapshot.rideProgress * 100)}%`}
            hint={riderName}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
        <div className="rounded-[1.75rem] border-2 border-charcoal/10 bg-white p-4">
          <TrackMap
            riderName={riderName}
            target={snapshot.target}
            targetLabel={targetLabel}
            rideStarted={!!snapshot.courier}
            courier={snapshot.courier}
          />
          {snapshot.targetIsApproximate && (
            <p className="mt-2 font-body text-[11px] text-charcoal/50">
              <MapPin className="mr-1 inline h-3 w-3" aria-hidden="true" />
              Demo drop pin — checkout ke waqt live GPS pin save hoga.
            </p>
          )}
        </div>

        <ol className="space-y-1 rounded-[1.75rem] border-2 border-charcoal/10 bg-white p-5">
          <li className="mb-2 font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-charcoal/60">
            Journey timeline
          </li>
          {snapshot.stages.map((stage, i) => (
            <li key={stage.key} className="flex gap-3">
              <span className="flex flex-col items-center">
                <span
                  className={`mt-1.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                    stage.done ? "bg-flame text-white" : "bg-charcoal/15"
                  } ${stage.active ? "ring-4 ring-flame/20" : ""}`}
                >
                  {stage.done && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                {i < snapshot.stages.length - 1 && (
                  <span
                    className={`my-1 w-0.5 flex-1 ${stage.done ? "bg-flame/40" : "bg-charcoal/10"}`}
                  />
                )}
              </span>
              <span className="pb-3">
                <span
                  className={`flex items-center gap-2 font-display text-xs font-extrabold uppercase ${
                    stage.done ? "text-charcoal" : "text-charcoal/40"
                  }`}
                >
                  {stage.label}
                  {stage.at && (
                    <span className="inline-flex items-center gap-1 font-body text-[10px] font-semibold normal-case tracking-normal text-charcoal/45">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatClock(stage.at)}
                    </span>
                  )}
                </span>
                <span className="block font-body text-[11px] text-charcoal/50">{stage.hint}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function LiveStat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-charcoal/8 bg-cream px-3.5 py-2.5">
      <span className="flex items-center gap-1.5 font-display text-[10px] font-extrabold uppercase tracking-[0.14em] text-charcoal/55">
        {icon}
        {label}
      </span>
      <span className="mt-0.5 block font-display text-base font-extrabold uppercase text-charcoal">
        {value}
      </span>
      {hint && <span className="block font-body text-[10px] text-charcoal/50">{hint}</span>}
    </div>
  );
}
