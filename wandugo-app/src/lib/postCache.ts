import type { Post } from "@/types/database";

// Module-level cache — persists across navigation within the same browser session
const cache = new Map<string, Post>();

export function setCachedPost(post: Post) {
  cache.set(post.id, post);
}

export function getCachedPost(id: string): Post | undefined {
  return cache.get(id);
}
