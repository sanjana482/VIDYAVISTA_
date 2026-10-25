"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ALL_TABS: [string, string][] = [
  ["about", "About"], ["fees", "Fees"], ["facilities", "Facilities"], ["admission", "Admission"],
  ["contact", "Contact"], ["photos", "Photos"], ["reviews", "Reviews"], ["faqs", "FAQs"],
];

// header (~80px) + this sticky tab bar (~56px) + a little air
const OFFSET = 150;

/**
 * All sections are on one long page. This bar
 *  - highlights the tab of the section you are currently reading (scroll-spy)
 *  - scrolls smoothly to a section when you click its tab
 * The links still point to /schools/<slug>/<section>, so Google and "open in new tab" keep working.
 */
export default function ProfileTabs({ basePath, active = "about", sections }: { basePath: string; active?: string; sections?: string[] }) {
  const tabs = ALL_TABS.filter(([id]) => !sections || sections.includes(id));
  const [current, setCurrent] = useState(active);
  const lock = useRef(false);
  const navRef = useRef<HTMLElement>(null);

  const hrefFor = (id: string) => (id === "about" ? basePath : `${basePath}/${id}`);

  const goTo = useCallback((id: string, smooth = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    lock.current = true;
    setCurrent(id);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - OFFSET + 8, behavior: smooth ? "smooth" : "auto" });
    window.setTimeout(() => { lock.current = false; }, 700);
  }, []);

  // opened as /schools/<slug>/fees -> jump straight to that section
  useEffect(() => {
    if (active && active !== "about") {
      const t = window.setTimeout(() => goTo(active, false), 120);
      return () => window.clearTimeout(t);
    }
  }, [active, goTo]);

  // scroll-spy
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (lock.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let found = tabs[0]?.[0] ?? "about";
        for (const [id] of tabs) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top - OFFSET <= 0) found = id;
        }
        // bottom of the page -> last tab
        if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) found = tabs[tabs.length - 1]?.[0] ?? found;
        setCurrent((c) => (c === found ? c : found));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.map(([id]) => id).join(",")]);

  // keep the active tab visible inside the horizontal tab bar (mobile)
  useEffect(() => {
    const btn = navRef.current?.querySelector<HTMLElement>(`[data-tab="${current}"]`);
    if (btn && navRef.current) {
      const nav = navRef.current;
      nav.scrollTo({ left: btn.offsetLeft - nav.clientWidth / 2 + btn.clientWidth / 2, behavior: "smooth" });
    }
  }, [current]);

  return (
    <div className="sticky top-[76px] z-40 border-b border-[#E1E7EE] bg-white/95 backdrop-blur sm:top-[80px]">
      <nav ref={navRef} aria-label="Profile sections" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(([id, label]) => (
          <a
            key={id}
            data-tab={id}
            href={hrefFor(id)}
            onClick={(e) => {
              e.preventDefault();
              goTo(id);
              window.history.replaceState(null, "", hrefFor(id));
            }}
            aria-current={current === id ? "true" : undefined}
            className={`shrink-0 border-b-[3px] px-5 py-4 text-sm font-bold transition ${
              current === id ? "border-[#EC0E58] text-[#0B2A47]" : "border-transparent text-[#5C6A7B] hover:text-[#0A7BBF]"
            }`}
          >
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
