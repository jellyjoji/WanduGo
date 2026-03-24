"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";
import { timeAgo } from "@/lib/utils";
import type { Notification } from "@/types/database";
import LoadingSpinner from "@/components/LoadingSpinner";

const NOTIFICATION_ICONS: Record<string, string> = {
  comment: "💬",
  like: "❤️",
  application: "📋",
  system: "🔔",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      const sessionId = getSessionId();
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) setNotifications(data as Notification[]);
      setLoading(false);

      // Mark all as read
      if (data && data.length > 0) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("session_id", sessionId)
          .eq("read", false);
      }
    }
    fetchNotifications();
  }, []);

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-600">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <h1 className="font-semibold text-gray-900">Notifications</h1>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <LoadingSpinner />
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => n.post_id && router.push(`/post/${n.post_id}`)}
                className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors ${
                  n.read ? "bg-white" : "bg-blue-50"
                } hover:bg-gray-50 border border-gray-100`}
              >
                <span className="text-xl">
                  {NOTIFICATION_ICONS[n.type] || "🔔"}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{n.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
