import { demoReplayEnabled } from "@/lib/pulse-service";
import { enrichFixtureFromVerifiedSchedule, isWorldCup2026Fixture, scheduleIntegrityIssues, verifiedTournamentPath } from "@/lib/schedule";
import { getFixturePulse, getFixtures, hasTxLineCredentials } from "@/lib/txline";
import type { Fixture, MatchPulse, ScheduleEntry } from "@/types/pulse";

type PulseLoader = (fixture: Fixture) => Promise<MatchPulse>;

function decidingWinner(entry: ScheduleEntry, pulse: MatchPulse) {
  const score = pulse.score;
  const decidingScore = score[0] === score[1] ? pulse.shootoutScore : score;
  if (!decidingScore || decidingScore[0] === decidingScore[1]) return undefined;
  const homeWon = decidingScore[0] > decidingScore[1];
  return {
    phase: "FT" as const,
    score,
    ...(pulse.shootoutScore ? { shootoutScore: pulse.shootoutScore } : {}),
    winnerTeam: homeWon ? entry.fixture.homeTeam : entry.fixture.awayTeam,
    loserTeam: homeWon ? entry.fixture.awayTeam : entry.fixture.homeTeam,
    replayFixtureId: entry.txlineFixtureId ?? entry.fixture.fixtureId,
  };
}

function resolveParticipants(entries: ScheduleEntry[]): ScheduleEntry[] {
  const byId = new Map(entries.map((entry) => [entry.fixture.fixtureId, entry]));
  return entries.map((entry) => {
    const fixture = { ...entry.fixture };
    for (const side of ["home", "away"] as const) {
      const path = entry.participantPaths?.[side];
      if (!path) continue;
      const source = byId.get(path.fixtureId);
      if (!source?.result) continue;
      const team = path.kind === "winner" ? source.result.winnerTeam : source.result.loserTeam;
      if (side === "home") fixture.homeTeam = team;
      else fixture.awayTeam = team;
    }
    const participantsResolved = fixture.homeTeam !== "TBD" && fixture.awayTeam !== "TBD";
    return {
      ...entry,
      fixture,
      coverage: participantsResolved && entry.coverage === "participants-pending" ? "externally-confirmed" : entry.coverage,
    };
  });
}

export async function reconcileTournamentPath(
  entries: ScheduleEntry[],
  load: PulseLoader = (fixture) => getFixturePulse(fixture),
  now = new Date(),
): Promise<ScheduleEntry[]> {
  const reconciled: ScheduleEntry[] = [];
  for (const entry of entries) {
    let next = { ...entry, fixture: { ...entry.fixture } };
    const started = Date.parse(entry.fixture.startTime) <= now.getTime();
    if (started && entry.txlineFixtureId) {
      try {
        const pulse = await load({ ...entry.fixture, fixtureId: entry.txlineFixtureId });
        const result = pulse.phase === "FT" ? decidingWinner(entry, pulse) : undefined;
        if (result) {
          next = {
            ...next,
            result,
            coverage: "externally-confirmed",
            provenance: {
              ...entry.provenance,
              provider: `${pulse.provenance?.provider ?? "TxLINE score snapshot"} + ${entry.provenance.provider}`,
              verifiedAt: pulse.provenance?.verifiedAt ?? now.toISOString(),
            },
          };
        }
      } catch {
        // A previously verified published result remains visible while TxLINE is
        // temporarily unavailable. Unfinished fixtures are never inferred.
      }
    }
    reconciled.push(next);
  }
  return resolveParticipants(reconciled);
}

export async function listUpcomingSchedule(now = new Date()): Promise<{
  entries: ScheduleEntry[];
  tournamentEntries: ScheduleEntry[];
  source: "txline-fixtures" | "verified-schedule";
}> {
  const tournamentEntries = await reconcileTournamentPath(verifiedTournamentPath(), undefined, now);
  const tournamentIssues = scheduleIntegrityIssues(tournamentEntries);
  if (tournamentIssues.length) throw new Error(`Verified tournament path failed integrity checks: ${tournamentIssues.join("; ")}`);
  if (hasTxLineCredentials()) {
    try {
      const current = now.getTime();
      const entries: ScheduleEntry[] = (await getFixtures())
        .map((fixture) => enrichFixtureFromVerifiedSchedule(fixture, now))
        .filter(isWorldCup2026Fixture)
        .filter((fixture) => Number.isFinite(Date.parse(fixture.startTime)) && Date.parse(fixture.startTime) > current)
        .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
        .slice(0, 16)
        .map((fixture) => ({
          fixture,
          txlineFixtureId: fixture.fixtureId,
          source: "txline-fixtures",
          coverage: "txline-confirmed",
          provenance: { provider: "TxLINE fixtures snapshot", verifiedAt: now.toISOString() },
        }));
      if (entries.length) return { entries, tournamentEntries, source: "txline-fixtures" };
    } catch (error) {
      if (!demoReplayEnabled()) throw error;
    }
  }
  if (!demoReplayEnabled()) throw new Error("TxLINE credentials are required when the verified schedule fallback is disabled");
  const entries = tournamentEntries.filter((entry) => Date.parse(entry.fixture.startTime) > now.getTime());
  return { entries, tournamentEntries, source: "verified-schedule" };
}
