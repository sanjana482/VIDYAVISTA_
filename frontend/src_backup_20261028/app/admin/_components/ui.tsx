"use client";

// Shared admin UI. Brand colours come from the logo: blue #0795DC, pink #EC0E58, ink #262423
// (+ the site's deep blue #0A5C91 / navy #0B2A47 for text and gradients).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const inputCls =
  "w-full rounded-xl border border-[#D6DDE5] bg-white px-3.5 py-2.5 text-sm text-[#0B2A47] placeholder:text-[#8896A6] outline-none transition focus:border-[#0795DC] focus:ring-4 focus:ring-[#0795DC]/15 disabled:bg-[#F6FAFD]";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#0A5C91]/20 transition hover:-translate-y-0.5 hover:shadow-lg disabled:pointer-events-none disabled:opacity-60",
  accent:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#EC0E58] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#EC0E58]/20 transition hover:bg-[#C8104F] disabled:pointer-events-none disabled:opacity-60",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-[#D6DDE5] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A5C91] transition hover:bg-[#E1F1FA] disabled:pointer-events-none disabled:opacity-60",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-[#F5C2D3] bg-white px-4 py-2.5 text-sm font-semibold text-[#C8104F] transition hover:bg-[#FDE8EF] disabled:pointer-events-none disabled:opacity-60",
};

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-[#E1E7EE] bg-white shadow-sm", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0B2A47]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#5C6A7B]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#0795DC]/25 border-t-[#0795DC]", className)} role="status" aria-label="Loading" />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E1F1FA] text-2xl">🎓</div>
      <p className="font-bold text-[#0B2A47]">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-[#5C6A7B]">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-[#F5C2D3] bg-[#FDE8EF] p-5 text-sm text-[#C8104F]">
      <p className="font-semibold">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-bold underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function Field({ label, error, hint, required, children, className }: { label: string; error?: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#5C6A7B]">
        {label} {required && <span className="text-[#EC0E58]">*</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-[#C8104F]">{error}</span> : hint ? <span className="mt-1 block text-xs text-[#8896A6]">{hint}</span> : null}
    </label>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50", checked ? "bg-[#0795DC]" : "bg-[#D6DDE5]")}
    >
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function Pagination({ page, pages, total, limit, onPage }: { page: number; pages: number; total: number; limit: number; onPage: (p: number) => void }) {
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E1E7EE] px-4 py-3 text-sm text-[#5C6A7B]">
      <span>
        Showing <b className="text-[#0B2A47]">{from}-{to}</b> of <b className="text-[#0B2A47]">{total}</b>
      </span>
      <div className="flex items-center gap-1.5">
        <button className={btn.ghost + " !px-3 !py-1.5"} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Prev
        </button>
        <span className="px-2 font-semibold text-[#0B2A47]">
          {page} / {pages}
        </span>
        <button className={btn.ghost + " !px-3 !py-1.5"} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}

/* ---------- confirm dialog ---------- */
export function ConfirmDialog({
  open, title, message, confirmLabel = "Delete", busy, onConfirm, onCancel,
}: { open: boolean; title: string; message: string; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0B2A47]/50 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-label={title} className="vv-pop w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FDE8EF] text-xl">⚠️</div>
        <h3 className="text-lg font-extrabold text-[#0B2A47]">{title}</h3>
        <p className="mt-1.5 text-sm text-[#5C6A7B]">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className={btn.ghost} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className={btn.accent} onClick={onConfirm} disabled={busy}>
            {busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- toasts ---------- */
type Toast = { id: number; kind: "ok" | "err"; text: string };
const ToastCtx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});
export const useToast = () => {
  const push = useContext(ToastCtx);
  return { success: (t: string) => push("ok", t), error: (t: string) => push("err", t) };
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++idRef.current;
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(92vw,22rem)] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx("vv-pop pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-4 py-3 text-sm font-semibold shadow-xl", t.kind === "ok" ? "border-emerald-200 text-emerald-700" : "border-[#F5C2D3] text-[#C8104F]")}>
            <span>{t.kind === "ok" ? "✅" : "⚠️"}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** debounce a value (used for live search boxes) */
export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
