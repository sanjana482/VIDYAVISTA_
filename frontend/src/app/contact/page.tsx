"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Icon from "../components/Icon";
import { openCounsellorModal } from "../lib/counsellor";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-[#EEF4FA] to-white py-12 sm:py-16 border-b border-[#D6DDE5]/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E1F1FA] border border-[#BDE0F5] px-3.5 py-1 text-xs font-bold text-[#0A5C91]">
            <Icon name="mail" className="h-4 w-4" />
            <span>Connect with VidyaVista</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black text-[#0B2A47] tracking-tight leading-[1.1]">
            Contact Us &amp; Get Support
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#4E5A68] leading-relaxed">
            Have questions about admissions, listing your institution, or need help finding the right school? We are here to help.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Contact Details */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#0B2A47]">Get in Touch</h2>
              <p className="text-sm sm:text-base text-[#626F7D] leading-relaxed">
                Whether you are a parent seeking guidance or a school administrator claiming your profile, our dedicated team is at your service.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4 rounded-2xl border border-[#D6DDE5] p-5 bg-[#F8FBFE]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0795DC] text-white">
                    <Icon name="mail" className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-[#0B2A47] text-sm">Email Support</h3>
                    <p className="text-sm text-[#0A5C91] font-semibold mt-0.5">support@vidyavista.in</p>
                    <p className="text-xs text-[#707E8F] mt-1">Average response time: within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-[#D6DDE5] p-5 bg-[#F8FBFE]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#10B981] text-white">
                    <Icon name="phone" className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-[#0B2A47] text-sm">Free School Counselling Helpline</h3>
                    <p className="text-sm text-[#10B981] font-semibold mt-0.5">Mon - Sat (9:30 AM to 6:30 PM)</p>
                    <button
                      type="button"
                      onClick={() => openCounsellorModal({ source: "Contact Us Page" })}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#0795DC] hover:underline"
                    >
                      <span>Request a Callback from Counsellor</span> &rarr;
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-[#D6DDE5] p-5 bg-[#F8FBFE]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EC0E58] text-white">
                    <Icon name="school" className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-[#0B2A47] text-sm">School Partnerships</h3>
                    <p className="text-sm text-[#EC0E58] font-semibold mt-0.5">schools@vidyavista.in</p>
                    <p className="text-xs text-[#707E8F] mt-1">For institutional logins, verified listings &amp; student leads</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Form */}
            <div className="rounded-3xl border border-[#D6DDE5] bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-[#0B2A47]">Send Us a Message</h2>
              <p className="text-xs sm:text-sm text-[#626F7D] mt-1">Fill out the quick form below and our team will get back to you.</p>

              {submitted ? (
                <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center text-emerald-800">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xl font-bold mb-3">
                    ✓
                  </div>
                  <h3 className="font-bold text-lg">Thank You!</h3>
                  <p className="mt-1 text-sm text-emerald-700">Your message has been received. Our team will contact you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">Full Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Rajesh Sharma"
                      className="mt-1.5 w-full rounded-xl border border-[#D6DDE5] px-4 py-2.5 text-sm text-[#0B2A47] outline-none focus:border-[#0795DC]"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">Mobile Number</label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="10-digit mobile"
                        className="mt-1.5 w-full rounded-xl border border-[#D6DDE5] px-4 py-2.5 text-sm text-[#0B2A47] outline-none focus:border-[#0795DC]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">Email Address</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        className="mt-1.5 w-full rounded-xl border border-[#D6DDE5] px-4 py-2.5 text-sm text-[#0B2A47] outline-none focus:border-[#0795DC]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4E5A68]">How can we help?</label>
                    <textarea
                      rows={4}
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Please share your enquiry or question..."
                      className="mt-1.5 w-full rounded-xl border border-[#D6DDE5] px-4 py-2.5 text-sm text-[#0B2A47] outline-none focus:border-[#0795DC]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#0795DC] py-3 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
