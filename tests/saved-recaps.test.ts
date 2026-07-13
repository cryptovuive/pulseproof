import { describe, expect, it } from "vitest";
import { PORTUGAL_SPAIN_FIXTURE, PORTUGAL_SPAIN_MOMENTS } from "@/lib/demo-data";
import {
  buildSavedRecapPack,
  MAX_SAVED_RECAPS,
  normalizeSavedRecaps,
  savedRecapOverview,
  upsertSavedRecap,
} from "@/lib/saved-recaps";
import type { MatchPulse } from "@/types/pulse";

const pulse: MatchPulse = {
  fixture: PORTUGAL_SPAIN_FIXTURE,
  source: "demo-replay",
  phase: "FT",
  minute: 98,
  score: [0, 1],
  momentum: 30,
  updatedAt: "2026-07-06T21:01:00.000Z",
  moments: PORTUGAL_SPAIN_MOMENTS,
  provenance: { provider: "FIFA full-time report", sourceUrl: PORTUGAL_SPAIN_FIXTURE.competitionSourceUrl, verifiedAt: "2026-07-13T02:45:00.000Z" },
};

describe("offline recap packs", () => {
  it("stores only consumer on-pitch moments", () => {
    const metadata = { ...pulse.moments[0], id: "metadata", type: "moment" as const, title: "Coverage update" };
    const pack = buildSavedRecapPack({ ...pulse, moments: [metadata, ...pulse.moments] });
    expect(pack.pulse.moments).toHaveLength(pulse.moments.length);
    expect(pack.pulse.moments.every((moment) => moment.type !== "moment")).toBe(true);
    expect(pack.pulse.moments.every((moment) => moment.txlineAction === "saved-consumer-recap")).toBe(true);
    expect(pack.pulse.moments.every((moment) => moment.points === 0 && moment.badge === 0)).toBe(true);
  });

  it("rejects unfinished or empty matches", () => {
    expect(() => buildSavedRecapPack({ ...pulse, phase: "LIVE" })).toThrow("Only finished matches");
    expect(() => buildSavedRecapPack({ ...pulse, moments: [] })).toThrow("no on-pitch recap moments");
  });

  it("deduplicates a fixture and keeps the newest saved pack", () => {
    const oldPack = buildSavedRecapPack(pulse, "2026-07-13T01:00:00.000Z");
    const newPack = buildSavedRecapPack(pulse, "2026-07-13T02:00:00.000Z");
    expect(upsertSavedRecap([oldPack], newPack)).toEqual([newPack]);
  });

  it("caps the local library without fabricating missing packs", () => {
    const packs = Array.from({ length: MAX_SAVED_RECAPS + 3 }, (_, index) => {
      const fixtureId = 1_000 + index;
      return buildSavedRecapPack({
        ...pulse,
        fixture: { ...pulse.fixture, fixtureId },
        moments: pulse.moments.map((moment) => ({ ...moment, fixtureId, id: `${fixtureId}-${moment.seq}` })),
      }, new Date(Date.UTC(2026, 6, 13, 0, index)).toISOString());
    });
    expect(normalizeSavedRecaps(packs)).toHaveLength(MAX_SAVED_RECAPS);
  });

  it("drops malformed persisted records", () => {
    const valid = buildSavedRecapPack(pulse);
    const invalidMoment = { ...valid, pulse: { ...valid.pulse, moments: [{ ...valid.pulse.moments[0], verified: "yes" }] } };
    expect(normalizeSavedRecaps([valid, invalidMoment, { version: 1 }, null])).toEqual([valid]);
  });

  it("re-sanitizes persisted action and reward fields before restoring them", () => {
    const valid = buildSavedRecapPack(pulse);
    const tampered = {
      ...valid,
      pulse: {
        ...valid.pulse,
        moments: valid.pulse.moments.map((moment) => ({ ...moment, txlineAction: "raw-goal", points: 99, badge: 7 })),
      },
    };
    const [restored] = normalizeSavedRecaps([tampered]);
    expect(restored.pulse.moments.every((moment) => moment.txlineAction === "saved-consumer-recap")).toBe(true);
    expect(restored.pulse.moments.every((moment) => moment.points === 0 && moment.badge === 0)).toBe(true);
  });

  it("restores an accurate match overview for offline selection", () => {
    expect(savedRecapOverview(buildSavedRecapPack(pulse))).toMatchObject({
      fixture: { fixtureId: 18198205 },
      phase: "FT",
      score: [0, 1],
      scoreKnown: true,
      momentCount: PORTUGAL_SPAIN_MOMENTS.length,
    });
  });
});
