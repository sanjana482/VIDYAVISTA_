"use client";
import { cityPath, schoolPath } from "../../lib/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { School } from "../../data/schools";
import { openEnquiry } from "./enquiry";
import { portalApi } from "../../lib/portalApi";
import { BACKEND_ORIGIN } from "../../lib/api";
import Icon from "../Icon";
import AdmissionBadge from "../AdmissionBadge";
import Watermark from "../Watermark";

type Props = {
  school: School;
  intro: string;
  phoneHref: string;
  stats: { label: string; value: string }[];
};

function resolveMediaUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${BACKEND_ORIGIN}${cleanPath}`;
}

export default function ProfileHero({ school: s, intro, phoneHref, stats }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);

  const rawLogo = s.logo || s.logoUrl || s.logo_url || (s.profile as any)?.logo_url || (s.profile as any)?.logo || "";
  const logoSrc = resolveMediaUrl(rawLogo);

  useEffect(() => {
    try {
      const list: number[] = JSON.parse(localStorage.getItem("vv_saved") || "[]");
      setSaved(list.includes(s.id));
    } catch {}
  }, [s.id]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  async function toggleSave() {
    // Require login/signup before shortlisting
    const token = typeof window !== "undefined" ? localStorage.getItem("vv_portal_token") : null;
    if (!token) {
      router.push(`/login?role=parent&redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    try {
      const list: number[] = JSON.parse(localStorage.getItem("vv_saved") || "[]");
      const updated = next ? Array.from(new Set([...list, s.id])) : list.filter((x) => x !== s.id);
      localStorage.setItem("vv_saved", JSON.stringify(updated));
    } catch {}

    // Persist to parent portal database immediately
    try {
      await portalApi("/portal/parent/shortlist/toggle", {
        method: "POST",
        body: JSON.stringify({ schoolId: s.id }),
      });
    } catch {}

    flash(next ? "School saved" : "Removed from saved");
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: s.name, url });
      else {
        await navigator.clipboard.writeText(url);
        flash("Link copied");
      }
    } catch {}
  }

  const chip = "rounded-lg px-3.5 py-2 text-xs font-extrabold";
  const ghost =
    "inline-flex items-center gap-2 rounded-xl border border-[#D6DDE5] bg-white px-5 py-3.5 text-sm font-bold text-[#0B2A47] transition hover:border-[#0795DC] hover:text-[#0A7BBF]";

  return (
    <section className="bg-gradient-to-b from-[#F3F9FD] to-white">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-5 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 text-sm text-[#5C6A7B]">
          <Link href="/" className="hover:text-[#0A7BBF]">Home</Link>›
          <Link href="/schools" className="hover:text-[#0A7BBF]">Schools</Link>›
          <Link href={cityPath(s.city)} className="hover:text-[#0A7BBF]">{s.city}</Link>›
          <span className="text-[#0B2A47]">{s.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          {/* Photo */}
          <div className="relative h-72 overflow-hidden rounded-3xl bg-[#E1F1FA] shadow-xl shadow-[#0A5C91]/10 sm:h-96 lg:h-[475px]">
            <img src={s.image} alt={`${s.name} campus`} className="h-full w-full object-cover" />
            <Watermark />
            <Link
              href={`${schoolPath(s)}/photos`}
              className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A47] shadow-lg transition hover:bg-[#E1F1FA]"
            >
              <Icon name="camera" className="mr-1.5 inline h-4 w-4" /> View photos
            </Link>
          </div>

          {/* Summary */}
          <div>
            <div className="flex flex-wrap gap-2">
              <span className={`${chip} bg-[#E1F1FA] text-[#0A5C91]`}>{s.board === "No Board" ? "IB Board" : s.board}</span>
              <span className={`${chip} bg-[#E9EEF4] text-[#344251]`}>{s.type}</span>
              <span className={`${chip} bg-[#FDE8EF] text-[#C8104F]`}>{s.gender}</span>
              <AdmissionBadge school={s} />
              {s.verified && (
                <span className={`${chip} bg-[#EBF5FF] text-[#0066CC] border border-[#B8DAFF] inline-flex items-center gap-1.5`}>
                  <Icon name="check" className="h-3.5 w-3.5 text-[#0066CC]" /> Verified School
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-4 sm:gap-5">
              {logoSrc && !logoFailed ? (
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-white p-1.5 shadow-md shadow-[#0A5C91]/15 flex items-center justify-center">
                  <img
                    src={logoSrc}
                    alt={`${s.name} logo`}
                    onError={() => setLogoFailed(true)}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-2xl border border-[#D6DDE5] bg-gradient-to-br from-[#E1F1FA] to-white p-2 shadow-sm flex items-center justify-center text-[#0A5C91]">
                  <Icon name="school" className="h-7 w-7" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#0B2A47] sm:text-3xl lg:text-[2.4rem]">
                  {s.name}
                </h1>
                <p className="mt-1 text-sm text-[#5C6A7B]"><Icon name="mapPin" className="mr-1 inline h-4 w-4 text-[#EC0E58]" /> {s.area}, {s.city}</p>
              </div>
            </div>

            <p className="mt-5 rounded-2xl border border-[#E1E7EE] border-l-4 border-l-[#EC0E58] bg-white px-5 py-4 text-[#4E5A68]">
              {intro}
            </p>

            <p className="mt-5 text-sm text-[#5C6A7B]">
              {s.reviews > 0 ? (
                <>
                  <span className="font-extrabold text-[#C8104F]"><Icon name="star" filled className="mr-1 inline h-4 w-4 align-[-2px]" />{s.rating}</span> ·{" "}
                  <Link href={`${schoolPath(s)}/reviews`} className="underline underline-offset-2 hover:text-[#0A7BBF]">
                    {s.reviews} parent reviews
                  </Link>
                </>
              ) : (
                <>
                  No reviews yet ·{" "}
                  <Link href={`${schoolPath(s)}/reviews`} className="font-semibold text-[#0A7BBF] hover:underline">
                    Write the first review
                  </Link>
                </>
              )}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a href={`tel:${phoneHref}`} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#0A5C91]/25 transition hover:-translate-y-0.5 vv-btn">
                <Icon name="phone" className="h-4 w-4" /> Call Now
              </a>
              <button type="button" onClick={() => openEnquiry()} className="rounded-xl bg-[#EC0E58] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#EC0E58]/25 transition hover:-translate-y-0.5 hover:bg-[#C8104F] vv-btn">
                Enquire for 2027-28
              </button>
              <button type="button" onClick={() => router.push(`/compare?ids=${s.id}`)} className={ghost}>+ Add to compare</button>
              <button type="button" onClick={toggleSave} aria-pressed={saved} className={`${ghost} ${saved ? "!border-[#EC0E58] !text-[#EC0E58]" : ""}`}>
                <Icon name="heart" filled={saved} className={`mr-1 inline h-4 w-4 ${saved ? "vv-heart" : ""}`} />{saved ? "Saved" : "Save"}
              </button>
              <button type="button" onClick={share} className={ghost}><Icon name="share" className="mr-1 inline h-4 w-4" />Share</button>
              <Link
                href={`/login?role=school&mode=register&claim_school_id=${s.id}&claim_school_name=${encodeURIComponent(s.name)}&city=${encodeURIComponent(s.city || "")}&state=${encodeURIComponent(s.state || "")}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#0795DC]/40 bg-[#F0F9FF] px-4 py-3.5 text-sm font-bold text-[#0A5C91] transition hover:border-[#0795DC] hover:bg-[#E0F2FE]"
                title="Are you the owner or principal? Claim this school listing"
              >
                <Icon name="check" className="h-4 w-4 text-[#0795DC]" /> Claim School
              </Link>
            </div>
          </div>
        </div>

        {/* Key facts */}
        <dl className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-[#E1E7EE] bg-[#E1E7EE] shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((f) => (
            <div key={f.label} className="bg-white px-6 py-5">
              <dt className="text-[11px] font-extrabold uppercase tracking-wider text-[#5C6A7B]">{f.label}</dt>
              <dd className="mt-2 text-xl font-extrabold text-[#0B2A47]">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#0B2A47] px-5 py-3 text-sm font-semibold text-white shadow-xl lg:bottom-8">
          {toast}
        </div>
      )}
    </section>
  );
}
