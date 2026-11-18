"use client";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

export type ListingInitial = {
  type?: string; city?: string; state?: string;
  area?: string; board?: string; gender?: string; min?: string; max?: string;
};

/** ?filters ya clean URL (/day-schools/mumbai/board/cbse) se aane wale filters, dono ek saath */
export function useListingParams(initial?: ListingInitial): URLSearchParams {
  const sp = useSearchParams();
  const key = sp.toString();
  const ini = JSON.stringify(initial ?? {});
  return useMemo(() => {
    const merged = new URLSearchParams(key);
    const base = JSON.parse(ini) as ListingInitial;
    (Object.keys(base) as (keyof ListingInitial)[]).forEach((k) => {
      if (base[k]) merged.set(k, base[k]!);
    });
    return merged;
  }, [key, ini]);
}
