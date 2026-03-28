"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getSessionId, setUserName } from "@/lib/session";
import type { Post, Profile } from "@/types/database";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ProfilePage() {
  const {
    user,
    loading: authLoading,
    openAuthModal,
    updateUserMetaName,
  } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [tab, setTab] = useState<"posts" | "comments">("posts");

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
      setLoading(false);
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

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
      photo_url: null,
      location_text: profile?.location_text || "",
      lat: profile?.lat || null,
      lng: profile?.lng || null,
    };

    if (profile) {
      const { error } = await supabase
        .from("profiles")
        .update({ name, bio })
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

    // Propagate name change to all past content by this user
    await Promise.all([
      supabase
        .from("posts")
        .update({ author_name: name })
        .eq("session_id", sessionId),
      supabase
        .from("comments")
        .update({ author_name: name })
        .eq("session_id", sessionId),
      supabase
        .from("chat_members")
        .update({ author_name: name })
        .eq("session_id", sessionId),
      supabase
        .from("messages")
        .update({ author_name: name })
        .eq("session_id", sessionId),
    ]);

    setProfile({
      ...profile,
      ...profileData,
      rating: profile?.rating || 0,
      created_at: profile?.created_at || new Date().toISOString(),
    } as Profile);
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
      <Header />
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-2xl shrink-0">
              {name?.[0]?.toUpperCase() || "?"}
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
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-3 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Edit Profile
                  </button>
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
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )
        ) : (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            Activity history coming soon
          </p>
        )}
      </div>
    </>
  );
}
