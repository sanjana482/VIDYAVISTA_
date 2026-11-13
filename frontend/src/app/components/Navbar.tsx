"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LocationPicker from "./LocationPicker";
import { openLocationPicker } from "../lib/places";
import { normalizeType, readPreference } from "../lib/preferences";
import { typePath } from "../lib/links";
import { clearPortalSession, getStoredPortalUser, type PortalUser } from "../lib/portalApi";
import Icon from "./Icon";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
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
    const pref = readPreference();
    const type = pref ? normalizeType(pref.type) : "";
    if (pref?.location && type) router.push(typePath(type, pref.location));
    else openLocationPicker();
  };
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const links = [
    { name: "Home", href: "/" },
    { name: "Schools", href: "/schools" },
    { name: "Compare", href: "/compare" },
    { name: "About Us", href: "/about" },
  ];

  const handleLogout = () => {
    clearPortalSession();
    setUser(null);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#D6DDE5] bg-white/95 shadow-sm backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="VidyaVista home">
          <img
            src="/logo.png"
            alt="VidyaVista - Discover | Learn | Grow"
            className="h-11 w-auto object-contain sm:h-12"
          />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={link.name === "Schools" ? (e) => { e.preventDefault(); goSchools(); } : undefined}
              className={`border-b-2 pb-1 text-sm font-semibold transition hover:text-[#0A7BBF] ${isActive(link.href) ? "border-[#EC0E58] text-[#0B2A47]" : "border-transparent text-[#4E5A68]"}`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href={user.role === "school" ? "/school" : "/parent"}
                className="vv-btn inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-4 text-sm font-semibold text-white shadow-sm"
              >
                <Icon name={user.role === "school" ? "school" : "user"} className="h-4 w-4" />
                <span>{user.role === "school" ? "Institution Dashboard" : "Parent Dashboard"}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D6DDE5] bg-white px-4 text-sm font-semibold text-[#C8104F] transition hover:border-[#C8104F]/40 hover:bg-[#FDE8EF]"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login?role=school"
                className="inline-flex h-10 min-w-[155px] items-center justify-center gap-2 rounded-xl border border-[#0795DC]/40 bg-[#F0F8FF] px-4 text-sm font-semibold text-[#0A5C91] transition hover:border-[#0795DC] hover:bg-[#E1F1FA]"
              >
                <Icon name="school" className="h-4 w-4 shrink-0" />
                <span>Institution Portal</span>
              </Link>
              <Link
                href="/login?role=parent"
                className="vv-btn inline-flex h-10 min-w-[155px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-4 text-sm font-semibold text-white shadow-sm"
              >
                <Icon name="user" className="h-4 w-4 shrink-0" />
                <span>Parent Login</span>
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
          {links.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={(e) => { setMenuOpen(false); if (link.name === "Schools") { e.preventDefault(); goSchools(); } }}
              className="block rounded-lg px-3 py-2 font-semibold text-[#4E5A68] hover:bg-[#E5EDF2] hover:text-[#0A5C91]"
            >
              {link.name}
            </Link>
          ))}
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
            <div className="grid grid-cols-1 gap-2.5 pt-2">
              <Link
                href="/login?role=school"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#0795DC] bg-[#F0F8FF] px-4 text-sm font-semibold text-[#0A5C91]"
              >
                <Icon name="school" className="h-4 w-4" />
                <span>Institution Portal</span>
              </Link>
              <Link
                href="/login?role=parent"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-4 text-sm font-semibold text-white"
              >
                <Icon name="user" className="h-4 w-4" />
                <span>Parent Login</span>
              </Link>
            </div>
          )}
        </div>
      )}
      <LocationPicker />
    </header>
  );
}
