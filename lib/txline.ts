import { createHash } from "node:crypto";
import { assertTxLineDataLicenseActive, txLineDataLicenseState } from "@/lib/hackathon-compliance";
import type { DataSource, Fixture, MatchPulse, MomentAttestation, MomentType, PulseMoment } from "@/types/pulse";

const NETWORKS = {
  mainnet: {
    apiOrigin: "https://txline.txodds.com",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
  },
  devnet: {
    apiOrigin: "https://txline-dev.txodds.com",
    programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
  },
} as const;

type Network = keyof typeof NETWORKS;
type AnyRecord = Record<string, unknown>;

let jwtCache: { value: string; expiresAt: number } | undefined;
let jwtInFlight: Promise<string> | undefined;
const playerDirectories = new Map<number, Map<number, string>>();

export function getTxLineConfig() {
  const network = (process.env.TXLINE_NETWORK ?? "devnet") as Network;
  if (!(network in NETWORKS)) throw new Error("TXLINE_NETWORK must be mainnet or devnet");
  return { network, ...NETWORKS[network], apiToken: process.env.TXLINE_API_TOKEN };
}

export function hasTxLineCredentials(): boolean {
  return Boolean(process.env.TXLINE_API_TOKEN);
}

export function hasActiveTxLineAccess(now = new Date()): boolean {
  return hasTxLineCredentials() && txLineDataLicenseState(now).active;
}

async function requestGuestJwt(): Promise<string> {
  const { apiOrigin } = getTxLineConfig();
  const response = await fetch(`${apiOrigin}/auth/guest/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`TxLINE guest authentication failed (${response.status})`);
  const body = (await response.json()) as { token?: string };
  if (!body.token) throw new Error("TxLINE guest authentication returned no token");
  jwtCache = { value: body.token, expiresAt: Date.now() + 45 * 60_000 };
  return body.token;
}

async function getGuestJwt(forceRefresh = false): Promise<string> {
  if (!forceRefresh && process.env.TXLINE_GUEST_JWT) return process.env.TXLINE_GUEST_JWT;
  if (jwtCache && jwtCache.expiresAt > Date.now()) return jwtCache.value;
  if (!jwtInFlight) jwtInFlight = requestGuestJwt().finally(() => { jwtInFlight = undefined; });
  return jwtInFlight;
}

export async function txLineFetch(path: string, init: RequestInit = {}): Promise<Response> {
  assertTxLineDataLicenseActive();
  const { apiOrigin, apiToken } = getTxLineConfig();
  if (!apiToken) throw new Error("TXLINE_API_TOKEN is not configured");
  if (!path.startsWith("/") || path.includes("://")) throw new Error("Invalid TxLINE API path");

  const execute = async (forceRefresh = false) => {
    const jwt = await getGuestJwt(forceRefresh);
    return fetch(`${apiOrigin}/api${path}`, {
      ...init,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Bearer ${jwt}`,
        "X-Api-Token": apiToken,
        Accept: "application/json",
        ...init.headers,
      },
    });
  };

  let response = await execute();
  if (response.status === 401) {
    jwtCache = undefined;
    response = await execute(true);
  }
  if (!response.ok) {
    throw new Error(`TxLINE ${path} failed (${response.status})`);
  }
  return response;
}

export function openScoresStream(signal: AbortSignal): Promise<Response> {
  return txLineFetch("/scores/stream", {
    headers: { Accept: "text/event-stream", "Cache-Control": "no-cache" },
    signal,
  });
}

function numberValue(record: AnyRecord, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
}

function stringValue(record: AnyRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
}

function nestedRecord(record: AnyRecord, ...keys: string[]): AnyRecord {
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === "object" && !Array.isArray(value)) return value as AnyRecord;
  }
  return {};
}

