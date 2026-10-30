"use client";
// Long text (e.g. the description written in the admin) shows a few lines with "Read more".
// The full text is always in the page (only visually clipped), so Google still reads all of it.
import { useEffect, useRef, useState } from "react";

export default function ClampedText({ text, lines = 5, className = "" }: { text: string; lines?: number; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setNeedsToggle(open || el.scrollHeight > el.clientHeight + 2);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text, lines, open]);

  return (
    <div>
      <p
        ref={ref}
        className={`whitespace-pre-line ${className}`}
        style={open ? undefined : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {text}
      </p>
      {needsToggle && (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 text-sm font-extrabold text-[#0A7BBF] hover:underline">
          {open ? "Read less ↑" : "Read more ↓"}
        </button>
      )}
    </div>
  );
}
