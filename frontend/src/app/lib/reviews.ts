import type { School } from "../data/schools";

export function reviewSummary(schools: School[]) {
  const rated = schools.filter((s) => s.reviews > 0 && s.rating > 0);
  const total = rated.reduce((n, s) => n + s.reviews, 0);
  const avg = total ? rated.reduce((n, s) => n + s.rating * s.reviews, 0) / total : 0;
  return { total, avg: Math.round(avg * 10) / 10, rated };
}
