"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getSessionId, setUserName } from "@/lib/session";
import { timeAgo, CATEGORY_LABELS } from "@/lib/utils";
import { getProfiles, invalidateProfile } from "@/lib/profileCache";
import type { ProfileSnippet } from "@/lib/profileCache";
import type { Post, Profile } from "@/types/database";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import QRInstallModal from "@/components/QRInstallModal";
import Link from "next/link";

type ActivityItem =
  | { type: "post"; post: Post; created_at: string }
  | {
      type: "comment";
      comment_id: string;
      post_id: string;
      post_title: string;
      content: string;
      created_at: string;
    };

export default function ProfilePage() {
  const {
    user,
    loading: authLoading,
    openAuthModal,
    updateUserMetaName,
    signOut,
  } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [tab, setTab] = useState<"posts" | "likes" | "comments">("posts");
  const [showQR, setShowQR] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [profileMap, setProfileMap] = useState<
    Record<string, ProfileSnippet | null>
  >({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      const sessionId = getSessionId();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
        // Don't overwrite inputs while the user is actively editing
        if (!editing) {
          setName(profileData.name);
          setBio(profileData.bio);
          setPhotoUrl(profileData.photo_url);
        }
      } else {
        // Pre-fill name from auth account metadata
        if (!editing) {
          setName(
            user!.user_metadata?.name || user!.email?.split("@")[0] || "",
          );
        }
      }

      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });

      if (postData) setPosts(postData as Post[]);

      // Fetch posts that the user has liked (stored in localStorage)
      const likedIds = Object.keys(localStorage)
        .filter(
          (k) => k.startsWith("liked_") && localStorage.getItem(k) === "true",
        )
        .map((k) => k.replace("liked_", ""));

      if (likedIds.length > 0) {
        const { data: likedData } = await supabase
          .from("posts")
          .select("*")
          .in("id", likedIds)
          .order("created_at", { ascending: false });
        if (likedData) setLikedPosts(likedData as Post[]);
      }

      // Batch-fetch profiles for all posts so author info is always current
      const allSessionIds = [...(postData ?? []).map((p) => p.session_id)];
      getProfiles([...new Set(allSessionIds)]).then(setProfileMap);

      // Build activity feed: comments + posts merged and sorted by time
      const { data: commentData } = await supabase
        .from("comments")
        .select("id, post_id, content, created_at, posts(id, title)")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(50);

      const commentItems: ActivityItem[] = (commentData ?? []).map(
        (c: Record<string, unknown>) => ({
          type: "comment",
          comment_id: c.id as string,
          post_id: c.post_id as string,
          post_title:
            ((c.posts as Record<string, unknown>)?.title as string) ??
            "(deleted post)",
          content: c.content as string,
          created_at: c.created_at as string,
        }),
      );

      const postItems: ActivityItem[] = (postData ?? []).map((p) => ({
        type: "post",
        post: p as Post,
        created_at: p.created_at,
      }));

      const merged = [...commentItems, ...postItems].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setActivity(merged);

      setLoading(false);
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  async function handlePhotoUpload(file: File) {
    setPhotoUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) {
      alert(`Photo upload failed: ${json.error}`);
      setPhotoUploading(false);
      return;
    }
    const url: string = json.url;
    setPhotoUrl(url);
    // Save to profiles immediately
    const sessionId = getSessionId();
    if (profile) {
      await supabase
        .from("profiles")
        .update({ photo_url: url })
        .eq("session_id", sessionId);
    } else {
      await supabase.from("profiles").insert({
        session_id: sessionId,
        name,
        bio,
        photo_url: url,
        location_text: "",
        lat: null,
        lng: null,
      });
    }
    setProfile((prev) => (prev ? { ...prev, photo_url: url } : prev));
    // Evict cache so the new photo is picked up everywhere
    invalidateProfile(sessionId);
    setPhotoUploading(false);
  }

  async function handleClearPhoto() {
    setPhotoUrl(null);
    setProfile((prev) => (prev ? { ...prev, photo_url: null } : prev));
    const sessionId = getSessionId();
    await supabase
      .from("profiles")
      .update({ photo_url: null })
      .eq("session_id", sessionId);
  }

  async function handleSaveProfile() {
    if (!user) return;
    const sessionId = getSessionId();
    // Keep localStorage and Supabase auth metadata in sync
    setUserName(name);
    await updateUserMetaName(name);

    const profileData = {
      session_id: sessionId,
      name,
      bio,
      photo_url: photoUrl,
      location_text: profile?.location_text || "",
      lat: profile?.lat || null,
      lng: profile?.lng || null,
    };

    if (profile) {
      const { error } = await supabase
        .from("profiles")
        .update({ name, bio, photo_url: photoUrl })
        .eq("session_id", sessionId);
      if (error) {
        console.error("Profile update error:", error);
        alert("Failed to save profile. Please try again.");
        return;
      }
    } else {
      const { error } = await supabase.from("profiles").insert(profileData);
      if (error) {
        console.error("Profile insert error:", error);
        alert("Failed to save profile. Please try again.");
        return;
      }
    }

    setProfile({
      ...profile,
      ...profileData,
      rating: profile?.rating || 0,
      created_at: profile?.created_at || new Date().toISOString(),
    } as Profile);
    // Evict cached profile so the updated name/photo is re-fetched everywhere
    invalidateProfile(sessionId);
    setEditing(false);
  }

  // Wait for auth to resolve
  if (authLoading || (user && loading)) return <LoadingSpinner />;

  // Not authenticated — prompt sign in
  if (!user) {
    return (
      <>
        <Header />
        <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center text-center gap-5">
          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-4xl">
            👤
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Sign in to view your profile
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create an account or sign in to manage your profile and posts.
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
      {showQR && <QRInstallModal onClose={() => setShowQR(false)} />}
      <Header />
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-4">
          <div className="flex items-start gap-4">
            {/* Avatar with upload overlay */}
            <div className="relative shrink-0">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={name || "Profile photo"}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-slate-600"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-2xl">
                  {name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              {/* Clear button — only when a photo is set */}
              {photoUrl && (
                <button
                  onClick={handleClearPhoto}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-600 text-white flex items-center justify-center shadow-md hover:bg-red-500 transition-colors"
                  title="Remove profile photo"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              {/* Camera button (always visible) */}
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors disabled:opacity-60"
                title="Change profile photo"
              >
                {photoUploading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                    />
                  </svg>
                )}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Write a short bio..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {name || "Anonymous"}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {bio || "No bio set"}
                  </p>
                  {profile?.location_text && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      📍 {profile.location_text}
                    </p>
                  )}
                  {profile?.rating !== undefined && profile.rating > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⭐ {profile.rating.toFixed(1)}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setShowQR(true)}
                      title="Install app QR code"
                      className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 14h1v1h-1zM14 14h1v1h-1zM20 17h1v1h-1zM17 17h1v3h-1zM14 17h1v1h-1zM14 20h4v1h-4z"
                        />
                      </svg>
                      Install
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 text-center border border-gray-100 dark:border-slate-700">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {posts.length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Posts</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 text-center border border-gray-100 dark:border-slate-700">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {posts.reduce((sum, p) => sum + p.likes, 0)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Likes</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 text-center border border-gray-100 dark:border-slate-700">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {profile?.rating?.toFixed(1) || "-"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rating</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 mb-4">
          <button
            onClick={() => setTab("posts")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "posts"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            My Posts
          </button>
          <button
            onClick={() => setTab("likes")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "likes"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            Likes
          </button>
          <button
            onClick={() => setTab("comments")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "comments"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        {tab === "posts" ? (
          posts.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No posts yet
            </p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  authorProfile={profileMap[post.session_id]}
                />
              ))}
            </div>
          )
        ) : tab === "likes" ? (
          likedPosts.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No liked posts yet
            </p>
          ) : (
            <div className="space-y-3">
              {likedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  authorProfile={profileMap[post.session_id]}
                />
              ))}
            </div>
          )
        ) : activity.length === 0 ? (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No activity yet
          </p>
        ) : (
          <div className="space-y-2">
            {activity.map((item, i) =>
              item.type === "post" ? (
                <Link
                  key={`post-${item.post.id}`}
                  href={`/post/${item.post.id}`}
                  className="flex gap-3 items-start bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        Posted
                      </span>
                      {" · "}
                      {timeAgo(item.created_at)}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.post.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {CATEGORY_LABELS[item.post.category]}
                    </p>
                  </div>
                </Link>
              ) : (
                <Link
                  key={`comment-${item.comment_id}`}
                  href={`/post/${item.post_id}`}
                  className="flex gap-3 items-start bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-green-600 dark:text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      <span className="font-medium text-green-600 dark:text-green-400">
                        Commented
                      </span>
                      {" on "}
                      <span className="text-gray-700 dark:text-gray-300 truncate">
                        {item.post_title}
                      </span>
                      {" · "}
                      {timeAgo(item.created_at)}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {item.content}
                    </p>
                  </div>
                </Link>
              ),
            )}
          </div>
        )}

        {/* Subtle logout */}
        <div className="pt-6 pb-8 flex justify-center">
          <button
            onClick={signOut}
            className="text-xs text-gray-400 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </>
  );
}
