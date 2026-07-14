import type { RewardItem, RewardKind } from "@/types/pulse";

const LEGACY_ATLAS = "/rewards/legacy-atlas.webp";
const WORLD_ATLAS = "/rewards/world-2026-atlas.webp";
const COMMUNITY_ATLAS = "/rewards/community-atlas.webp";
const MYTHIC_ATLAS = "/rewards/mythic-atlas.webp";
const FRAME_ATLAS = "/rewards/frame-atlas.webp";
const CHARACTER_ATLAS = "/rewards/character-atlas.webp";
const MYTHIC_CLOSE = "2026-07-21T23:59:59.000Z";

export const REWARD_KIND_CODE: Record<RewardKind, number> = {
  badge: 0,
  medal: 1,
  frame: 2,
  character: 3,
};

export const REWARD_CATALOG: RewardItem[] = [
  { id: "golden-striker", index: 0, kind: "medal", name: "Golden Striker", description: "For fans who know every route to goal.", collection: "legacy", rarity: "epic", price: 180, atlas: LEGACY_ATLAS, atlasIndex: 0 },
  { id: "last-line", index: 1, kind: "medal", name: "Last Line", description: "A salute to clean sheets and impossible saves.", collection: "legacy", rarity: "epic", price: 180, atlas: LEGACY_ATLAS, atlasIndex: 1 },
  { id: "five-star-legacy", index: 2, kind: "medal", name: "Five-Star Legacy", description: "Master the history of the tournament's most decorated nation.", collection: "legacy", rarity: "legendary", price: 260, atlas: LEGACY_ATLAS, atlasIndex: 2 },
  { id: "time-traveller", index: 3, kind: "medal", name: "Time Traveller", description: "Answer questions spanning multiple World Cup eras.", collection: "legacy", rarity: "rare", price: 120, atlas: LEGACY_ATLAS, atlasIndex: 3 },
  { id: "living-archive", index: 4, kind: "medal", name: "Living Archive", description: "A source-checking historian's mark.", collection: "legacy", rarity: "epic", price: 170, atlas: LEGACY_ATLAS, atlasIndex: 4 },
  { id: "discipline-reader", index: 5, kind: "medal", name: "Discipline Reader", description: "Know the cards, suspensions and turning points.", collection: "legacy", rarity: "rare", price: 110, atlas: LEGACY_ATLAS, atlasIndex: 5 },

  { id: "three-hosts", index: 6, kind: "badge", name: "Three Hosts", description: "Celebrate the first World Cup staged across three nations.", collection: "world-2026", rarity: "rare", price: 120, atlas: WORLD_ATLAS, atlasIndex: 0 },
  { id: "forty-eight", index: 7, kind: "badge", name: "Forty-Eight", description: "The expanded field, captured as one constellation.", collection: "world-2026", rarity: "epic", price: 160, atlas: WORLD_ATLAS, atlasIndex: 1 },
  { id: "bracket-scout", index: 8, kind: "badge", name: "Bracket Scout", description: "Follow the inaugural Round of 32 without losing the thread.", collection: "world-2026", rarity: "rare", price: 130, atlas: WORLD_ATLAS, atlasIndex: 2 },
  { id: "live-signal", index: 9, kind: "badge", name: "Live Signal", description: "Witness a source-labelled match signal.", collection: "world-2026", rarity: "epic", price: 190, atlas: WORLD_ATLAS, atlasIndex: 3 },
  { id: "spoiler-warden", index: 10, kind: "badge", name: "Spoiler Warden", description: "Catch up without exposing the future.", collection: "world-2026", rarity: "legendary", price: 240, atlas: WORLD_ATLAS, atlasIndex: 4 },
  { id: "match-marathon", index: 11, kind: "badge", name: "Match Marathon", description: "Built for all 104 matches in the expanded format.", collection: "world-2026", rarity: "epic", price: 200, atlas: WORLD_ATLAS, atlasIndex: 5 },

  { id: "seven-day-fire", index: 12, kind: "badge", name: "Seven-Day Fire", description: "Keep an on-chain check-in streak alive for a full week.", collection: "community", rarity: "epic", price: 170, atlas: COMMUNITY_ATLAS, atlasIndex: 0 },
  { id: "quiz-spark", index: 13, kind: "badge", name: "Quiz Spark", description: "Turn verified football knowledge into fan points.", collection: "community", rarity: "common", price: 60, atlas: COMMUNITY_ATLAS, atlasIndex: 1 },
  { id: "perfect-four", index: 14, kind: "badge", name: "Perfect Five", description: "Complete a daily round without a wrong answer.", collection: "community", rarity: "legendary", price: 220, atlas: COMMUNITY_ATLAS, atlasIndex: 2 },
  { id: "social-spark", index: 15, kind: "badge", name: "Social Spark", description: "A community-first identity cosmetic; never a financial reward.", collection: "community", rarity: "rare", price: 100, atlas: COMMUNITY_ATLAS, atlasIndex: 3 },
  { id: "safe-relay", index: 16, kind: "badge", name: "Safe Relay", description: "Share a signed event prefix with zero future-event payload.", collection: "community", rarity: "legendary", price: 230, atlas: COMMUNITY_ATLAS, atlasIndex: 4 },
  { id: "offline-keeper", index: 17, kind: "badge", name: "Offline Keeper", description: "Preserve a sanitized match memory for the commute home.", collection: "community", rarity: "rare", price: 130, atlas: COMMUNITY_ATLAS, atlasIndex: 5 },

  { id: "sun-relic", index: 18, kind: "medal", name: "Sun Relic", description: "Season-limited mythic relic for the North American finals.", collection: "mythic", rarity: "mythic", price: 420, atlas: MYTHIC_ATLAS, atlasIndex: 0, availableUntil: MYTHIC_CLOSE },
  { id: "aurora-crown", index: 19, kind: "medal", name: "Aurora Crown", description: "Season-limited northern-night stadium relic.", collection: "mythic", rarity: "mythic", price: 450, atlas: MYTHIC_ATLAS, atlasIndex: 1, availableUntil: MYTHIC_CLOSE },
  { id: "liberty-flame", index: 20, kind: "medal", name: "Liberty Flame", description: "Season-limited symbol of a fan voice burning bright.", collection: "mythic", rarity: "mythic", price: 440, atlas: MYTHIC_ATLAS, atlasIndex: 2, availableUntil: MYTHIC_CLOSE },
  { id: "triple-crown", index: 21, kind: "medal", name: "Triple Crown", description: "Three-host mythic edition, available only during the hackathon season.", collection: "mythic", rarity: "mythic", price: 500, atlas: MYTHIC_ATLAS, atlasIndex: 3, availableUntil: MYTHIC_CLOSE },
  { id: "time-vortex", index: 22, kind: "medal", name: "Time Vortex", description: "A limited bridge between classic finals and 2026.", collection: "mythic", rarity: "mythic", price: 480, atlas: MYTHIC_ATLAS, atlasIndex: 4, availableUntil: MYTHIC_CLOSE },
  { id: "eclipse-final", index: 23, kind: "medal", name: "Eclipse Final", description: "The rarest season cosmetic; visual utility only.", collection: "mythic", rarity: "mythic", price: 560, atlas: MYTHIC_ATLAS, atlasIndex: 5, availableUntil: MYTHIC_CLOSE },

  { id: "striker-laurel-frame", index: 24, kind: "frame", name: "Striker Laurel", description: "Gold-and-laurel avatar frame.", collection: "frames", rarity: "epic", price: 220, atlas: FRAME_ATLAS, atlasIndex: 0 },
  { id: "live-pulse-frame", index: 25, kind: "frame", name: "Live Pulse", description: "Electric blue realtime avatar frame.", collection: "frames", rarity: "rare", price: 150, atlas: FRAME_ATLAS, atlasIndex: 1 },
  { id: "quiz-crown-frame", index: 26, kind: "frame", name: "Quiz Crown", description: "Royal frame for daily perfect rounds.", collection: "frames", rarity: "legendary", price: 280, atlas: FRAME_ATLAS, atlasIndex: 2 },
  { id: "streak-fire-frame", index: 27, kind: "frame", name: "Streak Fire", description: "Coral flame frame for consistent fans.", collection: "frames", rarity: "epic", price: 210, atlas: FRAME_ATLAS, atlasIndex: 3 },
  { id: "shield-frame", index: 28, kind: "frame", name: "Shield Ring", description: "Spoiler-safe guardian frame.", collection: "frames", rarity: "epic", price: 230, atlas: FRAME_ATLAS, atlasIndex: 4 },
  { id: "eclipse-frame", index: 29, kind: "frame", name: "Eclipse Ring", description: "Season-limited mythic profile frame.", collection: "frames", rarity: "mythic", price: 520, atlas: FRAME_ATLAS, atlasIndex: 5, availableUntil: MYTHIC_CLOSE },

  { id: "bolt-keeper", index: 30, kind: "character", name: "Bolt Keeper", description: "Lime pulse guardian profile character.", collection: "characters", rarity: "rare", price: 160, atlas: CHARACTER_ATLAS, atlasIndex: 0 },
  { id: "radio-scout", index: 31, kind: "character", name: "Radio Scout", description: "Blue match-signal explorer.", collection: "characters", rarity: "rare", price: 160, atlas: CHARACTER_ATLAS, atlasIndex: 1 },
  { id: "archive-owl", index: 32, kind: "character", name: "Archive Owl", description: "Gold historian mascot for sourced quiz facts.", collection: "characters", rarity: "epic", price: 230, atlas: CHARACTER_ATLAS, atlasIndex: 2 },
  { id: "quiz-fox", index: 33, kind: "character", name: "Quiz Fox", description: "Fast-thinking coral trivia companion.", collection: "characters", rarity: "epic", price: 230, atlas: CHARACTER_ATLAS, atlasIndex: 3 },
  { id: "relay-unit", index: 34, kind: "character", name: "Relay Unit", description: "Silver keeper of signed Catch-up Capsules.", collection: "characters", rarity: "legendary", price: 310, atlas: CHARACTER_ATLAS, atlasIndex: 4 },
  { id: "eclipse-guardian", index: 35, kind: "character", name: "Eclipse Guardian", description: "Season-limited mythic profile character.", collection: "characters", rarity: "mythic", price: 580, atlas: CHARACTER_ATLAS, atlasIndex: 5, availableUntil: MYTHIC_CLOSE },
];

export function getReward(id: string) {
  return REWARD_CATALOG.find((reward) => reward.id === id);
}

export function rewardIsAvailable(reward: RewardItem, now = Date.now()) {
  return !reward.availableUntil || Date.parse(reward.availableUntil) >= now;
}
