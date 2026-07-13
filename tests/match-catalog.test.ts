import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/txline", () => ({
  calculateMomentum: () => 50,
  hasTxLineCredentials: () => true,
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

describe("match catalog", () => {
  beforeEach(() => vi.stubEnv("DEMO_REPLAY_ENABLED", "true"));
  afterEach(() => vi.unstubAllEnvs());

  it("keeps TxLINE coverage and verified World Cup finished replays together", async () => {
    const catalog = await listAvailableFixtures();
    expect(catalog.source).toBe("hybrid");
    expect(catalog.matches.filter((match) => match.source === "txline-live")).toHaveLength(1);
    expect(catalog.matches.filter((match) => match.source === "demo-replay" && match.phase === "FT")).toHaveLength(3);
    expect(catalog.matches.filter((match) => match.fixture.competition === "FIFA World Cup 2026")).toHaveLength(3);
  });
});
