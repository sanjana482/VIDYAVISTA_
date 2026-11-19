"use client";

import { useState } from "react";
import { openCounsellorModal } from "../lib/counsellor";

const steps = [
  {
    number: "01",
    title: "Discover your options",
    description:
      "Start with your city, preferred board and what matters to your child.",
    color: "bg-[#E5EBF1]",
    accent: "bg-[#F2C6D5]",
  },
  {
    number: "02",
    title: "Compare with clarity",
    description:
      "Put schools side by side to see fees, classes and learning environment.",
    color: "bg-[#E8EEF1]",
    accent: "bg-[#B4DEF7]",
  },
  {
    number: "03",
    title: "Take the next step",
    description:
      "Get guidance on your shortlist and prepare for a school visit.",
    color: "bg-[#F7E8ED]",
    accent: "bg-[#F1C8D6]",
  },
];

export default function SchoolGuidance() {
  const [mobile, setMobile] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    openCounsellorModal({ mobile, source: "Home Guidance Banner" });
  }

  return (
    <section className="bg-white pb-0 pt-12 sm:pt-16">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        {/* Guidance steps */}
        <div>
          <span className="inline-flex rounded-full bg-[#F6E3E9] px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[#C8104F]">
            Your admission journey
          </span>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0B2A47] sm:text-4xl">
            A simpler path to the right school
          </h2>

          <p className="mt-3 text-base text-[#626F7D] sm:text-lg">
            Thoughtful choices, one step at a time.
          </p>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className={`${step.color} group rounded-[28px] border border-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0B2A47]/5 sm:p-8`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.accent} text-base font-extrabold text-[#0B2A47] transition group-hover:rotate-3`}
              >
                {step.number}
              </div>

              <h3 className="mt-6 text-xl font-extrabold text-[#0B2A47]">
                {step.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#55606D] sm:text-base">
                {step.description}
              </p>
            </article>
          ))}
        </div>

        {/* Counsellor callback banner */}
        <div id="talk-to-us" className="relative z-10 mt-16 scroll-mt-24 overflow-hidden rounded-[30px] border border-[#D1DAE5] bg-gradient-to-br from-[#B8C6D7] via-[#D1DAE5] to-[#E5EBF1] p-6 shadow-[0_18px_55px_rgba(34,34,59,0.10)] sm:p-10 lg:mt-20">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/30 blur-3xl" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <span className="inline-flex rounded-full bg-white/60 px-3 py-1.5 text-xs font-bold text-[#C8104F]">
                FREE GUIDANCE
              </span>

              <h2 className="mt-4 text-2xl font-extrabold text-[#0B2A47] sm:text-3xl">
                Talk to a school counsellor, free
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-6 text-[#55606D] sm:text-base">
                Share your mobile number and get help shortlisting schools by
                board, city and budget.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full">
              <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-lg sm:flex-row">
                <label className="sr-only" htmlFor="counsellor-mobile">
                  10-digit mobile number
                </label>

                <input
                  id="counsellor-mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                  }}
                  placeholder="10-digit mobile number"
                  className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-3 text-sm text-[#0B2A47] outline-none placeholder:text-[#98909A] focus:ring-2 focus:ring-[#F28CAE]"
                />

                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-[#0B2A47] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#0795DC] sm:px-6 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>Request a call</span>
                  <span>→</span>
                </button>
              </div>

              <p className="mt-2 text-xs leading-5 text-[#5C6875]">
                🔒 100% Free Service · Get callback from our senior school counsellor within 2-4 hours.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom decorative background */}
      
    </section>
  );
}
