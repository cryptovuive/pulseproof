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
    expect(journey.final?.result).toMatchObject({ winnerTeam: "Spain", score: [1, 0] });
    expect(journey.thirdPlace?.result).toMatchObject({ winnerTeam: "England", score: [4, 6] });
    expect(journey.nextForFan).toBeUndefined();
  });

  it("selects the next fixture containing a followed team", () => {
    const beforeFinal = schedule.map((entry) => entry.fixture.fixtureId === 104 ? { ...entry, result: undefined } : entry);
    expect(buildTournamentJourney(beforeFinal, ["Argentina"]).nextForFan?.fixture.fixtureId).toBe(104);
  });

  it("falls back to the earliest unfinished fixture without favorites", () => {
    const beforeFinalWeekend = schedule.map((entry) => [103, 104].includes(entry.fixture.fixtureId) ? { ...entry, result: undefined } : entry);
    expect(buildTournamentJourney(beforeFinalWeekend, []).nextForFan?.fixture.fixtureId).toBe(103);
  });
});
