/**
 * "Your caddy" card — the courier assigned to the customer's live order.
 * Data comes from src/lib/caddy.ts (stub today, Django tomorrow).
 */
import { motion } from "framer-motion";
import { Bike, MessageCircle, Phone, Star, Timer } from "lucide-react";

import { CADDY_STATUS_LABEL, caddyAvatar, type Caddy } from "@/lib/caddy";

type Props = { caddy: Caddy; onMessage?: () => void };

export function CaddyCard({ caddy, onMessage }: Props) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-[1.75rem] border-2 border-charcoal/10 bg-white shadow-[0_18px_44px_-24px_rgba(20,14,10,0.5)]"
    >
      <header className="flex items-center justify-between gap-3 border-b-2 border-charcoal/8 bg-cream px-5 py-3">
        <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-charcoal/70">
          Your caddy
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-flame/12 px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-[0.14em] text-flame">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flame" aria-hidden="true" />
          {CADDY_STATUS_LABEL[caddy.status]}
        </span>
      </header>

      <div className="flex items-center gap-4 px-5 py-5">
        <div className="relative shrink-0">
          <img
            src={caddyAvatar(caddy)}
            alt={caddy.name}
            width={816}
            height={816}
            loading="lazy"
            className="h-20 w-20 rounded-2xl border-2 border-flame object-cover" decoding="async" />
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-charcoal px-2 py-0.5 font-display text-[10px] font-extrabold text-cream">
            {caddy.rating.toFixed(1)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-extrabold uppercase text-charcoal">
            {caddy.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 truncate font-body text-xs text-charcoal/60">
            <Bike className="h-3.5 w-3.5" aria-hidden="true" />
            {caddy.vehicle}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[11px] text-charcoal/55">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-flame text-flame" aria-hidden="true" />
              {caddy.deliveries.toLocaleString("en-PK")} deliveries
            </span>
            {caddy.eta_minutes != null && (
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                {caddy.eta_minutes} min away
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-charcoal/8">
        <a
          href={`tel:${caddy.phone.replace(/\s+/g, "")}`}
          className="flex items-center justify-center gap-2 bg-charcoal px-4 py-3 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-cream transition-colors hover:bg-flame"
        >
          <Phone className="h-3.5 w-3.5" aria-hidden="true" /> Call caddy
        </a>
        <button
          type="button"
          onClick={onMessage}
          className="flex items-center justify-center gap-2 bg-white px-4 py-3 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-charcoal/70 transition-colors hover:text-flame"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> Message
        </button>
      </div>
    </motion.article>
  );
}
