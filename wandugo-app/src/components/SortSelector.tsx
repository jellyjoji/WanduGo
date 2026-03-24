"use client";

interface SortSelectorProps {
  value: string;
  onChange: (sort: string) => void;
}

export default function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-gray-200"
    >
      <option value="latest">Latest</option>
      <option value="distance">Nearest</option>
      <option value="popular">Popular</option>
    </select>
  );
}
