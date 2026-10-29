// Canvas drawings for the landing hero, in the V2 sticker style (design/compa-v2/README.md "Sistema visual"):
// flat fills, 2.5 px ink outlines and hard ink shadows with no blur. Sizes are CSS pixels; the canvas is drawn at
// RES times that so text stays sharp at DPR 2 and while a sticker overshoots its pop.
import { GRID_HEIGHT, GRID_WIDTH, fills, grid } from "@/lib/monito/grid";
import type { MonitoLook } from "@/lib/monito/look";

export const TONE = {
  ink: "#1E1B2E",
  white: "#FFFFFF",
  mint: "#6BE4A3",
  sky: "#6CC4FF",
  bubblegum: "#FF8FAB",
  sun: "#FFD93D",
  coral: "#FF6B4A",
} as const;

export type Tone = keyof typeof TONE;
// A drawing plus its size in CSS pixels and where its tail tip sits (x from the left edge).
export type Sticker = { canvas: HTMLCanvasElement; width: number; height: number; tipX: number };

const RES = 3;
const STROKE = 2.5;
const SHADOW = 3;
const TAIL = 9;
const MARGIN = 2;

type Pen = { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement };

function pen(width: number, height: number): Pen {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * RES);
  canvas.height = Math.ceil(height * RES);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  ctx.scale(RES, RES);
  ctx.lineJoin = "round";
  return { ctx, canvas };
}

// The display font next/font registered (Fredoka), read from the page so the canvas matches the HTML.
function displayFont(weight: number, size: number): string {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "system-ui, sans-serif";
  return `${weight} ${size}px ${family}`;
}

// The monito at one texel per cell, plus a one-cell hard ink shadow down and to the right, like every V2 sticker.
export function monitoCanvas(look: MonitoLook): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = GRID_WIDTH + 1;
  canvas.height = GRID_HEIGHT + 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  const cells = grid(look);
  const paint = fills(look);
  ctx.fillStyle = TONE.ink;
  cells.forEach((row, r) => row.forEach((cell, c) => cell !== "." && ctx.fillRect(c + 1, r + 1, 1, 1)));
  cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === ".") return;
      ctx.fillStyle = paint[cell];
      ctx.fillRect(c, r, 1, 1);
    }),
  );
  return canvas;
}

// Rounded box with a speech tail on its bottom edge; the tail tip lands at (tipX, y + h + TAIL).
function bubblePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tipX: number | null): void {
  const r = Math.min(14, h / 2);
  const bottom = y + h;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, bottom, r);
  ctx.arcTo(x + w, bottom, x, bottom, r);
  if (tipX !== null) {
    ctx.lineTo(tipX + 8, bottom);
    ctx.lineTo(tipX, bottom + TAIL);
    ctx.lineTo(tipX - 3, bottom);
  }
  ctx.arcTo(x, bottom, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Fill the shape twice: once in ink, offset by the hard shadow, then in its color with an ink outline.
function sticker(ctx: CanvasRenderingContext2D, fill: string, draw: () => void): void {
  ctx.save();
  ctx.translate(SHADOW, SHADOW);
  draw();
  ctx.fillStyle = TONE.ink;
  ctx.fill();
  ctx.restore();
  draw();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = STROKE;
  ctx.strokeStyle = TONE.ink;
  ctx.stroke();
}

export type BubbleSide = "left" | "right" | "center";

const tipFor = (side: BubbleSide, width: number): number => {
  if (side === "left") return 20;
  if (side === "right") return width - 22;
  return width / 2;
};

type BubbleBody = { width: number; height: number; paint: (ctx: CanvasRenderingContext2D, x: number, y: number) => void };

function bubble(body: BubbleBody, side: BubbleSide): Sticker {
  const pad = 7;
  const w = body.width + pad * 2;
  const h = body.height + pad * 2;
  const width = w + MARGIN * 2 + SHADOW;
  const height = h + TAIL + MARGIN * 2 + SHADOW;
  const { ctx, canvas } = pen(width, height);
  const tip = tipFor(side, w) + MARGIN;
  sticker(ctx, TONE.white, () => bubblePath(ctx, MARGIN, MARGIN, w, h, tip));
  body.paint(ctx, MARGIN + pad, MARGIN + pad);
  return { canvas, width, height, tipX: tip };
}

// A topic chip inside a speech bubble: what the pair is talking about.
export function topicBubble(text: string, tone: Tone, side: BubbleSide): Sticker {
  const measure = pen(1, 1).ctx;
  measure.font = displayFont(600, 15);
  const textWidth = Math.ceil(measure.measureText(text).width);
  const chip = { width: textWidth + 22, height: 28 };
  return bubble(
    {
      ...chip,
      paint: (ctx, x, y) => {
        ctx.beginPath();
        ctx.roundRect(x, y, chip.width, chip.height, 10);
        ctx.fillStyle = TONE[tone];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = TONE.ink;
        ctx.stroke();
        ctx.font = displayFont(600, 15);
        ctx.fillStyle = TONE.ink;
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + 11, y + chip.height / 2 + 1);
      },
    },
    side,
  );
}

