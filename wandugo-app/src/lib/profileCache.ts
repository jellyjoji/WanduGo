import { supabase } from "@/lib/supabase";

export type ProfileSnippet = { name: string; photo_url: string | null };

// Module-level cache: session_id → profile snippet + when it was fetched
const cache = new Map<string, { data: ProfileSnippet; fetchedAt: number }>();

// Other users' profile edits only reach us by re-fetching, so cap how long
// we trust a cached entry before treating it as stale.
const TTL_MS = 5 * 60 * 1000;

function isFresh(entry: { fetchedAt: number }) {
  return Date.now() - entry.fetchedAt < TTL_MS;
}

/**
 * Batch-fetch profiles for the given session IDs.
 * Already-cached, non-stale IDs are served instantly; the rest are fetched in one query.
 */
export async function getProfiles(
  sessionIds: string[],
): Promise<Record<string, ProfileSnippet | null>> {
  const unique = [...new Set(sessionIds)];
  const missing = unique.filter((id) => {
    const entry = cache.get(id);
    return !entry || !isFresh(entry);
  });

  if (missing.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("session_id, name, photo_url")
      .in("session_id", missing);

    (data ?? []).forEach((p) => {
      cache.set(p.session_id, {
        data: { name: p.name, photo_url: p.photo_url },
        fetchedAt: Date.now(),
      });
    });
  }

  return Object.fromEntries(
    unique.map((id) => [id, cache.get(id)?.data ?? null]),
  );
}

/** Call after the user saves their own profile so stale data is evicted. */
export function invalidateProfile(sessionId: string) {
  cache.delete(sessionId);
}
