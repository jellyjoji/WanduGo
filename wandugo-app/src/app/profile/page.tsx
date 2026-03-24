"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessionId, getUserName, setUserName } from "@/lib/session";
import type { Post, Profile } from "@/types/database";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [tab, setTab] = useState<"posts" | "comments">("posts");

  useEffect(() => {
    async function fetchProfile() {
      const sessionId = getSessionId();
      if (!sessionId) {
        setLoading(false);
        return;
      }

      // Try to get existing profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
        setName(profileData.name);
        setBio(profileData.bio);
      } else {
        setName(getUserName());
      }

      // Fetch user's posts
      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });

      if (postData) setPosts(postData as Post[]);
      setLoading(false);
    }
    fetchProfile();
  }, []);

  async function handleSaveProfile() {
    const sessionId = getSessionId();
    setUserName(name);

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
      await supabase
        .from("profiles")
        .update({ name, bio })
        .eq("session_id", sessionId);
    } else {
      await supabase.from("profiles").insert(profileData);
    }

    setProfile({
      ...profile,
      ...profileData,
      rating: profile?.rating || 0,
      created_at: profile?.created_at || new Date().toISOString(),
    } as Profile);
    setEditing(false);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Header />
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl shrink-0">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Write a short bio..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-gray-900">
                    {name || "Anonymous"}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {bio || "No bio set"}
                  </p>
                  {profile?.location_text && (
                    <p className="text-xs text-gray-500 mt-1">
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
                    className="mt-3 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
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
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <p className="text-xl font-bold text-gray-900">{posts.length}</p>
            <p className="text-xs text-gray-500">Posts</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <p className="text-xl font-bold text-gray-900">
              {posts.reduce((sum, p) => sum + p.likes, 0)}
            </p>
            <p className="text-xs text-gray-500">Likes</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <p className="text-xl font-bold text-gray-900">
              {profile?.rating?.toFixed(1) || "-"}
            </p>
            <p className="text-xs text-gray-500">Rating</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setTab("posts")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "posts"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500"
            }`}
          >
            My Posts
          </button>
          <button
            onClick={() => setTab("comments")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "comments"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500"
            }`}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        {tab === "posts" ? (
          posts.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">
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
          <p className="text-center py-8 text-gray-500 text-sm">
            Activity history coming soon
          </p>
        )}
      </div>
    </>
  );
}
