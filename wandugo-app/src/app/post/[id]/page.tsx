"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLocation } from "@/contexts/LocationContext";
import { getSessionId, getUserName } from "@/lib/session";
import {
  haversineDistance,
  formatDistance,
  timeAgo,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/utils";
import type { Post, Comment } from "@/types/database";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const router = useRouter();
  const { lat, lng } = useLocation();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (postData) {
        setPost(postData as Post);
      }

      const { data: commentData } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (commentData) {
        setComments(commentData as Comment[]);
      }
      setLoading(false);
    }
    fetchPost();

    // Real-time comments subscription
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          setComments((prev) => [...prev, payload.new as Comment]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const sessionId = getSessionId();
    const authorName = getUserName();

    await supabase.from("comments").insert({
      post_id: postId,
      content: newComment.trim(),
      session_id: sessionId,
      author_name: authorName,
    });

    setNewComment("");
    setSubmitting(false);
  }

  async function handleLike() {
    if (!post) return;
    await supabase
      .from("posts")
      .update({ likes: post.likes + 1 })
      .eq("id", post.id);
    setPost({ ...post, likes: post.likes + 1 });
  }

  async function handleStartChat() {
    if (!post) return;
    const sessionId = getSessionId();
    const authorName = getUserName();

    // Create a chat linked to this post
    const { data: chat } = await supabase
      .from("chats")
      .insert({
        name: post.title,
        is_group: false,
        post_id: post.id,
      })
      .select()
      .single();

    if (chat) {
      // Add both members
      await supabase.from("chat_members").insert([
        { chat_id: chat.id, session_id: sessionId, author_name: authorName },
        {
          chat_id: chat.id,
          session_id: post.session_id,
          author_name: post.author_name,
        },
      ]);
      router.push(`/chat/${chat.id}`);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!post)
    return (
      <div className="text-center py-12 text-gray-500">Post not found</div>
    );

  const distance =
    lat && lng ? haversineDistance(lat, lng, post.lat, post.lng) : null;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
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
        <h1 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
          Post Details
        </h1>
      </div>

      {/* Post Content */}
      <div className="bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_COLORS[post.category] || "bg-gray-100"}`}
          >
            {CATEGORY_LABELS[post.category]}
          </span>
          {distance !== null && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistance(distance)}
            </span>
          )}
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {post.title}
        </h2>

        {post.price !== null && post.price > 0 && (
          <p className="text-2xl font-bold text-blue-600 mb-3">${post.price}</p>
        )}

        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">
          {post.content}
        </p>

        {/* Author & Location Info */}
        <div className="flex items-center gap-3 py-3 border-t border-gray-100 dark:border-slate-700">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-lg">
            {post.author_name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {post.author_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {post.location_text} · {timeAgo(post.created_at)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 py-3 border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-600 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <svg
              className="w-5 h-5 text-red-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
            {post.likes}
          </button>
          <button
            onClick={handleStartChat}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            💬 Message
          </button>
          {post.category === "jobs" && (
            <button
              onClick={handleStartChat}
              className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Apply
            </button>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white dark:bg-slate-900 mt-2 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Comments ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No comments yet. Be the first!
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium text-sm shrink-0">
                  {comment.author_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {comment.author_name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment Input */}
        <form onSubmit={handleComment} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-full text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
