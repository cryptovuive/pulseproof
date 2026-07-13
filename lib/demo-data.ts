import type { Fixture, MatchOverview, PulseMoment } from "@/types/pulse";

export const DEMO_FIXTURE: Fixture = {
  fixtureId: 18209181,
  homeTeam: "France",
  awayTeam: "Morocco",
  startTime: "2026-07-09T20:00:00.000Z",
  stage: "World Cup · Quarter-final",
  gameState: 1,
};

export const BRAZIL_NORWAY_FIXTURE: Fixture = {
  fixtureId: 18187298,
  homeTeam: "Brazil",
  awayTeam: "Norway",
  startTime: "2026-07-05T20:00:00.000Z",
  stage: "World Cup · Round of 16",
  gameState: 1,
};

export const PORTUGAL_SPAIN_FIXTURE: Fixture = {
  fixtureId: 18198205,
  homeTeam: "Portugal",
  awayTeam: "Spain",
  startTime: "2026-07-06T19:00:00.000Z",
  stage: "World Cup · Round of 16",
  gameState: 1,
};

export const DEMO_DATA_SOURCES: Record<number, { provider: string; url: string; checkedAt: string }> = {
  [BRAZIL_NORWAY_FIXTURE.fixtureId]: {
    provider: "FIFA full-time report + Sky Sports match report",
    url: "https://www.skysports.com/football/brazil-vs-norway/549856",
    checkedAt: "2026-07-12T15:30:00.000Z",
  },
  [PORTUGAL_SPAIN_FIXTURE.fixtureId]: {
    provider: "FIFA full-time report",
    url: "https://fdp.fifa.org/assetspublic/ce281/r12538/pdf/FullTimeMatchReport-English.pdf",
    checkedAt: "2026-07-12T15:30:00.000Z",
  },
  [DEMO_FIXTURE.fixtureId]: {
    provider: "FIFA result + Sky Sports match report",
    url: "https://www.skysports.com/football/france-vs-morocco/report/549862",
    checkedAt: "2026-07-12T15:30:00.000Z",
  },
};

type DemoMomentInput = Omit<PulseMoment, "fixtureId" | "occurredAt" | "verified">;

function createMoments(fixture: Fixture, moments: DemoMomentInput[]): PulseMoment[] {
  return moments.map((moment, index) => ({
    ...moment,
    fixtureId: fixture.fixtureId,
    occurredAt: new Date(Date.parse(fixture.startTime) + moment.minute * 60_000 + index * 1_000).toISOString(),
    verified: false,
  }));
}

export const DEMO_MOMENTS = createMoments(DEMO_FIXTURE, [
  { id: "fra-mar-kickoff", seq: 1, minute: 0, type: "kickoff", team: "neutral", title: "Quarter-final underway", description: "France and Morocco begin their quarter-final in Boston.", points: 5, badge: 0, score: [0, 0], txlineAction: "game_started" },
  { id: "fra-mar-penalty-save-28", seq: 96, minute: 28, type: "shot", team: "home", title: "Bounou saves Mbappé penalty", description: "Morocco goalkeeper Yassine Bounou keeps the match scoreless from the spot.", points: 6, badge: 1, score: [0, 0], txlineAction: "penalty_saved" },
  { id: "fra-mar-halftime", seq: 154, minute: 45, type: "halftime", team: "neutral", title: "Scoreless at half-time", description: "Morocco hold France to 0–0 through the opening half.", points: 8, badge: 4, score: [0, 0], txlineAction: "halftime_finalised" },
  { id: "fra-mar-goal-60", seq: 216, minute: 60, type: "goal", team: "home", title: "Mbappé breaks the deadlock", description: "Kylian Mbappé finds the far corner to put France ahead.", points: 12, badge: 2, score: [1, 0], txlineAction: "goal" },
  { id: "fra-mar-goal-66", seq: 238, minute: 66, type: "goal", team: "home", title: "Dembélé doubles the lead", description: "Ousmane Dembélé scores France's second six minutes later.", points: 12, badge: 2, score: [2, 0], txlineAction: "goal" },
  { id: "fra-mar-final", seq: 341, minute: 90, type: "final", team: "neutral", title: "France advance 2–0", description: "Full-time confirms France's place in the semi-finals and Morocco's elimination.", points: 20, badge: 7, score: [2, 0], txlineAction: "game_finalised" },
]);

