import { describe, expect, it } from "vitest";
import { buildFixtureCalendar, enrichFixtureFromVerifiedSchedule, formatKickoffCountdown, scheduleIntegrityIssues, scheduleParticipantLabel, verifiedSchedule, verifiedTournamentPath } from "@/lib/schedule";

describe("upcoming match schedule", () => {
  it("returns future fixtures with both semi-final advancement paths resolved", () => {
    const entries = verifiedSchedule(new Date("2026-07-14T20:00:00.000Z"));
    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.source === "verified-schedule")).toBe(true);
    expect(entries.map((entry) => entry.fixture.fixtureId)).toEqual([102, 103, 104]);
    expect(entries.find((entry) => entry.fixture.fixtureId === 104)?.fixture).toMatchObject({ homeTeam: "Spain", awayTeam: "Argentina" });
    expect(entries.find((entry) => entry.fixture.fixtureId === 103)?.fixture).toMatchObject({ homeTeam: "France", awayTeam: "England" });
    expect(scheduleParticipantLabel(entries.find((entry) => entry.fixture.fixtureId === 104)!, "away")).toBe("Argentina");
    expect(scheduleIntegrityIssues(verifiedTournamentPath())).toEqual([]);
  });

  it("keeps both finished semi-finals and their replay IDs in the tournament graph", () => {
    const path = verifiedTournamentPath();
    expect(path.map((entry) => entry.fixture.fixtureId)).toEqual([101, 102, 103, 104]);
    expect(path[0].result).toEqual({ phase: "FT", score: [0, 2], winnerTeam: "Spain", loserTeam: "France", replayFixtureId: 101 });
    expect(path[1].result).toEqual({ phase: "FT", score: [1, 2], winnerTeam: "Argentina", loserTeam: "England", replayFixtureId: 18241006 });
    expect(path[3].participantPaths?.home).toMatchObject({ kind: "winner", fixtureId: 101, label: "Spain" });
    expect(path[3].participantPaths?.away).toMatchObject({ kind: "winner", fixtureId: 102, label: "Argentina" });
  });

  it("rejects an eliminated team inside a confirmed final fixture", () => {
    const confirmed = verifiedSchedule(new Date("2026-07-16T05:00:00.000Z")).find((entry) => entry.fixture.fixtureId === 104)!;
    const corrupt = [{ ...confirmed, fixture: { ...confirmed.fixture, homeTeam: "Brazil" } }];
    expect(scheduleIntegrityIssues(corrupt)).toContain("eliminated team Brazil appears in confirmed future fixture 104");
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
      fixtureId: 18257865,
      homeTeam: "France",
      awayTeam: "England",
      startTime: "",
      competition: "Competition unavailable · TxLINE devnet",
      competitionSource: "unavailable" as const,
      stage: "Stage unavailable",
      gameState: -1,
    };
    expect(enrichFixtureFromVerifiedSchedule(txlineFixture, new Date("2026-07-16T00:00:00.000Z"))).toMatchObject({
      fixtureId: 18257865,
      competition: "FIFA World Cup 2026",
      competitionSource: "verified-schedule",
      stage: "Third place · Match 103 · Miami Stadium",
      startTime: "2026-07-18T21:00:00.000Z",
    });
    expect(enrichFixtureFromVerifiedSchedule({ ...txlineFixture, homeTeam: "Vietnam", awayTeam: "Myanmar" }, new Date("2026-07-16T00:00:00.000Z")))
      .toMatchObject({ competitionSource: "unavailable", stage: "Stage unavailable" });
  });
});
