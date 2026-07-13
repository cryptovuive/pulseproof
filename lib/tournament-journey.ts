import { fixtureHasFollowedTeam } from "@/lib/fan-preferences";
import type { ScheduleEntry } from "@/types/pulse";

export interface TournamentJourney {
  semifinals: ScheduleEntry[];
  final?: ScheduleEntry;
  thirdPlace?: ScheduleEntry;
  nextForFan?: ScheduleEntry;
}

export function buildTournamentJourney(
  entries: ScheduleEntry[],
  followedTeams: string[],
): TournamentJourney {
  const worldCup = entries
    .filter((entry) => entry.fixture.competition === "FIFA World Cup 2026")
    .sort((a, b) => Date.parse(a.fixture.startTime) - Date.parse(b.fixture.startTime));
  const semifinals = worldCup.filter((entry) => entry.fixture.stage.toLowerCase().includes("semi-final"));
  const final = worldCup.find((entry) => /^final\b/i.test(entry.fixture.stage));
  const thirdPlace = worldCup.find((entry) => entry.fixture.stage.toLowerCase().includes("third place"));
  const followed = worldCup.find((entry) => fixtureHasFollowedTeam(
    entry.fixture.homeTeam,
    entry.fixture.awayTeam,
    followedTeams,
  ));
  const nextForFan = followed ?? worldCup[0];
  return {
    semifinals,
    ...(final ? { final } : {}),
    ...(thirdPlace ? { thirdPlace } : {}),
    ...(nextForFan ? { nextForFan } : {}),
  };
}
