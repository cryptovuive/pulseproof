import { describe, expect, it } from "vitest";
import { hashMoment } from "@/lib/attestation";
import { DEMO_MOMENTS } from "@/lib/demo-data";

class FanPassModel {
  points = 0;
  badges = 0n;
  receipts = new Set<string>();

  claim(momentIndex: number) {
    const moment = DEMO_MOMENTS[momentIndex];
    const hash = hashMoment(moment);
    if (this.receipts.has(hash)) throw new Error("receipt already exists");
    if (moment.badge >= 64) throw new Error("invalid badge");
    this.receipts.add(hash);
    this.points += moment.points;
    this.badges |= 1n << BigInt(moment.badge);
  }
}

describe("PulseProof contract state model", () => {
  it("accumulates fan points and badge bits", () => {
    const pass = new FanPassModel();
    const goalIndex = DEMO_MOMENTS.findIndex((moment) => moment.type === "goal");
    expect(goalIndex).toBeGreaterThanOrEqual(0);
    pass.claim(0);
    pass.claim(goalIndex);
    expect(pass.points).toBe(DEMO_MOMENTS[0].points + DEMO_MOMENTS[goalIndex].points);
    expect(pass.badges & 1n).toBe(1n);
    expect(pass.badges & (1n << BigInt(DEMO_MOMENTS[goalIndex].badge))).toBe(1n << BigInt(DEMO_MOMENTS[goalIndex].badge));
  });

  it("rejects replay of the same signed moment", () => {
    const pass = new FanPassModel();
    pass.claim(2);
    expect(() => pass.claim(2)).toThrow("receipt already exists");
  });
});
