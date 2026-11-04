// Simple VidyaVista watermark: white, semi-transparent logo in the middle of a photo.
// The parent must be `relative` and `overflow-hidden`. File: /public/watermark.png
//   <Watermark />                 -> default
//   <Watermark opacity={0.7} />   -> stronger / lighter
// pointer-events-none + select-none so it never blocks clicks on the photo or card.
export default function Watermark({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 flex select-none items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/watermark.png"
        alt=""
        draggable={false}
        className="w-[50%] max-w-[300px]"
        style={{ opacity, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}
      />
    </span>
  );
}
