import type { Fixture, ScheduleEntry } from "@/types/pulse";

const AP_ENGLAND_URL = "https://apnews.com/article/world-cup-england-argentina-score-2ae6a218ae88248db6565ffd13f60d38";
const AP_FINAL_URL = "https://apnews.com/article/argentina-messi-spain-yamal-world-cup-final-55077ce5c4728c4207a39cc4aa8a41a1";
const FRANCE_SPAIN_REPORT_URL = "https://www.skysports.com/football/france-vs-spain/549866";
const VERIFIED_AT = "2026-07-16T00:25:00.000Z";

export const ELIMINATED_TEAMS_AS_OF_VERIFICATION = new Set([
  "Brazil", "Norway", "Switzerland", "Morocco", "Portugal", "Belgium", "France", "England",
]);

export function isWorldCup2026Fixture(fixture: Fixture): boolean {
  const competition = fixture.competition.trim().toLowerCase();
  return competition.includes("world cup")
    && competition.includes("2026")
    && !competition.includes("club")
    && !competition.includes("women");
}

const VERIFIED_TOURNAMENT_FIXTURES: Array<{
  fixture: Fixture;
  coverage: ScheduleEntry["coverage"];
  provider: string;
  sourceUrl: string;
  txlineFixtureId?: number;
  result?: ScheduleEntry["result"];
  participantPaths?: ScheduleEntry["participantPaths"];
}> = [
  {
    fixture: { fixtureId: 101, homeTeam: "France", awayTeam: "Spain", startTime: "2026-07-14T19:00:00.000Z", competition: "FIFA World Cup 2026", competitionSource: "published-report", competitionSourceUrl: FRANCE_SPAIN_REPORT_URL, stage: "Semi-final · Match 101 · Dallas Stadium", gameState: 1 },
    coverage: "externally-confirmed",
    provider: "RFEF result + Sky Sports event report",
    sourceUrl: FRANCE_SPAIN_REPORT_URL,
    result: { phase: "FT", score: [0, 2], winnerTeam: "Spain", loserTeam: "France", replayFixtureId: 101 },
  },
  {
    fixture: { fixtureId: 102, homeTeam: "England", awayTeam: "Argentina", startTime: "2026-07-15T19:00:00.000Z", competition: "FIFA World Cup 2026", competitionSource: "published-report", competitionSourceUrl: AP_ENGLAND_URL, stage: "Semi-final · Match 102 · Atlanta Stadium", gameState: 1 },
    coverage: "externally-confirmed",
    provider: "TxLINE final snapshot + AP match report",
    sourceUrl: AP_ENGLAND_URL,
    txlineFixtureId: 18241006,
    result: { phase: "FT", score: [1, 2], winnerTeam: "Argentina", loserTeam: "England", replayFixtureId: 18241006 },
  },
  {
    fixture: { fixtureId: 103, homeTeam: "France", awayTeam: "England", startTime: "2026-07-18T21:00:00.000Z", competition: "FIFA World Cup 2026", competitionSource: "verified-schedule", competitionSourceUrl: AP_FINAL_URL, stage: "Third place · Match 103 · Miami Stadium", gameState: 0 },
    coverage: "externally-confirmed",
    provider: "FIFA schedule + both published semi-final results",
    sourceUrl: AP_FINAL_URL,
    txlineFixtureId: 18257865,
    participantPaths: {
      home: { kind: "loser", fixtureId: 101, label: "France" },
      away: { kind: "loser", fixtureId: 102, label: "England" },
    },
  },
  {
    fixture: { fixtureId: 104, homeTeam: "Spain", awayTeam: "Argentina", startTime: "2026-07-19T19:00:00.000Z", competition: "FIFA World Cup 2026", competitionSource: "verified-schedule", competitionSourceUrl: AP_FINAL_URL, stage: "Final · Match 104 · New York New Jersey Stadium", gameState: 0 },
    coverage: "externally-confirmed",
    provider: "FIFA schedule + both published semi-final results",
    sourceUrl: AP_FINAL_URL,
    txlineFixtureId: 18257739,
    participantPaths: {
      home: { kind: "winner", fixtureId: 101, label: "Spain" },
      away: { kind: "winner", fixtureId: 102, label: "Argentina" },
    },
  },
];

