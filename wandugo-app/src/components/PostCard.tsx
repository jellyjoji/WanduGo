"use client";

import Link from "next/link";
import type { Post } from "@/types/database";
import {
  formatDistance,
  haversineDistance,
  timeAgo,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/utils";
import { useLocation } from "@/contexts/LocationContext";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const { lat, lng } = useLocation();
  const distance =
    lat && lng ? haversineDistance(lat, lng, post.lat, post.lng) : null;

  return (
    <Link href={`/post/${post.id}`} className="block">
      <article className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_COLORS[post.category] || "bg-gray-100 text-gray-800"}`}
          >
            {CATEGORY_LABELS[post.category] || post.category}
          </span>
          {distance !== null && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistance(distance)}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {post.content}
        </p>

        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-40 object-cover rounded-lg mb-3"
          />
        )}

        {post.price !== null && post.price > 0 && (
          <p className="text-lg font-bold text-blue-600 mb-2">${post.price}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-medium">
              {post.author_name[0]?.toUpperCase()}
            </div>
            <span>{post.author_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              {post.location_text}
            </span>
            <span>{timeAgo(post.created_at)}</span>
          </div>
        </div>

        {post.likes > 0 && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <svg
              className="w-4 h-4 text-red-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
            {post.likes}
          </div>
        )}
      </article>
    </Link>
  );
}
