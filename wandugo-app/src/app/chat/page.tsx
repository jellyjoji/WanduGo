"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getSessionId } from "@/lib/session";
import { timeAgo } from "@/lib/utils";
import type { Chat, Message } from "@/types/database";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

interface ChatWithDetails extends Chat {
  lastMessage?: Message;
  memberCount?: number;
  otherUserName?: string;
}

export default function ChatListPage() {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchChats() {
    const sessionId = getSessionId();

    // Get chat memberships
    const { data: memberships } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("session_id", sessionId);

    if (!memberships || memberships.length === 0) {
      setLoading(false);
      return;
    }

    const chatIds = memberships.map((m) => m.chat_id);

    // Get chats
    const { data: chatData } = await supabase
      .from("chats")
      .select("*")
      .in("id", chatIds)
      .order("created_at", { ascending: false });

    if (chatData) {
      const myId = getSessionId();
      // Get last message, member count, and other participant name for each chat
      const chatsWithDetails: ChatWithDetails[] = await Promise.all(
        chatData.map(async (chat) => {
          const { data: messages } = await supabase
            .from("messages")
            .select("*")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const { data: members, count } = await supabase
            .from("chat_members")
            .select("session_id, author_name", { count: "exact" })
            .eq("chat_id", chat.id);

          const other = members?.find((m) => m.session_id !== myId);

          return {
            ...chat,
            lastMessage: messages?.[0] as Message | undefined,
            memberCount: count || 0,
            otherUserName: other?.author_name,
          } as ChatWithDetails;
        }),
      );

      setChats(chatsWithDetails);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // Real-time: refresh chat list when added to a new chat room
  useEffect(() => {
    if (!user) return;
    const sessionId = getSessionId();
    const channel = supabase
      .channel("chat-list-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_members",
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchChats(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (authLoading) return <LoadingSpinner />;

  if (!user) {
    return (
      <>
        <Header />
        <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center text-center gap-5">
          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-4xl">
            💬
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Sign in to view your chats
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create an account or sign in to start conversations.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => openAuthModal("signup")}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Create Account
            </button>
            <button
              onClick={() => openAuthModal("login")}
              className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="max-w-lg mx-auto px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          💬 Chats
        </h1>

        {loading ? (
          <LoadingSpinner />
        ) : chats.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No conversations yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Start by messaging someone from a post!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-lg shrink-0">
                  {chat.is_group ? "👥" : "💬"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {chat.is_group
                        ? chat.name || "Group Chat"
                        : chat.otherUserName || chat.name || "Chat"}
                    </h3>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">
                        {timeAgo(chat.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {chat.lastMessage
                      ? `${chat.lastMessage.author_name}: ${chat.lastMessage.content}`
                      : "No messages yet"}
                  </p>
                  {chat.is_group && chat.memberCount && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {chat.memberCount} members
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
