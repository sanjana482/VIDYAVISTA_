"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { api, del, downloadFile, patch, post, qs } from "../_lib/api";
import type { AdminEnquiry, EnquiryStatus, Paged } from "../_lib/types";
import { STATUSES, STATUS_META, fmtDate, timeAgo } from "../_lib/constants";
import { Card, ConfirmDialog, EmptyState, ErrorBox, PageHeader, Pagination, Spinner, btn, cx, inputCls, useDebounced, useToast } from "../_components/ui";

type Counts = Record<EnquiryStatus | "all", number>;
type Res = Paged<AdminEnquiry, { counts: Counts }>;

const wa = (mobile: string, name: string, school: string) =>
  `https://wa.me/91${mobile}?text=${encodeURIComponent(`Hello ${name}, this is VidyaVista regarding your enquiry for ${school}.`)}`;

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-[#8896A6]">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-[#0B2A47]">{value || "—"}</dd>
    </div>
  );
}

export default function EnquiriesAdmin() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<Res | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<AdminEnquiry | null>(null);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const dq = useDebounced(q);

  useEffect(() => { setStatus(new URLSearchParams(window.location.search).get("status") || ""); }, []);
  useEffect(() => setPage(1), [status, dq, from, to]);

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    api<Res>(`/enquiries${qs({ status, q: dq, from, to, page })}`)
      .then((r) => { setRes(r); setSelected(new Set()); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [status, dq, from, to, page]);
  useEffect(load, [load]);

  const counts = res?.meta.counts;
  const rows = res?.data ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r._id));

  const patchLocal = (e: AdminEnquiry) => {
    setRes((r) => r && { ...r, data: r.data.map((x) => (x._id === e._id ? e : x)) });
    setOpen((o) => (o && o._id === e._id ? e : o));
  };

  async function setRowStatus(e: AdminEnquiry, s: EnquiryStatus) {
    try {
      const r = await patch<{ data: AdminEnquiry }>(`/enquiries/${e._id}`, { status: s });
      patchLocal(r.data);
      toast.success(`Marked as ${STATUS_META[s].label}`);
      load(); // refresh tab counts
    } catch (er) { toast.error(er instanceof Error ? er.message : "Update failed"); }
  }

  async function saveNote() {
    if (!open) return;
    setSavingNote(true);
    try {
      const r = await patch<{ data: AdminEnquiry }>(`/enquiries/${open._id}`, { adminNote: note });
      patchLocal(r.data);
      toast.success("Note saved");
    } catch (er) { toast.error(er instanceof Error ? er.message : "Could not save"); }
    finally { setSavingNote(false); }
  }

  async function bulkStatus(s: EnquiryStatus) {
    setBusy(true);
    try {
      await post("/enquiries/bulk", { ids: Array.from(selected), action: "status", status: s });
      toast.success("Updated");
      load();
    } catch (er) { toast.error(er instanceof Error ? er.message : "Failed"); }
    finally { setBusy(false); }
  }

  async function doDelete() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.length === 1) await del(`/enquiries/${confirm[0]}`);
      else await post("/enquiries/bulk", { ids: confirm, action: "delete" });
      toast.success("Deleted");
      setConfirm(null);
      setOpen(null);
      load();
    } catch (er) { toast.error(er instanceof Error ? er.message : "Delete failed"); }
    finally { setBusy(false); }
  }

  async function exportCsv() {
    setExporting(true);
    try { await downloadFile(`/enquiries/export${qs({ status, q: dq, from, to })}`, `enquiries-${new Date().toISOString().slice(0, 10)}.csv`); }
    catch (er) { toast.error(er instanceof Error ? er.message : "Export failed"); }
    finally { setExporting(false); }
  }

  const tabs: { key: string; label: string; n?: number }[] = [
    { key: "", label: "All", n: counts?.all },
    ...STATUSES.map((s) => ({ key: s, label: STATUS_META[s].label, n: counts?.[s] })),
  ];

  return (
    <>
      <PageHeader
        title="Enquiries"
        subtitle="Parents who asked about a school. Call them quickly: the first responder usually wins the admission."
        actions={<button className={btn.ghost} onClick={exportCsv} disabled={exporting}>{exporting ? <Spinner className="h-4 w-4" /> : "⬇"} Export CSV</button>}
      />

      <Card>
        <div className="flex gap-1 overflow-x-auto border-b border-[#E1E7EE] px-3 pt-3">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setStatus(t.key)} className={cx("flex items-center gap-2 whitespace-nowrap rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-bold transition", status === t.key ? "border-[#EC0E58] text-[#0A5C91]" : "border-transparent text-[#5C6A7B] hover:text-[#0A5C91]")}>
              {t.label}
              {t.n !== undefined && <span className={cx("rounded-full px-2 py-0.5 text-xs", status === t.key ? "bg-[#E1F1FA] text-[#0A5C91]" : "bg-[#F1F4F8] text-[#5C6A7B]")}>{t.n}</span>}
            </button>
          ))}
        </div>

        <div className="grid gap-3 border-b border-[#E1E7EE] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input className={cx(inputCls, "lg:col-span-2")} placeholder="Search parent, mobile, school, child, city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search enquiries" />
          <input type="date" className={inputCls} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <input type="date" className={inputCls} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E1E7EE] bg-[#F6FAFD] px-4 py-2.5">
            <b className="text-sm text-[#0A5C91]">{selected.size} selected</b>
            {STATUSES.map((s) => <button key={s} disabled={busy} onClick={() => bulkStatus(s)} className={btn.ghost + " !px-3 !py-1.5"}>Mark {STATUS_META[s].label}</button>)}
            <button disabled={busy} onClick={() => setConfirm(Array.from(selected))} className={btn.danger + " !px-3 !py-1.5"}>Delete</button>
          </div>
        )}

        {err ? (
          <div className="p-5"><ErrorBox message={err} onRetry={load} /></div>
        ) : loading && !res ? (
          <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
        ) : rows.length === 0 ? (
          <EmptyState title="No enquiries here" hint="New parent enquiries from the website will show up in this list." />
        ) : (
          <div className={cx("overflow-x-auto transition-opacity", loading && "opacity-60")}>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#8896A6]">
                <tr>
                  <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all" className="h-4 w-4 accent-[#0795DC]" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r._id)))} /></th>
                  <th className="px-2 py-3">Parent</th><th className="px-3 py-3">School</th><th className="px-3 py-3">Child</th><th className="px-3 py-3">Received</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E7EE]">
                {rows.map((r) => (
                  <tr key={r._id} onClick={() => { setOpen(r); setNote(r.adminNote || ""); }} className={cx("cursor-pointer transition hover:bg-[#F6FAFD]", r.status === "new" && "bg-[#FDE8EF]/25")}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${r.parentName}`} className="h-4 w-4 accent-[#0795DC]" checked={selected.has(r._id)} onChange={() => setSelected((s) => { const n = new Set(s); n.has(r._id) ? n.delete(r._id) : n.add(r._id); return n; })} /></td>
                    <td className="px-2 py-3"><p className="font-bold">{r.parentName}</p><p className="text-xs text-[#5C6A7B]">{r.mobile}{r.relation ? ` · ${r.relation}` : ""}</p></td>
                    <td className="max-w-[16rem] px-3 py-3"><p className="truncate font-semibold">{r.schoolName}</p>{r.city && <p className="text-xs text-[#5C6A7B]">{r.city}</p>}</td>
                    <td className="px-3 py-3 text-[#4E5A68]">{r.childName || "—"}{r.className && <span className="block text-xs text-[#8896A6]">Class {r.className}{r.session ? ` · ${r.session}` : ""}</span>}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#5C6A7B]" title={fmtDate(r.createdAt)}>{timeAgo(r.createdAt)}</td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <select aria-label="Change status" value={r.status} onChange={(e) => setRowStatus(r, e.target.value as EnquiryStatus)} className={cx("cursor-pointer rounded-full border-0 py-1 pl-3 pr-7 text-xs font-bold outline-none", STATUS_META[r.status].chip)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <a href={`tel:+91${r.mobile}`} className={btn.ghost + " !px-2.5 !py-1.5"} title="Call">📞</a>
                        <a href={wa(r.mobile, r.parentName, r.schoolName)} target="_blank" rel="noreferrer" className={btn.ghost + " !px-2.5 !py-1.5"} title="WhatsApp">💬</a>
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

      {/* detail drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-[#0B2A47]/40 backdrop-blur-[2px]" onClick={() => setOpen(null)}>
          <aside className="vv-pop flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Enquiry details">
            <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-[#0A5C91] to-[#0795DC] p-5 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-white/70">Enquiry · {fmtDate(open.createdAt)}</p>
                <h2 className="mt-1 text-xl font-extrabold">{open.parentName}</h2>
                <p className="text-sm text-white/85">{open.schoolName}</p>
              </div>
              <button onClick={() => setOpen(null)} aria-label="Close" className="rounded-lg bg-white/15 px-2.5 py-1 text-lg hover:bg-white/25">×</button>
            </div>

            <div className="space-y-6 p-5">
              <div className="flex gap-2">
                <a href={`tel:+91${open.mobile}`} className={btn.primary + " flex-1"}>📞 Call {open.mobile}</a>
                <a href={wa(open.mobile, open.parentName, open.schoolName)} target="_blank" rel="noreferrer" className={btn.ghost + " flex-1"}>💬 WhatsApp</a>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8896A6]">Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map((s) => (
                    <button key={s} onClick={() => setRowStatus(open, s)} className={cx("rounded-xl border px-3 py-2 text-sm font-bold transition", open.status === s ? `${STATUS_META[s].chip} border-transparent ring-2 ring-offset-1` : "border-[#D6DDE5] text-[#5C6A7B] hover:bg-[#F6FAFD]")} style={open.status === s ? ({ "--tw-ring-color": STATUS_META[s].dot } as CSSProperties) : undefined}>
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <Detail label="Relation" value={open.relation} /><Detail label="Email" value={open.email} />
                <Detail label="Child" value={open.childName} /><Detail label="Class / session" value={[open.className, open.session].filter(Boolean).join(" · ")} />
                <Detail label="City" value={open.city} /><Detail label="Submitted from" value={open.source} />
                <Detail label="Searched for" value={[open.preference?.type, open.preference?.location].filter(Boolean).join(" in ")} />
              </dl>

              {open.note && (
                <div className="rounded-xl bg-[#F6FAFD] p-4"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#8896A6]">Parent&apos;s message</p><p className="text-sm text-[#0B2A47]">{open.note}</p></div>
              )}

              <div>
                <label htmlFor="adminNote" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#8896A6]">Internal note (not visible to parent)</label>
                <textarea id="adminNote" rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="e.g. Called at 5pm, will visit campus on Saturday." />
                <div className="mt-2 flex justify-between">
                  <button className={btn.danger} onClick={() => setConfirm([open._id])}>Delete</button>
                  <button className={btn.primary} onClick={saveNote} disabled={savingNote || note === (open.adminNote || "")}>{savingNote && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Save note</button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog open={!!confirm} busy={busy} title="Delete enquiry?" message={`${confirm?.length === 1 ? "This enquiry" : `${confirm?.length} enquiries`} will be permanently deleted. Consider marking as Closed instead to keep the history.`} onConfirm={doDelete} onCancel={() => setConfirm(null)} />
    </>
  );
}
