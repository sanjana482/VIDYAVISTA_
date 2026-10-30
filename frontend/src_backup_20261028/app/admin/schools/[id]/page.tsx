"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../_lib/api";
import type { AdminSchool } from "../../_lib/types";
import SchoolForm from "../../_components/SchoolForm";
import { ErrorBox, PageHeader, PageLoader, btn } from "../../_components/ui";

export default function EditSchool() {
  const { id } = useParams<{ id: string }>();
  const [school, setSchool] = useState<AdminSchool | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setErr("");
    api<{ data: AdminSchool }>(`/schools/${id}`).then((r) => setSchool(r.data)).catch((e) => setErr(e.message));
  }, [id]);
  useEffect(load, [load]);

  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!school) return <PageLoader />;

  return (
    <>
      <Link href="/admin/schools" className="mb-3 inline-block text-sm font-bold text-[#0A5C91] hover:underline">← Back to schools</Link>
      <PageHeader
        title={school.name}
        subtitle={`School #${school.schoolId} · last updated ${new Date(school.updatedAt).toLocaleDateString("en-IN")}`}
        actions={<a href={`/schools/${school.slug}`} target="_blank" rel="noreferrer" className={btn.ghost}>View on website ↗</a>}
      />
      <SchoolForm school={school} />
    </>
  );
}
