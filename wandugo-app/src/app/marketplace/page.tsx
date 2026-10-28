"use client";

import { useState, useMemo } from "react";
import { useLocation } from "@/contexts/LocationContext";
import { haversineDistance } from "@/lib/utils";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import CategoryTabs from "@/components/CategoryTabs";
import RadiusSelector from "@/components/RadiusSelector";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import { useCategoryPosts } from "@/hooks/useCategoryPosts";

export default function MarketplacePage() {
  const { lat, lng, radius, loading: locationLoading } = useLocation();
  const { posts, loading } = useCategoryPosts("marketplace");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const filteredAndSorted = useMemo(() => {
    let result = posts;
    if (lat && lng) {
      result = result.filter(
        (p) => haversineDistance(lat, lng, p.lat, p.lng) <= radius,
      );
    }
    // Price filter
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
    return result;
  }, [posts, lat, lng, radius, priceMin, priceMax]);

  return (
    <>
      <Header />
      <div className="max-w-lg mx-auto px-4 py-4">
        <CategoryTabs />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              🛒 Marketplace
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Buy and sell nearby
            </p>
          </div>
          <RadiusSelector />
        </div>

        {/* Price Filter */}
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

        <Link
          href="/create?category=marketplace"
          className="block w-full text-center py-3 mb-4 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          + List an Item
        </Link>

        {loading || locationLoading ? (
          <LoadingSpinner />
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No items for sale nearby
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              List something!
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
