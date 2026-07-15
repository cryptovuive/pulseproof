import type { Fixture, MatchOverview, PulseMoment } from "@/types/pulse";

export const DEMO_FIXTURE: Fixture = {
  fixtureId: 18209181,
  homeTeam: "France",
  awayTeam: "Morocco",
  startTime: "2026-07-09T20:00:00.000Z",
  competition: "FIFA World Cup 2026",
  competitionSource: "published-report",
  competitionSourceUrl: "https://www.skysports.com/football/france-vs-morocco/report/549862",
  stage: "Quarter-final · Match 97 · Boston Stadium",
  gameState: 1,
};

export const BRAZIL_NORWAY_FIXTURE: Fixture = {
  fixtureId: 18187298,
  homeTeam: "Brazil",
  awayTeam: "Norway",
  startTime: "2026-07-05T20:00:00.000Z",
  competition: "FIFA World Cup 2026",
  competitionSource: "published-report",
  competitionSourceUrl: "https://fdp.fifa.org/assetspublic/ce281/r12541/pdf/FullTimeMatchReport-English.pdf",
  stage: "Round of 16 · Match 91 · New York/New Jersey Stadium",
  gameState: 1,
};

export const PORTUGAL_SPAIN_FIXTURE: Fixture = {
  fixtureId: 18198205,
  homeTeam: "Portugal",
  awayTeam: "Spain",
  startTime: "2026-07-06T19:00:00.000Z",
  competition: "FIFA World Cup 2026",
  competitionSource: "published-report",
  competitionSourceUrl: "https://fdp.fifa.org/assetspublic/ce281/r12538/pdf/FullTimeMatchReport-English.pdf",
  stage: "Round of 16 · Match 93 · Dallas Stadium",
  gameState: 1,
};

export const FRANCE_SPAIN_FIXTURE: Fixture = {
  fixtureId: 101,
  homeTeam: "France",
  awayTeam: "Spain",
  startTime: "2026-07-14T19:00:00.000Z",
  competition: "FIFA World Cup 2026",
  competitionSource: "published-report",
  competitionSourceUrl: "https://www.skysports.com/football/france-vs-spain/549866",
  stage: "Semi-final · Match 101 · Dallas Stadium",
  gameState: 1,
};

export const DEMO_DATA_SOURCES: Record<number, { provider: string; url: string; checkedAt: string }> = {
  [FRANCE_SPAIN_FIXTURE.fixtureId]: {
    provider: "RFEF result + Sky Sports event report",
    url: "https://www.skysports.com/football/france-vs-spain/549866",
    checkedAt: "2026-07-15T05:00:00.000Z",
  },
  [BRAZIL_NORWAY_FIXTURE.fixtureId]: {
    provider: "FIFA full-time match report",
    url: "https://fdp.fifa.org/assetspublic/ce281/r12541/pdf/FullTimeMatchReport-English.pdf",
    checkedAt: "2026-07-13T10:30:00.000Z",
  },
  [PORTUGAL_SPAIN_FIXTURE.fixtureId]: {
    provider: "FIFA full-time report",
    url: "https://fdp.fifa.org/assetspublic/ce281/r12538/pdf/FullTimeMatchReport-English.pdf",
    checkedAt: "2026-07-13T10:30:00.000Z",
  },
  [DEMO_FIXTURE.fixtureId]: {
    provider: "FIFA result + Sky Sports match report",
    url: "https://www.skysports.com/football/france-vs-morocco/report/549862",
    checkedAt: "2026-07-13T10:30:00.000Z",
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
  { id: "fra-mar-penalty-save-28", seq: 96, minute: 28, type: "shot", team: "home", title: "Bounou saves Mbappé penalty", description: "Morocco goalkeeper Yassine Bounou keeps the match scoreless from the spot.", participant: "Kylian Mbappé", points: 6, badge: 1, score: [0, 0], txlineAction: "penalty_saved" },
  { id: "fra-mar-halftime", seq: 154, minute: 45, type: "halftime", team: "neutral", title: "Scoreless at half-time", description: "Morocco hold France to 0–0 through the opening half.", points: 8, badge: 4, score: [0, 0], txlineAction: "halftime_finalised" },
  { id: "fra-mar-goal-60", seq: 216, minute: 60, type: "goal", team: "home", title: "Mbappé breaks the deadlock", description: "Kylian Mbappé finds the far corner to put France ahead.", participant: "Kylian Mbappé", points: 12, badge: 2, score: [1, 0], txlineAction: "goal" },
  { id: "fra-mar-goal-66", seq: 238, minute: 66, type: "goal", team: "home", title: "Dembélé doubles the lead", description: "Ousmane Dembélé scores France's second from Kylian Mbappé's assist.", participant: "Ousmane Dembélé", assist: "Kylian Mbappé", points: 12, badge: 2, score: [2, 0], txlineAction: "goal" },
  { id: "fra-mar-final", seq: 341, minute: 90, type: "final", team: "neutral", title: "France advance 2–0", description: "Full-time confirms France's place in the semi-finals and Morocco's elimination.", points: 20, badge: 7, score: [2, 0], txlineAction: "game_finalised" },
]);

