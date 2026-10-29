import { describe, expect, test } from "bun:test";
import { scenarioFrames } from "@/lib/testing/live-scenarios";
import { ballAt, makeBall, packBalls, radiusOf, stepBalls } from "./marbles";

const jar = { width: 800, height: 500 };

describe("marbles", () => {
  test("radius grows with points and never vanishes", () => {
    expect(radiusOf(0, 0, jar)).toBeGreaterThan(5);
    expect(radiusOf(100, 100, jar)).toBeGreaterThan(radiusOf(10, 100, jar));
  });

  test("balls settle inside the jar without overlapping much", () => {
    const people = scenarioFrames("rush")[0]!.people.slice(0, 80);
    const balls = people.map((person, index) => makeBall(person, index + 1, people[0]!.points, jar));
    for (let step = 0; step < 600; step++) stepBalls(balls, [], jar, 1 / 60, 0);
    for (const ball of balls) {
      expect(ball.x).toBeGreaterThanOrEqual(ball.r - 0.5);
      expect(ball.x).toBeLessThanOrEqual(jar.width - ball.r + 0.5);
      expect(ball.y).toBeLessThanOrEqual(jar.height - ball.r + 0.5);
    }
    const hit = balls[0]!;
    expect(ballAt(balls, hit.x, hit.y)?.id).toBe(hit.id);
    expect(ballAt(balls, -100, -100)).toBeNull();
  });

  test("packing keeps every ball inside the jar", () => {
    const people = scenarioFrames("rush")[0]!.people.slice(0, 120);
    const balls = people.map((person, index) => makeBall(person, index + 1, people[0]!.points, jar));
    packBalls(balls, jar);
    for (const ball of balls) {
      expect(ball.x - ball.r).toBeGreaterThanOrEqual(0);
      expect(ball.x + ball.r).toBeLessThanOrEqual(jar.width);
      expect(ball.y + ball.r).toBeLessThanOrEqual(jar.height);
    }
  });
});
