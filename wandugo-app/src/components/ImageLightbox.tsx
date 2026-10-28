"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface ImageLightboxProps {
  images: string[];
  alt: string;
  startIndex: number;
  onClose: () => void;
}

export default function ImageLightbox({
  images,
  alt,
  startIndex,
  onClose,
}: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black"
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 text-white/90 hover:text-white bg-black/40 rounded-full w-9 h-9 flex items-center justify-center"
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

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {images.map((src, i) => (
          <div
            key={src}
            className="relative h-full w-full flex-shrink-0 snap-center"
          >
            <Image
              src={src}
              alt={`${alt} ${i + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <span className="absolute bottom-6 left-0 right-0 text-center text-white/90 text-sm">
          {index + 1}/{images.length}
        </span>
      )}
    </div>
  );
}
