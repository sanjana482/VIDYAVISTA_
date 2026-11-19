"use client";

import { useEffect, useState } from "react";
import { submitCounsellorRequest, type OpenCounsellorOptions } from "../lib/counsellor";

const CLASS_OPTIONS = [
  "Toddler / Pre-Nursery",
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];

const BOARD_OPTIONS = ["Any / Not Sure", "CBSE", "ICSE", "IB", "State Board", "Cambridge"];

const POPULAR_CITIES = ["Indore", "Bhopal", "Delhi NCR", "Mumbai", "Pune", "Bengaluru", "Hyderabad", "Jaipur"];

export default function CounsellorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [childClass, setChildClass] = useState("Class 1");
  const [city, setCity] = useState("");
  const [board, setBoard] = useState("CBSE");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("Website");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Listen for custom trigger event
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<OpenCounsellorOptions>;
      const detail = customEvent.detail || {};
      if (detail.mobile) {
        setMobile(detail.mobile.replace(/\D/g, "").slice(0, 10));
      }
      if (detail.source) setSource(detail.source);
      if (detail.child_class) setChildClass(detail.child_class);
      if (detail.city) setCity(detail.city);
      setError("");
      setSuccess(false);
      setIsOpen(true);
    };

    window.addEventListener("open-counsellor-modal", handleOpen);

    // Also global click listener for any element with data-open-counsellor or href="#talk-to-us" or href="/counselling"
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const trigger = target.closest(
        "[data-open-counsellor], [data-counsellor-trigger], a[href='#talk-to-us'], a[href='#counselling'], a[href='/counselling'], a[href$='/counselling']"
      );
      if (trigger) {
        e.preventDefault();
        const customSource = trigger.getAttribute("data-source") || "Website Link";
        const customCity = trigger.getAttribute("data-city") || "";
        const customClass = trigger.getAttribute("data-class") || "";
        window.dispatchEvent(
          new CustomEvent("open-counsellor-modal", {
            detail: {
              source: customSource,
              city: customCity,
              child_class: customClass,
            },
          })
        );
      }
    };

    document.addEventListener("click", handleGlobalClick);

    return () => {
      window.removeEventListener("open-counsellor-modal", handleOpen);
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10 || !/^[6-9]/.test(cleanMobile)) {
      setError("Please enter a valid 10-digit Indian mobile number (starts with 6-9).");
      return;
    }

    setLoading(true);
    try {
      await submitCounsellorRequest({
        name: cleanName,
        mobile: cleanMobile,
        child_class: childClass,
        city: city.trim(),
        board: board === "Any / Not Sure" ? "" : board,
        notes: notes.trim(),
        source: source || "Counsellor Panel",
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#091E33]/70 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 transition-all max-h-[92vh] flex flex-col">
        {/* Top Header Gradient Bar */}
        <div className="relative bg-gradient-to-r from-[#091E33] via-[#0A5C91] to-[#0795DC] px-6 py-6 text-white sm:px-8">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 hover:bg-white/20 transition"
            aria-label="Close dialog"
          >
            ✕
          </button>

          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-200 border border-white/20 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            100% Free School Counselling
          </div>

          <h2 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white">
            Talk to an Admission Counsellor
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-sky-100">
            Share a few quick details to get free guidance on schools, fees, admission dates & campus visits.
          </p>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto px-6 py-6 sm:px-8 flex-1">
          {success ? (
            /* Success State */
            <div className="py-6 text-center animate-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-sm">
                <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-2xl font-black text-[#0B2A47]">
                Callback Requested!
              </h3>
              <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto leading-6">
                Thank you, <strong className="text-slate-900">{name}</strong>! Our expert school counsellor will call you on{" "}
                <strong className="text-[#0795DC]">+91 {mobile}</strong> shortly.
              </p>

              <div className="mt-5 rounded-2xl bg-sky-50 border border-sky-100 p-4 text-xs text-sky-900 text-left space-y-1.5">
                <p className="font-bold">What happens next?</p>
                <p className="text-slate-600">✓ Free 1-on-1 shortlist matching your budget & location.</p>
                <p className="text-slate-600">✓ Fee structure comparison & scholarship information.</p>
                <p className="text-slate-600">✓ Direct campus tour & admission assistance.</p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="mt-6 w-full rounded-2xl bg-[#0B2A47] py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
              >
                Done / Close
              </button>
            </div>
          ) : (
            /* Form Inputs */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Parent Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Your Name <span className="text-[#EC0E58]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0795DC] focus:ring-2 focus:ring-[#0795DC]/20"
                />
              </div>

              {/* 2. Mobile Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  10-Digit Mobile Number <span className="text-[#EC0E58]">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-slate-400 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-slate-200 pl-12 pr-4 py-3 text-sm font-mono text-slate-900 outline-none transition focus:border-[#0795DC] focus:ring-2 focus:ring-[#0795DC]/20"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Our counsellor will call you on this number.</p>
              </div>

              {/* 3. Class & Board in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Admission for Class
                  </label>
                  <select
                    value={childClass}
                    onChange={(e) => setChildClass(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0795DC] focus:ring-2 focus:ring-[#0795DC]/20 bg-white"
                  >
                    {CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Preferred Board
                  </label>
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0795DC] focus:ring-2 focus:ring-[#0795DC]/20 bg-white"
                  >
                    {BOARD_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. City / Location */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  City / Location Preferred
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bhopal, Indore, Delhi, Mumbai..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0795DC] focus:ring-2 focus:ring-[#0795DC]/20"
                />

                {/* Quick city suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {POPULAR_CITIES.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className="rounded-full bg-slate-100 hover:bg-sky-100 hover:text-sky-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Optional Note / Specific Requirement */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Any specific requirement? <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Need boarding with swimming pool & sports"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#0795DC] focus:ring-2 focus:ring-[#0795DC]/20"
                />
              </div>

              {/* Submit CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#0A5C91] via-[#0795DC] to-[#0A5C91] py-3.5 text-sm sm:text-base font-extrabold text-white shadow-lg shadow-sky-500/25 transition hover:opacity-95 hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <span>Request Free Callback →</span>
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-400">
                🔒 100% Privacy Guarantee · We never spam your phone.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
