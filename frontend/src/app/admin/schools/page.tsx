"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, del, patch, post, qs } from "../_lib/api";
import type { AdminSchool, Paged } from "../_lib/types";
import { BOARDS, TYPES, inr } from "../_lib/constants";
import { Card, ConfirmDialog, EmptyState, ErrorBox, PageHeader, Pagination, Spinner, Switch, btn, cx, inputCls, useDebounced, useToast } from "../_components/ui";

type Meta = { cities: string[] };
const ISSUES: Record<string, string> = { noImage: "Schools without a photo", noPhone: "Schools without a phone number", unrated: "Schools without reviews" };

export default function SchoolsAdmin() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [board, setBoard] = useState("");
  const [type, setType] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("newest");
  const [issue, setIssue] = useState("");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const [res, setRes] = useState<Paged<AdminSchool> | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState<{ ids: number[]; label: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const dq = useDebounced(q);

  // filters passed from the dashboard links (?status=inactive / ?issue=noImage)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setStatus(p.get("status") || "");
    setIssue(p.get("issue") || "");
  }, []);
  useEffect(() => { api<Meta>("/schools/meta").then((m) => setCities(m.cities)).catch(() => {}); }, []);
  useEffect(() => setPage(1), [dq, status, board, type, city, sort, issue, limit]);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    api<Paged<AdminSchool>>(`/schools${qs({ q: dq, status, board, type, city, sort, issue, limit, page })}`)
      .then((r) => { setRes(r); setSelected(new Set()); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [dq, status, board, type, city, sort, issue, limit, page]);
  useEffect(load, [load]);

  const rows = res?.data ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.schoolId));
  const toggleOne = (id: number) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function flag(s: AdminSchool, data: Partial<Pick<AdminSchool, "isActive" | "topRated">>) {
    setRes((r) => r && { ...r, data: r.data.map((x) => (x.schoolId === s.schoolId ? { ...x, ...data } : x)) }); // optimistic
    try {
      await patch(`/schools/${s.schoolId}/flags`, data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
      load();
    }
  }

  async function bulk(action: string) {
    setBusy(true);
    try {
      const r = await post<{ affected: number }>("/schools/bulk-action", { ids: Array.from(selected), action });
      toast.success(`${r.affected} school${r.affected === 1 ? "" : "s"} updated`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally { setBusy(false); }
  }

  async function doDelete() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.ids.length === 1) await del(`/schools/${confirm.ids[0]}`);
      else await post("/schools/bulk-action", { ids: confirm.ids, action: "delete" });
      toast.success("Deleted");
      setConfirm(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally { setBusy(false); }
  }

  const hasFilters = !!(q || status || board || type || city || issue);
  const reset = () => { setQ(""); setStatus(""); setBoard(""); setType(""); setCity(""); setIssue(""); window.history.replaceState(null, "", "/admin/schools"); };

  return (
    <>
      <PageHeader
        title="Schools"
        subtitle="Add, edit and publish the schools shown on the website."
        actions={<>
          <Link href="/admin/schools/import" className={btn.ghost}>⬆ Bulk import</Link>
          <Link href="/admin/schools/new" className={btn.primary}>+ Add School</Link>
        </>}
      />

      {issue && ISSUES[issue] && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[#F5C2D3] bg-[#FDE8EF] px-4 py-2.5 text-sm font-semibold text-[#C8104F]">
          Showing: {ISSUES[issue]}
          <button onClick={() => setIssue("")} className="underline">Clear</button>
        </div>
      )}

      <Card>
        {/* filters */}
        <div className="grid gap-3 border-b border-[#E1E7EE] p-4 sm:grid-cols-2 lg:grid-cols-6">
          <input className={cx(inputCls, "lg:col-span-2")} placeholder="Search name, area, city, phone or ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search schools" />
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All status</option><option value="active">Live</option><option value="inactive">Hidden</option>
          </select>
          <select className={inputCls} value={board} onChange={(e) => setBoard(e.target.value)} aria-label="Board">
            <option value="">All boards</option>{BOARDS.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
            <option value="">All types</option>{TYPES.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
            <option value="">All cities</option>{cities.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E7EE] bg-[#F6FAFD] px-4 py-2.5">
          {selected.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-sm text-[#0A5C91]">{selected.size} selected</b>
              <button disabled={busy} onClick={() => bulk("activate")} className={btn.ghost + " !px-3 !py-1.5"}>Make live</button>
              <button disabled={busy} onClick={() => bulk("deactivate")} className={btn.ghost + " !px-3 !py-1.5"}>Hide</button>
              <button disabled={busy} onClick={() => bulk("top")} className={btn.ghost + " !px-3 !py-1.5"}>★ Top rated</button>
              <button disabled={busy} onClick={() => bulk("untop")} className={btn.ghost + " !px-3 !py-1.5"}>Remove ★</button>
              <button disabled={busy} onClick={() => setConfirm({ ids: Array.from(selected), label: `${selected.size} schools` })} className={btn.danger + " !px-3 !py-1.5"}>Delete</button>
            </div>
          ) : (
            <p className="text-sm text-[#5C6A7B]">{res ? `${res.meta.total} school${res.meta.total === 1 ? "" : "s"}` : "Loading…"}{hasFilters && <button onClick={reset} className="ml-3 font-bold text-[#0A5C91] underline">Reset filters</button>}</p>
          )}
          <div className="flex items-center gap-2 text-sm">
            <select className={inputCls + " !w-auto !py-1.5"} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A-Z</option>
              <option value="rating">Top rating</option><option value="fee-low">Fee: low → high</option><option value="fee-high">Fee: high → low</option>
            </select>
            <select className={inputCls + " !w-auto !py-1.5"} value={limit} onChange={(e) => setLimit(Number(e.target.value))} aria-label="Rows per page">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
        </div>

        {err ? (
          <div className="p-5"><ErrorBox message={err} onRetry={load} /></div>
        ) : loading && !res ? (
          <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
        ) : rows.length === 0 ? (
          <EmptyState title="No schools found" hint={hasFilters ? "Try changing or resetting the filters." : "Add your first school to show it on the website."} action={<Link href="/admin/schools/new" className={btn.primary}>+ Add School</Link>} />
        ) : (
          <div className={cx("overflow-x-auto transition-opacity", loading && "opacity-60")}>
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-[#8896A6]">
                <tr>
                  <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.schoolId)))} className="h-4 w-4 accent-[#0795DC]" /></th>
                  <th className="px-2 py-3">School</th><th className="px-3 py-3">Board / Type</th><th className="px-3 py-3">Fee / yr</th>
                  <th className="px-3 py-3">Rating</th><th className="px-3 py-3 text-center">Top ★</th><th className="px-3 py-3 text-center">Live</th><th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E7EE]">
                {rows.map((s) => (
                  <tr key={s._id} className={cx("transition hover:bg-[#F6FAFD]", !s.isActive && "bg-[#FAFBFC]")}>
                    <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${s.name}`} checked={selected.has(s.schoolId)} onChange={() => toggleOne(s.schoolId)} className="h-4 w-4 accent-[#0795DC]" /></td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        {s.image ? <img src={s.image} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" /> : <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg bg-[#E1F1FA] text-lg">🏫</span>}
                        <div className="min-w-0">
                          <Link href={`/admin/schools/${s.schoolId}`} className="block truncate font-bold text-[#0B2A47] hover:text-[#0795DC]">{s.name}</Link>
                          <p className="truncate text-xs text-[#5C6A7B]">#{s.schoolId} · {s.area}, {s.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className="rounded-md bg-[#E1F1FA] px-2 py-0.5 text-xs font-bold text-[#0A5C91]">{s.board}</span><p className="mt-1 text-xs text-[#5C6A7B]">{s.type}</p></td>
                    <td className="px-3 py-3 font-semibold">{inr(s.fee)}</td>
                    <td className="px-3 py-3">{s.reviews > 0 ? <><b>{s.rating.toFixed(1)}</b> <span className="text-[#F5A524]">★</span> <span className="text-xs text-[#8896A6]">({s.reviews})</span></> : <span className="text-xs text-[#8896A6]">No reviews</span>}</td>
                    <td className="px-3 py-3 text-center"><button aria-label={s.topRated ? "Remove top rated" : "Mark top rated"} onClick={() => flag(s, { topRated: !s.topRated })} className={cx("text-xl transition hover:scale-110", s.topRated ? "text-[#EC0E58]" : "text-[#D6DDE5]")}>★</button></td>
                    <td className="px-3 py-3"><div className="flex justify-center"><Switch checked={s.isActive} onChange={(v) => flag(s, { isActive: v })} label={`${s.name} live on website`} /></div></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <a href={`/schools/${s.slug}`} target="_blank" rel="noreferrer" className={btn.ghost + " !px-2.5 !py-1.5"} title="View on website">↗</a>
                        <Link href={`/admin/schools/${s.schoolId}`} className={btn.ghost + " !px-3 !py-1.5"}>Edit</Link>
                        <button className={btn.danger + " !px-2.5 !py-1.5"} aria-label={`Delete ${s.name}`} onClick={() => setConfirm({ ids: [s.schoolId], label: s.name })}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {res && <Pagination page={res.meta.page} pages={res.meta.pages} total={res.meta.total} limit={res.meta.limit} onPage={setPage} />}
      </Card>

      <ConfirmDialog open={!!confirm} busy={busy} title="Delete school?" message={`"${confirm?.label}" will be permanently removed from the website. Past enquiries are kept. If you only want to hide it, use the Live switch instead.`} onConfirm={doDelete} onCancel={() => setConfirm(null)} />
    </>
  );
}
