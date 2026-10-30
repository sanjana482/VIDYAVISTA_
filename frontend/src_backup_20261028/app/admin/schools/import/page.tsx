"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { post } from "../../_lib/api";
import { parseCsv, toCsv } from "../../_lib/csv";
import { BOARDS, GENDERS, TYPES } from "../../_lib/constants";
import { Card, PageHeader, Spinner, btn, cx, useToast } from "../../_components/ui";

const COLUMNS = ["name", "area", "city", "state", "board", "grades", "type", "gender", "fee", "rating", "reviews", "photos", "phone", "image", "facilities", "topRated", "isActive"] as const;
type Col = (typeof COLUMNS)[number];
const REQUIRED: Col[] = ["name", "area", "city", "state", "board", "grades", "type", "fee"];

// header spellings people commonly use -> our field names
const ALIAS: Record<string, Col> = {
  "school name": "name", school: "name", locality: "area", "area / locality": "area", town: "city", "school type": "type",
  "annual fee": "fee", "annual fees": "fee", fees: "fee", "fee (inr)": "fee", mobile: "phone", "phone number": "phone",
  photo: "image", "image url": "image", facility: "facilities", "top rated": "topRated", live: "isActive", active: "isActive", classes: "grades",
};
const norm = (h: string) => h.trim().toLowerCase().replace(/_/g, " ");
const toField = (h: string): Col | null => {
  const n = norm(h);
  const direct = COLUMNS.find((c) => c.toLowerCase() === n.replace(/\s/g, ""));
  return direct || ALIAS[n] || null;
};
const ci = (list: readonly string[], v: string) => list.find((x) => x.toLowerCase() === v.trim().toLowerCase());

type Row = { line: number; data: Record<string, unknown>; errors: string[] };
type Result = { created: number; skipped: { row: number; message: string }[]; errors: { row: number; message: string }[] };

const SAMPLE = [
  [...COLUMNS] as string[],
  ["Maplewood Academy", "Whitefield", "Bengaluru", "Karnataka", "CBSE", "Nursery – XII", "Day School", "Co-ed", "145000", "4.5", "120", "8", "+919800000001", "https://example.com/photo.jpg", "Transport|Sports|Library", "yes", "yes"],
];

