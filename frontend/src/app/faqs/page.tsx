import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FAQ from "../components/FAQ";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQs) | VidyaVista",
  description:
    "Got questions about finding, comparing, or applying to schools? Find answers to commonly asked questions by parents across India.",
  alternates: { canonical: "/faqs" },
};

export default function FAQsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <FAQ />
      <Footer />
    </main>
  );
}
