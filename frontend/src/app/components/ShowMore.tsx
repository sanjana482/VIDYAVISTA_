"use client";

import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";

type Props = {
  children: ReactNode;      // the <li> items
  className?: string;       // classes of the <ul>
  initial?: number;         // how many to show first
  step?: number;            // how many more to show on every click
};

export default function ShowMore({ children, className = "", initial = 8, step = 8 }: Props) {
  const items = Children.toArray(children);
  const [shown, setShown] = useState(initial);
  const left = items.length - shown;

  return (
    <>
      <ul className={className}>
        {items.map((child, i) => {
          if (!isValidElement(child) || i < shown) return child;
          // the rest stay in the page HTML (Google can still see the links) but are hidden until "Show more"
          const el = child as ReactElement<{ className?: string }>;
          return cloneElement(el, { className: `${el.props.className ?? ""} hidden`.trim() });
        })}
      </ul>
      {left > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + step)}
          className="mt-4 rounded-full border-2 border-[#0795DC] bg-white px-6 py-2.5 text-sm font-extrabold text-[#0A7BBF] transition hover:bg-[#0795DC] hover:text-white"
        >
          Show more <span className="ml-1 text-xs font-bold opacity-70">({left} left)</span>
        </button>
      )}
    </>
  );
}