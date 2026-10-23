"use client";

import { useState, type FormEvent } from "react";
import { ApiError, post, setToken } from "../_lib/api";
import { fmtDate } from "../_lib/constants";
import { useAdmin } from "../_components/AdminShell";
import { Card, Field, PageHeader, Spinner, btn, inputCls, useToast } from "../_components/ui";
import { API_URL } from "../../lib/api";

export default function Settings() {
  const admin = useAdmin();
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!cur) er.currentPassword = "Enter your current password";
    if (next.length < 8) er.newPassword = "Minimum 8 characters";
    else if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) er.newPassword = "Use letters and numbers";
    if (again !== next) er.again = "Passwords do not match";
    setErrors(er);
    if (Object.keys(er).length) return;

    setBusy(true);
    try {
      const r = await post<{ token: string }>("/auth/change-password", { currentPassword: cur, newPassword: next });
      setToken(r.token); // old tokens are invalid now, keep this session alive
      setCur(""); setNext(""); setAgain("");
      toast.success("Password updated");
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.fields); toast.error(err.message); }
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your account and security." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-base font-extrabold">Account</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div><dt className="text-xs font-bold uppercase tracking-wide text-[#8896A6]">Name</dt><dd className="mt-0.5 font-semibold">{admin?.name}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-[#8896A6]">Email</dt><dd className="mt-0.5 font-semibold">{admin?.email}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-[#8896A6]">Last login</dt><dd className="mt-0.5 font-semibold">{admin?.lastLoginAt ? fmtDate(admin.lastLoginAt) : "—"}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-[#8896A6]">API</dt><dd className="mt-0.5 break-all font-mono text-xs text-[#5C6A7B]">{API_URL}</dd></div>
          </dl>
          <p className="mt-5 rounded-xl bg-[#F6FAFD] p-3 text-xs text-[#5C6A7B]">To add another admin, run <code className="font-bold">npm run create-admin -- &quot;Name&quot; email password</code> in the backend folder.</p>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-extrabold">Change password</h2>
          <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
            <Field label="Current password" error={errors.currentPassword}><input type="password" autoComplete="current-password" className={inputCls} value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
            <Field label="New password" error={errors.newPassword} hint="At least 8 characters, with letters and numbers"><input type="password" autoComplete="new-password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
            <Field label="Repeat new password" error={errors.again}><input type="password" autoComplete="new-password" className={inputCls} value={again} onChange={(e) => setAgain(e.target.value)} /></Field>
            <button className={btn.primary} disabled={busy}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Update password</button>
          </form>
        </Card>
      </div>
    </>
  );
}
