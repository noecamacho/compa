"use client";

import { useEffect, useRef, type RefObject } from "react";

export type Frame = { ctx: CanvasRenderingContext2D; width: number; height: number; now: number; dt: number };

// Phones get 1.5× and projectors at most 2×: sharp enough at 10 m without paying for pixels nobody sees.
const pixelRatio = () => Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.5 : 2);

// One canvas, sized to its parent in CSS pixels, drawn every animation frame (or only when `deps` change under reduced
// motion). The draw callback always sees the latest props through a ref, so the loop never restarts on a poll.
// Hidden tabs get no frames from the browser, so a background screen costs nothing.
export function useCanvasLoop(draw: (frame: Frame) => void, animate: boolean, deps: readonly unknown[]): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);
  const redraw = useRef<() => void>(() => {});

  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let width = 1;
    let height = 1;
    let frame = 0;
    let last = performance.now();
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = pixelRatio();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint(performance.now());
    };
    const paint = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, width, height);
      drawRef.current({ ctx, width, height, now, dt });
    };
    const tick = (now: number) => {
      paint(now);
      frame = requestAnimationFrame(tick);
    };
    redraw.current = () => paint(performance.now());
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    if (animate) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      redraw.current = () => {};
    };
  }, [animate]);

  // Reduced motion: one frame per data change instead of a loop.
  useEffect(() => {
    if (!animate) redraw.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller lists what the picture depends on
  }, deps);

  return canvasRef;
}
