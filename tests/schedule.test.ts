import { describe, expect, it } from "vitest";
import { buildFixtureCalendar, formatKickoffCountdown, scheduleIntegrityIssues, verifiedSchedule } from "@/lib/schedule";

describe("upcoming match schedule", () => {
  it("returns only future cross-checked fixtures without inventing final participants", () => {
    const entries = verifiedSchedule(new Date("2026-07-14T20:00:00.000Z"));
    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.source === "verified-schedule")).toBe(true);
    expect(entries.map((entry) => entry.fixture.fixtureId)).toEqual([102, 103, 104]);
    expect(entries.filter((entry) => entry.coverage === "participants-pending").every((entry) => entry.fixture.homeTeam === "TBD" && entry.fixture.awayTeam === "TBD")).toBe(true);
    expect(scheduleIntegrityIssues(entries)).toEqual([]);
  });

  it("rejects an eliminated team inside a supposedly confirmed future fixture", () => {
    const [confirmed] = verifiedSchedule(new Date("2026-07-12T00:00:00.000Z"));
    const corrupt = [{ ...confirmed, fixture: { ...confirmed.fixture, homeTeam: "Brazil" } }];
    expect(scheduleIntegrityIssues(corrupt)).toContain("eliminated team Brazil appears in confirmed future fixture 101");
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
    expect(calendar).toContain("Fixture cross-checked via FIFA match schedule");
  });
});
