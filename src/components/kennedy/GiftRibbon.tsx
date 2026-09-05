export type RibbonKind = "hot" | "new" | "demand" | "signature";

const LABELS: Record<RibbonKind, string> = {
  hot: "Hot",
  new: "New",
  demand: "In Demand",
  signature: "Signature",
};

/**
 * A diagonal satin ribbon folded over the top-left corner of the dish photo —
 * it touches both the top and left edge and carries a slow shine sweep.
 */
export function GiftRibbon({ kind }: { kind: RibbonKind }) {
  return (
    <span className="corner-ribbon" data-kind={kind} aria-hidden="true">
      <span className="corner-ribbon__band">
        <span className="corner-ribbon__glow" />
        <span className="corner-ribbon__highlight" />
        <span className="corner-ribbon__sheen" />
        <span className="corner-ribbon__label">{LABELS[kind]}</span>
        <span className="corner-ribbon__shine" />
      </span>
    </span>
  );
}
