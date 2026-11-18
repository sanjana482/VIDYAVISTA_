"use client";

import { useEffect, useRef, useState } from "react";

type ListingDescriptionProps = {
  description: string;
  maxLength?: number;
};

export default function ListingDescription({
  description,
  maxLength = 220,
}: ListingDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    if (description && description.length > maxLength) {
      setHasOverflow(true);
    }
  }, [description, maxLength]);

  if (!description) return null;

  return (
    <div className="max-w-4xl">
      <p
        ref={textRef}
        className={`text-sm leading-7 text-[#626F7D] sm:text-base ${
          expanded ? "" : "line-clamp-3 sm:line-clamp-4"
        }`}
      >
        {description}
      </p>

      {hasOverflow && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#0A7BBF] transition hover:text-[#0B2A47] hover:underline"
        >
          {expanded ? "Read less ↑" : "Read more ↓"}
        </button>
      )}
    </div>
  );
}
