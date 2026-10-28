"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLocation } from "@/contexts/LocationContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSessionId, getUserName } from "@/lib/session";
import type { PostCategory } from "@/types/database";
import { CATEGORY_LABELS } from "@/lib/utils";
import { reverseGeocode } from "@/lib/geocode";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function CreatePostPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CreatePostForm />
    </Suspense>
  );
}

function CreatePostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lat, lng } = useLocation();
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const initialCategory = searchParams.get("category");
  const [category, setCategory] = useState<PostCategory>(
    initialCategory && initialCategory in CATEGORY_LABELS
      ? (initialCategory as PostCategory)
      : "community",
  );
  const [price, setPrice] = useState("");
  const [locationText, setLocationText] = useState("");
  const [postLat, setPostLat] = useState<number | null>(null);
  const [postLng, setPostLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect guests to auth modal
  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal("login");
    }
  }, [authLoading, user, openAuthModal]);

  useEffect(() => {
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

  const MAX_IMAGES = 5;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const room = MAX_IMAGES - imageFiles.length;
    const accepted = files.slice(0, room);
    setImageFiles((prev) => [...prev, ...accepted]);
    setImagePreviews((prev) => [
      ...prev,
      ...accepted.map((f) => URL.createObjectURL(f)),
    ]);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || submitting) return;

    setSubmitting(true);
    const sessionId = getSessionId();
    const resolvedName =
      user?.user_metadata?.name || getUserName() || "Anonymous";

    // Upload images via server-side API route (uses service role key)
    const image_urls: string[] = [];
    for (const file of imageFiles) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        alert(`Image upload failed: ${json.error}`);
        setSubmitting(false);
        return;
      }
      image_urls.push(json.url);
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
        author_name: resolvedName,
        session_id: sessionId,
        price: price ? parseFloat(price) : null,
        image_url: image_urls[0] ?? null,
        image_urls,
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

  // Don't render the form until auth state is resolved
  if (authLoading || !user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
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
        <h1 className="font-semibold text-gray-900 dark:text-gray-100">
          Create Post
        </h1>
        <div className="w-6" />
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
                onClick={() => setCategory(key as PostCategory)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  category === key
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a clear, descriptive title"
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
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe your post in detail..."
            required
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Price (conditionally shown) */}
        {showPrice && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Price ($)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Location
          </label>
          <input
            ref={autocompleteInputRef}
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="Search for a location in Canada..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={async () => {
              if (!lat || !lng) return;
              setPostLat(lat);
              setPostLng(lng);
              setLocationText("Locating...");
              const address = await reverseGeocode(lat, lng);
              setLocationText(address || "📍 Current location");
            }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            📍 Use my current location
          </button>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Photos{" "}
            <span className="text-gray-600 dark:text-gray-400 font-normal">
              (optional, up to {MAX_IMAGES})
            </span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
          <div className="grid grid-cols-3 gap-2">
            {imagePreviews.map((src, i) => (
              <div key={src} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Preview ${i + 1}`}
                  className="w-full h-full object-cover rounded-xl border border-gray-200 dark:border-slate-600"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            ))}
            {imagePreviews.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
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
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 19.5h18M12 3v9m0 0l-3-3m3 3l3-3"
                  />
                </svg>
                <span className="text-xs">Add</span>
              </button>
            )}
          </div>
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
