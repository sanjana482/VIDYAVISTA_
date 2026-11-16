"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Headphones,
  Heart,
  Info,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRound,
  X,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { clearPortalSession, getPortalToken, portalApi } from "../lib/portalApi";

const CLASSES = [
  "Toddler", "Nursery", "LKG", "UKG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
  "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12",
];

type Tab = "dashboard" | "enquiries" | "shortlisted" | "reviews" | "preferences" | "password";

interface TrackerStage {
  step: number;
  label: string;
  sublabel: string;
  status: "completed" | "current" | "upcoming";
}

function getApplicationTracker(e: any, profile: any) {
  const appId = e.applicationNumber || `VV-${String(e.id || 1000).padStart(4, "0")}`;
  const submittedDate = e.createdAt
    ? new Date(e.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Submitted";

  const isRejected = e.schoolStatus === "rejected";
  const isConverted = e.adminStatus === "converted" || e.status === "Converted";
  const isContactedOrUnlocked =
    Boolean(e.isUnlocked) ||
    e.adminStatus === "contacted" ||
    e.status === "Accepted by School" ||
    e.status === "Contacted";

  let stage2Status: "completed" | "current" | "upcoming" = "current";
  let stage2Sub = "In Progress";

  let stage3Status: "completed" | "current" | "upcoming" = "upcoming";
  let stage3Sub = "Pending";

  let stage4Status: "completed" | "current" | "upcoming" = "upcoming";
  let stage4Sub = "Pending";

  let statusNote =
    "Your application has been received and registered. VidyaVista admission desk is reviewing student profile & eligibility criteria.";

  if (isRejected) {
    stage2Status = "completed";
    stage2Sub = "Verified";
    stage3Status = "completed";
    stage3Sub = "Concluded";
    stage4Status = "completed";
    stage4Sub = "Seats Full";
    statusNote =
      "Admission process concluded for the selected batch. Connect with your assigned VidyaVista counselor for verified alternative schools.";
  } else if (isConverted) {
    stage2Status = "completed";
    stage2Sub = "Verified";
    stage3Status = "completed";
    stage3Sub = "Processed";
    stage4Status = "completed";
    stage4Sub = "Seat Confirmed";
    statusNote =
      "Congratulations! Your student interaction & admission process has been completed successfully.";
  } else if (isContactedOrUnlocked) {
    stage2Status = "completed";
    stage2Sub = "Verified";
    stage3Status = "current";
    stage3Sub = "In Progress";
    stage4Status = "upcoming";
    stage4Sub = "Awaiting Final Offer";
    statusNote =
      "Application verified and shared with the school admission office. Counselor is coordinating campus visit & interaction scheduling.";
  } else {
    stage2Status = "current";
    stage2Sub = "In Progress";
    stage3Status = "upcoming";
    stage3Sub = "Pending";
    stage4Status = "upcoming";
    stage4Sub = "Pending";
    statusNote =
      "Your application has been received and registered. VidyaVista admission desk is reviewing student profile & eligibility criteria.";
  }

  const stages: TrackerStage[] = [
    {
      step: 1,
      label: "Submitted",
      sublabel: submittedDate,
      status: "completed",
    },
    {
      step: 2,
      label: "Verification & Review",
      sublabel: stage2Sub,
      status: stage2Status,
    },
    {
      step: 3,
      label: "School Processing",
      sublabel: stage3Sub,
      status: stage3Status,
    },
    {
      step: 4,
      label: "Admission Status",
      sublabel: stage4Sub,
      status: stage4Status,
    },
  ];

  return { appId, submittedDate, stages, statusNote, isRejected, isConverted, isContactedOrUnlocked };
}

export default function ParentPortalPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const [profile, setProfile] = useState<any>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [shortlisted, setShortlisted] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Tracker UI states
  const [expandedAppId, setExpandedAppId] = useState<number | null>(null);
  const [supportModal, setSupportModal] = useState<any | null>(null);

  // Chat state
  const [activeEnquiry, setActiveEnquiry] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Password change
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "" });
  const [showPwdCurrent, setShowPwdCurrent] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    // Background refresh when switching to shortlisted, reviews, or enquiries
    if (t === "shortlisted" || t === "reviews" || t === "enquiries" || t === "dashboard") {
      portalApi("/portal/parent/dashboard").then((res: any) => {
        if (res.profile) setProfile(res.profile);
        if (res.enquiries) setEnquiries(res.enquiries || []);
        if (res.shortlisted) setShortlisted(res.shortlisted || []);
        if (res.reviews) setReviews(res.reviews || []);
      }).catch(() => {});
    }
  };

  const loadData = useCallback(async () => {
    if (!getPortalToken()) {
      router.replace("/login?role=parent");
      return;
    }
    try {
      const res = await portalApi("/portal/parent/dashboard");
      setProfile(res.profile);
      setEnquiries(res.enquiries || []);
      setShortlisted(res.shortlisted || []);
      setRecommended(res.recommendedSchools || []);
      setReviews(res.reviews || []);
    } catch (e: any) {
      if (e.status === 401 || e.status === 403) {
        router.replace("/login?role=parent");
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await portalApi("/portal/parent/dashboard", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      setProfile(res.profile);
      setRecommended(res.recommendedSchools || []);
      showToast("Education preferences updated successfully.");
      setTab("dashboard");
    } catch (err: any) {
      showToast(err.message || "Could not update education preferences.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleShortlist(schoolId: number) {
    // Optimistic UI: update instantly, revert on error
    const wasShortlisted = shortlisted.some((s: any) => s.schoolId === schoolId);
    if (wasShortlisted) {
      setShortlisted((prev: any[]) => prev.filter((s: any) => s.schoolId !== schoolId));
    }
    try {
      const res = await portalApi<{ message: string }>("/portal/parent/shortlist/toggle", {
        method: "POST",
        body: JSON.stringify({ schoolId }),
      });
      showToast(res.message);
      // Refresh shortlisted list to get latest from server
      const updated = await portalApi("/portal/parent/dashboard");
      setShortlisted(updated.shortlisted || []);
    } catch (e: any) {
      showToast(e.message || "Could not update shortlist.");
      // Revert optimistic update
      loadData();
    }
  }



  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F8FB]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#0795DC] border-t-transparent" />
          <p className="mt-4 text-sm font-extrabold text-[#0B2A47]">Loading Parent Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8FB] text-[#0B2A47]">
      <Navbar />

      {toast && (
        <div className="vv-pop fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#0B2A47] px-5 py-3.5 text-sm font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:px-8">
        {/* Left Sidebar */}
        <aside className="space-y-4 lg:col-span-3">
          {/* Profile Card with Completion Bar */}
          <div className="rounded-2xl border border-[#E1E7EE] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A5C91] to-[#0795DC] text-base font-extrabold text-white shadow-sm">
                {(profile?.parentName || "P").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-extrabold text-[#0B2A47]">{profile?.parentName}</h2>
                <p className="truncate text-xs text-[#5C6A7B]">
                  Student: <strong>{profile?.studentName || "Not set"}</strong>
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#5C6A7B]">Profile Completion</span>
                <span className="text-[#0A5C91]">{profile?.profileCompletion ?? 70}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#E1E7EE]">
                <div
                  className="vv-fill h-full rounded-full bg-gradient-to-r from-[#0795DC] to-[#EC0E58]"
                  style={{ width: `${profile?.profileCompletion ?? 70}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() => setTab("preferences")}
                className="vv-btn mt-3.5 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] text-xs font-bold text-white shadow-sm"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Update Preferences</span>
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="rounded-2xl border border-[#E1E7EE] bg-white p-2 shadow-sm space-y-1">
            {(
              [
                { id: "dashboard", label: "My Dashboard", icon: LayoutDashboard },
                { id: "enquiries", label: `Enquiries & Applications (${enquiries.length})`, icon: Bookmark },
                { id: "shortlisted", label: `Shortlisted Schools (${shortlisted.length})`, icon: Heart },
                
                { id: "reviews", label: `My Reviews (${reviews.length})`, icon: Star },
                { id: "preferences", label: "Education Preferences", icon: SlidersHorizontal },
                { id: "password", label: "Change Password", icon: KeyRound },
              ] as const
            ).map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                    tab === item.id
                      ? "bg-gradient-to-r from-[#0A5C91] to-[#0795DC] text-white shadow-sm"
                      : "text-[#4E5A68] hover:bg-[#F0F8FF] hover:text-[#0A5C91]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconComp className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                clearPortalSession();
                router.push("/login?role=parent");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="space-y-6 lg:col-span-9">
          {tab === "dashboard" && (
            <>
              {/* Education Preference Summary Block */}
              <div className="vv-rise rounded-2xl border border-[#E1E7EE] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E1E7EE] pb-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#EC0E58]">
                      Education Preference Profile
                    </span>
                    <h1 className="mt-1 text-xl font-extrabold text-[#0B2A47]">
                      Welcome, {profile?.parentName}
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab("preferences")}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#0A5C91]/30 bg-[#F0F8FF] px-3.5 text-xs font-bold text-[#0A5C91] transition hover:bg-[#E1F1FA]"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Edit Preferences</span>
                  </button>
                </div>

                <div className="mt-4 grid gap-3.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl bg-[#FAFBFD] p-3.5 border border-[#E2E8F0]">
                    <p className="text-xs font-semibold text-[#5C6A7B]">Student Name</p>
                    <p className="mt-0.5 font-extrabold text-[#0B2A47]">{profile?.studentName || "Not set"}</p>
                  </div>
                  <div className="rounded-xl bg-[#FAFBFD] p-3.5 border border-[#E2E8F0]">
                    <p className="text-xs font-semibold text-[#5C6A7B]">Parent Name</p>
                    <p className="mt-0.5 font-extrabold text-[#0B2A47]">{profile?.parentName}</p>
                  </div>
                  <div className="rounded-xl bg-[#FAFBFD] p-3.5 border border-[#E2E8F0]">
                    <p className="text-xs font-semibold text-[#5C6A7B]">Official Email</p>
                    <p className="mt-0.5 truncate font-semibold text-[#0B2A47]">{profile?.email}</p>
                  </div>
                  <div className="rounded-xl bg-[#FAFBFD] p-3.5 border border-[#E2E8F0]">
                    <p className="text-xs font-semibold text-[#5C6A7B]">Contact Number</p>
                    <p className="mt-0.5 font-extrabold text-[#0B2A47]">+91 {profile?.mobile}</p>
                  </div>
                  <div className="rounded-xl bg-[#FAFBFD] p-3.5 border border-[#E2E8F0]">
                    <p className="text-xs font-semibold text-[#5C6A7B]">Admission Class & Type</p>
                    <p className="mt-0.5 font-extrabold text-[#0A5C91]">
                      {profile?.admissionType || "Boarding School"} &middot; {profile?.lookingForClass || "All Classes"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#FAFBFD] p-3.5 border border-[#E2E8F0]">
                    <p className="text-xs font-semibold text-[#5C6A7B]">Preferred City &amp; Board</p>
                    <p className="mt-0.5 font-extrabold text-[#0B2A47]">
                      {profile?.preferredCity || "All India"} &middot; {profile?.preferredBoard || "CBSE"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Applications Live Tracker Widget */}
              {enquiries.length > 0 && (
                <div className="vv-rise rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/70 via-white to-blue-50/50 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A5C91] text-white shadow-sm">
                        <Clock className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-extrabold text-[#0B2A47]">Active Applications Live Tracker</h2>
                        <p className="text-[11px] text-[#5C6A7B]">
                          You have {enquiries.length} application{enquiries.length > 1 ? "s" : ""} under systematic processing
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab("enquiries")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0A5C91] hover:underline"
                    >
                      <span>View All Trackers ({enquiries.length})</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  {(() => {
                    const latest = enquiries[0];
                    const trk = getApplicationTracker(latest, profile);
                    const activeStage = trk.stages.find((s) => s.status === "current") || trk.stages[0];
                    return (
                      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-[#0B2A47]">{latest.schoolName}</span>
                            <span className="rounded-full bg-[#EDF5FF] px-2.5 py-0.5 text-[11px] font-bold text-[#0A5C91]">
                              #{trk.appId}
                            </span>
                            <span className="text-xs text-[#8896A6]">&middot; {trk.submittedDate}</span>
                          </div>
                          <p className="mt-1 text-xs text-[#5C6A7B]">
                            Student: <strong className="text-[#0B2A47]">{latest.childName || profile?.studentName || "Student"}</strong> &middot; Class: <strong className="text-[#0B2A47]">{latest.className || profile?.lookingForClass}</strong> &middot; Current Step:{" "}
                            <span className="font-extrabold text-[#0A5C91]">{activeStage.label} ({activeStage.sublabel})</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTab("enquiries")}
                          className="vv-btn inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0A5C91] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#084872]"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>Track Application</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Counselling Guidance Banner */}
              <div className="vv-rise rounded-2xl bg-gradient-to-r from-[#0B2A47] via-[#0A5C91] to-[#0795DC] p-6 text-white shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="max-w-xl">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold uppercase">
                      <Sparkles className="h-3 w-3" />
                      <span>VidyaVista Admission Guidance</span>
                    </span>
                    <h2 className="mt-2 text-xl font-extrabold">
                      Need Guidance on School Admissions for {profile?.studentName || "Your Child"}?
                    </h2>
                    <p className="mt-1 text-xs text-sky-100">
                      Explore fees, facilities, curricula, boarding safety, and verified parent reviews across 10,000+ schools.
                    </p>
                  </div>
                  <Link
                    href="/schools"
                    className="vv-btn inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-bold text-[#0A5C91] shadow-sm hover:bg-sky-50"
                  >
                    <span>Browse &amp; Apply to Schools</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Schools Currently Accepting Applications */}
              <div className="vv-rise rounded-2xl border border-[#E1E7EE] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#0B2A47]">
                      {profile?.admissionType || "Boarding & Day"} Schools Currently Accepting Applications
                    </h2>
                    <p className="text-xs text-[#5C6A7B]">
                      Recommended based on your preferences ({profile?.preferredBoard || "All Boards"} &middot; {profile?.preferredCity || "India"})
                    </p>
                  </div>
                  <Link href="/schools" className="inline-flex items-center gap-1 text-xs font-bold text-[#0A5C91] hover:underline">
                    <span>View All Schools</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recommended.slice(0, 6).map((sc: any) => {
                    const isSaved = shortlisted.some((s: any) => s.schoolId === sc.schoolId);
                    return (
                      <div
                        key={sc.schoolId}
                        className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E1E7EE] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div>
                          <div className="relative h-36 w-full bg-slate-100">
                            <img
                              src={sc.image || "/images/school-placeholder.svg"}
                              alt={sc.name}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => toggleShortlist(sc.schoolId)}
                              className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow ${
                                isSaved ? "bg-[#EC0E58] text-white" : "bg-white/90 text-[#EC0E58]"
                              }`}
                              title="Shortlist School"
                            >
                              <Heart className="h-4 w-4 fill-current" />
                            </button>
                            <span className="absolute bottom-2 left-2 rounded-lg bg-[#0B2A47]/85 px-2.5 py-0.5 text-[11px] font-bold text-white">
                              ★ {Number(sc.rating || 4.5).toFixed(1)} &middot; {sc.board}
                            </span>
                          </div>
                          <div className="p-4">
                            <h3 className="line-clamp-1 text-sm font-extrabold text-[#0B2A47]">{sc.name}</h3>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-[#5C6A7B]">
                              <MapPin className="h-3 w-3 text-[#0795DC]" />
                              <span>{sc.area}, {sc.city}</span>
                            </p>
                            <p className="mt-2 text-xs font-bold text-[#0A5C91]">
                              Annual Fee: {sc.fee ? `Rs. ${Number(sc.fee).toLocaleString("en-IN")}` : "Contact School"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 border-t border-[#E1E7EE] p-3">
                          <Link
                            href={`/schools/${sc.slug || sc.schoolId}`}
                            className="flex-1 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] py-2 text-center text-xs font-extrabold text-white"
                          >
                            View &amp; Apply
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SAF / ENQUIRIES APPLIED - SYSTEMATIC APPLICATION TRACKER */}
          {tab === "enquiries" && (
            <div className="vv-rise space-y-5">
              <div className="rounded-2xl border border-[#E1E7EE] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-extrabold text-[#0B2A47]">Admission Enquiries &amp; Applications</h1>
                    <p className="mt-1 text-xs text-[#5C6A7B]">
                      Track the real-time stage of your school admission applications through our verified admission desk.
                    </p>
                  </div>
                  <Link
                    href="/schools"
                    className="vv-btn inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0A5C91] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#084872]"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Apply to More Schools</span>
                  </Link>
                </div>
              </div>

              {enquiries.length === 0 ? (
                <div className="rounded-2xl border border-[#E1E7EE] bg-white p-12 text-center shadow-sm">
                  <p className="text-sm text-[#8896A6]">You have not sent any school enquiries yet.</p>
                  <Link
                    href="/schools"
                    className="vv-btn mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0A5C91] px-5 text-xs font-bold text-white"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Explore Schools &amp; Enquire</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {enquiries.map((e) => {
                    const trk = getApplicationTracker(e, profile);
                    const isExpanded = expandedAppId === e.id;
                    return (
                      <div
                        key={e.id}
                        className="overflow-hidden rounded-2xl border border-[#E1E7EE] bg-white shadow-sm transition hover:shadow-md"
                      >
                        {/* 1. Card Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F4F8] bg-[#FAFBFD] px-5 py-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-extrabold text-[#0B2A47]">{e.schoolName}</h3>
                              {e.schoolCity && (
                                <span className="flex items-center gap-1 text-xs text-[#5C6A7B]">
                                  <MapPin className="h-3 w-3 text-[#0795DC]" />
                                  {e.schoolCity}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-[#5C6A7B]">
                              Student: <strong className="text-[#0B2A47]">{e.childName || profile?.studentName || "Student"}</strong> &middot; Class: <strong className="text-[#0B2A47]">{e.className || profile?.lookingForClass}</strong> &middot; Session: <span className="font-semibold text-[#0A5C91]">{e.session || "2027-28"}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D0E2FF] bg-[#EDF5FF] px-3 py-1 text-xs font-bold text-[#0A5C91]">
                              <span className="h-2 w-2 rounded-full bg-[#0795DC] animate-pulse" />
                              Application ID: #{trk.appId}
                            </span>
                            <span className="text-xs text-[#8896A6]">
                              Submitted: {trk.submittedDate}
                            </span>
                          </div>
                        </div>

                        {/* 2. Visual Stepper Timeline */}
                        <div className="px-5 py-6 sm:px-8">
                          <div className="relative">
                            <div className="grid grid-cols-2 gap-y-6 gap-x-2 sm:grid-cols-4 sm:gap-2">
                              {trk.stages.map((st, idx) => {
                                const isDone = st.status === "completed";
                                const isCurrent = st.status === "current";
                                return (
                                  <div key={st.step} className="relative flex flex-col items-center text-center">
                                    {/* Desktop Connecting Line */}
                                    {idx < trk.stages.length - 1 && (
                                      <div
                                        className={`hidden sm:block absolute top-4 left-1/2 w-full h-1 -z-0 ${
                                          trk.stages[idx + 1].status === "completed" || trk.stages[idx + 1].status === "current"
                                            ? "bg-emerald-500"
                                            : "bg-slate-200"
                                        }`}
                                      />
                                    )}

                                    {/* Circle Icon */}
                                    <div
                                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                                        isDone
                                          ? "bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-100"
                                          : isCurrent
                                            ? "bg-[#0A5C91] text-white shadow-md ring-4 ring-sky-200 animate-pulse"
                                            : "border-2 border-slate-300 bg-white text-slate-400"
                                      }`}
                                    >
                                      {isDone ? (
                                        <Check className="h-4 w-4 stroke-[3]" />
                                      ) : isCurrent ? (
                                        <span className="h-2.5 w-2.5 rounded-full bg-white" />
                                      ) : (
                                        <span>{st.step}</span>
                                      )}
                                    </div>

                                    {/* Labels */}
                                    <p
                                      className={`mt-2 text-xs font-extrabold ${
                                        isCurrent ? "text-[#0A5C91]" : isDone ? "text-[#0B2A47]" : "text-slate-400"
                                      }`}
                                    >
                                      {st.label}
                                    </p>
                                    <span
                                      className={`mt-0.5 text-[11px] font-semibold ${
                                        isCurrent
                                          ? "rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-800"
                                          : isDone
                                            ? "text-emerald-700 font-medium"
                                            : "text-slate-400"
                                      }`}
                                    >
                                      {st.sublabel}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 3. Status Note Banner (Professional English) */}
                          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-[#F4F9FD] p-3.5 text-xs text-[#0B2A47]">
                            <Info className="h-4 w-4 shrink-0 text-[#0795DC] mt-0.5" />
                            <div>
                              <span className="font-extrabold text-[#0A5C91]">Status Note: </span>
                              <span className="font-medium text-[#2C3E50]">{trk.statusNote}</span>
                            </div>
                          </div>

                          {/* 4. Expandable Application Details */}
                          {isExpanded && (
                            <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] p-4 text-xs space-y-3">
                              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                                <span className="font-bold text-[#0B2A47] uppercase tracking-wider text-[11px]">
                                  Submitted Application Information
                                </span>
                                <span className="text-[#5C6A7B]">Reference: #{trk.appId}</span>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-slate-700">
                                <div>
                                  <span className="text-[11px] font-semibold text-[#5C6A7B]">Student Full Name</span>
                                  <p className="font-bold text-[#0B2A47]">{e.childName || profile?.studentName || "Not specified"}</p>
                                </div>
                                <div>
                                  <span className="text-[11px] font-semibold text-[#5C6A7B]">Parent / Guardian Name</span>
                                  <p className="font-bold text-[#0B2A47]">{e.parentName || profile?.parentName}</p>
                                </div>
                                <div>
                                  <span className="text-[11px] font-semibold text-[#5C6A7B]">Registered Mobile</span>
                                  <p className="font-bold text-[#0B2A47]">+91 {e.mobile || profile?.mobile}</p>
                                </div>
                                <div>
                                  <span className="text-[11px] font-semibold text-[#5C6A7B]">Target Class &amp; Session</span>
                                  <p className="font-bold text-[#0A5C91]">{e.className || profile?.lookingForClass} ({e.session || "2027-28"})</p>
                                </div>
                                <div>
                                  <span className="text-[11px] font-semibold text-[#5C6A7B]">Preferred Board &amp; City</span>
                                  <p className="font-bold text-[#0B2A47]">{profile?.preferredBoard || "CBSE"} &middot; {e.schoolCity || profile?.preferredCity || "India"}</p>
                                </div>
                                <div>
                                  <span className="text-[11px] font-semibold text-[#5C6A7B]">Assigned Admission Desk</span>
                                  <p className="font-bold text-emerald-700 flex items-center gap-1">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    VidyaVista Central Desk (Verified)
                                  </p>
                                </div>
                              </div>
                              {e.note && (
                                <div className="pt-2 border-t border-[#E2E8F0]">
                                  <span className="text-[11px] font-semibold text-[#5C6A7B]">Special Requirements / Notes:</span>
                                  <p className="mt-0.5 text-slate-800 italic">"{e.note}"</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 5. Card Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F4F8] bg-[#FAFBFD] px-5 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedAppId(isExpanded ? null : e.id)}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#D6DDE5] bg-white px-3.5 text-xs font-bold text-[#0B2A47] hover:bg-[#F0F4F8] transition"
                            >
                              <FileText className="h-3.5 w-3.5 text-[#0A5C91]" />
                              <span>{isExpanded ? "Hide Details" : "View Application Details"}</span>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => setSupportModal(e)}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 text-xs font-bold text-[#0A5C91] hover:bg-sky-100 transition"
                            >
                              <Headphones className="h-3.5 w-3.5 text-[#0795DC]" />
                              <span>Admission Support Desk</span>
                            </button>
                          </div>

                          {e.schoolSlug && (
                            <Link
                              href={`/schools/${e.schoolSlug}`}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0B2A47] px-4 text-xs font-bold text-white hover:bg-[#0A5C91] transition"
                            >
                              <span>View School</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHORTLISTED SCHOOLS */}
          {tab === "shortlisted" && (
            <div className="vv-rise rounded-2xl border border-[#E1E7EE] bg-white p-6 shadow-sm">
              <h1 className="text-xl font-extrabold text-[#0B2A47]">Shortlisted Schools</h1>
              {shortlisted.length === 0 ? (
                <p className="py-12 text-center text-sm text-[#8896A6]">
                  No schools shortlisted yet. Click the heart button on any school card to save it here for comparison.
                </p>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {shortlisted.map((sc: any) => (
                    <div
                      key={sc.schoolId}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[#E1E7EE] p-4"
                    >
                      <div>
                        <h3 className="font-extrabold text-[#0B2A47]">{sc.name}</h3>
                        <p className="text-xs text-[#5C6A7B]">
                          {sc.city}, {sc.state} &middot; {sc.board}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/schools/${sc.slug || sc.schoolId}`}
                          className="inline-flex h-9 items-center justify-center rounded-xl bg-[#0A5C91] px-3.5 text-xs font-bold text-white"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleShortlist(sc.schoolId)}
                          className="inline-flex h-9 items-center justify-center rounded-xl bg-[#FDE8EF] px-3 text-xs font-bold text-[#C8104F]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MY REVIEWS */}
          {tab === "reviews" && (
            <div className="vv-rise rounded-2xl border border-[#E1E7EE] bg-white p-6 shadow-sm">
              <h1 className="text-xl font-extrabold text-[#0B2A47]">My School Reviews</h1>
              {reviews.length === 0 ? (
                <p className="py-12 text-center text-sm text-[#8896A6]">
                  You have not submitted any school reviews yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-[#E1E7EE] p-4">
                      <div className="flex justify-between">
                        <p className="font-extrabold text-[#0B2A47]">{r.schoolName}</p>
                        <span className="font-bold text-amber-500">{"★".repeat(r.rating)}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#4E5A68]">{r.text}</p>
                      {r.schoolReply && (
                        <div className="mt-2 rounded-xl bg-[#F0F8FF] p-2.5 text-xs text-[#0A5C91]">
                          <strong>Official School Reply:</strong> {r.schoolReply}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: EDIT PREFERENCES */}
          {tab === "preferences" && profile && (
            <div className="vv-rise rounded-2xl border border-[#E1E7EE] bg-white p-6 shadow-sm">
              <h1 className="text-xl font-extrabold text-[#0B2A47]">Edit Education Preferences</h1>
              <form onSubmit={savePreferences} className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">Parent Name</label>
                  <input
                    value={profile.parentName || ""}
                    onChange={(e) => setProfile({ ...profile, parentName: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">Student Name</label>
                  <input
                    value={profile.studentName || ""}
                    onChange={(e) => setProfile({ ...profile, studentName: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">Mobile Number</label>
                  <input
                    maxLength={10}
                    value={profile.mobile || ""}
                    onChange={(e) => setProfile({ ...profile, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">Official Email Address</label>
                  <input
                    type="email"
                    value={profile.email || ""}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">Admission For Class</label>
                  <select
                    value={profile.lookingForClass || "Class 5"}
                    onChange={(e) => setProfile({ ...profile, lookingForClass: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] bg-white px-3.5 text-sm"
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">School Type</label>
                  <select
                    value={profile.admissionType || "Boarding School"}
                    onChange={(e) => setProfile({ ...profile, admissionType: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] bg-white px-3.5 text-sm"
                  >
                    <option value="Boarding School">Boarding School</option>
                    <option value="Day">Day School</option>
                    <option value="Play School">Play School</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">Preferred City</label>
                  <input
                    value={profile.preferredCity || ""}
                    onChange={(e) => setProfile({ ...profile, preferredCity: e.target.value })}
                    placeholder="e.g. Dehradun, Mussoorie, Pune"
                    className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">Preferred Board</label>
                  <select
                    value={profile.preferredBoard || "CBSE"}
                    onChange={(e) => setProfile({ ...profile, preferredBoard: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] bg-white px-3.5 text-sm"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE / CISCE</option>
                    <option value="IB">IB Board</option>
                    <option value="Cambridge">Cambridge / IGCSE</option>
                    <option value="State Board">State Board</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="vv-btn inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 text-sm font-bold text-white shadow-sm"
                  >
                    {saving ? "Saving Preferences..." : "Save Education Preferences"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 7: CHANGE PASSWORD */}
          {tab === "password" && (
            <div className="vv-rise max-w-md rounded-2xl border border-[#E1E7EE] bg-white p-6 shadow-sm">
              <h1 className="text-xl font-extrabold text-[#0B2A47]">Change Password</h1>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await portalApi("/portal/auth/change-password", {
                      method: "POST",
                      body: JSON.stringify(pwdForm),
                    });
                    showToast("Password updated successfully.");
                    setPwdForm({ currentPassword: "", newPassword: "" });
                  } catch (err: any) {
                    showToast(err.message || "Failed to update password.");
                  }
                }}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">Current Password</label>
                  <div className="relative">

  <input
                    type={showPwdCurrent ? "text" : "password"}
                    required
                    value={pwdForm.currentPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] px-3.5 pr-11 text-sm"
                  />

  <button

    type="button"

    tabIndex={-1}

    onClick={() => setShowPwdCurrent(!showPwdCurrent)}

    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8896A6] hover:text-[#0A5C91]"

    aria-label={showPwdCurrent ? "Hide password" : "Show password"}

  >

    {showPwdCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}

  </button>

</div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#4E5A68]">New Password (Minimum 6 Characters)</label>
                  <div className="relative">

  <input
                    type={showPwdNew ? "text" : "password"}
                    required
                    minLength={6}
                    value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-[#D6DDE5] px-3.5 pr-11 text-sm"
                  />

  <button

    type="button"

    tabIndex={-1}

    onClick={() => setShowPwdNew(!showPwdNew)}

    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8896A6] hover:text-[#0A5C91]"

    aria-label={showPwdNew ? "Hide password" : "Show password"}

  >

    {showPwdNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}

  </button>

</div>
                </div>
                <button
                  type="submit"
                  className="vv-btn inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0A5C91] px-6 text-sm font-bold text-white shadow-sm"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Admission Support Desk Modal */}
      {supportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setSupportModal(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-[#0A5C91]">
                <Headphones className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0B2A47]">VidyaVista Admission Helpdesk</h3>
                <p className="text-xs text-[#5C6A7B]">
                  Application Reference: #{supportModal.applicationNumber || `VV-${String(supportModal.id || 1000).padStart(4, "0")}`}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-[#FAFBFD] border border-[#E2E8F0] p-3 text-xs text-[#5C6A7B]">
              Target School: <strong className="text-[#0B2A47]">{supportModal.schoolName}</strong><br />
              Student: <strong className="text-[#0B2A47]">{supportModal.childName || profile?.studentName || "Student"}</strong> ({supportModal.className})
            </div>

            <p className="mt-3 text-xs text-[#5C6A7B]">
              Our Senior Admission Counselor will assist you with fee structure, campus visit booking, interaction scheduling, and documentation.
            </p>

            <div className="mt-5 space-y-2.5">
              <a
                href={`https://wa.me/919172393083?text=${encodeURIComponent(
                  `Hello VidyaVista Admission Desk, I need assistance regarding my application #${supportModal.applicationNumber || `VV-${String(supportModal.id || 1000).padStart(4, "0")}`} for ${supportModal.schoolName} (Student: ${supportModal.childName || profile?.studentName || "Child"}).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#20bd5a] transition"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Connect with Counselor on WhatsApp</span>
              </a>

              <a
                href="tel:+919172393083"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0A5C91] bg-white py-2.5 text-xs font-bold text-[#0A5C91] hover:bg-sky-50 transition"
              >
                <Phone className="h-4 w-4" />
                <span>Call Admission Helpline (+91 91723 93083)</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  showToast("Callback request registered! Our senior counselor will call you shortly.");
                  setSupportModal(null);
                }}
                className="w-full rounded-xl bg-[#0B2A47] py-2.5 text-xs font-bold text-white hover:bg-[#0A5C91] transition"
              >
                Request Priority Callback
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
