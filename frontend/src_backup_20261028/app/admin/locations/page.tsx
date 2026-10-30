"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "../_lib/api";
import type { LocationRow } from "../_lib/types";
import { Card, EmptyState, ErrorBox, PageHeader, PageLoader, cx, inputCls } from "../_components/ui";

const TABS = [["all", "All"], ["state", "States"], ["city", "Cities"]] as const;

export default function Locations() {
  const [rows, setRows] = useState<LocationRow[] | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("all");
  const [q, setQ] = useState("");

  const load = () => { setErr(""); api<{ data: LocationRow[] }>("/locations").then((r) => setRows(r.data)).catch((e) => setErr(e.message)); };
  useEffect(load, []);

  const list = useMemo(
    () => (rows ?? []).filter((r) => (tab === "all" || r.kind === tab) && (!q.trim() || `${r.name} ${r.state}`.toLowerCase().includes(q.trim().toLowerCase()))),
    [rows, tab, q]
  );

  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!rows) return <PageLoader />;

  return (
    <>
      <PageHeader title="States & Cities" subtitle="Write the title, description, photos and FAQs that visitors see when they pick a state or city." />
      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="flex rounded-xl bg-[#E9EEF4] p-1">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cx("rounded-lg px-4 py-2 text-sm font-bold", tab === k ? "bg-[#0B2A47] text-white" : "text-[#5C6A7B]")}>{l}</button>
          ))}
        </div>
        <input className={inputCls + " max-w-xs"} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search state or city" aria-label="Search" />
        <p className="ml-auto text-sm text-[#5C6A7B]">{list.length} places · {rows.filter((r) => r.hasContent).length} with custom content</p>
      </Card>

      {list.length === 0 ? (
        <EmptyState title="Nothing here yet" hint="States and cities appear automatically once you add schools." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#F6FAFD] text-xs font-extrabold uppercase tracking-wide text-[#5C6A7B]">
              <tr><th className="px-5 py-3">Place</th><th className="px-5 py-3">Schools</th><th className="px-5 py-3">Content</th><th className="px-5 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-[#E1E7EE]">
              {list.map((r) => (
                <tr key={`${r.kind}:${r.slug}`} className="hover:bg-[#F6FAFD]">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-[#0B2A47]">{r.name}</p>
                    <p className="text-xs text-[#8896A6]">{r.kind === "state" ? "State" : `City${r.state ? ` · ${r.state}` : ""}`}</p>
                  </td>
                  <td className="px-5 py-3.5">{r.schools}</td>
                  <td className="px-5 py-3.5">
                    {r.hasContent ? (
                      <span className="text-[#4E5A68]">
                        <span className={cx("mr-2 rounded-full px-2.5 py-0.5 text-xs font-bold", r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{r.isActive ? "Custom" : "Off"}</span>
                        {r.photos} photos · {r.faqs} FAQs
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#FDE8EF] px-2.5 py-0.5 text-xs font-bold text-[#C8104F]">Default text</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/admin/locations/${r.kind}/${r.slug}`} className="rounded-xl border border-[#D6DDE5] px-4 py-2 text-sm font-bold text-[#0A5C91] hover:bg-[#E1F1FA]">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
