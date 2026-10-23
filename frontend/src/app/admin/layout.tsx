import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminShell from "./_components/AdminShell";
import { ToastProvider } from "./_components/ui";

// the admin panel must never appear in Google
export const metadata: Metadata = {
  title: "Admin Panel",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
