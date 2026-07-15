export type DataSource = "txline-live" | "txline-historical" | "demo-replay";

export type MomentType =
  | "kickoff"
  | "goal"
  | "shot"
  | "corner"
  | "card"
  | "var"
  | "substitution"
  | "halftime"
  | "final"
  | "moment";

export interface Fixture {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  competition: string;
  competitionSource: "txline" | "verified-schedule" | "published-report" | "unavailable";
  competitionSourceUrl?: string;
  stage: string;
  gameState: number;
}

export interface PulseMoment {
  id: string;
  fixtureId: number;
  seq: number;
  minute: number;
  minuteLabel?: string;
  type: MomentType;
  team: "home" | "away" | "neutral";
  title: string;
  description: string;
  participant?: string;
  assist?: string;
  cardColor?: "yellow" | "red";
  varOutcome?: string;
  points: number;
  badge: number;
  score?: [number, number];
  txlineAction: string;
  occurredAt: string;
  verified: boolean;
}

export interface MatchPulse {
  fixture: Fixture;
  source: DataSource;
  phase: string;
  minute: number;
  score: [number, number];
  momentum: number;
  updatedAt: string;
  moments: PulseMoment[];
  replayCursor?: number;
  provenance?: {
    provider: string;
    sourceUrl?: string;
    verifiedAt: string;
  };
}

export interface MatchOverview {
  fixture: Fixture;
  source: DataSource;
  phase: string;
  minute: number;
  score: [number, number];
  scoreKnown: boolean;
  updatedAt: string;
  momentCount: number;
}

export interface ScheduleEntry {
  fixture: Fixture;
  source: "txline-fixtures" | "verified-schedule";
  coverage: "txline-confirmed" | "externally-confirmed" | "participants-pending";
  provenance: {
    provider: string;
    sourceUrl?: string;
    verifiedAt: string;
  };
  result?: {
    phase: "FT";
    score: [number, number];
    winnerTeam: string;
    loserTeam: string;
    replayFixtureId: number;
  };
  participantPaths?: {
    home?: { kind: "winner" | "loser"; fixtureId: number; label: string };
    away?: { kind: "winner" | "loser"; fixtureId: number; label: string };
  };
}

export interface AttestationPayload {
  wallet: string;
  fixtureId: number;
  momentHash: string;
  evidenceHash: string;
  points: number;
  badge: number;
  expiresAt: number;
}

export interface MomentAttestation {
  payload: AttestationPayload;
  messageBase64: string;
  signatureBase64: string;
  attestorPublicKey: string;
  source: DataSource;
  txlineProof?: {
    endpoint: string;
    statKeys: number[];
    responseDigest: string;
  };
}

export interface CatchUpCapsulePayload {
  version: 1;
  fixtureId: number;
  cursor: number;
  source: DataSource;
  prefixHash: string;
  issuedAt: number;
  expiresAt: number;
}

export interface CatchUpCapsule {
  payload: CatchUpCapsulePayload;
  messageBase64: string;
  signatureBase64: string;
  attestorPublicKey: string;
}

export interface CatchUpCapsuleRedemption {
  verified: true;
  capsule: CatchUpCapsule;
  pulse: MatchPulse;
}

export type RewardKind = "badge" | "medal" | "frame" | "character";

export interface RewardItem {
  id: string;
  index: number;
  kind: RewardKind;
  name: string;
  description: string;
  collection: "legacy" | "world-2026" | "community" | "mythic" | "frames" | "characters";
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  price: number;
  atlas: string;
  atlasIndex: number;
  availableUntil?: string;
}

export interface FanAlias {
  address: string;
  owner: string;
  displayName: string;
  updatedAt: number;
}

export interface FanProfile {
  address: string;
  owner: string;
  pointsEarned: number;
  pointsSpent: number;
  availablePoints: number;
  checkins: number;
  quizClaims: number;
  currentStreak: number;
  bestStreak: number;
  lastCheckinDay: number;
  inventory: number[];
  equippedBadge: number | null;
  equippedFrame: number | null;
  equippedCharacter: number | null;
  claims: number;
}

export interface QuizQuestionPublic {
  id: string;
  era: "2026" | "history" | "records" | "discipline";
  difficulty: "rookie" | "pro" | "legend";
  prompt: string;
  options: string[];
}

export interface QuizRound {
  roundId: string;
  edition: string;
  validForUtcDay: number;
  questions: QuizQuestionPublic[];
  maxPoints: number;
  mode?: "daily" | "practice";
  catalogSize?: number;
}

export interface QuizAttestationPayload {
  wallet: string;
  quizHash: string;
  score: number;
  points: number;
  expiresAt: number;
}

export interface QuizAttestation {
  payload: QuizAttestationPayload;
  messageBase64: string;
  signatureBase64: string;
  attestorPublicKey: string;
  results: Array<{ questionId: string; correct: boolean; correctIndex: number; explanation: string }>;
}

export interface RewardAttestationPayload {
  wallet: string;
  rewardHash: string;
  kind: number;
  itemIndex: number;
  cost: number;
  expiresAt: number;
}

export interface RewardAttestation {
  payload: RewardAttestationPayload;
  messageBase64: string;
  signatureBase64: string;
  attestorPublicKey: string;
  reward: RewardItem;
}

export interface CommunityMessage {
  id: string;
  fixtureId: number;
  nickname: string;
  wallet: string;
  walletHint: string;
  body: string;
  team?: string;
  createdAt: string;
}
