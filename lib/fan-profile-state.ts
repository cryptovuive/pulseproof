import type { FanProfile, RewardItem } from "@/types/pulse";

function emptyProfile(owner: string): FanProfile {
  return {
    address: "",
    owner,
    pointsEarned: 0,
    pointsSpent: 0,
    availablePoints: 0,
    checkins: 0,
    quizClaims: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastCheckinDay: -1,
    inventory: [],
    equippedBadge: null,
    equippedFrame: null,
    equippedCharacter: null,
    claims: 0,
  };
}

function baseProfile(profile: FanProfile | null, owner: string) {
  return profile ?? emptyProfile(owner);
}

export function applyConfirmedCheckIn(
  profile: FanProfile | null,
  owner: string,
  day: number,
): FanProfile {
  const current = baseProfile(profile, owner);
  if (current.lastCheckinDay === day) return current;
  const currentStreak = current.lastCheckinDay === day - 1 ? current.currentStreak + 1 : 1;
  const earned = 10 + Math.min(Math.max(currentStreak - 1, 0), 6) * 2;
  const pointsEarned = current.pointsEarned + earned;
  return {
    ...current,
    pointsEarned,
    availablePoints: Math.max(0, pointsEarned - current.pointsSpent),
    checkins: current.checkins + 1,
    currentStreak,
    bestStreak: Math.max(current.bestStreak, currentStreak),
    lastCheckinDay: day,
  };
}

export function applyConfirmedQuizClaim(
  profile: FanProfile | null,
  owner: string,
  points: number,
): FanProfile {
  const current = baseProfile(profile, owner);
  const pointsEarned = current.pointsEarned + points;
  return {
    ...current,
    pointsEarned,
    availablePoints: Math.max(0, pointsEarned - current.pointsSpent),
    quizClaims: current.quizClaims + 1,
    claims: current.claims + 1,
  };
}

export function applyConfirmedRewardRedemption(
  profile: FanProfile | null,
  owner: string,
  reward: RewardItem,
): FanProfile {
  const current = baseProfile(profile, owner);
  if (current.inventory.includes(reward.index)) return applyConfirmedEquipment(current, owner, reward);
  const pointsSpent = current.pointsSpent + reward.price;
  return applyConfirmedEquipment({
    ...current,
    pointsSpent,
    availablePoints: Math.max(0, current.pointsEarned - pointsSpent),
    inventory: [...current.inventory, reward.index].sort((left, right) => left - right),
    claims: current.claims + 1,
  }, owner, reward);
}

export function applyConfirmedEquipment(
  profile: FanProfile | null,
  owner: string,
  reward: Pick<RewardItem, "kind" | "index">,
): FanProfile {
  const current = baseProfile(profile, owner);
  if (reward.kind === "frame") return { ...current, equippedFrame: reward.index };
  if (reward.kind === "character") return { ...current, equippedCharacter: reward.index };
  return { ...current, equippedBadge: reward.index };
}
