"use client";

import { useLocation } from "@/contexts/LocationContext";

export default function RadiusSelector() {
  const { radius, setRadius } = useLocation();

  return (
    <select
      value={radius}
      onChange={(e) => setRadius(Number(e.target.value))}
      className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-gray-200"
    >
      <option value={3}>3km</option>
      <option value={5}>5km</option>
      <option value={10}>10km</option>
      <option value={25}>25km</option>
      <option value={50}>50km</option>
      <option value={99999}>All</option>
    </select>
  );
}
