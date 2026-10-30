"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearToken, getToken } from "../_lib/api";
import type { Admin, AdminEnquiry, Paged } from "../_lib/types";
import { cx, PageLoader } from "./ui";

const AdminCtx = createContext<Admin | null>(null);
export const useAdmin = () => useContext(AdminCtx);

const ICONS: Record<string, string> = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  school: "M12 3 1 9l11 6 9-4.9V17h2V9L12 3zM5 13.2v4L12 21l7-3.8v-4L12 17l-7-3.8z",
  plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  upload: "M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z",
  mail: "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z",
  cog: "M19.4 13a7.7 7.7 0 0 0 0-2l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.3 7.3 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6a7.3 7.3 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 11a7.7 7.7 0 0 0 0 2l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.6c0 .2.3.4.5.4h4c.3 0 .5-.2.5-.4l.4-2.6c.6-.3 1.200-.6 1.700-1l2.500 1c.2.1.5 0 .6-.2l2-3.500a.5.5 0 0 0-.1-.6L19.400 13zM12 15.500a3.500 3.500 0 1 1 0-7 3.500 3.500 0 0 1 0 7z",
  out: "M17 7l-1.400 1.400L18.200 11H8v2h10.200l-2.600 2.600L17 17l5-5-5-5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z",
  globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.900 6h-2.900a15.700 15.700 0 0 0-1.400-3.600A8 8 0 0 1 18.900 8zM12 4c.8 1.200 1.500 2.500 1.900 4h-3.800c.4-1.500 1.100-2.800 1.900-4zM4.300 14a8.200 8.200 0 0 1 0-4h3.400a16.500 16.500 0 0 0 0 4H4.300zm.8 2h2.900c.3 1.300.8 2.500 1.400 3.600A8 8 0 0 1 5.100 16zM8 8H5.100a8 8 0 0 1 4.300-3.600C8.800 5.500 8.300 6.700 8 8zm4 12c-.8-1.200-1.500-2.500-1.900-4h3.800c-.4 1.500-1.100 2.800-1.900 4zm2.300-6H9.700a14.700 14.700 0 0 1 0-4h4.600a14.700 14.700 0 0 1 0 4zm.3 5.600c.6-1.100 1.100-2.300 1.400-3.600h2.900a8 8 0 0 1-4.300 3.600zm1.700-5.600a16.500 16.500 0 0 0 0-4h3.400a8.200 8.200 0 0 1 0 4h-3.400z",
};
export const Icon = ({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d={ICONS[name]} />
  </svg>
);

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/schools", label: "Schools", icon: "school" },
  { href: "/admin/schools/new", label: "Add School", icon: "plus" },
  { href: "/admin/schools/import", label: "Bulk Import", icon: "upload" },
  { href: "/admin/locations", label: "States & Cities", icon: "globe" },
  { href: "/admin/enquiries", label: "Enquiries", icon: "mail", badge: true },
  { href: "/admin/settings", label: "Settings", icon: "cog" },
] as const;

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [ready, setReady] = useState(isLogin);
  const [open, setOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);

  // auth guard
  useEffect(() => {
    if (isLogin) { setReady(true); return; }
    if (!getToken()) { router.replace("/admin/login"); return; }
    api<{ admin: Admin }>("/auth/me")
      .then((r) => { setAdmin(r.admin); setReady(true); })
      .catch(() => { clearToken(); router.replace("/admin/login"); });
  }, [isLogin, router]);

  // sidebar badge: number of new enquiries (refreshed on every page change)
  useEffect(() => {
    if (isLogin || !admin) return;
    api<Paged<AdminEnquiry, { counts: { new: number } }>>("/enquiries?limit=1")
      .then((r) => setNewCount(r.meta.counts.new))
      .catch(() => {});
  }, [pathname, admin, isLogin]);

  useEffect(() => setOpen(false), [pathname]);

  if (isLogin) return <>{children}</>;
  if (!ready || !admin) return <PageLoader />;

  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : href === "/admin/schools" ? pathname === "/admin/schools" || /^\/admin\/schools\/\d+/.test(pathname) : pathname === href || pathname.startsWith(href + "/"));
  const logout = () => { clearToken(); router.replace("/admin/login"); };

  return (
    <AdminCtx.Provider value={admin}>
      <div className="min-h-screen bg-[#F6FAFD] text-[#0B2A47]">
        {open && <div className="fixed inset-0 z-40 bg-[#0B2A47]/40 lg:hidden" onClick={() => setOpen(false)} />}

        <aside className={cx("fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#E1E7EE] bg-white transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
          <div className="border-b border-[#E1E7EE] px-5 py-4">
            <Link href="/admin" aria-label="VidyaVista admin home">
              <img src="/logo.png" alt="VidyaVista" className="h-10 w-auto object-contain" />
            </Link>
            <span className="mt-2 inline-block rounded-full bg-[#FDE8EF] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[#C8104F]">Admin Panel</span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cx("group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition", active(n.href) ? "bg-[#E1F1FA] text-[#0A5C91]" : "text-[#4E5A68] hover:bg-[#F6FAFD] hover:text-[#0A5C91]")}>
                {active(n.href) && <span className="absolute -left-3 top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-r-full bg-[#EC0E58]" />}
                <Icon name={n.icon} />
                <span className="flex-1">{n.label}</span>
                {"badge" in n && newCount > 0 && <span className="rounded-full bg-[#EC0E58] px-2 py-0.5 text-[11px] font-extrabold text-white">{newCount > 99 ? "99+" : newCount}</span>}
              </Link>
            ))}
          </nav>

          <div className="space-y-1 border-t border-[#E1E7EE] p-3">
            <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#4E5A68] transition hover:bg-[#F6FAFD] hover:text-[#0A5C91]">
              <Icon name="globe" /> View website
            </a>
            <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#C8104F] transition hover:bg-[#FDE8EF]">
              <Icon name="out" /> Log out
            </button>
          </div>
        </aside>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#E1E7EE] bg-white/90 px-4 py-3 backdrop-blur-xl lg:px-8">
            <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-xl border border-[#D6DDE5] p-2 text-lg text-[#0A5C91] lg:hidden">☰</button>
            <p className="hidden text-sm text-[#5C6A7B] sm:block">Discover <span className="text-[#EC0E58]">|</span> Learn <span className="text-[#EC0E58]">|</span> Grow</p>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right leading-tight">
                <p className="text-sm font-bold">{admin.name}</p>
                <p className="text-xs text-[#8896A6]">{admin.email}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0A5C91] to-[#0795DC] text-sm font-extrabold text-white">{admin.name.slice(0, 1).toUpperCase()}</span>
            </div>
          </header>
          <main className="mx-auto max-w-[1280px] p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminCtx.Provider>
  );
}
