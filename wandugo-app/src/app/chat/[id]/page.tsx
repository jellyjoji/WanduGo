"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSessionId, getUserName } from "@/lib/session";
import { timeAgo } from "@/lib/utils";
import { useLocation } from "@/contexts/LocationContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Message, Chat } from "@/types/database";

export default function ChatRoomPage() {
  const params = useParams();
  const chatId = params.id as string;
  const router = useRouter();
  const { lat, lng } = useLocation();
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [otherUserName, setOtherUserName] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const sessionId = typeof window !== "undefined" ? getSessionId() : "";

  useEffect(() => {
    async function fetchChat() {
      const { data: chatData } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();

      if (chatData) setChat(chatData as Chat);

      const { data: messageData } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (messageData) setMessages(messageData as Message[]);

      // Find the other participant's name for 1-on-1 chats
      const myId = typeof window !== "undefined" ? getSessionId() : "";
      const { data: members } = await supabase
        .from("chat_members")
        .select("session_id, author_name")
        .eq("chat_id", chatId);

      if (members) {
        const other = members.find((m) => m.session_id !== myId);
        if (other) setOtherUserName(other.author_name);
      }
    }
    fetchChat();

    // Real-time subscription (deduplicates against optimistic updates)
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (isInitialLoad.current) {
      // Wait until real messages are loaded (skip the initial empty-array render)
      if (messages.length === 0) return;
      // Use rAF so the DOM has painted before we set scrollTop
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight;
      });
      isInitialLoad.current = false;
      return;
    }

    // For new messages: scroll if user is near the bottom (within 150px)
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 150) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const content = newMessage.trim();
    const authorName = getUserName();

    // Optimistic update — show message immediately
    const optimistic: Message = {
      id: `pending-${Date.now()}`,
      chat_id: chatId,
      content,
      session_id: sessionId,
      author_name: authorName,
      type: "text",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");
    // Always scroll to bottom when the user sends a message
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 0);

    const { data } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        content,
        session_id: sessionId,
        author_name: authorName,
        type: "text",
      })
      .select()
      .single();

    // Replace the optimistic entry with the real row once we have its id
    if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? (data as Message) : m)),
      );
    }

    setSending(false);
  }

  async function shareLocation() {
    if (!lat || !lng) return;
    await supabase.from("messages").insert({
      chat_id: chatId,
      content: JSON.stringify({ lat, lng }),
      session_id: sessionId,
      author_name: getUserName(),
      type: "location",
    });
  }

  if (authLoading) {
    return (
      <div className="flex flex-col h-screen max-w-lg mx-auto items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-screen max-w-lg mx-auto items-center justify-center px-6 text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-4xl">
          💬
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Sign in to view this chat
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You need to be signed in to read and send messages.
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
    );
  }

  return (
    // h-[calc(100dvh-4rem)]: 100dvh = real viewport, -4rem = BottomNav height (h-16)
    // overflow-hidden on outer so only the messages div scrolls
    <div className="flex flex-col max-w-lg mx-auto overflow-hidden" style={{ height: 'calc(100dvh - 4rem)' }}>
      {/* Chat Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-600 dark:text-gray-400"
        >
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
        <div className="flex-1">
          <h1 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {chat?.is_group
              ? chat?.name || "Group Chat"
              : otherUserName || chat?.name || "Chat"}
          </h1>
          {chat?.is_group && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Group Chat
            </p>
          )}
        </div>
      </div>

      {/* Messages — min-h-0 is required so flex-1 + overflow-y-auto actually scrolls */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-slate-950">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.session_id === sessionId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[75%] ${isMe ? "order-1" : ""}`}>
                {!isMe && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                    {msg.author_name}
                  </p>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl text-sm ${
                    isMe
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-600 rounded-bl-md"
                  }`}
                >
                  {msg.type === "location" ? (
                    <div className="flex items-center gap-1">
                      📍 <span className="underline">Shared location</span>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                <p
                  className={`text-xs text-gray-400 dark:text-gray-500 mt-1 ${isMe ? "text-right mr-1" : "ml-1"}`}
                >
                  {timeAgo(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 p-3">
        {!user ? (
          <button
            onClick={() => openAuthModal("login")}
            className="w-full py-2.5 text-sm text-blue-600 font-medium border border-blue-200 rounded-full hover:bg-blue-50 transition-colors"
          >
            Log in to send messages
          </button>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button
              type="button"
              onClick={shareLocation}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
              title="Share location"
            >
              <svg
                className="w-6 h-6"
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
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
