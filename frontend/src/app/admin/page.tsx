"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BACKEND_ORIGIN } from "../lib/api";

export default function AdminRedirectPage() {
  const djangoAdminUrl = `${BACKEND_ORIGIN}/admin/`;

  useEffect(() => {
    window.location.replace(djangoAdminUrl);
  }, [djangoAdminUrl]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F8FB] p-6">
      <div className="max-w-md rounded-3xl border border-[#E1E7EE] bg-white p-8 text-center shadow-xl">
        <img src="/logo.png" alt="VidyaVista" className="mx-auto h-12 w-auto object-contain" />
        <h1 className="mt-4 text-xl font-extrabold text-[#0B2A47]">Opening VidyaVista Boss Admin...</h1>
        <p className="mt-2 text-xs text-[#5C6A7B]">
          All schools, parent accounts, institution claims, 100-lead plans, GST invoices, and password controls are managed in your single unified Django Boss Admin.
        </p>
        <a
          href={djangoAdminUrl}
          className="mt-6 block w-full rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] py-3.5 text-sm font-extrabold text-white shadow-lg"
        >
          Open VidyaVista Admin Panel →
        </a>
        <Link href="/" className="mt-3 inline-block text-xs font-bold text-[#5C6A7B] hover:underline">
          ← Back to Website
        </Link>
      </div>
    </div>
  );
}
