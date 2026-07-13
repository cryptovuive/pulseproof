import { describe, expect, it } from "vitest";
import { buildTournamentJourney } from "@/lib/tournament-journey";
import type { ScheduleEntry } from "@/types/pulse";

const entry = (fixtureId: number, homeTeam: string, awayTeam: string, stage: string, startTime: string): ScheduleEntry => ({
  fixture: {
    fixtureId,
    homeTeam,
    awayTeam,
    stage,
    startTime,
    competition: "FIFA World Cup 2026",
    competitionSource: "verified-schedule",
    gameState: 0,
  },
  source: "verified-schedule",
  coverage: homeTeam === "TBD" ? "participants-pending" : "externally-confirmed",
  provenance: { provider: "FIFA", sourceUrl: "https://example.test/schedule", verifiedAt: "2026-07-13T02:45:00.000Z" },
});

const schedule = [
  entry(104, "TBD", "TBD", "Final · New York New Jersey Stadium", "2026-07-19T19:00:00.000Z"),
  entry(102, "England", "Argentina", "Semi-final · Atlanta Stadium", "2026-07-15T19:00:00.000Z"),
  entry(103, "TBD", "TBD", "Third place · Miami Stadium", "2026-07-18T21:00:00.000Z"),
  entry(101, "France", "Spain", "Semi-final · Dallas Stadium", "2026-07-14T19:00:00.000Z"),
];

describe("tournament journey", () => {
  it("builds a chronological road to the final without filling TBD participants", () => {
    const journey = buildTournamentJourney(schedule, []);
    expect(journey.semifinals.map((item) => item.fixture.fixtureId)).toEqual([101, 102]);
    expect(journey.final?.fixture).toMatchObject({ homeTeam: "TBD", awayTeam: "TBD" });
    expect(journey.thirdPlace?.fixture.fixtureId).toBe(103);
  });

  it("selects the next fixture containing a followed team", () => {
    expect(buildTournamentJourney(schedule, ["Argentina"]).nextForFan?.fixture.fixtureId).toBe(102);
  });

  it("falls back to the earliest published fixture without favorites", () => {
    expect(buildTournamentJourney(schedule, []).nextForFan?.fixture.fixtureId).toBe(101);
  });
});
