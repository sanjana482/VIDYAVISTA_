"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_PREF,
  PREF_EVENT,
  readPreference,
  savePreference,
  type SchoolTypeLabel,
} from "../lib/preferences";
import { openLocationPicker } from "../lib/places";
import { listingHref } from "../lib/links";
import Icon from "./Icon";

const schoolTypes: SchoolTypeLabel[] = [
  "Boarding Schools",
  "Day Schools",
  "Play School",
];

export default function Hero() {
  const router = useRouter();
  // First visit => Boarding Schools is the default.
  const [schoolType, setSchoolType] = useState<SchoolTypeLabel>(DEFAULT_PREF.type);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Saved choice (cookie) -> Hero. Also refreshes when the location panel saves a new choice.
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

  // Type badalne par location ka kind (State <-> City) badal jata hai, isliye purani location hat jati hai.
  function changeType(type: SchoolTypeLabel) {
    if (type === schoolType) return;
    setSchoolType(type);
    setSelectedLocation("");
    savePreference({ type, location: "" });
  }

  // type button dabane par: type set karo, phir location panel kholo
  function chooseSchoolType(type: SchoolTypeLabel) {
    changeType(type);
    openLocationPicker(type);
  }

  function searchSchools() {
    if (!selectedLocation) {
      openLocationPicker();
      return;
    }

    savePreference({ type: schoolType, location: selectedLocation });
    router.push(
      listingHref({
        type: schoolType,
        [isBoarding ? "state" : "city"]: selectedLocation,
      })
    );
  }

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#DDEAF1] via-[#E6F0F8] to-[#F6DDE5]">
      {/* Colourful decorative shapes */}
      <div className="pointer-events-none absolute -right-24 -top-20 -z-10 h-96 w-96 rounded-full bg-[#FF9DBB]/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 -z-10 h-96 w-96 rounded-full bg-[#56B5EC]/40 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-72 w-72 rounded-full bg-[#F5C5D5]/35 blur-3xl" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* Left side */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#A1D6F4] bg-white/80 px-4 py-2 text-sm font-bold text-[#0A6AA8] shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-[#EC0E58]" />
            A Brighter Future Begins Here
          </div>

          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-[#12304A] sm:text-5xl lg:text-6xl">
            Find the School
            <span className="mt-1 block bg-gradient-to-r from-[#0A6AA8] via-[#0B86C8] to-[#EC0E58] bg-clip-text text-transparent">
              That Feels Right.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-8 text-[#4F5B69] sm:text-lg">
            Explore schools, compare facilities and fees, and find a learning
            environment where your child can learn, grow and shine.
          </p>

          {/* Search card */}
          <div className="mt-8 rounded-3xl border border-white/90 bg-gradient-to-br from-white via-[#F9FBFD] to-[#E5EEF4] p-5 shadow-2xl shadow-[#0D4E74]/10 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-[#12304A]">
                Find your ideal school
              </h2>
              <span className="rounded-full bg-[#DDE4EC] px-3 py-1 text-xs font-bold text-[#3E5773]">
                Start here
              </span>
            </div>

            <p className="mt-2 text-sm text-[#687789]">
              Select a school type to get started.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {schoolTypes.map((type, index) => {
                const active = schoolType === type;
                const accent = [
                  "border-[#0A7BBF] bg-[#DDEAF2] text-[#0A5C91]",
                  "border-[#EC0E58] bg-[#FAE5EC] text-[#B30E49]",
                  "border-[#6E8BAD] bg-[#E5EAF0] text-[#39506B]",
                ][index];

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => chooseSchoolType(type)}
                    className={`rounded-xl border px-3 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${
                      active
                        ? `${accent} shadow-sm`
                        : "border-[#DDE2E8] bg-white text-[#4E5A68] hover:border-[#A8B8CB]"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => openLocationPicker()}
              className="mt-5 flex w-full items-center gap-3 rounded-xl border border-[#C9D3DF] bg-white px-4 py-4 text-left transition hover:border-[#0A7BBF] hover:bg-[#F5F9FB]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DDEAF2] text-xl text-[#0A6AA8]">
                ⌖
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-[#687789]">
                  Select {locationLabel}
                </span>
                <span className="mt-1 block truncate font-bold text-[#12304A]">
                  {selectedLocation || `Choose your ${locationLabel.toLowerCase()}`}
                </span>
              </span>
              <span className="text-sm font-bold text-[#0A7BBF]">
                Change
              </span>
            </button>

            <button
              type="button"
              onClick={searchSchools}
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#0A5C91] via-[#0A7BBF] to-[#5C799A] px-5 py-4 font-extrabold text-white shadow-lg shadow-[#0A5C91]/20 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" />
              </svg>
              Search Schools
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-[#C1CDDA] bg-white/70 px-4 py-2 text-sm font-semibold text-[#0F5C89]">
              Explore options
            </span>
            <span className="rounded-full border border-[#B5C4D5] bg-[#EEF5FA]/80 px-4 py-2 text-sm font-semibold text-[#39506B]">
              Compare school fees
            </span>
          </div>
        </div>

        {/* Right side image */}
        <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
          <div className="absolute -right-3 -top-3 h-32 w-32 rounded-[2rem] bg-[#FF9DBB] sm:-right-5" />
          <div className="absolute -bottom-5 -left-4 h-36 w-36 rounded-[2rem] bg-[#6ABEEE]" />

          <div className="absolute -left-3 top-1/3 z-10 h-20 w-3 rounded-full bg-[#F0467F] sm:-left-5" />

          <div className="relative overflow-hidden rounded-[2rem] border-[6px] border-white shadow-2xl shadow-[#12304A]/15">
            <img
              src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=85"
              alt="School campus and learning environment"
              className="h-[350px] w-full object-cover sm:h-[470px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#12304A]/80 via-[#12304A]/5 to-transparent" />

            <div className="absolute left-5 top-5 rounded-xl border border-white/60 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0A7BBF]">
                Discover
              </p>
              <p className="mt-1 font-extrabold text-[#12304A]">
                New possibilities
              </p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
              <span className="inline-block rounded-full bg-[#FF9DBB] px-3 py-1 text-xs font-extrabold text-[#3B0B1E]">
                LEARN · GROW · SHINE
              </span>
              <h2 className="mt-4 max-w-md text-2xl font-extrabold leading-snug sm:text-3xl">
                A place where every child&apos;s potential matters.
              </h2>
            </div>
          </div>

          <div className="absolute -bottom-5 right-3 z-10 rounded-2xl border border-[#D7DEE7] bg-[#F3F8FB] p-4 shadow-xl sm:right-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAE5EC] text-xl">
                <Icon name="graduation" className="h-6 w-6 text-[#C8104F]" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-[#12304A]">
                  Your journey starts
                </p>
                <p className="mt-1 text-xs font-medium text-[#687789]">
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