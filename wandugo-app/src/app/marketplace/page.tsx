"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useLocation } from "@/contexts/LocationContext";
import { haversineDistance } from "@/lib/utils";
import type { Post } from "@/types/database";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import CategoryFilter from "@/components/CategoryFilter";
import SortSelector from "@/components/SortSelector";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

const marketCategories = ["marketplace", "buy-sell", "group-buy"];

export default function MarketplacePage() {
  const { lat, lng, radius, loading: locationLoading } = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("latest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      let query = supabase
        .from("posts")
        .select("*")
        .in("category", marketCategories)
        .order("created_at", { ascending: false })
        .limit(50);

      if (category !== "all") {
        query = supabase
          .from("posts")
          .select("*")
          .eq("category", category)
          .order("created_at", { ascending: false })
          .limit(50);
      }

      const { data } = await query;
      if (data) setPosts(data as Post[]);
      setLoading(false);
    }
    fetchPosts();
  }, [category]);

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
    if (sort === "distance" && lat && lng) {
      result = [...result].sort(
        (a, b) =>
          haversineDistance(lat, lng, a.lat, a.lng) -
          haversineDistance(lat, lng, b.lat, b.lng),
      );
    } else if (sort === "popular") {
      result = [...result].sort((a, b) => b.likes - a.likes);
    }
    return result;
  }, [posts, lat, lng, radius, sort, priceMin, priceMax]);

  return (
    <>
      <Header />
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🛒 Marketplace</h1>
            <p className="text-sm text-gray-500">Buy, sell, and group buy</p>
          </div>
          <SortSelector value={sort} onChange={setSort} />
        </div>

        <div className="mb-4">
          <CategoryFilter
            selected={category}
            onChange={setCategory}
            categories={marketCategories}
          />
        </div>

        {/* Price Filter */}
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            placeholder="Min $"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Max $"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Link
          href="/create"
          className="block w-full text-center py-3 mb-4 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          + List an Item
        </Link>

        {loading || locationLoading ? (
          <LoadingSpinner />
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No items for sale nearby</p>
            <p className="text-sm text-gray-400 mt-1">List something!</p>
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
