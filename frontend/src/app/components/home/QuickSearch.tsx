"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PREF,
  PREF_EVENT,
  readPreference,
  savePreference,
  type SchoolTypeLabel,
} from "../../lib/preferences";
import { openLocationPicker } from "../../lib/places";
import Icon from "../Icon";
import SchoolSearchBar, { type SearchSchool } from "../SchoolSearchBar";

const schoolTypes: SchoolTypeLabel[] = ["Boarding Schools", "Day Schools", "Play School"];

/** The location picker + school-name search from the old hero, now a calm band lower on the page. */
export default function QuickSearch({ schools = [] }: { schools?: SearchSchool[] }) {
  const [schoolType, setSchoolType] = useState<SchoolTypeLabel>(DEFAULT_PREF.type);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Saved choice (cookie) -> here. Also refreshes when the location panel saves a new choice.
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

  // Boarding picks a state, day / play pick a city, so the old location is dropped when the type changes.
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
    <section id="search" className="relative z-30 bg-[#F6F9FC] py-14 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="vv-display text-3xl font-extrabold text-[#0B2A47] sm:text-4xl">Search by location or school name</h2>
        <p className="mx-auto mt-3 max-w-xl text-[#4A5C70]">Choose a type, pick your {locationLabel.toLowerCase()}, then type any school name.</p>

        <div className="mx-auto mt-8 max-w-3xl rounded-[28px] border border-white bg-white p-3 text-left shadow-[0_24px_60px_-30px_rgba(23,36,51,0.45)] sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap gap-1.5">
              {schoolTypes.map((type) => {
                const active = schoolType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => chooseSchoolType(type)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active ? "bg-[#0B2A47] text-white" : "bg-[#EEF4FA] text-[#3E4A58] hover:bg-[#DCE9F5]"
                    }`}
                  >
                    {type.replace(" Schools", "")}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => openLocationPicker()}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-[#0A5C91] hover:bg-[#EAF4FB]"
            >
              <Icon name="mapPin" className="h-3.5 w-3.5" />
              {selectedLocation || `Pick a ${locationLabel.toLowerCase()}`}
            </button>
          </div>
          <SchoolSearchBar schools={schools} schoolType={schoolType} location={selectedLocation} />
        </div>
      </div>
    </section>
  );
}
