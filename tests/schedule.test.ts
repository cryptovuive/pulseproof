import { describe, expect, it } from "vitest";
import { buildFixtureCalendar, enrichFixtureFromVerifiedSchedule, formatKickoffCountdown, scheduleIntegrityIssues, scheduleParticipantLabel, verifiedSchedule, verifiedTournamentPath } from "@/lib/schedule";

describe("upcoming match schedule", () => {
  it("returns only future fixtures while carrying forward only result-backed participants", () => {
    const entries = verifiedSchedule(new Date("2026-07-14T20:00:00.000Z"));
    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.source === "verified-schedule")).toBe(true);
    expect(entries.map((entry) => entry.fixture.fixtureId)).toEqual([102, 103, 104]);
    expect(entries.find((entry) => entry.fixture.fixtureId === 104)?.fixture).toMatchObject({ homeTeam: "Spain", awayTeam: "TBD" });
    expect(entries.find((entry) => entry.fixture.fixtureId === 103)?.fixture).toMatchObject({ homeTeam: "France", awayTeam: "TBD" });
    expect(scheduleParticipantLabel(entries.find((entry) => entry.fixture.fixtureId === 104)!, "away")).toBe("Winner ENG–ARG");
    expect(scheduleIntegrityIssues(verifiedTournamentPath())).toEqual([]);
  });

  it("keeps the finished semi-final and both advancement paths in the tournament graph", () => {
    const path = verifiedTournamentPath();
    expect(path.map((entry) => entry.fixture.fixtureId)).toEqual([101, 102, 103, 104]);
    expect(path[0].result).toEqual({ phase: "FT", score: [0, 2], winnerTeam: "Spain", loserTeam: "France", replayFixtureId: 101 });
    expect(path[3].participantPaths?.home).toMatchObject({ kind: "winner", fixtureId: 101, label: "Spain" });
    expect(path[3].participantPaths?.away).toMatchObject({ kind: "winner", fixtureId: 102, label: "Winner ENG–ARG" });
  });

  it("rejects an eliminated team inside a supposedly confirmed future fixture", () => {
    const confirmed = verifiedSchedule(new Date("2026-07-15T05:00:00.000Z")).find((entry) => entry.fixture.fixtureId === 102)!;
    const corrupt = [{ ...confirmed, fixture: { ...confirmed.fixture, homeTeam: "Brazil" } }];
    expect(scheduleIntegrityIssues(corrupt)).toContain("eliminated team Brazil appears in confirmed future fixture 102");
  });

  it("formats countdowns without exposing negative time", () => {
    expect(formatKickoffCountdown("2026-07-14T19:00:00.000Z", Date.parse("2026-07-12T17:30:00.000Z"))).toBe("2d 1h 30m");
    expect(formatKickoffCountdown("2026-07-14T19:00:00.000Z", Date.parse("2026-07-14T20:00:00.000Z"))).toBe("Kick-off now");
  });

  it("creates a UTC calendar event with a ten-minute alarm and stable fixture UID", () => {
    const entry = verifiedSchedule(new Date("2026-07-12T00:00:00.000Z"))[0];
    const calendar = buildFixtureCalendar(entry);
    expect(calendar).toContain("UID:pulseproof-101@local");
    expect(calendar).toContain("DTSTART:20260714T190000Z");
    expect(calendar).toContain("TRIGGER:-PT10M");
    expect(calendar).toContain("Fixture cross-checked via RFEF result + Sky Sports event report");
  });

  it("enriches only an exact, current schedule match and preserves the TxLINE fixture ID", () => {
    const txlineFixture = {
      fixtureId: 18237038,
      homeTeam: "France",
      awayTeam: "Spain",
      startTime: "",
      competition: "Competition unavailable · TxLINE devnet",
      competitionSource: "unavailable" as const,
      stage: "Stage unavailable",
      gameState: -1,
    };
    expect(enrichFixtureFromVerifiedSchedule(txlineFixture, new Date("2026-07-13T00:00:00.000Z"))).toMatchObject({
      fixtureId: 18237038,
      competition: "FIFA World Cup 2026",
      competitionSource: "verified-schedule",
      stage: "Semi-final · Match 101 · Dallas Stadium",
      startTime: "2026-07-14T19:00:00.000Z",
    });
    expect(enrichFixtureFromVerifiedSchedule({ ...txlineFixture, homeTeam: "Vietnam", awayTeam: "Myanmar" }, new Date("2026-07-13T00:00:00.000Z")))
      .toMatchObject({ competitionSource: "unavailable", stage: "Stage unavailable" });
  });
});
