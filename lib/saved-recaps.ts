import { sportingMoments } from "@/lib/match-experience";
import type { MatchOverview, MatchPulse, PulseMoment } from "@/types/pulse";

export const MAX_SAVED_RECAPS = 8;

export interface SavedRecapPack {
  version: 1;
  savedAt: string;
  pulse: MatchPulse;
}

function consumerSafeMoment(moment: PulseMoment): PulseMoment {
  return {
    ...moment,
    txlineAction: "saved-consumer-recap",
    points: 0,
    badge: 0,
  };
}

export function buildSavedRecapPack(pulse: MatchPulse, savedAt = new Date().toISOString()): SavedRecapPack {
  const moments = sportingMoments(pulse.moments).map(consumerSafeMoment);
  if (pulse.phase !== "FT") throw new Error("Only finished matches can be saved for offline recap");
  if (!moments.length) throw new Error("This match has no on-pitch recap moments to save");
  return {
    version: 1,
    savedAt,
    pulse: { ...pulse, moments, replayCursor: moments.length },
  };
}

function isPulseMoment(value: unknown): value is PulseMoment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const moment = value as Partial<PulseMoment>;
  return typeof moment.id === "string"
    && Number.isSafeInteger(moment.fixtureId)
    && Number.isSafeInteger(moment.seq)
    && Number.isSafeInteger(moment.minute)
    && ["kickoff", "goal", "shot", "corner", "card", "var", "halftime", "final"].includes(moment.type ?? "")
    && ["home", "away", "neutral"].includes(moment.team ?? "")
    && typeof moment.title === "string"
    && typeof moment.description === "string"
    && typeof moment.occurredAt === "string"
    && Number.isFinite(Date.parse(moment.occurredAt))
    && Number.isSafeInteger(moment.points)
    && Number.isSafeInteger(moment.badge)
    && typeof moment.txlineAction === "string"
    && typeof moment.verified === "boolean"
    && (moment.score === undefined || (Array.isArray(moment.score) && moment.score.length === 2 && moment.score.every(Number.isSafeInteger)));
}

function isSavedRecapPack(value: unknown): value is SavedRecapPack {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const pack = value as Partial<SavedRecapPack>;
  const pulse = pack.pulse as Partial<MatchPulse> | undefined;
  return pack.version === 1
    && typeof pack.savedAt === "string"
    && Number.isFinite(Date.parse(pack.savedAt))
    && Boolean(pulse?.fixture)
    && Number.isSafeInteger(pulse?.fixture?.fixtureId)
    && pulse?.phase === "FT"
    && Array.isArray(pulse?.score)
    && pulse.score.length === 2
    && pulse.score.every(Number.isSafeInteger)
    && Array.isArray(pulse?.moments)
    && pulse.moments.length > 0
    && pulse.moments.every((moment) => isPulseMoment(moment) && moment.fixtureId === pulse.fixture?.fixtureId);
}

export function normalizeSavedRecaps(value: unknown): SavedRecapPack[] {
  if (!Array.isArray(value)) return [];
  const byFixture = new Map<number, SavedRecapPack>();
  for (const item of value) {
    if (!isSavedRecapPack(item)) continue;
    const safeItem: SavedRecapPack = {
      ...item,
      pulse: {
        ...item.pulse,
        moments: item.pulse.moments.map(consumerSafeMoment),
        replayCursor: item.pulse.moments.length,
      },
    };
    const fixtureId = safeItem.pulse.fixture.fixtureId;
    const existing = byFixture.get(fixtureId);
    if (!existing || Date.parse(safeItem.savedAt) > Date.parse(existing.savedAt)) byFixture.set(fixtureId, safeItem);
  }
  return [...byFixture.values()]
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
    .slice(0, MAX_SAVED_RECAPS);
}

export function upsertSavedRecap(current: SavedRecapPack[], pack: SavedRecapPack): SavedRecapPack[] {
  return normalizeSavedRecaps([pack, ...current.filter((item) => item.pulse.fixture.fixtureId !== pack.pulse.fixture.fixtureId)]);
}

export function savedRecapOverview(pack: SavedRecapPack): MatchOverview {
  const pulse = pack.pulse;
  return {
    fixture: pulse.fixture,
    source: pulse.source,
    phase: pulse.phase,
    minute: pulse.minute,
    score: pulse.score,
    scoreKnown: pulse.moments.some((moment) => Boolean(moment.score)),
    updatedAt: pulse.updatedAt,
    momentCount: pulse.moments.length,
  };
}
