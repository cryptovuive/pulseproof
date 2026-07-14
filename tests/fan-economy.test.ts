import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REWARD_CATALOG, REWARD_KIND_CODE, rewardIsAvailable } from "@/lib/reward-catalog";
import { getDailyQuizQuestions, getDailyQuizRound, getPracticeQuizRound, getQuizVariant, gradeDailyQuiz, QUIZ_BANK, QUIZ_CATALOG_SIZE } from "@/lib/quiz-bank";
import { MASCOT_2026_SOURCE, MASCOT_HISTORY_SOURCE, WORLD_CUP_MASCOTS } from "@/lib/mascot-archive";

describe("fan progression economy", () => {
  it("ships a unique 42-item non-financial cosmetic catalog", () => {
    expect(REWARD_CATALOG).toHaveLength(42);
    expect(new Set(REWARD_CATALOG.map((reward) => reward.id)).size).toBe(42);
    expect(REWARD_CATALOG.map((reward) => reward.index)).toEqual(Array.from({ length: 42 }, (_, index) => index));
    expect(new Set(REWARD_CATALOG.map((reward) => reward.kind))).toEqual(new Set(["badge", "medal", "frame", "character"]));
    expect(REWARD_CATALOG.every((reward) => reward.price > 0 && reward.price <= 10_000)).toBe(true);
    expect(REWARD_CATALOG.every((reward) => reward.atlasIndex >= 0 && reward.atlasIndex < 6)).toBe(true);
    expect(REWARD_CATALOG.filter((reward) => reward.availableUntil).length).toBeGreaterThanOrEqual(6);
    expect(REWARD_KIND_CODE).toEqual({ badge: 0, medal: 1, frame: 2, character: 3 });
    expect(REWARD_CATALOG.filter((reward) => reward.shirt)).toHaveLength(6);
  });

  it("time-gates seasonal rewards without changing their catalog price", () => {
    const limited = REWARD_CATALOG.find((reward) => reward.id === "eclipse-final")!;
    expect(rewardIsAvailable(limited, Date.parse("2026-07-14T00:00:00Z"))).toBe(true);
    expect(rewardIsAvailable(limited, Date.parse("2026-07-22T00:00:00Z"))).toBe(false);
    expect(limited.price).toBe(560);
    expect(limited.availableUntil).toBe("2026-07-21T23:59:59.000Z");
  });

  it("renders seasonal close times deterministically across server and browser timezones", () => {
    const component = readFileSync(join(process.cwd(), "components", "fan-zone.tsx"), "utf8");
    expect(component).toContain("formatUtcClose(reward.availableUntil)");
    expect(component).not.toContain("toLocaleDateString");
  });

  it("ships six high-resolution 3-by-2 cosmetic atlases", () => {
    for (const filename of ["legacy-atlas.webp", "world-2026-atlas.webp", "community-atlas.webp", "mythic-atlas.webp", "frame-atlas.webp", "character-atlas.webp"]) {
      const file = readFileSync(join(process.cwd(), "public", "rewards", filename));
      expect(file.subarray(0, 4).toString()).toBe("RIFF");
      expect(file.subarray(8, 12).toString()).toBe("WEBP");
      expect(file.length).toBeGreaterThan(150_000);
      expect(file.length).toBeLessThan(500_000);
    }
  });
});

describe("sourced World Cup quiz", () => {
  const now = Date.parse("2026-07-14T12:00:00Z");

  it("contains a deep source-linked bank with only two or four choices", () => {
    expect(QUIZ_BANK.length).toBeGreaterThanOrEqual(35);
    expect(new Set(QUIZ_BANK.map((question) => question.id)).size).toBe(QUIZ_BANK.length);
    for (const question of QUIZ_BANK) {
      expect([2, 4]).toContain(question.options.length);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.options.length);
      expect(question.sourceUrl).toMatch(/^https:\/\/(?:www\.|inside\.)?fifa\.com\//);
      expect(question.explanation.length).toBeGreaterThan(20);
    }
  });

  it("publishes five questions without leaking answers", () => {
    const round = getDailyQuizRound(now);
    expect(round.questions).toHaveLength(5);
    expect(round.maxPoints).toBe(70);
    expect(JSON.stringify(round)).not.toContain("correctIndex");
    expect(JSON.stringify(round)).not.toContain("explanation");
    expect(round.catalogSize).toBe(10_000);
  });

  it("keeps the mascot archive aligned to FIFA's official history", () => {
    expect(WORLD_CUP_MASCOTS).toHaveLength(16);
    expect(WORLD_CUP_MASCOTS[0]).toMatchObject({ edition: 1966, name: "World Cup Willie", form: "Lion" });
    expect(WORLD_CUP_MASCOTS.at(-1)).toMatchObject({ edition: 2026, name: "Maple · Zayu · Clutch", form: "Moose · Jaguar · Bald eagle" });
    expect([MASCOT_HISTORY_SOURCE, MASCOT_2026_SOURCE].every((url) => url.startsWith("https://www.fifa.com/"))).toBe(true);
  });

  it("exposes ten thousand stable source-preserving variants plus ten-question practice", () => {
    expect(QUIZ_CATALOG_SIZE).toBe(10_000);
    const variants = Array.from({ length: QUIZ_CATALOG_SIZE }, (_, index) => getQuizVariant(index));
    expect(new Set(variants.map((question) => question.id)).size).toBe(10_000);
    expect(variants.every((question) => [2, 4].includes(question.options.length))).toBe(true);
    const practice = getPracticeQuizRound(12345);
    expect(practice.questions).toHaveLength(10);
    expect(practice.maxPoints).toBe(0);
    expect(JSON.stringify(practice)).not.toContain("correctIndex");
  });

  it("grades a perfect round deterministically and rejects stale rounds", () => {
    const round = getDailyQuizRound(now);
    const privateQuestions = getDailyQuizQuestions(round.validForUtcDay);
    const graded = gradeDailyQuiz(round.roundId, privateQuestions.map((question) => question.correctIndex), now);
    expect(graded.score).toBe(5);
    expect(graded.points).toBe(70);
    expect(graded.results.every((result) => result.correct)).toBe(true);
    expect(() => gradeDailyQuiz("world-cup-daily-1", [0, 0, 0, 0, 0], now)).toThrow("expired");
  });
});
