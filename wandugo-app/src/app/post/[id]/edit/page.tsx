"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLocation } from "@/contexts/LocationContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSessionId } from "@/lib/session";
import type { Post, PostCategory } from "@/types/database";
import { CATEGORY_LABELS, getPostImages } from "@/lib/utils";
import { reverseGeocode } from "@/lib/geocode";
import { getCachedPost } from "@/lib/postCache";
import LoadingSpinner from "@/components/LoadingSpinner";

const MAX_IMAGES = 5;

export default function EditPostPage() {
  const params = useParams();
  const postId = params.id as string;
  const router = useRouter();
  const { lat, lng } = useLocation();
  const { user, loading: authLoading, openAuthModal } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notOwner, setNotOwner] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("community");
  const [price, setPrice] = useState("");
  const [locationText, setLocationText] = useState("");
  const [postLat, setPostLat] = useState<number | null>(null);
  const [postLng, setPostLng] = useState<number | null>(null);
  const [images, setImages] = useState<{ url: string; file?: File }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal("login");
    }
  }, [authLoading, user, openAuthModal]);

  useEffect(() => {
    async function fetchPost() {
      const cached = getCachedPost(postId);
      if (cached) applyPost(cached);

      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (data) {
        if ((data as Post).session_id !== getSessionId()) {
          setNotOwner(true);
        } else {
          applyPost(data as Post);
        }
      }
      setLoading(false);
    }

    function applyPost(p: Post) {
      setPost(p);
      setTitle(p.title);
      setContent(p.content);
      setCategory(p.category);
      setPrice(p.price != null && p.price > 0 ? String(p.price) : "");
      setLocationText(p.location_text);
      setPostLat(p.lat);
      setPostLng(p.lng);
      setImages(getPostImages(p).map((url) => ({ url })));
    }

    fetchPost();
  }, [postId]);

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
  }, [post]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    const accepted = files.slice(0, room);
    setImages((prev) => [
      ...prev,
      ...accepted.map((f) => ({ url: URL.createObjectURL(f), file: f })),
    ]);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!post || !title.trim() || !content.trim() || submitting) return;
    setSubmitting(true);

    const image_urls: string[] = [];
    for (const img of images) {
      if (!img.file) {
        image_urls.push(img.url);
        continue;
      }
      const form = new FormData();
      form.append("file", img.file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        alert(`Image upload failed: ${json.error}`);
        setSubmitting(false);
        return;
      }
      image_urls.push(json.url);
    }

    const { error } = await supabase
      .from("posts")
      .update({
        title: title.trim(),
        content: content.trim(),
        category,
        price: price ? parseFloat(price) : null,
        location_text: locationText.trim() || post.location_text,
        lat: postLat ?? post.lat,
        lng: postLng ?? post.lng,
        image_url: image_urls[0] ?? null,
        image_urls,
      })
      .eq("id", post.id)
      .eq("session_id", getSessionId());

    if (error) {
      alert("Failed to update post. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push(`/post/${post.id}`);
  }

  const showPrice = ["marketplace", "buy-sell", "group-buy"].includes(
    category,
  );

  if (authLoading || !user || loading) {
    return <LoadingSpinner />;
  }

  if (notOwner || !post) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          You can only edit your own posts.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          Go back
        </button>
      </div>
    );
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
          Edit Post
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
            {images.map((img, i) => (
              <div key={img.url} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
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
            {images.length < MAX_IMAGES && (
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
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
