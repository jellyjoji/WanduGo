"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  priority?: boolean;
}

export default function ImageCarousel({
  images,
  alt,
  className = "",
  priority = false,
}: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) return null;

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
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
              sizes="(max-width: 512px) 100vw, 512px"
              className="object-cover"
              priority={priority && i === 0}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            {index + 1}/{images.length}
          </span>
          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === index ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
