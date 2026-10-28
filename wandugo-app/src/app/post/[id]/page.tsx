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
  getPostImages,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/utils";
import { getCachedPost } from "@/lib/postCache";
import { getProfiles } from "@/lib/profileCache";
import type { ProfileSnippet } from "@/lib/profileCache";
import type { Post, Comment } from "@/types/database";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import Image from "next/image";
import ImageCarousel from "@/components/ImageCarousel";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const router = useRouter();
  const { lat, lng } = useLocation();
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{
    id: string;
    name: string;
    sessionId: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<ProfileSnippet | null>(
    null,
  );
  const [commentProfileMap, setCommentProfileMap] = useState<
    Record<string, ProfileSnippet | null>
  >({});
  const [deleting, setDeleting] = useState(false);
  const { notify } = useNotifications();

  // Re-derive isOwner once auth state has fully resolved (prevents race condition
  // where fetchPost runs before AuthContext finishes updating the session ID).
  useEffect(() => {
    if (!post || authLoading) return;
    setIsOwner(post.session_id === getSessionId());
  }, [post, authLoading]);

  // Restore liked state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`liked_${postId}`);
    if (stored === "true") setLiked(true);
    // Populate from cache immediately for instant render
    const cached = getCachedPost(postId);
    if (cached) {
      setPost(cached);
      // isOwner will be re-derived by the authLoading effect above
    }
  }, [postId]);

  useEffect(() => {
    async function fetchPost() {
      // If we already have cached data, skip the loading spinner
      const hasCached = !!getCachedPost(postId);
      if (hasCached) setLoading(false);

      const [{ data: postData }, { data: commentData }] = await Promise.all([
        supabase.from("posts").select("*").eq("id", postId).single(),
        supabase
          .from("comments")
          .select("*")
          .eq("post_id", postId)
          .order("created_at", { ascending: true }),
      ]);

      if (postData) {
        setPost(postData as Post);
        // Fetch author's current profile (name/photo may have changed since post was created)
        getProfiles([postData.session_id]).then((map) => {
          setAuthorProfile(map[postData.session_id] ?? null);
        });
        // isOwner is re-derived by the authLoading effect once auth is ready
      }

      if (commentData) {
        setComments(commentData as Comment[]);
        const ids = [
          ...new Set((commentData as Comment[]).map((c) => c.session_id)),
        ];
        if (ids.length > 0) getProfiles(ids).then(setCommentProfileMap);
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
          const newComment = payload.new as Comment;
          setComments((prev) => [...prev, newComment]);
          getProfiles([newComment.session_id]).then((map) =>
            setCommentProfileMap((prev) => ({ ...prev, ...map })),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;

    setSubmitting(true);
    const sessionId = getSessionId();
    const authorName = getUserName();
    const trimmed = newComment.trim();
    const content = replyTo ? `@${replyTo.name} ${trimmed}` : trimmed;

    await supabase.from("comments").insert({
      post_id: postId,
      content,
      session_id: sessionId,
      author_name: authorName,
      parent_id: replyTo?.id ?? null,
    });

    setNewComment("");
    setSubmitting(false);
    setReplyTo(null);

    const preview = `${trimmed.slice(0, 60)}${trimmed.length > 60 ? "…" : ""}`;

    // Notify the post author
    if (post && post.session_id !== sessionId) {
      await notify({
        recipientSessionId: post.session_id,
        type: "comment",
        content: `${authorName} commented on your post: "${preview}"`,
        postId: postId,
      });
    }

    // Notify the comment author being replied to, if different
    if (
      replyTo &&
      replyTo.sessionId !== sessionId &&
      replyTo.sessionId !== post?.session_id
    ) {
      await notify({
        recipientSessionId: replyTo.sessionId,
        type: "comment",
        content: `${authorName} replied to your comment: "${preview}"`,
        postId: postId,
      });
    }
  }

  async function handleLike() {
    if (!user) {
      openAuthModal("login");
      return;
    }
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
    if (!user) {
      openAuthModal("login");
      return;
    }
    if (!post) return;
    const sessionId = getSessionId();
    const authorName = getUserName();

    // Check for an existing 1-on-1 chat between this user and the post author,
    // regardless of which post it originated from — one chat room per person.
    const { data: myMemberships } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("session_id", sessionId);

    const myChatIds = myMemberships?.map((m) => m.chat_id) ?? [];

    if (myChatIds.length > 0) {
      const { data: oneOnOneChats } = await supabase
        .from("chats")
        .select("id")
        .eq("is_group", false)
        .in("id", myChatIds);

      const oneOnOneChatIds = oneOnOneChats?.map((c) => c.id) ?? [];

      if (oneOnOneChatIds.length > 0) {
        const { data: sharedChats } = await supabase
          .from("chat_members")
          .select("chat_id")
          .eq("session_id", post.session_id)
          .in("chat_id", oneOnOneChatIds);

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
      <div className="text-center py-12 text-gray-600 dark:text-gray-400">Post not found</div>
    );

  const distance =
    lat && lng ? haversineDistance(lat, lng, post.lat, post.lng) : null;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-600 dark:text-gray-400 flex-shrink-0"
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
        <h1 className="font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
          Post Details
        </h1>
        {isOwner && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link
              href={`/post/${postId}/edit`}
              title="Edit post"
              className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
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
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                />
              </svg>
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete post"
              className="p-2 rounded-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              ) : (
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
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_COLORS[post.category] || "bg-gray-100"}`}
          >
            {CATEGORY_LABELS[post.category] || post.category}
          </span>
          {distance !== null && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
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

        {getPostImages(post).length > 0 && (
          <ImageCarousel
            images={getPostImages(post)}
            alt={post.title}
            className="w-full h-80 rounded-xl mb-4"
            priority
            enableLightbox
          />
        )}

        {/* Author & Location Info */}
        <div className="flex items-center gap-3 py-3 border-t border-gray-100 dark:border-slate-700">
          {authorProfile?.photo_url ? (
            <Image
              src={authorProfile.photo_url}
              alt={authorProfile.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-lg flex-shrink-0">
              {(authorProfile?.name ?? post.author_name)[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {authorProfile?.name ?? post.author_name}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
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
              className={`w-5 h-5 transition-colors ${liked ? "text-red-500" : "text-gray-600 dark:text-gray-400"}`}
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
          {!isOwner && (
            <button
              onClick={() => handleStartChat(post.category === "jobs")}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              💬 Message
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
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
            No comments yet. Be the first!
          </p>
        ) : (
          <div className="space-y-4">
            {comments
              .filter((c) => !c.parent_id)
              .map((comment) => {
                const replies = comments.filter(
                  (c) => c.parent_id === comment.id,
                );
                return (
                  <div key={comment.id}>
                    <CommentRow
                      comment={comment}
                      profile={commentProfileMap[comment.session_id]}
                      canReply={!!user}
                      onReply={() =>
                        setReplyTo({
                          id: comment.id,
                          name:
                            commentProfileMap[comment.session_id]?.name ??
                            comment.author_name,
                          sessionId: comment.session_id,
                        })
                      }
                    />
                    {replies.length > 0 && (
                      <div className="mt-3 ml-11 space-y-3 border-l-2 border-gray-100 dark:border-slate-700 pl-3">
                        {replies.map((reply) => (
                          <CommentRow
                            key={reply.id}
                            comment={reply}
                            profile={commentProfileMap[reply.session_id]}
                            canReply={!!user}
                            onReply={() =>
                              setReplyTo({
                                id: comment.id,
                                name:
                                  commentProfileMap[reply.session_id]?.name ??
                                  reply.author_name,
                                sessionId: reply.session_id,
                              })
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Comment Input */}
        {user ? (
          <form onSubmit={handleComment} className="mt-4">
            {replyTo && (
              <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 rounded-full text-xs text-gray-600 dark:text-gray-300">
                <span>
                  Replying to{" "}
                  <span className="font-medium">{replyTo.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  replyTo ? `Reply to ${replyTo.name}...` : "Write a comment..."
                }
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-full text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => openAuthModal("login")}
            className="mt-4 w-full py-2.5 border border-gray-300 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Log in to comment
          </button>
        )}
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  profile,
  canReply,
  onReply,
}: {
  comment: Comment;
  profile: ProfileSnippet | null | undefined;
  canReply: boolean;
  onReply: () => void;
}) {
  return (
    <div className="flex gap-3">
      {profile?.photo_url ? (
        <Image
          src={profile.photo_url}
          alt={profile.name}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium text-sm shrink-0">
          {(profile?.name ?? comment.author_name)[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {profile?.name ?? comment.author_name}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {timeAgo(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
          {comment.content}
        </p>
        {canReply && (
          <button
            onClick={onReply}
            className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mt-1"
          >
            Reply
          </button>
        )}
      </div>
    </div>
  );
}
