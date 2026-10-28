"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getToken, post, setToken } from "../_lib/api";
import type { Admin } from "../_lib/types";
import { btn, inputCls, Spinner } from "../_components/ui";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getToken()) router.replace("/admin");
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await post<{ token: string; admin: Admin }>("/auth/login", { email, password });
      setToken(r.token);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#0A5C91] via-[#0795DC] to-[#0B2A47] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#EC0E58]/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative inline-flex w-fit rounded-2xl bg-white px-5 py-3 shadow-xl">
          <img src="/logo.png" alt="VidyaVista" className="h-12 w-auto" />
        </div>
        <div className="relative">
          <h2 className="max-w-md text-4xl font-extrabold leading-tight">Manage every school, enquiry and admission lead in one place.</h2>
          <ul className="mt-6 space-y-3 text-white/90">
            {["Add & update school listings", "Bulk import from a CSV sheet", "Track and follow-up parent enquiries"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EC0E58] text-xs font-bold">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/70">Discover | Learn | Grow</p>
      </div>

      {/* form */}
      <div className="flex items-center justify-center bg-[#F6FAFD] px-5 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <img src="/logo.png" alt="VidyaVista" className="mb-8 h-12 w-auto lg:hidden" />
          <h1 className="text-3xl font-extrabold text-[#0B2A47]">Welcome back 👋</h1>
          <p className="mt-1.5 text-sm text-[#5C6A7B]">Log in to the VidyaVista admin panel.</p>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#5C6A7B]">Email or username</span>
              <input type="text" required autoComplete="username" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@vidyavista.com" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#5C6A7B]">Password</span>
              <div className="relative">
                <input type={show ? "text" : "password"} required autoComplete="current-password" className={inputCls + " pr-16"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0A5C91]">
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl border border-[#F5C2D3] bg-[#FDE8EF] px-4 py-3 text-sm font-semibold text-[#C8104F]">{error}</p>}

          <button type="submit" disabled={busy} className={btn.primary + " mt-6 w-full !py-3"}>
            {busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Log in
          </button>
          <p className="mt-6 text-center text-xs text-[#8896A6]">Authorised staff only.</p>
        </form>
      </div>
    </div>
  );
}
