// Diagonal "Featured" ribbon in the top-left corner of a card (put class "vv-ribbon-host" on the card for the hover wiggle + shine).
// The parent must be `relative` and clip its corner (overflow-hidden + rounded corners).
export default function CornerRibbon({ label = "Featured", radius = "1rem" }: { label?: string; radius?: string }) {
  return (
    <span className="vv-corner" style={{ borderTopLeftRadius: radius }}>
      <span className="vv-ribbon">{label}</span>
    </span>
  );
}
