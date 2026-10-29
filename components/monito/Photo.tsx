"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = { src: string; name: string; size: number; shadow: number; className?: string; fallback: ReactNode; overlay?: ReactNode };

// The LinkedIn photo in the same round frame (border and hard shadow) as the monito head. LinkedIn photo URLs
// expire, so a photo that fails to load (even before hydration) gives way to the monito instead of a broken image.
export function Photo({ src, name, size, shadow, className, fallback, overlay }: Props) {
  const image = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    const element = image.current;
    if (element?.complete && element.naturalWidth === 0) setFailed(src);
  }, [src]);
  if (failed === src) return fallback;
  return (
    <span className={`relative block shrink-0 ${className ?? ""}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote photos from LinkedIn or Storage, any host */}
      <img
        ref={image}
        src={src}
        alt={name}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setFailed(src)}
        className="absolute inset-0 box-border block h-full w-full rounded-full border-ink object-cover"
        style={{ boxShadow: shadow ? `${shadow}px ${shadow}px 0 #1E1B2E` : "none" }}
      />
      {overlay}
    </span>
  );
}
