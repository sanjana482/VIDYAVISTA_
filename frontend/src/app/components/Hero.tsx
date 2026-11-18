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

const schoolTypes: SchoolTypeLabel[] = [
  "Boarding Schools",
  "Day Schools",
  "Play School",
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
    <section className="relative z-40 bg-gradient-to-b from-[#EBF3F8] via-[#F4F8FA] to-white pb-16 pt-12 sm:pb-24 sm:pt-16">
      {/* Background Campus Visual with Elegant Soft Overlay */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Subtle decorative glow orbs */}
        <div className="absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full bg-[#FF9DBB]/20 blur-3xl" />
        <div className="absolute -left-20 top-40 h-[500px] w-[500px] rounded-full bg-[#56B5EC]/20 blur-3xl" />
        {/* Background school campus image with transparency */}
        <div className="absolute inset-0 opacity-[0.07] mix-blend-multiply">
          <img
            src="/images/hero/hero.jpg"
            alt=""
            className="h-full w-full object-cover object-center filter saturate-50"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F4F8FA]/60 to-white" />
      </div>

      <div className="relative mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Top Header: Centered & Prominent */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#A1D6F4] bg-white/95 px-4 py-1.5 text-xs sm:text-sm font-bold text-[#0A6AA8] shadow-sm backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EC0E58] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#EC0E58]" />
            </span>
            A Brighter Future Begins Here
          </div>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-[#12304A] sm:text-5xl lg:text-6xl">
            Find the School{" "}
            <span className="mt-1 block bg-gradient-to-r from-[#0A6AA8] via-[#0B86C8] to-[#EC0E58] bg-clip-text text-transparent">
              That Feels Right.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#4F5B69] sm:text-lg">
            Explore schools, compare facilities and fees, and find a learning
            environment where your child can learn, grow and shine.
          </p>
        </div>

        {/* Central Search Card (Matching Image 2 with Prominent Tabs & Location Box) */}
        <div className="relative z-50 mx-auto mt-8 max-w-4xl rounded-3xl border border-white/90 bg-white/95 p-5 shadow-2xl shadow-[#0D4E74]/12 backdrop-blur sm:p-8">
          {/* Card Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#12304A]">
                Find your ideal school
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#687789]">
                Select a school type to get started.
              </p>
            </div>
            <span className="rounded-full bg-[#E5EEF5] px-3.5 py-1 text-xs font-bold text-[#3E5773]">
              Start here
            </span>
          </div>

          {/* School Type Buttons (Image 2 style: Big, prominent 3-button row) */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {schoolTypes.map((type) => {
              const active = schoolType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => chooseSchoolType(type)}
                  className={`rounded-2xl border-2 px-4 py-3.5 text-center text-sm sm:text-base font-extrabold transition-all duration-200 ${
                    active
                      ? "border-[#0A7BBF] bg-[#DDEAF2] text-[#0A5C91] shadow-md scale-[1.02]"
                      : "border-[#DCE4EC] bg-white text-[#4E5A68] hover:border-[#B5C4D5] hover:bg-[#F8FBFE]"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {/* Large Location Selector Card (Image 2 style) */}
          <button
            type="button"
            onClick={() => openLocationPicker(schoolType)}
            className="mt-4 flex w-full items-center justify-between gap-4 rounded-2xl border-2 border-[#DCE4EC] bg-white p-4 text-left transition-all duration-200 hover:border-[#0A7BBF] hover:bg-[#F8FBFE] hover:shadow-sm sm:p-5"
          >
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#DDEAF2] text-2xl text-[#0A6AA8]">
                ⌖
              </span>
              <div className="min-w-0">
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#687789]">
                  Select {locationLabel}
                </span>
                <span className="mt-0.5 block truncate text-base sm:text-xl font-extrabold text-[#12304A]">
                  {selectedLocation || `Choose your ${locationLabel.toLowerCase()}`}
                </span>
              </div>
            </div>
            <span className="shrink-0 text-sm sm:text-base font-extrabold text-[#0A7BBF] hover:underline">
              Change
            </span>
          </button>

          {/* Direct Search Bar */}
          <div className="mt-6 relative z-50">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0A5C91]">
                Direct School Search
              </span>
              <span className="text-xs font-semibold text-[#707E8F]">
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

        {/* Quick Tags and Age Calculator below Search Card */}
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-3">
          <span className="rounded-full border border-[#C1CDDA] bg-white/90 px-4 py-2 text-xs sm:text-sm font-semibold text-[#0F5C89] shadow-sm">
            Explore options
          </span>
          <span className="rounded-full border border-[#B5C4D5] bg-[#EEF5FA]/90 px-4 py-2 text-xs sm:text-sm font-semibold text-[#39506B] shadow-sm">
            Compare school fees
          </span>
          <button
            type="button"
            onClick={() => setShowCalc((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#C9D8E8] bg-white px-4 py-2 text-xs sm:text-sm font-bold text-[#0A5C91] shadow-sm transition hover:border-[#0A7BBF] hover:bg-[#F8FBFE]"
          >
            <Icon name="graduation" className="h-4 w-4 text-[#0A6AA8]" />
            🎯 Age Eligibility Calculator
            <span className="text-xs text-[#0A7BBF]">{showCalc ? "▲" : "▼"}</span>
          </button>
        </div>

        {showCalc && (
          <div className="mx-auto mt-4 max-w-4xl animate-[fadeIn_0.3s_ease]">
            <AgeCalculator />
          </div>
        )}
      </div>
    </section>
  );
}
