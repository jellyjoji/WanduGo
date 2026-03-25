import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    // Initial unread count
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("read", false)
      .then(({ count }) => setUnreadCount(count ?? 0));

    // Real-time: increment count when a new notification arrives
    const channel = supabase
      .channel("notifications-badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `session_id=eq.${sessionId}`,
        },
        () => setUnreadCount((c) => c + 1),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `session_id=eq.${sessionId}`,
        },
        // Re-fetch count after bulk mark-as-read
        async () => {
          const { count } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("session_id", sessionId)
            .eq("read", false);
          setUnreadCount(count ?? 0);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /** Insert a notification for another user's session. No-op if recipient is the sender. */
  const notify = useCallback(
    async ({
      recipientSessionId,
      type,
      content,
      postId,
    }: {
      recipientSessionId: string;
      type: "comment" | "like" | "application" | "system";
      content: string;
      postId?: string;
    }) => {
      const mySessionId = getSessionId();
      // Never notify yourself
      if (!recipientSessionId || recipientSessionId === mySessionId) return;

      const { error } = await supabase.from("notifications").insert({
        session_id: recipientSessionId,
        type,
        content,
        post_id: postId ?? null,
      });
      if (error) console.error("notify() failed:", error);
    },
    [],
  );

  return { unreadCount, setUnreadCount, notify };
}
