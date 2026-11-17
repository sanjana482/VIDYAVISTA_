"use client";

import { useEffect, useState, useRef } from "react";
import { API_URL } from "../../lib/api";
import {
  Star,
  CheckCircle2,
  Trophy,
  Music,
  IndianRupee,
  GraduationCap,
  Building2,
  ShieldCheck,
  Camera,
  X,
  UploadCloud,
  MessageSquare,
  Check,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";

export type ReviewItem = {
  id?: number;
  name: string;
  role: string;
  rating: number;
  text: string;
  date: string;
  ratingAcademics?: number;
  ratingInfrastructure?: number;
  ratingSports?: number;
  ratingExtracurricular?: number;
  ratingSafety?: number;
  ratingValue?: number;
  photos?: string[];
  isVerified?: boolean;
  schoolReply?: string;
  replyDate?: string;
  schoolName?: string;
};

type Props = {
  schoolId: number;
  schoolSlug?: string;
  schoolName: string;
  rating: number;
  count: number;
  reviews?: ReviewItem[];
};

const STAR_LABELS: Record<number, string> = {
  5: "⭐ Excellent (5.0) - Outstanding experience in all aspects!",
  4: "⭐ Very Good (4.0) - Highly satisfied & recommended",
  3: "⭐ Average (3.0) - Decent / Satisfactory experience",
  2: "⭐ Below Average (2.0) - Needs significant improvement",
  1: "⭐ Poor (1.0) - Very disappointing experience",
};

const QUICK_PROMPTS = [
  "Dedicated & caring teachers",
  "Spacious campus & sports grounds",
  "Clean & safe hygienic facilities",
  "Well-balanced academics & activities",
  "Affordable & transparent fee structure",
];

export default function ReviewSection({
  schoolId,
  schoolSlug,
  schoolName,
  rating: initialRating,
  count: initialCount,
  reviews = [],
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form states
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);

  // 6 Category Ratings (1 to 5)
  const [catRatings, setCatRatings] = useState({
    academics: 5,
    infrastructure: 5,
    sports: 5,
    extracurricular: 5,
    safety: 5,
    valueForMoney: 5,
  });

  const [f, setF] = useState({
    name: "",
    role: "Parent",
    mobile: "",
    email: "",
    text: "",
    confirm: true,
  });

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Zoomed photo modal state
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Live state
  const [reviewList, setReviewList] = useState<ReviewItem[]>(reviews);
  const [liveRating, setLiveRating] = useState<number>(initialCount > 0 ? initialRating : 0);
  const [liveCount, setLiveCount] = useState<number>(initialCount || 0);
  const [breakdown, setBreakdown] = useState<Record<number, { count: number; pct: number }>>({
    5: { count: 0, pct: 0 },
    4: { count: 0, pct: 0 },
    3: { count: 0, pct: 0 },
    2: { count: 0, pct: 0 },
    1: { count: 0, pct: 0 },
  });
  const [parameters, setParameters] = useState({
    academics: 0,
    infrastructure: 0,
    sports: 0,
    extracurricular: 0,
    safety: 0,
    valueForMoney: 0,
    highestRated: "Not rated yet",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch live approved reviews from API
  useEffect(() => {
    if (!schoolId && !schoolSlug) return;
    const q = schoolSlug ? `slug=${encodeURIComponent(schoolSlug)}` : `schoolId=${schoolId}`;
    fetch(`${API_URL}/reviews/?${q}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok) {
          if (Array.isArray(data.data)) {
            setReviewList(data.data);
          }
          const c = typeof data.count === "number" ? data.count : 0;
          setLiveCount(c);
          setLiveRating(c > 0 && typeof data.rating === "number" ? data.rating : 0);

          if (data.breakdown) {
            setBreakdown(data.breakdown);
          }
          if (data.parameters) {
            setParameters(data.parameters);
          }
        }
      })
      .catch(() => {});
  }, [schoolId]);

  // Recalculate local breakdown if reviewList has items
  useEffect(() => {
    if (reviewList.length > 0) {
      const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviewList.forEach((r) => {
        const star = Math.min(5, Math.max(1, Math.round(r.rating)));
        counts[star] = (counts[star] || 0) + 1;
      });
      const b: Record<number, { count: number; pct: number }> = {};
      [5, 4, 3, 2, 1].forEach((s) => {
        const c = counts[s] || 0;
        b[s] = {
          count: c,
          pct: Math.round((c / reviewList.length) * 100),
        };
      });
      setBreakdown(b);
      setLiveCount(reviewList.length);
      const avg = reviewList.reduce((acc, cur) => acc + cur.rating, 0) / reviewList.length;
      setLiveRating(Math.round(avg * 10) / 10);
    } else {
      setLiveRating(0);
      setLiveCount(0);
      setBreakdown({
        5: { count: 0, pct: 0 },
        4: { count: 0, pct: 0 },
        3: { count: 0, pct: 0 },
        2: { count: 0, pct: 0 },
        1: { count: 0, pct: 0 },
      });
    }
  }, [reviewList]);

  // Handle open modal & pre-fill logged-in parent info
  const handleOpenForm = () => {
    try {
      const u = JSON.parse(localStorage.getItem("vv_portal_user") || "{}");
      if (u.name || u.mobile || u.email) {
        setF((prev) => ({
          ...prev,
          name: prev.name || u.name || u.parentName || "",
          mobile: prev.mobile || u.mobile || "",
          email: prev.email || u.email || "",
        }));
      }
    } catch {}
    setDone(false);
    setErrors({});
    setStep(1);
    setFormOpen(true);
  };

  // Photo upload handler (Max 5 photos)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 5) {
      setErrors((prev) => ({ ...prev, photos: "You can upload a maximum of 5 photos." }));
      return;
    }

    setUploadingPhoto(true);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.photos;
      return copy;
    });

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_URL}/reviews/upload/`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.url) {
            uploadedUrls.push(json.url);
          }
        }
      }

      if (uploadedUrls.length > 0) {
        setPhotos((prev) => [...prev, ...uploadedUrls].slice(0, 5));
      } else {
        setErrors((prev) => ({ ...prev, photos: "Failed to upload photo. Please try a valid JPG, PNG, or WEBP image." }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, photos: "Could not upload photo due to network error." }));
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Step Validation & Navigation
  const handleNextStep = () => {
    setErrors({});
    if (step === 1) {
      if (!stars) {
        setErrors({ stars: "Please select an overall star rating (1 to 5 stars)." });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      const trimmed = f.text.trim();
      if (trimmed.length < 20) {
        setErrors({ text: `Review must be at least 20 characters (currently ${trimmed.length} characters).` });
        return;
      }
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const handlePrevStep = () => {
    setErrors({});
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  // Final Submit Handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!f.name.trim()) errs.name = "Please enter your name.";
    if (!f.mobile.trim()) {
      errs.mobile = "Please enter your 10-digit mobile number.";
    } else if (!/^[6-9]\d{9}$/.test(f.mobile.trim())) {
      errs.mobile = "Enter a valid 10-digit Indian mobile number (e.g. 9876543210).";
    }

    if (f.text.trim().length < 20) {
      errs.text = `Please write at least 20 characters in your review (currently ${f.text.trim().length}).`;
    }

    if (!f.confirm) {
      errs.confirm = "Please confirm that this is your genuine experience.";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const token = localStorage.getItem("vv_token");
      const payload = {
        schoolId: Number(schoolId),
        schoolSlug: schoolSlug || "",
        name: f.name.trim(),
        role: f.role,
        mobile: f.mobile.trim(),
        email: f.email.trim(),
        rating: stars,
        ratingAcademics: catRatings.academics,
        ratingInfrastructure: catRatings.infrastructure,
        ratingSports: catRatings.sports,
        ratingExtracurricular: catRatings.extracurricular,
        ratingSafety: catRatings.safety,
        ratingValue: catRatings.valueForMoney,
        text: f.text.trim(),
        photos: photos,
      };

      const res = await fetch(`${API_URL}/reviews/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg =
          j.text?.[0] ||
          j.mobile?.[0] ||
          j.message ||
          "Could not submit your review. Please verify the information and try again.";
        setErrors({ general: msg });
        setSubmitting(false);
        return;
      }

      setDone(true);
    } catch {
      setErrors({ general: "Cannot reach the server. Please check your internet connection and try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase() || "VU";
  };

  // 6 Categories Definition for UI
  const CATEGORIES = [
    {
      key: "academics" as const,
      label: "Academics & Faculty",
      score: parameters.academics,
      icon: GraduationCap,
      color: "amber",
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-100",
    },
    {
      key: "infrastructure" as const,
      label: "Infrastructure & Campus",
      score: parameters.infrastructure,
      icon: Building2,
      color: "rose",
      bg: "bg-rose-50",
      text: "text-rose-600",
      border: "border-rose-100",
    },
    {
      key: "sports" as const,
      label: "Sports & Fitness",
      score: parameters.sports,
      icon: Trophy,
      color: "blue",
      bg: "bg-blue-50",
      text: "text-[#0A5C91]",
      border: "border-blue-100",
    },
    {
      key: "extracurricular" as const,
      label: "Extracurriculars & Arts",
      score: parameters.extracurricular,
      icon: Music,
      color: "purple",
      bg: "bg-purple-50",
      text: "text-purple-600",
      border: "border-purple-100",
    },
    {
      key: "safety" as const,
      label: "Safety & Hygiene",
      score: parameters.safety,
      icon: ShieldCheck,
      color: "teal",
      bg: "bg-teal-50",
      text: "text-teal-600",
      border: "border-teal-100",
    },
    {
      key: "valueForMoney" as const,
      label: "Value for Money",
      score: parameters.valueForMoney,
      icon: IndianRupee,
      color: "emerald",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header with title and Write Review button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#0B2A47] sm:text-3xl">
            Parent ratings &amp; reviews
          </h2>
          <p className="mt-1 text-xs text-[#5C6A7B]">
            Authentic, verified reviews from parents, students, and alumni of {schoolName}.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenForm}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#0A5C91]/20 transition hover:from-[#084872] hover:to-[#0680bd] hover:shadow-lg"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Write a Review</span>
        </button>
      </div>

      {/* If approved reviews exist, show the full Rating Breakdown Card & Reviews List */}
      {liveCount > 0 ? (
        <>
          {/* 2. Rating Breakdown Card (Image 1 reference layout) */}
          <div className="rounded-3xl border border-[#E1E7EE] bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Left: Overall Score & Verified Badge */}
          <div className="lg:col-span-4 lg:border-r lg:border-[#E1E7EE] lg:pr-8 text-center lg:text-left">
            <div className="flex items-baseline justify-center lg:justify-start gap-1">
              <span className="text-5xl font-black text-[#0B2A47] tracking-tight">
                {liveCount > 0 ? Number(liveRating).toFixed(1) : "--"}
              </span>
              <span className="text-2xl font-bold text-[#8896A6]"> / 5</span>
            </div>

            {/* Stars */}
            <div className="mt-2.5 flex items-center justify-center lg:justify-start gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-5 w-5 ${
                    liveCount > 0 && s <= Math.round(liveRating)
                      ? "fill-[#E99A24] text-[#E99A24]"
                      : "fill-[#E1E7EE] text-[#D0D6DD]"
                  }`}
                />
              ))}
            </div>

            {/* Verified Rating & Reviews badge */}
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                {liveCount} Verified Rating{liveCount === 1 ? "" : "s"} &amp; Reviews
              </span>
            </div>
            {liveCount === 0 && (
              <p className="mt-2 text-[11px] text-[#64748B]">No reviews yet. Be the first to review!</p>
            )}
          </div>

          {/* Right: 5-Star to 1-Star Progress Bars */}
          <div className="lg:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const b = breakdown[star] || { count: 0, pct: 0 };
              return (
                <div key={star} className="flex items-center gap-3 text-xs font-bold text-[#4E5A68]">
                  <span className="flex w-7 items-center justify-end gap-1">
                    <span>{star}</span>
                    <Star className="h-3 w-3 fill-[#E99A24] text-[#E99A24]" />
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F1F4F8]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#E99A24] to-[#F5B445] transition-all duration-500"
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-[11px] font-semibold text-[#8896A6]">
                    {b.pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Rating by Category (6 Categories) */}
        <div className="mt-8 border-t border-[#E1E7EE] pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#0B2A47]">
              Rating by category
            </h3>
            {liveCount > 0 && parameters.highestRated && parameters.highestRated !== "Not rated yet" ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0A5C91] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                <Sparkles className="h-3 w-3 text-[#0795DC]" />
                <span>Highest rated: {parameters.highestRated}</span>
              </span>
            ) : (
              <span className="text-xs font-medium text-[#8896A6]">
                6 Core Dimensions
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const hasRating = liveCount > 0 && cat.score > 0;
              return (
                <div
                  key={cat.key}
                  className="flex items-center justify-between rounded-2xl border border-[#E1E7EE] bg-[#FAFBFD] p-3.5 shadow-xs transition hover:border-[#CBD5E1]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat.bg} ${cat.text} border ${cat.border}`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0B2A47]">{cat.label}</p>
                      <div className="mt-0.5 flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${
                              hasRating && s <= Math.round(cat.score)
                                ? "fill-[#E99A24] text-[#E99A24]"
                                : "fill-[#E1E7EE] text-[#D0D6DD]"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-[#0B2A47]">
                      {hasRating ? Number(cat.score).toFixed(1) : "--"}
                    </span>
                    {!hasRating && (
                      <span className="block text-[10px] text-[#94A3B8]">Not rated</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

          {/* 3. Reviews List Cards */}
          <div className="space-y-4">
            {reviewList.map((r, idx) => (
              <div
                key={r.id || idx}
                className="rounded-3xl border border-[#E1E7EE] bg-white p-5 sm:p-6 shadow-xs transition hover:shadow-md"
              >
                {/* Review Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700 text-sm font-extrabold text-white shadow-xs">
                      {initials(r.name)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-[#0B2A47]">{r.name}</h4>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>Verified User</span>
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-[#64748B]">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3 w-3 ${
                                s <= Math.round(r.rating)
                                  ? "fill-[#E99A24] text-[#E99A24]"
                                  : "fill-[#E1E7EE] text-[#D0D6DD]"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-bold text-[#0B2A47]">{Number(r.rating).toFixed(1)}</span>
                        <span>•</span>
                        <span>
                          {r.role} • Reviewed {r.date}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                <p className="mt-3.5 leading-relaxed text-[#334155] text-sm whitespace-pre-line">{r.text}</p>

                {/* Photos Gallery */}
                {r.photos && r.photos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {r.photos.map((photoUrl, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setPreviewPhoto(photoUrl)}
                        className="group relative h-16 w-16 overflow-hidden rounded-xl border border-[#CBD5E1] bg-slate-100 transition hover:scale-105"
                        title="Click to view full photo"
                      >
                        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* School Official Reply */}
                {r.schoolReply && (
                  <div className="mt-4 rounded-2xl border border-sky-100 bg-[#F0F8FF] p-4 text-xs text-[#0B2A47]">
                    <div className="flex items-center gap-1.5 font-extrabold text-[#0A5C91]">
                      <ShieldCheck className="h-4 w-4" />
                      <span>School Response from {r.schoolName || schoolName}</span>
                      {r.replyDate && <span className="text-[11px] font-normal text-[#64748B]">({r.replyDate})</span>}
                    </div>
                    <p className="mt-1.5 leading-relaxed text-[#334155]">{r.schoolReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Clean Empty State when 0 reviews exist (NO "-- / 5" and NO empty category cards) */
        <div className="rounded-3xl border border-[#E1E7EE] bg-[#FAFBFD] p-10 sm:p-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-[#0A5C91] border border-sky-100">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h4 className="mt-4 text-lg font-black text-[#0B2A47]">
            No reviews published yet for {schoolName}
          </h4>
          <p className="mt-1.5 mx-auto max-w-md text-xs leading-relaxed text-[#5C6A7B]">
            Be the first parent, student, or alumnus to share your genuine experience and guide other parents.
          </p>
          <button
            type="button"
            onClick={handleOpenForm}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 py-3 text-xs font-bold text-white shadow-md shadow-[#0A5C91]/20 transition hover:from-[#084872] hover:to-[#0680bd]"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Write the First Review</span>
          </button>
        </div>
      )}

      {/* 6. WRITE A REVIEW MODAL - LARGE STEP-BY-STEP WIZARD */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="vv-rise relative w-full max-w-2xl sm:max-w-3xl rounded-3xl border border-[#CBD5E1] bg-white p-6 sm:p-9 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>

            {done ? (
              <div className="py-12 text-center space-y-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                  <Check className="h-10 w-10 stroke-[3]" />
                </div>
                <h3 className="text-2xl font-black text-[#0B2A47]">
                  Thank You for Your Review!
                </h3>
                <p className="mx-auto max-w-lg text-sm leading-relaxed text-[#5C6A7B]">
                  Your review for <strong>{schoolName}</strong> has been submitted to the VidyaVista moderation desk. Once approved by our team, it will appear publicly with a <strong>Verified User</strong> badge.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="rounded-xl bg-[#0A5C91] px-8 py-3 text-sm font-bold text-white shadow hover:bg-[#084872]"
                  >
                    Close &amp; Return
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} noValidate className="space-y-6">
                {/* Stepper Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#64748B] mb-2">
                    <span className="uppercase tracking-wider text-[#0A5C91]">
                      Step {step} of 5: {step === 1 ? "Overall Rating" : step === 2 ? "Rate by Category" : step === 3 ? "Write Review" : step === 4 ? "Add Photos" : "Your Details"}
                    </span>
                    <span>{step * 20}% completed</span>
                  </div>
                  {/* Step indicators */}
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div
                        key={s}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          s < step
                            ? "bg-emerald-500"
                            : s === step
                            ? "bg-[#0A5C91]"
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* School Name & Header */}
                <div className="border-b border-[#E1E7EE] pb-4">
                  <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-[#EC0E58]">
                    Verified Parent Review
                  </span>
                  <h3 className="text-xl font-black text-[#0B2A47] sm:text-2xl">
                    Review {schoolName}
                  </h3>
                </div>

                {errors.general && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errors.general}</span>
                  </div>
                )}

                {/* STEP 1: Overall Rating */}
                {step === 1 && (
                  <div className="space-y-6 py-2">
                    <div>
                      <h4 className="text-base font-extrabold text-[#0B2A47]">
                        How would you rate your overall experience with {schoolName}? *
                      </h4>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Click on the stars below to give your overall rating (1 to 5 stars).
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center">
                      <div
                        className="flex items-center justify-center gap-2 sm:gap-3"
                        onMouseLeave={() => setHoverStars(0)}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-label={`${n} star`}
                            onMouseEnter={() => setHoverStars(n)}
                            onClick={() => setStars(n)}
                            className="p-1 transition-transform hover:scale-125 focus:outline-none"
                          >
                            <Star
                              className={`h-11 w-11 sm:h-12 sm:w-12 transition-colors ${
                                (hoverStars || stars) >= n
                                  ? "fill-[#E99A24] text-[#E99A24] drop-shadow-sm"
                                  : "fill-[#E2E8F0] text-[#CBD5E1]"
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      {/* Live Feedback Reaction Text */}
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-[#0A5C91] shadow-xs border border-sky-100">
                        <span>{STAR_LABELS[hoverStars || stars]}</span>
                      </div>
                    </div>

                    {errors.stars && (
                      <p className="text-xs font-semibold text-rose-600">{errors.stars}</p>
                    )}
                  </div>
                )}

                {/* STEP 2: Rate by Category (6 Categories) */}
                {step === 2 && (
                  <div className="space-y-4 py-2">
                    <div>
                      <h4 className="text-base font-extrabold text-[#0B2A47]">
                        Rate specific categories (1 to 5 stars)
                      </h4>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Share ratings for these 6 key dimensions to help other parents make informed choices.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {CATEGORIES.map((cat) => {
                        const IconComp = cat.icon;
                        const currentVal = (catRatings as any)[cat.key] || 5;
                        return (
                          <div
                            key={cat.key}
                            className="flex items-center justify-between rounded-2xl border border-[#E1E7EE] bg-white p-4 shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat.bg} ${cat.text} border ${cat.border}`}>
                                <IconComp className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#0B2A47]">{cat.label}</p>
                                <span className="text-[11px] font-semibold text-[#0A5C91]">
                                  {currentVal}.0 / 5.0
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() =>
                                    setCatRatings((prev) => ({ ...prev, [cat.key]: s }))
                                  }
                                  className="p-0.5 hover:scale-110 transition"
                                >
                                  <Star
                                    className={`h-5 w-5 ${
                                      s <= currentVal
                                        ? "fill-[#E99A24] text-[#E99A24]"
                                        : "fill-[#E2E8F0] text-[#CBD5E1]"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3: Write Review Content (Min 20 Chars) */}
                {step === 3 && (
                  <div className="space-y-4 py-2">
                    <div>
                      <h4 className="text-base font-extrabold text-[#0B2A47]">
                        Write your review *
                      </h4>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Please write at least 20 characters detailing your genuine experience.
                      </p>
                    </div>

                    {/* Quick suggestion prompt chips */}
                    <div>
                      <p className="text-[11px] font-bold text-[#64748B] mb-1.5">
                        Tap any topic to inspire your review:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_PROMPTS.map((prompt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const existing = f.text.trim();
                              setF((prev) => ({
                                ...prev,
                                text: existing ? `${existing} ${prompt}.` : `${prompt}. `,
                              }));
                            }}
                            className="rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-[#0A5C91] hover:border-sky-200 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-[#475569] transition"
                          >
                            + {prompt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <textarea
                        rows={5}
                        value={f.text}
                        onChange={(e) => setF({ ...f, text: e.target.value })}
                        placeholder="Share your thoughts about teaching quality, campus environment, safety, facilities, and extracurricular opportunities..."
                        className="w-full rounded-2xl border border-[#CBD5E1] p-4 text-sm text-[#0B2A47] placeholder:text-slate-400 focus:border-[#0A5C91] focus:outline-none focus:ring-2 focus:ring-[#0A5C91]/20 leading-relaxed"
                      />

                      {/* Live Counter */}
                      <div className="mt-2 flex items-center justify-between text-xs">
                        {f.text.trim().length < 20 ? (
                          <span className="font-semibold text-rose-600 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>{f.text.trim().length} / 20 min characters ({20 - f.text.trim().length} more needed)</span>
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" />
                            <span>{f.text.trim().length} characters (Requirement met)</span>
                          </span>
                        )}
                        <span className="text-slate-400">Max 2,000 characters</span>
                      </div>
                    </div>

                    {errors.text && (
                      <p className="text-xs font-semibold text-rose-600">{errors.text}</p>
                    )}
                  </div>
                )}

                {/* STEP 4: Add Photos (Optional - Max 5) */}
                {step === 4 && (
                  <div className="space-y-4 py-2">
                    <div>
                      <h4 className="text-base font-extrabold text-[#0B2A47]">
                        Add campus or event photos (Optional)
                      </h4>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Attach up to 5 photos showing school facilities, events, or campus (Max 8 MB per file, JPG/PNG).
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />

                    {photos.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center transition hover:border-[#0A5C91] hover:bg-sky-50/50"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-[#0A5C91]">
                          <UploadCloud className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-sm font-bold text-[#0B2A47]">
                          {uploadingPhoto ? "Uploading photo..." : "Click to browse & upload photos"}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          Supports JPG, PNG, WEBP (Max 5 photos)
                        </p>
                      </button>
                    )}

                    {/* Uploaded thumbnails */}
                    {photos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-[#0B2A47]">
                          Uploaded photos ({photos.length} / 5):
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                          {photos.map((pUrl, pIdx) => (
                            <div
                              key={pIdx}
                              className="group relative aspect-square overflow-hidden rounded-xl border border-slate-300 bg-slate-100"
                            >
                              <img src={pUrl} alt="" className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(pIdx)}
                                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs opacity-90 hover:opacity-100"
                                title="Remove photo"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {errors.photos && (
                      <p className="text-xs font-semibold text-rose-600">{errors.photos}</p>
                    )}
                  </div>
                )}

                {/* STEP 5: Relationship & Reviewer Details */}
                {step === 5 && (
                  <div className="space-y-4 py-2">
                    <div>
                      <h4 className="text-base font-extrabold text-[#0B2A47]">
                        Your details &amp; relationship with school *
                      </h4>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Reviews are verified by VidyaVista moderation to ensure authentic feedback.
                      </p>
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {/* Relationship Dropdown */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                          Relationship with School *
                        </label>
                        <select
                          value={f.role}
                          onChange={(e) => setF({ ...f, role: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#0B2A47] focus:border-[#0A5C91] focus:outline-none"
                        >
                          <option value="Parent">Parent</option>
                          <option value="Student">Student</option>
                          <option value="Alumni">Alumni</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Staff">Teacher / Staff</option>
                        </select>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={f.name}
                          onChange={(e) => setF({ ...f, name: e.target.value })}
                          placeholder="e.g. Ramesh Kumar"
                          className="mt-1 w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#0B2A47] focus:border-[#0A5C91] focus:outline-none"
                        />
                        {errors.name && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.name}</p>}
                      </div>

                      {/* Mobile */}
                      <div>
                        <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                          10-Digit Mobile Number *
                        </label>
                        <input
                          type="tel"
                          maxLength={10}
                          value={f.mobile}
                          onChange={(e) => setF({ ...f, mobile: e.target.value.replace(/\D/g, "") })}
                          placeholder="e.g. 9876543210"
                          className="mt-1 w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#0B2A47] focus:border-[#0A5C91] focus:outline-none"
                        />
                        {errors.mobile && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.mobile}</p>}
                      </div>

                      {/* Email */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                          Email Address (Optional)
                        </label>
                        <input
                          type="email"
                          value={f.email}
                          onChange={(e) => setF({ ...f, email: e.target.value })}
                          placeholder="e.g. parent@example.com"
                          className="mt-1 w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#0B2A47] focus:border-[#0A5C91] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Declaration Checkbox */}
                    <label className="mt-2 flex items-start gap-2.5 text-xs text-[#475569] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={f.confirm}
                        onChange={(e) => setF({ ...f, confirm: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0A5C91] focus:ring-[#0A5C91]"
                      />
                      <span>
                        I confirm that this review reflects my genuine personal experience with this school and complies with VidyaVista Community Guidelines.
                      </span>
                    </label>
                    {errors.confirm && <p className="text-xs text-rose-600 font-semibold">{errors.confirm}</p>}
                  </div>
                )}

                {/* Bottom Bar: Back on Left, Next / Submit in Right Corner */}
                <div className="flex items-center justify-between border-t border-[#E1E7EE] pt-4">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] px-4 py-2.5 text-xs font-bold text-[#475569] hover:bg-slate-100 transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < 5 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A5C91] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#084872] transition ml-auto"
                    >
                      <span>Next Step</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-7 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 transition ml-auto"
                    >
                      {submitting ? (
                        <span>Submitting for Verification...</span>
                      ) : (
                        <>
                          <Check className="h-4 w-4 stroke-[3]" />
                          <span>Submit Review for Moderation</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 7. Zoomed photo modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-black">
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={previewPhoto} alt="Review campus" className="max-h-[85vh] w-auto object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
