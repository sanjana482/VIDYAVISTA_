"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, post, put, uploadImage } from "../_lib/api";
import type { AdminSchool, Faq } from "../_lib/types";
import type { School, SchoolFeeSlab } from "../../data/schools";
import { getProfile } from "../../data/profile";
import FeeEditor from "./FeeEditor";
import { FaqEditor, PhotoEditor } from "./editors";
import { BOARDS, FACILITY_SUGGESTIONS, GENDERS, INDIA_STATES, TYPES, inr } from "../_lib/constants";
import { Card, Field, Spinner, Switch, btn, cx, inputCls, useToast } from "./ui";

type Form = {
  name: string; area: string; city: string; state: string; grades: string;
  board: string; type: string; gender: string;
  fee: string; rating: string; reviews: string; photos: string;
  phone: string; image: string; facilities: string[];
  topRated: boolean; isActive: boolean;
  // profile page content
  about: string; highlights: string; faqs: Faq[]; gallery: string[];
  feeSlabs: SchoolFeeSlab[]; feeNote: string; feeUpdated: string;
  profile: Record<(typeof PROFILE_KEYS)[number], string>;
};

const PROFILE_KEYS = ["established", "students", "ratio", "campus", "address", "email", "website", "admissionStatus", "admissionSummary", "documents"] as const;
const EMPTY_PROFILE = Object.fromEntries(PROFILE_KEYS.map((k) => [k, ""])) as Form["profile"];

const EMPTY: Form = {
  name: "", area: "", city: "", state: "", grades: "Nursery – XII",
  board: "CBSE", type: "Day School", gender: "Co-ed",
  fee: "", rating: "", reviews: "", photos: "",
  phone: "", image: "", facilities: [], topRated: false, isActive: true,
  about: "", highlights: "", faqs: [], gallery: [], feeSlabs: [], feeNote: "", feeUpdated: "", profile: EMPTY_PROFILE,
};

const fromSchool = (s: AdminSchool): Form => ({
  name: s.name, area: s.area, city: s.city, state: s.state, grades: s.grades,
  board: s.board, type: s.type, gender: s.gender,
  fee: String(s.fee ?? ""), rating: s.rating ? String(s.rating) : "", reviews: s.reviews ? String(s.reviews) : "", photos: s.photos ? String(s.photos) : "",
  phone: s.phone || "", image: s.image || "", facilities: s.facilities || [], topRated: s.topRated, isActive: s.isActive,
  about: s.about || "", highlights: (s.highlights || []).join("\n"), faqs: s.faqs || [], gallery: s.gallery || [],
  feeSlabs: s.feeSlabs || [], feeNote: s.feeNote || "", feeUpdated: s.feeUpdated || "",
  profile: Object.fromEntries(PROFILE_KEYS.map((k) => [k, s.profile?.[k] === undefined ? "" : String(s.profile[k])])) as Form["profile"],
});

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-extrabold text-[#0B2A47]">{title}</h2>
      {hint && <p className="mb-4 mt-0.5 text-sm text-[#5C6A7B]">{hint}</p>}
      <div className={cx("grid gap-4 sm:grid-cols-2", !hint && "mt-4")}>{children}</div>
    </Card>
  );
}

