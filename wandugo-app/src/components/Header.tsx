"use client";

import Link from "next/link";
import { useLocation } from "@/contexts/LocationContext";

export default function Header() {
  const { radius, setRadius } = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">
            WanduGo
          </Link>
          <div className="flex items-center gap-2">
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white"
            >
              <option value={3}>3km</option>
              <option value={5}>5km</option>
              <option value={10}>10km</option>
              <option value={25}>25km</option>
              <option value={50}>50km</option>
            </select>
            <Link href="/notifications" className="relative p-2">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
