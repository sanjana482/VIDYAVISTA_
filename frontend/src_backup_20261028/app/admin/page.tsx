"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "./_lib/api";
import type { Stats } from "./_lib/types";
import { STATUS_META, timeAgo } from "./_lib/constants";
import { Card, ErrorBox, PageLoader, btn, cx } from "./_components/ui";
import { DailyBars, Donut, HBars } from "./_components/Charts";
import { useAdmin } from "./_components/AdminShell";

function Kpi({ label, value, sub, tone, icon }: { label: string; value: ReactNode; sub?: ReactNode; tone: "blue" | "pink" | "green" | "navy"; icon: string }) {
  const tones = {
    blue: "bg-[#E1F1FA] text-[#0A5C91]",
    pink: "bg-[#FDE8EF] text-[#C8104F]",
    green: "bg-emerald-50 text-emerald-700",
    navy: "bg-[#E5EDF2] text-[#0B2A47]",
  };
  return (
    <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#5C6A7B]">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-[#0B2A47]">{value}</p>
        </div>
        <span className={cx("flex h-11 w-11 items-center justify-center rounded-xl text-xl", tones[tone])}>{icon}</span>
      </div>
      {sub && <p className="mt-2 text-xs text-[#5C6A7B]">{sub}</p>}
    </Card>
  );
}

function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-extrabold text-[#0B2A47]">{children}</h2>
      {right}
    </div>
  );
}

export default function Dashboard() {
  const admin = useAdmin();
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setErr("");
    api<Stats>("/stats").then(setS).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!s) return <PageLoader />;

  const e = s.enquiries;
  const delta = e.prev7 === 0 ? (e.last7 > 0 ? 100 : 0) : Math.round(((e.last7 - e.prev7) / e.prev7) * 100);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const attention = [
    { n: s.attention.noImage, text: "schools have no photo", href: "/admin/schools?issue=noImage" },
    { n: s.attention.noPhone, text: "schools have no phone number", href: "/admin/schools?issue=noPhone" },
    { n: s.attention.unrated, text: "schools have no reviews yet", href: "/admin/schools?issue=unrated" },
    { n: s.attention.inactive, text: "schools are hidden from the website", href: "/admin/schools?status=inactive" },
  ].filter((a) => a.n > 0);

  return (
    <div className="space-y-6">
      {/* welcome strip */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A5C91] via-[#0795DC] to-[#0A7BBF] p-6 text-white shadow-lg shadow-[#0A5C91]/20 sm:p-8">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#EC0E58]/35 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{greet}, {admin?.name.split(" ")[0]} 👋</h1>
            <p className="mt-1 text-white/85">
              {e.status.new > 0 ? <>You have <b>{e.status.new} new enquir{e.status.new === 1 ? "y" : "ies"}</b> waiting for a call.</> : "All enquiries are attended. Great work!"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/schools/new" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0A5C91] shadow transition hover:-translate-y-0.5">+ Add School</Link>
            <Link href="/admin/enquiries?status=new" className="rounded-xl bg-[#EC0E58] px-4 py-2.5 text-sm font-bold text-white shadow transition hover:-translate-y-0.5 hover:bg-[#C8104F]">View new enquiries</Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total schools" value={s.schools.total} tone="blue" icon="🏫" sub={<><b className="text-emerald-700">{s.schools.active}</b> live · <b className="text-[#C8104F]">{s.schools.inactive}</b> hidden · {s.schools.topRated} top rated</>} />
        <Kpi label="Enquiries (7 days)" value={e.last7} tone="pink" icon="📨" sub={<span className={delta >= 0 ? "text-emerald-700" : "text-[#C8104F]"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs previous week</span>} />
        <Kpi label="Today" value={e.today} tone="navy" icon="📅" sub={`${e.total} enquiries in total`} />
        <Kpi label="Conversion" value={`${e.conversion}%`} tone="green" icon="🎯" sub={`${e.status.converted} converted · ${e.status.contacted} in follow-up`} />
      </div>

      {/* charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <CardTitle right={<span className="text-xs text-[#8896A6]">Last 14 days</span>}>Enquiries trend</CardTitle>
          <DailyBars data={e.daily} />
        </Card>
        <Card className="p-5">
          <CardTitle>Enquiry pipeline</CardTitle>
          <Donut centerLabel="enquiries" parts={(["new", "contacted", "converted", "closed"] as const).map((k) => ({ label: STATUS_META[k].label, value: e.status[k], color: STATUS_META[k].dot }))} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <CardTitle>Most enquired schools</CardTitle>
          <HBars items={e.topSchools} color="#EC0E58" empty="Enquiries will appear here" />
        </Card>
        <Card className="p-5">
          <CardTitle>Schools by city</CardTitle>
          <HBars items={s.schoolsByCity} />
        </Card>
        <Card className="p-5">
          <CardTitle>Schools by board</CardTitle>
          <HBars items={s.schoolsByBoard} color="#0A5C91" />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* recent enquiries */}
        <Card className="xl:col-span-2">
          <div className="p-5 pb-0">
            <CardTitle right={<Link href="/admin/enquiries" className="text-sm font-bold text-[#0A5C91] hover:underline">View all →</Link>}>Recent enquiries</CardTitle>
          </div>
          {s.recentEnquiries.length === 0 ? (
            <p className="px-5 pb-8 text-center text-sm text-[#8896A6]">No enquiries yet.</p>
          ) : (
            <ul className="divide-y divide-[#E1E7EE]">
              {s.recentEnquiries.map((q) => (
                <li key={q._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{q.parentName} <span className="font-normal text-[#5C6A7B]">· {q.mobile}</span></p>
                    <p className="truncate text-sm text-[#5C6A7B]">{q.schoolName}{q.className ? ` · Class ${q.className}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cx("rounded-full px-2.5 py-1 text-xs font-bold", STATUS_META[q.status].chip)}>{STATUS_META[q.status].label}</span>
                    <span className="text-xs text-[#8896A6]">{timeAgo(q.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* needs attention */}
        <Card className="p-5">
          <CardTitle>Needs attention</CardTitle>
          {attention.length === 0 ? (
            <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">✅ All listings look complete.</p>
          ) : (
            <ul className="space-y-2.5">
              {attention.map((a) => (
                <li key={a.text}>
                  <Link href={a.href} className="flex items-center gap-3 rounded-xl border border-[#E1E7EE] p-3 text-sm transition hover:border-[#0795DC] hover:bg-[#F6FAFD]">
                    <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#FDE8EF] px-2 font-extrabold text-[#C8104F]">{a.n}</span>
                    <span className="flex-1 text-[#4E5A68]">{a.text}</span>
                    <span className="text-[#0A5C91]">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/admin/schools/import" className={btn.ghost}>Bulk import</Link>
            <Link href="/admin/enquiries" className={btn.ghost}>Enquiries</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
