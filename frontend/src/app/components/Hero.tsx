"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PREF,
  PREF_EVENT,
  readPreference,
  savePreference,
  type SchoolTypeLabel,
} from "../lib/preferences";
import { openLocationPicker } from "../lib/places";
import Icon from "./Icon";
import SchoolSearchBar, { type SearchSchool } from "./SchoolSearchBar";
import AgeCalculator from "./AgeCalculator";

const schoolTypesConfig: { type: SchoolTypeLabel; shortLabel: string; icon: string }[] = [
  { type: "Boarding Schools", shortLabel: "Boarding", icon: "home" },
  { type: "Day Schools", shortLabel: "Day Schools", icon: "sun" },
  { type: "Play School", shortLabel: "Play School", icon: "puzzle" },
];

// Marquee items for the running bottom line
const runningTickerItems = [
  { label: "Science Labs", icon: "⚛️", bg: "bg-pink-100", text: "text-pink-700" },
  { label: "Sports", icon: "⭐", bg: "bg-purple-100", text: "text-purple-700" },
  { label: "28 States", icon: "📍", bg: "bg-amber-100", text: "text-amber-700" },
  { label: "CBSE", icon: "📘", bg: "bg-sky-100", text: "text-sky-700" },
  { label: "ICSE", icon: "🎓", bg: "bg-rose-100", text: "text-rose-700" },
  { label: "IB", icon: "🏫", bg: "bg-indigo-100", text: "text-indigo-700" },
  { label: "Cambridge", icon: "🌐", bg: "bg-orange-100", text: "text-orange-700" },
  { label: "Boarding", icon: "🏠", bg: "bg-teal-100", text: "text-teal-700" },
  { label: "Day Schools", icon: "☀️", bg: "bg-red-100", text: "text-red-700" },
  { label: "Play Schools", icon: "🧩", bg: "bg-violet-100", text: "text-violet-700" },
  { label: "Smart Classes", icon: "💡", bg: "bg-yellow-100", text: "text-yellow-700" },
  { label: "100% Verified", icon: "🏆", bg: "bg-emerald-100", text: "text-emerald-700" },
  { label: "Swimming Pool", icon: "🏊", bg: "bg-cyan-100", text: "text-cyan-700" },
  { label: "Transport Facility", icon: "🚌", bg: "bg-blue-100", text: "text-blue-700" },
];

