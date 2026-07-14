import type { Fixture, ScheduleEntry } from "@/types/pulse";

const FIFA_SCHEDULE_URL = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums/";
const AP_ENGLAND_URL = "https://apnews.com/article/world-cup-norway-england-score-f246f138c3a8563cb5a0e3f4037e930a";
const VERIFIED_AT = "2026-07-13T02:45:00.000Z";

export const ELIMINATED_TEAMS_AS_OF_VERIFICATION = new Set([
  "Brazil", "Norway", "Switzerland", "Morocco", "Portugal", "Belgium",
]);

export function isWorldCup2026Fixture(fixture: Fixture): boolean {
  const competition = fixture.competition.trim().toLowerCase();
  return competition.includes("world cup")
    && competition.includes("2026")
    && !competition.includes("club")
    && !competition.includes("women");
}

const VERIFIED_UPCOMING_FIXTURES: Array<{
  fixture: Fixture;
  coverage: ScheduleEntry["coverage"];
  provider: string;
  sourceUrl: string;
}> = [
  {
    fixture: { fixtureId: 101, homeTeam: "France", awayTeam: "Spain", startTime: "2026-07-14T19:00:00.000Z", competition: "FIFA World Cup 2026", competitionSource: "verified-schedule", competitionSourceUrl: FIFA_SCHEDULE_URL, stage: "Semi-final · Dallas Stadium", gameState: 0 },
    coverage: "externally-confirmed",
    provider: "FIFA match schedule",
    sourceUrl: FIFA_SCHEDULE_URL,
  },
  {
    fixture: { fixtureId: 102, homeTeam: "England", awayTeam: "Argentina", startTime: "2026-07-15T19:00:00.000Z", competition: "FIFA World Cup 2026", competitionSource: "verified-schedule", competitionSourceUrl: AP_ENGLAND_URL, stage: "Semi-final · Atlanta Stadium", gameState: 0 },
    coverage: "externally-confirmed",
    provider: "FIFA schedule + AP quarter-final confirmation",
    sourceUrl: AP_ENGLAND_URL,
  },
  {
    fixture: { fixtureId: 103, homeTeam: "TBD", awayTeam: "TBD", startTime: "2026-07-18T21:00:00.000Z", competition: "FIFA World Cup 2026", competitionSource: "verified-schedule", competitionSourceUrl: FIFA_SCHEDULE_URL, stage: "Third place · Miami Stadium", gameState: 0 },
    coverage: "participants-pending",
    provider: "FIFA match schedule",
    sourceUrl: FIFA_SCHEDULE_URL,
  },
  {
    fixture: { fixtureId: 104, homeTeam: "TBD", awayTeam: "TBD", startTime: "2026-07-19T19:00:00.000Z", competition: "FIFA World Cup 2026", competitionSource: "verified-schedule", competitionSourceUrl: FIFA_SCHEDULE_URL, stage: "Final · New York New Jersey Stadium", gameState: 0 },
    coverage: "participants-pending",
    provider: "FIFA match schedule",
    sourceUrl: FIFA_SCHEDULE_URL,
  },
];

export function enrichFixtureFromVerifiedSchedule(fixture: Fixture, now = new Date()): Fixture {
  if (fixture.competitionSource !== "unavailable") return fixture;
  const match = VERIFIED_UPCOMING_FIXTURES.find(({ fixture: verified }) =>
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
  return VERIFIED_UPCOMING_FIXTURES
    .filter(({ fixture }) => Date.parse(fixture.startTime) > current)
    .map(({ fixture, coverage, provider, sourceUrl }) => ({
      fixture,
      coverage,
      source: "verified-schedule" as const,
      provenance: { provider, sourceUrl, verifiedAt: VERIFIED_AT },
    }));
}

export function scheduleIntegrityIssues(entries: ScheduleEntry[]): string[] {
  const issues: string[] = [];
  const ids = new Set<number>();
  for (const entry of entries) {
    if (ids.has(entry.fixture.fixtureId)) issues.push(`duplicate schedule ID ${entry.fixture.fixtureId}`);
    ids.add(entry.fixture.fixtureId);
    if (!Number.isFinite(Date.parse(entry.fixture.startTime))) issues.push(`invalid start time for ${entry.fixture.fixtureId}`);
    if (!Number.isFinite(Date.parse(entry.provenance.verifiedAt))) issues.push(`missing verification time for ${entry.fixture.fixtureId}`);
    if (entry.coverage === "externally-confirmed") {
      for (const team of [entry.fixture.homeTeam, entry.fixture.awayTeam]) {
        if (ELIMINATED_TEAMS_AS_OF_VERIFICATION.has(team)) issues.push(`eliminated team ${team} appears in confirmed future fixture ${entry.fixture.fixtureId}`);
        if (team === "TBD") issues.push(`TBD participant marked confirmed for fixture ${entry.fixture.fixtureId}`);
      }
    }
    if (entry.coverage === "participants-pending" && (entry.fixture.homeTeam !== "TBD" || entry.fixture.awayTeam !== "TBD")) {
      issues.push(`pending fixture ${entry.fixture.fixtureId} contains inferred participants`);
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
  const summary = `${entry.fixture.homeTeam} vs ${entry.fixture.awayTeam} — PulseProof`;
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
