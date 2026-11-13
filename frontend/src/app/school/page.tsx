"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  ExternalLink,
  FileEdit,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Eye,
  EyeOff,
  Phone,
  Plus,
  PlusCircle,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Unlock,
  Upload,
  Video,
  X,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  clearPortalSession,
  getPortalToken,
  portalApi,
  portalUpload,
  type PortalInvoice,
  type PortalMembership,
  type PortalPlan,
  type SchoolLead,
} from "../lib/portalApi";

const ALL_FACILITIES = [
  "Transport", "Sports", "Science labs", "Library", "Computer lab", "Hostel",
  "Swimming pool", "Smart classes", "Music & Arts", "Cafeteria", "Medical room",
  "CCTV", "Playground", "Auditorium",
];

const GRADE_OPTIONS = [
  "Toddler", "Nursery", "LKG", "UKG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
  "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12",
];

type TabKey = "dashboard" | "school_setup" | "leads" | "wizard" | "plans" | "invoices" | "reviews" | "password";

export default function SchoolPortalPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [account, setAccount] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<SchoolLead[]>([]);
  const [memberships, setMemberships] = useState<PortalMembership[]>([]);
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [plans, setPlans] = useState<PortalPlan[]>([]);

  // Multi-school / Branch Management
  const [managedSchools, setManagedSchools] = useState<any[]>([]);
  const [pendingBranchClaims, setPendingBranchClaims] = useState<any[]>([]);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [branchSearchResults, setBranchSearchResults] = useState<any[]>([]);
  const [branchSearching, setBranchSearching] = useState(false);
  const [selectedBranchToClaim, setSelectedBranchToClaim] = useState<any | null>(null);
  const [branchProofText, setBranchProofText] = useState("");
  const [branchSubmitting, setBranchSubmitting] = useState(false);

  // Stage 2: Claim Existing School or Add New School states
  const [setupMode, setSetupMode] = useState<"claim" | "new">("claim");
  const [claimQuery, setClaimQuery] = useState("");
  const [claimResults, setClaimResults] = useState<any[]>([]);
  const [claimingSearching, setClaimingSearching] = useState(false);
  const [selectedClaimSchool, setSelectedClaimSchool] = useState<any | null>(null);
  const [claimProofText, setClaimProofText] = useState("");
  const [newSchoolForm, setNewSchoolForm] = useState({
    name: "",
    board: "CBSE",
    type: "Day",
    city: "",
    state: "",
    area: "",
    address: "",
    pincode: "",
    phone: "",
    email: "",
    affiliationNo: "",
  });
  const [submittingSchoolReq, setSubmittingSchoolReq] = useState(false);

  // Leads filters & modals
  const [leadFilter, setLeadFilter] = useState<string>("all");
  const [leadSearch, setLeadSearch] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<SchoolLead | null>(null);
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  const [noCreditsModal, setNoCreditsModal] = useState(false);

  // Chat modal state
  const [chatLead, setChatLead] = useState<SchoolLead | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Subscribe / Checkout modal
  const [checkoutPlan, setCheckoutPlan] = useState<PortalPlan | null>(null);
  const [paymentMode, setPaymentMode] = useState("upi");
  const [paymentNote, setPaymentNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [subscribing, setSubscribing] = useState(false);

  // Invoice Print Modal
  const [activeInvoice, setActiveInvoice] = useState<PortalInvoice | null>(null);

  // 10-Step Onboarding Wizard state (Stage 3: Staged Edits)
  const [wizardStep, setWizardStep] = useState(1);
  const [savingProfile, setSavingProfile] = useState(false);
  const [form, setForm] = useState<any>({
    name: "", area: "", city: "", state: "", pincode: "", address: "",
    board: "CBSE", type: "Day", gender: "Co-ed", gradeFrom: "Nursery", gradeTo: "Class 12",
    admissionStatus: "open", admissionSession: "2027-28",
    contactPerson: "", designation: "", phone: "", landline: "", email: "", website: "",
    youtubeUrl: "", facebookUrl: "", instagramUrl: "", linkedinUrl: "",
    medium: "English", studentTeacherRatio: "20:1", schoolTiming: "8:00 AM - 2:30 PM",
    affiliationNo: "", campus: "", established: "", students: "", teachers: "", about: "",
    facilities: [] as string[],
    feeMin: "", feeMax: "", feeNote: "",
    feeComponents: [] as any[],
    awards: [] as any[],
    videos: [] as any[],
    photos: [] as any[],
    image: "", logoUrl: "", brochureUrl: "",
  });

  // Password Change state
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  async function handleFileUpload(file: File, field: "image" | "logoUrl" | "brochureUrl") {
    if (!file) return;
    try {
      setUploadingField(field);
      const res = await portalUpload(file);
      if (res && res.url) {
        setForm((prev: any) => ({ ...prev, [field]: res.url }));
        showToast(
          field === "brochureUrl"
            ? "Brochure uploaded successfully!"
            : field === "logoUrl"
            ? "School logo uploaded successfully!"
            : "Cover image uploaded successfully!"
        );
      }
    } catch (err: any) {
      showToast(err?.message || "File upload failed.");
    } finally {
      setUploadingField(null);
    }
  }

  async function handleGalleryUpload(file: File, index: number) {
    if (!file) return;
    try {
      setUploadingField(`photo_${index}`);
      const res = await portalUpload(file);
      if (res && res.url) {
        setForm((prev: any) => {
          const next = [...(prev.photos || [])];
          next[index] = { ...next[index], url: res.url };
          return { ...prev, photos: next };
        });
        showToast("Gallery photo uploaded successfully!");
      }
    } catch (err: any) {
      showToast(err?.message || "Gallery photo upload failed.");
    } finally {
      setUploadingField(null);
    }
  }

  const [curPassword, setCurPassword] = useState("");
  const [showCurPwd, setShowCurPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 5000);
  };

  const loadDashboard = useCallback(async () => {
    if (!getPortalToken()) {
      router.push("/login?role=school");
      return;
    }
    try {
      const res = await portalApi("/portal/school/dashboard");
      setAccount(res.account);
      setSchool(res.school);
      setCredits(res.credits);
      setStats(res.stats);
      setLeads(res.recentLeads || []);
      setMemberships(res.memberships || []);
      setInvoices(res.invoices || []);
      setPlans(res.plans || []);
      setManagedSchools(res.managedSchools || []);
      setPendingBranchClaims(res.pendingBranchClaims || []);

      if (res.account) {
        setClaimProofText(res.account.claimProof || "");
        setNewSchoolForm((prev) => ({
          ...prev,
          name: prev.name || res.account.institutionName || "",
          city: prev.city || res.account.city || "",
          state: prev.state || res.account.state || "",
          phone: prev.phone || res.account.mobile || "",
          email: prev.email || res.account.email || "",
          affiliationNo: prev.affiliationNo || res.account.claimProof || "",
        }));
      }

      if (res.school) {
        const s = res.school;
        setForm({
          name: s.name || "",
          area: s.area || "",
          city: s.city || "",
          state: s.state || "",
          pincode: s.pincode || "",
          address: s.address || "",
          board: s.board || "CBSE",
          type: s.type || "Day",
          gender: s.gender || "Co-ed",
          gradeFrom: s.gradeFrom || "Nursery",
          gradeTo: s.gradeTo || "Class 12",
          admissionStatus: s.admissionStatus || "open",
          admissionSession: s.admissionSession || "2027-28",
          contactPerson: res.account?.contactPerson || "",
          designation: res.account?.designation || "",
          phone: s.phone || "",
          landline: s.landline || "",
          email: s.email || "",
          website: s.website || "",
          youtubeUrl: s.youtubeUrl || "",
          facebookUrl: s.facebookUrl || "",
          instagramUrl: s.instagramUrl || "",
          linkedinUrl: s.linkedinUrl || "",
          medium: s.medium || "English",
          studentTeacherRatio: s.studentTeacherRatio || "",
          schoolTiming: s.schoolTiming || "",
          affiliationNo: s.affiliationNo || "",
          campus: s.campus || "",
          established: s.established || "",
          students: s.students || "",
          teachers: s.teachers || "",
          about: s.about || "",
          facilities: s.facilities || [],
          feeMin: s.feeMin || "",
          feeMax: s.feeMax || "",
          feeNote: s.feeNote || "",
          feeComponents: s.feeComponents?.length
            ? s.feeComponents
            : [{ session: "2027-28", className: "All classes", name: "Annual Tuition Fee", frequency: "Annually", amount: s.feeMin || 65000 }],
          awards: s.awards?.length ? s.awards : [{ name: "", position: "", year: "2025" }],
          videos: s.videos?.length ? s.videos : [{ title: "Campus Virtual Tour", youtubeUrl: s.youtubeUrl || "" }],
          photos: s.photos?.length ? s.photos : [{ url: s.image || "", caption: "Main Campus Building" }],
          image: s.image || "",
          logoUrl: s.logoUrl || "",
          brochureUrl: s.brochureUrl || "",
        });
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        router.push("/login?role=school");
        return;
      }
      setError(err.message || "Failed to load institution dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Search existing schools for Stage 2 Claim
  useEffect(() => {
    if (tab !== "school_setup" || setupMode !== "claim" || claimQuery.trim().length < 2) {
      setClaimResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setClaimingSearching(true);
      try {
        const res = await portalApi(`/portal/schools-search?q=${encodeURIComponent(claimQuery.trim())}`);
        setClaimResults(res.data || []);
      } catch {
        setClaimResults([]);
      } finally {
        setClaimingSearching(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [claimQuery, tab, setupMode]);

  const handleSubmitSchoolRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (account?.status !== "approved") {
      setError("Your Owner Profile must be approved by the Administrator before submitting a school claim or addition.");
      return;
    }
    if (setupMode === "claim" && !selectedClaimSchool) {
      setError("Please search and select an existing school from the list first.");
      return;
    }
    setSubmittingSchoolReq(true);
    setError("");
    try {
      const payload =
        setupMode === "claim"
          ? {
              mode: "claim",
              schoolId: selectedClaimSchool.schoolId,
              claimProof: claimProofText,
            }
          : {
              mode: "new",
              ...newSchoolForm,
            };
      const res = await portalApi("/portal/school/request-school", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast(res.message || "Request submitted for Administrator approval.");
      await loadDashboard();
      setTab("dashboard");
    } catch (err: any) {
      setError(err.message || "Could not submit school request.");
    } finally {
      setSubmittingSchoolReq(false);
    }
  };

  const handleUnlockLead = async (lead: SchoolLead) => {
    setUnlockingId(lead.id);
    try {
      const res = await portalApi(`/portal/school/leads/${lead.id}/unlock`, {
        method: "POST",
      });
      showToast(res.message || "Lead unlocked! 1 credit used.");
      setSelectedLead(res.lead);
      await loadDashboard();
    } catch (err: any) {
      if (err.status === 402 || err.code === "NO_CREDITS") {
        setNoCreditsModal(true);
      } else {
        setError(err.message || "Could not unlock lead.");
      }
    } finally {
      setUnlockingId(null);
    }
  };

  const handleLeadAction = async (leadId: number, action: string, reason = "", schoolNote = "", followupDate = "") => {
    try {
      const res = await portalApi(`/portal/school/leads/${leadId}/update`, {
        method: "POST",
        body: JSON.stringify({ action, reason, schoolNote, followupDate }),
      });
      showToast("Lead status updated.");
      setLeads((prev) => prev.map((l) => (l.id === leadId ? res.lead : l)));
      if (selectedLead?.id === leadId) setSelectedLead(res.lead);
    } catch (err: any) {
      setError(err.message || "Failed to update lead.");
    }
  };

  const handleSaveWizardStep = async (nextStep?: number) => {
    if (account?.status !== "approved") {
      setError("Your Owner Profile is pending Administrator approval. Once approved, you can submit profile changes.");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await portalApi("/portal/school/profile", {
        method: "POST",
        body: JSON.stringify({ ...form, wizardStep: nextStep || wizardStep }),
      });
      showToast(res.message || "Changes saved and submitted for Administrator approval.");
      if (nextStep) setWizardStep(nextStep);
      await loadDashboard();
    } catch (err: any) {
      setError(err.message || "Could not save profile changes.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!checkoutPlan || !couponCode.trim()) return;
    try {
      const res = await portalApi("/portal/coupons/check", {
        method: "POST",
        body: JSON.stringify({ code: couponCode, amount: checkoutPlan.price }),
      });
      setCouponDiscount(res.discountAmount || 0);
      showToast(`Coupon ${res.code} applied! Rs. ${res.discountAmount} discount.`);
    } catch (err: any) {
      setCouponDiscount(0);
      setError(err.message || "Invalid coupon code.");
    }
  };

  const handleSubscribePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan) return;
    setSubscribing(true);
    try {
      const res = await portalApi("/portal/school/subscribe", {
        method: "POST",
        body: JSON.stringify({
          planId: checkoutPlan.id,
          paymentMode,
          paymentNote: paymentNote || "Portal Online Subscription",
          couponCode,
        }),
      });
      showToast(res.message || "Plan activated successfully!");
      setCheckoutPlan(null);
      setCouponCode("");
      setCouponDiscount(0);
      await loadDashboard();
      setTab("plans");
    } catch (err: any) {
      setError(err.message || "Failed to activate plan.");
    } finally {
      setSubscribing(false);
    }
  };

  const handleSwitchBranch = async (targetId: number) => {
    if (!targetId || targetId === school?.id) {
      setShowAccountSwitcher(false);
      return;
    }
    try {
      const res = await portalApi<{ ok: boolean; message: string }>("/portal/school/switch-branch", {
        method: "POST",
        body: JSON.stringify({ schoolId: targetId }),
      });
      showToast(res.message || "Switched active school.");
      setShowAccountSwitcher(false);
      await loadDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to switch school.");
    }
  };

  const handleSearchBranch = async () => {
    if (branchSearchQuery.trim().length < 2) return;
    setBranchSearching(true);
    try {
      const res = await portalApi<{ data: any[] }>(`/portal/schools-search?q=${encodeURIComponent(branchSearchQuery.trim())}`);
      setBranchSearchResults(res.data || []);
    } catch {
      setBranchSearchResults([]);
    } finally {
      setBranchSearching(false);
    }
  };

  useEffect(() => {
    if (!showBranchModal || branchSearchQuery.trim().length < 2) {
      return;
    }
    const timer = setTimeout(() => {
      handleSearchBranch();
    }, 300);
    return () => clearTimeout(timer);
  }, [branchSearchQuery, showBranchModal]);

  const handleClaimBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchToClaim) {
      setError("Please choose a school to link as a branch.");
      return;
    }
    setBranchSubmitting(true);
    try {
      const res = await portalApi<{ message: string }>("/portal/school/claim-branch", {
        method: "POST",
        body: JSON.stringify({
          schoolId: selectedBranchToClaim.schoolId || selectedBranchToClaim.id,
          proof: branchProofText.trim(),
        }),
      });
      showToast(res.message);
      setShowBranchModal(false);
      setSelectedBranchToClaim(null);
      setBranchProofText("");
      setBranchSearchQuery("");
      setBranchSearchResults([]);
      loadDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to submit branch claim.");
    } finally {
      setBranchSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await portalApi("/portal/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: curPassword, newPassword }),
      });
      showToast(res.message || "Password updated successfully.");
      setCurPassword("");
      setNewPassword("");
    } catch (err: any) {
      setError(err.message || "Could not change password.");
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (leadFilter === "unlocked" && !l.isUnlocked) return false;
    if (leadFilter === "locked" && l.isUnlocked) return false;
    if (leadFilter === "rejected" && l.schoolStatus !== "rejected") return false;
    if (leadFilter === "review_requested" && l.schoolStatus !== "review_requested") return false;
    if (leadSearch.trim()) {
      const q = leadSearch.toLowerCase();
      return (
        l.parentName.toLowerCase().includes(q) ||
        l.childName.toLowerCase().includes(q) ||
        l.className.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA]">
        <Navbar />
        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#0795DC] border-t-transparent" />
          <p className="mt-4 font-bold text-[#0A5C91]">Loading Institution Portal...</p>
        </div>
      </div>
    );
  }

  const yearlyPlans = plans.filter((p) => p.planType === "yearly" || p.planType === "free");
  const topupPacks = plans.filter((p) => p.planType === "topup");

  const ownerApproved = account?.status === "approved";
  const schoolApproved = account?.schoolLinkStatus === "approved" && Boolean(school?.schoolId);

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#12304A]">
      <Navbar />

      {toast && (
        <div className="vv-pop fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#0B2A47] px-5 py-3.5 text-sm font-bold text-white shadow-2xl">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {error && (
        <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError("")} className="ml-4 font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Institution Header Bar */}
        <div className="vv-rise flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#0B2A47] via-[#0A5C91] to-[#0795DC] p-6 text-white shadow-lg sm:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <Building2 className="h-3.5 w-3.5" />
                <span>Institution Portal</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  ownerApproved ? "bg-emerald-400/20 text-emerald-200" : "bg-amber-400/25 text-amber-100"
                }`}
              >
                {ownerApproved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                <span>{ownerApproved ? "Owner Profile Approved" : "Owner Profile Pending Approval"}</span>
              </span>
              {account?.schoolLinkStatus === "approved" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/25 px-3 py-1 text-xs font-bold uppercase text-sky-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>School Linked & Live</span>
                </span>
              )}
              {account?.editApprovalStatus === "pending" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-400/30 px-3 py-1 text-xs font-bold uppercase text-rose-100">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Profile Edits Pending Admin Review</span>
                </span>
              )}
            </div>
            {/* Instagram-style School Account Switcher Button */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowAccountSwitcher(true)}
                className="group flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-2.5 text-left transition hover:bg-white/25 border border-white/25 backdrop-blur-sm shadow-sm"
                title="Click to switch school or link another branch"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white font-bold overflow-hidden border border-white/30 shadow-inner">
                  {school?.image ? (
                    <img src={school.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-extrabold text-white sm:text-2xl group-hover:text-sky-100 transition">
                      {school?.name || account?.institutionName || "School Owner Account"}
                    </span>
                    <ChevronDown className="h-5 w-5 text-sky-200 transition group-hover:translate-y-0.5" />
                  </div>
                  <p className="text-xs text-sky-100 font-medium">
                    {school?.city ? `${school.city} • ` : ""}
                    {managedSchools.length} {managedSchools.length <= 1 ? "School Linked" : "Schools / Branches"} &middot; <span className="underline font-bold text-white">Switch School</span>
                  </p>
                </div>
              </button>
            </div>
            <p className="mt-2 text-sm text-sky-100">
              {account?.contactPerson} ({account?.designation}) &middot; {account?.mobile} &middot; {account?.email}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-200">Lead Credits Balance</p>
              <p className="mt-0.5 text-2xl font-extrabold">
                {credits?.leadsRemaining ?? 0}{" "}
                <span className="text-sm font-normal text-sky-200">/ {credits?.leadsTotal ?? 0} Credits</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAccountSwitcher(true)}
              className="vv-btn inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white/20 px-4 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/30"
              title="Switch active school"
            >
              <Building2 className="h-4 w-4" />
              <span>Switch School ({managedSchools.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBranchModal(true)}
              className="vv-btn inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white/20 px-4 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/30"
              title="Link or add another branch"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Link Another Branch</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("plans")}
              className="vv-btn inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#EC0E58] px-5 text-sm font-bold text-white shadow-md"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{(credits?.leadsRemaining ?? 0) === 0 ? "Buy Plan / +100 Leads" : "Add Lead Credits"}</span>
            </button>
            {school?.slug && schoolApproved && (
              <Link
                href={`/schools/${school.slug}`}
                target="_blank"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <span>View Public Page</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Main Grid: Sidebar + Active View */}
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          {/* Sidebar Menu */}
          <aside className="lg:col-span-3">
            <div className="rounded-3xl border border-[#D6DDE5] bg-white p-4 shadow-sm">
              <div className="mb-4 rounded-2xl bg-[#F0F8FF] p-4">
                <div className="flex items-center justify-between text-xs font-bold text-[#0A5C91]">
                  <span>Profile Completion</span>
                  <span>{account?.profileCompletion ?? 20}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#D6DDE5]">
                  <div
                    className="vv-fill h-full rounded-full bg-gradient-to-r from-[#0A5C91] to-[#0795DC]"
                    style={{ width: `${account?.profileCompletion ?? 20}%` }}
                  />
                </div>
              </div>

              <nav className="space-y-1">
                {(
                  [
                    { key: "dashboard", label: "Dashboard Overview", icon: LayoutDashboard },
                    {
                      key: "school_setup",
                      label: schoolApproved ? "Linked School Status" : "Add or Claim School",
                      icon: Building2,
                      badge: account?.schoolLinkStatus === "pending_claim" || account?.schoolLinkStatus === "pending_new" ? "Pending" : undefined,
                    },
                    { key: "leads", label: `Admission Leads (${stats?.totalLeads ?? 0})`, icon: Inbox },
                    {
                      key: "wizard",
                      label: "Edit School Profile (10 Steps)",
                      icon: FileEdit,
                      badge: account?.editApprovalStatus === "pending" ? "In Review" : undefined,
                    },
                    { key: "plans", label: "Plans & Lead Top-ups", icon: CreditCard },
                    { key: "invoices", label: `GST Invoices (${invoices.length})`, icon: FileText },
                    { key: "reviews", label: `Parent Reviews (${school?.reviews?.length ?? 0})`, icon: Star },
                    { key: "password", label: "Change Password", icon: KeyRound },
                  ] as const
                ).map((item) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                        tab === item.key
                          ? "bg-[#0A5C91] text-white shadow-sm"
                          : "text-[#4E5A68] hover:bg-[#F1F5F9] hover:text-[#0B2A47]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <IconComp className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {"badge" in item && item.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            tab === item.key ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    clearPortalSession();
                    router.push("/login?role=school");
                  }}
                  className="mt-4 flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="space-y-6 lg:col-span-9">
            {/* 3-STAGE APPROVAL STATUS TRACKER BANNER (Always visible for clarity) */}
            <div className="vv-rise rounded-3xl border border-[#D6DDE5] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#0B2A47]">
                    Account &amp; School Verification Status
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Every step—Owner Profile, School Addition/Claim, and Profile Edits—is verified by the VidyaVista Administrator before publishing live.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {/* Stage 1 Card */}
                <div
                  className={`rounded-2xl border p-4 transition ${
                    ownerApproved
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-amber-200 bg-amber-50/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4E5A68]">Stage 1: Owner Profile</span>
                    {ownerApproved ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-extrabold text-[#0B2A47]">
                    {ownerApproved ? "Approved by Admin" : "Pending Admin Approval"}
                  </p>
                  <p className="mt-1 text-xs text-[#4E5A68]">
                    {ownerApproved
                      ? "Your Owner Profile is verified."
                      : "Waiting for Administrator approval. Once approved, you can add or claim your school."}
                  </p>
                </div>

                {/* Stage 2 Card */}
                <div
                  className={`rounded-2xl border p-4 transition ${
                    schoolApproved
                      ? "border-emerald-200 bg-emerald-50/60"
                      : account?.schoolLinkStatus === "pending_claim" || account?.schoolLinkStatus === "pending_new"
                        ? "border-amber-200 bg-amber-50/70"
                        : "border-[#D6DDE5] bg-[#F8FAFC]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4E5A68]">Stage 2: School Listing</span>
                    {schoolApproved ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Building2 className="h-4 w-4 text-[#0A5C91]" />
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-extrabold text-[#0B2A47]">
                    {schoolApproved
                      ? "School Approved & Linked"
                      : account?.schoolLinkStatus === "pending_claim"
                        ? "School Claim Pending Approval"
                        : account?.schoolLinkStatus === "pending_new"
                          ? "New School Pending Approval"
                          : "Add or Claim Your School"}
                  </p>
                  <p className="mt-1 text-xs text-[#4E5A68]">
                    {schoolApproved
                      ? `Linked to ${school?.name}`
                      : account?.schoolLinkStatus === "pending_claim" || account?.schoolLinkStatus === "pending_new"
                        ? `Request for "${account?.requestedSchoolName || account?.institutionName}" is under Admin review.`
                        : ownerApproved
                          ? "Click below to claim an existing school or add a new school."
                          : "Unlocks automatically after Stage 1 approval."}
                  </p>
                  {ownerApproved && !schoolApproved && tab !== "school_setup" && (
                    <button
                      type="button"
                      onClick={() => setTab("school_setup")}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#0A5C91] underline"
                    >
                      <span>{account?.schoolLinkStatus === "none" ? "Add or Claim School Now" : "View Request Status"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Stage 3 Card */}
                <div
                  className={`rounded-2xl border p-4 transition ${
                    account?.editApprovalStatus === "pending"
                      ? "border-amber-200 bg-amber-50/70"
                      : account?.editApprovalStatus === "approved"
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-[#D6DDE5] bg-[#F8FAFC]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4E5A68]">Stage 3: Profile Updates</span>
                    {account?.editApprovalStatus === "pending" ? (
                      <Clock className="h-4 w-4 text-amber-600" />
                    ) : (
                      <FileEdit className="h-4 w-4 text-[#0A5C91]" />
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-extrabold text-[#0B2A47]">
                    {account?.editApprovalStatus === "pending"
                      ? "Edits Pending Admin Review"
                      : account?.editApprovalStatus === "approved"
                        ? "Latest Edits Published Live"
                        : "Ready for Profile Edits"}
                  </p>
                  <p className="mt-1 text-xs text-[#4E5A68]">
                    {account?.editApprovalStatus === "pending"
                      ? "Your saved edits are queued for Admin approval before updating the live website."
                      : "Any edits you make in the 10-step editor are verified by Admin before going live."}
                  </p>
                </div>
              </div>
            </div>

            {/* TAB 1: DASHBOARD */}
            {tab === "dashboard" && (
              <div className="vv-rise space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[#D6DDE5] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <p className="text-xs font-bold uppercase text-[#64748B]">Total Leads Received</p>
                    <p className="mt-2 text-3xl font-extrabold text-[#0B2A47]">{stats?.totalLeads ?? 0}</p>
                    <p className="mt-1 text-xs text-[#0795DC]">{stats?.pendingLeads ?? 0} waiting to unlock</p>
                  </div>
                  <div className="rounded-2xl border border-[#D6DDE5] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <p className="text-xs font-bold uppercase text-[#64748B]">Unlocked Contacts</p>
                    <p className="mt-2 text-3xl font-extrabold text-emerald-600">{stats?.unlockedLeads ?? 0}</p>
                    <p className="mt-1 text-xs text-[#64748B]">{credits?.leadsRemaining ?? 0} credits remaining</p>
                  </div>
                  <div className="rounded-2xl border border-[#D6DDE5] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <p className="text-xs font-bold uppercase text-[#64748B]">Shortlisted by Parents</p>
                    <p className="mt-2 text-3xl font-extrabold text-[#EC0E58]">{stats?.shortlists ?? 0}</p>
                    <p className="mt-1 text-xs text-[#64748B]">High-intent parents</p>
                  </div>
                  <div className="rounded-2xl border border-[#D6DDE5] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <p className="text-xs font-bold uppercase text-[#64748B]">Parent Reviews</p>
                    <p className="mt-2 text-3xl font-extrabold text-amber-500">
                      {school?.rating ?? "0.0"}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">{stats?.reviews ?? 0} approved reviews</p>
                  </div>
                </div>

                {/* Current Plan Banner */}
                <div className="rounded-3xl border border-[#D6DDE5] bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="rounded-full bg-[#F0F8FF] px-3 py-1 text-xs font-bold text-[#0A5C91]">
                        Current Membership Plan
                      </span>
                      <h2 className="mt-2 text-xl font-extrabold text-[#0B2A47]">
                        {credits?.activePlanName}
                      </h2>
                      <p className="mt-1 text-sm text-[#4E5A68]">
                        {credits?.hasActivePlan
                          ? `Valid until ${credits.endDate} (${credits.daysRemaining} days remaining) · ${credits.leadsUsed} of ${credits.leadsTotal} lead credits used.`
                          : "Parent phone numbers and email addresses are masked until you activate a 1-Year Membership Plan or Lead Booster Pack."}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setTab("plans")}
                        className="vv-btn inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-5 text-sm font-semibold text-white shadow-sm"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>{credits?.hasActivePlan ? "Buy +50 / +100 Lead Top-up" : "View 1-Year Plans (100 Leads)"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Leads Preview */}
                <div className="rounded-3xl border border-[#D6DDE5] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-[#0B2A47]">
                        Students Looking for Admission in Your School
                      </h2>
                      <p className="text-xs text-[#64748B]">
                        Parent mobile numbers and emails remain masked until you unlock the lead using 1 plan credit.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab("leads")}
                      className="inline-flex items-center gap-1 text-sm font-bold text-[#0795DC] hover:underline"
                    >
                      <span>View All Leads</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {leads.length === 0 ? (
                    <div className="mt-6 rounded-2xl bg-[#F8FAFC] p-8 text-center text-sm text-[#64748B]">
                      {schoolApproved
                        ? "No parent enquiries received yet. Complete your 10-step school profile to attract more parents."
                        : "Once your Owner Profile and School Listing are approved by the Administrator, parent admission enquiries for your school will appear here."}
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {leads.slice(0, 4).map((lead) => (
                        <div
                          key={lead.id}
                          className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] p-4 transition hover:-translate-y-0.5 hover:border-[#0795DC] hover:shadow-sm"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="rounded-full bg-[#F0F8FF] px-2.5 py-0.5 text-[11px] font-bold text-[#0A5C91]">
                                {lead.leadSourceTag}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                  lead.isUnlocked
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {lead.isUnlocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                <span>{lead.isUnlocked ? "Contact Unlocked" : "Contact Masked"}</span>
                              </span>
                            </div>
                            <h3 className="mt-2.5 text-base font-extrabold text-[#0B2A47]">
                              {lead.parentName}{" "}
                              <span className="text-xs font-normal text-[#64748B]">
                                (Child: {lead.childName})
                              </span>
                            </h3>
                            <p className="mt-1 text-xs font-semibold text-[#4E5A68]">
                              Admission For: <span className="text-[#0A5C91]">{lead.className}</span> ({lead.session}) &middot; City: {lead.city}
                            </p>
                            <div className="mt-2.5 space-y-1 rounded-xl bg-[#F8FAFC] p-2.5 text-xs">
                              <p className="flex items-center gap-1.5 font-semibold text-[#334155]">
                                <Phone className="h-3.5 w-3.5 text-[#0A5C91]" />
                                <span>Mobile:</span>{" "}
                                <span className={lead.isUnlocked ? "font-bold text-emerald-700" : "font-mono text-rose-600"}>
                                  {lead.mobile}
                                </span>
                              </p>
                              <p className="flex items-center gap-1.5 font-semibold text-[#334155]">
                                <Mail className="h-3.5 w-3.5 text-[#0A5C91]" />
                                <span>Email:</span>{" "}
                                <span className={lead.isUnlocked ? "font-bold text-[#0B2A47]" : "font-mono text-[#64748B]"}>
                                  {lead.email}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            {lead.isUnlocked ? (
                              <>
                                <a
                                  href={`tel:${lead.mobile}`}
                                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  <span>Call Parent</span>
                                </a>
                                
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={unlockingId === lead.id}
                                onClick={() => handleUnlockLead(lead)}
                                className="vv-btn inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-3 text-xs font-bold text-white"
                              >
                                <Unlock className="h-3.5 w-3.5" />
                                <span>
                                  {unlockingId === lead.id
                                    ? "Unlocking..."
                                    : "Accept & Unlock Contact (1 Credit)"}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: STAGE 2 — ADD A NEW SCHOOL OR CLAIM AN EXISTING SCHOOL */}
            {tab === "school_setup" && (
              <div className="vv-rise rounded-3xl border border-[#D6DDE5] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-extrabold text-[#0B2A47]">
                  Stage 2: Claim an Existing School or Add a New School
                </h2>
                <p className="mt-1 text-sm text-[#64748B]">
                  Once your Owner Profile is approved, you can claim your school from our 10,000+ listed schools or submit a new school. The Administrator will review and approve your request.
                </p>

                {!ownerApproved ? (
                  <div className="mt-6 flex items-start gap-3.5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-bold">Your Owner Profile is Currently Pending Administrator Approval</p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800">
                        As soon as the VidyaVista Administrator approves your Owner Profile, this section will unlock so you can claim an existing school or submit a new school listing.
                      </p>
                    </div>
                  </div>
                ) : schoolApproved ? (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 className="h-5 w-5" />
                      <h3 className="text-base font-extrabold">Your School Listing is Approved and Linked</h3>
                    </div>
                    <p className="mt-2 text-sm text-[#12304A]">
                      Linked School: <strong>{school?.name}</strong> ({school?.city}, {school?.state}) &middot; Board: <strong>{school?.board}</strong>
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setTab("wizard")}
                        className="vv-btn inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0A5C91] px-4 text-sm font-semibold text-white"
                      >
                        <FileEdit className="h-4 w-4" />
                        <span>Edit School Profile (10 Steps)</span>
                      </button>
                      {school?.slug && (
                        <Link
                          href={`/schools/${school.slug}`}
                          target="_blank"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#0A5C91] bg-white px-4 text-sm font-semibold text-[#0A5C91]"
                        >
                          <span>View Live Public Page</span>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {(account?.schoolLinkStatus === "pending_claim" || account?.schoolLinkStatus === "pending_new") && (
                      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sky-200 bg-[#F0F8FF] p-4 text-sm text-[#0B2A47]">
                        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#0A5C91]" />
                        <div>
                          <p className="font-bold text-[#0A5C91]">
                            {account?.schoolLinkStatus === "pending_claim"
                              ? `Claim Request Submitted: ${account?.requestedSchoolName}`
                              : `New School Submitted: ${account?.requestedSchoolName || account?.institutionName}`}
                          </p>
                          <p className="mt-0.5 text-xs text-[#4E5A68]">
                            Your request is currently waiting for Administrator approval. You can also update your request below or pre-fill your 10-step profile details in the meantime.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Mode Switcher: Claim Existing vs Add New */}
                    <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl bg-[#F1F5F9] p-1.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setSetupMode("claim")}
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                          setupMode === "claim" ? "bg-[#0A5C91] text-white shadow-sm" : "text-[#4E5A68]"
                        }`}
                      >
                        <Search className="h-4 w-4" />
                        <span>Claim Existing School (10,000+ Listed)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSetupMode("new")}
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                          setupMode === "new" ? "bg-[#0A5C91] text-white shadow-sm" : "text-[#4E5A68]"
                        }`}
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>Add a New School Listing</span>
                      </button>
                    </div>

                    <form onSubmit={handleSubmitSchoolRequest} className="mt-6 space-y-4">
                      {setupMode === "claim" ? (
                        <div className="space-y-4 rounded-2xl border border-[#D6DDE5] bg-[#F8FAFC] p-5">
                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0B2A47]">
                              Search Your School by Name or City *
                            </label>
                            <input
                              type="text"
                              value={claimQuery}
                              onChange={(e) => {
                                setClaimQuery(e.target.value);
                                setSelectedClaimSchool(null);
                              }}
                              placeholder="Type your school name or city (e.g. Delhi Public School, Dehradun)..."
                              className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-4 text-sm focus:border-[#0795DC] focus:outline-none"
                            />
                          </div>

                          {claimingSearching && (
                            <p className="text-xs font-semibold text-[#64748B]">Searching directory...</p>
                          )}

                          {claimResults.length > 0 && !selectedClaimSchool && (
                            <div className="max-h-60 overflow-y-auto rounded-xl border border-[#CBD5E1] bg-white divide-y divide-[#E2E8F0]">
                              {claimResults.map((s) => (
                                <button
                                  key={s.schoolId}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClaimSchool(s);
                                    setClaimQuery(`${s.name} (${s.city})`);
                                  }}
                                  className="flex w-full items-center justify-between px-4 py-3 text-left text-xs transition hover:bg-[#F0F8FF]"
                                >
                                  <div>
                                    <p className="font-bold text-[#0B2A47]">{s.name}</p>
                                    <p className="text-[#64748B]">
                                      {s.area}, {s.city}, {s.state} &middot; {s.board} &middot; {s.type}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-[#E1F1FA] px-3 py-1 font-bold text-[#0A5C91]">
                                    Select School
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {selectedClaimSchool && (
                            <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs">
                              <div>
                                <p className="font-bold text-emerald-900">
                                  Selected School: {selectedClaimSchool.name} ({selectedClaimSchool.city})
                                </p>
                                <p className="text-emerald-700">
                                  Board: {selectedClaimSchool.board} &middot; School ID: {selectedClaimSchool.schoolId}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedClaimSchool(null)}
                                className="font-bold text-rose-600 underline"
                              >
                                Change
                              </button>
                            </div>
                          )}

                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0B2A47]">
                              Affiliation Number / Verification Proof *
                            </label>
                            <input
                              type="text"
                              required
                              value={claimProofText}
                              onChange={(e) => setClaimProofText(e.target.value)}
                              placeholder="Enter CBSE/ICSE Affiliation No. or official verification details"
                              className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-4 text-sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 rounded-2xl border border-[#D6DDE5] bg-[#F8FAFC] p-5">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Full School Name *</label>
                              <input
                                type="text"
                                required
                                value={newSchoolForm.name}
                                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, name: e.target.value })}
                                placeholder="e.g. St. Xavier's International School"
                                className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Board *</label>
                              <select
                                value={newSchoolForm.board}
                                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, board: e.target.value })}
                                className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm"
                              >
                                {["CBSE", "ICSE", "IB", "Cambridge", "State Board", "NIOS", "No Board"].map((b) => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">School Type *</label>
                              <select
                                value={newSchoolForm.type}
                                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, type: e.target.value })}
                                className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm"
                              >
                                <option value="Day">Day School</option>
                                <option value="Boarding School">Boarding School</option>
                                <option value="Play School">Play School</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">City *</label>
                              <input
                                type="text"
                                required
                                value={newSchoolForm.city}
                                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, city: e.target.value })}
                                placeholder="e.g. Pune"
                                className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">State *</label>
                              <input
                                type="text"
                                required
                                value={newSchoolForm.state}
                                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, state: e.target.value })}
                                placeholder="e.g. Maharashtra"
                                className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Locality / Area</label>
                              <input
                                type="text"
                                value={newSchoolForm.area}
                                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, area: e.target.value })}
                                placeholder="e.g. Baner"
                                className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Affiliation Number</label>
                              <input
                                type="text"
                                value={newSchoolForm.affiliationNo}
                                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, affiliationNo: e.target.value })}
                                placeholder="e.g. 1130245"
                                className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-sm"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Full Campus Address</label>
                              <input
                                type="text"
                                value={newSchoolForm.address}
                                onChange={(e) => setNewSchoolForm({ ...newSchoolForm, address: e.target.value })}
                                className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submittingSchoolReq}
                        className="vv-btn inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 text-sm font-bold text-white shadow-md disabled:opacity-60"
                      >
                        <span>
                          {submittingSchoolReq
                            ? "Submitting Request..."
                            : setupMode === "claim"
                              ? "Submit School Claim for Admin Approval"
                              : "Submit New School for Admin Approval"}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* TAB 3: LEADS INBOX */}
            {tab === "leads" && (
              <div className="vv-rise rounded-3xl border border-[#D6DDE5] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#0B2A47]">Parent Admission Leads Inbox</h2>
                    <p className="text-xs text-[#64748B]">
                      Click &ldquo;Accept &amp; Unlock Contact&rdquo; to reveal the parent&apos;s phone number and email (uses 1 credit from your active plan).
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      placeholder="Search parent, child, class, city..."
                      className="h-10 rounded-xl border border-[#CBD5E1] px-3.5 text-xs focus:border-[#0795DC] focus:outline-none"
                    />
                    <select
                      value={leadFilter}
                      onChange={(e) => setLeadFilter(e.target.value)}
                      className="h-10 rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-semibold"
                    >
                      <option value="all">All Leads ({leads.length})</option>
                      <option value="locked">Masked / Pending ({stats?.pendingLeads ?? 0})</option>
                      <option value="unlocked">Unlocked / Accepted ({stats?.unlockedLeads ?? 0})</option>
                      <option value="rejected">Rejected ({stats?.rejectedLeads ?? 0})</option>
                      <option value="review_requested">Refund Requested ({stats?.reviewRequestedLeads ?? 0})</option>
                    </select>
                  </div>
                </div>

                {filteredLeads.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[#64748B]">
                    No admission leads match your filter.
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {filteredLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="rounded-2xl border border-[#E2E8F0] p-5 transition hover:border-[#0795DC]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#F0F8FF] px-3 py-0.5 text-xs font-bold text-[#0A5C91]">
                                {lead.leadSourceTag}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold ${
                                  lead.isUnlocked
                                    ? "bg-emerald-50 text-emerald-700"
                                    : lead.schoolStatus === "rejected"
                                      ? "bg-rose-50 text-rose-700"
                                      : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {lead.isUnlocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                <span>
                                  {lead.isUnlocked
                                    ? "Accepted & Contact Unlocked"
                                    : lead.schoolStatus === "rejected"
                                      ? "Rejected"
                                      : "Pending (Contact Masked)"}
                                </span>
                              </span>
                              <span className="text-xs text-[#64748B]">
                                Posted: {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            </div>

                            <h3 className="mt-2 text-lg font-extrabold text-[#0B2A47]">
                              {lead.parentName} <span className="text-sm font-medium text-[#64748B]">({lead.relation} of {lead.childName})</span>
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-[#4E5A68]">
                              <span>Looking For Class: <strong className="text-[#0A5C91]">{lead.className}</strong></span>
                              <span>Session: <strong>{lead.session}</strong></span>
                              <span>Current City: <strong>{lead.city}</strong></span>
                              <span>Preferred Location: <strong>{lead.preferredLocation}</strong></span>
                            </div>
                            {lead.note && (
                              <p className="mt-2 rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs text-[#475569]">
                                Parent Note: &ldquo;{lead.note}&rdquo;
                              </p>
                            )}
                          </div>

                          {/* Masked vs Unlocked Contact Box */}
                          <div className="min-w-[250px] rounded-2xl border border-[#D6DDE5] bg-[#F8FAFC] p-3.5 text-xs">
                            <p className="font-bold uppercase tracking-wider text-[#64748B]">Parent Contact Details</p>
                            <p className="mt-1.5 flex items-center gap-1.5 font-semibold">
                              <Phone className="h-3.5 w-3.5 text-[#0A5C91]" />
                              <span>Mobile:</span>{" "}
                              <span className={lead.isUnlocked ? "font-extrabold text-emerald-700" : "font-mono text-rose-600"}>
                                {lead.mobile}
                              </span>
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 font-semibold">
                              <Mail className="h-3.5 w-3.5 text-[#0A5C91]" />
                              <span>Email:</span>{" "}
                              <span className={lead.isUnlocked ? "font-bold text-[#0B2A47]" : "font-mono text-[#64748B]"}>
                                {lead.email}
                              </span>
                            </p>
                            {!lead.isUnlocked && (
                              <p className="mt-1.5 text-[11px] font-medium text-amber-700">
                                Calling is disabled until this lead is unlocked.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-[#F1F5F9] pt-3.5">
                          {!lead.isUnlocked ? (
                            <>
                              <button
                                type="button"
                                disabled={unlockingId === lead.id}
                                onClick={() => handleUnlockLead(lead)}
                                className="vv-btn inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-4 text-xs font-bold text-white shadow-sm"
                              >
                                <Unlock className="h-3.5 w-3.5" />
                                <span>{unlockingId === lead.id ? "Unlocking..." : "Accept & Unlock Contact (1 Credit)"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedLead(lead)}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-[#CBD5E1] px-3.5 text-xs font-bold text-[#0B2A47] hover:bg-[#F8FAFC]"
                              >
                                View Details
                              </button>
                              {lead.schoolStatus !== "rejected" && (
                                <button
                                  type="button"
                                  onClick={() => handleLeadAction(lead.id, "reject", "Not matching criteria")}
                                  className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 px-3.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                >
                                  Reject
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <a
                                href={`tel:${lead.mobile}`}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                <span>Call {lead.mobile}</span>
                              </a>
                              <a
                                href={`https://wa.me/91${lead.mobile}?text=${encodeURIComponent(`Hello ${lead.parentName}, greetings from ${school?.name || "our school"} regarding admission enquiry for ${lead.childName} (${lead.className}).`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-[#25D366] px-4 text-xs font-bold text-white shadow-sm"
                              >
                                WhatsApp Parent
                              </a>
                              
                              <button
                                type="button"
                                onClick={() => setSelectedLead(lead)}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-[#CBD5E1] px-3.5 text-xs font-bold text-[#4E5A68]"
                              >
                                Add Follow-up Note
                              </button>
                              {lead.schoolStatus !== "review_requested" && lead.schoolStatus !== "refunded" && (
                                <button
                                  type="button"
                                  onClick={() => handleLeadAction(lead.id, "request_review", "Invalid number / Parent unreachable")}
                                  className="inline-flex h-9 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-3.5 text-xs font-bold text-amber-800"
                                >
                                  Request Credit Refund Review
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: 10-STEP SCHOOL ONBOARDING WIZARD & PROFILE EDITOR (STAGE 3 STAGED EDITS) */}
            {tab === "wizard" && (
              <div className="vv-rise rounded-3xl border border-[#D6DDE5] bg-white p-6 shadow-sm">
                <div className="border-b border-[#E2E8F0] pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="rounded-full bg-[#F0F8FF] px-3 py-1 text-xs font-bold text-[#0A5C91]">
                        Step {wizardStep} of 10 &middot; Staged Profile Editor
                      </span>
                      <h2 className="mt-2 text-xl font-extrabold text-[#0B2A47]">
                        Complete &amp; Update Your School Profile
                      </h2>
                    </div>
                    {account?.editApprovalStatus === "pending" && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span>Edits Submitted — Waiting for Admin Approval</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#64748B]">
                    All changes you save here are sent to the VidyaVista Administrator for review and automatically published to the public website once approved.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {[
                      "1. Basic", "2. Contact", "3. Academics", "4. Facilities", "5. Fees",
                      "6. Awards", "7. Videos", "8. Photos", "9. Logo & Brochure", "10. Review & Submit",
                    ].map((label, idx) => {
                      const sNum = idx + 1;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setWizardStep(sNum)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            wizardStep === sNum
                              ? "bg-[#0A5C91] text-white"
                              : "bg-[#F1F5F9] text-[#4E5A68] hover:bg-[#E2E8F0]"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {/* Step 1: Basic Details */}
                  {wizardStep === 1 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">School Name *</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Board</label>
                        <select
                          value={form.board}
                          onChange={(e) => setForm({ ...form, board: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm"
                        >
                          {["CBSE", "ICSE", "IB", "Cambridge", "State Board", "NIOS", "No Board"].map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">School Type</label>
                        <select
                          value={form.type}
                          onChange={(e) => setForm({ ...form, type: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm"
                        >
                          <option value="Day">Day School</option>
                          <option value="Boarding School">Boarding School</option>
                          <option value="Play School">Play School</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Grades From</label>
                        <select
                          value={form.gradeFrom}
                          onChange={(e) => setForm({ ...form, gradeFrom: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm"
                        >
                          {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Grades To</label>
                        <select
                          value={form.gradeTo}
                          onChange={(e) => setForm({ ...form, gradeTo: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm"
                        >
                          {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Gender</label>
                        <select
                          value={form.gender}
                          onChange={(e) => setForm({ ...form, gender: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm"
                        >
                          <option value="Co-ed">Co-ed</option>
                          <option value="Boys">Boys Only</option>
                          <option value="Girls">Girls Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Area / Locality</label>
                        <input
                          type="text"
                          value={form.area}
                          onChange={(e) => setForm({ ...form, area: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">City</label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">State</label>
                        <input
                          type="text"
                          value={form.state}
                          onChange={(e) => setForm({ ...form, state: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Pincode</label>
                        <input
                          type="text"
                          value={form.pincode}
                          onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Full Street Address</label>
                        <input
                          type="text"
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 2: Contact & Social */}
                  {wizardStep === 2 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Contact Person Name</label>
                        <input
                          type="text"
                          value={form.contactPerson}
                          onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Designation</label>
                        <input
                          type="text"
                          value={form.designation}
                          onChange={(e) => setForm({ ...form, designation: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Mobile Number (10 digits)</label>
                        <input
                          type="text"
                          maxLength={10}
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Landline (with STD code, digits only)</label>
                        <input
                          type="text"
                          maxLength={13}
                          value={form.landline}
                          onChange={(e) => setForm({ ...form, landline: e.target.value.replace(/\D/g, "") })}
                          placeholder="01126543210"
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Official Email</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Official Website URL</label>
                        <input
                          type="url"
                          value={form.website}
                          onChange={(e) => setForm({ ...form, website: e.target.value })}
                          placeholder="https://www.yourschool.edu.in"
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">YouTube Channel / Video URL</label>
                        <input
                          type="url"
                          value={form.youtubeUrl}
                          onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Facebook Page URL</label>
                        <input
                          type="url"
                          value={form.facebookUrl}
                          onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Instagram URL</label>
                        <input
                          type="url"
                          value={form.instagramUrl}
                          onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">LinkedIn URL</label>
                        <input
                          type="url"
                          value={form.linkedinUrl}
                          onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 3: Academics & About */}
                  {wizardStep === 3 && (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Medium of Instruction</label>
                        <input
                          type="text"
                          value={form.medium}
                          onChange={(e) => setForm({ ...form, medium: e.target.value })}
                          placeholder="English"
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Student : Teacher Ratio</label>
                        <input
                          type="text"
                          value={form.studentTeacherRatio}
                          onChange={(e) => setForm({ ...form, studentTeacherRatio: e.target.value })}
                          placeholder="18:1"
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">School Timing</label>
                        <input
                          type="text"
                          value={form.schoolTiming}
                          onChange={(e) => setForm({ ...form, schoolTiming: e.target.value })}
                          placeholder="8:00 AM - 2:30 PM"
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Affiliation Number</label>
                        <input
                          type="text"
                          value={form.affiliationNo}
                          onChange={(e) => setForm({ ...form, affiliationNo: e.target.value })}
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Campus Size</label>
                        <input
                          type="text"
                          value={form.campus}
                          onChange={(e) => setForm({ ...form, campus: e.target.value })}
                          placeholder="e.g. 12 Acres"
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Established Year</label>
                        <input
                          type="number"
                          value={form.established}
                          onChange={(e) => setForm({ ...form, established: e.target.value })}
                          placeholder="1998"
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Total Students</label>
                        <input
                          type="number"
                          value={form.students}
                          onChange={(e) => setForm({ ...form, students: e.target.value })}
                          placeholder="1500"
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Total Teachers</label>
                        <input
                          type="number"
                          value={form.teachers}
                          onChange={(e) => setForm({ ...form, teachers: e.target.value })}
                          placeholder="85"
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">About the School *</label>
                        <textarea
                          rows={5}
                          value={form.about}
                          onChange={(e) => setForm({ ...form, about: e.target.value })}
                          placeholder="Describe your school's vision, academic excellence, boarding/day facilities, and achievements..."
                          className="w-full rounded-xl border border-[#CBD5E1] p-3.5 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 4: Facilities */}
                  {wizardStep === 4 && (
                    <div>
                      <p className="mb-3 text-sm font-semibold text-[#4E5A68]">
                        Select all facilities available on your campus (grouped automatically on your public profile):
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {ALL_FACILITIES.map((fac) => {
                          const checked = (form.facilities || []).includes(fac);
                          return (
                            <label
                              key={fac}
                              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3.5 text-sm font-semibold transition ${
                                checked ? "border-[#0795DC] bg-[#F0F8FF] text-[#0A5C91]" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const list = form.facilities || [];
                                  setForm({
                                    ...form,
                                    facilities: checked ? list.filter((x: string) => x !== fac) : [...list, fac],
                                  });
                                }}
                                className="h-4 w-4 accent-[#0A5C91]"
                              />
                              <span>{fac}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 5: Fees */}
                  {wizardStep === 5 && (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Minimum Yearly Fee (INR)</label>
                          <input
                            type="number"
                            value={form.feeMin}
                            onChange={(e) => setForm({ ...form, feeMin: e.target.value })}
                            placeholder="65000"
                            className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Maximum Yearly Fee (INR)</label>
                          <input
                            type="number"
                            value={form.feeMax}
                            onChange={(e) => setForm({ ...form, feeMax: e.target.value })}
                            placeholder="145000"
                            className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label className="text-xs font-bold uppercase text-[#4E5A68]">Class-wise Fee Breakdown Rows</label>
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                feeComponents: [
                                  ...(form.feeComponents || []),
                                  { session: "2027-28", className: "Class 1", name: "Tuition Fee", frequency: "Annually", amount: 50000 },
                                ],
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-[#F0F8FF] px-3 py-1 text-xs font-bold text-[#0A5C91]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Fee Row</span>
                          </button>
                        </div>
                        <div className="space-y-2.5">
                          {(form.feeComponents || []).map((fc: any, i: number) => (
                            <div key={i} className="grid gap-2 rounded-xl border border-[#E2E8F0] p-3 sm:grid-cols-5">
                              <input
                                type="text"
                                value={fc.className}
                                onChange={(e) => {
                                  const next = [...form.feeComponents];
                                  next[i] = { ...fc, className: e.target.value };
                                  setForm({ ...form, feeComponents: next });
                                }}
                                placeholder="Class (e.g. Class 1)"
                                className="h-10 rounded-lg border border-[#CBD5E1] px-2.5 text-xs"
                              />
                              <input
                                type="text"
                                value={fc.name}
                                onChange={(e) => {
                                  const next = [...form.feeComponents];
                                  next[i] = { ...fc, name: e.target.value };
                                  setForm({ ...form, feeComponents: next });
                                }}
                                placeholder="Fee Head (e.g. Tuition Fee)"
                                className="h-10 rounded-lg border border-[#CBD5E1] px-2.5 text-xs sm:col-span-2"
                              />
                              <select
                                value={fc.frequency}
                                onChange={(e) => {
                                  const next = [...form.feeComponents];
                                  next[i] = { ...fc, frequency: e.target.value };
                                  setForm({ ...form, feeComponents: next });
                                }}
                                className="h-10 rounded-lg border border-[#CBD5E1] bg-white px-2.5 text-xs"
                              >
                                <option value="Annually">Annually</option>
                                <option value="Monthly">Monthly</option>
                                <option value="One-time">One-time</option>
                              </select>
                              <div className="flex gap-1.5">
                                <input
                                  type="number"
                                  value={fc.amount}
                                  onChange={(e) => {
                                    const next = [...form.feeComponents];
                                    next[i] = { ...fc, amount: e.target.value };
                                    setForm({ ...form, feeComponents: next });
                                  }}
                                  placeholder="Amount"
                                  className="h-10 w-full rounded-lg border border-[#CBD5E1] px-2.5 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => setForm({ ...form, feeComponents: form.feeComponents.filter((_: any, idx: number) => idx !== i) })}
                                  className="inline-flex h-10 items-center justify-center rounded-lg bg-rose-50 px-2.5 text-xs font-bold text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 6: Awards & Recognition */}
                  {wizardStep === 6 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#4E5A68]">Awards &amp; Recognitions (Name, Position/Rank, Year):</p>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              awards: [...(form.awards || []), { name: "", position: "1st Rank", year: "2025" }],
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#F0F8FF] px-3 py-1.5 text-xs font-bold text-[#0A5C91]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Award Row</span>
                        </button>
                      </div>
                      {(form.awards || []).map((aw: any, i: number) => (
                        <div key={i} className="grid gap-2.5 rounded-xl border border-[#E2E8F0] p-3 sm:grid-cols-4">
                          <input
                            type="text"
                            value={aw.name}
                            onChange={(e) => {
                              const next = [...form.awards];
                              next[i] = { ...aw, name: e.target.value };
                              setForm({ ...form, awards: next });
                            }}
                            placeholder="Award Name (e.g. Best Boarding School in North India)"
                            className="h-10 rounded-lg border border-[#CBD5E1] px-3 text-xs sm:col-span-2"
                          />
                          <input
                            type="text"
                            value={aw.position}
                            onChange={(e) => {
                              const next = [...form.awards];
                              next[i] = { ...aw, position: e.target.value };
                              setForm({ ...form, awards: next });
                            }}
                            placeholder="Position / Rank (e.g. Winner / Gold)"
                            className="h-10 rounded-lg border border-[#CBD5E1] px-3 text-xs"
                          />
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={aw.year}
                              onChange={(e) => {
                                const next = [...form.awards];
                                next[i] = { ...aw, year: e.target.value };
                                setForm({ ...form, awards: next });
                              }}
                              placeholder="Year (2025)"
                              className="h-10 w-full rounded-lg border border-[#CBD5E1] px-3 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, awards: form.awards.filter((_: any, idx: number) => idx !== i) })}
                              className="inline-flex h-10 items-center justify-center rounded-lg bg-rose-50 px-2.5 text-xs font-bold text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Step 7: Videos */}
                  {wizardStep === 7 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#4E5A68]">Campus YouTube Video Links:</p>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              videos: [...(form.videos || []), { title: "Campus Tour", youtubeUrl: "" }],
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#F0F8FF] px-3 py-1.5 text-xs font-bold text-[#0A5C91]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add YouTube Link</span>
                        </button>
                      </div>
                      {(form.videos || []).map((vd: any, i: number) => (
                        <div key={i} className="grid gap-2.5 rounded-xl border border-[#E2E8F0] p-3 sm:grid-cols-3">
                          <input
                            type="text"
                            value={vd.title}
                            onChange={(e) => {
                              const next = [...form.videos];
                              next[i] = { ...vd, title: e.target.value };
                              setForm({ ...form, videos: next });
                            }}
                            placeholder="Video Title"
                            className="h-10 rounded-lg border border-[#CBD5E1] px-3 text-xs"
                          />
                          <div className="flex gap-1.5 sm:col-span-2">
                            <input
                              type="url"
                              value={vd.youtubeUrl}
                              onChange={(e) => {
                                const next = [...form.videos];
                                next[i] = { ...vd, youtubeUrl: e.target.value };
                                setForm({ ...form, videos: next });
                              }}
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="h-10 w-full rounded-lg border border-[#CBD5E1] px-3 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, videos: form.videos.filter((_: any, idx: number) => idx !== i) })}
                              className="inline-flex h-10 items-center justify-center rounded-lg bg-rose-50 px-2.5 text-xs font-bold text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Step 8: Photos */}
                  {wizardStep === 8 && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                            Primary Campus Cover Photo (1024 x 600 recommended)
                          </label>
                          {uploadingField === "image" && (
                            <span className="text-xs font-bold text-[#0795DC] animate-pulse">Uploading cover image...</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={form.image}
                            onChange={(e) => setForm({ ...form, image: e.target.value })}
                            placeholder="Paste cover image URL or Choose File ->"
                            className="h-11 flex-1 rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                          />
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#0795DC] bg-[#F0F9FF] px-4 text-xs font-extrabold text-[#0A5C91] hover:bg-[#E0F2FE] transition whitespace-nowrap">
                            <Upload className="h-4 w-4" />
                            <span>{uploadingField === "image" ? "Uploading..." : "Choose File"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingField === "image"}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(f, "image");
                              }}
                            />
                          </label>
                        </div>
                        {form.image && (
                          <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                            <img src={form.image} alt="Cover Preview" className="h-14 w-24 rounded-lg object-cover border border-[#CBD5E1]" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#0B2A47] truncate">{form.image}</p>
                              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">✓ Cover photo selected</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, image: "" })}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase text-[#4E5A68]">Campus Gallery Photos (1024 x 600 recommended)</p>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              photos: [...(form.photos || []), { url: "", caption: "" }],
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#F0F8FF] px-3 py-1.5 text-xs font-bold text-[#0A5C91]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Photo Row</span>
                        </button>
                      </div>

                      {(form.photos || []).map((ph: any, i: number) => (
                        <div key={i} className="grid gap-2.5 rounded-xl border border-[#E2E8F0] p-3 sm:grid-cols-12 items-center">
                          <div className="sm:col-span-6 flex gap-2">
                            {ph.url && (
                              <img src={ph.url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover border border-[#CBD5E1]" />
                            )}
                            <input
                              type="url"
                              value={ph.url}
                              onChange={(e) => {
                                const next = [...form.photos];
                                next[i] = { ...ph, url: e.target.value };
                                setForm({ ...form, photos: next });
                              }}
                              placeholder="Image URL or Choose File"
                              className="h-10 flex-1 rounded-lg border border-[#CBD5E1] px-3 text-xs"
                            />
                            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#0795DC] bg-[#F0F9FF] px-2.5 text-xs font-bold text-[#0A5C91] hover:bg-[#E0F2FE]" title="Choose photo file">
                              <Upload className="h-3.5 w-3.5" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleGalleryUpload(f, i);
                                }}
                              />
                            </label>
                          </div>
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              value={ph.caption}
                              onChange={(e) => {
                                const next = [...form.photos];
                                next[i] = { ...ph, caption: e.target.value };
                                setForm({ ...form, photos: next });
                              }}
                              placeholder="Caption (e.g. Science Lab)"
                              className="h-10 w-full rounded-lg border border-[#CBD5E1] px-3 text-xs"
                            />
                          </div>
                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, photos: form.photos.filter((_: any, idx: number) => idx !== i) })}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-xs font-bold text-rose-600 hover:bg-rose-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Step 9: Logo & Brochure */}
                  {wizardStep === 9 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                            Official School Logo (JPG / PNG)
                          </label>
                          {uploadingField === "logoUrl" && (
                            <span className="text-xs font-bold text-[#0795DC] animate-pulse">Uploading logo...</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={form.logoUrl}
                            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                            placeholder="Logo URL or Choose File ->"
                            className="h-11 flex-1 rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                          />
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#0795DC] bg-[#F0F9FF] px-4 text-xs font-extrabold text-[#0A5C91] hover:bg-[#E0F2FE] transition whitespace-nowrap">
                            <Upload className="h-4 w-4" />
                            <span>Choose File</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingField === "logoUrl"}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(f, "logoUrl");
                              }}
                            />
                          </label>
                        </div>
                        {form.logoUrl && (
                          <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                            <div className="h-12 w-12 rounded-lg bg-white border border-[#CBD5E1] p-1 flex items-center justify-center overflow-hidden">
                              <img src={form.logoUrl} alt="Logo Preview" className="h-full w-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#0B2A47] truncate">{form.logoUrl}</p>
                              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">✓ Official logo selected</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, logoUrl: "" })}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold uppercase text-[#4E5A68]">
                            Information Brochure (PDF or DOC)
                          </label>
                          {uploadingField === "brochureUrl" && (
                            <span className="text-xs font-bold text-[#0795DC] animate-pulse">Uploading brochure...</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={form.brochureUrl}
                            onChange={(e) => setForm({ ...form, brochureUrl: e.target.value })}
                            placeholder="Brochure URL or Choose File ->"
                            className="h-11 flex-1 rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                          />
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#0795DC] bg-[#F0F9FF] px-4 text-xs font-extrabold text-[#0A5C91] hover:bg-[#E0F2FE] transition whitespace-nowrap">
                            <Upload className="h-4 w-4" />
                            <span>Choose File</span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf"
                              className="hidden"
                              disabled={uploadingField === "brochureUrl"}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(f, "brochureUrl");
                              }}
                            />
                          </label>
                        </div>
                        {form.brochureUrl && (
                          <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                            <div className="h-10 w-10 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                              PDF
                            </div>
                            <div className="flex-1 min-w-0">
                              <a href={form.brochureUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#0A5C91] hover:underline truncate block">
                                {form.brochureUrl}
                              </a>
                              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">✓ Brochure ready for parents</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, brochureUrl: "" })}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 10: Review & Submit */}
                  {wizardStep === 10 && (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-[#F0F8FF] p-5">
                        <h3 className="text-base font-extrabold text-[#0A5C91]">
                          Profile Completion: {account?.profileCompletion ?? 20}%
                        </h3>
                        <p className="mt-1 text-xs text-[#4E5A68]">
                          Review your checklist below and click &ldquo;Submit Profile Edits for Admin Approval&rdquo; to send your updates to the Administrator.
                        </p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {(account?.checklist || []).map((item: any) => (
                            <div key={item.step} className="flex items-center gap-2 text-xs font-semibold">
                              <CheckCircle2
                                className={`h-4 w-4 shrink-0 ${item.done ? "text-emerald-600" : "text-amber-500"}`}
                              />
                              <span className={item.done ? "text-[#0B2A47]" : "text-[#64748B]"}>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wizard Navigation Buttons (Uniform Height & Style) */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-4">
                    <button
                      type="button"
                      disabled={wizardStep <= 1}
                      onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-[#CBD5E1] px-5 text-sm font-semibold text-[#4E5A68] disabled:opacity-40"
                    >
                      Back
                    </button>
                    <div className="flex gap-2.5">
                      {wizardStep < 10 && (
                        <button
                          type="button"
                          onClick={() => setWizardStep((s) => Math.min(10, s + 1))}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#CBD5E1] px-4 text-sm font-semibold text-[#64748B]"
                        >
                          Skip Step
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={savingProfile}
                        onClick={() => handleSaveWizardStep(wizardStep < 10 ? wizardStep + 1 : 10)}
                        className="vv-btn inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                      >
                        <span>
                          {savingProfile
                            ? "Submitting..."
                            : wizardStep < 10
                              ? "Save & Continue"
                              : "Submit Profile Edits for Admin Approval"}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PLANS, 1-YEAR SUBSCRIPTIONS & LEAD BOOSTER TOP-UP PACKS */}
            {tab === "plans" && (
              <div className="vv-rise space-y-6">
                <div className="rounded-3xl border border-[#D6DDE5] bg-white p-6 shadow-sm">
                  <span className="rounded-full bg-[#F0F8FF] px-3 py-1 text-xs font-bold text-[#0A5C91]">
                    1-Year Membership Plans (Includes 100 Verified Parent Leads + Homepage Badges)
                  </span>
                  <h2 className="mt-2 text-2xl font-extrabold text-[#0B2A47]">
                    Choose a Plan to Unlock Parent Leads &amp; Boost Visibility
                  </h2>
                  <p className="mt-1 text-sm text-[#64748B]">
                    All yearly plans include 365 days validity, verified parent contact unlocks, and official 18% GST tax invoices.
                  </p>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    {yearlyPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative flex flex-col justify-between rounded-3xl border p-6 transition hover:-translate-y-0.5 hover:shadow-md ${
                          plan.isPopular ? "border-2 border-[#EC0E58] bg-[#FFFBFD] shadow-md" : "border-[#D6DDE5] bg-white"
                        }`}
                      >
                        {plan.isPopular && (
                          <span className="absolute -top-3 right-5 rounded-full bg-[#EC0E58] px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
                            Most Popular
                          </span>
                        )}
                        <div>
                          <div className="flex flex-wrap gap-1.5">
                            {plan.grantsFeatured && (
                              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                                Featured Badge
                              </span>
                            )}
                            {plan.grantsRecommended && (
                              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
                                Recommended Badge
                              </span>
                            )}
                            {plan.grantsTopRated && (
                              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
                                Top Rated Badge
                              </span>
                            )}
                            {plan.grantsVerified && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                Verified School
                              </span>
                            )}
                          </div>
                          <h3 className="mt-3 text-lg font-extrabold text-[#0B2A47]">{plan.name}</h3>
                          <p className="mt-1 text-xs text-[#64748B]">{plan.description}</p>
                          <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-[#0A5C91]">
                              Rs. {plan.price.toLocaleString("en-IN")}
                            </span>
                            <span className="text-xs font-semibold text-[#64748B]">
                              + {plan.gstPercent}% GST &middot; {plan.validityDays} Days Validity
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-bold text-emerald-700">
                            Includes {plan.leadsIncluded} Verified Parent Admission Leads
                          </p>
                          <ul className="mt-4 space-y-2 border-t border-[#F1F5F9] pt-4 text-xs text-[#334155]">
                            {plan.features.map((f, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutPlan(plan);
                            setCouponDiscount(0);
                          }}
                          className="vv-btn mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-5 text-sm font-bold text-white shadow-sm"
                        >
                          Choose {plan.name}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lead Booster Top-up Packs */}
                <div className="rounded-3xl border border-[#0795DC]/30 bg-gradient-to-r from-[#F0F8FF] to-white p-6 shadow-sm">
                  <span className="rounded-full bg-[#0A5C91] px-3 py-1 text-xs font-bold text-white">
                    Lead Booster Recharge Packs
                  </span>
                  <h3 className="mt-2 text-xl font-extrabold text-[#0B2A47]">
                    Finished Your 100 Leads Before the Year Ends? Top-up Extra Lead Credits Instantly
                  </h3>
                  <p className="mt-1 text-xs text-[#4E5A68]">
                    Add +50 or +100 verified parent lead credits to your existing plan at any time.
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {topupPacks.map((pack) => (
                      <div key={pack.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#CBD5E1] bg-white p-5">
                        <div>
                          <h4 className="text-base font-extrabold text-[#0B2A47]">{pack.name}</h4>
                          <p className="mt-0.5 text-xs text-[#64748B]">{pack.description}</p>
                          <p className="mt-2 text-xl font-extrabold text-[#0A5C91]">
                            Rs. {pack.price.toLocaleString("en-IN")}{" "}
                            <span className="text-xs font-normal text-[#64748B]">+ {pack.gstPercent}% GST</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutPlan(pack);
                            setCouponDiscount(0);
                          }}
                          className="vv-btn inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#EC0E58] px-4 text-xs font-bold text-white shadow-sm"
                        >
                          Add +{pack.leadsIncluded} Leads
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: GST INVOICES */}
            {tab === "invoices" && (
              <div className="vv-rise rounded-3xl border border-[#D6DDE5] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-extrabold text-[#0B2A47]">Membership History &amp; GST Tax Invoices</h2>
                <p className="mt-1 text-xs text-[#64748B]">
                  Download or print official 18% GST invoices for all your active and past plans.
                </p>

                {invoices.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[#64748B]">
                    No invoices generated yet. Choose a membership plan to generate your GST invoice.
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] text-xs uppercase text-[#64748B]">
                          <th className="pb-3 pr-4">Invoice No.</th>
                          <th className="pb-3 pr-4">Date</th>
                          <th className="pb-3 pr-4">Description</th>
                          <th className="pb-3 pr-4">Subtotal</th>
                          <th className="pb-3 pr-4">GST (18%)</th>
                          <th className="pb-3 pr-4">Total Paid</th>
                          <th className="pb-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="py-3.5 pr-4 font-bold text-[#0A5C91]">{inv.invoiceNumber}</td>
                            <td className="py-3.5 pr-4 text-xs text-[#64748B]">{inv.issuedDate}</td>
                            <td className="py-3.5 pr-4 text-xs font-semibold">{inv.planDescription}</td>
                            <td className="py-3.5 pr-4">Rs. {inv.subtotal.toLocaleString("en-IN")}</td>
                            <td className="py-3.5 pr-4">Rs. {inv.gstAmount.toLocaleString("en-IN")}</td>
                            <td className="py-3.5 pr-4 font-extrabold text-[#0B2A47]">Rs. {inv.totalAmount.toLocaleString("en-IN")}</td>
                            <td className="py-3.5">
                              <button
                                type="button"
                                onClick={() => setActiveInvoice(inv)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#F0F8FF] px-3 text-xs font-bold text-[#0A5C91] hover:bg-[#E1F1FA]"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span>View / Print PDF</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: PARENT REVIEWS */}
            {tab === "reviews" && (
              <div className="vv-rise rounded-3xl border border-[#D6DDE5] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-extrabold text-[#0B2A47]">Parent &amp; Student Reviews</h2>
                <p className="mt-1 text-xs text-[#64748B]">
                  Respond to parent reviews with an official reply from your school.
                </p>
                {!school?.reviews?.length ? (
                  <div className="py-12 text-center text-sm text-[#64748B]">No reviews posted yet.</div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {school.reviews.map((rv: any) => (
                      <div key={rv.id} className="rounded-2xl border border-[#E2E8F0] p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[#0B2A47]">
                            {rv.name} <span className="text-xs font-normal text-[#64748B]">({rv.role})</span>
                          </p>
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-500">
                            <Star className="h-4 w-4 fill-amber-500" />
                            <span>{rv.rating} / 5</span>
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[#334155]">{rv.text}</p>
                        {rv.schoolReply ? (
                          <div className="mt-3 rounded-xl bg-[#F0F8FF] p-3 text-xs text-[#0A5C91]">
                            <strong>Your Official Reply:</strong> {rv.schoolReply}
                          </div>
                        ) : (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const fd = new FormData(e.currentTarget);
                              const reply = String(fd.get("reply") || "");
                              await portalApi(`/portal/school/reviews/${rv.id}/reply`, {
                                method: "POST",
                                body: JSON.stringify({ reply }),
                              });
                              showToast("Official reply saved.");
                              loadDashboard();
                            }}
                            className="mt-3 flex gap-2"
                          >
                            <input
                              name="reply"
                              type="text"
                              required
                              placeholder="Write official school response..."
                              className="h-10 flex-1 rounded-lg border border-[#CBD5E1] px-3 text-xs"
                            />
                            <button type="submit" className="h-10 rounded-lg bg-[#0A5C91] px-4 text-xs font-bold text-white">
                              Post Reply
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 8: CHANGE PASSWORD */}
            {tab === "password" && (
              <div className="vv-rise rounded-3xl border border-[#D6DDE5] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-extrabold text-[#0B2A47]">Change Institution Account Password</h2>
                <form onSubmit={handleChangePassword} className="mt-4 max-w-md space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Current Password</label>
                    <div className="relative">
               <input
                      type={showCurPwd ? "text" : "password"}
                      required
                      value={curPassword}
                      onChange={(e) => setCurPassword(e.target.value)}
                      className="pr-11 h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                    />
               <button
                 type="button"
                 tabIndex={-1}
                 onClick={() => setShowCurPwd(!showCurPwd)}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8896A6] hover:text-[#0A5C91]"
                 aria-label={showCurPwd ? "Hide password" : "Show password"}
               >
                 {showCurPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
               </button>
             </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">New Password (Min 6 chars)</label>
                    <div className="relative">
               <input
                      type={showNewPwd ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-11 h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                    />
               <button
                 type="button"
                 tabIndex={-1}
                 onClick={() => setShowNewPwd(!showNewPwd)}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8896A6] hover:text-[#0A5C91]"
                 aria-label={showNewPwd ? "Hide password" : "Show password"}
               >
                 {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
               </button>
             </div>
                  </div>
                  <button
                    type="submit"
                    className="vv-btn inline-flex h-11 items-center justify-center rounded-xl bg-[#0A5C91] px-6 text-sm font-bold text-white"
                  >
                    Update Password
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* MODAL 1: "NOT ENOUGH LEADS, PLEASE UPGRADE" */}
      {noCreditsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="vv-pop max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-extrabold text-[#0B2A47]">
              Not Enough Lead Credits — Please Upgrade
            </h3>
            <p className="mt-2 text-sm text-[#4E5A68]">
              You currently have <strong>0 lead credits</strong> remaining. Subscribe to a <strong>1-Year Membership Plan (100 Leads)</strong> or add a <strong>Lead Booster Pack (+50 / +100 Leads)</strong> to unlock parent mobile numbers and emails.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setNoCreditsModal(false);
                  setTab("plans");
                }}
                className="vv-btn inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#EC0E58] px-4 text-xs font-bold text-white"
              >
                Lead Booster Pack (+50 / +100)
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoCreditsModal(false);
                  setTab("plans");
                }}
                className="vv-btn inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#0A5C91] px-4 text-xs font-bold text-white"
              >
                View 1-Year Paid Plans
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNoCreditsModal(false)}
              className="mt-4 text-xs font-semibold text-[#64748B] underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: LEAD DETAILS & FOLLOW-UP NOTE */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="vv-pop w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-lg font-extrabold text-[#0B2A47]">Admission Lead Details</h3>
              <button type="button" onClick={() => setSelectedLead(null)} className="text-sm font-bold text-[#64748B]">
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2.5 text-sm">
              <p><strong>Parent Name:</strong> {selectedLead.parentName} ({selectedLead.relation})</p>
              <p><strong>Student Name:</strong> {selectedLead.childName}</p>
              <p><strong>Admission For Class:</strong> {selectedLead.className} ({selectedLead.session})</p>
              <p><strong>Location:</strong> {selectedLead.city} (Preferred: {selectedLead.preferredLocation})</p>
              <div className="rounded-2xl bg-[#F0F8FF] p-4">
                <p className="font-bold text-[#0A5C91]">Parent Contact Information</p>
                <p className="mt-1"><strong>Mobile:</strong> {selectedLead.mobile}</p>
                <p><strong>Email:</strong> {selectedLead.email}</p>
                {!selectedLead.isUnlocked && (
                  <button
                    type="button"
                    onClick={() => handleUnlockLead(selectedLead)}
                    className="vv-btn mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0A5C91] px-4 text-xs font-bold text-white"
                  >
                    <Unlock className="h-4 w-4" />
                    <span>Unlock Full Number &amp; Email (Uses 1 Credit)</span>
                  </button>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  handleLeadAction(
                    selectedLead.id,
                    "",
                    "",
                    String(fd.get("schoolNote") || ""),
                    String(fd.get("followupDate") || "")
                  );
                  setSelectedLead(null);
                }}
                className="space-y-3 pt-2"
              >
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Follow-up Note</label>
                  <input
                    name="schoolNote"
                    defaultValue={selectedLead.schoolNote}
                    placeholder="e.g. Spoke with parent, campus visit scheduled on Saturday"
                    className="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Follow-up Date</label>
                  <input
                    type="date"
                    name="followupDate"
                    defaultValue={selectedLead.followupDate}
                    className="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs"
                  />
                </div>
                <button type="submit" className="h-10 w-full rounded-xl bg-emerald-600 text-xs font-bold text-white">
                  Save Lead Notes
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PLAN / TOP-UP CHECKOUT */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="vv-pop w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-lg font-extrabold text-[#0B2A47]">Activate Plan &amp; Generate GST Invoice</h3>
              <button type="button" onClick={() => setCheckoutPlan(null)} className="text-sm font-bold text-[#64748B]">
                Close
              </button>
            </div>
            <form onSubmit={handleSubscribePlan} className="mt-4 space-y-4">
              <div className="rounded-2xl bg-[#F0F8FF] p-4">
                <p className="text-base font-extrabold text-[#0A5C91]">{checkoutPlan.name}</p>
                <p className="text-xs text-[#4E5A68]">
                  +{checkoutPlan.leadsIncluded} Verified Lead Credits &middot; {checkoutPlan.validityDays} Days Validity
                </p>
                <div className="mt-3 space-y-1 border-t border-[#CBD5E1] pt-2 text-xs">
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <span>Rs. {checkoutPlan.price.toLocaleString("en-IN")}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Coupon Discount:</span>
                      <span>- Rs. {couponDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST ({checkoutPlan.gstPercent}%):</span>
                    <span>
                      Rs. {Math.round((Math.max(0, checkoutPlan.price - couponDiscount) * checkoutPlan.gstPercent) / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#CBD5E1] pt-1.5 text-sm font-extrabold text-[#0B2A47]">
                    <span>Total Payable:</span>
                    <span>
                      Rs. {(
                        Math.max(0, checkoutPlan.price - couponDiscount) +
                        Math.round((Math.max(0, checkoutPlan.price - couponDiscount) * checkoutPlan.gstPercent) / 100)
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Have a Coupon Code?"
                  className="h-10 flex-1 rounded-xl border border-[#CBD5E1] px-3 text-xs uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="h-10 rounded-xl border border-[#0A5C91] px-4 text-xs font-bold text-[#0A5C91]"
                >
                  Apply
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Select Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm"
                >
                  <option value="upi">UPI / QR Transfer</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="bank">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="online">Online Payment Gateway</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-[#4E5A68]">Transaction Reference / Note (Optional)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. UTR / Transaction ID"
                  className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={subscribing}
                className="vv-btn inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 text-sm font-bold text-white shadow-md"
              >
                {subscribing ? "Activating Plan..." : `Confirm & Activate (+${checkoutPlan.leadsIncluded} Leads)`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINTABLE GST INVOICE */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="vv-pop w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between border-b-2 border-[#0A5C91] pb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-[#0A5C91]">VidyaVista</h3>
                <p className="text-xs text-[#64748B]">GST Tax Invoice &middot; Education &amp; Admission Portal</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-[#0B2A47]">{activeInvoice.invoiceNumber}</p>
                <p className="text-xs text-[#64748B]">Issued: {activeInvoice.issuedDate}</p>
                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-bold uppercase text-emerald-800">
                  {activeInvoice.status}
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-between text-xs">
              <div>
                <p className="font-bold uppercase text-[#64748B]">Billed To Institution</p>
                <p className="mt-1 text-sm font-extrabold text-[#0B2A47]">{activeInvoice.recipientName}</p>
                <p className="text-[#4E5A68]">{activeInvoice.recipientAddress}</p>
              </div>
              <div className="text-right">
                <p className="font-bold uppercase text-[#64748B]">Payment Mode</p>
                <p className="mt-1 font-bold text-[#0B2A47]">{activeInvoice.paymentMode}</p>
              </div>
            </div>

            <table className="mt-6 w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#F1F5F9] text-left text-xs uppercase text-[#4E5A68]">
                  <th className="p-3">Membership / Lead Pack Description</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#E2E8F0]">
                  <td className="p-3 font-semibold">{activeInvoice.planDescription}</td>
                  <td className="p-3 text-right font-bold">Rs. {activeInvoice.subtotal.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 ml-auto w-64 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rs. {activeInvoice.subtotal.toLocaleString("en-IN")}</span>
              </div>
              {activeInvoice.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>- Rs. {activeInvoice.discount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST ({activeInvoice.gstPercent}%):</span>
                <span>Rs. {activeInvoice.gstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between border-t-2 border-[#0A5C91] pt-2 text-base font-extrabold text-[#0A5C91]">
                <span>Total Paid:</span>
                <span>Rs. {activeInvoice.totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0A5C91] px-5 text-xs font-bold text-white"
              >
                <Printer className="h-4 w-4" />
                <span>Print / Save as PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInvoice(null)}
                className="h-10 rounded-xl border border-[#CBD5E1] px-5 text-xs font-bold text-[#4E5A68]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: LINK ANOTHER BRANCH */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="vv-pop w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-[#0B2A47] sm:text-2xl flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-[#0795DC]" />
                  <span>Link Another Branch / School</span>
                </h3>
                <p className="mt-1 text-xs text-[#64748B] sm:text-sm">
                  Search for another branch or school you manage and submit a claim request for admin approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBranchModal(false);
                  setSelectedBranchToClaim(null);
                  setBranchSearchQuery("");
                  setBranchSearchResults([]);
                  setBranchProofText("");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] transition hover:bg-[#FEE2E2] hover:text-[#DC2626]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleClaimBranchSubmit} className="mt-6 space-y-5">
              {/* Step 1: Search School */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                  Step 1: Search School / Branch Name or City
                </label>
                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#94A3B8]" />
                    <input
                      type="text"
                      value={branchSearchQuery}
                      onChange={(e) => setBranchSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearchBranch();
                        }
                      }}
                      placeholder="Type school name or city (e.g. DPS, Bhopal)..."
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] pl-10 pr-4 text-sm text-[#0B2A47] outline-none transition focus:border-[#0795DC] focus:ring-2 focus:ring-[#0795DC]/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchBranch}
                    disabled={branchSearching}
                    className="vv-btn inline-flex h-11 items-center justify-center rounded-xl bg-[#0A5C91] px-5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                  >
                    {branchSearching ? "Searching..." : "Search"}
                  </button>
                </div>

                {/* Search Results list */}
                {branchSearchResults.length > 0 && !selectedBranchToClaim && (
                  <div className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2 space-y-1.5">
                    {branchSearchResults.map((item: any) => (
                      <div
                        key={item.schoolId}
                        onClick={() => setSelectedBranchToClaim(item)}
                        className="flex cursor-pointer items-center justify-between rounded-lg bg-white p-3 shadow-xs transition hover:border-[#0795DC] hover:bg-[#F0F9FF] border border-transparent"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#0B2A47]">{item.name}</p>
                          <p className="text-xs text-[#64748B]">
                            {item.area ? `${item.area}, ` : ""}{item.city}, {item.state} &middot; {item.board}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-lg bg-[#0795DC] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0A5C91]"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Selected School Card */}
              {selectedBranchToClaim && (
                <div className="rounded-2xl border-2 border-[#0795DC]/40 bg-[#F0F9FF] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0795DC]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#0A5C91]">
                        Selected Branch
                      </span>
                      <h4 className="mt-1.5 text-base font-extrabold text-[#0B2A47]">
                        {selectedBranchToClaim.name}
                      </h4>
                      <p className="text-xs text-[#64748B]">
                        {selectedBranchToClaim.area ? `${selectedBranchToClaim.area}, ` : ""}
                        {selectedBranchToClaim.city}, {selectedBranchToClaim.state} &middot; {selectedBranchToClaim.board}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBranchToClaim(null)}
                      className="text-xs font-bold text-[#DC2626] hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Proof / Verification details */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                  Step 2: Proof of Ownership / Authority Note
                </label>
                <textarea
                  rows={3}
                  value={branchProofText}
                  onChange={(e) => setBranchProofText(e.target.value)}
                  placeholder="Provide registration number, affiliation code, official email/phone or authorization note proving you manage this branch..."
                  className="mt-2 w-full rounded-xl border border-[#CBD5E1] p-3 text-sm text-[#0B2A47] outline-none transition focus:border-[#0795DC] focus:ring-2 focus:ring-[#0795DC]/20"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBranchModal(false);
                    setSelectedBranchToClaim(null);
                    setBranchSearchQuery("");
                    setBranchSearchResults([]);
                    setBranchProofText("");
                  }}
                  className="h-11 rounded-xl border border-[#CBD5E1] px-5 text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedBranchToClaim || branchSubmitting}
                  className="vv-btn inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 text-sm font-bold text-white shadow-md disabled:opacity-50"
                >
                  {branchSubmitting ? "Submitting Request..." : "Submit Branch Link Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: INSTAGRAM-STYLE SCHOOL / BRANCH SWITCHER */}
      {showAccountSwitcher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAccountSwitcher(false);
          }}
        >
          <div className="vv-pop w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Switcher Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#0B2A47]">Your Schools &amp; Branches</h3>
                <p className="text-xs text-[#64748B]">Switch dashboard to manage another school profile</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountSwitcher(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Schools List */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2.5">
              {managedSchools.length === 0 && (
                <div className="p-4 text-center text-sm text-[#64748B]">
                  No approved schools linked yet. Link your school or branch below.
                </div>
              )}

              {managedSchools.map((item: any) => {
                const isActive = item.id === school?.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSwitchBranch(item.id)}
                    className={`group flex cursor-pointer items-center justify-between rounded-2xl p-3.5 transition border ${
                      isActive
                        ? "border-[#0795DC] bg-[#F0F9FF] shadow-sm"
                        : "border-[#E2E8F0] bg-white hover:border-[#94A3B8] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-6 w-6 text-[#0A5C91]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-[#0B2A47] group-hover:text-[#0A5C91] transition text-sm sm:text-base">
                            {item.name}
                          </p>
                        </div>
                        <p className="text-xs text-[#64748B]">
                          {item.area ? `${item.area}, ` : ""}{item.city} &middot; {item.board || "CBSE"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Active Dashboard</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwitchBranch(item.id);
                          }}
                          className="rounded-xl border border-[#0795DC] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0795DC] transition hover:bg-[#0795DC] hover:text-white"
                        >
                          Switch &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pending Claims Section */}
              {pendingBranchClaims.length > 0 && (
                <div className="pt-2">
                  <p className="px-2 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                    Pending Admin Verification
                  </p>
                  <div className="mt-1.5 space-y-2">
                    {pendingBranchClaims.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/60 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-amber-200 bg-white flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-[#0B2A47]">{item.name}</p>
                            <p className="text-[11px] text-[#64748B]">{item.city} &middot; Submitted for Review</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                          <Clock className="h-3 w-3" />
                          Pending Review
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Switcher Footer: + Link Another School / Branch */}
            <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <button
                type="button"
                onClick={() => {
                  setShowAccountSwitcher(false);
                  setShowBranchModal(true);
                }}
                className="vv-btn flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#0795DC] bg-[#F0F9FF] py-3 text-sm font-bold text-[#0A5C91] hover:bg-[#E0F2FE] transition shadow-xs"
              >
                <PlusCircle className="h-5 w-5 text-[#0795DC]" />
                <span>+ Link / Add Another School or Branch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
