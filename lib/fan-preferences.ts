import type { MatchOverview } from "@/types/pulse";

export type MatchFilter = "all" | "live" | "finished" | "mine";

export interface FanPreferences {
  followedTeams: string[];
  spoilerFree: boolean;
  lastFixtureId?: number;
}

export const DEFAULT_FAN_PREFERENCES: FanPreferences = {
  followedTeams: [],
  spoilerFree: false,
};

export function normalizeFanPreferences(value: unknown): FanPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_FAN_PREFERENCES;
  const record = value as Record<string, unknown>;
  const followedTeams = Array.isArray(record.followedTeams)
    ? [...new Set(record.followedTeams.filter((team): team is string => typeof team === "string" && team.trim().length > 0).map((team) => team.trim()))].slice(0, 24)
    : [];
  const lastFixtureId = typeof record.lastFixtureId === "number" && Number.isSafeInteger(record.lastFixtureId) && record.lastFixtureId > 0
    ? record.lastFixtureId
    : undefined;
  return {
    followedTeams,
    spoilerFree: record.spoilerFree === true,
    ...(lastFixtureId ? { lastFixtureId } : {}),
  };
}

export function toggleFollowedTeam(preferences: FanPreferences, team: string): FanPreferences {
  const followed = preferences.followedTeams.includes(team);
  return {
    ...preferences,
    followedTeams: followed
      ? preferences.followedTeams.filter((item) => item !== team)
      : [...preferences.followedTeams, team].slice(-24),
  };
}

export function fixtureHasFollowedTeam(homeTeam: string, awayTeam: string, followedTeams: string[]): boolean {
  const followed = new Set(followedTeams);
  return followed.has(homeTeam) || followed.has(awayTeam);
}

export function selectPreferredFixture(
  matches: MatchOverview[],
  requestedFixtureId?: number,
  lastFixtureId?: number,
): number {
  const available = new Set(matches.map((match) => match.fixture.fixtureId));
  if (requestedFixtureId && available.has(requestedFixtureId)) return requestedFixtureId;
  if (lastFixtureId && available.has(lastFixtureId)) return lastFixtureId;
  return (matches.find((match) => match.phase === "LIVE") ?? matches[0])?.fixture.fixtureId ?? 0;
}

export function filterMatches(
  matches: MatchOverview[],
  filter: MatchFilter,
  followedTeams: string[],
): MatchOverview[] {
  if (filter === "finished") return matches.filter((match) => match.phase === "FT");
  if (filter === "live") return matches.filter((match) => match.source !== "demo-replay" && ["LIVE", "HT", "ET", "PEN"].includes(match.phase));
  if (filter === "mine") {
    return matches.filter((match) => fixtureHasFollowedTeam(match.fixture.homeTeam, match.fixture.awayTeam, followedTeams));
  }
  return matches;
}