export const BRAZIL_NORWAY_MOMENTS = createMoments(BRAZIL_NORWAY_FIXTURE, [
  { id: "bra-nor-kickoff", seq: 1, minute: 0, type: "kickoff", team: "neutral", title: "Round-of-16 begins", description: "Brazil face Norway for a place in the quarter-finals.", points: 5, badge: 0, score: [0, 0], txlineAction: "game_started" },
  { id: "bra-nor-penalty-save-14", seq: 52, minute: 14, type: "shot", team: "home", title: "Nyland saves Brazil penalty", description: "Bruno Guimarães is denied from the penalty spot by Ørjan Nyland.", participant: "Bruno Guimarães", points: 6, badge: 1, score: [0, 0], txlineAction: "penalty_saved" },
  { id: "bra-nor-halftime", seq: 154, minute: 45, type: "halftime", team: "neutral", title: "Goalless at the break", description: "The last-16 tie remains 0–0 after 45 minutes.", points: 8, badge: 4, score: [0, 0], txlineAction: "halftime_finalised" },
  { id: "bra-nor-sub-67", seq: 247, minute: 67, type: "moment", team: "home", title: "Neymar enters", description: "Neymar Jr replaces Gabriel Martinelli in Brazil's double substitution.", participant: "Neymar Jr", points: 3, badge: 1, score: [0, 0], txlineAction: "substitution" },
  { id: "bra-nor-goal-79", seq: 286, minute: 79, type: "goal", team: "away", title: "Haaland heads Norway ahead", description: "Erling Haaland scores from Andreas Schjelderup's cross in the 79th minute.", participant: "Erling Haaland", assist: "Andreas Schjelderup", points: 12, badge: 2, score: [0, 1], txlineAction: "goal" },
  { id: "bra-nor-goal-90", seq: 326, minute: 90, type: "goal", team: "away", title: "Haaland makes it two", description: "Haaland drives in his second goal; FIFA records Schjelderup's second assist.", participant: "Erling Haaland", assist: "Andreas Schjelderup", points: 15, badge: 6, score: [0, 2], txlineAction: "goal" },
  { id: "bra-nor-yellow-96", seq: 334, minute: 96, minuteLabel: "90+6", type: "card", team: "home", title: "Neymar is booked", description: "Neymar Jr receives Brazil's only yellow card of the match.", participant: "Neymar Jr", cardColor: "yellow", points: 5, badge: 3, score: [0, 2], txlineAction: "yellow_card" },
  { id: "bra-nor-goal-100", seq: 338, minute: 100, minuteLabel: "90+10", type: "goal", team: "home", title: "Neymar converts late penalty", description: "Neymar scores from the spot at 90+10, but it is only a consolation for Brazil.", participant: "Neymar Jr", points: 12, badge: 2, score: [1, 2], txlineAction: "penalty_goal" },
  { id: "bra-nor-final", seq: 341, minute: 101, minuteLabel: "90+11", type: "final", team: "neutral", title: "Norway eliminate Brazil", description: "Full-time: Brazil 1–2 Norway. Norway advance and Brazil leave the tournament.", points: 20, badge: 7, score: [1, 2], txlineAction: "game_finalised" },
]);

