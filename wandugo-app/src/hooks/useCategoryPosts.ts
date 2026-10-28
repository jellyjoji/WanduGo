"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Post, PostCategory } from "@/types/database";

// Module-level cache — persists across client-side navigation within the session
const cache = new Map<string, Post[]>();

export function useCategoryPosts(category: PostCategory | null) {
  const key = category ?? "__all__";
  const [posts, setPosts] = useState<Post[]>(() => cache.get(key) ?? []);
  const [loading, setLoading] = useState(!cache.has(key));

  useEffect(() => {
    let cancelled = false;

    async function fetchPosts() {
      const cached = cache.get(key);
      if (cached) {
        setPosts(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }

      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (category) query = query.eq("category", category);

      const { data } = await query;
      if (cancelled) return;
      if (data) {
        cache.set(key, data as Post[]);
        setPosts(data as Post[]);
      }
      setLoading(false);
    }

    fetchPosts();
    return () => {
      cancelled = true;
    };
  }, [key, category]);

  return { posts, loading };
}
