import { describe, expect, it } from "vitest";
import { DEMO_FIXTURES, DEMO_MOMENTS_BY_FIXTURE, FRANCE_SPAIN_MOMENTS, getDemoOverviews } from "@/lib/demo-data";
import { buildDemoPulse } from "@/lib/pulse-service";
import { pulseAtMoment, summarizeCatchUp } from "@/lib/pulse-replay";

describe("multi-match demo and catch-up", () => {
  it("provides a distinct replay timeline for every listed fixture", () => {
    expect(DEMO_FIXTURES).toHaveLength(4);
    for (const fixture of DEMO_FIXTURES) {
      expect(fixture.competition).toBe("FIFA World Cup 2026");
      const pulse = buildDemoPulse(fixture.fixtureId);
      expect(pulse.fixture).toEqual(fixture);
      expect(pulse.moments.length).toBeGreaterThan(3);
      expect(pulse.moments.every((moment) => moment.fixtureId === fixture.fixtureId)).toBe(true);
    }
  });

  it("keeps overview scores aligned with each timeline's latest score", () => {
    for (const overview of getDemoOverviews()) {
      const last = DEMO_MOMENTS_BY_FIXTURE[overview.fixture.fixtureId].at(-1);
      expect(overview.score).toEqual(last?.score);
      expect(overview.minute).toBe(last?.minute);
    }
    expect(Object.fromEntries(getDemoOverviews().map((overview) => [overview.fixture.fixtureId, overview.score]))).toEqual({
      101: [0, 2],
      18187298: [1, 2],
      18198205: [0, 1],
      18209181: [2, 0],
    });
  });

  it("replays France–Spain progressively through the same match-state model", () => {
    const full = buildDemoPulse(101);
    expect(full).toMatchObject({ phase: "FT", score: [0, 2] });
    expect(full.moments).toEqual(FRANCE_SPAIN_MOMENTS);

    const afterPenalty = pulseAtMoment(full, 3);
    expect(afterPenalty).toMatchObject({ phase: "CATCH-UP", minute: 22, score: [0, 1], replayCursor: 3 });
    const afterSecondGoal = pulseAtMoment(full, 7);
    expect(afterSecondGoal).toMatchObject({ phase: "CATCH-UP", minute: 58, score: [0, 2], replayCursor: 7 });
    const afterVar = pulseAtMoment(full, 8);
    expect(afterVar).toMatchObject({ phase: "CATCH-UP", minute: 61, score: [0, 2], replayCursor: 8 });
    expect(afterVar.moments.at(-1)).toMatchObject({ type: "var", participant: "Lamine Yamal", varOutcome: "Goal disallowed — offside" });
    expect(pulseAtMoment(full, full.moments.length)).toMatchObject({ phase: "FT", score: [0, 2] });
  });

  it("keeps sourced scorers, cards and substitutions in the France–Spain replay", () => {
    const full = buildDemoPulse(101);
    expect(full.moments.filter((moment) => moment.type === "goal").map((moment) => [moment.minute, moment.participant])).toEqual([
      [22, "Mikel Oyarzabal"],
      [58, "Pedro Porro"],
    ]);
    expect(full.moments.filter((moment) => moment.type === "card")).toHaveLength(3);
    expect(full.moments.filter((moment) => moment.type === "substitution")).toHaveLength(3);
    expect(summarizeCatchUp(full.moments)).toMatchObject({ goals: 2, cards: 3, reviews: 1 });
  });

  it("reconstructs score, minute and momentum at an exact catch-up position", () => {
    const full = buildDemoPulse(18209181);
    const atOpeningGoal = pulseAtMoment(full, 4);
    expect(atOpeningGoal).toMatchObject({ minute: 60, score: [1, 0], phase: "CATCH-UP", replayCursor: 4 });
    expect(atOpeningGoal.moments).toHaveLength(4);
    expect(atOpeningGoal.momentum).toBeGreaterThanOrEqual(12);
    expect(atOpeningGoal.momentum).toBeLessThanOrEqual(88);
  });

  it("summarises only the high-signal events needed for quick catch-up", () => {
    const full = buildDemoPulse(18209181);
    const summary = summarizeCatchUp(full.moments);
    expect(summary).toMatchObject({ goals: 2, cards: 0, reviews: 0 });
    expect(summary.swings).toHaveLength(3);
    expect(summary.swings.at(-1)?.type).toBe("final");
  });

  it("keeps official scorer, assist, card and stoppage-time details", () => {
    const portugalSpain = buildDemoPulse(18198205);
    const winner = portugalSpain.moments.find((moment) => moment.id === "por-esp-goal-91");
    expect(winner).toMatchObject({ minuteLabel: "90+1", participant: "Mikel Merino", assist: "Ferran Torres" });
    expect(portugalSpain.moments.filter((moment) => moment.cardColor === "yellow")).toHaveLength(3);
    expect(summarizeCatchUp(portugalSpain.moments)).toMatchObject({ goals: 1, cards: 3, reviews: 0 });

    const brazilNorway = buildDemoPulse(18187298);
    expect(brazilNorway.moments.find((moment) => moment.id === "bra-nor-goal-100"))
      .toMatchObject({ minuteLabel: "90+10", participant: "Neymar Jr", score: [1, 2] });
  });

  it("keeps catch-up statistics progressive so spoiler mode does not reveal the ending", () => {
    const full = buildDemoPulse(18198205);
    const atKickoff = pulseAtMoment(full, 1);
    expect(summarizeCatchUp(atKickoff.moments)).toMatchObject({ goals: 0, cards: 0, reviews: 0 });
    const afterWinner = pulseAtMoment(full, 4);
    expect(summarizeCatchUp(afterWinner.moments)).toMatchObject({ goals: 1, cards: 1, reviews: 0 });
  });
});
