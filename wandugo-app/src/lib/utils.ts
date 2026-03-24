/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export const CATEGORY_LABELS: Record<string, string> = {
  jobs: "구인/구직 Jobs",
  community: "Community",
  marketplace: "Marketplace",
  housing: "Housing",
  events: "Events",
  tips: "Tips",
  "buy-sell": "Buy & Sell",
  "group-buy": "Group Buy",
};

export const CATEGORY_COLORS: Record<string, string> = {
  jobs: "bg-blue-100 text-blue-800",
  community: "bg-green-100 text-green-800",
  marketplace: "bg-orange-100 text-orange-800",
  housing: "bg-purple-100 text-purple-800",
  events: "bg-pink-100 text-pink-800",
  tips: "bg-yellow-100 text-yellow-800",
  "buy-sell": "bg-red-100 text-red-800",
  "group-buy": "bg-teal-100 text-teal-800",
};