// Plain words in a bubble ("¡Hola!").
export function textBubble(text: string, side: BubbleSide): Sticker {
  const measure = pen(1, 1).ctx;
  measure.font = displayFont(700, 16);
  const width = Math.ceil(measure.measureText(text).width) + 8;
  return bubble(
    {
      width,
      height: 22,
      paint: (ctx, x, y) => {
        ctx.font = displayFont(700, 16);
        ctx.fillStyle = TONE.ink;
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + 4, y + 12);
      },
    },
    side,
  );
}

// The listener's reply: three typing dots, so the story needs no extra copy.
export function dotsBubble(side: BubbleSide): Sticker {
  return bubble(
    {
      width: 40,
      height: 22,
      paint: (ctx, x, y) => {
        ctx.fillStyle = TONE.ink;
        [6, 20, 34].forEach((dx) => {
          ctx.beginPath();
          ctx.arc(x + dx, y + 11, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      },
    },
    side,
  );
}

function bolt(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x, y + 11);
  ctx.lineTo(x + 6, y + 11);
  ctx.lineTo(x + 4, y + 20);
  ctx.lineTo(x + 13, y + 8);
  ctx.lineTo(x + 7, y + 8);
  ctx.closePath();
  ctx.fillStyle = TONE.ink;
  ctx.fill();
}

// The points pill: "+50" on sun for a new connection, "+20 reencuentro" on sky for a reconnection.
export function pointsBadge(points: number, word: string | null, tone: Tone): Sticker {
  const number = `+${points}`;
  const measure = pen(1, 1).ctx;
  measure.font = displayFont(700, 24);
  const numberWidth = Math.ceil(measure.measureText(number).width);
  measure.font = displayFont(700, 14);
  const wordWidth = word ? Math.ceil(measure.measureText(word).width) + 8 : 0;
  const w = 14 + 13 + 6 + numberWidth + wordWidth + 14;
  const h = 40;
  const width = w + MARGIN * 2 + SHADOW;
  const height = h + MARGIN * 2 + SHADOW;
  const { ctx, canvas } = pen(width, height);
  sticker(ctx, TONE[tone], () => {
    ctx.beginPath();
    ctx.roundRect(MARGIN, MARGIN, w, h, 12);
  });
  bolt(ctx, MARGIN + 14, MARGIN + 10);
  ctx.fillStyle = TONE.ink;
  ctx.textBaseline = "middle";
  ctx.font = displayFont(700, 24);
  ctx.fillText(number, MARGIN + 33, MARGIN + h / 2 + 1);
  if (word) {
    ctx.font = displayFont(700, 14);
    ctx.fillText(word, MARGIN + 33 + numberWidth + 8, MARGIN + h / 2 + 2);
  }
  return { canvas, width, height, tipX: width / 2 };
}

// A tiny personal QR: three finder squares and a fixed module pattern. `scanned` turns it into a mint check card.
const MODULES = ["1110100111", "1010010101", "1110101111", "0001100000", "1011011010", "0100110101", "1110010011", "1010101100", "1110011010"];

function qrModules(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number): void {
  ctx.fillStyle = TONE.ink;
  MODULES.forEach((row, r) =>
    [...row].forEach((bit, c) => {
      if (bit === "1") ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
    }),
  );
}

function check(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.moveTo(x + 9, y + 21);
  ctx.lineTo(x + 17, y + 29);
  ctx.lineTo(x + 32, y + 12);
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.strokeStyle = TONE.ink;
  ctx.stroke();
}

export function qrCard(scanned: boolean): Sticker {
  const side = 42;
  const width = side + MARGIN * 2 + SHADOW;
  const { ctx, canvas } = pen(width, width);
  sticker(ctx, scanned ? TONE.mint : TONE.white, () => {
    ctx.beginPath();
    ctx.roundRect(MARGIN, MARGIN, side, side, 9);
  });
  if (scanned) check(ctx, MARGIN, MARGIN);
  else qrModules(ctx, MARGIN + 6, MARGIN + 7, 3);
  return { canvas, width, height: width, tipX: width / 2 };
}

// One dash of a connection thread: white with an ink rim, tinted per thread by the material color.
export function dashCanvas(): HTMLCanvasElement {
  const { ctx, canvas } = pen(26, 12);
  ctx.beginPath();
  ctx.roundRect(1.5, 1.5, 23, 9, 4.5);
  ctx.fillStyle = TONE.white;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = TONE.ink;
  ctx.stroke();
  return canvas;
}

// The scan line that sweeps the QR: a sky bar with an ink rim.
export function scanLineCanvas(): Sticker {
  const width = 56;
  const height = 9;
  const { ctx, canvas } = pen(width, height);
  ctx.beginPath();
  ctx.roundRect(1.5, 1.5, width - 3, height - 3, 3);
  ctx.fillStyle = TONE.sky;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = TONE.ink;
  ctx.stroke();
  return { canvas, width, height, tipX: width / 2 };
}