function toScheduleEntry(entry: typeof VERIFIED_TOURNAMENT_FIXTURES[number]): ScheduleEntry {
  return {
    fixture: { ...entry.fixture },
    coverage: entry.coverage,
    source: "verified-schedule",
    ...(entry.txlineFixtureId ? { txlineFixtureId: entry.txlineFixtureId } : {}),
    provenance: { provider: entry.provider, sourceUrl: entry.sourceUrl, verifiedAt: VERIFIED_AT },
    ...(entry.result ? { result: { ...entry.result } } : {}),
    ...(entry.participantPaths ? { participantPaths: entry.participantPaths } : {}),
  };
}

export function enrichFixtureFromVerifiedSchedule(fixture: Fixture, now = new Date()): Fixture {
  if (fixture.competitionSource !== "unavailable") return fixture;
  const match = VERIFIED_TOURNAMENT_FIXTURES.find(({ fixture: verified }) =>
    verified.homeTeam === fixture.homeTeam && verified.awayTeam === fixture.awayTeam,
  );
  if (!match) return fixture;
  const withinVerificationWindow = Math.abs(Date.parse(match.fixture.startTime) - now.getTime()) <= 7 * 24 * 60 * 60_000;
  if (!withinVerificationWindow) return fixture;
  return {
    ...fixture,
    startTime: fixture.startTime || match.fixture.startTime,
    competition: match.fixture.competition,
    competitionSource: "verified-schedule",
    competitionSourceUrl: match.sourceUrl,
    stage: fixture.stage === "Stage unavailable" ? match.fixture.stage : fixture.stage,
  };
}

export function verifiedSchedule(now = new Date()): ScheduleEntry[] {
  const current = now.getTime();
  return VERIFIED_TOURNAMENT_FIXTURES
    .filter(({ fixture }) => Date.parse(fixture.startTime) > current)
    .map(toScheduleEntry);
}

export function verifiedTournamentPath(): ScheduleEntry[] {
  return VERIFIED_TOURNAMENT_FIXTURES.map(toScheduleEntry);
}

export function verifiedTxLineFixtures(): Fixture[] {
  return VERIFIED_TOURNAMENT_FIXTURES
    .filter((entry): entry is typeof entry & { txlineFixtureId: number } => Number.isSafeInteger(entry.txlineFixtureId) && Number(entry.txlineFixtureId) > 0)
    .map((entry) => ({ ...entry.fixture, fixtureId: entry.txlineFixtureId }));
}

export function scheduleParticipantLabel(entry: ScheduleEntry, side: "home" | "away"): string {
  const team = side === "home" ? entry.fixture.homeTeam : entry.fixture.awayTeam;
  return team === "TBD" ? entry.participantPaths?.[side]?.label ?? "TBD" : team;
}

