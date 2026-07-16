import { describe, expect, it } from "vitest";
import {
  applyConfirmedCheckIn,
  applyConfirmedEquipment,
  applyConfirmedQuizClaim,
  applyConfirmedRewardRedemption,
} from "@/lib/fan-profile-state";
import { REWARD_CATALOG } from "@/lib/reward-catalog";
import type { FanProfile } from "@/types/pulse";

const owner = "8KmjwHgXda7vCSV64q6rXfQtComhzNPimNjUY3hfruDh";

function profile(overrides: Partial<FanProfile> = {}): FanProfile {
  return {
    address: "profile-pda",
    owner,
    pointsEarned: 100,
    pointsSpent: 20,
    availablePoints: 80,
    checkins: 3,
    quizClaims: 1,
    currentStreak: 3,
    bestStreak: 4,
    lastCheckinDay: 20,
    inventory: [],
    equippedBadge: null,
    equippedFrame: null,
    equippedCharacter: null,
    claims: 1,
    ...overrides,
  };
}

describe("confirmed fan profile UI state", () => {
  it("shows today's check-in, streak and exact contract bonus immediately", () => {
    const next = applyConfirmedCheckIn(profile(), owner, 21);
    expect(next).toMatchObject({
      lastCheckinDay: 21,
      currentStreak: 4,
      bestStreak: 4,
      checkins: 4,
      pointsEarned: 116,
      availablePoints: 96,
    });
    expect(applyConfirmedCheckIn(next, owner, 21)).toBe(next);
  });

  it("starts a new streak and creates a complete first profile when needed", () => {
    const reset = applyConfirmedCheckIn(profile({ lastCheckinDay: 10 }), owner, 21);
    expect(reset.currentStreak).toBe(1);
    expect(reset.pointsEarned).toBe(110);
    const first = applyConfirmedCheckIn(null, owner, 21);
    expect(first).toMatchObject({ owner, lastCheckinDay: 21, currentStreak: 1, checkins: 1, pointsEarned: 10, availablePoints: 10 });
  });

  it("adds a confirmed quiz reward without waiting for an RPC refresh", () => {
    expect(applyConfirmedQuizClaim(profile(), owner, 70)).toMatchObject({
      pointsEarned: 170,
      availablePoints: 150,
      quizClaims: 2,
      claims: 2,
    });
  });

  it("redeems and equips badges, frames and characters in one UI transition", () => {
    const badge = REWARD_CATALOG.find((reward) => reward.kind === "badge")!;
    const frame = REWARD_CATALOG.find((reward) => reward.kind === "frame")!;
    const character = REWARD_CATALOG.find((reward) => reward.kind === "character")!;
    const redeemed = applyConfirmedRewardRedemption(profile({ pointsEarned: 1_000, availablePoints: 980 }), owner, badge);
    expect(redeemed.inventory).toContain(badge.index);
    expect(redeemed.equippedBadge).toBe(badge.index);
    expect(redeemed.pointsSpent).toBe(20 + badge.price);
    expect(redeemed.claims).toBe(2);
    expect(applyConfirmedEquipment(redeemed, owner, frame).equippedFrame).toBe(frame.index);
    expect(applyConfirmedEquipment(redeemed, owner, character).equippedCharacter).toBe(character.index);
  });
});
