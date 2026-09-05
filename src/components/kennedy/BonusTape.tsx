import { Flame, Pizza, Sparkles, Star } from "lucide-react";

type Item = { label: string; Icon: typeof Flame };

const TOP: Item[] = [
  { label: "Today's Bonus · Free Garlic Dip", Icon: Flame },
  { label: "Buy 1 Large Pizza Get 1 Half Price", Icon: Pizza },
  { label: "Malai Boti Platter · Rs 200 Off", Icon: Sparkles },
  { label: "Free Delivery Inside Narowal", Icon: Star },
];

const BOTTOM: Item[] = [
  { label: "Seekh Kebab Combo · Limited Today", Icon: Star },
  { label: "Charcoal Grill Fresh After 6 PM", Icon: Flame },
  { label: "Family Deal · 2 Pizza + 1.5L Drink", Icon: Pizza },
  { label: "Spiciest Pizza in Town · Try It", Icon: Sparkles },
];

function Row({ items, reverse }: { items: Item[]; reverse?: boolean }) {
  // duplicated twice so the -50% translate loop is seamless
  const loop = [...items, ...items];
  return (
    <div className="tape-track" data-reverse={reverse ? "true" : undefined}>
      {[0, 1].map((copy) => (
        <div className="tape-row" key={copy} aria-hidden={copy === 1}>
          {loop.map(({ label, Icon }, i) => (
            <span className="tape-item" key={`${copy}-${i}`}>
              <Icon className="tape-icon" aria-hidden="true" />
              <span>{label}</span>
              <span className="tape-dot" aria-hidden="true" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function BonusTape() {
  return (
    <section
      className="tape-section relative z-20"
      aria-label="Today's bonus offers"
    >
      <div className="tape tape-gold" data-tilt="left">
        <Row items={TOP} />
      </div>
      <div className="tape tape-flame" data-tilt="right">
        <Row items={BOTTOM} reverse />
      </div>
    </section>
  );
}