export function scheduleIntegrityIssues(entries: ScheduleEntry[]): string[] {
  const issues: string[] = [];
  const ids = new Set<number>();
  for (const entry of entries) {
    if (ids.has(entry.fixture.fixtureId)) issues.push(`duplicate schedule ID ${entry.fixture.fixtureId}`);
    ids.add(entry.fixture.fixtureId);
    if (!Number.isFinite(Date.parse(entry.fixture.startTime))) issues.push(`invalid start time for ${entry.fixture.fixtureId}`);
    if (!Number.isFinite(Date.parse(entry.provenance.verifiedAt))) issues.push(`missing verification time for ${entry.fixture.fixtureId}`);
    if (entry.coverage === "externally-confirmed" && !entry.result && !entry.fixture.stage.startsWith("Third place")) {
      for (const team of [entry.fixture.homeTeam, entry.fixture.awayTeam]) {
        if (ELIMINATED_TEAMS_AS_OF_VERIFICATION.has(team)) issues.push(`eliminated team ${team} appears in confirmed future fixture ${entry.fixture.fixtureId}`);
        if (team === "TBD") issues.push(`TBD participant marked confirmed for fixture ${entry.fixture.fixtureId}`);
      }
    }
    if (entry.result) {
      const { score, shootoutScore, winnerTeam, loserTeam, replayFixtureId } = entry.result;
      const teams = [entry.fixture.homeTeam, entry.fixture.awayTeam];
      if (!teams.includes(winnerTeam) || !teams.includes(loserTeam) || winnerTeam === loserTeam) {
        issues.push(`result participants do not match fixture ${entry.fixture.fixtureId}`);
      }
      const winnerIndex = teams.indexOf(winnerTeam);
      const loserIndex = teams.indexOf(loserTeam);
      const decidingScore = score[0] === score[1] && shootoutScore ? shootoutScore : score;
      if (winnerIndex < 0 || loserIndex < 0 || decidingScore[winnerIndex] <= decidingScore[loserIndex]) {
        issues.push(`winner does not match score for fixture ${entry.fixture.fixtureId}`);
      }
      if (!Number.isSafeInteger(replayFixtureId) || replayFixtureId <= 0) issues.push(`missing replay fixture for ${entry.fixture.fixtureId}`);
    }
    if (entry.coverage === "participants-pending") {
      if (entry.fixture.homeTeam !== "TBD" && !entry.participantPaths?.home) issues.push(`pending fixture ${entry.fixture.fixtureId} contains unsupported home participant`);
      if (entry.fixture.awayTeam !== "TBD" && !entry.participantPaths?.away) issues.push(`pending fixture ${entry.fixture.fixtureId} contains unsupported away participant`);
    }
    for (const side of ["home", "away"] as const) {
      const path = entry.participantPaths?.[side];
      if (!path) continue;
      const source = entries.find((candidate) => candidate.fixture.fixtureId === path.fixtureId);
      const actual = side === "home" ? entry.fixture.homeTeam : entry.fixture.awayTeam;
      if (source?.result) {
        const expected = path.kind === "winner" ? source.result.winnerTeam : source.result.loserTeam;
        if (actual !== expected) issues.push(`fixture ${entry.fixture.fixtureId} ${side} participant does not follow result ${path.fixtureId}`);
      } else if (actual !== "TBD") {
        issues.push(`fixture ${entry.fixture.fixtureId} ${side} participant was inferred before result ${path.fixtureId}`);
      }
    }
  }
  return issues;
}

export function formatKickoffCountdown(startTime: string, nowMs: number): string {
  const remaining = Math.max(0, Date.parse(startTime) - nowMs);
  if (!remaining) return "Kick-off now";
  const totalMinutes = Math.floor(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function icsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildFixtureCalendar(entry: ScheduleEntry): string {
  const start = new Date(entry.fixture.startTime);
  const end = new Date(start.getTime() + 2 * 60 * 60_000);
  const summary = `${scheduleParticipantLabel(entry, "home")} vs ${scheduleParticipantLabel(entry, "away")} — PulseProof`;
  const escape = (value: string) => value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const evidence = entry.coverage === "participants-pending"
    ? "Participants are intentionally TBD until both semi-finals finish."
    : `Fixture cross-checked via ${entry.provenance.provider}.`;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PulseProof//Match Reminder//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:pulseproof-${entry.fixture.fixtureId}@local`, `DTSTAMP:${icsTimestamp(new Date())}`,
    `DTSTART:${icsTimestamp(start)}`, `DTEND:${icsTimestamp(end)}`, `SUMMARY:${escape(summary)}`,
    `DESCRIPTION:${escape(`Open PulseProof 10 minutes before kick-off. ${evidence}`)}`,
    "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:PulseProof match starts in 10 minutes", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
