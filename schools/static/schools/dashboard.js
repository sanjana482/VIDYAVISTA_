/* VidyaVista Boss Admin Dashboard: React (UMD) + Tailwind (CDN) + Chart.js. */
(function () {
  const { useState, useEffect, useRef } = React;
  const html = htm.bind(React.createElement);
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
  const PALETTE = ["#0795DC", "#EC0E58", "#6ABEEE", "#F5A623", "#0A5C91", "#8B5CF6", "#10B981", "#94A3B8"];

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
  };
  const Icon = ({ name, className = "h-5 w-5" }) => html`
    <svg className=${className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d=${ICONS[name] || ICONS.sparkle} /></svg>`;

  const Card = ({ title, subtitle, action, children, className = "" }) => html`
    <section className=${"rounded-2xl border border-slate-200 bg-white p-5 shadow-sm " + className}>
      ${(title || action) && html`
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">${title}</h3>
            ${subtitle && html`<p className="mt-0.5 text-xs text-slate-500">${subtitle}</p>`}
          </div>
          ${action}
        </header>`}
      ${children}
    </section>`;

  const TONES = {
    blue: "bg-sky-50 text-sky-600",
    pink: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };
  const Stat = ({ label, value, prefix = "", hint, icon, tone = "blue", href, trend }) => html`
    <a href=${href} className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className=${"flex h-10 w-10 items-center justify-center rounded-xl " + TONES[tone]}><${Icon} name=${icon} /></span>
        ${trend !== undefined && trend !== null && html`
          <span className=${"rounded-full px-2 py-0.5 text-xs font-semibold " + (trend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
            ${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)}%
          </span>`}
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">${prefix}${fmt(value)}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">${label}</p>
      ${hint && html`<p className="mt-0.5 text-xs text-slate-400">${hint}</p>`}
    </a>`;

  const Empty = ({ text = "No data yet" }) => html`<div className="flex h-48 items-center justify-center text-sm text-slate-400">${text}</div>`;

  function ChartCanvas({ config, height = "h-64" }) {
    const ref = useRef(null);
    const key = JSON.stringify(config);
    useEffect(() => {
      const chart = new Chart(ref.current, config);
      return () => chart.destroy();
    }, [key]);
    return html`<div className=${"relative " + height}><canvas ref=${ref}></canvas></div>`;
  }

  const hasData = (d) => d && d.values && d.values.some((v) => v > 0);
  const gridColor = "rgba(148,163,184,.18)";
  const lineConfig = (d) => ({
    type: "line",
    data: {
      labels: d.labels,
      datasets: [{ label: "Enquiries", data: d.values, borderColor: "#0795DC", backgroundColor: "rgba(7,149,220,.12)", fill: true, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: "#94a3b8" } }, y: { beginAtZero: true, ticks: { precision: 0, color: "#94a3b8" }, grid: { color: gridColor } } },
    },
  });
  const doughnutConfig = (d) => ({
    type: "doughnut",
    data: { labels: d.labels, datasets: [{ data: d.values, backgroundColor: PALETTE, borderWidth: 0, hoverOffset: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "66%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, color: "#475569" } } } },
  });
  const barConfig = (d) => ({
    type: "bar",
    data: { labels: d.labels, datasets: [{ data: d.values, backgroundColor: "#0795DC", borderRadius: 6, barThickness: 16 }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0, color: "#94a3b8" }, grid: { color: gridColor } }, y: { grid: { display: false }, ticks: { color: "#475569" } } },
    },
  });

  const STATUS_STYLE = {
    new: "bg-amber-50 text-amber-700", contacted: "bg-sky-50 text-sky-700",
    converted: "bg-emerald-50 text-emerald-700", closed: "bg-slate-100 text-slate-600",
  };
  const ViewAll = ({ href }) => html`<a href=${href} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800">View all <${Icon} name="arrow" className="h-3.5 w-3.5" /></a>`;
  const Button = ({ href, icon, children, primary }) => html`
    <a href=${href} className=${"inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition " + (primary ? "bg-sky-600 text-white shadow-sm hover:bg-sky-700" : "border border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700")}>
      <${Icon} name=${icon} className="h-4 w-4" />${children}
    </a>`;

  function Skeleton() {
    const box = "animate-pulse rounded-2xl bg-slate-100";
    return html`<div className="space-y-6">
      <div className=${box + " h-24"}></div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">${[1, 2, 3, 4].map((i) => html`<div key=${i} className=${box + " h-36"}></div>`)}</div>
      <div className="grid gap-4 xl:grid-cols-3"><div className=${box + " h-80 xl:col-span-2"}></div><div className=${box + " h-80"}></div></div>
    </div>`;
  }

  function Dashboard() {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
      fetch(window.VV_DASH_URL, { credentials: "same-origin" })
        .then((r) => { if (!r.ok) throw new Error("Server returned " + r.status); return r.json(); })
        .then(setData)
        .catch((e) => setError(e.message));
    }, []);

    if (error) return html`<${Card}><p className="text-sm text-rose-600">Could not load the dashboard: ${error}</p><//>`;
    if (!data) return html`<${Skeleton} />`;

    const k = data.kpis, L = data.links;
    const trend = k.enquiriesPrev7 ? Math.round(((k.enquiries7 - k.enquiriesPrev7) / k.enquiriesPrev7) * 100) : null;
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    return html`
      <div className="space-y-6">
        <!-- header -->
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#0A5C91] via-[#0795DC] to-sky-500 p-6 text-white shadow-sm">
          <div>
            <p className="text-sm text-sky-100">${greet}, ${data.user} (Administrator)</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">VidyaVista Administration Portal</h1>
            <p className="mt-1 text-sm text-sky-100">${fmt(k.schools)} Schools · ${fmt(k.schoolAccounts)} School Owners · ${fmt(k.parentAccounts)} Parents · ${fmt(k.enquiries)} Leads</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href=${L.createSchoolLogin} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0A5C91] shadow-sm hover:bg-sky-50"><${Icon} name="key" className="h-4 w-4" />Create School Login</a>
            <a href=${L.assignPlan} className="inline-flex items-center gap-2 rounded-xl bg-[#EC0E58] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-95"><${Icon} name="bolt" className="h-4 w-4" />Assign Plan / 100 Leads</a>
            <a href=${L.addSchool} className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"><${Icon} name="plus" className="h-4 w-4" />Add School</a>
          </div>
        </div>

        <!-- KPIs Row 1: Portal Accounts, Plans & Leads -->
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <${Stat} label="School Owners & Approvals" value=${k.schoolAccounts} hint=${fmt(k.pendingClaims) + " owner pending · " + fmt(k.pendingSchoolLinks || 0) + " school pending · " + fmt(k.pendingEdits || 0) + " edits pending"} icon="school" tone="blue" href=${L.schoolAccounts} />
          <${Stat} label="Parent / Student Accounts" value=${k.parentAccounts} hint="Registered parents & education preferences" icon="user" tone="pink" href=${L.parentAccounts} />
          <${Stat} label="Active Subscriptions" value=${k.activePlans} hint=${"Rs. " + fmt(k.totalRevenue) + " total revenue (" + fmt(k.invoicesCount) + " GST invoices)"} icon="bolt" tone="green" href=${L.memberships} />
          <${Stat} label="Parent Leads / Enquiries" value=${k.enquiries} hint=${fmt(k.unlockedLeads) + " unlocked by schools · " + fmt(k.newEnquiries) + " new"} icon="mail" tone="violet" href=${L.enquiries} trend=${trend} />
        </div>

        <!-- KPIs Row 2: Directory Stats -->
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <${Stat} label="Total Listed Schools" value=${k.schools} hint=${fmt(k.active) + " active · +" + fmt(k.newSchools30) + " in 30 days"} icon="school" tone="blue" href=${L.schools} />
          <${Stat} label="Featured & Recommended" value=${k.featured + k.recommended} hint=${fmt(k.featured) + " featured · " + fmt(k.recommended) + " recommended"} icon="sparkle" tone="violet" href=${L.schools} />
          <${Stat} label="Reviews to Approve" value=${k.pendingReviews} hint=${fmt(k.approvedReviews) + " approved so far"} icon="star" tone="amber" href=${L.reviews} />
          <${Stat} label="GST Sales Revenue" value=${k.totalRevenue} prefix="Rs. " hint="Click to view & print GST Invoices" icon="check" tone="green" href=${L.invoices} />
        </div>

        <!-- Quick Actions -->
        <${Card} title="Quick Administration Actions (Approvals, Passwords, Plans & Leads)">
          <div className="flex flex-wrap gap-2.5">
            <${Button} href=${L.schoolAccounts} icon="check" primary=${true}>Review Owner, School & Edit Approvals<//>
            <${Button} href=${L.createSchoolLogin} icon="key" primary=${true}>Create Login ID/Password for a School<//>
            <${Button} href=${L.assignPlan} icon="bolt">Assign 1-Year Plan / +100 Lead Top-up<//>
            <${Button} href=${L.parentAccounts} icon="user">All Parent Accounts (${fmt(k.parentAccounts)})<//>
            <${Button} href=${L.plans} icon="sparkle">Edit Plans & Pricing<//>
            <${Button} href=${L.invoices} icon="check">GST Invoices & Sales CSV<//>
            <${Button} href=${L.users} icon="key">Reset Any User Password<//>
            <${Button} href=${L.importCsv} icon="upload">Import Schools (CSV)<//>
          </div>
        <//>

        <!-- charts row 1 -->
        <div className="grid gap-4 xl:grid-cols-3">
          <${Card} title="Parent Leads / Enquiries" subtitle="Last 30 days" className="xl:col-span-2" action=${html`<${ViewAll} href=${L.enquiries} />`}>
            ${hasData(data.enquiriesDaily) ? html`<${ChartCanvas} config=${lineConfig(data.enquiriesDaily)} />` : html`<${Empty} text="No enquiries in the last 30 days" />`}
          <//>
          <${Card} title="Enquiry status" subtitle="All time">
            ${hasData(data.enquiryStatus) ? html`<${ChartCanvas} config=${doughnutConfig(data.enquiryStatus)} />` : html`<${Empty} />`}
          <//>
        </div>

        <!-- tables -->
        <div className="grid gap-4 xl:grid-cols-3">
          <${Card} title="Recent Parent Leads (Masked vs Unlocked)" className="xl:col-span-2" action=${html`<${ViewAll} href=${L.enquiries} />`}>
            ${data.recentEnquiries.length === 0 ? html`<${Empty} text="No enquiries yet" />` : html`
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-3 font-semibold">Parent</th><th className="pb-2 pr-3 font-semibold">School</th>
                    <th className="pb-2 pr-3 font-semibold">Mobile</th><th className="pb-2 pr-3 font-semibold">Lead Status</th><th className="pb-2 font-semibold">Received</th>
                  </tr></thead>
                  <tbody>
                    ${data.recentEnquiries.map((e, i) => html`
                      <tr key=${i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="py-2.5 pr-3 font-medium"><a href=${e.url} className="text-slate-900 hover:text-sky-700">${e.name}</a>${e.cls && html`<span className="block text-xs font-normal text-slate-400">${e.cls}</span>`}</td>
                        <td className="max-w-[220px] truncate py-2.5 pr-3 text-slate-600">${e.school}</td>
                        <td className="py-2.5 pr-3 text-slate-600">${e.mobile}</td>
                        <td className="py-2.5 pr-3"><span className=${"rounded-full px-2 py-0.5 text-xs font-semibold " + (STATUS_STYLE[e.statusKey] || STATUS_STYLE.closed)}>${e.status}</span></td>
                        <td className="whitespace-nowrap py-2.5 text-slate-500">${e.date}</td>
                      </tr>`)}
                  </tbody>
                </table>
              </div>`}
          <//>

          <div className="space-y-4">
            <${Card} title="Reviews waiting for approval" action=${html`<${ViewAll} href=${L.reviews} />`}>
              ${data.pendingReviews.length === 0 ? html`<p className="flex items-center gap-2 text-sm text-emerald-600"><${Icon} name="check" className="h-4 w-4" />All caught up</p>` : html`
                <ul className="space-y-3">
                  ${data.pendingReviews.map((r, i) => html`
                    <li key=${i} className="rounded-xl border border-slate-100 p-3 hover:border-sky-200">
                      <a href=${r.url} className="block">
                        <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-800">${r.who}</span><span className="text-xs font-semibold text-amber-600">${"★".repeat(r.rating)}</span></div>
                        <p className="mt-0.5 truncate text-xs text-slate-400">${r.school}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600">${r.text}</p>
                      </a>
                    </li>`)}
                </ul>`}
            <//>
            <${Card} title="Recently added schools" action=${html`<${ViewAll} href=${L.schools} />`}>
              ${data.recentSchools.length === 0 ? html`<${Empty} />` : html`
                <ul className="divide-y divide-slate-100">
                  ${data.recentSchools.map((s, i) => html`
                    <li key=${i} className="py-2.5 first:pt-0 last:pb-0">
                      <a href=${s.url} className="block hover:text-sky-700">
                        <p className="truncate text-sm font-semibold text-slate-800">${s.name}</p>
                        <p className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-400"><span className="truncate">${s.place} · ${s.board}</span><span className="shrink-0">${s.date}</span></p>
                      </a>
                    </li>`)}
                </ul>`}
            <//>
          </div>
        </div>
      </div>`;
  }

  ReactDOM.createRoot(document.getElementById("vv-dash-root")).render(html`<${Dashboard} />`);
})();
