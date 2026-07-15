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

class FanProfileModel {
  earned = 0;
  spent = 0;
  lastDay = -1;
  streak = 0;
  inventory = new Set<number>();
  quizReceipts = new Set<string>();
  epoch = 0;

  checkIn(day: number) {
    if (this.lastDay === day) throw new Error("already checked in");
    this.streak = this.lastDay === day - 1 ? this.streak + 1 : 1;
    this.lastDay = day;
    this.earned += 10 + Math.min(this.streak - 1, 6) * 2;
  }

  claimQuiz(hash: string, points: number) {
    const receipt = `${this.epoch}:${hash}`;
    if (this.quizReceipts.has(receipt)) throw new Error("quiz receipt already exists");
    this.quizReceipts.add(receipt);
    this.earned += points;
  }

  resetForDevnetTesting(points: number) {
    if (points < 0 || points > 1_000) throw new Error("invalid test grant");
    this.epoch += 1;
    this.earned = points;
    this.spent = 0;
    this.lastDay = -1;
    this.streak = 0;
    this.inventory.clear();
  }

  redeem(index: number, cost: number) {
    if (this.inventory.has(index)) throw new Error("reward already owned");
    if (this.earned - this.spent < cost) throw new Error("insufficient points");
    this.spent += cost;
    this.inventory.add(index);
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

  it("awards deterministic check-in streak points once per UTC day", () => {
    const profile = new FanProfileModel();
    profile.checkIn(20_000);
    profile.checkIn(20_001);
    profile.checkIn(20_002);
    expect(profile.earned).toBe(10 + 12 + 14);
    expect(profile.streak).toBe(3);
    expect(() => profile.checkIn(20_002)).toThrow("already checked in");
    profile.checkIn(20_004);
    expect(profile.streak).toBe(1);
  });

  it("prevents quiz replay, overspending and duplicate reward redemption", () => {
    const profile = new FanProfileModel();
    profile.claimQuiz("daily-1", 70);
    expect(() => profile.claimQuiz("daily-1", 70)).toThrow("quiz receipt already exists");
    expect(() => profile.redeem(13, 80)).toThrow("insufficient points");
    profile.checkIn(20_000);
    profile.redeem(13, 80);
    expect(profile.inventory.has(13)).toBe(true);
    expect(profile.earned - profile.spent).toBe(0);
    expect(() => profile.redeem(13, 80)).toThrow("reward already owned");
  });

  it("resets devnet state into a fresh receipt epoch with a bounded test grant", () => {
    const profile = new FanProfileModel();
    profile.claimQuiz("daily-1", 70);
    profile.redeem(13, 60);
    profile.resetForDevnetTesting(1_000);
    expect(profile.earned).toBe(1_000);
    expect(profile.spent).toBe(0);
    expect(profile.inventory.size).toBe(0);
    expect(profile.lastDay).toBe(-1);
    expect(() => profile.claimQuiz("daily-1", 70)).not.toThrow();
    expect(() => profile.resetForDevnetTesting(1_001)).toThrow("invalid test grant");
  });
});
