"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLocation } from "@/contexts/LocationContext";
import { getSessionId, getUserName, setUserName } from "@/lib/session";
import type { PostCategory } from "@/types/database";
import { CATEGORY_LABELS } from "@/lib/utils";

export default function CreatePostPage() {
  const router = useRouter();
  const { lat, lng } = useLocation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("community");
  const [price, setPrice] = useState("");
  const [locationText, setLocationText] = useState("");
  const [postLat, setPostLat] = useState<number | null>(null);
  const [postLng, setPostLng] = useState<number | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAuthorName(getUserName());
    if (lat && lng) {
      setPostLat(lat);
      setPostLng(lng);
    }
  }, [lat, lng]);

  useEffect(() => {
    if (!autocompleteInputRef.current) return;

    import("@googlemaps/js-api-loader").then(
      ({ setOptions, importLibrary }) => {
        setOptions({
          key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
          v: "weekly",
        });
        importLibrary("places").then(() => {
          const autocomplete = new google.maps.places.Autocomplete(
            autocompleteInputRef.current!,
            {
              componentRestrictions: { country: "ca" },
              fields: ["formatted_address", "geometry"],
            },
          );
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
              setLocationText(place.formatted_address || "");
              setPostLat(place.geometry.location.lat());
              setPostLng(place.geometry.location.lng());
            }
          });
        });
      },
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || submitting) return;

    setSubmitting(true);
    const sessionId = getSessionId();

    if (authorName && authorName !== "Anonymous") {
      setUserName(authorName);
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        title: title.trim(),
        content: content.trim(),
        category,
        lat: postLat || lat || 43.6532,
        lng: postLng || lng || -79.3832,
        location_text: locationText || "Unknown location",
        author_name: authorName || "Anonymous",
        session_id: sessionId,
        price: price ? parseFloat(price) : null,
        image_url: null,
      })
      .select()
      .single();

    if (error) {
      alert("Failed to create post. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push(`/post/${data.id}`);
  }

  const showPrice = ["marketplace", "buy-sell", "group-buy"].includes(category);

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-gray-600">
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
        <h1 className="font-semibold text-gray-900">Create Post</h1>
        <div className="w-6" />
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Author Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key as PostCategory)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  category === key
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a clear, descriptive title"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe your post in detail..."
            required
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Price (conditionally shown) */}
        {showPrice && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price ($)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            ref={autocompleteInputRef}
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="Search for a location in Canada..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => {
              if (lat && lng) {
                setPostLat(lat);
                setPostLng(lng);
                setLocationText("📍 Current location");
              }
            }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            📍 Use my current location
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!title.trim() || !content.trim() || submitting}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
}
