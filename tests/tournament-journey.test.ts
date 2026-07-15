import { describe, expect, it } from "vitest";
import { scheduleParticipantLabel, verifiedTournamentPath } from "@/lib/schedule";
import { buildTournamentJourney } from "@/lib/tournament-journey";

const schedule = verifiedTournamentPath().reverse();

describe("tournament journey", () => {
  it("builds a chronological road to the final with only result-backed qualifiers", () => {
    const journey = buildTournamentJourney(schedule, []);
    expect(journey.semifinals.map((item) => item.fixture.fixtureId)).toEqual([101, 102]);
    expect(journey.final?.fixture).toMatchObject({ homeTeam: "Spain", awayTeam: "TBD" });
    expect(scheduleParticipantLabel(journey.final!, "away")).toBe("Winner ENG–ARG");
    expect(journey.thirdPlace?.fixture.fixtureId).toBe(103);
  });

  it("selects the next fixture containing a followed team", () => {
    expect(buildTournamentJourney(schedule, ["Argentina"]).nextForFan?.fixture.fixtureId).toBe(102);
  });

  it("falls back to the earliest unfinished fixture without favorites", () => {
    expect(buildTournamentJourney(schedule, []).nextForFan?.fixture.fixtureId).toBe(102);
  });
});
