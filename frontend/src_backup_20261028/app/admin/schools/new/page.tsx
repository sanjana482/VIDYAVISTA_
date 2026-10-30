"use client";

import Link from "next/link";
import SchoolForm from "../../_components/SchoolForm";
import { PageHeader } from "../../_components/ui";

export default function NewSchool() {
  return (
    <>
      <Link href="/admin/schools" className="mb-3 inline-block text-sm font-bold text-[#0A5C91] hover:underline">← Back to schools</Link>
      <PageHeader title="Add a school" subtitle="Fill in the details. It appears on the website as soon as “Live” is on." />
      <SchoolForm />
    </>
  );
}
