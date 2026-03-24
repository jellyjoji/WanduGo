"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";
import { timeAgo } from "@/lib/utils";
import type { Chat, ChatMember, Message } from "@/types/database";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

interface ChatWithDetails extends Chat {
  lastMessage?: Message;
  memberCount?: number;
}

export default function ChatListPage() {
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChats() {
      const sessionId = getSessionId();
      if (!sessionId) {
        setLoading(false);
        return;
      }

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
        // Get last message for each chat
        const chatsWithDetails: ChatWithDetails[] = await Promise.all(
          chatData.map(async (chat) => {
            const { data: messages } = await supabase
              .from("messages")
              .select("*")
              .eq("chat_id", chat.id)
              .order("created_at", { ascending: false })
              .limit(1);

            const { count } = await supabase
              .from("chat_members")
              .select("*", { count: "exact", head: true })
              .eq("chat_id", chat.id);

            return {
              ...chat,
              lastMessage: messages?.[0] as Message | undefined,
              memberCount: count || 0,
            } as ChatWithDetails;
          }),
        );

        setChats(chatsWithDetails);
      }
      setLoading(false);
    }
    fetchChats();
  }, []);

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
                      {chat.name || "Chat"}
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
