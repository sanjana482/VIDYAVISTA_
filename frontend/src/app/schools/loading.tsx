import Navbar from "../components/Navbar";
import SchoolSkeletonCard from "../components/SchoolSkeletonCard";

export default function SchoolsLoading() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      {/* Hero skeleton */}
      <section className="relative bg-gradient-to-br from-[#E6F4FC] via-white to-[#FDE8EF] px-5 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="h-4 w-32 rounded bg-slate-200/80 animate-pulse" />
          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="h-6 w-44 rounded-full bg-slate-200/80 animate-pulse" />
              <div className="mt-5 h-12 w-3/4 rounded-2xl bg-slate-200/80 animate-pulse" />
              <div className="mt-4 h-5 w-full max-w-xl rounded-lg bg-slate-200/80 animate-pulse" />
              <div className="mt-6 flex gap-3">
                <div className="h-9 w-28 rounded-full bg-slate-200/80 animate-pulse" />
                <div className="h-9 w-28 rounded-full bg-slate-200/80 animate-pulse" />
              </div>
            </div>
            <div className="h-64 w-full rounded-3xl bg-slate-200/60 animate-pulse" />
          </div>
          {/* Search bar placeholder */}
          <div className="mt-8 mx-auto max-w-2xl">
            <div className="h-14 w-full rounded-full bg-slate-200/80 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Results & filters skeleton */}
      <section className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar skeleton */}
          <div className="hidden lg:block space-y-6">
            <div className="h-8 w-32 rounded bg-slate-200 animate-pulse" />
            <div className="h-48 w-full rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-32 w-full rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-40 w-full rounded-2xl bg-slate-100 animate-pulse" />
          </div>

          {/* Cards skeleton */}
          <div className="space-y-5">
            <div className="flex justify-between items-center pb-2">
              <div className="h-8 w-60 rounded bg-slate-200 animate-pulse" />
              <div className="h-10 w-36 rounded-xl bg-slate-200 animate-pulse" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <SchoolSkeletonCard key={i} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
