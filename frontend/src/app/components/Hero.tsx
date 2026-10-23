
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_PREF,
  readPreference,
  savePreference,
  type SchoolTypeLabel,
} from "../lib/preferences";

const cityList = [
  "Mumbai",
  "Thane",
  "Navi Mumbai",
  "Pune",
  "Nashik",
  "Nagpur",
  "Bengaluru",
  "New Delhi",
  "Jaipur",
  "Ahmedabad",
  "Surat",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Lucknow",
  "Noida",
  "Gurugram",
  "Faridabad",
  "Ghaziabad",
  "Bhopal",
  "Indore",
  "Vadodara",
  "Mysuru",
  "Kochi",
  "Patna",
  "Chandigarh",
];

const stateList = [
  "Maharashtra",
  "Delhi",
  "Gujarat",
  "Karnataka",
  "Rajasthan",
  "Uttar Pradesh",
  "Madhya Pradesh",
  "Tamil Nadu",
  "Telangana",
  "West Bengal",
  "Haryana",
  "Kerala",
  "Punjab",
  "Bihar",
  "Goa",
  "Andhra Pradesh",
  "Odisha",
  "Assam",
  "Jharkhand",
  "Uttarakhand",
];

const schoolTypes: SchoolTypeLabel[] = [
  "Boarding Schools",
  "Day Schools",
  "Day - Boarding",
];

export default function Hero() {
  const router = useRouter();
  // First visit => Boarding Schools is the default.
  const [schoolType, setSchoolType] = useState<SchoolTypeLabel>(DEFAULT_PREF.type);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  // Returning visitor (refresh / reopened website) => restore what they selected last time.
  useEffect(() => {
    const saved = readPreference();
    if (saved) {
      setSchoolType(saved.type);
      setSelectedLocation(saved.location);
    }
  }, []);

  const isBoarding = schoolType === "Boarding Schools";
  const locationLabel = isBoarding ? "State" : "City";

  const locations = useMemo(() => {
    const list = isBoarding ? stateList : cityList;
    return list.filter((item) =>
      item.toLowerCase().includes(search.trim().toLowerCase())
    );
  }, [isBoarding, search]);

  // Switching type changes the kind of location (City <-> State), so the old location is cleared.
  function changeType(type: SchoolTypeLabel) {
    if (type === schoolType) return;
    setSchoolType(type);
    setSearch("");
    setSelectedLocation("");
    savePreference({ type, location: "" });
  }

  function chooseSchoolType(type: SchoolTypeLabel) {
    changeType(type);
    setModalOpen(true);
  }

  function confirmLocation() {
    savePreference({ type: schoolType, location: selectedLocation });
    setModalOpen(false);
  }

  function searchSchools() {
    if (!selectedLocation) {
      setSearch("");
      setModalOpen(true);
      return;
    }

    savePreference({ type: schoolType, location: selectedLocation });

    const params = new URLSearchParams({
      type: schoolType,
      [isBoarding ? "state" : "city"]: selectedLocation,
    });

    router.push(`/schools?${params.toString()}`);
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
              onClick={() => {
                setSearch("");
                setModalOpen(true);
              }}
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
                A place where every child's potential matters.
              </h2>
            </div>
          </div>

          <div className="absolute -bottom-5 right-3 z-10 rounded-2xl border border-[#D7DEE7] bg-[#F3F8FB] p-4 shadow-xl sm:right-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAE5EC] text-xl">
                🎓
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

      {/* Location selector modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#12304A]/65 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-title"
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white bg-gradient-to-br from-[#FAFCFD] via-[#F4F8FA] to-[#FCEDF2] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#DDE3E9] bg-white/70 p-5 sm:p-6">
              <div>
                <span className="inline-block rounded-full bg-[#DDEAF2] px-3 py-1 text-xs font-bold text-[#0A5C91]">
                  VIDYAVISTA LOCATION FINDER
                </span>
                <h2
                  id="location-title"
                  className="mt-3 text-xl font-extrabold text-[#12304A] sm:text-2xl"
                >
                  Where are you looking for schools?
                </h2>
                <p className="mt-2 text-sm text-[#687789]">
                  Choose a type and select your preferred location.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close location selector"
                onClick={() => setModalOpen(false)}
                className="rounded-xl bg-[#E7ECF1] px-3 py-1 text-2xl text-[#466281] transition hover:bg-[#D3DCE7]"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 border-b border-[#DDE3E9] p-5 lg:grid-cols-[1fr_290px] sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {schoolTypes.map((type, index) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => changeType(type)}
                    className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                      schoolType === type
                        ? [
                            "border-[#0A7BBF] bg-[#DDEAF2] text-[#0A5C91]",
                            "border-[#EC0E58] bg-[#FAE5EC] text-[#B30E49]",
                            "border-[#6E8BAD] bg-[#E5EAF0] text-[#39506B]",
                          ][index]
                        : "border-[#DEE3E8] bg-white text-[#4E5A68] hover:border-[#A8B8CB]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-[#C9D3DF] bg-white px-4 focus-within:border-[#0A7BBF] focus-within:ring-2 focus-within:ring-[#DDEAF2]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0 text-[#0A7BBF]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 4 4" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${locationLabel.toLowerCase()}...`}
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#12304A] outline-none placeholder:text-[#939FAD]"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#687789]">
                  {isBoarding ? "Select a state" : "Popular cities"}
                </h3>
                <span className="rounded-full bg-[#FAE5EC] px-3 py-1 text-xs font-bold text-[#B30E49]">
                  {locations.length} locations
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {locations.map((location, index) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => setSelectedLocation(location)}
                    className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                      selectedLocation === location
                        ? "border-[#0A7BBF] bg-[#DDEAF2] text-[#0A5C91] shadow-sm"
                        : [
                            "border-[#DCE2E9] bg-white hover:border-[#6ABEEE]",
                            "border-[#F3DDE4] bg-[#FFF7FA] hover:border-[#F287AB]",
                            "border-[#CDD7E3] bg-[#F3F8FC] hover:border-[#97ACC4]",
                            "border-[#D9E1EA] bg-[#F7FAFD] hover:border-[#AFBFD2]",
                          ][index % 4] + " text-[#404A56]"
                    }`}
                  >
                    <span>{location}</span>
                    {selectedLocation === location && (
                      <span className="font-extrabold text-[#0A7BBF]">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {locations.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#C9D3DF] bg-white/70 px-4 py-10 text-center">
                  <p className="font-bold text-[#12304A]">
                    No matching locations
                  </p>
                  <p className="mt-2 text-sm text-[#687789]">
                    Try searching with a different name.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#DDE3E9] bg-white/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm text-[#5C6A7B]">
                {selectedLocation
                  ? `Selected ${locationLabel.toLowerCase()}: ${selectedLocation}`
                  : `Choose a ${locationLabel.toLowerCase()} to continue.`}
              </p>
              <button
                type="button"
                disabled={!selectedLocation}
                onClick={confirmLocation}
                className="rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 py-3 font-extrabold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
