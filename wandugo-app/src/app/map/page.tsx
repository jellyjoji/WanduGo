"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLocation } from "@/contexts/LocationContext";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import {
  haversineDistance,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/utils";
import type { Post } from "@/types/database";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

export default function MapPage() {
  const { lat, lng, radius } = useLocation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const mapRef = useRef<HTMLDivElement>(null);
  const center = lat && lng ? { lat, lng } : null;
  const { map, mapsApi } = useGoogleMaps(mapRef, center);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) setPosts(data as Post[]);
    }
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!map || !mapsApi || !lat || !lng) return;

    // Clear existing markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    // Counter-filter cancels out the CSS invert applied to the map container.
    // filter and background must be merged into a single style attribute.
    const filterStyle = 'filter:invert(90%) hue-rotate(180deg);';
    const markerStyle = isDark
      ? `${filterStyle}background:#1e293b;color:#f1f5f9;border-color:#475569;`
      : 'background:#ffffff;color:#1f2937;border-color:#e5e7eb;';
    const dotStyle = isDark
      ? `${filterStyle}background:#2563eb;border-color:#1e293b;`
      : 'background:#2563eb;border-color:#ffffff;';

    // Add user marker
    const userEl = document.createElement("div");
    userEl.innerHTML =
      `<div class="w-4 h-4 rounded-full border-2 shadow-lg" style="${dotStyle}"></div>`;
    const userMarker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat, lng },
      content: userEl,
      title: "Your location",
    });
    markersRef.current.push(userMarker);

    // Filter posts by radius
    const nearbyPosts = posts.filter(
      (p) => haversineDistance(lat, lng, p.lat, p.lng) <= radius,
    );

    nearbyPosts.forEach((post) => {
      const el = document.createElement("div");
      el.innerHTML = `<div class="rounded-lg shadow-md px-2 py-1 text-xs font-medium border cursor-pointer hover:shadow-lg transition-shadow" style="${markerStyle}">${post.title.slice(0, 20)}${post.title.length > 20 ? "..." : ""}</div>`;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: post.lat, lng: post.lng },
        content: el,
        title: post.title,
      });

      marker.addListener("gmp-click", () => {
        setSelectedPost(post);
      });

      markersRef.current.push(marker);
    });
  }, [map, mapsApi, posts, lat, lng, radius, isDark]);

  return (
    <>
      <Header />
      <div className="relative" style={{ height: "calc(100vh - 64px - 64px)" }}>
        <div
          ref={mapRef}
          className="w-full h-full"
          style={isDark ? { filter: "invert(90%) hue-rotate(180deg)" } : undefined}
        />

        {!center && <LoadingSpinner />}

        {/* Selected Post Card */}
        {selectedPost && (
          <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-slate-900 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-2 right-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_COLORS[selectedPost.category] || "bg-gray-100"}`}
            >
              {CATEGORY_LABELS[selectedPost.category]}
            </span>
            <h3 className="font-semibold mt-2 mb-1">{selectedPost.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {selectedPost.content}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedPost.location_text}
              </span>
              <Link
                href={`/post/${selectedPost.id}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View Details →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
