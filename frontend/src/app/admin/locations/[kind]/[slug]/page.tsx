"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../_lib/api";
import type { AdminLocation } from "../../../_lib/types";
import LocationForm from "../../../_components/LocationForm";
import { ErrorBox, PageHeader, PageLoader } from "../../../_components/ui";

export default function EditLocation() {
  const { kind, slug } = useParams<{ kind: string; slug: string }>();
  const [data, setData] = useState<{ loc: AdminLocation; saved: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [v, setV] = useState(0); // remount the form after save / delete

  const load = useCallback(() => {
    setErr("");
    api<{ data: AdminLocation; saved: boolean }>(`/locations/${kind}/${slug}`)
      .then((r) => { setData({ loc: r.data, saved: r.saved }); setV((n) => n + 1); })
      .catch((e) => setErr(e.message));
  }, [kind, slug]);
  useEffect(load, [load]);

  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!data) return <PageLoader />;

  return (
    <>
      <Link href="/admin/locations" className="mb-3 inline-block text-sm font-bold text-[#0A5C91] hover:underline">← Back to states &amp; cities</Link>
      <PageHeader
        title={data.loc.name}
        subtitle={`${data.loc.kind === "state" ? "State" : `City${data.loc.state ? ` in ${data.loc.state}` : ""}`} · ${data.saved ? "custom content saved" : "using default text"}`}
      />
      <LocationForm key={v} initial={data.loc} saved={data.saved} onSaved={load} />
    </>
  );
}
