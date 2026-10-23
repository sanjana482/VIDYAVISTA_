"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { del, put } from "../_lib/api";
import type { AdminLocation } from "../_lib/types";
import { Card, ConfirmDialog, Field, Spinner, Switch, btn, inputCls, useToast } from "./ui";
import { FaqEditor, PhotoEditor } from "./editors";

const publicPath = (l: Pick<AdminLocation, "kind" | "slug">) => (l.kind === "state" ? `/schools-in/state/${l.slug}` : `/schools-in/${l.slug}`);

export default function LocationForm({ initial, saved, onSaved }: { initial: AdminLocation; saved: boolean; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<AdminLocation>(initial);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof AdminLocation>(k: K, v: AdminLocation[K]) => setF((s) => ({ ...s, [k]: v }));

  const n = f.name;
  const suggest = () => {
    setF((s) => ({
      ...s,
      title: s.title || `Best Schools in ${n} 2027-28`,
      metaTitle: s.metaTitle || `Best Schools in ${n} 2027-28 – Fees, Boards & Reviews | VidyaVista`,
      description:
        s.description ||
        `Looking for the right school in ${n}? Compare boarding, day and day-cum-boarding schools across CBSE, ICSE, IB, Cambridge and State Board. See annual fees, facilities, admission process and parent reviews, then enquire directly for 2027-28.`,
    }));
  };
  const suggestedFaqs = [
    { q: `Which are the best schools in ${n}?`, a: `VidyaVista lists top-rated day, boarding and day-cum-boarding schools in ${n}. Compare fees, boards, facilities and parent reviews to shortlist the right fit.` },
    { q: `What is the average school fee in ${n}?`, a: `Fees in ${n} vary by board, facilities and school type. Boarding schools usually cost more than day schools. Check each school profile for class-wise fees and confirm the final fee letter with the school.` },
    { q: `How do I apply for admission in ${n} for 2027-28?`, a: `Pick a school from the list, send an enquiry from its profile page and the admissions team will share the process, dates and documents required.` },
  ];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await put(`/locations/${f.kind}/${f.slug}`, f);
      toast.success("Saved. The website updates within a minute.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }
  async function removeContent() {
    setBusy(true);
    try { await del(`/locations/${f.kind}/${f.slug}`); toast.success("Content removed. Default text will be used."); setConfirm(false); onSaved(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not delete"); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[1fr_340px]">
      {error && <div role="alert" className="rounded-2xl border border-[#F5C2D3] bg-[#FDE8EF] p-4 text-sm font-semibold text-[#C8104F] xl:col-span-2">⚠️ {error}</div>}

      <div className="space-y-6">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#0B2A47]">Title &amp; description</h2>
              <p className="mt-0.5 text-sm text-[#5C6A7B]">Shown at the top of the schools page when a visitor selects {n}, and on its SEO page.</p>
            </div>
            <button type="button" className={btn.ghost} onClick={suggest}>✨ Fill suggested text</button>
          </div>
          <div className="mt-4 grid gap-4">
            <Field label="Page title (H1)" hint={`Default: Best Schools in ${n} 2027-28`}>
              <input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={`Best Schools in ${n} 2027-28`} />
            </Field>
            <Field label="Description" hint="2-4 sentences. Also used as the Google description.">
              <textarea className={inputCls + " min-h-[130px]"} value={f.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Browser / Google title (optional)" hint="Leave empty to use the page title.">
              <input className={inputCls} value={f.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-extrabold text-[#0B2A47]">Photos of {n}</h2>
          <div className="mt-3">
            <PhotoEditor photos={f.photos} onChange={(p) => set("photos", p)} max={3}
              hint="The first photo is the large one. Up to 3 are shown beside the title. Empty = default school photos." />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-extrabold text-[#0B2A47]">FAQs for {n}</h2>
          <p className="mb-4 mt-0.5 text-sm text-[#5C6A7B]">Shown above the general FAQs on the schools page, and added to Google as FAQ rich results.</p>
          <FaqEditor faqs={f.faqs} onChange={(x) => set("faqs", x)} suggestions={suggestedFaqs} />
        </Card>
      </div>

      <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <Card className="p-5">
          <h2 className="mb-4 text-base font-extrabold text-[#0B2A47]">Publish</h2>
          <label className="flex items-center justify-between gap-3">
            <span><b className="block text-sm">Use this content</b><span className="text-xs text-[#5C6A7B]">Off = default text is shown</span></span>
            <Switch checked={f.isActive} onChange={(v) => set("isActive", v)} label="Use this content" />
          </label>
          <div className="mt-5 flex gap-2">
            <button type="submit" disabled={busy} className={btn.primary + " flex-1"}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Save</button>
            <Link href="/admin/locations" className={btn.ghost}>Back</Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={publicPath(f)} target="_blank" rel="noreferrer" className={btn.ghost + " flex-1"}>View page ↗</a>
            {saved && <button type="button" className={btn.danger} onClick={() => setConfirm(true)}>Remove content</button>}
          </div>
        </Card>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8896A6]">Live preview</p>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-3 gap-1 bg-gradient-to-br from-[#E1F1FA] to-[#FDE8EF] p-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-lg bg-white/60">
                  {f.photos[i] ? <img src={f.photos[i]} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl">🏫</div>}
                </div>
              ))}
            </div>
            <div className="p-4">
              <h3 className="font-extrabold text-[#0B2A47]">{f.title || `Best Schools in ${n} 2027-28`}</h3>
              <p className="mt-2 line-clamp-5 text-sm text-[#5C6A7B]">{f.description || "Default description is generated from the schools listed."}</p>
              <p className="mt-3 text-xs font-bold text-[#0A5C91]">{f.faqs.filter((x) => x.q && x.a).length} FAQs · {f.photos.length} photos</p>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog open={confirm} title="Remove saved content?" message={`${n} will go back to the automatic title and description.`} confirmLabel="Remove" busy={busy} onConfirm={removeContent} onCancel={() => setConfirm(false)} />
    </form>
  );
}