export const PORTUGAL_SPAIN_MOMENTS = createMoments(PORTUGAL_SPAIN_FIXTURE, [
  { id: "por-esp-kickoff", seq: 1, minute: 0, type: "kickoff", team: "neutral", title: "Iberian tie underway", description: "Portugal and Spain begin their round-of-16 match in Dallas.", points: 5, badge: 0, score: [0, 0], txlineAction: "game_started" },
  { id: "por-esp-halftime", seq: 157, minute: 45, type: "halftime", team: "neutral", title: "Scoreless at half-time", description: "Neither side finds a first-half breakthrough.", points: 8, badge: 4, score: [0, 0], txlineAction: "halftime_finalised" },
  { id: "por-esp-yellow-89", seq: 320, minute: 89, type: "card", team: "home", title: "Bernardo Silva is booked", description: "Portugal substitute Bernardo Silva receives a yellow card.", participant: "Bernardo Silva", cardColor: "yellow", points: 5, badge: 3, score: [0, 0], txlineAction: "yellow_card" },
  { id: "por-esp-goal-91", seq: 329, minute: 91, minuteLabel: "90+1", type: "goal", team: "away", title: "Merino wins it in added time", description: "Substitute Mikel Merino scores from Ferran Torres' assist.", participant: "Mikel Merino", assist: "Ferran Torres", points: 15, badge: 6, score: [0, 1], txlineAction: "goal" },
  { id: "por-esp-yellow-93", seq: 333, minute: 93, minuteLabel: "90+3", type: "card", team: "home", title: "Renato Veiga is booked", description: "Renato Veiga receives Portugal's second yellow card.", participant: "Renato Veiga", cardColor: "yellow", points: 5, badge: 3, score: [0, 1], txlineAction: "yellow_card" },
  { id: "por-esp-yellow-98", seq: 337, minute: 98, minuteLabel: "90+8", type: "card", team: "away", title: "Ferran Torres is booked", description: "Ferran Torres receives Spain's only yellow card after assisting the winner.", participant: "Ferran Torres", cardColor: "yellow", points: 5, badge: 3, score: [0, 1], txlineAction: "yellow_card" },
  { id: "por-esp-final", seq: 338, minute: 98, minuteLabel: "90+8", type: "final", team: "neutral", title: "Spain advance 1–0", description: "Full-time confirms Portugal's elimination and Spain's quarter-final place.", points: 20, badge: 7, score: [0, 1], txlineAction: "game_finalised" },
]);

