"use client";

import { CATEGORY_LABELS } from "@/lib/utils";

interface CategoryFilterProps {
  selected: string;
  onChange: (category: string) => void;
  categories?: string[];
}

export default function CategoryFilter({
  selected,
  onChange,
  categories,
}: CategoryFilterProps) {
  const cats = categories || Object.keys(CATEGORY_LABELS);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onChange("all")}
        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          selected === "all"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-600 border border-gray-200"
        }`}
      >
        All
      </button>
      {cats.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selected === cat
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 border border-gray-200"
          }`}
        >
          {CATEGORY_LABELS[cat] || cat}
        </button>
      ))}
    </div>
  );
}
