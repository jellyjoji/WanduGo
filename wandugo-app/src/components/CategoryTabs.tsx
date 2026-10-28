"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/community", label: "Community", emoji: "👥" },
  { href: "/jobs", label: "Jobs", emoji: "💼" },
  { href: "/marketplace", label: "Market", emoji: "🛒" },
  { href: "/housing", label: "Housing", emoji: "🏠" },
];

export default function CategoryTabs() {
  const pathname = usePathname();

  return (
    <div className="flex border-b border-gray-200 dark:border-slate-700 mb-4">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 border-b-2 transition-colors ${
              active
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <span className="text-xl">{tab.emoji}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
