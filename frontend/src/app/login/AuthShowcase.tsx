"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

interface AuthShowcaseProps {
  role: "parent" | "school";
  onStartAuth?: (mode: "login" | "register") => void;
}

const copy = {
  school: [
    {
      h: "Reach parents who are actively choosing a school",
      p: "List your campus, answer enquiries and track admissions from one dashboard.",
      s: [
        ["10,000+", "Enquiries handled"],
        ["4.9", "Average school rating"],
      ],
    },
    {
      h: "Show up verified, stay in control",
      p: "A verified badge, a complete profile and instant lead alerts help families trust you faster.",
      s: [
        ["Verified", "Badge for every school"],
        ["24 hrs", "Typical first reply"],
      ],
    },
  ],
  parent: [
    {
      h: "Find the right school, then apply with confidence",
      p: "Compare fees, boards and facilities side by side, and shortlist schools in one place.",
      s: [
        ["10,000+", "Schools listed"],
        ["5 lakh+", "Parents using VidyaVista"],
      ],
    },
    {
      h: "Your shortlist, enquiries and applications together",
      p: "Pick up where you left off on any device and hear back directly from schools.",
      s: [
        ["Free", "For parents, always"],
        ["1 login", "Across all your enquiries"],
      ],
    },
  ],
};

export default function AuthShowcase({ role, onStartAuth }: AuthShowcaseProps) {
  const [slideIdx, setSlideIdx] = useState(0);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Reset slide index on role change
  useEffect(() => {
    setSlideIdx(0);
  }, [role]);

  // Auto rotate slides every 6s
  useEffect(() => {
    const list = copy[role];
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % list.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [role]);

  // Web Animations API for SVG line drawing & school bus movement
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const svg = svgRef.current;
    if (!svg) return;

    const T = 14000;
    const animations: Animation[] = [];

    // Line drawing animation for paths with pathLength
    svg.querySelectorAll("path[pathLength]:not(.nd)").forEach((p) => {
      const iStr = (p as HTMLElement).style.getPropertyValue("--i") || "0";
      const i = +iStr;
      const a = 200 + i * 300;
      const b = 9800 + (9 - i) * 300;
      const d = 800;
      try {
        const anim = p.animate(
          [
            { strokeDashoffset: 1, offset: 0 },
            { strokeDashoffset: 1, offset: a / T },
            { strokeDashoffset: 0, offset: (a + d) / T },
            { strokeDashoffset: 0, offset: b / T },
            { strokeDashoffset: 1, offset: (b + d) / T },
            { strokeDashoffset: 1, offset: 1 },
          ],
          { duration: T, iterations: Infinity }
        );
        animations.push(anim);
      } catch {
        // Fallback gracefully if Web Animations is unsupported
      }
    });

    // Building fill fade
    const fl = svg.querySelector(".fl");
    if (fl) {
      try {
        const anim = fl.animate(
          [
            { opacity: 0, offset: 0 },
            { opacity: 0, offset: 3000 / T },
            { opacity: 1, offset: 3900 / T },
            { opacity: 1, offset: 9000 / T },
            { opacity: 0, offset: 9800 / T },
            { opacity: 0, offset: 1 },
          ],
          { duration: T, iterations: Infinity }
        );
        animations.push(anim);
      } catch {}
    }

    // Yellow School bus motion across road
    const bus = svg.querySelector(".bus");
    if (bus) {
      const x = (n: number) => `translateX(${n}px)`;
      try {
        const anim = bus.animate(
          [
            { transform: x(-70), opacity: 0, offset: 0 },
            { transform: x(-70), opacity: 0, offset: 4000 / T },
            { transform: x(-60), opacity: 1, offset: 4150 / T },
            { transform: x(450), opacity: 1, offset: 9700 / T },
            { transform: x(460), opacity: 0, offset: 9850 / T },
            { transform: x(460), opacity: 0, offset: 1 },
          ],
          { duration: T, iterations: Infinity }
        );
        animations.push(anim);
      } catch {}
    }

    return () => {
      animations.forEach((a) => {
        try {
          a.cancel();
        } catch {}
      });
    };
  }, []);

  const currentList = copy[role];
  const slide = currentList[slideIdx] || currentList[0];

  return (
    <aside className="relative flex flex-col justify-between overflow-hidden rounded-none lg:rounded-[2rem] lg:rounded-r-none bg-gradient-to-b from-[#EEF6FF] via-[#F8FBFF] to-[#FFF0F5] p-4 sm:p-8 lg:p-10 text-[#0B2545] min-h-[calc(100vh-60px)] lg:min-h-[620px]">
      {/* Decorative radial gradients & dot overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-gradient-to-br from-[#E8346F]/15 to-transparent blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(#1F6FD1_1px,transparent_1.2px)] [background-size:22px_22px] [mask-image:linear-gradient(#000,transparent_75%)]"
      />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        {/* Top Portal Badge */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9E1EC] bg-white px-3.5 py-1.5 text-xs font-bold text-[#1F6FD1] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#1F6FD1]" />
            {role === "school" ? "Institution partner portal" : "Parent & student portal"}
          </span>
        </div>

        {/* SVG Art with Animated Line-Drawings, Spinning Sun, Drifting Cloud, Glowing Windows, Waving Flag & Bus */}
        <div className="vv-auth-art relative my-1 sm:my-3 flex items-center justify-center">
          <svg
            ref={svgRef}
            viewBox="0 0 400 272"
            role="img"
            aria-label="School building animation"
            className="w-full max-w-[290px] sm:max-w-[360px] lg:max-w-[440px] h-auto overflow-visible"
          >
            {/* Color fills */}
            <g className="fl" style={{ opacity: 0 }}>
              <circle cx="340" cy="52" r="13" fill="#ffd978" />
              <rect x="130" y="112" width="140" height="102" fill="#fff" />
              <path d="M122 112 200 66 278 112z" fill="#fde1ec" />
              <path d="M50 150h80v64H50zM270 150h80v64h-80z" fill="#e3eefb" />
              <circle cx="24" cy="178" r="16" fill="#cfeedd" />
              <circle cx="376" cy="178" r="16" fill="#cfeedd" />
              <path d="M184 214v-26a16 16 0 0 1 32 0v26z" fill="#1f6fd1" opacity=".2" />
              <g className="win" fill="#ffe08a">
                <rect x="64" y="162" width="16" height="16" />
                <rect x="98" y="162" width="16" height="16" />
                <rect x="64" y="188" width="16" height="16" />
                <rect x="98" y="188" width="16" height="16" />
                <rect x="286" y="162" width="16" height="16" />
                <rect x="320" y="162" width="16" height="16" />
                <rect x="286" y="188" width="16" height="16" />
                <rect x="320" y="188" width="16" height="16" />
              </g>
            </g>

            {/* Line-drawn elements */}
            <path pathLength="1" style={{ "--i": 0 } as any} d="M8 214H392M8 266H392" />
            <path pathLength="1" style={{ "--i": 1 } as any} d="M130 214V112M270 214V112M50 214V150H130M350 214V150H270M42 150H138M262 150H358" />
            <path className="pk" pathLength="1" style={{ "--i": 2 } as any} d="M122 112 200 66 278 112zM136 112 200 74" />
            <path pathLength="1" style={{ "--i": 3 } as any} d="M148 124V214M164 124V214M236 124V214M252 124V214" />
            <path pathLength="1" style={{ "--i": 4 } as any} d="M64 162h16v16H64zM98 162h16v16H98zM64 188h16v16H64zM98 188h16v16H98zM286 162h16v16h-16zM320 162h16v16h-16zM286 188h16v16h-16zM320 188h16v16h-16z" />
            <path pathLength="1" style={{ "--i": 5 } as any} d="M184 214v-26a16 16 0 0 1 32 0v26M200 172v42M172 220H228M164 226H236" />
            <path pathLength="1" style={{ "--i": 6 } as any} d="M189 92a11 11 0 1 0 22 0 11 11 0 1 0-22 0M200 92V85M200 92l5 3M200 66V36" />
            <g className="flag">
              <path className="pk" pathLength="1" style={{ "--i": 7 } as any} d="M200 36h24l-7 7 7 7h-24" />
            </g>
            <path pathLength="1" style={{ "--i": 7 } as any} d="M24 214V196M40 178a16 16 0 1 0-32 0 16 16 0 1 0 32 0M376 214V196M392 178a16 16 0 1 0-32 0 16 16 0 1 0 32 0" />
            <g className="spin">
              <path pathLength="1" style={{ "--i": 8 } as any} d="M353 52a13 13 0 1 0-26 0 13 13 0 1 0 26 0M340 33v-6M340 71v6M321 52h-6M359 52h6" />
            </g>
            <g className="cloud">
              <path pathLength="1" style={{ "--i": 9 } as any} d="M40 66h50a9 9 0 0 0 1-18 14 14 0 0 0-27-3 11 11 0 0 0-24 21z" />
            </g>
            <path pathLength="1" style={{ "--i": 9 } as any} d="M130 40q5-7 10 0q5-7 10 0M154 28q4-6 8 0q4-6 8 0" />

            {/* School Bus travelling */}
            <g className="bus" opacity="0">
              <path className="nd" d="M0 261V243q0-7 7-7H49q7 0 7 7V261z" fill="#ffd24d" stroke="none" />
              <path className="nd" pathLength="1" d="M0 261V243q0-7 7-7H49q7 0 7 7V261zM6 242h10v8H6zM23 242h10v8H23zM40 242h10v8H40zM0 254H56" />
              <circle cx="14" cy="261" r="5" fill="#fff" stroke="#0b2545" strokeWidth="2.2" />
              <circle cx="42" cy="261" r="5" fill="#fff" stroke="#0b2545" strokeWidth="2.2" />
            </g>
          </svg>
        </div>

        {/* Carousel Slide: Headline, description, and stats */}
        <div className="min-h-[130px] sm:min-h-[150px] flex flex-col justify-center transition-all duration-500">
          <h2 className="font-serif text-lg sm:text-2xl lg:text-[25px] font-bold text-[#0B2545] leading-snug tracking-tight">
            {slide.h}
          </h2>
          <p className="mt-1 sm:mt-1.5 text-xs sm:text-[13px] text-[#5D6B82] leading-relaxed max-w-md">
            {slide.p}
          </p>
          <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-2 sm:gap-3">
            {slide.s.map((st, i) => (
              <div
                key={i}
                className={`rounded-xl border border-[#D9E1EC] bg-white px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm min-w-[100px] sm:min-w-[110px] transition-transform duration-200 hover:-translate-y-0.5 ${
                  i === 0 ? "border-l-[3px] border-l-[#1F6FD1]" : "border-l-[3px] border-l-[#E8346F]"
                }`}
              >
                <strong className="block font-serif text-sm sm:text-lg font-bold text-[#0B2545] leading-none">
                  {st[0]}
                </strong>
                <span className="mt-1 block text-[10px] sm:text-[11px] font-medium text-[#5D6B82] leading-none">
                  {st[1]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dots & Bottom Trust Line */}
        <div className="pt-2 border-t border-[#D9E1EC]/60">
          <div className="flex items-center gap-2">
            {currentList.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                onClick={() => setSlideIdx(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  slideIdx === i ? "w-7 bg-[#E8346F]" : "w-2 bg-[#C3D0E2] hover:bg-[#A0B0C8]"
                }`}
              />
            ))}
          </div>
          <p className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-[#5D6B82]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#14915A] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#14915A]" />
            </span>
            <span>Trusted by 10,000+ schools and 5 lakh+ parents</span>
          </p>
        </div>

        {/* Mobile Action Buttons (Visible only on mobile welcome screen) */}
        {onStartAuth && (
          <div className="mt-4 pt-3 space-y-2.5 block lg:hidden border-t border-[#D9E1EC]/60">
            <button
              type="button"
              onClick={() => onStartAuth("login")}
              className={`vv-btn flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold text-white shadow-lg transition active:scale-[0.98] ${
                role === "parent"
                  ? "bg-gradient-to-r from-[#F43F5E] to-[#FB7185] shadow-[#F43F5E]/30"
                  : "bg-gradient-to-r from-[#1F6FD1] to-[#3A56C9] shadow-[#1F6FD1]/30"
              }`}
            >
              <span>{role === "school" ? "Sign In to Institution Portal" : "Sign In to Parent Portal"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onStartAuth("register")}
              className={`flex h-11 w-full items-center justify-center rounded-xl border border-[#D9E1EC] bg-white/90 text-xs font-bold transition hover:bg-white active:scale-[0.98] ${
                role === "parent" ? "text-[#F43F5E]" : "text-[#1F6FD1]"
              }`}
            >
              <span>{role === "school" ? "School Owner? Register Profile →" : "New Parent? Create Account →"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Embedded CSS for keyframe animations */}
      <style jsx>{`
        .vv-auth-art svg path {
          fill: none;
          stroke: #0b2545;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 1 2;
          stroke-dashoffset: 1;
        }
        .vv-auth-art svg path.pk {
          stroke: #e8346f;
        }
        .vv-auth-art svg path.nd {
          stroke-dasharray: none;
          stroke-dashoffset: 0;
        }
        .vv-auth-art .win rect {
          animation: vvGlow 3.2s ease-in-out infinite alternate;
        }
        .vv-auth-art .win rect:nth-child(2n) {
          animation-delay: 1.1s;
        }
        .vv-auth-art .win rect:nth-child(3n) {
          animation-delay: 2s;
        }
        @keyframes vvGlow {
          from {
            fill-opacity: 0.35;
          }
          to {
            fill-opacity: 1;
          }
        }
        .vv-auth-art .flag,
        .vv-auth-art .cloud,
        .vv-auth-art .spin {
          transform-box: fill-box;
        }
        .vv-auth-art .flag {
          transform-origin: left center;
          animation: vvWave 2.2s ease-in-out 4s infinite alternate;
        }
        @keyframes vvWave {
          to {
            transform: scaleX(0.88) skewY(5deg);
          }
        }
        .vv-auth-art .cloud {
          animation: vvDrift 7s ease-in-out 4s infinite alternate;
        }
        @keyframes vvDrift {
          to {
            transform: translateX(16px);
          }
        }
        .vv-auth-art .spin {
          transform-origin: center;
          animation: vvTurn 24s linear 4s infinite;
        }
        @keyframes vvTurn {
          to {
            transform: rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .vv-auth-art .win rect,
          .vv-auth-art .flag,
          .vv-auth-art .cloud,
          .vv-auth-art .spin {
            animation: none !important;
          }
          .vv-auth-art svg path {
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>
    </aside>
  );
}
