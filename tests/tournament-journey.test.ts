import { describe, expect, it } from "vitest";
import { scheduleParticipantLabel, verifiedTournamentPath } from "@/lib/schedule";
import { buildTournamentJourney } from "@/lib/tournament-journey";

const schedule = verifiedTournamentPath().reverse();

describe("tournament journey", () => {
  it("builds the resolved road to the final from finalised results", () => {
    const journey = buildTournamentJourney(schedule, []);
    expect(journey.semifinals.map((item) => item.fixture.fixtureId)).toEqual([101, 102]);
    expect(journey.final?.fixture).toMatchObject({ homeTeam: "Spain", awayTeam: "Argentina" });
    expect(scheduleParticipantLabel(journey.final!, "away")).toBe("Argentina");
    expect(journey.thirdPlace?.fixture).toMatchObject({ fixtureId: 103, homeTeam: "France", awayTeam: "England" });
  });

  it("selects the next fixture containing a followed team", () => {
    expect(buildTournamentJourney(schedule, ["Argentina"]).nextForFan?.fixture.fixtureId).toBe(104);
  });

  it("falls back to the earliest unfinished fixture without favorites", () => {
    expect(buildTournamentJourney(schedule, []).nextForFan?.fixture.fixtureId).toBe(103);
  });
});
