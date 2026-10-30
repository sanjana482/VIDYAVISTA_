"use client";

// Class-wise fee components for one school: add, rename, remove components, per class and per session.
import { useMemo, useState } from "react";
import { classList, feeSlabs } from "../../data/profile";
import type { FeeFreq, School, SchoolFeeSlab } from "../../data/schools";
import { btn, cx, inputCls, useToast } from "./ui";

const SESSIONS = ["2027-28", "2026-27"] as const;
const FREQS: FeeFreq[] = ["One-time", "Monthly", "Annually"];
const SUGGESTED = ["Admission fee", "Registration fee", "Tuition fee", "Annual charges", "Development fee", "Technology & e-learning fee", "Activity & sports fee", "Transport fee", "Hostel fee", "Meals fee", "Uniform & books", "Security deposit"];
const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const perYear = (r: { freq: FeeFreq; amount: number }) => (r.freq === "Monthly" ? r.amount * 12 : r.amount);

type Row = SchoolFeeSlab["rows"][number];

export default function FeeEditor({
  grades, fee, schoolId, slabs, onChange,
}: { grades: string; fee: string; schoolId: number; slabs: SchoolFeeSlab[]; onChange: (s: SchoolFeeSlab[]) => void }) {
  const toast = useToast();
  const [session, setSession] = useState<(typeof SESSIONS)[number]>("2027-28");
  const [cls, setCls] = useState("");

  // the shim lets us reuse the website's own class list + auto split
  const shim = useMemo(() => ({ id: schoolId, grades, fee: Number(fee) || 0 }) as unknown as School, [grades, fee, schoolId]);
  const classes = useMemo(() => { try { return classList(shim); } catch { return []; } }, [shim]);
  const current = classes.find((c) => c.cls === cls) ?? classes[0];

  const find = (s: string, c: string) => slabs.find((x) => x.session === s && x.cls === c);
  const rowsOf = (c: string) => find(session, c)?.rows ?? [];
  const setRows = (c: string, stage: string, rows: Row[]) => {
    const rest = slabs.filter((x) => !(x.session === session && x.cls === c));
    onChange(rows.length ? [...rest, { session, cls: c, stage, rows }] : rest);
  };

  function autoRows(c: string): Row[] {
    try { return feeSlabs(shim, session).find((x) => x.cls === c)?.rows.map((r) => ({ label: r.label, freq: r.freq, amount: r.amount })) ?? []; }
    catch { return []; }
  }

  if (!classes.length) {
    return <p className="rounded-xl border border-dashed border-[#C9D3DE] bg-[#F6FAFD] p-4 text-sm text-[#5C6A7B]">Enter valid <b>Grades</b> (e.g. “Nursery – XII”) and the <b>Annual tuition fee</b> above to edit class-wise fees.</p>;
  }

  const rows = current ? rowsOf(current.cls) : [];
  const total = rows.reduce((t, r) => t + perYear(r), 0);
  const patch = (i: number, p: Partial<Row>) => current && setRows(current.cls, current.stage, rows.map((r, j) => (j === i ? { ...r, ...p } : r)));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-[#E9EEF4] p-1" role="tablist" aria-label="Session">
          {SESSIONS.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={session === s} onClick={() => setSession(s)}
              className={cx("rounded-lg px-4 py-2 text-sm font-extrabold", session === s ? "bg-[#0B2A47] text-white" : "text-[#5C6A7B]")}>{s}</button>
          ))}
        </div>
        <button type="button" className={btn.ghost} onClick={() => {
          let next = slabs.filter((x) => x.session !== session);
          classes.forEach((c) => { next = [...next, { session, cls: c.cls, stage: c.stage, rows: autoRows(c.cls) }]; });
          onChange(next);
          toast.success(`Suggested split filled for all classes (${session}). Now edit the amounts.`);
        }}>✨ Fill all classes with suggested split</button>
      </div>

      {/* class chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {classes.map((c) => {
          const has = rowsOf(c.cls).length > 0;
          return (
            <button key={c.cls} type="button" onClick={() => setCls(c.cls)}
              className={cx("rounded-full border px-3.5 py-1.5 text-sm font-bold transition",
                current?.cls === c.cls ? "border-[#0795DC] bg-[#E1F1FA] text-[#0A5C91]" : "border-[#D6DDE5] bg-white text-[#4E5A68] hover:border-[#0795DC]")}>
              {c.cls}{has && <span className="ml-1.5 text-emerald-600">✓</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[#8896A6]">✓ = custom components saved. Classes without ✓ show the automatic sample split on the website.</p>

      {current && (
        <div className="mt-5 rounded-2xl border border-[#E1E7EE] bg-[#F6FAFD] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-extrabold text-[#0B2A47]">{current.cls} <span className="text-sm font-medium text-[#8896A6]">· {current.stage} · {session}</span></h3>
            <p className="text-sm font-bold text-[#0A5C91]">Total per year: {inr(total)}</p>
          </div>

          {rows.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-[#C9D3DE] bg-white p-4 text-sm text-[#5C6A7B]">No custom components for this class. Start from the suggested split or add your own.</p>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="hidden grid-cols-[1.6fr_1fr_1fr_auto] gap-2 px-1 text-[11px] font-extrabold uppercase tracking-wide text-[#8896A6] sm:grid"><span>Component</span><span>Frequency</span><span>Amount (₹)</span><span className="w-9" /></div>
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1.6fr_1fr_1fr_auto]">
                  <input list="vv-fee-labels" className={inputCls + " col-span-2 sm:col-span-1"} value={r.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder="e.g. Transport fee" aria-label="Component name" />
                  <select className={inputCls} value={r.freq} onChange={(e) => patch(i, { freq: e.target.value as FeeFreq })} aria-label="Frequency">{FREQS.map((f) => <option key={f}>{f}</option>)}</select>
                  <input type="number" min={0} className={inputCls} value={r.amount || ""} onChange={(e) => patch(i, { amount: Number(e.target.value) || 0 })} placeholder="0" aria-label="Amount" />
                  <button type="button" aria-label="Remove component" onClick={() => setRows(current.cls, current.stage, rows.filter((_, j) => j !== i))} className="h-10 w-9 rounded-xl border border-[#F5C2D3] bg-white font-bold text-[#C8104F]">×</button>
                </div>
              ))}
            </div>
          )}
          <datalist id="vv-fee-labels">{SUGGESTED.map((x) => <option key={x} value={x} />)}</datalist>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={btn.ghost} onClick={() => setRows(current.cls, current.stage, [...rows, { label: "", freq: "Annually", amount: 0 }])}>+ Add component</button>
            {rows.length === 0 && <button type="button" className={btn.ghost} onClick={() => setRows(current.cls, current.stage, autoRows(current.cls))}>✨ Start from suggested split</button>}
            {rows.length > 0 && (
              <>
                <button type="button" className={btn.ghost} onClick={() => {
                  let next = slabs.filter((x) => x.session !== session || x.cls === current.cls);
                  classes.forEach((c) => { if (c.cls !== current.cls) next = [...next, { session, cls: c.cls, stage: c.stage, rows: rows.map((r) => ({ ...r })) }]; });
                  onChange(next);
                  toast.success("Components copied to every class. Adjust each class amount as needed.");
                }}>⧉ Copy to all classes</button>
                <button type="button" className={btn.danger} onClick={() => setRows(current.cls, current.stage, [])}>Reset to automatic</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
