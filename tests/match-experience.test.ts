import { describe, expect, it } from "vitest";
import { buildDemoPulse } from "@/lib/pulse-service";
import { buildMatchBrief, freshnessLabel, sportingMoments } from "@/lib/match-experience";

describe("consumer match experience", () => {
  it("builds a deterministic finished brief from published events", () => {
    const brief = buildMatchBrief(buildDemoPulse(18198205));
    expect(brief).toMatchObject({ headline: "Spain advance 1–0", goals: 1, cards: 3, reviews: 0 });
    expect(brief.lines).toContain("Full-time: Portugal 0–1 Spain.");
    expect(brief.lines.some((line) => line.includes("Mikel Merino 90+1′"))).toBe(true);
    expect(brief.lines).toContain("Source log: 3 yellow · 0 red · 0 VAR reviews.");
  });

  it("hides technical coverage records from the sporting timeline", () => {
    const pulse = buildDemoPulse(18209181);
    const metadata = { ...pulse.moments[0], id: "metadata", type: "moment" as const, title: "Coverage update" };
    expect(sportingMoments([metadata, ...pulse.moments])).toEqual(pulse.moments);
  });

  it("uses an honest waiting state when only metadata exists", () => {
    const pulse = buildDemoPulse(18209181);
    const metadataOnly = {
      ...pulse,
      source: "txline-live" as const,
      phase: "COVERED",
      moments: [{ ...pulse.moments[0], type: "moment" as const, title: "Coverage update", score: undefined }],
    };
    expect(buildMatchBrief(metadataOnly)).toMatchObject({ headline: "Waiting for on-pitch action", goals: 0, cards: 0, reviews: 0 });
    expect(freshnessLabel(metadataOnly, Date.parse("2026-07-13T00:00:00Z"))).toBe("Coverage connected · awaiting match action");
  });

  it("reports live freshness without pretending a quiet feed is current", () => {
    const pulse = { ...buildDemoPulse(18209181), source: "txline-live" as const, phase: "LIVE", updatedAt: "2026-07-13T00:00:00.000Z" };
    expect(freshnessLabel(pulse, Date.parse("2026-07-13T00:00:10.000Z"))).toBe("Updated just now");
    expect(freshnessLabel(pulse, Date.parse("2026-07-13T00:03:10.000Z"))).toBe("No new source event for 3m");
  });
});
