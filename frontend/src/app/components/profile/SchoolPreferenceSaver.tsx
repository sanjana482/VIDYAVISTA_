"use client";

/**
 * Invisible client component that auto-saves the school's city + type
 * to the VidyaVista preference cookie whenever a user visits a school
 * profile page — even without having picked a location first.
 *
 * This ensures:
 *  - Next visit to home / listing → that city & school type are pre-selected.
 *  - Boarding school visit → saves the school's state as location (not city).
 */

import { useEffect } from "react";
import { savePreference, type SchoolTypeLabel } from "../../lib/preferences";

interface Props {
  schoolType: string;   // e.g. "Day School" | "Boarding School" | "Play School"
  city: string;
  state?: string;
}

export default function SchoolPreferenceSaver({ schoolType, city, state }: Props) {
  useEffect(() => {
    // Map school data type → cookie label
    const typeMap: Record<string, SchoolTypeLabel> = {
      "Boarding School": "Boarding Schools",
      "Day School": "Day Schools",
      "Play School": "Play School",
    };
    const heroType: SchoolTypeLabel = typeMap[schoolType] ?? "Day Schools";

    // Boarding → save state; others → save city
    const isBoarding = schoolType === "Boarding School";
    const location = isBoarding ? (state ?? city) : city;

    if (location) {
      savePreference({ type: heroType, location });
    }
  // Run once per school visit (city / type won't change mid-render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null; // invisible
}