export const BRAZIL_NORWAY_MOMENTS = createMoments(BRAZIL_NORWAY_FIXTURE, [
  { id: "bra-nor-kickoff", seq: 1, minute: 0, type: "kickoff", team: "neutral", title: "Round-of-16 begins", description: "Brazil face Norway for a place in the quarter-finals.", points: 5, badge: 0, score: [0, 0], txlineAction: "game_started" },
  { id: "bra-nor-penalty-save-14", seq: 52, minute: 14, type: "shot", team: "home", title: "Nyland saves Brazil penalty", description: "Bruno Guimarães is denied from the penalty spot by Ørjan Nyland.", points: 6, badge: 1, score: [0, 0], txlineAction: "penalty_saved" },
  { id: "bra-nor-halftime", seq: 154, minute: 45, type: "halftime", team: "neutral", title: "Goalless at the break", description: "The last-16 tie remains 0–0 after 45 minutes.", points: 8, badge: 4, score: [0, 0], txlineAction: "halftime_finalised" },
  { id: "bra-nor-sub-68", seq: 247, minute: 68, type: "moment", team: "home", title: "Neymar enters", description: "Brazil introduce Neymar as the tie moves into its decisive phase.", points: 3, badge: 1, score: [0, 0], txlineAction: "substitution" },
  { id: "bra-nor-goal-79", seq: 286, minute: 79, type: "goal", team: "away", title: "Haaland heads Norway ahead", description: "Erling Haaland scores from Andreas Schjelderup's cross in the 79th minute.", points: 12, badge: 2, score: [0, 1], txlineAction: "goal" },
  { id: "bra-nor-goal-90", seq: 326, minute: 90, type: "goal", team: "away", title: "Haaland makes it two", description: "Haaland drives in his second goal from outside the Brazil box.", points: 15, badge: 6, score: [0, 2], txlineAction: "goal" },
  { id: "bra-nor-goal-100", seq: 338, minute: 100, type: "goal", team: "home", title: "Neymar converts late penalty", description: "Neymar scores at 90+10, but it is only a consolation for Brazil.", points: 12, badge: 2, score: [1, 2], txlineAction: "penalty_goal" },
  { id: "bra-nor-final", seq: 341, minute: 100, type: "final", team: "neutral", title: "Norway eliminate Brazil", description: "Full-time: Brazil 1–2 Norway. Norway advance and Brazil leave the tournament.", points: 20, badge: 7, score: [1, 2], txlineAction: "game_finalised" },
]);

export const PORTUGAL_SPAIN_MOMENTS = createMoments(PORTUGAL_SPAIN_FIXTURE, [
  { id: "por-esp-kickoff", seq: 1, minute: 0, type: "kickoff", team: "neutral", title: "Iberian tie underway", description: "Portugal and Spain begin their round-of-16 match in Dallas.", points: 5, badge: 0, score: [0, 0], txlineAction: "game_started" },
  { id: "por-esp-halftime", seq: 157, minute: 45, type: "halftime", team: "neutral", title: "Scoreless at half-time", description: "Neither side finds a first-half breakthrough.", points: 8, badge: 4, score: [0, 0], txlineAction: "halftime_finalised" },
  { id: "por-esp-goal-91", seq: 329, minute: 91, type: "goal", team: "away", title: "Merino wins it in added time", description: "Substitute Mikel Merino scores the match's only goal in the 91st minute.", points: 15, badge: 6, score: [0, 1], txlineAction: "goal" },
  { id: "por-esp-final", seq: 338, minute: 91, type: "final", team: "neutral", title: "Spain advance 1–0", description: "Full-time confirms Portugal's elimination and Spain's quarter-final place.", points: 20, badge: 7, score: [0, 1], txlineAction: "game_finalised" },
]);

export const DEMO_FIXTURES = [DEMO_FIXTURE, PORTUGAL_SPAIN_FIXTURE, BRAZIL_NORWAY_FIXTURE];

export const DEMO_MOMENTS_BY_FIXTURE: Record<number, PulseMoment[]> = {
  [DEMO_FIXTURE.fixtureId]: DEMO_MOMENTS,
  [BRAZIL_NORWAY_FIXTURE.fixtureId]: BRAZIL_NORWAY_MOMENTS,
  [PORTUGAL_SPAIN_FIXTURE.fixtureId]: PORTUGAL_SPAIN_MOMENTS,
};

export const DEMO_DEFAULT_PHASE: Record<number, string> = {
  [BRAZIL_NORWAY_FIXTURE.fixtureId]: "FT",
  [PORTUGAL_SPAIN_FIXTURE.fixtureId]: "FT",
  [DEMO_FIXTURE.fixtureId]: "FT",
};

export function getDemoFixture(fixtureId: number) {
  return DEMO_FIXTURES.find((fixture) => fixture.fixtureId === fixtureId);
}

export function getDemoMomentsForFixture(fixtureId: number, cursor?: number): PulseMoment[] {
  const moments = DEMO_MOMENTS_BY_FIXTURE[fixtureId] ?? [];
  if (cursor === undefined) return moments;
  return moments.slice(0, Math.max(1, Math.min(cursor, moments.length)));
}

export function getDemoOverviews(): MatchOverview[] {
  return DEMO_FIXTURES.map((fixture) => {
    const moments = DEMO_MOMENTS_BY_FIXTURE[fixture.fixtureId];
    const last = moments.at(-1)!;
    return {
      fixture,
      source: "demo-replay",
      phase: DEMO_DEFAULT_PHASE[fixture.fixtureId],
      minute: last.minute,
      score: last.score ?? [0, 0],
      updatedAt: last.occurredAt,
      momentCount: moments.length,
    };
  });
}

export function getDemoMoments(cursor = DEMO_MOMENTS.length): PulseMoment[] {
  return DEMO_MOMENTS.slice(0, Math.max(1, Math.min(cursor, DEMO_MOMENTS.length)));
}
