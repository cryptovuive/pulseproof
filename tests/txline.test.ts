import { describe, expect, it } from "vitest";
import { calculateMomentum, normalizeFixture, normalizeScoreRecord } from "@/lib/txline";

describe("TxLINE normalisation", () => {
  const fixture = normalizeFixture({
    FixtureId: 18209181,
    Participant1: "France",
    Participant2: "Morocco",
    Participant1IsHome: true,
    StartTime: "2026-07-09T20:00:00Z",
    GameState: 1,
  });

  it("maps the documented fixture schema", () => {
    expect(fixture).toMatchObject({ fixtureId: 18209181, homeTeam: "France", awayTeam: "Morocco", gameState: 1 });
  });

  it("maps a score action without trusting client-authored copy", () => {
    const moment = normalizeScoreRecord(
      { FixtureId: 18209181, Seq: 41, Ts: 1783628400000, Action: "goal", Participant: "Morocco", Minute: 18, Stats: { 1: 0, 2: 1 } },
      fixture,
    );
    expect(moment).toMatchObject({ type: "goal", team: "away", seq: 41, score: [0, 1], verified: true });
  });

  it("keeps momentum within accessible UI bounds", () => {
    const moments = Array.from({ length: 20 }, (_, index) =>
      normalizeScoreRecord({ Seq: index + 1, Action: "goal", Participant: "France", Minute: index }, fixture),
    );
    expect(calculateMomentum(moments)).toBeLessThanOrEqual(88);
  });
});
