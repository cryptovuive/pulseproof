import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/txline", () => ({
  calculateMomentum: () => 50,
  hasActiveTxLineAccess: () => true,
  getFixtures: async () => [{
    fixtureId: 7001,
    homeTeam: "Vietnam",
    awayTeam: "Myanmar",
    startTime: "",
    competition: "Competition unavailable · TxLINE devnet",
    competitionSource: "unavailable",
    stage: "Stage unavailable",
    gameState: -1,
  }],
  getFixturePulse: async (fixture: unknown) => ({
    fixture,
    source: "txline-live",
    phase: "WAITING",
    minute: 0,
    score: [0, 0],
    momentum: 50,
    updatedAt: "2026-07-13T00:00:00.000Z",
    moments: [],
  }),
}));

import { listAvailableFixtures } from "@/lib/pulse-service";
import { isWorldCup2026Fixture } from "@/lib/schedule";

describe("match catalog", () => {
  beforeEach(() => vi.stubEnv("DEMO_REPLAY_ENABLED", "true"));
  afterEach(() => vi.unstubAllEnvs());

  it("accepts only the men's 2026 World Cup competition label", () => {
    const raw = { fixtureId: 1, homeTeam: "A", awayTeam: "B", startTime: "", competitionSource: "txline" as const, stage: "", gameState: 0 };
    expect(isWorldCup2026Fixture({ ...raw, competition: "FIFA World Cup 2026" })).toBe(true);
    expect(isWorldCup2026Fixture({ ...raw, competition: "FIFA Club World Cup 2026" })).toBe(false);
    expect(isWorldCup2026Fixture({ ...raw, competition: "Competition unavailable · TxLINE devnet" })).toBe(false);
  });

  it("removes TxLINE fixtures that cannot be proven to be World Cup 2026", async () => {
    const catalog = await listAvailableFixtures();
    expect(catalog.source).toBe("demo-replay");
    expect(catalog.matches.filter((match) => match.source === "txline-live")).toHaveLength(0);
    expect(catalog.matches.filter((match) => match.source === "demo-replay" && match.phase === "FT")).toHaveLength(4);
    expect(catalog.matches.filter((match) => match.fixture.competition === "FIFA World Cup 2026")).toHaveLength(4);
    expect(catalog.matches.some((match) => match.fixture.homeTeam === "Vietnam")).toBe(false);
  });
});
