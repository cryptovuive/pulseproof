import { describe, expect, it } from "vitest";
import { reconcileTournamentPath } from "@/lib/schedule-service";
import { scheduleIntegrityIssues, verifiedTournamentPath } from "@/lib/schedule";
import type { Fixture, MatchPulse } from "@/types/pulse";

function pulse(fixture: Fixture, score: [number, number], shootoutScore?: [number, number]): MatchPulse {
  return {
    fixture,
    source: "txline-live",
    phase: "FT",
    minute: 120,
    score,
    ...(shootoutScore ? { shootoutScore } : {}),
    momentum: 50,
    updatedAt: "2026-07-20T00:00:00.000Z",
    moments: [{
      id: `final-${fixture.fixtureId}`,
      fixtureId: fixture.fixtureId,
      seq: 999,
      minute: 120,
      type: "final",
      team: "neutral",
      title: "Full time",
      description: "TxLINE final marker",
      points: 20,
      badge: 7,
      score,
      txlineAction: "game_finalised",
      occurredAt: "2026-07-20T00:00:00.000Z",
      verified: true,
    }],
    provenance: { provider: "TxLINE devnet score snapshot", verifiedAt: "2026-07-20T00:00:01.000Z" },
  };
}

describe("automatic tournament reconciliation", () => {
  it("settles remaining fixtures, including a penalty winner, from TxLINE final snapshots", async () => {
    const result = await reconcileTournamentPath(
      verifiedTournamentPath(),
      async (fixture) => {
        if (fixture.fixtureId === 18241006) return pulse(fixture, [1, 2]);
        if (fixture.fixtureId === 18257865) return pulse(fixture, [2, 1]);
        if (fixture.fixtureId === 18257739) return pulse(fixture, [1, 1], [4, 5]);
        throw new Error("not covered");
      },
      new Date("2026-07-20T23:00:00.000Z"),
    );
    expect(result.find((entry) => entry.fixture.fixtureId === 103)?.result).toMatchObject({
      score: [2, 1], winnerTeam: "France", loserTeam: "England", replayFixtureId: 18257865,
    });
    expect(result.find((entry) => entry.fixture.fixtureId === 104)?.result).toMatchObject({
      score: [1, 1], shootoutScore: [4, 5], winnerTeam: "Argentina", loserTeam: "Spain", replayFixtureId: 18257739,
    });
    expect(scheduleIntegrityIssues(result)).toEqual([]);
  });

  it("never invents a winner before TxLINE emits the final marker", async () => {
    const entries = verifiedTournamentPath();
    const result = await reconcileTournamentPath(entries, async (fixture) => ({ ...pulse(fixture, [1, 0]), phase: "LIVE" }), new Date("2026-07-20T23:00:00.000Z"));
    expect(result.find((entry) => entry.fixture.fixtureId === 103)?.result).toBeUndefined();
    expect(result.find((entry) => entry.fixture.fixtureId === 104)?.result).toBeUndefined();
  });
});
