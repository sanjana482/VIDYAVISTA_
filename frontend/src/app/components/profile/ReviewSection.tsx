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
  Camera,
  X,
  UploadCloud,
  MessageSquare,
  ShieldCheck,
  Check,
  Sparkles,
} from "lucide-react";

export type ReviewItem = {
  id?: number;
  name: string;
  role: string;
  rating: number;
  text: string;
  date: string;
  ratingSports?: number;
  ratingExtracurricular?: number;
  ratingValue?: number;
  ratingAcademics?: number;
  ratingInfrastructure?: number;
  photos?: string[];
  isVerified?: boolean;
  schoolReply?: string;
  replyDate?: string;
  schoolName?: string;
};

type Props = {
  schoolId: number;
  schoolName: string;
  rating: number;
  count: number;
  reviews?: ReviewItem[];
};

const STAR_LABELS: Record<number, string> = {
  5: "⭐ Excellent (5.0) - Outstanding experience!",
  4: "⭐ Very Good (4.0) - Highly satisfied & recommended",
  3: "⭐ Average (3.0) - Decent experience",
  2: "⭐ Below Average (2.0) - Needs improvement",
  1: "⭐ Poor (1.0) - Very disappointing",
};

export default function ReviewSection({
  schoolId,
  schoolName,
  rating: initialRating,
  count: initialCount,
  reviews = [],
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);

  // Parameter Ratings (1 to 5)
  const [paramRatings, setParamRatings] = useState({
    sports: 4,
    extracurricular: 4,
    valueForMoney: 4,
    academics: 4,
    infrastructure: 4,
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

  // Filter state: "all" | "photos"
  const [activeFilter, setActiveFilter] = useState<"all" | "photos">("all");

  // Live state
  const [reviewList, setReviewList] = useState<ReviewItem[]>(reviews);
  const [liveRating, setLiveRating] = useState<number>(initialRating || 4.0);
  const [liveCount, setLiveCount] = useState<number>(initialCount || reviews.length);
  const [breakdown, setBreakdown] = useState<Record<number, { count: number; pct: number }>>({
    5: { count: 0, pct: 0 },
    4: { count: 0, pct: 0 },
    3: { count: 0, pct: 0 },
    2: { count: 0, pct: 0 },
    1: { count: 0, pct: 0 },
  });
  const [parameters, setParameters] = useState({
    sports: 4.0,
    extracurricular: 4.0,
    valueForMoney: 4.0,
    academics: 4.0,
    infrastructure: 4.0,
    highestRated: "Sports",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch live approved reviews from API
  useEffect(() => {
    if (!schoolId) return;
    fetch(`${API_URL}/reviews/?schoolId=${schoolId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok) {
          if (Array.isArray(data.data)) {
            setReviewList(data.data);
          }
          if (typeof data.rating === "number" && data.rating > 0) {
            setLiveRating(data.rating);
          }
          if (typeof data.count === "number") {
            setLiveCount(data.count);
          }
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

  // Recalculate local breakdown if reviewList has items but API returned empty
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
      for (let i = 0; i < files.length && photos.length + uploadedUrls.length < 5; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_URL}/reviews/upload/`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          if (json?.url) {
            uploadedUrls.push(json.url);
          }
        }
      }
      setPhotos((prev) => [...prev, ...uploadedUrls]);
    } catch {
      setErrors((prev) => ({ ...prev, photos: "Failed to upload image. Please try again." }));
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit review handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};

    if (!stars) err.stars = "Please select a star rating";
    if (f.name.trim().length < 2) err.name = "Please enter your full name";
    if (!/^[6-9]\d{9}$/.test(f.mobile.trim())) err.mobile = "Enter a valid 10-digit mobile number";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) err.email = "Enter a valid email address";

    // Requirement: at least 20 characters
    if (f.text.trim().length < 20) {
      err.text = `Please write at least 20 characters describing your experience (${f.text.trim().length}/20).`;
    }
    if (!f.confirm) {
      err.confirm = "Please confirm this review is your authentic experience.";
    }

    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setSubmitting(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("vv_portal_token") : null;

    try {
      const payload = {
        schoolId,
        name: f.name.trim(),
        role: f.role,
        mobile: f.mobile.trim(),
        email: f.email.trim(),
        rating: stars,
        ratingSports: paramRatings.sports,
        ratingExtracurricular: paramRatings.extracurricular,
        ratingValue: paramRatings.valueForMoney,
        ratingAcademics: paramRatings.academics,
        ratingInfrastructure: paramRatings.infrastructure,
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

  const filteredReviews =
    activeFilter === "photos" ? reviewList.filter((r) => r.photos && r.photos.length > 0) : reviewList;

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase() || "VU";
  };

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

      {/* 2. Rating Breakdown Card (Image 1 reference layout) */}
      <div className="rounded-3xl border border-[#E1E7EE] bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Left: Overall Big Score & Verified Badge */}
          <div className="lg:col-span-4 lg:border-r lg:border-[#E1E7EE] lg:pr-8 text-center lg:text-left">
            <div className="flex items-baseline justify-center lg:justify-start gap-1">
              <span className="text-5xl font-black text-[#0B2A47] tracking-tight">
                {Number(liveRating).toFixed(1)}
              </span>
              <span className="text-2xl font-bold text-[#8896A6]"> / 5</span>
            </div>

            {/* Stars */}
            <div className="mt-2.5 flex items-center justify-center lg:justify-start gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-5 w-5 ${
                    s <= Math.round(liveRating)
                      ? "fill-[#E99A24] text-[#E99A24]"
                      : "fill-[#E1E7EE] text-[#D0D6DD]"
                  }`}
                />
              ))}
            </div>

            {/* Verified Rating & Reviews badge (Image 1) */}
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                {liveCount} Verified Rating{liveCount === 1 ? "" : "s"} &amp; Reviews
              </span>
            </div>
          </div>

          {/* Right: 5-Star to 1-Star Progress Bars (Image 1) */}
          <div className="lg:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const b = breakdown[star] || { count: 0, pct: 0 };
              return (
                <div key={star} className="flex items-center gap-3 text-xs font-bold text-[#4E5A68]">
                  <span className="flex w-7 items-center justify-end gap-1">
                    <span>{star}</span>
                    <Star className="h-3 w-3 fill-[#E99A24] text-[#E99A24]" />
                  </span>

                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[#F0F4F8]">
                    <div
                      className="h-full rounded-full bg-[#E99A24] transition-all duration-500"
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>

                  <span className="w-10 text-right text-[11px] text-[#707E8F] font-semibold">
                    {b.pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Rating by Parameter (Image 1: Sports, Extracurriculars, Value for Money, etc.) */}
        <div className="mt-8 border-t border-[#E1E7EE] pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#0B2A47]">
              Rating by parameter
            </h3>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0A5C91] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
              <Sparkles className="h-3 w-3 text-[#0795DC]" />
              <span>Highest rated: {parameters.highestRated || "Sports"}</span>
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Sports */}
            <div className="flex items-center justify-between rounded-2xl border border-[#E1E7EE] bg-[#FAFBFD] p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0A5C91] border border-blue-100">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0B2A47]">Sports</p>
                  <div className="mt-0.5 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= Math.round(parameters.sports)
                            ? "fill-[#E99A24] text-[#E99A24]"
                            : "fill-[#E1E7EE] text-[#D0D6DD]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-sm font-black text-[#0B2A47]">
                {Number(parameters.sports).toFixed(1)}
              </span>
            </div>

            {/* Extracurriculars */}
            <div className="flex items-center justify-between rounded-2xl border border-[#E1E7EE] bg-[#FAFBFD] p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                  <Music className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0B2A47]">Extracurriculars</p>
                  <div className="mt-0.5 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= Math.round(parameters.extracurricular)
                            ? "fill-[#E99A24] text-[#E99A24]"
                            : "fill-[#E1E7EE] text-[#D0D6DD]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-sm font-black text-[#0B2A47]">
                {Number(parameters.extracurricular).toFixed(1)}
              </span>
            </div>

            {/* Value for Money */}
            <div className="flex items-center justify-between rounded-2xl border border-[#E1E7EE] bg-[#FAFBFD] p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0B2A47]">Value for Money</p>
                  <div className="mt-0.5 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= Math.round(parameters.valueForMoney)
                            ? "fill-[#E99A24] text-[#E99A24]"
                            : "fill-[#E1E7EE] text-[#D0D6DD]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-sm font-black text-[#0B2A47]">
                {Number(parameters.valueForMoney).toFixed(1)}
              </span>
            </div>

            {/* Academics */}
            <div className="flex items-center justify-between rounded-2xl border border-[#E1E7EE] bg-[#FAFBFD] p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0B2A47]">Academics &amp; Faculty</p>
                  <div className="mt-0.5 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= Math.round(parameters.academics)
                            ? "fill-[#E99A24] text-[#E99A24]"
                            : "fill-[#E1E7EE] text-[#D0D6DD]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-sm font-black text-[#0B2A47]">
                {Number(parameters.academics).toFixed(1)}
              </span>
            </div>

            {/* Infrastructure */}
            <div className="flex items-center justify-between rounded-2xl border border-[#E1E7EE] bg-[#FAFBFD] p-3.5 shadow-xs sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0B2A47]">Infrastructure &amp; Campus</p>
                  <div className="mt-0.5 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= Math.round(parameters.infrastructure)
                            ? "fill-[#E99A24] text-[#E99A24]"
                            : "fill-[#E1E7EE] text-[#D0D6DD]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-sm font-black text-[#0B2A47]">
                {Number(parameters.infrastructure).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filter Pills (Image 1: All reviews 1) */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
            activeFilter === "all"
              ? "bg-[#0A5C91] text-white shadow-sm"
              : "bg-[#F0F4F8] text-[#4E5A68] hover:bg-[#E2E8F0]"
          }`}
        >
          All reviews ({reviewList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("photos")}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
            activeFilter === "photos"
              ? "bg-[#0A5C91] text-white shadow-sm"
              : "bg-[#F0F4F8] text-[#4E5A68] hover:bg-[#E2E8F0]"
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          <span>With Photos ({reviewList.filter((r) => r.photos && r.photos.length > 0).length})</span>
        </button>
      </div>

      {/* 5. Review Cards List (Image 1 Layout) */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((r, i) => (
            <div
              key={r.id || i}
              className="rounded-3xl border border-[#E1E7EE] bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Author Info with Initial Circle + Verified User badge (Image 1) */}
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-extrabold text-white shadow-sm">
                    {initials(r.name)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-[#0B2A47] text-base">{r.name}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Verified User</span>
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= Math.round(r.rating)
                                ? "fill-[#E99A24] text-[#E99A24]"
                                : "fill-[#E1E7EE] text-[#D0D6DD]"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-[#0B2A47]">{Number(r.rating).toFixed(1)}</span>
                    </div>

                    <p className="mt-0.5 text-xs text-[#707E8F]">
                      {r.role || "Parent"} &bull; Reviewed {r.date || "Recently"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Review Text */}
              <p className="mt-3.5 leading-relaxed text-[#334155] text-sm whitespace-pre-line">{r.text}</p>

              {/* Photos Gallery attached to review (up to 5 photos) */}
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

              {/* School Official Reply (if any & approved by admin) */}
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
      ) : (
        <div className="rounded-3xl border border-[#E1E7EE] bg-[#FAFBFD] p-12 text-center text-[#64748B]">
          <MessageSquare className="mx-auto h-10 w-10 text-[#0795DC]/40" />
          <h4 className="mt-3 text-base font-extrabold text-[#0B2A47]">No parent reviews published yet</h4>
          <p className="mt-1 text-xs text-[#5C6A7B]">
            Be the first parent or student to share your genuine experience with {schoolName}.
          </p>
          <button
            type="button"
            onClick={handleOpenForm}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0A5C91] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#084872]"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Write the First Review</span>
          </button>
        </div>
      )}

      {/* 6. WRITE A REVIEW MODAL (Interactive Flow requested by user) */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="vv-rise relative w-full max-w-xl rounded-3xl border border-[#E1E7EE] bg-white p-6 shadow-2xl sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            {done ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-8 w-8 stroke-[3]" />
                </div>
                <h3 className="text-xl font-extrabold text-[#0B2A47]">
                  Thank You for Your Review!
                </h3>
                <p className="mx-auto max-w-md text-xs leading-relaxed text-[#5C6A7B]">
                  Your review for <strong>{schoolName}</strong> has been submitted to the VidyaVista moderation desk. Once verified by our team, it will appear publicly with a <strong>Verified User</strong> badge.
                </p>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl bg-[#0A5C91] px-6 py-2.5 text-xs font-bold text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} noValidate className="space-y-5">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#EC0E58]">
                    Verified Parent Feedback
                  </span>
                  <h3 className="text-xl font-extrabold text-[#0B2A47]">
                    Review {schoolName}
                  </h3>
                </div>

                {errors.general && (
                  <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                    {errors.general}
                  </div>
                )}

                {/* STEP 1: Star Rating (With dynamic reaction text) */}
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                    1. Overall Rating *
                  </label>
                  <div className="mt-2 flex items-center gap-1.5" onMouseLeave={() => setHoverStars(0)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} star`}
                        onMouseEnter={() => setHoverStars(n)}
                        onClick={() => setStars(n)}
                        className="transition hover:scale-110 p-1"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            (hoverStars || stars) >= n
                              ? "fill-[#E99A24] text-[#E99A24]"
                              : "fill-[#E1E7EE] text-[#D0D6DD]"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-[#0A5C91]">
                      {STAR_LABELS[hoverStars || stars]}
                    </span>
                  </div>
                  {errors.stars && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.stars}</p>}
                </div>

                {/* Parameter Ratings (Quick 1-5 selector for Sports, Academics, etc.) */}
                <div className="rounded-2xl bg-[#F8FAFC] p-4 border border-[#E2E8F0] space-y-3">
                  <p className="text-xs font-extrabold uppercase text-[#4E5A68]">
                    Rate Key Parameters (1 to 5 Stars):
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                    {(
                      [
                        { key: "sports", label: "🏆 Sports & Athletics" },
                        { key: "extracurricular", label: "🎵 Extracurriculars" },
                        { key: "valueForMoney", label: "₹ Value for Money" },
                        { key: "academics", label: "🎓 Academics & Faculty" },
                        { key: "infrastructure", label: "🏫 Infrastructure & Safety" },
                      ] as const
                    ).map((p) => (
                      <div key={p.key} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                        <span className="font-semibold text-slate-700">{p.label}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setParamRatings((prev) => ({ ...prev, [p.key]: s }))}
                              className="text-xs"
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  s <= paramRatings[p.key]
                                    ? "fill-[#E99A24] text-[#E99A24]"
                                    : "fill-[#E1E7EE] text-[#D0D6DD]"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* STEP 2: Review text (Minimum 20 characters validation) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                      2. Write Your Review *
                    </label>
                    <span
                      className={`text-[11px] font-bold ${
                        f.text.trim().length >= 20 ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {f.text.trim().length} / 20 min characters
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={f.text}
                    onChange={(e) => setF({ ...f, text: e.target.value })}
                    placeholder="Tell other parents about the quality of education, faculty, campus safety, annual fees, and extracurricular opportunities..."
                    className="mt-1.5 w-full rounded-2xl border border-[#D6DDE5] p-3.5 text-xs text-[#0B2A47] outline-none focus:border-[#0795DC] focus:ring-4 focus:ring-[#0795DC]/15"
                  />
                  {errors.text && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.text}</p>}
                </div>

                {/* STEP 3: Photos (Optional, max 5) */}
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                    3. Upload Photos (Optional &bull; Max 5)
                  </label>
                  <p className="text-[11px] text-[#707E8F]">
                    Attach campus, classroom, or activity photos to enhance your review.
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {photos.map((url, idx) => (
                      <div key={idx} className="relative h-16 w-16 rounded-xl border border-slate-200 overflow-hidden group">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-80 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {photos.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="flex h-16 w-16 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5E1] text-[#64748B] hover:border-[#0795DC] hover:text-[#0795DC] transition"
                      >
                        <Camera className="h-5 w-5" />
                        <span className="text-[9px] font-bold mt-1">
                          {uploadingPhoto ? "..." : "+ Add"}
                        </span>
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {errors.photos && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.photos}</p>}
                </div>

                {/* STEP 4: Relationship with School & Reviewer Details */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                      Relationship With School *
                    </label>
                    <select
                      value={f.role}
                      onChange={(e) => setF({ ...f, role: e.target.value })}
                      className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] bg-white px-3 text-xs font-semibold text-[#0B2A47]"
                    >
                      <option value="Parent">Parent</option>
                      <option value="Student">Student</option>
                      <option value="Alumni">Alumni</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Staff">Teacher / Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                      Your Full Name *
                    </label>
                    <input
                      value={f.name}
                      onChange={(e) => setF({ ...f, name: e.target.value })}
                      placeholder="e.g. Sulekha Mahto"
                      className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] px-3 text-xs"
                    />
                    {errors.name && <p className="mt-0.5 text-xs text-rose-600 font-semibold">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                      Mobile Number (For Verification) *
                    </label>
                    <input
                      maxLength={10}
                      value={f.mobile}
                      onChange={(e) => setF({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="10-digit mobile"
                      className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] px-3 text-xs"
                    />
                    {errors.mobile && <p className="mt-0.5 text-xs text-rose-600 font-semibold">{errors.mobile}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={f.email}
                      onChange={(e) => setF({ ...f, email: e.target.value })}
                      placeholder="email@example.com"
                      className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] px-3 text-xs"
                    />
                    {errors.email && <p className="mt-0.5 text-xs text-rose-600 font-semibold">{errors.email}</p>}
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[#5C6A7B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.confirm}
                    onChange={(e) => setF({ ...f, confirm: e.target.checked })}
                    className="mt-0.5 h-4 w-4 accent-[#0A5C91]"
                  />
                  <span>
                    I certify that this review is based on my genuine personal experience with {schoolName}.
                  </span>
                </label>
                {errors.confirm && <p className="text-xs text-rose-600 font-semibold">{errors.confirm}</p>}

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 py-2.5 text-xs font-extrabold text-white shadow-md disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Review for Verification"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 7. PHOTO ZOOM MODAL */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-3xl bg-white p-2">
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={previewPhoto} alt="Review attachment" className="max-h-[80vh] w-auto rounded-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