export default function SchoolForm({ school }: { school?: AdminSchool }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<Form>(school ? fromSchool(school) : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [facInput, setFacInput] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api<{ cities: string[] }>("/schools/meta").then((m) => setCities(m.cities)).catch(() => {}); }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const addFacility = (raw: string) => {
    const items = raw.split(",").map((x) => x.trim()).filter(Boolean);
    if (!items.length) return;
set("facilities", Array.from(new Set([...f.facilities, ...items])).slice(0, 20));
    setFacInput("");
  };

  async function onFile(file?: File) {
    if (!file) return;
    setUploading(true);
    try { set("image", await uploadImage(file)); toast.success("Image uploaded"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const req: [keyof Form, string][] = [["name", "School name"], ["area", "Area"], ["city", "City"], ["state", "State"], ["grades", "Grades"], ["fee", "Annual fee"]];
    const local: Record<string, string> = {};
    req.forEach(([k, l]) => { if (!String(f[k]).trim()) local[k] = `${l} is required`; });
    if (f.rating && (Number(f.rating) < 0 || Number(f.rating) > 5)) local.rating = "Rating must be between 0 and 5";
    if (f.phone && !/^[+\d][\d\s-]{6,17}$/.test(f.phone.trim())) local.phone = "Enter a valid phone number";
    if (Object.keys(local).length) {
      setErrors(local);
      setFormError("Please fix these before saving: " + Object.values(local).join(" · "));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setFormError("");
    setSaving(true);
    const payload = {
      ...f,
      rating: f.rating || 0, reviews: f.reviews || 0, photos: f.photos || 0,
      highlights: f.highlights.split("\n").map((x) => x.trim()).filter(Boolean),
      faqs: f.faqs.filter((x) => x.q.trim() && x.a.trim()),
    };
    try {
      if (school) {
        await put(`/schools/${school.schoolId}`, payload);
        toast.success("School updated");
      } else {
        await post("/schools", payload);
        toast.success("School added");
      }
      router.push("/admin/schools");
    } catch (err) {
      const e = err as { message?: string; fields?: Record<string, string> };
      const fields = e.fields || {};
      setErrors(fields);
      const detail = Object.values(fields).filter(Boolean).join(" · ");
      setFormError((e.message || "Something went wrong") + (detail ? `: ${detail}` : ""));
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSaving(false);
    }
  }

  const E = (k: string) => errors[k];
  const setProfile = (k: (typeof PROFILE_KEYS)[number], v: string) => setF((x) => ({ ...x, profile: { ...x.profile, [k]: v } }));

  // what the website would generate on its own (used for the "suggested" buttons)
  function suggested(silent = false) {
    try {
      const shim = {
        id: school?.schoolId ?? 0, name: f.name || "This school", area: f.area, city: f.city, state: f.state, board: f.board, grades: f.grades,
        type: f.type, gender: f.gender, rating: 0, reviews: 0, fee: Number(f.fee) || 0, facilities: f.facilities, photos: 0, phone: f.phone || "", image: f.image || "",
      } as unknown as School;
      return getProfile(shim);
    } catch {
      if (!silent) toast.error("Fill the school name, grades and annual fee first");
      return null;
    }
  }
  const sugg = FACILITY_SUGGESTIONS.filter((x) => !f.facilities.includes(x));

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[1fr_340px]">
      {formError && (
        <div role="alert" className="rounded-2xl border border-[#F5C2D3] bg-[#FDE8EF] p-4 text-sm font-semibold text-[#C8104F] xl:col-span-2">
          ⚠️ {formError}
        </div>
      )}
      <div className="space-y-6">
        <Section title="Basic details">
          <Field label="School name" required error={E("name")} className="sm:col-span-2"><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Greenfield Public School" /></Field>
          <Field label="Area / locality" required error={E("area")}><input className={inputCls} value={f.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Kandivali West" /></Field>
          <Field label="City" required error={E("city")}><input list="vv-cities" className={inputCls} value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Mumbai" /></Field>
          <Field label="State" required error={E("state")}><input list="vv-states" className={inputCls} value={f.state} onChange={(e) => set("state", e.target.value)} placeholder="e.g. Maharashtra" /></Field>
          <Field label="Grades" required error={E("grades")} hint="e.g. Nursery – XII, V – XII"><input className={inputCls} value={f.grades} onChange={(e) => set("grades", e.target.value)} /></Field>
          <datalist id="vv-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
          <datalist id="vv-states">{INDIA_STATES.map((c) => <option key={c} value={c} />)}</datalist>
        </Section>

        <Section title="Classification">
          <Field label="Board" error={E("board")}><select className={inputCls} value={f.board} onChange={(e) => set("board", e.target.value)}>{BOARDS.map((b) => <option key={b}>{b}</option>)}</select></Field>
          <Field label="School type" error={E("type")}><select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}>{TYPES.map((b) => <option key={b}>{b}</option>)}</select></Field>
          <Field label="Gender" error={E("gender")}><select className={inputCls} value={f.gender} onChange={(e) => set("gender", e.target.value)}>{GENDERS.map((b) => <option key={b}>{b}</option>)}</select></Field>
        </Section>

        <Section title="Fees, rating & contact">
          <Field label="Annual tuition fee (₹)" required error={E("fee")}><input type="number" min={0} className={inputCls} value={f.fee} onChange={(e) => set("fee", e.target.value)} placeholder="145000" /></Field>
          <Field label="Phone" error={E("phone")} hint="Shown on the school profile"><input className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98XXXXXXXX" /></Field>
          <Field label="Rating (0-5)" error={E("rating")}><input type="number" step="0.1" min={0} max={5} className={inputCls} value={f.rating} onChange={(e) => set("rating", e.target.value)} placeholder="4.5" /></Field>
          <Field label="Number of reviews" error={E("reviews")}><input type="number" min={0} className={inputCls} value={f.reviews} onChange={(e) => set("reviews", e.target.value)} placeholder="0" /></Field>
          <Field label="Photos in gallery" error={E("photos")}><input type="number" min={0} className={inputCls} value={f.photos} onChange={(e) => set("photos", e.target.value)} placeholder="0" /></Field>
        </Section>

        <Section title="Cover image" hint="Upload a JPG / PNG / WebP (max 3 MB) or paste an image link.">
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              <button type="button" className={btn.ghost} disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Spinner className="h-4 w-4" /> : "⬆"} {uploading ? "Uploading…" : "Upload image"}
              </button>
              {f.image && <button type="button" className={btn.danger} onClick={() => set("image", "")}>Remove</button>}
            </div>
            <input className={inputCls + " mt-3"} value={f.image} onChange={(e) => set("image", e.target.value)} placeholder="https://…/photo.jpg" aria-label="Image URL" />
            {E("image") && <p className="mt-1 text-xs font-medium text-[#C8104F]">{E("image")}</p>}
          </div>
        </Section>

        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#0B2A47]">About the school</h2>
              <p className="mt-0.5 text-sm text-[#5C6A7B]">Shown on the profile page. Leave empty to use the automatic text.</p>
            </div>
            <button type="button" className={btn.ghost} onClick={() => { const p = suggested(); if (p) { set("about", p.about.join("\n\n")); set("highlights", p.highlights.join("\n")); } }}>✨ Fill suggested text</button>
          </div>
          <Field label="About (separate paragraphs with a blank line)" className="mt-4"><textarea className={inputCls + " min-h-[200px]"} value={f.about} onChange={(e) => set("about", e.target.value)} /></Field>
          <Field label="Highlights (one per line)" className="mt-4"><textarea className={inputCls + " min-h-[130px]"} value={f.highlights} onChange={(e) => set("highlights", e.target.value)} placeholder={"CBSE curriculum, Nursery to Class 12\nStudent-teacher ratio of 14:1"} /></Field>
        </Card>

        <Section title="School facts" hint="Shown in the profile header. Empty fields use automatic sample values.">
          <Field label="Established (year)"><input type="number" className={inputCls} value={f.profile.established} onChange={(e) => setProfile("established", e.target.value)} placeholder="2003" /></Field>
          <Field label="Students on roll"><input type="number" className={inputCls} value={f.profile.students} onChange={(e) => setProfile("students", e.target.value)} placeholder="1590" /></Field>
          <Field label="Student : teacher ratio"><input type="number" className={inputCls} value={f.profile.ratio} onChange={(e) => setProfile("ratio", e.target.value)} placeholder="14" /></Field>
          <Field label="Campus size"><input className={inputCls} value={f.profile.campus} onChange={(e) => setProfile("campus", e.target.value)} placeholder="1.91 acres" /></Field>
        </Section>

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-extrabold text-[#0B2A47]">Fee structure</h2>
          <p className="mb-4 mt-0.5 text-sm text-[#5C6A7B]">Add, rename or remove fee components for each class and session. These replace the automatic sample split on the profile page.</p>
          <FeeEditor grades={f.grades} fee={f.fee} schoolId={school?.schoolId ?? 0} slabs={f.feeSlabs} onChange={(x) => set("feeSlabs", x)} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Fees last updated"><input className={inputCls} value={f.feeUpdated} onChange={(e) => set("feeUpdated", e.target.value)} placeholder="Oct 2026" /></Field>
            <Field label="Note under the fee table" className="sm:col-span-2"><textarea className={inputCls + " min-h-[80px]"} value={f.feeNote} onChange={(e) => set("feeNote", e.target.value)} placeholder="Source of the fees, what is excluded, how to confirm…" /></Field>
          </div>
        </Card>

        <Section title="Admission & contact" hint="Empty fields use automatic text.">
          <Field label="Admission status"><input className={inputCls} value={f.profile.admissionStatus} onChange={(e) => setProfile("admissionStatus", e.target.value)} placeholder="Enquiries open" /></Field>
          <Field label="Website"><input className={inputCls} value={f.profile.website} onChange={(e) => setProfile("website", e.target.value)} placeholder="www.school.edu.in" /></Field>
          <Field label="Admission summary" className="sm:col-span-2"><textarea className={inputCls + " min-h-[90px]"} value={f.profile.admissionSummary} onChange={(e) => setProfile("admissionSummary", e.target.value)} /></Field>
          <Field label="Documents required" className="sm:col-span-2"><textarea className={inputCls + " min-h-[90px]"} value={f.profile.documents} onChange={(e) => setProfile("documents", e.target.value)} /></Field>
          <Field label="Address" className="sm:col-span-2"><input className={inputCls} value={f.profile.address} onChange={(e) => setProfile("address", e.target.value)} /></Field>
          <Field label="Email"><input type="email" className={inputCls} value={f.profile.email} onChange={(e) => setProfile("email", e.target.value)} /></Field>
        </Section>

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-extrabold text-[#0B2A47]">Photo gallery</h2>
          <div className="mt-3"><PhotoEditor photos={f.gallery} onChange={(p) => set("gallery", p)} max={12} hint="Extra photos for the profile gallery. The cover image is always shown first." /></div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-extrabold text-[#0B2A47]">FAQs about this school</h2>
          <p className="mb-4 mt-0.5 text-sm text-[#5C6A7B]">If you add any FAQ, these replace the automatic ones on the profile page.</p>
          <FaqEditor faqs={f.faqs} onChange={(x) => set("faqs", x)} suggestions={suggested(true)?.faqs} />
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-extrabold text-[#0B2A47]">Facilities</h2>
          <p className="mb-3 mt-0.5 text-sm text-[#5C6A7B]">Type a facility and press Enter, or tap a suggestion.</p>
          <div className="flex flex-wrap gap-2">
            {f.facilities.map((x) => (
              <span key={x} className="inline-flex items-center gap-1.5 rounded-full bg-[#E1F1FA] px-3 py-1 text-sm font-semibold text-[#0A5C91]">
                {x}<button type="button" aria-label={`Remove ${x}`} onClick={() => set("facilities", f.facilities.filter((y) => y !== x))} className="text-[#C8104F]">×</button>
              </span>
            ))}
          </div>
          <input className={inputCls + " mt-3"} value={facInput} placeholder="e.g. Swimming pool" onChange={(e) => setFacInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addFacility(facInput); } }} onBlur={() => addFacility(facInput)} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sugg.map((x) => <button type="button" key={x} onClick={() => addFacility(x)} className="rounded-full border border-dashed border-[#D6DDE5] px-3 py-1 text-xs font-semibold text-[#5C6A7B] transition hover:border-[#0795DC] hover:text-[#0A5C91]">+ {x}</button>)}
          </div>
        </Card>
      </div>

      {/* sidebar: visibility + live preview */}
      <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <Card className="p-5">
          <h2 className="mb-4 text-base font-extrabold text-[#0B2A47]">Visibility</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3"><span><b className="block text-sm">Live on website</b><span className="text-xs text-[#5C6A7B]">Turn off to hide without deleting</span></span><Switch checked={f.isActive} onChange={(v) => set("isActive", v)} label="Live on website" /></label>
            <label className="flex items-center justify-between gap-3"><span><b className="block text-sm">Top rated badge</b><span className="text-xs text-[#5C6A7B]">Boosts it in &quot;Recommended&quot;</span></span><Switch checked={f.topRated} onChange={(v) => set("topRated", v)} label="Top rated" /></label>
          </div>
          <div className="mt-5 flex gap-2">
            <button type="submit" disabled={saving || uploading} className={btn.primary + " flex-1"}>{saving && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} {school ? "Save changes" : "Add school"}</button>
            <Link href="/admin/schools" className={btn.ghost}>Cancel</Link>
          </div>
        </Card>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8896A6]">Live preview</p>
          <Card className="overflow-hidden">
            <div className="relative h-40 bg-gradient-to-br from-[#E1F1FA] to-[#FDE8EF]">
              {f.image ? <img src={f.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-4xl">🏫</div>}
              {f.topRated && <span className="absolute left-3 top-3 rounded-full bg-[#EC0E58] px-2.5 py-1 text-[11px] font-extrabold text-white">★ TOP RATED</span>}
              {!f.isActive && <span className="absolute right-3 top-3 rounded-full bg-[#0B2A47]/80 px-2.5 py-1 text-[11px] font-bold text-white">HIDDEN</span>}
            </div>
            <div className="p-4">
              <h3 className="font-extrabold text-[#0B2A47]">{f.name || "School name"}</h3>
              <p className="text-sm text-[#5C6A7B]">{[f.area, f.city].filter(Boolean).join(", ") || "Area, City"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
                <span className="rounded-md bg-[#E1F1FA] px-2 py-0.5 text-[#0A5C91]">{f.board}</span>
                <span className="rounded-md bg-[#F6FAFD] px-2 py-0.5 text-[#4E5A68] ring-1 ring-[#E1E7EE]">{f.type}</span>
                <span className="rounded-md bg-[#F6FAFD] px-2 py-0.5 text-[#4E5A68] ring-1 ring-[#E1E7EE]">{f.gender}</span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-lg font-extrabold text-[#0A5C91]">{f.fee ? inr(Number(f.fee)) : "₹ —"}<span className="text-xs font-medium text-[#8896A6]"> / year</span></p>
                {Number(f.reviews) > 0 && <p className="text-sm font-bold">{Number(f.rating || 0).toFixed(1)} <span className="text-[#F5A524]">★</span></p>}
              </div>
              {f.facilities.length > 0 && <p className="mt-2 truncate text-xs text-[#5C6A7B]">{f.facilities.slice(0, 4).join(" · ")}</p>}
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
