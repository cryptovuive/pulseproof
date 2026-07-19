import type { MatchPulse, PulseMoment } from "@/types/pulse";

export interface CatchUpSummary {
  goals: number;
  cards: number;
  reviews: number;
  swings: PulseMoment[];
}

function hasReplayableMoments(pulse: MatchPulse | null | undefined): pulse is MatchPulse {
  return Boolean(pulse?.moments.some((moment) => moment.type !== "moment"));
}

/**
 * Prefer the dedicated historical log when TxLINE exposes it, but keep a
 * finished match replayable from the final verified snapshot already loaded
 * by the live view. The fixture guard prevents a response for another match
 * from ever being substituted into the current replay.
 */
export function selectCatchUpSource(current: MatchPulse, historical?: MatchPulse | null): MatchPulse {
  if (historical && historical.fixture.fixtureId !== current.fixture.fixtureId) {
    throw new Error("The historical replay does not belong to this fixture");
  }
  if (hasReplayableMoments(historical)) return historical;
  if (hasReplayableMoments(current)) return current;
  throw new Error("No on-pitch moments are available for catch-up yet");
}

export function pulseAtMoment(base: MatchPulse, momentCount: number, phase = "CATCH-UP"): MatchPulse {
  const count = Math.max(1, Math.min(Math.trunc(momentCount), base.moments.length));
  const moments = base.moments.slice(0, count);
  const last = moments.at(-1)!;
  const score = [...moments].reverse().find((moment) => moment.score)?.score ?? [0, 0];
  const weights: Record<PulseMoment["type"], number> = {
    kickoff: 0,
    goal: 4,
    shot: 2,
    corner: 1,
    card: -1,
    var: 0,
    substitution: 0,
    halftime: 0,
    final: 0,
    moment: 0,
  };
  const balance = moments.slice(-8).reduce(
    (sum, moment) => sum + weights[moment.type] * (moment.team === "home" ? 1 : moment.team === "away" ? -1 : 0),
    0,
  );
  return {
    ...base,
    phase: last.type === "final" ? "FT" : last.type === "halftime" ? "HT" : phase,
    minute: last.minute,
    score,
    momentum: Math.max(12, Math.min(88, 50 + balance * 4)),
    updatedAt: last.occurredAt,
    moments,
    replayCursor: count,
  };
}

export function summarizeCatchUp(moments: PulseMoment[]): CatchUpSummary {
  const important = moments.filter((moment) => ["goal", "var", "card", "halftime", "final"].includes(moment.type));
  return {
    goals: moments.filter((moment) => moment.type === "goal").length,
    cards: moments.filter((moment) => moment.type === "card").length,
    reviews: moments.filter((moment) => moment.type === "var").length,
    swings: important.slice(-3),
  };
}
