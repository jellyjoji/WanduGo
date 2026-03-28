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
  jobs: "Jobs",
  community: "Community",
  marketplace: "Marketplace",
  housing: "Housing",
  events: "Events",
  tips: "Tips",
  "buy-sell": "Buy & Sell",
  "group-buy": "Group Buy",
};

export const CATEGORY_COLORS: Record<string, string> = {
  jobs: "bg-[#C9ECC1] text-[#1B653D]",
  community: "bg-[#EBF8E8] text-[#258D55]",
  marketplace: "bg-[#FEF7F1] text-[#C16510]",
  housing: "bg-[#FFF5E0] text-[#E09400]",
  events: "bg-[#C4DEFC] text-[#0A72EC]",
  tips: "bg-[#FFE3AD] text-[#AD7200]",
  "buy-sell": "bg-[#F6E0E0] text-[#D26A6A]",
  "group-buy": "bg-[#F8CDA5] text-[#C16510]",
};
