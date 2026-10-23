"use client";

// Small editors shared by the Location form and the School form.
import { useRef, useState } from "react";
import { uploadImage } from "../_lib/api";
import type { Faq } from "../_lib/types";
import { Spinner, btn, inputCls, useToast } from "./ui";

/* ---------- photos: upload or paste a link ---------- */
export function PhotoEditor({ photos, onChange, max = 6, hint }: { photos: string[]; onChange: (p: string[]) => void; max?: number; hint?: string }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    for (const f of Array.from(files).slice(0, max - photos.length)) {
      try { added.push(await uploadImage(f)); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    }
    if (added.length) { onChange([...photos, ...added].slice(0, max)); toast.success(`${added.length} photo${added.length > 1 ? "s" : ""} uploaded`); }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }
  function addUrl() {
    const u = url.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) { toast.error("Paste a full link starting with http(s)://"); return; }
    if (!photos.includes(u)) onChange([...photos, u].slice(0, max));
    setUrl("");
  }
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      {hint && <p className="mb-3 text-sm text-[#5C6A7B]">{hint}</p>}
      {photos.length > 0 && (
        <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((src, i) => (
            <li key={src} className="overflow-hidden rounded-xl border border-[#E1E7EE] bg-[#F6FAFD]">
              <div className="relative aspect-[4/3]">
                <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-[#EC0E58] px-2 py-0.5 text-[10px] font-extrabold text-white">MAIN</span>}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="flex gap-1">
                  <button type="button" aria-label="Move left" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg border border-[#D6DDE5] px-2 py-1 text-xs disabled:opacity-30">←</button>
                  <button type="button" aria-label="Move right" disabled={i === photos.length - 1} onClick={() => move(i, 1)} className="rounded-lg border border-[#D6DDE5] px-2 py-1 text-xs disabled:opacity-30">→</button>
                </span>
                <button type="button" onClick={() => onChange(photos.filter((x) => x !== src))} className="text-xs font-bold text-[#C8104F]">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {photos.length < max ? (
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={btn.ghost} disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Spinner className="h-4 w-4" /> : "⬆"} {busy ? "Uploading…" : "Upload photos"}
            </button>
            <span className="text-xs text-[#8896A6]">JPG / PNG / WebP, max 3 MB each · {photos.length}/{max}</span>
          </div>
          <div className="flex gap-2">
            <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste an image link https://…"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} aria-label="Image URL" />
            <button type="button" className={btn.ghost} onClick={addUrl}>Add</button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#8896A6]">Maximum {max} photos reached.</p>
      )}
    </div>
  );
}

/* ---------- FAQs: add / edit / remove / reorder ---------- */
export function FaqEditor({ faqs, onChange, suggestions }: { faqs: Faq[]; onChange: (f: Faq[]) => void; suggestions?: Faq[] }) {
  const set = (i: number, patch: Partial<Faq>) => onChange(faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= faqs.length) return;
    const next = [...faqs];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      {faqs.length === 0 && <p className="mb-3 rounded-xl border border-dashed border-[#C9D3DE] bg-[#F6FAFD] p-4 text-sm text-[#5C6A7B]">No FAQs yet.</p>}
      <ol className="space-y-4">
        {faqs.map((f, i) => (
          <li key={i} className="rounded-xl border border-[#E1E7EE] bg-[#F6FAFD] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wide text-[#0A5C91]">FAQ {i + 1}</span>
              <span className="flex gap-1">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg border border-[#D6DDE5] bg-white px-2 py-1 text-xs disabled:opacity-30">↑</button>
                <button type="button" aria-label="Move down" disabled={i === faqs.length - 1} onClick={() => move(i, 1)} className="rounded-lg border border-[#D6DDE5] bg-white px-2 py-1 text-xs disabled:opacity-30">↓</button>
                <button type="button" onClick={() => onChange(faqs.filter((_, j) => j !== i))} className="rounded-lg border border-[#F5C2D3] bg-white px-2 py-1 text-xs font-bold text-[#C8104F]">Delete</button>
              </span>
            </div>
            <input className={inputCls} value={f.q} onChange={(e) => set(i, { q: e.target.value })} placeholder="Question" aria-label={`Question ${i + 1}`} />
            <textarea className={inputCls + " mt-2 min-h-[84px]"} value={f.a} onChange={(e) => set(i, { a: e.target.value })} placeholder="Answer" aria-label={`Answer ${i + 1}`} />
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btn.ghost} onClick={() => onChange([...faqs, { q: "", a: "" }])}>+ Add FAQ</button>
        {suggestions && suggestions.length > 0 && (
          <button type="button" className={btn.ghost}
            onClick={() => onChange([...faqs, ...suggestions.filter((s) => !faqs.some((f) => f.q === s.q))])}>
            ✨ Add suggested FAQs
          </button>
        )}
      </div>
    </div>
  );
}
