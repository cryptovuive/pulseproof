export type DataSource = "txline-live" | "txline-historical" | "demo-replay";

export type MomentType =
  | "kickoff"
  | "goal"
  | "shot"
  | "corner"
  | "card"
  | "var"
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
