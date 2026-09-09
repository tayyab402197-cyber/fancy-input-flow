import { motion } from "framer-motion";
import { Flame, MapPin, ShoppingBag } from "lucide-react";

import flowGrill from "@/assets/flow-grill.jpg";
import flowOrder from "@/assets/flow-order.jpg";
import flowRider from "@/assets/flow-rider.jpg";

/**
 * A plain-language walkthrough of how Kennedy Moon Grill actually works.
 * Deliberately not a card grid: a single lit rail of real photos, so the
 * three steps read as one continuous journey.
 */
const STEPS = [
  {
    img: flowOrder,
    icon: ShoppingBag,
    step: "Step 01",
    title: "You pick, we hear it instantly",
    copy: "Choose your dishes, add your address once and pay by cash, card or wallet. The kitchen screen lights up the same second.",
  },
  {
    img: flowGrill,
    icon: Flame,
    step: "Step 02",
    title: "Fired fresh on real charcoal",
    copy: "Nothing sits under a lamp. Your skewers hit the coals only after you order, and the kitchen ticks each stage as it happens.",
  },
  {
    img: flowRider,
    icon: MapPin,
    step: "Step 03",
    title: "A rider you can actually watch",
    copy: "The moment it's boxed, a rider takes it and your map starts moving — with a live time to your gate until the knock.",
  },
];

export function AuthFlowRail() {
  return (
    <div className="flow-rail">
      <p className="flow-rail-eyebrow">How your order runs</p>
      <h2 className="flow-rail-title">
        From your phone to your gate <span className="text-flame">in three moves.</span>
      </h2>

      <ol className="flow-rail-list">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.step}
            className="flow-step"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.14, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="flow-step-media">
              <img src={s.img} alt="" width={816} height={816} loading="lazy" />
              <span className="flow-step-num">{i + 1}</span>
            </span>
            <span className="flow-step-body">
              <span className="flow-step-kicker">
                <s.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {s.step}
              </span>
              <span className="flow-step-title">{s.title}</span>
              <span className="flow-step-copy">{s.copy}</span>
            </span>
          </motion.li>
        ))}
      </ol>

      <p className="flow-rail-note">
        One account covers all of it — guests track orders, kitchen staff run the
        board and riders get their jobs. Sign in and you land on the right screen.
      </p>
    </div>
  );
}
