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

export default function FeedPage() {
  const { lat, lng, radius, loading: locationLoading } = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("latest");
  const [profileMap, setProfileMap] = useState<Record<string, ProfileSnippet | null>>({});

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
  }, [category]);

  const filteredAndSorted = useMemo(() => {
    let result = posts;

    // Filter by distance
    if (lat && lng) {
      result = result.filter((post) => {
        const dist = haversineDistance(lat, lng, post.lat, post.lng);
        return dist <= radius;
      });
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
  }, [posts, lat, lng, radius, sort]);

  return (
    <>
      <Header />
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Quick Navigation */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { href: "/jobs", label: "Jobs", emoji: "💼" },
            { href: "/community", label: "Community", emoji: "👥" },
            { href: "/marketplace", label: "Market", emoji: "🛒" },
            { href: "/map", label: "Map", emoji: "🗺️" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-2xl mb-1">{item.emoji}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4">
          <CategoryFilter selected={category} onChange={setCategory} />
        </div>

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
              href="/create"
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
