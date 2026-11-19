/* VidyaVista Boss Admin Dashboard: React (UMD) + Tailwind (CDN) + Chart.js. */
(function () {
  function startDashboard() {
    if (typeof React === "undefined" || typeof ReactDOM === "undefined" || typeof htm === "undefined") {
      setTimeout(startDashboard, 50);
      return;
    }

    const { useState, useEffect, useRef } = React;
    const html = htm.bind(React.createElement);
    const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
    const PALETTE = ["#0795DC", "#EC0E58", "#10B981", "#F59E0B", "#8B5CF6", "#0A5C91", "#06B6D4", "#94A3B8"];

    const ICONS = {
      school: "M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6",
      mail: "M3 6h18v12H3zM3 7l9 6 9-6",
      star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z",
      pin: "M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z",
      check: "M5 12.5l4.5 4.5L19 7.5",
      plus: "M12 5v14M5 12h14",
      upload: "M12 16V4m0 0l-4 4m4-4l4 4M4 20h16",
      arrow: "M5 12h14m0 0l-5-5m5 5l-5 5",
      sparkle: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z",
      inbox: "M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5",
      user: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
      bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
      key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
      shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    };
    const Icon = ({ name, className = "h-5 w-5" }) => html`
      <svg className=${className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d=${ICONS[name] || ICONS.sparkle} /></svg>`;

    const Card = ({ title, subtitle, badge, action, children, className = "" }) => html`
      <section className=${"rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md " + className}>
        ${(title || action) && html`
          <header className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">${title}</h3>
                  ${badge && html`<span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 border border-sky-100">${badge}</span>`}
                </div>
                ${subtitle && html`<p className="mt-0.5 text-xs text-slate-500">${subtitle}</p>`}
              </div>
            </div>
            ${action}
          </header>`}
        ${children}
      </section>`;

    const TONES = {
      blue: {
        icon: "bg-gradient-to-br from-sky-50 to-sky-100 text-[#0795DC] border border-sky-200/80 shadow-sm",
        border: "hover:border-sky-300",
        pill: "bg-sky-50 text-sky-700",
        dot: "bg-[#0795DC]",
      },
      pink: {
        icon: "bg-gradient-to-br from-rose-50 to-pink-100 text-[#EC0E58] border border-rose-200/80 shadow-sm",
        border: "hover:border-rose-300",
        pill: "bg-rose-50 text-rose-700",
        dot: "bg-[#EC0E58]",
      },
      amber: {
        icon: "bg-gradient-to-br from-amber-50 to-orange-100 text-amber-600 border border-amber-200/80 shadow-sm",
        border: "hover:border-amber-300",
        pill: "bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
      },
      green: {
        icon: "bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-600 border border-emerald-200/80 shadow-sm",
        border: "hover:border-emerald-300",
        pill: "bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
      },
      violet: {
        icon: "bg-gradient-to-br from-violet-50 to-purple-100 text-violet-600 border border-violet-200/80 shadow-sm",
        border: "hover:border-violet-300",
        pill: "bg-violet-50 text-violet-700",
        dot: "bg-violet-500",
      },
    };

    const Stat = ({ label, value, prefix = "", hint, icon, tone = "blue", href, trend, pendingCount }) => {
      const t = TONES[tone] || TONES.blue;
      return html`
        <a href=${href} className=${"group relative block overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg " + t.border}>
          <div className="flex items-center justify-between">
            <span className=${"flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105 " + t.icon}>
              <${Icon} name=${icon} className="h-5 w-5" />
            </span>
            <div className="flex items-center gap-1.5">
              ${pendingCount > 0 && html`
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  ${pendingCount} Pending
                </span>`}
              ${trend !== undefined && trend !== null && html`
                <span className=${"rounded-full px-2.5 py-0.5 text-xs font-bold " + (trend >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200")}>
                  ${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)}%
                </span>`}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black tracking-tight text-slate-900 group-hover:text-[#0795DC] transition-colors">
              ${prefix}${fmt(value)}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800">${label}</p>
            ${hint && html`
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                <span className=${"h-1.5 w-1.5 rounded-full shrink-0 " + t.dot}></span>
                <span className="truncate">${hint}</span>
              </p>`}
          </div>
        </a>`;
    };

    const Empty = ({ text = "No data yet" }) => html`
      <div className="flex h-48 flex-col items-center justify-center text-sm text-slate-400">
        <${Icon} name="inbox" className="h-8 w-8 text-slate-300 mb-2" />
        <span>${text}</span>
      </div>`;

    function ChartCanvas({ config, height = "h-64" }) {
      const ref = useRef(null);
      const key = JSON.stringify(config);
      useEffect(() => {
        if (typeof Chart === "undefined" || !ref.current) return;
        try {
          const chart = new Chart(ref.current, config);
          return () => chart.destroy();
        } catch (e) {
          console.error("Chart error:", e);
        }
      }, [key]);
      return html`<div className=${"relative " + height}><canvas ref=${ref}></canvas></div>`;
    }

    const hasData = (d) => d && d.values && d.values.some((v) => v > 0);
    const gridColor = "rgba(148,163,184,.14)";

    const lineConfig = (d) => ({
      type: "line",
      data: {
        labels: d.labels,
        datasets: [{
          label: "Enquiries",
          data: d.values,
          borderColor: "#0795DC",
          backgroundColor: "rgba(7,149,220,.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointBackgroundColor: "#0795DC",
          pointHoverRadius: 6,
          borderWidth: 2.5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0F172A",
            titleFont: { weight: "bold" },
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 10, color: "#94a3b8", font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { precision: 0, color: "#94a3b8", font: { size: 11 } }, grid: { color: gridColor } },
        },
      },
    });

    const doughnutConfig = (d) => ({
      type: "doughnut",
      data: {
        labels: d.labels,
        datasets: [{ data: d.values, backgroundColor: PALETTE, borderWidth: 2, borderColor: "#ffffff", hoverOffset: 8 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, color: "#475569", padding: 14, font: { weight: "600", size: 12 } },
          },
        },
      },
    });

    const STATUS_STYLE = {
      new: "bg-amber-50 text-amber-700 border border-amber-200",
      contacted: "bg-sky-50 text-sky-700 border border-sky-200",
      converted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      closed: "bg-slate-100 text-slate-600 border border-slate-200",
    };

    const ViewAll = ({ href }) => html`
      <a href=${href} className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 transition">
        View all <${Icon} name="arrow" className="h-3.5 w-3.5" />
      </a>`;

    function Skeleton() {
      const box = "animate-pulse rounded-2xl bg-slate-100";
      return html`<div className="space-y-6">
        <div className=${box + " h-32"}></div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">${[1, 2, 3, 4].map((i) => html`<div key=${i} className=${box + " h-36"}></div>`)}</div>
        <div className="grid gap-4 xl:grid-cols-3"><div className=${box + " h-80 xl:col-span-2"}></div><div className=${box + " h-80"}></div></div>
      </div>`;
    }

    function Dashboard() {
      const [data, setData] = useState(null);
      const [error, setError] = useState("");
      useEffect(() => {
        fetch(window.VV_DASH_URL || "/admin/dashboard-data/", { credentials: "same-origin" })
          .then((r) => { if (!r.ok) throw new Error("Server returned " + r.status); return r.json(); })
          .then(setData)
          .catch((e) => setError(e.message));
      }, []);

      if (error) return html`<${Card}><p className="text-sm font-semibold text-rose-600">Could not load the dashboard: ${error}</p><//>`;
      if (!data) return html`<${Skeleton} />`;

      const k = data.kpis, L = data.links;
      const trend = k.enquiriesPrev7 ? Math.round(((k.enquiries7 - k.enquiriesPrev7) / k.enquiriesPrev7) * 100) : null;
      const hour = new Date().getHours();
      const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

      return html`
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#091E33] via-[#0A5C91] to-[#0795DC] p-6 sm:p-7 text-white shadow-lg border border-sky-400/20">
            <div className="absolute right-0 top-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>

            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sky-200 backdrop-blur-md border border-white/10">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  VidyaVista Core Admin · Live Portal
                </div>
                <h1 className="mt-2.5 text-2xl sm:text-3xl font-black tracking-tight text-white">
                  ${greet}, <span className="text-sky-200">${data.user}</span>
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-sky-100 max-w-xl">
                  Master control center for school directory listings, owner approvals, parent leads, and membership subscriptions.
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/15 text-white flex items-center gap-1.5">
                    🏫 <strong className="text-sky-200">${fmt(k.schools)}</strong> Listed Schools
                  </span>
                  <span className="rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/15 text-white flex items-center gap-1.5">
                    👔 <strong className="text-sky-200">${fmt(k.schoolAccounts)}</strong> School Owners
                  </span>
                  <span className="rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/15 text-white flex items-center gap-1.5">
                    👨‍👩‍👧 <strong className="text-sky-200">${fmt(k.parentAccounts)}</strong> Parents
                  </span>
                  <span className="rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/15 text-white flex items-center gap-1.5">
                    📩 <strong className="text-sky-200">${fmt(k.enquiries)}</strong> Inquiries
                  </span>
                  <span className="rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/15 text-white flex items-center gap-1.5">
                    🎧 <strong className="text-sky-200">${fmt(k.counsellorLeads || 0)}</strong> Counsellor Leads
                  </span>
                </div>
              </div>

              <div className="relative flex flex-wrap gap-2.5">
                <a href=${L.createSchoolLogin} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-[#091E33] shadow-md hover:bg-sky-50 transition transform hover:-translate-y-0.5">
                  <${Icon} name="key" className="h-4 w-4 text-[#0795DC]" />Create School Login
                </a>
                <a href=${L.assignPlan} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#EC0E58] to-rose-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-rose-500/25 hover:opacity-95 transition transform hover:-translate-y-0.5">
                  <${Icon} name="bolt" className="h-4 w-4" />Assign Plan / 100 Leads
                </a>
                <a href=${L.addSchool} className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/30 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-white/20 transition">
                  <${Icon} name="plus" className="h-4 w-4" />Add School
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <${Stat}
              label="School Owners & Approvals"
              value=${k.schoolAccounts}
              pendingCount=${(k.pendingClaims || 0) + (k.pendingSchoolLinks || 0) + (k.pendingEdits || 0)}
              hint=${fmt(k.pendingClaims) + " owner · " + fmt(k.pendingSchoolLinks || 0) + " school · " + fmt(k.pendingEdits || 0) + " edits"}
              icon="school"
              tone="blue"
              href=${L.schoolAccounts}
            />
            <${Stat}
              label="Parent / Student Accounts"
              value=${k.parentAccounts}
              hint="Registered parents & admission preferences"
              icon="user"
              tone="pink"
              href=${L.parentAccounts}
            />
            <${Stat}
              label="Active Subscriptions"
              value=${k.activePlans}
              hint=${"₹" + fmt(k.totalRevenue) + " total (" + fmt(k.invoicesCount) + " GST invoices)"}
              icon="bolt"
              tone="green"
              href=${L.memberships}
            />
            <${Stat}
              label="Parent Leads / Inquiries"
              value=${k.enquiries}
              hint=${fmt(k.unlockedLeads) + " unlocked by schools · " + fmt(k.newEnquiries) + " new"}
              icon="mail"
              tone="violet"
              href=${L.enquiries}
              trend=${trend}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <${Stat}
              label="Total Listed Schools"
              value=${k.schools}
              hint=${fmt(k.active) + " active · +" + fmt(k.newSchools30) + " in 30 days"}
              icon="school"
              tone="blue"
              href=${L.schools}
            />
            <${Stat}
              label="Featured & Recommended"
              value=${k.featured + k.recommended}
              hint=${fmt(k.featured) + " featured · " + fmt(k.recommended) + " recommended"}
              icon="sparkle"
              tone="violet"
              href=${L.schools}
            />
            <${Stat}
              label="Reviews to Approve"
              value=${k.pendingReviews}
              pendingCount=${k.pendingReviews}
              hint=${fmt(k.approvedReviews) + " approved so far"}
              icon="star"
              tone="amber"
              href=${L.reviews}
            />
            <${Stat}
              label="GST Sales Revenue"
              value=${k.totalRevenue}
              prefix="₹"
              hint="Click to view & download GST Invoices"
              icon="check"
              tone="green"
              href=${L.invoices}
            />
          </div>

          <${Card} title="Quick Administration & Shortcuts" subtitle="Direct access to verifications, logins, pricing, invoices, and imports">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <a href=${L.schoolAccounts} className="flex items-center gap-2.5 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs font-bold text-sky-900 transition hover:bg-sky-100 hover:border-sky-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm"><${Icon} name="shield" className="h-4 w-4" /></span>
                <span>Owner & School Approvals</span>
              </a>
              <a href=${L.createSchoolLogin} className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100 hover:border-emerald-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm"><${Icon} name="key" className="h-4 w-4" /></span>
                <span>Create School Login</span>
              </a>
              <a href=${L.assignPlan} className="flex items-center gap-2.5 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs font-bold text-rose-900 transition hover:bg-rose-100 hover:border-rose-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EC0E58] text-white shadow-sm"><${Icon} name="bolt" className="h-4 w-4" /></span>
                <span>Assign Plan / 100 Leads</span>
              </a>
              <a href=${L.parentAccounts} className="flex items-center gap-2.5 rounded-xl border border-purple-100 bg-purple-50/60 p-3 text-xs font-bold text-purple-900 transition hover:bg-purple-100 hover:border-purple-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white shadow-sm"><${Icon} name="user" className="h-4 w-4" /></span>
                <span>Parent Accounts (${fmt(k.parentAccounts)})</span>
              </a>
              <a href=${L.plans} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs font-bold text-slate-800 transition hover:bg-slate-100">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-white shadow-sm"><${Icon} name="sparkle" className="h-4 w-4" /></span>
                <span>Membership Plans & Pricing</span>
              </a>
              <a href=${L.invoices} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs font-bold text-slate-800 transition hover:bg-slate-100">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm"><${Icon} name="check" className="h-4 w-4" /></span>
                <span>GST Invoices & Sales</span>
              </a>
              <a href=${L.users} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs font-bold text-slate-800 transition hover:bg-slate-100">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white shadow-sm"><${Icon} name="key" className="h-4 w-4" /></span>
                <span>Reset User Passwords</span>
              </a>
              <a href=${L.counsellorLeads} className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs font-bold text-amber-950 transition hover:bg-amber-100 hover:border-amber-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white shadow-sm"><${Icon} name="sparkle" className="h-4 w-4" /></span>
                <span>Counsellor Leads (${fmt(k.counsellorLeads || 0)})</span>
              </a>
              <a href=${L.importCsv} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs font-bold text-slate-800 transition hover:bg-slate-100">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm"><${Icon} name="upload" className="h-4 w-4" /></span>
                <span>Import Schools (CSV)</span>
              </a>
            </div>
          <//>

          <div className="grid gap-4 xl:grid-cols-3">
            <${Card}
              title="Parent Inquiries & Leads Activity"
              subtitle="Daily admission lead volume over the last 30 days"
              className="xl:col-span-2"
              action=${html`<${ViewAll} href=${L.enquiries} />`}
            >
              ${hasData(data.enquiriesDaily) ? html`<${ChartCanvas} config=${lineConfig(data.enquiriesDaily)} />` : html`<${Empty} text="No enquiries in the last 30 days" />`}
            <//>
            <${Card} title="Lead Status Breakdown" subtitle="Distribution across all student inquiries">
              ${hasData(data.enquiryStatus) ? html`<${ChartCanvas} config=${doughnutConfig(data.enquiryStatus)} />` : html`<${Empty} />`}
            <//>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <${Card}
              title="Recent Parent Leads"
              subtitle="Latest incoming inquiries with contact access status"
              className="xl:col-span-2"
              action=${html`<${ViewAll} href=${L.enquiries} />`}
            >
              ${data.recentEnquiries.length === 0 ? html`<${Empty} text="No enquiries yet" />` : html`
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3 pr-3">Parent</th>
                        <th className="pb-3 pr-3">Target School</th>
                        <th className="pb-3 pr-3">Mobile</th>
                        <th className="pb-3 pr-3">Access Status</th>
                        <th className="pb-3 text-right">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      ${data.recentEnquiries.map((e, i) => html`
                        <tr key=${i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 pr-3 font-semibold text-slate-900">
                            <a href=${e.url} className="hover:text-sky-600 transition">${e.name}</a>
                            ${e.cls && html`<span className="block text-xs font-normal text-slate-400">${e.cls}</span>`}
                          </td>
                          <td className="max-w-[200px] truncate py-3 pr-3 text-xs font-medium text-slate-600">${e.school}</td>
                          <td className="py-3 pr-3 font-mono text-xs text-slate-600">${e.mobile}</td>
                          <td className="py-3 pr-3">
                            <span className=${"rounded-full px-2.5 py-0.5 text-xs font-bold " + (STATUS_STYLE[e.statusKey] || STATUS_STYLE.closed)}>
                              ${e.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap py-3 text-right text-xs text-slate-400">${e.date}</td>
                        </tr>`)}
                    </tbody>
                  </table>
                </div>`}
            <//>

            <div className="space-y-4">
              <${Card}
                title="Reviews to Approve"
                badge=${k.pendingReviews > 0 ? k.pendingReviews + " new" : null}
                action=${html`<${ViewAll} href=${L.reviews} />`}
              >
                ${data.pendingReviews.length === 0 ? html`
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <${Icon} name="check" className="h-4 w-4" />All reviews are approved & live!
                  </div>` : html`
                  <ul className="space-y-2.5">
                    ${data.pendingReviews.map((r, i) => html`
                      <li key=${i} className="rounded-xl border border-slate-100 p-3 hover:border-sky-300 hover:bg-sky-50/30 transition">
                        <a href=${r.url} className="block">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800">${r.who}</span>
                            <span className="text-xs font-bold text-amber-500">${"★".repeat(r.rating)}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">${r.school}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-600">${r.text}</p>
                        </a>
                      </li>`)}
                  </ul>`}
              <//>

              <${Card} title="Recently Listed Schools" action=${html`<${ViewAll} href=${L.schools} />`}>
                ${data.recentSchools.length === 0 ? html`<${Empty} />` : html`
                  <ul className="divide-y divide-slate-100">
                    ${data.recentSchools.map((s, i) => html`
                      <li key=${i} className="py-2.5 first:pt-0 last:pb-0">
                        <a href=${s.url} className="block hover:text-sky-700 transition">
                          <p className="truncate text-xs font-bold text-slate-800">${s.name}</p>
                          <p className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-400">
                            <span className="truncate">${s.place} · <span className="font-semibold text-slate-500">${s.board}</span></span>
                            <span className="shrink-0 text-[11px]">${s.date}</span>
                          </p>
                        </a>
                      </li>`)}
                  </ul>`}
              <//>
            </div>
          </div>
        </div>`;
    }

    const mount = () => {
      const rootEl = document.getElementById("vv-dash-root");
      if (!rootEl) return;
      try {
        ReactDOM.createRoot(rootEl).render(html`<${Dashboard} />`);
      } catch (err) {
        console.error("Dashboard mounting error:", err);
        rootEl.innerHTML = '<div style="padding:20px;margin:16px;background:#fee2e2;border:1px solid #ef4444;border-radius:12px;color:#991b1b;font-weight:bold;">Dashboard Error: ' + err.message + '</div>';
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
  }

  startDashboard();
})();
