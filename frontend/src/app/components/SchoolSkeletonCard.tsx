export default function SchoolSkeletonCard() {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-3xl border border-[#E1E7EE] bg-white p-4 shadow-sm sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[260px_minmax(0,1fr)] xl:h-[220px] xl:grid-cols-[280px_minmax(0,1fr)_230px]">
        {/* Photo Skeleton */}
        <div className="relative h-52 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse md:h-[220px]">
          <div className="absolute left-3 top-3 h-6 w-20 rounded-lg bg-slate-200/70" />
          <div className="absolute bottom-3 right-3 h-6 w-20 rounded-lg bg-slate-200/70" />
        </div>

        {/* Details Skeleton */}
        <div className="flex min-w-0 flex-col justify-between py-1">
          <div>
            {/* School Name */}
            <div className="h-7 w-3/4 rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
            {/* Address */}
            <div className="mt-3 h-4 w-1/2 rounded-lg bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
            {/* Tags row */}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <div className="h-6 w-16 rounded-lg bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
              <div className="h-6 w-28 rounded-lg bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
              <div className="h-6 w-20 rounded-lg bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
              <div className="h-6 w-24 rounded-lg bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
            </div>
          </div>
          {/* Type & Gender */}
          <div className="mt-4 h-4 w-1/3 rounded-lg bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
        </div>

        {/* Price & Action Skeleton */}
        <div className="flex flex-col justify-between border-t border-[#E1E7EE] pt-5 md:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <div className="flex items-center justify-between xl:justify-end">
            <div className="h-7 w-20 rounded-lg bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
          </div>
          <div className="mt-4 xl:mt-0 xl:text-right">
            <div className="h-3 w-24 ml-auto rounded bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
            <div className="mt-1 h-8 w-36 ml-auto rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
          </div>
          <div className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
