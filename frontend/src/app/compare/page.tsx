"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ApplyModal from "../components/profile/ApplyModal";
import Icon from "../components/Icon";
import { fetchAllSchoolsSafe } from "../lib/schoolsApi";
import { formatFee, stateFor, type School } from "../data/schools";
import { schoolPath } from "../lib/seo";
import { readPreference } from "../lib/preferences";

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected school slots (max 3)
  const [selectedSchools, setSelectedSchools] = useState<(School | null)[]>([null, null, null]);

  // Enquiry Modal state
  const [enquirySchool, setEnquirySchool] = useState<School | null>(null);

  // Search input state for empty slots
  const [activeSlotSearch, setActiveSlotSearch] = useState<number | null>(null);
  const [slotSearchQuery, setSlotSearchQuery] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fetch all schools
  useEffect(() => {
    let mounted = true;
    fetchAllSchoolsSafe().then((data) => {
      if (mounted) {
        setAllSchools(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Sync selected schools from URL ?ids=1,2,3
  useEffect(() => {
    if (allSchools.length === 0) return;
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((x) => !isNaN(x));

      const matched: (School | null)[] = [null, null, null];
      ids.slice(0, 3).forEach((id, idx) => {
        const found = allSchools.find((s) => s.id === id);
        if (found) matched[idx] = found;
      });
      setSelectedSchools(matched);
    } else {
      // If no IDs given, optionally pre-fill Slot 0 with a top school matching user cookie or first top school
      const pref = readPreference();
      let defaultSchool: School | undefined;
      if (pref?.location) {
        defaultSchool = allSchools.find(
          (s) =>
            s.city?.toLowerCase() === pref.location.toLowerCase() ||
            s.state?.toLowerCase() === pref.location.toLowerCase()
        );
      }
      if (!defaultSchool && allSchools.length > 0) {
        defaultSchool = allSchools[0];
      }
      if (defaultSchool) {
        setSelectedSchools([defaultSchool, null, null]);
      }
    }
  }, [allSchools, searchParams]);

  // Update URL whenever selectedSchools change
  function syncUrl(newSelected: (School | null)[]) {
    const ids = newSelected.filter((s): s is School => s !== null).map((s) => s.id);
    if (ids.length > 0) {
      router.replace(`/compare?ids=${ids.join(",")}`, { scroll: false });
    } else {
      router.replace("/compare", { scroll: false });
    }
  }

  function handleAddSchool(slotIndex: number, school: School) {
    const updated = [...selectedSchools];
    updated[slotIndex] = school;
    setSelectedSchools(updated);
    setActiveSlotSearch(null);
    setSlotSearchQuery("");
    syncUrl(updated);
  }

  function handleRemoveSchool(slotIndex: number) {
    const updated = [...selectedSchools];
    updated[slotIndex] = null;
    setSelectedSchools(updated);
    syncUrl(updated);
  }

  function handleClearAll() {
    setSelectedSchools([null, null, null]);
    router.replace("/compare", { scroll: false });
  }

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setActiveSlotSearch(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter schools for slot search autocomplete
  const filteredSearchSchools = useMemo(() => {
    const q = slotSearchQuery.trim().toLowerCase();
    const alreadySelectedIds = new Set(
      selectedSchools.filter((s): s is School => s !== null).map((s) => s.id)
    );

    return allSchools
      .filter((s) => !alreadySelectedIds.has(s.id))
      .filter((s) => {
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          (s.area && s.area.toLowerCase().includes(q)) ||
          s.board.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [allSchools, slotSearchQuery, selectedSchools]);

  const activeCount = selectedSchools.filter(Boolean).length;

  return (
    <main className="min-h-screen bg-[#F6F9FC]">
      <Navbar />

      {/* Header Banner */}
      <section className="border-b border-[#D8E2EC] bg-gradient-to-b from-[#EBF4FA] via-white to-[#F6F9FC] py-10 sm:py-14">
        <div className="mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <nav aria-label="Breadcrumb" className="text-xs sm:text-sm text-[#5C6A7B]">
            <Link href="/" className="hover:text-[#0A7BBF]">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/schools" className="hover:text-[#0A7BBF]">Schools</Link>
            <span className="mx-2">›</span>
            <span className="font-semibold text-[#0B2A47]">Compare Schools</span>
          </nav>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#BDE0F5] bg-white px-3.5 py-1 text-xs font-bold text-[#0A6AA8]">
                <span>⚖️ Side-by-Side School Comparison</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0B2A47] sm:text-4xl lg:text-5xl">
                Compare Schools
              </h1>
              <p className="mt-2 max-w-2xl text-sm sm:text-base leading-6 text-[#5C6A7B]">
                Compare up to 3 schools side-by-side on fees, curriculum board, facilities, ratings,
                and class offerings to find the right fit for your child.
              </p>
            </div>

            {activeCount > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-bold text-[#4E5A68]">
                  {activeCount} of 3 schools selected
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-xl border border-[#D6DDE5] bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#C8104F] transition hover:bg-[#FDE8EF]"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Comparison Grid Section */}
      <section className="mx-auto max-w-[1720px] px-4 sm:px-6 py-8 sm:py-12 lg:px-8 xl:px-12">
        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#0795DC] border-t-transparent" />
            <p className="mt-4 text-sm font-bold text-[#5C6A7B]">Loading school directory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-6">
            <div className="min-w-[860px] rounded-3xl border border-[#D8E2EC] bg-white shadow-xl shadow-[#0B2A47]/5">
              {/* Top Row: 3 School Slot Cards */}
              <div className="grid grid-cols-3 divide-x divide-[#E1E8F0] border-b border-[#E1E8F0] bg-[#FAFBFD]">
                {[0, 1, 2].map((slotIdx) => {
                  const school = selectedSchools[slotIdx];
                  const isSearching = activeSlotSearch === slotIdx;

                  if (school) {
                    return (
                      <div key={school.id} className="relative p-5 sm:p-6 flex flex-col justify-between">
                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveSchool(slotIdx)}
                          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[#D6DDE5] bg-white text-[#707E8F] transition hover:border-[#C8104F] hover:bg-[#FDE8EF] hover:text-[#C8104F]"
                          title="Remove from comparison"
                          aria-label={`Remove ${school.name}`}
                        >
                          ✕
                        </button>

                        <div>
                          {/* Image & Logo */}
                          <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-[#DDE5ED] bg-[#E1F1FA]">
                            <img
                              src={school.image || "/images/school-placeholder.jpg"}
                              alt={school.name}
                              className="h-full w-full object-cover"
                            />
                            {school.type && (
                              <span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-extrabold uppercase text-white backdrop-blur">
                                {school.type}
                              </span>
                            )}
                          </div>

                          {/* Title & Location */}
                          <div className="mt-4 min-w-0">
                            <h3 className="line-clamp-2 text-base sm:text-lg font-extrabold text-[#0B2A47]">
                              {school.name}
                            </h3>
                            <p className="mt-1 flex items-center gap-1 text-xs text-[#5C6A7B]">
                              <span>📍</span>
                              <span className="truncate">
                                {school.area ? `${school.area}, ` : ""}
                                {school.city}
                                {school.state ? `, ${school.state}` : ""}
                              </span>
                            </p>
                          </div>

                          {/* Rating & Board */}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {school.rating > 0 ? (
                              <div className="inline-flex items-center gap-1 rounded-lg bg-[#FFF3D6] px-2 py-1 text-xs font-extrabold text-[#B45309]">
                                <span>★</span>
                                <span>{school.rating.toFixed(1)}</span>
                                <span className="text-[10px] text-[#92400E]">
                                  ({school.reviews} reviews)
                                </span>
                              </div>
                            ) : (
                              <span className="rounded-lg bg-[#F4F6F9] px-2 py-1 text-xs font-semibold text-[#707E8F]">
                                Not yet rated
                              </span>
                            )}
                            <span className="rounded-lg bg-[#E1F1FA] px-2 py-1 text-xs font-extrabold text-[#0A5C91]">
                              {school.board}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-5 space-y-2">
                          <button
                            type="button"
                            onClick={() => setEnquirySchool(school)}
                            className="vv-btn w-full rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-md shadow-[#0A5C91]/20 transition hover:-translate-y-0.5"
                          >
                            Enquire Now
                          </button>
                          <Link
                            href={schoolPath(school)}
                            className="block text-center rounded-xl border border-[#D6DDE5] bg-white py-2 text-xs font-bold text-[#0A5C91] transition hover:border-[#0795DC] hover:bg-[#F0F8FF]"
                          >
                            View Full Profile →
                          </Link>
                        </div>
                      </div>
                    );
                  }

                  // Empty Slot Card
                  return (
                    <div
                      key={`empty-${slotIdx}`}
                      ref={isSearching ? searchContainerRef : undefined}
                      className="relative flex flex-col items-center justify-center p-6 text-center"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-[#B5C8DB] bg-[#F0F6FB] text-3xl text-[#0A5C91]">
                        +
                      </div>
                      <h4 className="mt-3 text-sm font-extrabold text-[#0B2A47]">
                        Slot {slotIdx + 1}: Add School
                      </h4>
                      <p className="mt-1 text-xs text-[#707E8F]">
                        Select a school to compare side-by-side
                      </p>

                      {/* Interactive Add Trigger / Autocomplete */}
                      <div className="relative mt-4 w-full">
                        {!isSearching ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSlotSearch(slotIdx);
                              setSlotSearchQuery("");
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-[#0795DC] bg-[#E1F1FA]/60 py-2.5 text-xs font-extrabold text-[#0A5C91] transition hover:bg-[#E1F1FA]"
                          >
                            <span>🔍 Search &amp; Add School</span>
                          </button>
                        ) : (
                          <div className="relative w-full">
                            <input
                              type="text"
                              autoFocus
                              value={slotSearchQuery}
                              onChange={(e) => setSlotSearchQuery(e.target.value)}
                              placeholder="Type school name or city..."
                              className="w-full rounded-xl border-2 border-[#0795DC] bg-white px-3 py-2 text-xs font-semibold text-[#0B2A47] outline-none shadow-md"
                            />

                            {/* Dropdown Results */}
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#D6DDE5] bg-white p-1.5 shadow-2xl text-left">
                              {filteredSearchSchools.length > 0 ? (
                                filteredSearchSchools.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => handleAddSchool(slotIdx, s)}
                                    className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-[#F0F7FC] transition"
                                  >
                                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-[#E1F1FA]">
                                      {s.image ? (
                                        <img src={s.image} alt="" className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xs">🏫</div>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-bold text-[#0B2A47]">{s.name}</p>
                                      <p className="truncate text-[10px] text-[#707E8F]">
                                        {s.city} · {s.board} · {s.type}
                                      </p>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <p className="p-3 text-center text-xs text-[#707E8F]">
                                  No matching schools found.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Matrix Rows: Side-by-Side Comparison */}
              <div className="divide-y divide-[#EAEFF5] text-xs sm:text-sm">
                {/* 1. Annual Tuition Fee */}
                <div className="bg-[#FAFBFD] px-6 py-3 font-extrabold uppercase tracking-wider text-[#0A5C91] text-[11px]">
                  💰 Fee Structure
                </div>
                <div className="grid grid-cols-3 divide-x divide-[#EAEFF5] p-4 sm:p-5">
                  {[0, 1, 2].map((idx) => {
                    const s = selectedSchools[idx];
                    return (
                      <div key={idx} className="px-3">
                        <span className="block text-[11px] font-bold text-[#707E8F] uppercase">
                          Annual Tuition Fee
                        </span>
                        <span className="mt-1 block text-base sm:text-lg font-extrabold text-[#0B2A47]">
                          {s ? (s.fee > 0 ? formatFee(s.fee) : "Contact for fees") : "—"}
                        </span>
                        {s?.fee && s.fee > 0 ? (
                          <span className="text-[11px] text-[#707E8F]">
                            (~{formatFee(Math.round(s.fee / 12))}/month)
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* 2. School Type & Board */}
                <div className="bg-[#FAFBFD] px-6 py-3 font-extrabold uppercase tracking-wider text-[#0A5C91] text-[11px]">
                  🎓 Academics &amp; Affiliation
                </div>
                <div className="grid grid-cols-3 divide-x divide-[#EAEFF5] p-4 sm:p-5">
                  {[0, 1, 2].map((idx) => {
                    const s = selectedSchools[idx];
                    return (
                      <div key={idx} className="px-3 space-y-3">
                        <div>
                          <span className="block text-[11px] font-bold text-[#707E8F] uppercase">School Type</span>
                          <span className="font-bold text-[#0B2A47]">{s?.type || "—"}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-bold text-[#707E8F] uppercase">Curriculum Board</span>
                          <span className="font-bold text-[#0A5C91]">{s?.board || "—"}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-bold text-[#707E8F] uppercase">Gender</span>
                          <span className="font-semibold text-[#0B2A47]">{s?.gender || "—"}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-bold text-[#707E8F] uppercase">Classes Offered</span>
                          <span className="font-semibold text-[#0B2A47]">{s?.grades || "Nursery to 12th"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 3. Campus & Student-Teacher Ratio */}
                <div className="bg-[#FAFBFD] px-6 py-3 font-extrabold uppercase tracking-wider text-[#0A5C91] text-[11px]">
                  🏫 Campus Details &amp; Ratio
                </div>
                <div className="grid grid-cols-3 divide-x divide-[#EAEFF5] p-4 sm:p-5">
                  {[0, 1, 2].map((idx) => {
                    const s = selectedSchools[idx];
                    return (
                      <div key={idx} className="px-3 space-y-3">
                        <div>
                          <span className="block text-[11px] font-bold text-[#707E8F] uppercase">
                            Student-Teacher Ratio
                          </span>
                          <span className="font-extrabold text-[#0B2A47]">
                            {s?.profile?.ratio ? `1:${s.profile.ratio}` : "1:20 (Standard)"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-bold text-[#707E8F] uppercase">
                            Campus Size
                          </span>
                          <span className="font-semibold text-[#0B2A47]">
                            {s?.profile?.campus || "Spacious Campus"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-bold text-[#707E8F] uppercase">
                            Established Year
                          </span>
                          <span className="font-semibold text-[#0B2A47]">
                            {s?.profile?.established || "Well Established"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 4. Facilities Highlights */}
                <div className="bg-[#FAFBFD] px-6 py-3 font-extrabold uppercase tracking-wider text-[#0A5C91] text-[11px]">
                  🏀 Infrastructure &amp; Amenities
                </div>
                <div className="grid grid-cols-3 divide-x divide-[#EAEFF5] p-4 sm:p-5">
                  {[0, 1, 2].map((idx) => {
                    const s = selectedSchools[idx];
                    const facs = s?.facilities || [];
                    return (
                      <div key={idx} className="px-3">
                        {s ? (
                          <div className="flex flex-wrap gap-1.5">
                            {facs.length > 0 ? (
                              facs.map((f) => (
                                <span
                                  key={f}
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#F0F5F9] px-2 py-1 text-[11px] font-semibold text-[#0A5C91]"
                                >
                                  ✓ {f}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-[#707E8F]">Smart classes, library, playground &amp; labs</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#9EABB9]">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 5. Admission Status */}
                <div className="bg-[#FAFBFD] px-6 py-3 font-extrabold uppercase tracking-wider text-[#0A5C91] text-[11px]">
                  📅 Admissions (2027-28)
                </div>
                <div className="grid grid-cols-3 divide-x divide-[#EAEFF5] p-4 sm:p-5">
                  {[0, 1, 2].map((idx) => {
                    const s = selectedSchools[idx];
                    return (
                      <div key={idx} className="px-3">
                        {s ? (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              {s.admissionStatus === "closed" ? "Admissions Closed" : "Admissions Open 2027-28"}
                            </span>
                            <p className="text-[11px] text-[#707E8F]">
                              Direct school enquiry available through VidyaVista
                            </p>
                          </div>
                        ) : (
                          <span className="text-[#9EABB9]">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Enquiry Modal */}
      {enquirySchool && (
        <ApplyModal
          schoolName={enquirySchool.name}
          schoolId={enquirySchool.id}
          city={enquirySchool.city}
          initialOpen={true}
          onClose={() => setEnquirySchool(null)}
        />
      )}

      <Footer />
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0795DC] border-t-transparent" />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
