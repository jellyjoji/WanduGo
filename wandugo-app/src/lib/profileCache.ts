import { supabase } from "@/lib/supabase";

export type ProfileSnippet = { name: string; photo_url: string | null };

// Module-level cache: session_id → profile snippet
const cache = new Map<string, ProfileSnippet>();

/**
 * Batch-fetch profiles for the given session IDs.
 * Already-cached IDs are served instantly; missing ones are fetched in one query.
 */
export async function getProfiles(
  sessionIds: string[],
): Promise<Record<string, ProfileSnippet | null>> {
  const unique = [...new Set(sessionIds)];
  const missing = unique.filter((id) => !cache.has(id));

  if (missing.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("session_id, name, photo_url")
      .in("session_id", missing);

    (data ?? []).forEach((p) => {
      cache.set(p.session_id, { name: p.name, photo_url: p.photo_url });
    });
  }

  return Object.fromEntries(unique.map((id) => [id, cache.get(id) ?? null]));
}

/** Call after the user saves their own profile so stale data is evicted. */
export function invalidateProfile(sessionId: string) {
  cache.delete(sessionId);
}
