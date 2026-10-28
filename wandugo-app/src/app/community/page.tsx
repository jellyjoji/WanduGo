"use client";

import { useMemo } from "react";
import { useLocation } from "@/contexts/LocationContext";
import { haversineDistance } from "@/lib/utils";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import CategoryTabs from "@/components/CategoryTabs";
import RadiusSelector from "@/components/RadiusSelector";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import { useCategoryPosts } from "@/hooks/useCategoryPosts";

export default function CommunityPage() {
  const { lat, lng, radius, loading: locationLoading } = useLocation();
  const { posts, loading } = useCategoryPosts("community");

  const filteredAndSorted = useMemo(() => {
    let result = posts;
    if (lat && lng) {
      result = result.filter(
        (p) => haversineDistance(lat, lng, p.lat, p.lng) <= radius,
      );
    }
    return result;
  }, [posts, lat, lng, radius]);

  return (
    <>
      <Header />
      <div className="max-w-lg mx-auto px-4 py-4">
        <CategoryTabs />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              👥 Community
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connect with people nearby
            </p>
          </div>
          <RadiusSelector />
        </div>

        <Link
          href="/create?category=community"
          className="block w-full text-center py-3 mb-4 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          + Create Post
        </Link>

        {loading || locationLoading ? (
          <LoadingSpinner />
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No community posts nearby
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSorted.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
