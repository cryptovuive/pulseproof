import type { MatchPulse, PulseMoment } from "@/types/pulse";

export interface MatchBrief {
  headline: string;
  lines: string[];
  goals: number;
  cards: number;
  reviews: number;
}

export function isSportingMoment(moment: PulseMoment): boolean {
  return moment.type !== "moment";
}

export function sportingMoments(moments: PulseMoment[]): PulseMoment[] {
  return moments.filter(isSportingMoment);
}

export function momentMinute(moment: PulseMoment): string {
  return `${moment.minuteLabel ?? moment.minute}′`;
}

export function buildMatchBrief(pulse: MatchPulse): MatchBrief {
  const moments = sportingMoments(pulse.moments);
  const goals = moments.filter((moment) => moment.type === "goal");
  const cards = moments.filter((moment) => moment.type === "card");
  const reviews = moments.filter((moment) => moment.type === "var");
  if (!moments.length) {
    return {
      headline: "Waiting for on-pitch action",
      lines: ["TxLINE coverage is connected, but the source has not published a sporting event for this fixture."],
      goals: 0,
      cards: 0,
      reviews: 0,
    };
  }

  const last = moments.at(-1)!;
  const lines: string[] = [];
  const scoreMoment = [...moments].reverse().find((moment) => moment.score);
  if (pulse.phase === "FT" && scoreMoment?.score) {
    lines.push(`Full-time: ${pulse.fixture.homeTeam} ${scoreMoment.score[0]}–${scoreMoment.score[1]} ${pulse.fixture.awayTeam}.`);
  }
  const namedGoals = goals.filter((moment) => moment.participant);
  if (namedGoals.length) {
    lines.push(`Goals: ${namedGoals.map((moment) => `${moment.participant} ${momentMinute(moment)}`).join(" · ")}.`);
  }
  const yellow = cards.filter((moment) => moment.cardColor !== "red").length;
  const red = cards.filter((moment) => moment.cardColor === "red").length;
  if (cards.length || reviews.length) {
    lines.push(`Source log: ${yellow} yellow · ${red} red · ${reviews.length} VAR review${reviews.length === 1 ? "" : "s"}.`);
  }
  if (!lines.length) lines.push(last.description);
  return { headline: last.title, lines: lines.slice(0, 3), goals: goals.length, cards: cards.length, reviews: reviews.length };
}

export function freshnessLabel(pulse: MatchPulse, nowMs = Date.now()): string {
  if (pulse.source === "demo-replay") return "Published report replay · source linked";
  if (!["LIVE", "HT", "ET", "PEN"].includes(pulse.phase)) return "Coverage connected · awaiting match action";
  const updatedAt = Date.parse(pulse.updatedAt);
  if (!Number.isFinite(updatedAt)) return "Update time unavailable";
  const seconds = Math.max(0, Math.floor((nowMs - updatedAt) / 1_000));
  if (seconds < 15) return "Updated just now";
  if (seconds < 120) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `No new source event for ${minutes}m`;
}
