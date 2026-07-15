import { demoReplayEnabled } from "@/lib/pulse-service";
import { isWorldCup2026Fixture, scheduleIntegrityIssues, verifiedSchedule, verifiedTournamentPath } from "@/lib/schedule";
import { getFixtures, hasTxLineCredentials } from "@/lib/txline";
import type { ScheduleEntry } from "@/types/pulse";

export async function listUpcomingSchedule(now = new Date()): Promise<{
  entries: ScheduleEntry[];
  tournamentEntries: ScheduleEntry[];
  source: "txline-fixtures" | "verified-schedule";
}> {
  const tournamentEntries = verifiedTournamentPath();
  const tournamentIssues = scheduleIntegrityIssues(tournamentEntries);
  if (tournamentIssues.length) throw new Error(`Verified tournament path failed integrity checks: ${tournamentIssues.join("; ")}`);
  if (hasTxLineCredentials()) {
    try {
      const current = now.getTime();
      const entries: ScheduleEntry[] = (await getFixtures())
        .filter(isWorldCup2026Fixture)
        .filter((fixture) => Number.isFinite(Date.parse(fixture.startTime)) && Date.parse(fixture.startTime) > current)
        .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
        .slice(0, 16)
        .map((fixture) => ({
          fixture,
          source: "txline-fixtures",
          coverage: "txline-confirmed",
          provenance: { provider: "TxLINE fixtures snapshot", verifiedAt: now.toISOString() },
        }));
      // Devnet may publish covered fixture IDs without authoritative kick-off
      // metadata. In that case use the separately sourced schedule instead of
      // manufacturing dates from the time of the API request.
      if (entries.length) return { entries, tournamentEntries, source: "txline-fixtures" };
    } catch (error) {
      if (!demoReplayEnabled()) throw error;
    }
  }
  if (!demoReplayEnabled()) throw new Error("TxLINE credentials are required when the verified schedule fallback is disabled");
  const entries = verifiedSchedule(now);
  return { entries, tournamentEntries, source: "verified-schedule" };
}
