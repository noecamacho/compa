"use client";

import { useEffect, useState, type RefObject } from "react";

export type Size = { width: number; height: number };

// Layout size of an element in CSS pixels, updated on resize; DOM and SVG views lay out in pixels with it.
export function useElementSize(ref: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
