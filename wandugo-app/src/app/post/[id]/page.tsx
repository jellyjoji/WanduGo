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
import type { Post, Comment, PostCategory } from "@/types/database";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";

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
  const [liked, setLiked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<PostCategory>("community");
  const [editPrice, setEditPrice] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { notify } = useNotifications();

  // Restore liked state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`liked_${postId}`);
    if (stored === "true") setLiked(true);
  }, [postId]);

  useEffect(() => {
    async function fetchPost() {
      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (postData) {
        setPost(postData as Post);
        setIsOwner(postData.session_id === getSessionId());
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

    // Notify the post author
    if (post) {
      await notify({
        recipientSessionId: post.session_id,
        type: "comment",
        content: `${authorName} commented on your post: "${newComment.trim().slice(0, 60)}${newComment.trim().length > 60 ? "…" : ""}"`,
        postId: postId,
      });
    }
  }

  async function handleLike() {
    if (!post) return;
    const next = !liked;
    const delta = next ? 1 : -1;
    const newCount = Math.max(0, post.likes + delta);
    setLiked(next);
    setPost({ ...post, likes: newCount });
    localStorage.setItem(`liked_${post.id}`, String(next));
    await supabase.from("posts").update({ likes: newCount }).eq("id", post.id);

    // Notify on like (not on un-like)
    if (next) {
      const myName = getUserName();
      await notify({
        recipientSessionId: post.session_id,
        type: "like",
        content: `${myName} liked your post "${post.title}"`,
        postId: post.id,
      });
    }
  }

  async function handleStartChat(isApplication = false) {
    if (!post) return;
    const sessionId = getSessionId();
    const authorName = getUserName();

    // Check for an existing 1-on-1 chat between this user and the post author for this post
    const { data: myMemberships } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("session_id", sessionId);

    const myChatIds = myMemberships?.map((m) => m.chat_id) ?? [];

    if (myChatIds.length > 0) {
      const { data: postChats } = await supabase
        .from("chats")
        .select("id")
        .eq("post_id", post.id)
        .eq("is_group", false)
        .in("id", myChatIds);

      const postChatIds = postChats?.map((c) => c.id) ?? [];

      if (postChatIds.length > 0) {
        const { data: sharedChats } = await supabase
          .from("chat_members")
          .select("chat_id")
          .eq("session_id", post.session_id)
          .in("chat_id", postChatIds);

        if (sharedChats && sharedChats.length > 0) {
          // Reuse the existing chat room
          router.push(`/chat/${sharedChats[0].chat_id}`);
          return;
        }
      }
    }

    // No existing chat — create one linked to this post
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

      // Notify the post author
      await notify({
        recipientSessionId: post.session_id,
        type: isApplication ? "application" : "comment",
        content: isApplication
          ? `${authorName} applied to your post "${post.title}"`
          : `${authorName} wants to chat about your post "${post.title}"`,
        postId: post.id,
      });

      router.push(`/chat/${chat.id}`);
    }
  }

  function openEdit() {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(post.category);
    setEditPrice(
      post.price != null && post.price > 0 ? String(post.price) : "",
    );
    setEditing(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!post || !editTitle.trim() || !editContent.trim() || editSubmitting)
      return;
    setEditSubmitting(true);

    const { error } = await supabase
      .from("posts")
      .update({
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
        price: editPrice ? parseFloat(editPrice) : null,
      })
      .eq("id", post.id)
      .eq("session_id", getSessionId());

    if (error) {
      alert("Failed to update post. Please try again.");
      setEditSubmitting(false);
      return;
    }

    setPost({
      ...post,
      title: editTitle.trim(),
      content: editContent.trim(),
      category: editCategory,
      price: editPrice ? parseFloat(editPrice) : null,
    });
    setEditing(false);
    setEditSubmitting(false);
  }

  async function handleDelete() {
    if (!post || deleting) return;
    if (
      !confirm(
        "Are you sure you want to delete this post? This cannot be undone.",
      )
    )
      return;
    setDeleting(true);

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)
      .eq("session_id", getSessionId());

    if (error) {
      alert("Failed to delete post. Please try again.");
      setDeleting(false);
      return;
    }

    router.replace("/");
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

        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full rounded-xl object-cover max-h-80 mb-4"
          />
        )}

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
              <button
                onClick={() =>
                  window.open(
                    `https://maps.google.com/?q=${post.lat},${post.lng}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="underline underline-offset-2 hover:text-blue-500 transition-colors"
              >
                📍 {post.location_text}
              </button>
              {" · "}
              {timeAgo(post.created_at)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 py-3 border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 px-4 py-2 rounded-full border text-sm transition-colors ${
              liked
                ? "border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-700 text-red-500"
                : "border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800"
            }`}
          >
            <svg
              className={`w-5 h-5 transition-colors ${liked ? "text-red-500" : "text-gray-400"}`}
              fill={liked ? "currentColor" : "none"}
              stroke={liked ? "none" : "currentColor"}
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"
              />
            </svg>
            {post.likes}
          </button>
          <button
            onClick={() => handleStartChat(false)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            💬 Message
          </button>
          {post.category === "jobs" && (
            <button
              onClick={() => handleStartChat(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Apply
            </button>
          )}
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="flex gap-3 py-3 border-t border-gray-100 dark:border-slate-700">
            <button
              onClick={openEdit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                />
              </svg>
              Edit Post
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              {deleting ? "Deleting…" : "Delete Post"}
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Edit Post
              </h2>
              <button
                onClick={() => setEditing(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-5 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEditCategory(key as PostCategory)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        editCategory === key
                          ? "bg-blue-600 text-white"
                          : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={5}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Price (for relevant categories) */}
              {["marketplace", "buy-sell", "group-buy"].includes(
                editCategory,
              ) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    editSubmitting || !editTitle.trim() || !editContent.trim()
                  }
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {editSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
