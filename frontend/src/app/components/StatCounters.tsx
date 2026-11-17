"use client";

/**
 * Animated stat counters — counts up from 0 to target when visible.
 * Shows: 4500+ Schools, 400+ Cities, 20K+ Parent Reviews, 100% Free
 */

import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 4500, suffix: "+", label: "Schools Listed", icon: "🏫" },
  { value: 400, suffix: "+", label: "Cities Covered", icon: "📍" },
  { value: 20000, suffix: "+", label: "Parent Reviews", icon: "⭐" },
  { value: 100, suffix: "%", label: "Free to Use", icon: "✅" },
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const duration = 1800;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target]);

  const display = count >= 1000 ? `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}K` : count.toString();

  return (
    <span ref={ref} className="tabular-nums">
      {count >= 1000 ? display : count}{suffix}
    </span>
  );
}

export default function StatCounters() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#0B2A47] via-[#0A5C91] to-[#0795DC] py-10 sm:py-12">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-white/5" />

      <div className="relative mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center">
              <span className="text-3xl mb-2">{s.icon}</span>
              <p className="text-3xl font-black text-white sm:text-4xl">
                <Counter target={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-sm font-semibold text-white/70">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
