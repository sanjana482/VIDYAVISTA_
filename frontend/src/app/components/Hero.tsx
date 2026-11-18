"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_PREF,
  PREF_EVENT,
  readPreference,
  savePreference,
  type SchoolTypeLabel,
} from "../lib/preferences";
import { openLocationPicker } from "../lib/places";
import SchoolSearchBar, { type SearchSchool } from "./SchoolSearchBar";
import AgeCalculator from "./AgeCalculator";

const schoolTypesConfig: { type: SchoolTypeLabel; shortLabel: string; icon: string }[] = [
  { type: "Boarding Schools", shortLabel: "Boarding", icon: "school" },
  { type: "Day Schools", shortLabel: "Day Schools", icon: "sun" },
  { type: "Play School", shortLabel: "Play School", icon: "blocks" },
];

const tickerPills: [string, string][] = [
  ["book", "CBSE"],
  ["cap", "ICSE"],
  ["school", "IB"],
  ["globe", "Cambridge"],
  ["school", "Boarding"],
  ["sun", "Day Schools"],
  ["blocks", "Play Schools"],
  ["bulb", "Smart Classes"],
  ["pencil", "Art & Music"],
  ["atom", "Science Labs"],
  ["star", "Sports"],
  ["pin", "28 States"],
];

function TickerIcon({ name }: { name: string }) {
  if (name === "book") {
    return (
      <svg className="i h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M9 7h6" />
      </svg>
    );
  }
  if (name === "cap") {
    return (
      <svg className="i h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 9l10-5 10 5-10 5zM6 11.5V16c3 2.5 9 2.5 12 0v-4.5" />
      </svg>
    );
  }
  if (name === "school") {
    return (
      <svg className="i h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21V9l9-6 9 6v12M9 21v-6h6v6M3 21h18" />
      </svg>
    );
  }
  if (name === "globe") {
    return (
      <svg className="i h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
      </svg>
    );
  }
  if (name === "sun") {
    return (
      <svg className="i h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
      </svg>
    );
  }
  if (name === "blocks") {
    return (
      <svg className="i h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="12" width="8" height="8" rx="1.5" />
        <rect x="13" y="12" width="8" height="8" rx="1.5" />
        <rect x="8" y="3" width="8" height="8" rx="1.5" />
      </svg>
    );
  }
  if (name === "bulb") {
    return (
      <svg className="i h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 00-4-10z" />
      </svg>
    );
  }
  if (name === "pencil") {
    return (
      <svg className="i h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3" />
      </svg>
    );
  }
  if (name === "atom") {
    return (
      <svg className="i h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="1.5" />
        <ellipse cx="12" cy="12" rx="10" ry="4" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      </svg>
    );
  }
  if (name === "star") {
    return (
      <svg className="i h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
      </svg>
    );
  }
  // pin
  return (
    <svg className="i h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function Hero({ schools = [] }: { schools?: SearchSchool[] }) {
  const [schoolType, setSchoolType] = useState<SchoolTypeLabel>(DEFAULT_PREF.type);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showCalc, setShowCalc] = useState(false);

  // Animated counters
  const [countSchools, setCountSchools] = useState(0);
  const [countStates, setCountStates] = useState(0);
  const [countParents, setCountParents] = useState(0);

  const bgRef = useRef<HTMLDivElement>(null);

  // Parallax mouse move effect matching Claude artifact
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!bgRef.current) return;
      const x = ((e.clientX / window.innerWidth) - 0.5) * -24;
      const y = ((e.clientY / window.innerHeight) - 0.5) * -16;
      bgRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Stats counter animation matching Claude artifact
  useEffect(() => {
    const duration = 1800;
    const steps = 70;
    const intervalTime = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setCountSchools(Math.round(2500 * progress));
      setCountStates(Math.round(28 * progress));
      setCountParents(Math.round(50000 * progress));

      if (step >= steps) {
        clearInterval(timer);
        setCountSchools(2500);
        setCountStates(28);
        setCountParents(50000);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  // Sync preference with cookie and global events
  useEffect(() => {
    const sync = () => {
      const saved = readPreference();
      if (saved) {
        setSchoolType(saved.type);
        setSelectedLocation(saved.location);
      }
    };
    sync();
    window.addEventListener(PREF_EVENT, sync);
    return () => window.removeEventListener(PREF_EVENT, sync);
  }, []);

  const isBoarding = schoolType === "Boarding Schools";
  const locationLabel = isBoarding ? "State" : "City";

  function changeType(type: SchoolTypeLabel) {
    if (type === schoolType) return;
    setSchoolType(type);
    setSelectedLocation("");
    savePreference({ type, location: "" });
  }

  function chooseSchoolType(type: SchoolTypeLabel) {
    changeType(type);
    openLocationPicker(type);
  }

  return (
    <>
      <section className="hero-art relative grid grid-cols-1 items-center gap-12 px-[5vw] py-14 lg:grid-cols-[1.05fr_1fr] lg:py-16">
        {/* Rotating Conic Arc Glow */}
        <div className="hero-arc pointer-events-none" />

        {/* Animated Background Container with Parallax */}
        <div ref={bgRef} className="bg pointer-events-none absolute inset-0 -z-1 select-none transition-transform duration-300 ease-out">
          {/* SVG Flight Trail & Animated Aeroplane */}
          <svg className="fly absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path
              id="p1"
              className="art-trail"
              d="M-40 600 C120 640 260 520 340 470 C420 420 470 520 400 540 C330 560 340 430 470 390 C650 340 800 380 960 250 C1060 170 1140 120 1260 90"
            />
            <g className="art-plane">
              <path d="M20 0L-20 -15L-11 0L-20 15Z" />
              <path className="fold" d="M-11 0L20 0M-11 0L-6 8" />
              <animateMotion dur="16s" repeatCount="indefinite" rotate="auto">
                <mpath href="#p1" />
              </animateMotion>
            </g>
          </svg>

          {/* Twinkling 4-Point Stars */}
          <span className="art-sp" style={{ left: "8%", top: "18%" }}>
            <svg viewBox="0 0 24 24"><path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" /></svg>
          </span>
          <span className="art-sp" style={{ left: "46%", top: "8%", animationDelay: "-1s", color: "#0a69a8" }}>
            <svg viewBox="0 0 24 24"><path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" /></svg>
          </span>
          <span className="art-sp" style={{ left: "92%", top: "55%", animationDelay: "-2s", color: "#7b3fa0" }}>
            <svg viewBox="0 0 24 24"><path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" /></svg>
          </span>
          <span className="art-sp" style={{ left: "30%", top: "88%", animationDelay: "-1.5s" }}>
            <svg viewBox="0 0 24 24"><path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" /></svg>
          </span>

          {/* Floating Educational Doodles */}
          {/* 1. Book */}
          <span className="art-dr" style={{ left: "3%", top: "45%" }}>
            <TickerIcon name="book" />
          </span>
          {/* 2. Cap */}
          <span className="art-dr" style={{ left: "52%", top: "84%", animationDelay: "-5s" }}>
            <TickerIcon name="cap" />
          </span>
          {/* 3. Pencil */}
          <span className="art-dr" style={{ left: "2%", top: "80%", animationDelay: "-2s", color: "#e91e63" }}>
            <TickerIcon name="pencil" />
          </span>
          {/* 4. Bulb */}
          <span className="art-dr" style={{ left: "60%", top: "3%", animationDelay: "-7s", color: "#f5a524" }}>
            <TickerIcon name="bulb" />
          </span>
          {/* 5. Globe */}
          <span className="art-dr" style={{ left: "94%", top: "28%", animationDelay: "-4s", color: "#7b3fa0" }}>
            <TickerIcon name="globe" />
          </span>
          {/* 6. Atom (Rotating) */}
          <span className="art-dr" style={{ left: "42%", top: "91%", animation: "spin 16s linear infinite", color: "#0a69a8" }}>
            <TickerIcon name="atom" />
          </span>

          {/* Floating Pastel Circles */}
          <span className="art-cr" style={{ left: "20%", top: "6%", width: 26, height: 26, borderColor: "#e91e63" }} />
          <span className="art-cr" style={{ left: "76%", top: "91%", width: 36, height: 36, borderColor: "#0a69a8", animationDelay: "-3s" }} />
          <span className="art-cr" style={{ left: "97%", top: "8%", width: 18, height: 18, borderColor: "#f5a524", animationDelay: "-5s" }} />
          <span className="art-cr" style={{ left: "36%", top: "96%", width: 14, height: 14, background: "#7b3fa0", borderColor: "#7b3fa0", animationDelay: "-1s" }} />
        </div>

        {/* ================= LEFT COLUMN ================= */}
        <div>
          {/* Pill Badge */}
          <span className="pill inline-flex items-center gap-2 rounded-full border border-[#dbe6f3] bg-white px-4 py-2 text-xs font-semibold text-[#0a69a8] shadow-sm">
            <span className="dot" />
            A Brighter Future Begins Here
          </span>

          {/* Heading */}
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.04] tracking-tight text-[#0f2742] sm:text-5xl lg:text-6xl">
            <span className="l block overflow-hidden pb-[0.2em] -mb-[0.14em]">
              <span className="inline-block animate-[up_0.9s_cubic-bezier(0.2,0.8,0.2,1)_both]">
                Find the School
              </span>
            </span>
            <span className="l block overflow-hidden pb-[0.2em] -mb-[0.14em]">
              <span className="art-g">
                That Feels Right.
              </span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="sub mt-4 max-w-lg text-base leading-7 text-[#5b6b80] sm:text-lg">
            Explore schools, compare facilities and fees, and find a learning
            environment where your child can learn, grow and shine.
          </p>

          {/* Stats Counter Row */}
          <div className="stats mt-8 flex flex-wrap gap-8">
            <div className="stat border-l-3 border-[#e91e63] pl-3.5">
              <b className="block font-heading text-3xl sm:text-4xl text-[#0f2742]">
                {countSchools.toLocaleString("en-IN")}+
              </b>
              <span className="text-xs sm:text-sm font-semibold text-[#5b6b80]">
                Schools listed
              </span>
            </div>

            <div className="stat border-l-3 border-[#e91e63] pl-3.5">
              <b className="block font-heading text-3xl sm:text-4xl text-[#0f2742]">
                {countStates}
              </b>
              <span className="text-xs sm:text-sm font-semibold text-[#5b6b80]">
                States covered
              </span>
            </div>

            <div className="stat border-l-3 border-[#e91e63] pl-3.5">
              <b className="block font-heading text-3xl sm:text-4xl text-[#0f2742]">
                {countParents.toLocaleString("en-IN")}+
              </b>
              <span className="text-xs sm:text-sm font-semibold text-[#5b6b80]">
                Happy parents
              </span>
            </div>
          </div>

          {/* Quick Age Calculator Pill Link */}
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCalc((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-[#dbe6f3] bg-white/90 px-4 py-2 text-xs sm:text-sm font-bold text-[#0a69a8] shadow-sm backdrop-blur transition hover:border-[#0a69a8] hover:bg-white"
            >
              <span>🎯</span>
              <span>Age Eligibility Calculator</span>
              <span className="text-xs text-[#0a69a8]">{showCalc ? "▲" : "▼"}</span>
            </button>
          </div>

          {showCalc && (
            <div className="mt-4 max-w-xl animate-[fadeIn_0.3s_ease]">
              <AgeCalculator />
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN (GLASS PANEL) ================= */}
        <div className="stage relative">
          <div className="art-panel relative p-6 sm:p-7">
            {/* Header */}
            <div className="ph flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl text-[#0f2742]">
                  Find your ideal school
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#5b6b80]">
                  Select a school type to get started.
                </p>
              </div>
              <span className="tag rounded-full bg-[#e6f0fa] px-3 py-1.5 text-xs font-semibold text-[#0a69a8]">
                Start here
              </span>
            </div>

            {/* 3 Tabs */}
            <div className="tabs my-5 grid grid-cols-3 gap-2.5">
              {schoolTypesConfig.map(({ type, shortLabel, icon }) => {
                const active = schoolType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => chooseSchoolType(type)}
                    className={`tab flex flex-col items-center gap-2 rounded-2xl border-2 p-3.5 text-center font-bold text-xs sm:text-sm transition-all duration-200 ${
                      active
                        ? "on border-[#0a69a8] bg-[#e6f0fa] text-[#0a69a8] shadow-lg shadow-[#0a69a8]/15"
                        : "border-[#dbe6f3] bg-white text-[#0f2742] hover:-translate-y-0.5 hover:border-[#0a69a8]"
                    }`}
                  >
                    <span className="i text-2xl">
                      <TickerIcon name={icon} />
                    </span>
                    <span className="truncate w-full">{shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* State/City Row */}
            <div
              onClick={() => openLocationPicker(schoolType)}
              className="state flex cursor-pointer items-center gap-3.5 rounded-2xl border border-[#dbe6f3] bg-white/80 p-3.5 transition hover:border-[#0a69a8] hover:bg-white hover:shadow-sm"
            >
              <div className="art-pin flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e6f0fa] text-xl text-[#e91e63]">
                <TickerIcon name="pin" />
              </div>
              <div className="min-w-0">
                <small className="block text-[11px] font-semibold uppercase tracking-wider text-[#5b6b80]">
                  SELECT {locationLabel.toUpperCase()}
                </small>
                <b className="mt-0.5 block truncate text-base sm:text-lg font-bold text-[#0f2742]">
                  {selectedLocation || `Choose your ${locationLabel.toLowerCase()}`}
                </b>
              </div>
              <a className="ml-auto text-xs sm:text-sm font-semibold text-[#0a69a8] hover:underline">
                Change
              </a>
            </div>

            {/* Direct School Search Bar */}
            <div className="mt-5 relative z-50">
              <div className="sl mb-2 flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#0a69a8]">
                <span>DIRECT SCHOOL SEARCH</span>
                <i className="normal-case tracking-normal text-[#5b6b80]">Instant profile preview</i>
              </div>
              <SchoolSearchBar
                schools={schools}
                schoolType={schoolType}
                location={selectedLocation}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= EXACT RUNNING MARQUEE STRIP ================= */}
      {/* Exact marquee strip matching Claude artifact */}
      <div className="art-strip">
        <div className="art-mr">
          <div className="art-track">
            {/* 4 loops for endless smooth continuous scrolling */}
            {[0, 1, 2, 3].map((loopIdx) => (
              <span key={`group-${loopIdx}`} className="inline-flex">
                {tickerPills.map(([ic, text], idx) => (
                  <span key={`pill-${loopIdx}-${idx}`}>
                    <em>
                      <TickerIcon name={ic} />
                    </em>
                    {text}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