export const FRANCE_SPAIN_MOMENTS = createMoments(FRANCE_SPAIN_FIXTURE, [
  { id: "fra-esp-kickoff", seq: 1, minute: 0, type: "kickoff", team: "neutral", title: "Semi-final underway", description: "France and Spain begin the first World Cup semi-final in Dallas.", points: 5, badge: 0, score: [0, 0], txlineAction: "game_started" },
  { id: "fra-esp-rabiot-yellow-9", seq: 34, minute: 9, type: "card", team: "home", title: "Rabiot is booked", description: "Adrien Rabiot receives the opening yellow card of the semi-final.", participant: "Adrien Rabiot", cardColor: "yellow", points: 5, badge: 3, score: [0, 0], txlineAction: "yellow_card" },
  { id: "fra-esp-oyarzabal-penalty-22", seq: 78, minute: 22, type: "goal", team: "away", title: "Oyarzabal converts the penalty", description: "Mikel Oyarzabal scores from the spot after Lucas Digne fouls Lamine Yamal.", participant: "Mikel Oyarzabal", points: 12, badge: 2, score: [0, 1], txlineAction: "penalty_goal" },
  { id: "fra-esp-saliba-sub-30", seq: 107, minute: 30, type: "substitution", team: "home", title: "France make an injury change", description: "Maxence Lacroix replaces the injured William Saliba.", participant: "Maxence Lacroix", points: 3, badge: 1, score: [0, 1], txlineAction: "substitution" },
  { id: "fra-esp-cucurella-yellow-31", seq: 111, minute: 31, type: "card", team: "away", title: "Cucurella is booked", description: "Marc Cucurella receives Spain's first yellow card.", participant: "Marc Cucurella", cardColor: "yellow", points: 5, badge: 3, score: [0, 1], txlineAction: "yellow_card" },
  { id: "fra-esp-halftime", seq: 160, minute: 45, type: "halftime", team: "neutral", title: "Spain lead at half-time", description: "Oyarzabal's penalty separates the teams at the interval.", points: 8, badge: 4, score: [0, 1], txlineAction: "halftime_finalised" },
  { id: "fra-esp-porro-goal-58", seq: 208, minute: 58, type: "goal", team: "away", title: "Porro doubles Spain's lead", description: "Pedro Porro exchanges passes with Dani Olmo and finishes Spain's second goal.", participant: "Pedro Porro", assist: "Dani Olmo", points: 12, badge: 2, score: [0, 2], txlineAction: "goal" },
  { id: "fra-esp-yamal-offside-61", seq: 219, minute: 61, type: "var", team: "away", title: "Yamal goal ruled out", description: "Lamine Yamal finds the net, but the goal is disallowed for a narrow offside.", participant: "Lamine Yamal", varOutcome: "Goal disallowed — offside", points: 6, badge: 1, score: [0, 2], txlineAction: "var_goal_disallowed" },
  { id: "fra-esp-france-double-sub-72", seq: 260, minute: 72, type: "substitution", team: "home", title: "France change both flanks", description: "Rayan Cherki and Theo Hernandez replace Michael Olise and Lucas Digne.", participant: "Rayan Cherki · Theo Hernandez", points: 3, badge: 1, score: [0, 2], txlineAction: "substitution" },
  { id: "fra-esp-oyarzabal-sub-74", seq: 269, minute: 74, type: "substitution", team: "away", title: "Spain replace their opening scorer", description: "Ferran Torres comes on for Mikel Oyarzabal.", participant: "Ferran Torres", points: 3, badge: 1, score: [0, 2], txlineAction: "substitution" },
  { id: "fra-esp-mbappe-yellow-86", seq: 312, minute: 86, type: "card", team: "home", title: "Mbappé is booked", description: "Kylian Mbappé receives a late yellow card.", participant: "Kylian Mbappé", cardColor: "yellow", points: 5, badge: 3, score: [0, 2], txlineAction: "yellow_card" },
  { id: "fra-esp-final", seq: 341, minute: 90, type: "final", team: "neutral", title: "Spain reach the World Cup final", description: "Full-time: France 0–2 Spain. Spain advance to face the winner of England against Argentina.", points: 20, badge: 7, score: [0, 2], txlineAction: "game_finalised" },
]);

export const DEMO_FIXTURES = [FRANCE_SPAIN_FIXTURE, DEMO_FIXTURE, PORTUGAL_SPAIN_FIXTURE, BRAZIL_NORWAY_FIXTURE];

export const DEMO_MOMENTS_BY_FIXTURE: Record<number, PulseMoment[]> = {
  [FRANCE_SPAIN_FIXTURE.fixtureId]: FRANCE_SPAIN_MOMENTS,
  [DEMO_FIXTURE.fixtureId]: DEMO_MOMENTS,
  [BRAZIL_NORWAY_FIXTURE.fixtureId]: BRAZIL_NORWAY_MOMENTS,
  [PORTUGAL_SPAIN_FIXTURE.fixtureId]: PORTUGAL_SPAIN_MOMENTS,
};

export const DEMO_DEFAULT_PHASE: Record<number, string> = {
  [FRANCE_SPAIN_FIXTURE.fixtureId]: "FT",
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
      scoreKnown: true,
      updatedAt: last.occurredAt,
      momentCount: moments.length,
    };
  });
}

export function getDemoMoments(cursor = DEMO_MOMENTS.length): PulseMoment[] {
  return DEMO_MOMENTS.slice(0, Math.max(1, Math.min(cursor, DEMO_MOMENTS.length)));
}