export default function Hero({ schools = [] }: { schools?: SearchSchool[] }) {
  const [schoolType, setSchoolType] = useState<SchoolTypeLabel>(DEFAULT_PREF.type);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showCalc, setShowCalc] = useState(false);

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
    <section className="relative z-40 overflow-hidden bg-gradient-to-b from-[#EBF5FB] via-[#F4EEF8] to-[#FFF5F7] pt-8 sm:pt-14">
      {/* Floating Animated Education Doodles in Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden">
        {/* Soft pastel ambient glow orbs */}
        <div className="absolute -left-20 top-10 h-96 w-96 rounded-full bg-[#56B5EC]/15 blur-3xl vv-drift" />
        <div className="absolute right-10 top-20 h-96 w-96 rounded-full bg-[#FF9DBB]/15 blur-3xl vv-float-b" />
        <div className="absolute bottom-20 left-1/3 h-80 w-80 rounded-full bg-[#C4B5FD]/20 blur-3xl vv-float-c" />

        {/* Doodle 1: Pencil (Top Left) */}
        <div className="vv-doodle-1 absolute left-[6%] top-[12%] opacity-65">
          <svg className="h-10 w-10 text-[#EC4899]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </div>

        {/* Doodle 2: Sticky Note / Notepad (Left Mid) */}
        <div className="vv-doodle-2 absolute left-[3%] top-[45%] opacity-55">
          <svg className="h-11 w-11 text-[#3B82F6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>

        {/* Doodle 3: Atom / Science Orbit (Top Middle) */}
        <div className="vv-doodle-3 absolute left-[45%] top-[8%] opacity-60">
          <svg className="h-12 w-12 text-[#0284C7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)" />
            <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </div>

        {/* Doodle 4: Lightbulb (Top Center-Right) */}
        <div className="vv-doodle-1 absolute left-[56%] top-[10%] opacity-65">
          <svg className="h-11 w-11 text-[#F59E0B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
          </svg>
        </div>

        {/* Doodle 5: Graduation Cap / Mortarboard (Bottom Left) */}
        <div className="vv-doodle-2 absolute left-[12%] bottom-[22%] opacity-60">
          <svg className="h-10 w-10 text-[#8B5CF6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>

        {/* Doodle 6: Planet / Globe with Ring (Right Top) */}
        <div className="vv-doodle-3 absolute right-[4%] top-[15%] opacity-55">
          <svg className="h-12 w-12 text-[#9333EA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="7" />
            <ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(-25 12 12)" />
          </svg>
        </div>

        {/* Doodle 7: Circles & Dots (Scattered) */}
        <div className="vv-pulse-glow absolute left-[20%] top-[6%] h-6 w-6 rounded-full border-2 border-[#EC4899] opacity-60" />
        <div className="vv-doodle-1 absolute left-[38%] bottom-[26%] h-7 w-7 rounded-full border-2 border-[#06B6D4] opacity-50" />
        <div className="vv-doodle-2 absolute right-[18%] bottom-[20%] h-8 w-8 rounded-full border-2 border-[#F59E0B] opacity-45" />
        <div className="vv-pulse-glow absolute right-[8%] top-[40%] h-4 w-4 rounded-full bg-[#EC4899]/30" />
        <div className="vv-pulse-glow absolute left-[8%] top-[30%] h-3 w-3 rounded-full bg-[#3B82F6]/40" />

        {/* Sparkles */}
        <div className="vv-doodle-1 absolute left-[28%] top-[14%] text-[#EC0E58] opacity-70">✦</div>
        <div className="vv-doodle-2 absolute right-[28%] top-[8%] text-[#0A6AA8] opacity-60">✦</div>
        <div className="vv-doodle-3 absolute left-[4%] bottom-[12%] text-[#8B5CF6] opacity-60">✦</div>
      </div>

      {/* Main Container */}
      <div className="relative mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-8 xl:px-12 pb-12 sm:pb-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-10 xl:gap-14">
          
          {/* ================= LEFT COLUMN ================= */}
          <div className="lg:col-span-6 xl:col-span-7">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#BDE0F5] bg-white/95 px-4 py-1.5 text-xs sm:text-sm font-bold text-[#0A6AA8] shadow-sm backdrop-blur">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EC0E58] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#EC0E58]" />
              </span>
              <span>A Brighter Future Begins Here</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.12] tracking-tight text-[#12304A] sm:text-5xl lg:text-6xl">
              Find the School{" "}
              <span className="mt-1 block bg-gradient-to-r from-[#0A6AA8] via-[#6C5CE7] to-[#EC0E58] bg-clip-text text-transparent">
                That Feels Right.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 max-w-xl text-base leading-7 text-[#4F5B69] sm:text-lg">
              Explore schools, compare facilities and fees, and find a learning
              environment where your child can learn, grow and shine.
            </p>

            {/* Metrics Row + Animated Flying Paper Aeroplane */}
            <div className="relative mt-8 sm:mt-10">
              {/* Stats Grid */}
              <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                {/* Stat 1 */}
                <div className="border-l-3 border-[#EC0E58] pl-3.5">
                  <span className="block text-2xl sm:text-3xl font-black text-[#12304A]">
                    2,500+
                  </span>
                  <span className="mt-0.5 block text-xs sm:text-sm font-semibold text-[#687789]">
                    Schools listed
                  </span>
                </div>

                {/* Stat 2 */}
                <div className="border-l-3 border-[#EC0E58] pl-3.5">
                  <span className="block text-2xl sm:text-3xl font-black text-[#12304A]">
                    28
                  </span>
                  <span className="mt-0.5 block text-xs sm:text-sm font-semibold text-[#687789]">
                    States covered
                  </span>
                </div>

                {/* Stat 3 */}
                <div className="relative border-l-3 border-[#EC0E58] pl-3.5">
                  <span className="block text-2xl sm:text-3xl font-black text-[#12304A]">
                    50,000+
                  </span>
                  <span className="mt-0.5 block text-xs sm:text-sm font-semibold text-[#687789]">
                    Happy parents
                  </span>
                </div>
              </div>

              {/* Animated Flying Paper Aeroplane with Trailing Dashed Loop */}
              <div className="pointer-events-none absolute -top-8 right-0 sm:right-6 lg:right-12 select-none">
                <svg className="h-28 w-44 overflow-visible" viewBox="0 0 160 100" fill="none">
                  {/* Trailing dashed loop flight path */}
                  <path
                    d="M 10 85 C 30 95, 75 90, 80 65 C 85 40, 55 35, 60 65 C 65 95, 115 65, 135 25"
                    stroke="#94A3B8"
                    strokeWidth="1.8"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    className="opacity-70"
                  />
                  {/* Small loop accent */}
                  <path
                    d="M 50 70 A 10 10 0 1 0 70 70 A 10 10 0 1 0 50 70"
                    stroke="#CBD5E1"
                    strokeWidth="1.4"
                    strokeDasharray="3 3"
                    className="opacity-50"
                  />
                </svg>

                {/* The Paper Aeroplane itself (with float/glide animation) */}
                <div className="vv-airplane absolute -top-1 -right-3">
                  <svg
                    className="h-10 w-10 drop-shadow-md"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Plane Main Wings */}
                    <path
                      d="M6 24L42 8L28 40L22 28L6 24Z"
                      fill="#FFFFFF"
                      stroke="#0F172A"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    />
                    {/* Fold center line */}
                    <path
                      d="M42 8L22 28"
                      stroke="#0F172A"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    />
                    {/* Underbelly fold shadow */}
                    <path
                      d="M22 28L28 40L32 23L22 28Z"
                      fill="#E2E8F0"
                      stroke="#0F172A"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Quick Age Calculator Pill Link */}
            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCalc((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-[#C9D8E8] bg-white/90 px-4 py-2 text-xs sm:text-sm font-bold text-[#0A5C91] shadow-sm backdrop-blur transition hover:border-[#0A7BBF] hover:bg-white"
              >
                <span>🎯</span>
                <span>Age Eligibility Calculator</span>
                <span className="text-xs text-[#0A7BBF]">{showCalc ? "▲" : "▼"}</span>
              </button>
            </div>

            {showCalc && (
              <div className="mt-4 max-w-xl animate-[fadeIn_0.3s_ease]">
                <AgeCalculator />
              </div>
            )}
          </div>

          {/* ================= RIGHT COLUMN (SEARCH CARD) ================= */}
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="relative rounded-[28px] border border-white/95 bg-white/95 p-6 sm:p-8 shadow-2xl shadow-[#0D4E74]/12 backdrop-blur-xl">
              {/* Card Header */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#12304A]">
                    Find your ideal school
                  </h2>
                  <p className="mt-0.5 text-xs sm:text-sm text-[#687789]">
                    Select a school type to get started.
                  </p>
                </div>
                <span className="rounded-full bg-[#EBF3F9] px-3.5 py-1 text-xs font-bold text-[#3E5773]">
                  Start here
                </span>
              </div>

              {/* 3 School Type Tabs (Matching Image) */}
              <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3">
                {schoolTypesConfig.map(({ type, shortLabel, icon }) => {
                  const active = schoolType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => chooseSchoolType(type)}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 py-3 px-2 text-center transition-all duration-200 ${
                        active
                          ? "border-[#0A7BBF] bg-[#F0F7FC] text-[#0A5C91] shadow-sm scale-[1.02]"
                          : "border-[#E2E8F0] bg-white text-[#4A5568] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {/* Icon */}
                      <div className="text-lg">
                        {icon === "home" && (
                          <svg className={`h-5 w-5 ${active ? "text-[#EC0E58]" : "text-[#E11D48]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        )}
                        {icon === "sun" && (
                          <svg className={`h-5 w-5 ${active ? "text-[#0A5C91]" : "text-[#4A5568]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                          </svg>
                        )}
                        {icon === "puzzle" && (
                          <svg className={`h-5 w-5 ${active ? "text-[#0A5C91]" : "text-[#4A5568]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="8.5" y="14" width="7" height="7" rx="1" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold truncate w-full">
                        {shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Location Selector Card (Matching Image) */}
              <button
                type="button"
                onClick={() => openLocationPicker(schoolType)}
                className="mt-4 flex w-full items-center justify-between gap-3.5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFD] p-3.5 sm:p-4 text-left transition hover:border-[#0A7BBF] hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E1EFF8] text-lg text-[#EC0E58]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#687789]">
                      SELECT {locationLabel.toUpperCase()}
                    </span>
                    <span className="mt-0.5 block truncate text-base sm:text-lg font-extrabold text-[#12304A]">
                      {selectedLocation || `Choose your ${locationLabel.toLowerCase()}`}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-extrabold text-[#0A7BBF] hover:underline">
                  Change
                </span>
              </button>

              {/* Direct Search Bar */}
              <div className="mt-5 relative z-50">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0A5C91]">
                    DIRECT SCHOOL SEARCH
                  </span>
                  <span className="text-[11px] font-semibold text-[#707E8F]">
                    Instant profile preview
                  </span>
                </div>
                <SchoolSearchBar
                  schools={schools}
                  schoolType={schoolType}
                  location={selectedLocation}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ================= CONTINUOUS RUNNING TICKER LINE ================= */}
      {/* "jo niche line hai vo chal rahi hai" */}
      <div className="relative border-t border-b border-[#DCE5ED] bg-white/80 py-3 backdrop-blur-md overflow-hidden">
        {/* Subtle edge fades for smooth entry/exit */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-r from-white via-white/80 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-l from-white via-white/80 to-transparent" />

        <div className="vv-marquee flex items-center gap-3 sm:gap-4">
          {/* Track 1 */}
          {runningTickerItems.map((item, idx) => (
            <div
              key={`ticker-1-${idx}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#DCE4EC] bg-white px-3.5 py-1.5 shadow-sm transition hover:scale-105 hover:border-[#0A7BBF]"
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${item.bg} text-xs ${item.text}`}>
                {item.icon}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1E3A5F]">
                {item.label}
              </span>
            </div>
          ))}

          {/* Track 2 (Duplicate for infinite seamless loop) */}
          {runningTickerItems.map((item, idx) => (
            <div
              key={`ticker-2-${idx}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#DCE4EC] bg-white px-3.5 py-1.5 shadow-sm transition hover:scale-105 hover:border-[#0A7BBF]"
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${item.bg} text-xs ${item.text}`}>
                {item.icon}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1E3A5F]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
