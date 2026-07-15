import { describe, expect, it } from "vitest";
import {
  filterMatches,
  fixtureHasFollowedTeam,
  normalizeFanPreferences,
  selectPreferredFixture,
  toggleFollowedTeam,
} from "@/lib/fan-preferences";
import { getDemoOverviews } from "@/lib/demo-data";
import type { MatchOverview } from "@/types/pulse";

describe("fan preferences and My Matches", () => {
  it("normalizes corrupted storage without accepting arbitrary values", () => {
    expect(normalizeFanPreferences({
      followedTeams: [" France ", "France", 7, "Spain"],
      spoilerFree: "yes",
      lastFixtureId: -2,
    })).toEqual({ followedTeams: ["France", "Spain"], spoilerFree: false });
  });

  it("toggles followed teams without duplicates", () => {
    const added = toggleFollowedTeam({ followedTeams: [], spoilerFree: false }, "France");
    expect(added.followedTeams).toEqual(["France"]);
    expect(toggleFollowedTeam(added, "France").followedTeams).toEqual([]);
  });

  it("prioritizes a valid deep link, then the resumed fixture, then live coverage", () => {
    const finished = getDemoOverviews();
    const live: MatchOverview = { ...finished[0], fixture: { ...finished[0].fixture, fixtureId: 7001 }, source: "txline-live", phase: "LIVE" };
    const matches = [live, ...finished];
    expect(selectPreferredFixture(matches, 18198205, 18187298)).toBe(18198205);
    expect(selectPreferredFixture(matches, 999, 18187298)).toBe(18187298);
    expect(selectPreferredFixture(matches, 999, 998)).toBe(7001);
  });

  it("builds My Matches from either followed participant", () => {
    const matches = getDemoOverviews();
    expect(filterMatches(matches, "mine", ["Spain"]).map((match) => match.fixture.fixtureId)).toEqual([101, 18198205]);
    expect(filterMatches(matches, "finished", [])).toHaveLength(4);
    expect(filterMatches(matches, "live", [])).toHaveLength(0);
    expect(fixtureHasFollowedTeam("France", "Spain", ["Spain"])).toBe(true);
    expect(fixtureHasFollowedTeam("France", "Morocco", ["Spain"])).toBe(false);
  });
});
