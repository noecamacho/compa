"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  title: string;
  // The page's own viewport: 1920×1080 for the big screen, 390×844 for the phone.
  width: number;
  height: number;
  className?: string;
};

// Renders a page at its real viewport and scales it to the box, so the demo shows the actual layout, not a squeezed one.
export function ScaledFrame({ src, title, width, height, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setScale((entry?.contentRect.width ?? 0) / width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={box} className={`relative w-full overflow-hidden ${className ?? ""}`} style={{ aspectRatio: `${width} / ${height}` }}>
      <iframe
        src={src}
        title={title}
        width={width}
        height={height}
        className="absolute top-0 left-0 origin-top-left border-0"
        style={{ transform: `scale(${scale})`, visibility: scale ? undefined : "hidden" }}
      />
    </div>
  );
}
