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

const trustBadges = [
  { icon: "✅", label: "Verified Schools" },
  { icon: "⭐", label: "Authentic Reviews" },
  { icon: "📞", label: "Free Counselling" },
  { icon: "🔒", label: "Safe & Secure" },
];

export default function Hero({ schools = [] }: { schools?: SearchSchool[] }) {
  const [heroBroken, setHeroBroken] = useState(false);
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
    <section className="relative z-40 overflow-hidden bg-gradient-to-br from-[#EBF3F8] via-[#F4F8FA] to-[#FCEEF2]">
      {/* Decorative background blurs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-24 -top-20 h-96 w-96 rounded-full bg-[#FF9DBB]/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-[#56B5EC]/25 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 rounded-full bg-[#F5C5D5]/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-[1720px] items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:px-8 xl:px-12">
        {/* Left Column: Heading, Badges & Search */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#A1D6F4] bg-white/90 px-4 py-1.5 text-xs sm:text-sm font-bold text-[#0A6AA8] shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EC0E58] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#EC0E58]" />
            </span>
            A Brighter Future Begins Here
          </div>

          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-[#12304A] sm:text-5xl lg:text-6xl">
            Find the School{" "}
            <span className="mt-1 block bg-gradient-to-r from-[#0A6AA8] via-[#0B86C8] to-[#EC0E58] bg-clip-text text-transparent">
              That Feels Right.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-[#4F5B69] sm:text-lg">
            Explore schools, compare facilities and fees, and find a learning
            environment where your child can learn, grow and shine.
          </p>

          {/* Trust Badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            {trustBadges.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#C5D9EB] bg-white/80 px-3 py-1 text-xs font-semibold text-[#2E4D65] shadow-sm"
              >
                <span>{b.icon}</span>
                {b.label}
              </span>
            ))}
          </div>

          {/* Sleek Search Card (Integrated from Image 2) */}
          <div className="relative z-30 mt-7 rounded-3xl border border-white/90 bg-white/95 p-5 shadow-2xl shadow-[#0D4E74]/10 backdrop-blur sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#12304A]">
                  Search by location or school name
                </h2>
                <p className="mt-0.5 text-xs text-[#687789]">
                  Choose a type, pick your {locationLabel.toLowerCase()}, then type any school name.
                </p>
              </div>
            </div>

            {/* School Type Pills + Location Indicator */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#E8EEF5] pb-3">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {schoolTypes.map((type) => {
                  const active = schoolType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => chooseSchoolType(type)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition duration-200 ${
                        active
                          ? "bg-[#0B2A47] text-white shadow-sm scale-105"
                          : "bg-[#EEF4FA] text-[#3E4A58] hover:bg-[#DCE9F5]"
                      }`}
                    >
                      {type.replace(" Schools", "")}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => openLocationPicker(schoolType)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#C9D8E8] bg-[#F5F9FD] px-3 py-1.5 text-xs font-bold text-[#0A6AA8] transition hover:border-[#0A7BBF] hover:bg-white"
              >
                <Icon name="mapPin" className="h-3.5 w-3.5 text-[#EC0E58]" />
                <span>{selectedLocation || `Pick a ${locationLabel.toLowerCase()}`}</span>
                <span className="text-[10px] text-[#0A7BBF] underline ml-0.5">Change</span>
              </button>
            </div>

            {/* Always-open prominent search bar with instant preview */}
            <div className="mt-4 relative z-50">
              <SchoolSearchBar
                schools={schools}
                schoolType={schoolType}
                location={selectedLocation}
              />
            </div>
          </div>

          {/* Quick tags and Age Calculator Toggle */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-[#C1CDDA] bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-[#0F5C89] shadow-sm">
              Explore options
            </span>
            <span className="rounded-full border border-[#B5C4D5] bg-[#EEF5FA]/80 px-3.5 py-1.5 text-xs font-semibold text-[#39506B] shadow-sm">
              Compare school fees
            </span>
            <button
              type="button"
              onClick={() => setShowCalc((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#C9D8E8] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0A5C91] shadow-sm transition hover:border-[#0A7BBF]"
            >
              <Icon name="graduation" className="h-3.5 w-3.5 text-[#0A6AA8]" />
              🎯 Age Calculator
              <span className="text-[10px] text-[#0A7BBF]">{showCalc ? "▲" : "▼"}</span>
            </button>
          </div>

          {showCalc && (
            <div className="mt-3 animate-[fadeIn_0.3s_ease]">
              <AgeCalculator />
            </div>
          )}
        </div>

        {/* Right Column: Hero Visual with Animations */}
        <div className="vv-rise relative mx-auto w-full max-w-xl lg:ml-auto">
          {/* Decorative shapes with animations */}
          <div className="vv-drift absolute -right-4 -top-4 h-36 w-36 rounded-[2.5rem] bg-[#FF9DBB]/80 sm:-right-6" />
          <div
            className="vv-drift absolute -bottom-6 -left-5 h-40 w-40 rounded-[2.5rem] bg-[#6ABEEE]/70"
            style={{ animationDelay: "-4s" }}
          />
          <div className="absolute -left-3 top-1/3 z-10 h-24 w-3.5 rounded-full bg-[#EC0E58]" />

          {/* Main Visual Frame */}
          <div className="relative overflow-hidden rounded-[2rem] border-[6px] border-white shadow-2xl shadow-[#12304A]/20">
            <img
              src={heroBroken ? "/images/school-placeholder.svg" : "/images/hero/hero.jpg"}
              onError={() => setHeroBroken(true)}
              alt="School campus and learning environment"
              className="h-[360px] w-full object-cover transition-transform duration-[6000ms] ease-out hover:scale-105 sm:h-[480px] lg:h-[510px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#12304A]/85 via-[#12304A]/10 to-transparent" />

            {/* Floating Badge Top-Left */}
            <div className="vv-float-a absolute left-4 top-4 rounded-xl border border-white/70 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur sm:left-5 sm:top-5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#0A7BBF]">
                DISCOVER
              </p>
              <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-[#12304A]">
                New possibilities
              </p>
            </div>

            {/* Floating Live Badge Top-Right */}
            <div
              className="vv-float-a absolute right-4 top-4 rounded-xl border border-white/70 bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur sm:right-5 sm:top-5"
              style={{ animationDelay: "-1.5s" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EC0E58] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#EC0E58]" />
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#EC0E58]">Live</span>
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-[#12304A]">
                4,500+ Schools
              </p>
            </div>

            {/* Bottom Caption Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
              <span className="inline-block rounded-full bg-[#FF9DBB] px-3 py-1 text-[11px] font-extrabold tracking-wide text-[#3B0B1E]">
                LEARN · GROW · SHINE
              </span>
              <h2 className="mt-3 max-w-md text-xl font-extrabold leading-snug sm:text-2xl lg:text-3xl text-white">
                A place where every child&apos;s potential matters.
              </h2>
            </div>
          </div>

          {/* Floating Badge Bottom-Right */}
          <div className="vv-float-b absolute -bottom-5 right-3 z-10 rounded-2xl border border-white/90 bg-white/95 p-3.5 shadow-xl sm:right-6 sm:p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAE5EC] text-xl">
                <Icon name="graduation" className="h-6 w-6 text-[#C8104F]" />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-[#12304A]">
                  Your journey starts
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#687789]">
                  With the right school
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