function recordArray(value: unknown): AnyRecord[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is AnyRecord => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function displayPlayerName(value: string): string {
  const [family, given] = value.split(",").map((part) => part.trim());
  return family && given ? `${given} ${family}` : value;
}

function hydratePlayerDirectory(raw: AnyRecord, fixtureId: number): Map<number, string> {
  const directory = playerDirectories.get(fixtureId) ?? new Map<number, string>();
  for (const team of recordArray(raw.Lineups ?? raw.lineups)) {
    for (const lineup of recordArray(team.lineups ?? team.Lineups)) {
      const player = nestedRecord(lineup, "player", "Player");
      const name = stringValue(player, "preferredName", "PreferredName", "name", "Name");
      if (!name) continue;
      const displayName = displayPlayerName(name);
      const normativeId = numberValue(player, "normativeId", "NormativeId", "id", "Id");
      const fixturePlayerId = numberValue(lineup, "fixturePlayerId", "FixturePlayerId");
      if (normativeId !== undefined) directory.set(normativeId, displayName);
      if (fixturePlayerId !== undefined) directory.set(fixturePlayerId, displayName);
    }
  }
  playerDirectories.set(fixtureId, directory);
  return directory;
}

export function normalizeFixture(raw: AnyRecord): Fixture {
  const participant1 = String(raw.Participant1 ?? raw.participant1 ?? "Team 1");
  const participant2 = String(raw.Participant2 ?? raw.participant2 ?? "Team 2");
  const participant1IsHome = raw.Participant1IsHome ?? raw.participant1IsHome ?? true;
  const competition = stringValue(raw, "CompetitionName", "competitionName");
  return {
    fixtureId: numberValue(raw, "FixtureId", "fixtureId") ?? 0,
    homeTeam: participant1IsHome ? participant1 : participant2,
    awayTeam: participant1IsHome ? participant2 : participant1,
    // The devnet snapshot can intentionally contain only IDs and participants.
    // An empty value is safer than presenting request time as an official kick-off.
    startTime: stringValue(raw, "StartTime", "startTime") ?? "",
    competition: competition ?? "Competition unavailable · TxLINE devnet",
    competitionSource: competition ? "txline" : "unavailable",
    stage: stringValue(raw, "Group", "group", "Stage", "stage") ?? "Stage unavailable",
    gameState: numberValue(raw, "GameState", "gameState") ?? -1,
  };
}

function momentType(action: string): MomentType {
  const value = action.toLowerCase();
  if (value === "game_started" || value === "kickoff") return "kickoff";
  if (value === "goal" || (value.endsWith("_goal") && value !== "goal_kick")) return "goal";
  if (value === "shot" || value.startsWith("shot_")) return "shot";
  if (value === "corner" || value === "corner_kick") return "corner";
  if (["yellow_card", "red_card", "second_yellow_card"].includes(value)) return "card";
  if (value === "var" || value === "var_end") return "var";
  if (value === "substitution" || value === "substitute") return "substitution";
  if (value === "halftime" || value === "halftime_finalised") return "halftime";
  if (value === "game_finalised" || value === "final") return "final";
  return "moment";
}

function momentCopy(type: MomentType, teamName: string) {
  const copy: Record<MomentType, [string, string, number, number]> = {
    kickoff: ["We’re underway", "The live match feed is active.", 5, 0],
    goal: ["Goal changes everything", `${teamName} move the score and the live pulse.`, 12, 2],
    shot: ["Chance created", `${teamName} test the defence.`, 4, 1],
    corner: ["Pressure in the final third", `${teamName} win an attacking corner.`, 4, 1],
    card: ["Discipline shifts the match", `${teamName} receive a card.`, 5, 3],
    var: ["VAR review", "A major moment is being checked.", 8, 5],
    substitution: ["Substitution", `${teamName} make a personnel change.`, 3, 1],
    halftime: ["Half-time pulse", "A natural pause to read how the match has changed.", 8, 4],
    final: ["Full-time memory", "The final TxLINE record seals this match.", 20, 7],
    // Comments and coverage metadata are useful provenance, but are not sporting
    // achievements and must never mint fan points by themselves.
    moment: ["TxLINE coverage update", "A verified feed metadata event arrived.", 0, 0],
  };
  return copy[type];
}

function scoreFrom(raw: AnyRecord): [number, number] | undefined {
  const stats = nestedRecord(raw, "Stats", "stats");
  const score = nestedRecord(raw, "Score", "score");
  const participant1Total = nestedRecord(nestedRecord(score, "Participant1", "participant1"), "Total", "total");
  const participant2Total = nestedRecord(nestedRecord(score, "Participant2", "participant2"), "Total", "total");
  const home = numberValue(raw, "HomeScore", "homeScore", "Participant1Score", "participant1Score")
    ?? numberValue(stats, "1")
    ?? numberValue(participant1Total, "Goals", "goals");
  const away = numberValue(raw, "AwayScore", "awayScore", "Participant2Score", "participant2Score")
    ?? numberValue(stats, "2")
    ?? numberValue(participant2Total, "Goals", "goals");
  return home === undefined || away === undefined ? undefined : [home, away];
}

function shootoutScoreFrom(raw: AnyRecord): [number, number] | undefined {
  const stats = nestedRecord(raw, "Stats", "stats");
  const home = numberValue(stats, "6001");
  const away = numberValue(stats, "6002");
  if (home === undefined || away === undefined || (home === 0 && away === 0)) return undefined;
  return [home, away];
}

function minuteFrom(raw: AnyRecord, data: AnyRecord): { minute: number; minuteLabel?: string } {
  const candidate = raw.Minute ?? raw.minute ?? raw.MatchTime ?? raw.matchTime
    ?? data.Minute ?? data.minute ?? data.MatchTime ?? data.matchTime;
  if (typeof candidate === "number" && Number.isFinite(candidate)) return { minute: candidate };
  if (typeof candidate !== "string") {
    const clock = nestedRecord(raw, "Clock", "clock");
    const dataClock = nestedRecord(data, "Clock", "clock");
    const seconds = numberValue(clock, "Seconds", "seconds") ?? numberValue(dataClock, "Seconds", "seconds");
    if (seconds === undefined) return { minute: 0 };
    const minute = Math.max(0, Math.floor(seconds / 60));
    return minute >= 90 ? { minute, minuteLabel: `90+${minute - 89}` } : { minute };
  }
  const value = candidate.trim().replace(/[’']/g, "");
  const match = /^(\d+)(?:\+(\d+))?$/.exec(value);
  if (!match) return { minute: 0 };
  const base = Number(match[1]);
  const added = Number(match[2] ?? 0);
  return { minute: base + added, minuteLabel: added ? `${base}+${added}` : undefined };
}

export function normalizeScoreRecord(raw: AnyRecord, fixture: Fixture): PulseMoment {
  const data = nestedRecord(raw, "Data", "data");
  const action = stringValue(raw, "Action", "action") ?? "score_update";
  const type = momentType(action);
  const directory = hydratePlayerDirectory(raw, fixture.fixtureId);
  const participantName = stringValue(raw, "Participant", "participant") ?? stringValue(data, "Participant", "participant") ?? "";
  const participantNumber = numberValue(raw, "Participant", "participant") ?? numberValue(data, "Participant", "participant");
  const participant1IsHome = raw.Participant1IsHome ?? raw.participant1IsHome ?? true;
  const team = participantName === fixture.homeTeam
    || (participantNumber === 1 && participant1IsHome !== false)
    || (participantNumber === 2 && participant1IsHome === false)
    ? "home"
    : participantName === fixture.awayTeam
      || (participantNumber === 2 && participant1IsHome !== false)
      || (participantNumber === 1 && participant1IsHome === false)
      ? "away"
      : "neutral";
  const teamName = participantName || (team === "home" ? fixture.homeTeam : team === "away" ? fixture.awayTeam : "The match");
  const [title, description, points, badge] = momentCopy(type, teamName);
  const seq = numberValue(raw, "Seq", "seq") ?? 1;
  const timestamp = numberValue(raw, "Ts", "ts", "Timestamp", "timestamp") ?? Date.now();
  const occurredAt = new Date(timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp).toISOString();
  const matchMinute = minuteFrom(raw, data);
  const actorId = numberValue(data, "PlayerId", "playerId", "PlayerInId", "playerInId", "ScorerId", "scorerId");
  const assistId = numberValue(data, "AssistPlayerId", "assistPlayerId", "AssistantId", "assistantId");
  const actor = stringValue(data, "PlayerName", "playerName", "Player", "player", "Scorer", "scorer")
    ?? (actorId === undefined ? undefined : directory.get(actorId));
  const assist = stringValue(data, "Assist", "assist", "Assistant", "assistant")
    ?? (assistId === undefined ? undefined : directory.get(assistId));
  const lowerAction = action.toLowerCase();
  const cardColor = type === "card"
    ? lowerAction.includes("red") || lowerAction.includes("second_yellow") ? "red" as const : "yellow" as const
    : undefined;
  const varOutcome = type === "var"
    ? stringValue(data, "Outcome", "outcome", "Decision", "decision", "Result", "result")
    : undefined;
  return {
    id: `txline-${fixture.fixtureId}-${seq}`,
    fixtureId: fixture.fixtureId,
    seq,
    minute: matchMinute.minute,
    minuteLabel: matchMinute.minuteLabel,
    type,
    team,
    title,
    description,
    participant: actor,
    assist,
    cardColor,
    varOutcome,
    points,
    badge,
    score: scoreFrom(raw),
    txlineAction: action,
    occurredAt,
    verified: true,
  };
}

export function scoreRecordFixtureId(raw: AnyRecord): number | undefined {
  return numberValue(raw, "FixtureId", "fixtureId")
    ?? numberValue(nestedRecord(raw, "Data", "data"), "FixtureId", "fixtureId");
}

export async function getFixtures(): Promise<Fixture[]> {
  const response = await txLineFetch("/fixtures/snapshot");
  const raw = (await response.json()) as AnyRecord[];
  return raw.map(normalizeFixture).filter((fixture) => fixture.fixtureId > 0);
}

export async function getFixturePulse(fixture: Fixture, historical = false): Promise<MatchPulse> {
  const path = historical ? `/scores/historical/${fixture.fixtureId}` : `/scores/snapshot/${fixture.fixtureId}`;
  const response = await txLineFetch(path);
  const body = await response.text();
  if (!body.trim()) throw new Error(historical
    ? `TxLINE historical replay for fixture ${fixture.fixtureId} is not available yet`
    : `TxLINE score snapshot for fixture ${fixture.fixtureId} is empty`);
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { throw new Error(`TxLINE ${historical ? "historical replay" : "score snapshot"} returned invalid JSON`); }
  if (!Array.isArray(parsed)) throw new Error(`TxLINE ${historical ? "historical replay" : "score snapshot"} returned an invalid record set`);
  const raw = parsed.filter((entry): entry is AnyRecord => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry));
  for (const entry of raw) hydratePlayerDirectory(entry, fixture.fixtureId);
  const moments = raw
    .map((entry) => normalizeScoreRecord(entry, fixture))
    .sort((a, b) => a.seq - b.seq || Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  const last = moments.at(-1);
  const score = [...moments].reverse().find((moment) => moment.score)?.score ?? [0, 0];
  const shootoutScore = [...raw].reverse().map(shootoutScoreFrom).find(Boolean);
  const phase = inferMatchPhase(moments);
  const { network } = getTxLineConfig();
  return {
    fixture,
    source: (historical ? "txline-historical" : "txline-live") as DataSource,
    phase,
    minute: moments.reduce((maximum, moment) => Math.max(maximum, moment.minute), 0),
    score,
    ...(shootoutScore ? { shootoutScore } : {}),
    momentum: calculateMomentum(moments),
    updatedAt: last?.occurredAt ?? fixture.startTime,
    moments,
    provenance: {
      provider: historical ? `TxLINE ${network} historical score log` : `TxLINE ${network} score snapshot`,
      verifiedAt: new Date().toISOString(),
    },
  };
}

export function inferMatchPhase(moments: PulseMoment[]): string {
  if (moments.some((moment) => moment.type === "final")) return "FT";
  if (moments.some((moment) => moment.type === "halftime")) return "HT";
  if (moments.some((moment) => moment.type === "kickoff")) return "LIVE";
  return moments.length ? "COVERED" : "WAITING";
}

function statKeysForMoment(moment: PulseMoment): number[] {
  const side = moment.team === "away" ? 1 : 0;
  if (moment.type === "goal") return [1 + side];
  if (moment.type === "corner") return [7 + side];
  if (moment.type === "card") {
    const red = moment.txlineAction.toLowerCase().includes("red");
    return [red ? 5 + side : 3 + side];
  }
  if (moment.type === "final") return [1, 2];
  return [];
}

export async function getStatValidationEvidence(
  moment: PulseMoment,
): Promise<MomentAttestation["txlineProof"] | undefined> {
  const statKeys = statKeysForMoment(moment);
  if (!statKeys.length) return undefined;
  const endpoint = `/scores/stat-validation?fixtureId=${moment.fixtureId}&seq=${moment.seq}&statKeys=${statKeys.join(",")}`;
  const response = await txLineFetch(endpoint);
  const proofBody = await response.text();
  return {
    endpoint,
    statKeys,
    responseDigest: createHash("sha256").update(proofBody).digest("hex"),
  };
}

export function calculateMomentum(moments: PulseMoment[]): number {
  const weights: Record<MomentType, number> = { kickoff: 0, goal: 4, shot: 2, corner: 1, card: -1, var: 0, substitution: 0, halftime: 0, final: 0, moment: 0 };
  const recent = moments.slice(-8);
  const balance = recent.reduce((sum, moment) => sum + weights[moment.type] * (moment.team === "home" ? 1 : moment.team === "away" ? -1 : 0), 0);
  return Math.max(12, Math.min(88, 50 + balance * 4));
}
