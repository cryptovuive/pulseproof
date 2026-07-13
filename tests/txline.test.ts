import { describe, expect, it } from "vitest";
import { calculateMomentum, inferMatchPhase, normalizeFixture, normalizeScoreRecord } from "@/lib/txline";

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
    expect(fixture).toMatchObject({ fixtureId: 18209181, homeTeam: "France", awayTeam: "Morocco", competition: "Competition unavailable · TxLINE devnet", competitionSource: "unavailable", stage: "Stage unavailable", gameState: 1 });
  });

  it("does not invent fixture metadata omitted by the devnet snapshot", () => {
    const sparse = normalizeFixture({ FixtureId: 7, Participant1: "France", Participant2: "Spain" });
    expect(sparse).toMatchObject({ startTime: "", competition: "Competition unavailable · TxLINE devnet", stage: "Stage unavailable", gameState: -1 });
  });

  it("keeps competition and stage separate when TxLINE supplies both", () => {
    const complete = normalizeFixture({
      FixtureId: 8,
      Participant1: "Spain",
      Participant2: "France",
      CompetitionName: "FIFA World Cup 2026",
      Group: "Semi-final",
    });
    expect(complete).toMatchObject({ competition: "FIFA World Cup 2026", competitionSource: "txline", stage: "Semi-final" });
  });

  it("maps a score action without trusting client-authored copy", () => {
    const moment = normalizeScoreRecord(
      { FixtureId: 18209181, Seq: 41, Ts: 1783628400000, Action: "goal", Participant: "Morocco", Minute: 18, Stats: { 1: 0, 2: 1 } },
      fixture,
    );
    expect(moment).toMatchObject({ type: "goal", team: "away", seq: 41, score: [0, 1], verified: true });
  });

  it("preserves stoppage time and structured event details", () => {
    const moment = normalizeScoreRecord(
      {
        Seq: 44,
        Action: "yellow_card",
        Participant: "France",
        Minute: "90+6",
        Data: { PlayerName: "Kylian Mbappé" },
      },
      fixture,
    );
    expect(moment).toMatchObject({ minute: 96, minuteLabel: "90+6", type: "card", participant: "Kylian Mbappé", cardColor: "yellow" });
  });

  it("keeps momentum within accessible UI bounds", () => {
    const moments = Array.from({ length: 20 }, (_, index) =>
      normalizeScoreRecord({ Seq: index + 1, Action: "goal", Participant: "France", Minute: index }, fixture),
    );
    expect(calculateMomentum(moments)).toBeLessThanOrEqual(88);
  });

  it("does not call metadata-only coverage a live match or award it points", () => {
    const metadata = normalizeScoreRecord({ Seq: 1, Action: "coverage_update" }, fixture);
    expect(metadata).toMatchObject({ type: "moment", points: 0, badge: 0 });
    expect(inferMatchPhase([metadata])).toBe("COVERED");
    expect(inferMatchPhase([])).toBe("WAITING");
  });
});