export default function ImportSchools() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const valid = useMemo(() => rows.filter((r) => r.errors.length === 0), [rows]);

  function template() {
    const url = URL.createObjectURL(new Blob(["\uFEFF" + toCsv(SAMPLE)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "vidyavista-schools-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file?: File) {
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    const table = parseCsv(await file.text());
    if (table.length < 2) { setRows([]); toast.error("The file needs a header row and at least one school"); return; }

    const map = table[0].map(toField);
    setUnknown(table[0].filter((_, i) => !map[i] && table[0][i].trim()));
    const missingCols = REQUIRED.filter((c) => !map.includes(c));

    const parsed: Row[] = table.slice(1).map((cells, i) => {
      const data: Record<string, unknown> = {};
      map.forEach((field, idx) => { if (field && cells[idx] !== undefined) data[field] = cells[idx].trim(); });
      const errors: string[] = missingCols.map((c) => `Column "${c}" is missing`);
      if (!missingCols.length) {
        REQUIRED.forEach((c) => { if (!String(data[c] ?? "").trim()) errors.push(`${c} is empty`); });
        const board = ci(BOARDS, String(data.board || "")); if (data.board && !board) errors.push(`board must be one of ${BOARDS.join(", ")}`); else if (board) data.board = board;
        const type = ci(TYPES, String(data.type || "")); if (data.type && !type) errors.push(`type must be one of ${TYPES.join(", ")}`); else if (type) data.type = type;
        if (data.gender) { const g = ci(GENDERS, String(data.gender)); if (!g) errors.push(`gender must be one of ${GENDERS.join(", ")}`); else data.gender = g; }
        if (data.fee !== undefined && (isNaN(Number(String(data.fee).replace(/[,₹\s]/g, ""))) || Number(String(data.fee).replace(/[,₹\s]/g, "")) < 0)) errors.push("fee must be a number");
        else if (data.fee) data.fee = Number(String(data.fee).replace(/[,₹\s]/g, ""));
        if (data.rating && (isNaN(Number(data.rating)) || Number(data.rating) > 5)) errors.push("rating must be 0-5");
        ["topRated", "isActive"].forEach((k) => { if (data[k] !== undefined && data[k] !== "") data[k] = /^(1|true|yes|y)$/i.test(String(data[k])); else delete data[k]; });
      }
      return { line: i + 2, data, errors };
    });
    setRows(parsed);
  }

  async function run() {
    setBusy(true);
    try {
      const r = await post<Result>("/schools/import", { rows: valid.map((v) => v.data) });
      setResult(r);
      setRows([]);
      toast.success(`${r.created} school${r.created === 1 ? "" : "s"} imported`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally { setBusy(false); }
  }

  return (
    <>
      <Link href="/admin/schools" className="mb-3 inline-block text-sm font-bold text-[#0A5C91] hover:underline">← Back to schools</Link>
      <PageHeader title="Bulk import" subtitle="Add many schools at once from an Excel / Google Sheet saved as CSV." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <ol className="space-y-5">
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0795DC] font-extrabold text-white">1</span>
              <div><p className="font-bold">Download the template</p><p className="mb-3 text-sm text-[#5C6A7B]">Fill one school per row. Separate facilities with <code className="rounded bg-[#F6FAFD] px-1">|</code> e.g. Transport|Sports|Library.</p><button onClick={template} className={btn.ghost}>⬇ Download CSV template</button></div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0795DC] font-extrabold text-white">2</span>
              <div className="flex-1">
                <p className="font-bold">Upload your file</p><p className="mb-3 text-sm text-[#5C6A7B]">In Excel: File → Save As → CSV (UTF-8). Up to 500 rows.</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-[#B9D7EA] bg-[#F6FAFD] px-4 py-8 text-center transition hover:border-[#0795DC] hover:bg-[#E1F1FA]">
                  <span className="text-3xl">📄</span>
                  <span className="mt-2 font-bold text-[#0A5C91]">{fileName || "Click to choose a CSV file"}</span>
                </button>
              </div>
            </li>
          </ol>
        </Card>
        <Card className="p-6">
          <h2 className="font-extrabold">Allowed values</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div><dt className="font-bold text-[#0A5C91]">board</dt><dd className="text-[#5C6A7B]">{BOARDS.join(", ")}</dd></div>
            <div><dt className="font-bold text-[#0A5C91]">type</dt><dd className="text-[#5C6A7B]">{TYPES.join(", ")}</dd></div>
            <div><dt className="font-bold text-[#0A5C91]">gender</dt><dd className="text-[#5C6A7B]">{GENDERS.join(", ")} (default Co-ed)</dd></div>
            <div><dt className="font-bold text-[#0A5C91]">required</dt><dd className="text-[#5C6A7B]">{REQUIRED.join(", ")}</dd></div>
            <div><dt className="font-bold text-[#0A5C91]">topRated / isActive</dt><dd className="text-[#5C6A7B]">yes / no</dd></div>
          </dl>
        </Card>
      </div>

      {unknown.length > 0 && <p className="mt-4 rounded-xl bg-[#FFF6E5] px-4 py-3 text-sm font-semibold text-[#8A5A00]">Ignored unknown columns: {unknown.join(", ")}</p>}

      {rows.length > 0 && (
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E7EE] p-4">
            <p className="text-sm"><b className="text-emerald-700">{valid.length} ready</b> · <b className={rows.length - valid.length ? "text-[#C8104F]" : "text-[#8896A6]"}>{rows.length - valid.length} with errors</b> (errors are skipped)</p>
            <button className={btn.primary} disabled={busy || valid.length === 0 || rows.length > 500} onClick={run}>
              {busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Import {valid.length} school{valid.length === 1 ? "" : "s"}
            </button>
          </div>
          {rows.length > 500 && <p className="p-4 text-sm font-semibold text-[#C8104F]">Please split the file: maximum 500 rows at a time.</p>}
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-[#8896A6]"><tr><th className="px-4 py-2.5">Row</th><th className="px-2 py-2.5">School</th><th className="px-2 py-2.5">City</th><th className="px-2 py-2.5">Board</th><th className="px-2 py-2.5">Fee</th><th className="px-4 py-2.5">Status</th></tr></thead>
              <tbody className="divide-y divide-[#E1E7EE]">
                {rows.map((r) => (
                  <tr key={r.line} className={cx(r.errors.length > 0 && "bg-[#FDE8EF]/50")}>
                    <td className="px-4 py-2.5 text-[#8896A6]">{r.line}</td>
                    <td className="px-2 py-2.5 font-semibold">{String(r.data.name || "—")}<span className="block text-xs font-normal text-[#5C6A7B]">{String(r.data.area || "")}</span></td>
                    <td className="px-2 py-2.5">{String(r.data.city || "—")}</td><td className="px-2 py-2.5">{String(r.data.board || "—")}</td><td className="px-2 py-2.5">{String(r.data.fee || "—")}</td>
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
              {[...result.skipped.map((x) => ({ ...x, k: "skipped" })), ...result.errors.map((x) => ({ ...x, k: "error" }))].map((x, i) => <li key={i}>Row {x.row}: {x.message}</li>)}
            </ul>
          )}
          <Link href="/admin/schools" className={btn.primary + " mt-5"}>View schools →</Link>
        </Card>
      )}
    </>
  );
}
