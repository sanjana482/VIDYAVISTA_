"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  Clock,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { fetchCaptcha, portalApi, setPortalSession } from "../lib/portalApi";

function LoginPortalInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "school" ? "school" : "parent";
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";

  const [role, setRole] = useState<"parent" | "school">(initialRole);
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);

  // Forgot / Reset Password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<"send_otp" | "verify_reset">("send_otp");
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [showForgotConfirmPw, setShowForgotConfirmPw] = useState(false);
  const [forgotSendingOtp, setForgotSendingOtp] = useState(false);
  const [forgotResetting, setForgotResetting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  // CAPTCHA state (used on both Login and Registration)
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaCode, setCaptchaCode] = useState("-----");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // Email OTP state (used on Registration for both Parent & School Owner)
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Login fields
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Parent Registration fields
  const [parentName, setParentName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [lookingForClass, setLookingForClass] = useState("Class 1");
  const [admissionType, setAdmissionType] = useState("Boarding School");
  const [preferredCity, setPreferredCity] = useState("");
  const [preferredBoard, setPreferredBoard] = useState("CBSE");

  // School Owner Registration fields (Stage 1: Owner Profile Creation)
  const [contactPerson, setContactPerson] = useState("");
  const [designation, setDesignation] = useState("Founder / Principal");
  const [institutionName, setInstitutionName] = useState("");
  const [schoolMobile, setSchoolMobile] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolPassword, setSchoolPassword] = useState("");
  const [schoolCity, setSchoolCity] = useState("");
  const [schoolState, setSchoolState] = useState("");
  const [claimProof, setClaimProof] = useState("");

  // School Autocomplete Search & Claim from Profile
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchingSchools, setSearchingSchools] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Show/Hide password toggles
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showParentPw, setShowParentPw] = useState(false);
  const [showSchoolPw, setShowSchoolPw] = useState(false);

  useEffect(() => {
    const sName = searchParams.get("claim_school_name") || searchParams.get("school_name");
    const sId = searchParams.get("claim_school_id") || searchParams.get("school_id");
    const sCity = searchParams.get("city");
    const sState = searchParams.get("state");
    const reqRole = searchParams.get("role");
    const reqMode = searchParams.get("mode");

    if (reqRole === "school") setRole("school");
    if (reqMode === "register") setMode("register");

    if (sName) {
      setInstitutionName(sName);
      setRole("school");
      setMode("register");
    }
    if (sId) {
      setSelectedSchoolId(parseInt(sId, 10));
    }
    if (sCity) setSchoolCity(sCity);
    if (sState) setSchoolState(sState);
  }, [searchParams]);

  useEffect(() => {
    if (selectedSchoolId || institutionName.trim().length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingSchools(true);
      try {
        const res = await portalApi(`/portal/schools-search?q=${encodeURIComponent(institutionName.trim())}`);
        const list = res.data || [];
        setSearchSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch {
        setSearchSuggestions([]);
      } finally {
        setSearchingSchools(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [institutionName, selectedSchoolId]);

  const loadNewCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const c = await fetchCaptcha();
      setCaptchaToken(c.captchaToken);
      setCaptchaCode(c.captchaCode);
      setCaptchaAnswer("");
    } catch {
      setCaptchaCode("REFRESH");
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "school" || r === "parent") setRole(r);
  }, [searchParams]);

  useEffect(() => {
    loadNewCaptcha();
    setOtpSent(false);
    setOtpVerified(false);
    setOtpCode("");
    setError("");
    setInfoMsg("");
  }, [role, mode, loadNewCaptcha]);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCountdown]);

  const activeEmail = role === "parent" ? parentEmail : schoolEmail;

  const handleSendOtp = async () => {
    setError("");
    setInfoMsg("");
    const emailToVerify = activeEmail.trim().toLowerCase();
    if (!emailToVerify || !emailToVerify.includes("@")) {
      setError("Please enter a valid email address before requesting an OTP.");
      return;
    }
    if (!captchaAnswer.trim()) {
      setError("Please enter the security code (CAPTCHA) shown below first.");
      return;
    }
    setOtpSending(true);
    try {
      const res = await portalApi("/portal/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({
          email: emailToVerify,
          purpose: role === "school" ? "school_register" : "parent_register",
          captchaToken,
          captchaAnswer: captchaAnswer.trim(),
        }),
      });
      setOtpSent(true);
      setOtpVerified(false);
      setOtpCountdown(60);
      setInfoMsg(res.message || `A 6-digit verification code has been sent to ${emailToVerify}.`);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code.");
      if (err.code === "INVALID_CAPTCHA") {
        loadNewCaptcha();
      }
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    const emailToVerify = activeEmail.trim().toLowerCase();
    if (otpCode.trim().length !== 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }
    setOtpVerifying(true);
    try {
      const res = await portalApi("/portal/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: emailToVerify,
          otpCode: otpCode.trim(),
        }),
      });
      setOtpVerified(true);
      setInfoMsg(res.message || "Email address verified successfully.");
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Forgot Password Step 1: Send OTP to Email
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!captchaAnswer) {
      setError("Please enter the security CAPTCHA code.");
      return;
    }
    setError("");
    setInfoMsg("");
    setForgotSendingOtp(true);
    try {
      const res = await portalApi<{ ok: boolean; message: string; devOtpPreview?: string }>("/portal/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          purpose: "forgot_password",
          captchaToken,
          captchaAnswer: captchaAnswer.trim(),
        }),
      });
      setInfoMsg(res.message);
      setForgotStep("verify_reset");
      setOtpCountdown(60);
    } catch (err: any) {
      setError(err.message || "Failed to send reset code.");
      loadNewCaptcha();
    } finally {
      setForgotSendingOtp(false);
    }
  };

  // Forgot Password Step 2: Verify OTP & Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }
    setError("");
    setForgotResetting(true);
    try {
      const res = await portalApi<{ ok: boolean; message: string }>("/portal/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otpCode: forgotOtp.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      setInfoMsg(res.message);
      setIdentifier(forgotEmail);
      setLoginPassword("");
      setMode("login");
      setForgotStep("send_otp");
      setForgotEmail("");
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setForgotResetting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!captchaAnswer.trim()) {
      setError("Please enter the security code (CAPTCHA) shown below.");
      return;
    }
    setLoading(true);
    try {
      const res = await portalApi("/portal/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier,
          password: loginPassword,
          role,
          captchaToken,
          captchaAnswer: captchaAnswer.trim(),
        }),
      });
      setPortalSession(res.token, res.user);
      if (res.user.role === "school") router.push("/school");
      else if (res.user.role === "admin") router.push("/admin");
      else router.push("/parent");
    } catch (err: any) {
      setError(err.message || "Sign in failed. Please check your credentials.");
      if (err.code === "INVALID_CAPTCHA") {
        loadNewCaptcha();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleParentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError("Please request and enter the 6-digit email verification code first.");
      return;
    }
    setLoading(true);
    try {
      const res = await portalApi("/portal/auth/parent/register", {
        method: "POST",
        body: JSON.stringify({
          parentName,
          studentName,
          mobile: parentMobile,
          email: parentEmail,
          otpCode: otpCode.trim(),
          captchaToken,
          captchaAnswer: captchaAnswer.trim(),
          password: parentPassword,
          lookingForClass,
          admissionType,
          preferredCity,
          preferredBoard,
        }),
      });
      setPortalSession(res.token, res.user);
      router.push("/parent");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please verify your details.");
      if (err.code === "INVALID_CAPTCHA") {
        loadNewCaptcha();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError("Please request and enter the 6-digit email verification code first.");
      return;
    }
    setLoading(true);
    try {
      const res = await portalApi("/portal/auth/school/register", {
        method: "POST",
        body: JSON.stringify({
          contactPerson,
          designation,
          institutionName,
          schoolId: selectedSchoolId,
          claimSchoolId: selectedSchoolId,
          mobile: schoolMobile,
          email: schoolEmail,
          otpCode: otpCode.trim(),
          captchaToken,
          captchaAnswer: captchaAnswer.trim(),
          password: schoolPassword,
          city: schoolCity,
          state: schoolState,
          claimProof,
        }),
      });
      setPortalSession(res.token, res.user);
      router.push("/school");
    } catch (err: any) {
      setError(err.message || "Owner registration failed. Please verify your details.");
      if (err.code === "INVALID_CAPTCHA") {
        loadNewCaptcha();
      }
    } finally {
      setLoading(false);
    }
  };

  const renderCaptchaBox = () => (
    <div className="rounded-xl border border-[#D6DDE5] bg-[#F8FAFC] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
          <ShieldCheck className="h-4 w-4 text-[#0A5C91]" />
          <span>Security Verification (CAPTCHA) *</span>
        </label>
        <button
          type="button"
          onClick={loadNewCaptcha}
          disabled={captchaLoading}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0795DC] transition hover:text-[#0A5C91]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${captchaLoading ? "animate-spin" : ""}`} />
          <span>Refresh Code</span>
        </button>
      </div>
      <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          aria-label="Security code display"
          className="flex h-11 select-none items-center justify-center rounded-xl border border-[#CBD5E1] bg-gradient-to-r from-[#0B2A47] via-[#0A5C91] to-[#0B2A47] px-4 font-mono text-lg font-extrabold tracking-[0.35em] text-white shadow-inner"
        >
          {captchaCode}
        </div>
        <input
          type="text"
          required
          maxLength={6}
          value={captchaAnswer}
          onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
          placeholder="Enter 5-character code"
          className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-sm font-semibold uppercase tracking-wider text-[#0B2A47] focus:border-[#0795DC] focus:outline-none"
        />
      </div>
    </div>
  );

  const renderEmailOtpSection = (emailVal: string, setEmailVal: (v: string) => void, placeholder: string) => (
    <div className="space-y-3 rounded-xl border border-[#0795DC]/30 bg-[#F0F8FF]/70 p-4">
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B2A47]">
          <Mail className="h-3.5 w-3.5 text-[#0A5C91]" />
          <span>Official Email Address (Verification Required) *</span>
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            type="email"
            required
            value={emailVal}
            onChange={(e) => {
              setEmailVal(e.target.value);
              setOtpVerified(false);
            }}
            placeholder={placeholder}
            className="h-11 flex-1 rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-sm text-[#0B2A47] focus:border-[#0795DC] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={otpSending || otpCountdown > 0}
            className="vv-btn inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0A5C91] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#0795DC] disabled:opacity-60"
          >
            <Mail className="h-4 w-4" />
            <span>
              {otpSending
                ? "Sending OTP..."
                : otpCountdown > 0
                  ? `Resend in ${otpCountdown}s`
                  : otpSent
                    ? "Resend OTP"
                    : "Send Email OTP"}
            </span>
          </button>
        </div>
        <p className="mt-1 text-xs text-[#4E5A68]">
          First enter the security code (CAPTCHA) below, then click <strong>Send Email OTP</strong> to receive a 6-digit verification code.
        </p>
      </div>

      {otpSent && (
        <div className="vv-pop pt-1">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0B2A47]">
            Enter 6-Digit Email Verification Code *
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              type="text"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => {
                setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setOtpVerified(false);
              }}
              placeholder="Enter 6-digit OTP"
              className="h-11 flex-1 rounded-xl border border-[#0795DC] bg-white px-3.5 font-mono text-base font-bold tracking-[0.25em] text-[#0B2A47] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otpVerifying || otpVerified}
              className={`inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold transition ${
                otpVerified
                  ? "bg-emerald-600 text-white"
                  : "border border-[#0A5C91] bg-white text-[#0A5C91] hover:bg-[#0A5C91] hover:text-white"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{otpVerified ? "Email Verified" : otpVerifying ? "Verifying..." : "Verify Code"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#12304A]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="vv-rise grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Value Proposition */}
          <div className="rounded-3xl bg-gradient-to-br from-[#0B2A47] via-[#0A5C91] to-[#0795DC] p-8 text-white shadow-xl lg:col-span-5 lg:p-9">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-sky-100">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{role === "school" ? "VidyaVista Institution Portal" : "VidyaVista Parent & Student Portal"}</span>
            </span>

            <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl">
              {role === "school"
                ? "Register Your Owner Profile, Claim or Add Your School & Receive Parent Leads"
                : "Discover, Shortlist & Track School Admissions Across India"}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-sky-100/90">
              {role === "school"
                ? "Verified school owners can register their profile, claim an existing school from 10,000+ listed institutions or add a new school, manage their complete profile, and unlock verified parent admission enquiries."
                : "Create your parent account to save your child's education preferences, shortlist top Day and Boarding schools, track admission enquiries, and chat directly with school admission teams."}
            </p>

            <div className="mt-7 space-y-3.5">
              {role === "school" ? (
                <>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-sky-200" />
                    <div>
                      <p className="text-sm font-bold">Step 1: Owner Profile Verification</p>
                      <p className="mt-0.5 text-xs text-sky-100/85">
                        Register your Owner Profile with Email OTP verification. Your profile is reviewed and approved by the VidyaVista Administrator.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-200" />
                    <div>
                      <p className="text-sm font-bold">Step 2: Claim Existing or Add New School</p>
                      <p className="mt-0.5 text-xs text-sky-100/85">
                        Once your Owner Profile is approved, claim your school from 10,000+ listings or submit a new school for administrator approval.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-200" />
                    <div>
                      <p className="text-sm font-bold">Step 3: Reviewed Profile Updates & Verified Leads</p>
                      <p className="mt-0.5 text-xs text-sky-100/85">
                        All profile edits go through administrator approval before publishing live. Unlock parent contact details using 1-Year Plans or Lead Booster Packs.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-sky-200" />
                    <div>
                      <p className="text-sm font-bold">Child Education Preferences</p>
                      <p className="mt-0.5 text-xs text-sky-100/85">
                        Save your child&apos;s target class, preferred board (CBSE, ICSE, IB, Cambridge), city, and annual fee budget.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-200" />
                    <div>
                      <p className="text-sm font-bold">Track Enquiries & Shortlisted Schools</p>
                      <p className="mt-0.5 text-xs text-sky-100/85">
                        View real-time status updates when schools accept your admission enquiry and communicate via Admission Chat.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Auth Card */}
          <div className="rounded-3xl border border-[#D6DDE5] bg-white p-6 shadow-lg sm:p-8 lg:col-span-7">
            {/* Role Switcher (Uniform Button Height & Style) */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F1F5F9] p-1.5">
              <button
                type="button"
                onClick={() => { setRole("parent"); setError(""); setInfoMsg(""); }}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                  role === "parent"
                    ? "bg-[#0A5C91] text-white shadow-sm"
                    : "text-[#4E5A68] hover:text-[#0B2A47]"
                }`}
              >
                <UserRound className="h-4 w-4 shrink-0" />
                <span>Parent / Student</span>
              </button>
              <button
                type="button"
                onClick={() => { setRole("school"); setError(""); setInfoMsg(""); }}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                  role === "school"
                    ? "bg-[#0A5C91] text-white shadow-sm"
                    : "text-[#4E5A68] hover:text-[#0B2A47]"
                }`}
              >
                <School className="h-4 w-4 shrink-0" />
                <span>School / Institution</span>
              </button>
            </div>

            {/* Mode Tabs: Sign In vs Register vs Forgot */}
            <div className="mt-6 flex border-b border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setInfoMsg(""); }}
                className={`flex-1 border-b-2 pb-3 text-sm font-bold transition ${
                  mode === "login"
                    ? "border-[#EC0E58] text-[#0A5C91]"
                    : "border-transparent text-[#64748B] hover:text-[#0B2A47]"
                }`}
              >
                Sign In to Existing Account
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(""); setInfoMsg(""); }}
                className={`flex-1 border-b-2 pb-3 text-sm font-bold transition ${
                  mode === "register"
                    ? "border-[#EC0E58] text-[#0A5C91]"
                    : "border-transparent text-[#64748B] hover:text-[#0B2A47]"
                }`}
              >
                {role === "school" ? "Register School Owner Profile" : "Create New Parent Account"}
              </button>
              {mode === "forgot" && (
                <button
                  type="button"
                  className="flex-1 border-b-2 border-[#0795DC] pb-3 text-sm font-bold text-[#0A5C91]"
                >
                  Reset Password
                </button>
              )}
            </div>

            {error && (
              <div className="vv-pop mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            )}

            {infoMsg && (
              <div className="vv-pop mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                {infoMsg}
              </div>
            )}

            {/* 1. SIGN IN FORM (WITH CAPTCHA) */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                    <Mail className="h-3.5 w-3.5 text-[#0A5C91]" />
                    <span>Registered Mobile Number or Email Address *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={role === "school" ? "e.g. 9876543210 or principal@school.edu.in" : "e.g. 9876543210 or parent@gmail.com"}
                    className="h-11 w-full rounded-xl border border-[#CBD5E1] px-4 text-sm text-[#0B2A47] focus:border-[#0795DC] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                    <Lock className="h-3.5 w-3.5 text-[#0A5C91]" />
                    <span>Password *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPw ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-4 pr-11 text-sm text-[#0B2A47] focus:border-[#0795DC] focus:outline-none"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowLoginPw(!showLoginPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8896A6] hover:text-[#0A5C91]"
                      aria-label={showLoginPw ? "Hide password" : "Show password"}
                    >
                      {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setInfoMsg("");
                        setForgotEmail(identifier.includes("@") ? identifier : "");
                        setForgotStep("send_otp");
                        setMode("forgot");
                        loadNewCaptcha();
                      }}
                      className="text-xs font-bold text-[#0A5C91] hover:text-[#EC0E58] transition hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                {renderCaptchaBox()}

                <button
                  type="submit"
                  disabled={loading}
                  className="vv-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 text-sm font-bold text-white shadow-md transition disabled:opacity-60"
                >
                  <span>{loading ? "Signing In..." : role === "school" ? "Sign In to Institution Portal" : "Sign In to Parent Portal"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* FORGOT & RESET PASSWORD FORM */}
            {mode === "forgot" && (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl bg-gradient-to-r from-[#F0F9FF] to-[#E6F4FC] p-4 border border-[#BAE6FD]">
                  <h3 className="text-base font-extrabold text-[#0B2A47]">
                    {forgotStep === "send_otp" ? "Forgot Your Password?" : "Create New Password"}
                  </h3>
                  <p className="mt-1 text-xs text-[#475569]">
                    {forgotStep === "send_otp"
                      ? "Enter your registered email address below. We will send you a 6-digit verification code to reset your password."
                      : `Enter the 6-digit code sent to ${forgotEmail} and set your new password.`}
                  </p>
                </div>

                {forgotStep === "send_otp" ? (
                  <form onSubmit={handleSendForgotOtp} className="space-y-4">
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                        <Mail className="h-3.5 w-3.5 text-[#0A5C91]" />
                        <span>Registered Email Address *</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder={role === "school" ? "school@institution.edu" : "parent@example.com"}
                        className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-4 text-sm text-[#0B2A47] focus:border-[#0795DC] focus:outline-none"
                      />
                    </div>

                    {renderCaptchaBox()}

                    <button
                      type="submit"
                      disabled={forgotSendingOtp}
                      className="vv-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 text-sm font-bold text-white shadow-md transition disabled:opacity-60"
                    >
                      <Mail className="h-4 w-4" />
                      <span>{forgotSendingOtp ? "Sending Reset Code..." : "Send Reset Code (Email OTP)"}</span>
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => { setMode("login"); setError(""); setInfoMsg(""); }}
                        className="text-xs font-bold text-[#0A5C91] hover:underline"
                      >
                        &larr; Remember your password? Back to Sign In
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                          <KeyRound className="h-3.5 w-3.5 text-[#0A5C91]" />
                          <span>6-Digit Verification Code *</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleSendForgotOtp}
                          disabled={forgotSendingOtp || otpCountdown > 0}
                          className="text-xs font-bold text-[#0795DC] hover:underline disabled:opacity-50"
                        >
                          {otpCountdown > 0 ? `Resend code in ${otpCountdown}s` : "Resend Code"}
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        className="h-11 w-full rounded-xl border border-[#0795DC] bg-white px-4 font-mono text-base font-bold tracking-[0.25em] text-[#0B2A47] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                        <Lock className="h-3.5 w-3.5 text-[#0A5C91]" />
                        <span>New Password (Min. 6 characters) *</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showForgotPw ? "text" : "password"}
                          required
                          minLength={6}
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-4 pr-11 text-sm text-[#0B2A47] focus:border-[#0795DC] focus:outline-none"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowForgotPw(!showForgotPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8896A6] hover:text-[#0A5C91]"
                        >
                          {showForgotPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                        <Lock className="h-3.5 w-3.5 text-[#0A5C91]" />
                        <span>Confirm New Password *</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showForgotConfirmPw ? "text" : "password"}
                          required
                          minLength={6}
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="h-11 w-full rounded-xl border border-[#CBD5E1] px-4 pr-11 text-sm text-[#0B2A47] focus:border-[#0795DC] focus:outline-none"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowForgotConfirmPw(!showForgotConfirmPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8896A6] hover:text-[#0A5C91]"
                        >
                          {showForgotConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotResetting}
                      className="vv-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 text-sm font-bold text-white shadow-md transition disabled:opacity-60"
                    >
                      <span>{forgotResetting ? "Updating Password..." : "Reset & Update Password"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <div className="flex items-center justify-between pt-2 text-xs">
                      <button
                        type="button"
                        onClick={() => { setForgotStep("send_otp"); setError(""); }}
                        className="font-bold text-[#64748B] hover:text-[#0B2A47]"
                      >
                        &larr; Change Email Address
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMode("login"); setError(""); setInfoMsg(""); }}
                        className="font-bold text-[#0A5C91] hover:underline"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 2. PARENT REGISTRATION FORM (WITH EMAIL OTP & CAPTCHA) */}
            {mode === "register" && role === "parent" && (
              <form onSubmit={handleParentRegister} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      Parent / Guardian Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      Student / Child Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      <Phone className="h-3.5 w-3.5 text-[#0A5C91]" />
                      <span>10-Digit Mobile Number *</span>
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={parentMobile}
                      onChange={(e) => setParentMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      <KeyRound className="h-3.5 w-3.5 text-[#0A5C91]" />
                      <span>Create Password (Min 6 chars) *</span>
                    </label>
                    <div className="relative">

               <input
                      type={showParentPw ? "text" : "password"}
                      required
                      minLength={6}
                      value={parentPassword}
                      onChange={(e) => setParentPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 pr-11 text-sm"
                    />

               <button

                 type="button"

                 tabIndex={-1}

                 onClick={() => setShowParentPw(!showParentPw)}

                 className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8896A6] hover:text-[#0A5C91]"

                 aria-label={showParentPw ? "Hide password" : "Show password"}

               >

                 {showParentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}

               </button>

             </div>
                  </div>
                </div>

                {renderCaptchaBox()}
                {renderEmailOtpSection(parentEmail, setParentEmail, "parent@gmail.com")}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      Admission Class
                    </label>
                    <select
                      value={lookingForClass}
                      onChange={(e) => setLookingForClass(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm"
                    >
                      {["Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      School Type
                    </label>
                    <select
                      value={admissionType}
                      onChange={(e) => setAdmissionType(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm"
                    >
                      <option value="Boarding School">Boarding School</option>
                      <option value="Day">Day School</option>
                      <option value="Play School">Play School</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      Preferred City
                    </label>
                    <input
                      type="text"
                      value={preferredCity}
                      onChange={(e) => setPreferredCity(e.target.value)}
                      placeholder="e.g. Dehradun, Pune"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="vv-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 text-sm font-bold text-white shadow-md transition disabled:opacity-60"
                >
                  <span>{loading ? "Creating Account..." : "Verify OTP & Create Parent Account"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* 3. SCHOOL OWNER REGISTRATION FORM (STAGE 1: OWNER PROFILE + EMAIL OTP + CAPTCHA) */}
            {mode === "register" && role === "school" && (
              <form onSubmit={handleSchoolRegister} className="mt-6 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-[#0795DC]/30 bg-[#F0F8FF] p-4">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#0A5C91]" />
                  <div className="text-xs leading-relaxed text-[#12304A]">
                    <p className="font-bold text-[#0A5C91]">Stage 1: Create Your School Owner Profile</p>
                    <p className="mt-0.5 text-[#4E5A68]">
                      Your Owner Profile will be sent to the VidyaVista Administrator for verification. Once approved, you can <strong>Claim an Existing School</strong> or <strong>Add a New School</strong> from your dashboard.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      Owner / Contact Person Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Verma"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      Designation / Role *
                    </label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Founder / Chairman / Principal"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                    />
                  </div>
                </div>

                {selectedSchoolId && (
                  <div className="flex items-center justify-between rounded-xl border border-[#9ED8F5] bg-[#EAF6FD] px-4 py-3 text-xs text-[#0A5C91]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0795DC]" />
                      <span>
                        Claiming Official Listing: <strong>{institutionName}</strong>
                        {schoolCity ? ` (${schoolCity})` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchoolId(null);
                        setInstitutionName("");
                      }}
                      className="font-bold text-[#C8104F] hover:underline"
                    >
                      Clear &amp; Search Again
                    </button>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      Institution / Trust / School Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={institutionName}
                        onChange={(e) => {
                          setInstitutionName(e.target.value);
                          setSelectedSchoolId(null);
                        }}
                        onFocus={() => {
                          if (searchSuggestions.length > 0) setShowSuggestions(true);
                        }}
                        placeholder="Type to search existing school listing..."
                        className="h-11 w-full rounded-xl border border-[#CBD5E1] pl-3.5 pr-9 text-sm outline-none focus:border-[#0795DC] focus:ring-2 focus:ring-[#0795DC]/20"
                      />
                      {searchingSchools ? (
                        <RefreshCw className="absolute right-3 top-3 h-4 w-4 animate-spin text-[#0795DC]" />
                      ) : (
                        <Search className="absolute right-3 top-3 h-4 w-4 text-[#8896A6]" />
                      )}
                    </div>

                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[#CBD5E1] bg-white p-1.5 shadow-xl">
                        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5C6A7B]">
                          Suggested Schools in Database
                        </div>
                        {searchSuggestions.map((sc: any) => (
                          <button
                            key={sc.schoolId || sc.slug}
                            type="button"
                            onClick={() => {
                              setInstitutionName(sc.name);
                              setSelectedSchoolId(sc.schoolId || sc.id);
                              if (sc.city) setSchoolCity(sc.city);
                              if (sc.state) setSchoolState(sc.state || "");
                              setShowSuggestions(false);
                            }}
                            className="flex w-full items-start justify-between rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-[#E1F1FA]"
                          >
                            <div>
                              <p className="font-bold text-[#0B2A47]">{sc.name}</p>
                              <p className="text-[11px] text-[#5C6A7B]">
                                {[sc.area, sc.city, sc.board].filter(Boolean).join(" • ")}
                              </p>
                            </div>
                            <span className="shrink-0 rounded bg-[#EAF6FD] px-2 py-0.5 text-[10px] font-extrabold text-[#0A5C91]">
                              Select &amp; Claim
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="mt-1 block w-full rounded-lg border-t border-[#E1E7EE] px-2.5 py-2 text-center text-[11px] font-bold text-[#0795DC] hover:bg-[#F3F9FD]"
                        >
                          + My school is not listed (Register as New School)
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      10-Digit Official Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={schoolMobile}
                      onChange={(e) => setSchoolMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={schoolCity}
                      onChange={(e) => setSchoolCity(e.target.value)}
                      placeholder="e.g. Dehradun"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      State
                    </label>
                    <input
                      type="text"
                      value={schoolState}
                      onChange={(e) => setSchoolState(e.target.value)}
                      placeholder="e.g. Uttarakhand"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                      Create Password *
                    </label>
                    <div className="relative">

               <input
                      type={showSchoolPw ? "text" : "password"}
                      required
                      minLength={6}
                      value={schoolPassword}
                      onChange={(e) => setSchoolPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 pr-11 text-sm"
                    />

               <button

                 type="button"

                 tabIndex={-1}

                 onClick={() => setShowSchoolPw(!showSchoolPw)}

                 className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8896A6] hover:text-[#0A5C91]"

                 aria-label={showSchoolPw ? "Hide password" : "Show password"}

               >

                 {showSchoolPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}

               </button>

             </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">
                    Affiliation Number / Verification Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={claimProof}
                    onChange={(e) => setClaimProof(e.target.value)}
                    placeholder="e.g. CBSE Affiliation No. 3530012 or Official Trust Registration"
                    className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-sm"
                  />
                </div>

                {renderCaptchaBox()}
                {renderEmailOtpSection(schoolEmail, setSchoolEmail, "principal@school.edu.in")}

                <button
                  type="submit"
                  disabled={loading}
                  className="vv-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 text-sm font-bold text-white shadow-md transition disabled:opacity-60"
                >
                  <span>{loading ? "Submitting Owner Profile..." : "Verify OTP & Submit Owner Profile for Approval"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F7FA] p-12 text-center font-semibold text-[#0A5C91]">Loading VidyaVista Portal...</div>}>
      <LoginPortalInner />
    </Suspense>
  );
}
