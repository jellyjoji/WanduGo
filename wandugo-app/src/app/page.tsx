"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useLocation } from "@/contexts/LocationContext";
import { haversineDistance } from "@/lib/utils";
import type { Post } from "@/types/database";
import { getProfiles } from "@/lib/profileCache";
import type { ProfileSnippet } from "@/lib/profileCache";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import CategoryFilter from "@/components/CategoryFilter";
import SortSelector from "@/components/SortSelector";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

const GROUPS: Record<string, { label: string; emoji: string; categories: string[] }> = {
  jobs: { label: "Jobs", emoji: "💼", categories: ["jobs"] },
  community: {
    label: "Community",
    emoji: "👥",
    categories: ["community", "housing", "events", "tips"],
  },
  marketplace: {
    label: "Market",
    emoji: "🛒",
    categories: ["marketplace", "buy-sell", "group-buy"],
  },
};

export default function FeedPage() {
  const { lat, lng, radius, loading: locationLoading } = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("latest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [profileMap, setProfileMap] = useState<Record<string, ProfileSnippet | null>>({});

  // Read ?group= on mount (client-only, avoids forcing a Suspense/dynamic
  // render of the whole feed just for a rarely-used deep link)
  useEffect(() => {
    const initialGroup = new URLSearchParams(window.location.search).get(
      "group",
    );
    if (initialGroup && initialGroup in GROUPS) {
      setGroup(initialGroup);
    }
  }, []);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (category !== "all") {
        query = query.eq("category", category);
      } else if (group !== "all") {
        query = query.in("category", GROUPS[group].categories);
      }

      const { data, error } = await query;
      if (!error && data) {
        setPosts(data as Post[]);
        // Batch-fetch profiles so author names/photos are always current
        const sessionIds = [...new Set(data.map((p) => p.session_id))];
        getProfiles(sessionIds).then(setProfileMap);
      }
      setLoading(false);
    }
    fetchPosts();
  }, [group, category]);

  const filteredAndSorted = useMemo(() => {
    let result = posts;

    // Filter by distance
    if (lat && lng) {
      result = result.filter((post) => {
        const dist = haversineDistance(lat, lng, post.lat, post.lng);
        return dist <= radius;
      });
    }

    // Price filter (marketplace group only)
    if (priceMin) {
      result = result.filter(
        (p) => p.price !== null && p.price >= parseFloat(priceMin),
      );
    }
    if (priceMax) {
      result = result.filter(
        (p) => p.price !== null && p.price <= parseFloat(priceMax),
      );
    }

    // Sort
    if (sort === "distance" && lat && lng) {
      result = [...result].sort((a, b) => {
        const distA = haversineDistance(lat, lng, a.lat, a.lng);
        const distB = haversineDistance(lat, lng, b.lat, b.lng);
        return distA - distB;
      });
    } else if (sort === "popular") {
      result = [...result].sort((a, b) => b.likes - a.likes);
    }

    return result;
  }, [posts, lat, lng, radius, sort, priceMin, priceMax]);

  const effectiveCategory = category !== "all" ? category : group !== "all" ? group : "all";

  return (
    <>
      <Header />
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Group filter (All / Jobs / Community / Market) */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => {
                setGroup("all");
                setCategory("all");
              }}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                group === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600"
              }`}
            >
              All
            </button>
            {Object.entries(GROUPS).map(([key, g]) => (
              <button
                key={key}
                onClick={() => {
                  setGroup(key);
                  setCategory("all");
                }}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  group === key
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600"
                }`}
              >
                {g.emoji} {g.label}
              </button>
            ))}
          </div>
          <Link
            href="/map"
            className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600"
          >
            🗺️ Map
          </Link>
        </div>

        {/* Sub-category filter, only when a group with multiple categories is selected */}
        {group !== "all" && GROUPS[group].categories.length > 1 && (
          <div className="mb-3">
            <CategoryFilter
              selected={category}
              onChange={setCategory}
              categories={GROUPS[group].categories}
            />
          </div>
        )}

        {/* Price filter, marketplace group only */}
        {group === "marketplace" && (
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              placeholder="Min $"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Max $"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Nearby Posts
          </h2>
          <SortSelector value={sort} onChange={setSort} />
        </div>

        {/* Posts */}
        {loading ? (
          <LoadingSpinner />
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No posts found nearby
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Try increasing the search radius or be the first to post!
            </p>
            <Link
              href={
                effectiveCategory !== "all"
                  ? `/create?category=${effectiveCategory}`
                  : "/create"
              }
              className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Create Post
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSorted.map((post) => (
              <PostCard key={post.id} post={post} authorProfile={profileMap[post.session_id]} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
