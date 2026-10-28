"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { post } from "../../_lib/api";
import { parseCsv, toCsv } from "../../_lib/csv";
import { inr } from "../../_lib/constants";
import { Card, PageHeader, Spinner, btn, cx, useToast } from "../../_components/ui";

/* ------------------------------------------------------------------
   Sheet format
   One school per row. Only `name` and `city` are compulsory.
   Class-wise fees use columns like "Class 5 - annual", "LKG - one-time".
   Columns called source_site / source_url are dropped here and never sent,
   saved or shown.
------------------------------------------------------------------- */
const BASE_COLUMNS = [
  "name", "type", "boarding_type", "city", "state", "area", "locality", "pincode", "boards", "classes", "gender",
  "medium", "academic_session", "student_teacher_ratio", "campus_size", "founded", "fee_min", "fee_max",
  "latest_fee_session", "current_admission_session", "address", "lat", "lng", "phone", "email", "website", "social",
  "logo", "images", "facilities", "facility_groups", "hostel", "languages", "food_options", "verified",
  "page_last_updated", "affiliation_no", "school_timing", "student_count", "teacher_count", "rating", "reviews",
  "description", "about",
];
const FEE_CLASSES = ["LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const FEE_KINDS = ["monthly", "annual", "one-time", "first year"];
const FEE_COLUMNS = FEE_CLASSES.flatMap((c) => FEE_KINDS.map((k) => `${c} - ${k}`));
const TEMPLATE_COLUMNS = [...BASE_COLUMNS, ...FEE_COLUMNS];

const OPTIONAL_EXTRA = ["is_active", "top_rated"];
const KNOWN = new Set([...TEMPLATE_COLUMNS, ...OPTIONAL_EXTRA].map((c) => c.toLowerCase()));
const FEE_RE = /^(toddler|nursery|lkg|ukg|(?:class\s*)?\d{1,2})\s*[-–:]\s*(monthly|annual|annually|one[\s-]?time|first[\s-]?year)$/i;
const HIDDEN_RE = /^source[\s_]?(site|url)$/i; // never imported, never shown
const ALIASES: Record<string, string> = {
  "school name": "name", school: "name", town: "city", board: "boards", "school type": "type", grades: "classes",
  mobile: "phone", "phone number": "phone", image: "images", photo: "images", photos: "images", established: "founded",
};

const clean = (h: string) => h.replace(/^\uFEFF/, "").trim();
const canon = (h: string) => {
  const n = clean(h).toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
  if (FEE_RE.test(n)) return n;
  return (ALIASES[n] ?? n).replace(/ /g, "_");
};
const isKnown = (h: string) => {
  const c = canon(h);
  return KNOWN.has(c) || FEE_RE.test(c);
};

const SAMPLE_ROW: Record<string, string> = {
  name: "Maplewood Residential School", type: "Boarding School", boarding_type: "Full Boarding", city: "Dehradun",
  state: "Uttarakhand", area: "Rajpur Road", locality: "Rajpur", pincode: "248009", boards: "CBSE, Cambridge",
  classes: "5 - 12", gender: "Co-ed", medium: "English", academic_session: "April to March",
  student_teacher_ratio: "15:1", campus_size: "20 acres", founded: "1998", fee_min: "450000", fee_max: "520000",
  latest_fee_session: "2026-2027", address: "Rajpur Road, Dehradun, Uttarakhand - 248009", phone: "+91-9800000001",
  email: "admissions@maplewood.example", website: "https://www.maplewood.example",
  images: "https://example.com/cover.jpg, https://example.com/photo-2.jpg",
  facilities: "Transportation, Boys Hostel, Girls Hostel, Library, Playground", hostel: "True",
  about: "Write a few lines about the school here.", "Class 5 - annual": "450000", "Class 5 - one-time": "60000",
};

type Row = { line: number; data: Record<string, string>; errors: string[] };
type Item = { row: number; message: string };
type Result = { created: number; skipped: Item[]; errors: Item[] };

const CHUNK = 50;
const MAX_ROWS = 500;

const pick = (data: Record<string, string>, key: string) => Object.entries(data).find(([h]) => canon(h) === key)?.[1] ?? "";

export default function ImportSchools() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const valid = useMemo(() => rows.filter((r) => r.errors.length === 0), [rows]);

  function template() {
    const csv = toCsv([TEMPLATE_COLUMNS, TEMPLATE_COLUMNS.map((c) => SAMPLE_ROW[c] ?? "")]);
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "vidyavista-schools-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file?: File) {
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    const table = parseCsv(await file.text());
    if (table.length < 2) {
      setRows([]);
      setUnknown([]);
      toast.error("The file needs a header row and at least one school");
      return;
    }

    const headers = table[0].map(clean);
    const keep = headers.map((h) => !!h && !HIDDEN_RE.test(h)); // source_* columns are dropped here
    setUnknown(headers.filter((h, i) => keep[i] && !isKnown(h)));

    const parsed: Row[] = table.slice(1).map((cells, i) => {
      const data: Record<string, string> = {};
      headers.forEach((h, idx) => {
        if (keep[idx] && cells[idx] !== undefined && cells[idx].trim() !== "") data[h] = cells[idx].trim();
      });
      const errors: string[] = [];
      if (!pick(data, "name")) errors.push("name is empty");
      if (!pick(data, "city")) errors.push("city is empty");
      return { line: i + 2, data, errors };
    });
    setRows(parsed);
  }

  async function run() {
    setBusy(true);
    setDone(0);
    const total: Result = { created: 0, skipped: [], errors: [] };
    try {
      for (let i = 0; i < valid.length; i += CHUNK) {
        const part = valid.slice(i, i + CHUNK);
        const r = await post<Result>("/schools/import", { rows: part.map((p) => p.data) });
        const lineOf = (n: number) => part[n - 2]?.line ?? n; // server row -> row number in your file
        total.created += r.created;
        total.skipped.push(...r.skipped.map((x) => ({ ...x, row: lineOf(x.row) })));
        total.errors.push(...r.errors.map((x) => ({ ...x, row: lineOf(x.row) })));
        setDone(Math.min(i + CHUNK, valid.length));
      }
      setRows([]);
      setFileName("");
      toast.success(`${total.created} school${total.created === 1 ? "" : "s"} imported`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setResult(total);
      setBusy(false);
    }
  }

  const feeText = (r: Row) => {
    const num = (k: string) => Number(pick(r.data, k).replace(/[,₹\s]/g, "")) || 0;
    const a = num("fee_min");
    const b = num("fee_max");
    if (!a && !b) return "—";
    return a && b && a !== b ? `${inr(a)} – ${inr(b)}` : inr(a || b);
  };

  return (
    <>
      <Link href="/admin/schools" className="mb-3 inline-block text-sm font-bold text-[#0A5C91] hover:underline">← Back to schools</Link>
      <PageHeader title="Bulk import" subtitle="Add many schools at once from a CSV sheet. Photos, fees, facilities and contact details come along." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <ol className="space-y-5">
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0795DC] font-extrabold text-white">1</span>
              <div>
                <p className="font-bold">Download the template</p>
                <p className="mb-3 text-sm text-[#5C6A7B]">One school per row. Only <b>name</b> and <b>city</b> are compulsory, every other column is optional. A sheet that already uses these column names works as it is.</p>
                <button onClick={template} className={btn.ghost}>⬇ Download CSV template</button>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0795DC] font-extrabold text-white">2</span>
              <div className="flex-1">
                <p className="font-bold">Upload your file</p>
                <p className="mb-3 text-sm text-[#5C6A7B]">In Excel: File → Save As → CSV UTF-8. Up to {MAX_ROWS} schools at a time.</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
                <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-[#B9D7EA] bg-[#F6FAFD] px-4 py-8 text-center transition hover:border-[#0795DC] hover:bg-[#E1F1FA] disabled:opacity-60">
                  <span className="text-3xl">📄</span>
                  <span className="mt-2 font-bold text-[#0A5C91]">{fileName || "Click to choose a CSV file"}</span>
                </button>
              </div>
            </li>
          </ol>
        </Card>

        <Card className="p-6">
          <h2 className="font-extrabold">How the sheet is read</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div><dt className="font-bold text-[#0A5C91]">boards</dt><dd className="text-[#5C6A7B]">CBSE, ICSE, IB, Cambridge, State Board, NIOS. For two boards write <code className="rounded bg-[#F6FAFD] px-1">CBSE, Cambridge</code>.</dd></div>
            <div><dt className="font-bold text-[#0A5C91]">classes</dt><dd className="text-[#5C6A7B]">Like <code className="rounded bg-[#F6FAFD] px-1">5 - 12</code> or <code className="rounded bg-[#F6FAFD] px-1">Nursery - 12</code>.</dd></div>
            <div><dt className="font-bold text-[#0A5C91]">images / facilities</dt><dd className="text-[#5C6A7B]">Separate with commas. The first image becomes the cover, the rest go to the gallery.</dd></div>
            <div><dt className="font-bold text-[#0A5C91]">Class-wise fees</dt><dd className="text-[#5C6A7B]">Columns like <code className="rounded bg-[#F6FAFD] px-1">Class 5 - annual</code> and <code className="rounded bg-[#F6FAFD] px-1">Class 5 - one-time</code>. “first year” is a total, so it is skipped.</dd></div>
            <div><dt className="font-bold text-[#0A5C91]">Duplicates</dt><dd className="text-[#5C6A7B]">A school with the same name and city is skipped, so uploading a file twice is safe.</dd></div>
          </dl>
        </Card>
      </div>

      {unknown.length > 0 && <p className="mt-4 rounded-xl bg-[#FFF6E5] px-4 py-3 text-sm font-semibold text-[#8A5A00]">Ignored unknown columns: {unknown.join(", ")}</p>}

      {rows.length > 0 && (
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E7EE] p-4">
            <p className="text-sm"><b className="text-emerald-700">{valid.length} ready</b> · <b className={rows.length - valid.length ? "text-[#C8104F]" : "text-[#8896A6]"}>{rows.length - valid.length} with errors</b> (rows with errors are skipped)</p>
            <button className={btn.primary} disabled={busy || valid.length === 0 || rows.length > MAX_ROWS} onClick={run}>
              {busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
              {busy ? `Importing ${done}/${valid.length}…` : `Import ${valid.length} school${valid.length === 1 ? "" : "s"}`}
            </button>
          </div>
          {busy && <div className="h-1.5 bg-[#E1F1FA]"><div className="h-full bg-[#0795DC] transition-all" style={{ width: `${(done / Math.max(1, valid.length)) * 100}%` }} /></div>}
          {rows.length > MAX_ROWS && <p className="p-4 text-sm font-semibold text-[#C8104F]">Please split the file: maximum {MAX_ROWS} rows at a time.</p>}
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-[#8896A6]">
                <tr><th className="px-4 py-2.5">Row</th><th className="px-2 py-2.5">School</th><th className="px-2 py-2.5">City / State</th><th className="px-2 py-2.5">Board</th><th className="px-2 py-2.5">Type</th><th className="px-2 py-2.5">Classes</th><th className="px-2 py-2.5">Yearly fee</th><th className="px-4 py-2.5">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-[#E1E7EE]">
                {rows.map((r) => (
                  <tr key={r.line} className={cx(r.errors.length > 0 && "bg-[#FDE8EF]/50")}>
                    <td className="px-4 py-2.5 text-[#8896A6]">{r.line}</td>
                    <td className="px-2 py-2.5 font-semibold">{pick(r.data, "name") || "—"}<span className="block text-xs font-normal text-[#5C6A7B]">{pick(r.data, "locality") || pick(r.data, "area")}</span></td>
                    <td className="px-2 py-2.5">{pick(r.data, "city") || "—"}<span className="block text-xs text-[#5C6A7B]">{pick(r.data, "state")}</span></td>
                    <td className="px-2 py-2.5">{pick(r.data, "boards") || "—"}</td>
                    <td className="px-2 py-2.5">{pick(r.data, "type") || "—"}<span className="block text-xs text-[#5C6A7B]">{pick(r.data, "boarding_type")}</span></td>
                    <td className="px-2 py-2.5">{pick(r.data, "classes") || "—"}</td>
                    <td className="px-2 py-2.5">{feeText(r)}</td>
                    <td className="px-4 py-2.5">{r.errors.length ? <span className="text-xs font-semibold text-[#C8104F]">{r.errors.join("; ")}</span> : <span className="text-xs font-bold text-emerald-700">✓ OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {result && (
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-extrabold">Import finished</h2>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="rounded-xl bg-emerald-50 px-4 py-2 font-bold text-emerald-700">{result.created} added</span>
            <span className="rounded-xl bg-[#E5EDF2] px-4 py-2 font-bold text-[#0B2A47]">{result.skipped.length} duplicates skipped</span>
            <span className="rounded-xl bg-[#FDE8EF] px-4 py-2 font-bold text-[#C8104F]">{result.errors.length} failed</span>
          </div>
          {[...result.skipped, ...result.errors].length > 0 && (
            <ul className="mt-4 max-h-48 space-y-1 overflow-auto text-sm text-[#5C6A7B]">
              {[...result.skipped, ...result.errors].map((x, i) => <li key={i}>Row {x.row}: {x.message}</li>)}
            </ul>
          )}
          <Link href="/admin/schools" className={btn.primary + " mt-5"}>View schools →</Link>
        </Card>
      )}
    </>
  );
}
