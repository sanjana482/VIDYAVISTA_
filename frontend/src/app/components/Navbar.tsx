"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LocationPicker from "./LocationPicker";
import { openLocationPicker } from "../lib/places";
import { normalizeType, readPreference } from "../lib/preferences";
import { typePath } from "../lib/links";
import { clearPortalSession, getStoredPortalUser, type PortalUser } from "../lib/portalApi";
import { openCounsellorModal } from "../lib/counsellor";
import Icon from "./Icon";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false);
  const [user, setUser] = useState<PortalUser | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const sync = () => setUser(getStoredPortalUser());
    sync();
    window.addEventListener("vv-auth-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vv-auth-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [pathname]);

  const goSchools = () => {
    router.push("/schools");
  };
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const mainLinks = [
    { name: "Home", href: "/" },
    { name: "Schools", href: "/schools" },
    { name: "Compare", href: "/compare" },
    { name: "Blog", href: "/blog" },
  ];

  const handleLogout = () => {
    clearPortalSession();
    setUser(null);
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-[100] border-b border-[#D6DDE5]/80 bg-white/95 shadow-[0_6px_24px_rgba(12,50,54,0.05)] backdrop-blur-xl">
        <nav className="mx-auto flex min-h-[64px] sm:min-h-[80px] max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8 py-2.5 sm:py-4">
          <div className="flex items-center gap-2">
            {/* Mobile Back Arrow Button */}
            {pathname !== "/" && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push("/");
                  }
                }}
                aria-label="Go back"
                className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-[#D6DDE5] bg-white text-[#0B2A47] hover:border-[#0795DC] hover:text-[#0A7BBF] transition shadow-sm active:scale-90 shrink-0"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Logo */}
            <Link href="/" className="flex items-center" aria-label="VidyaVista home">
            <img
              src="/logo.png"
              alt="VidyaVista - Discover | Learn | Grow"
              className="h-8 w-auto object-contain sm:h-9 transition hover:opacity-95"
            />
          </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden items-center gap-6 lg:gap-8 md:flex">
            {mainLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={
                  link.name === "Schools"
                    ? (e) => { e.preventDefault(); goSchools(); }
                    : undefined
                }
                className={`border-b-2 pb-0.5 text-xs sm:text-[13.5px] font-semibold transition hover:text-[#0A7BBF] ${
                  isActive(link.href) ? "border-[#EC0E58] text-[#0B2A47]" : "border-transparent text-[#4E5A68]"
                }`}
              >
                {link.name}
              </Link>
            ))}

            {/* For Schools Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setSchoolDropdownOpen(true)}
              onMouseLeave={() => setSchoolDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setSchoolDropdownOpen(!schoolDropdownOpen)}
                className={`inline-flex items-center gap-1.5 border-b-2 pb-0.5 text-xs sm:text-[13.5px] font-semibold transition hover:text-[#0A7BBF] ${
                  pathname.startsWith("/school") || schoolDropdownOpen
                    ? "border-[#EC0E58] text-[#0B2A47]"
                    : "border-transparent text-[#4E5A68]"
                }`}
              >
                <span>For Schools</span>
                <svg
                  className={`h-4 w-4 transition-transform duration-200 ${schoolDropdownOpen ? "rotate-180 text-[#EC0E58]" : "text-[#707E8F]"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {schoolDropdownOpen && (
                <div className="absolute left-0 top-full z-50 pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="w-64 rounded-2xl border border-[#D6DDE5] bg-white p-2.5 shadow-2xl ring-1 ring-black/5">
                    <Link
                      href="/login?role=school&mode=login"
                      onClick={() => setSchoolDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#1E3A5F] transition hover:bg-[#F0F8FF] hover:text-[#0A5C91]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E1F1FA] text-[#0A5C91]">
                        <Icon name="school" className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#0B2A47]">School Login</div>
                        <div className="text-xs text-[#6E7C87]">Access your dashboard</div>
                      </div>
                    </Link>

                    <Link
                      href="/login?role=school&mode=register"
                      onClick={() => setSchoolDropdownOpen(false)}
                      className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#1E3A5F] transition hover:bg-[#FDF2F4] hover:text-[#EC0E58]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDE8EF] text-[#EC0E58]">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#0B2A47]">Register School</div>
                        <div className="text-xs text-[#6E7C87]">List your institution</div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden items-center gap-2.5 lg:gap-3 md:flex">
            <button
              type="button"
              onClick={() => openCounsellorModal({ source: "Navbar: Free Counselling" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E1F1FA] border border-[#BDE0F5] px-3.5 py-1.5 text-xs font-bold text-[#0A5C91] hover:bg-[#D0E9F7] hover:border-[#96CDF0] transition shadow-sm cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Free Counselling</span>
            </button>

            {user ? (
              <>
                <Link
                  href={user.role === "school" ? "/school" : "/parent"}
                  className="art-btn-p inline-flex h-8 sm:h-9 items-center justify-center gap-2 rounded-lg px-4 text-xs sm:text-[13px] font-bold text-white shadow-sm"
                >
                  <Icon name={user.role === "school" ? "school" : "user"} className="h-4 w-4" />
                  <span>{user.role === "school" ? "Institution Dashboard" : "Parent Dashboard"}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-8 sm:h-9 items-center justify-center rounded-lg border-2 border-[#D6DDE5] bg-white px-3.5 text-xs sm:text-[13px] font-bold text-[#C8104F] transition hover:border-[#C8104F]/40 hover:bg-[#FDE8EF]"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login?role=parent&mode=login"
                  className="inline-flex h-8 sm:h-9 items-center justify-center rounded-lg border border-[#D6DDE5] bg-white px-3.5 sm:px-4 text-xs sm:text-[13px] font-bold text-[#25343a] transition hover:border-[#0795DC] hover:text-[#0A5C91] hover:bg-[#F8FBFE]"
                >
                  Login
                </Link>
                <Link
                  href="/login?role=parent&mode=register"
                  className="art-btn-p inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-lg px-4 sm:px-4.5 text-xs sm:text-[13px] font-bold text-white shadow-md transition hover:-translate-y-0.5"
                >
                  <span>Sign Up</span>
                  <span className="text-white/90">→</span>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-xl border border-[#D6DDE5] bg-white p-2.5 text-xl text-[#0A5C91] md:hidden"
          >
            <Icon name={menuOpen ? "x" : "menu"} className="h-6 w-6" />
          </button>
        </nav>

        {menuOpen && (
          <div className="space-y-3 border-t border-[#D6DDE5] bg-white px-5 py-5 md:hidden">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openCounsellorModal({ source: "Mobile Menu: Free Counselling" });
              }}
              className="flex w-full items-center justify-between rounded-xl bg-[#E1F1FA] border border-[#BDE0F5] px-4 py-2.5 text-sm font-bold text-[#0A5C91] hover:bg-[#D0E9F7] transition"
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Free Counselling</span>
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-[#0795DC]">Request Call</span>
            </button>

            {mainLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={(e) => {
                  setMenuOpen(false);
                  if (link.name === "Schools") {
                    e.preventDefault();
                    goSchools();
                  }
                }}
                className="block rounded-lg px-3 py-2 font-semibold text-[#4E5A68] hover:bg-[#E5EDF2] hover:text-[#0A5C91]"
              >
                {link.name}
              </Link>
            ))}

            {/* For Schools in Mobile Nav */}
            <div className="rounded-xl border border-[#E1E7EE] bg-[#F8FBFE] p-3 space-y-2">
              <p className="px-1 text-xs font-extrabold uppercase tracking-wider text-[#0A5C91]">For Schools</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login?role=school&mode=login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center rounded-lg border border-[#D6DDE5] bg-white py-2 text-xs font-bold text-[#0B2A47] hover:border-[#0795DC]"
                >
                  School Login
                </Link>
                <Link
                  href="/login?role=school&mode=register"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center rounded-lg bg-[#EC0E58] py-2 text-xs font-bold text-white shadow-sm hover:bg-[#C8104F]"
                >
                  Register School
                </Link>
              </div>
            </div>

            {user ? (
              <div className="grid grid-cols-1 gap-2.5 pt-2">
                <Link
                  href={user.role === "school" ? "/school" : "/parent"}
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-4 text-sm font-semibold text-white"
                >
                  <Icon name={user.role === "school" ? "school" : "user"} className="h-4 w-4" />
                  <span>{user.role === "school" ? "Institution Dashboard" : "Parent Dashboard"}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#FDE8EF] bg-[#FDE8EF] px-4 text-sm font-semibold text-[#C8104F]"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <Link
                  href="/login?role=parent&mode=login"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[#D6DDE5] bg-white px-4 text-sm font-bold text-[#0B2A47]"
                >
                  Login
                </Link>
                <Link
                  href="/login?role=parent&mode=register"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-4 text-sm font-bold text-white shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
        <LocationPicker />
      </header>

      {/* Mobile Bottom Navigation Bar (App style) */}
      {!pathname.startsWith("/login") && (
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-[99] border-t border-[#E2E8F0] bg-white/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(11,42,71,0.08)] md:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid h-16 grid-cols-5 items-center justify-around px-1">
          {/* 1. Home */}
          <Link
            href="/"
            className={`group flex flex-col items-center justify-center py-1 transition-all ${
              pathname === "/" ? "text-[#0795DC]" : "text-[#64748B] hover:text-[#0B2A47]"
            }`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
              pathname === "/" ? "bg-[#E1F1FA] text-[#0795DC]" : "group-hover:text-[#0B2A47]"
            }`}>
              <Icon name="home" className="h-5 w-5" />
            </span>
            <span className={`text-[10.5px] tracking-tight transition-all ${
              pathname === "/" ? "font-bold text-[#0795DC]" : "font-medium text-[#64748B]"
            }`}>
              Home
            </span>
          </Link>

          {/* 2. Schools */}
          <button
            type="button"
            onClick={goSchools}
            className={`group flex flex-col items-center justify-center py-1 transition-all ${
              pathname.startsWith("/schools") || pathname.includes("-schools") ? "text-[#0795DC]" : "text-[#64748B] hover:text-[#0B2A47]"
            }`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
              pathname.startsWith("/schools") || pathname.includes("-schools") ? "bg-[#E1F1FA] text-[#0795DC]" : "group-hover:text-[#0B2A47]"
            }`}>
              <Icon name="school" className="h-5 w-5" />
            </span>
            <span className={`text-[10.5px] tracking-tight transition-all ${
              pathname.startsWith("/schools") || pathname.includes("-schools") ? "font-bold text-[#0795DC]" : "font-medium text-[#64748B]"
            }`}>
              Schools
            </span>
          </button>

          {/* 3. Compare */}
          <Link
            href="/compare"
            className={`group flex flex-col items-center justify-center py-1 transition-all ${
              pathname.startsWith("/compare") ? "text-[#0795DC]" : "text-[#64748B] hover:text-[#0B2A47]"
            }`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
              pathname.startsWith("/compare") ? "bg-[#E1F1FA] text-[#0795DC]" : "group-hover:text-[#0B2A47]"
            }`}>
              <Icon name="scale" className="h-5 w-5" />
            </span>
            <span className={`text-[10.5px] tracking-tight transition-all ${
              pathname.startsWith("/compare") ? "font-bold text-[#0795DC]" : "font-medium text-[#64748B]"
            }`}>
              Compare
            </span>
          </Link>

          {/* 4. Free Counselling */}
          <button
            type="button"
            onClick={() => openCounsellorModal({ source: "Mobile Bottom Nav" })}
            className="group relative flex flex-col items-center justify-center py-1 text-[#0A5C91] hover:text-[#0795DC] transition-all"
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E1F1FA] to-[#D0E9F7] text-[#0795DC] group-hover:scale-105 transition-transform">
              <Icon name="sparkles" className="h-4.5 w-4.5 text-[#0795DC]" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EC0E58] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EC0E58]"></span>
              </span>
            </span>
            <span className="text-[10.5px] font-bold text-[#0A5C91] tracking-tight">
              Counselling
            </span>
          </button>

          {/* 5. Account / Dashboard / Login */}
          <Link
            href={user ? (user.role === "school" ? "/school" : "/parent") : "/login?role=parent&mode=login"}
            className={`group flex flex-col items-center justify-center py-1 transition-all ${
              pathname.startsWith("/login") || pathname.startsWith("/parent") || pathname.startsWith("/school")
                ? "text-[#0795DC]"
                : "text-[#64748B] hover:text-[#0B2A47]"
            }`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
              pathname.startsWith("/login") || pathname.startsWith("/parent") || pathname.startsWith("/school")
                ? "bg-[#E1F1FA] text-[#0795DC]"
                : "group-hover:text-[#0B2A47]"
            }`}>
              <Icon name={user?.role === "school" ? "school" : "user"} className="h-5 w-5" />
            </span>
            <span className={`text-[10.5px] tracking-tight transition-all ${
              pathname.startsWith("/login") || pathname.startsWith("/parent") || pathname.startsWith("/school")
                ? "font-bold text-[#0795DC]"
                : "font-medium text-[#64748B]"
            }`}>
              {user ? (user.role === "school" ? "Portal" : "Profile") : "Login"}
            </span>
          </Link>
        </div>
      </nav>
      )}
    </>
  );
}
