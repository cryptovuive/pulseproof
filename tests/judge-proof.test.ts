import { describe, expect, it } from "vitest";
import {
  assertCatalogEvidence,
  assertCapsuleEvidence,
  assertChainEvidence,
  assertHealthEvidence,
  assertOfflineBoundary,
  assertReplayIsolation,
} from "@/lib/judge-proof";
import type { MatchOverview, MatchPulse } from "@/types/pulse";

const fixture = {
  fixtureId: 42,
  homeTeam: "France",
  awayTeam: "Spain",
  startTime: "2026-07-15T19:00:00.000Z",
  competition: "FIFA World Cup 2026",
  competitionSource: "published-report" as const,
  stage: "Semi-final",
  gameState: 4,
};

const moments = [1, 2, 3].map((seq) => ({
  id: `42:${seq}`,
  fixtureId: 42,
  seq,
  minute: seq * 10,
  type: seq === 3 ? "goal" as const : "moment" as const,
  team: "home" as const,
  title: `Moment ${seq}`,
  description: `Event ${seq}`,
  points: 1,
  badge: 1,
  score: seq === 3 ? [1, 0] as [number, number] : [0, 0] as [number, number],
  txlineAction: `action:${seq}`,
  occurredAt: `2026-07-13T10:${seq}0:00.000Z`,
  verified: true,
}));

function pulse(slice = moments): MatchPulse {
  return {
    fixture,
    source: "demo-replay",
    phase: slice.length === moments.length ? "FT" : "REPLAY",
    minute: slice.at(-1)?.minute ?? 0,
    score: slice.at(-1)?.score ?? [0, 0],
    momentum: 50,
    updatedAt: "2026-07-13T10:40:00.000Z",
    moments: slice,
  };
}

describe("judge live proof validators", () => {
  it("requires active TxLINE devnet identity", () => {
    expect(() => assertHealthEvidence({
      ok: true,
      txline: { network: "devnet", programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J", credentialsConfigured: true, dataLicense: { active: true, basis: "hackathon-window", expiresAt: "2026-07-19T23:59:59.999Z" } },
    })).not.toThrow();
    expect(() => assertHealthEvidence({ ok: true, txline: { network: "devnet", credentialsConfigured: false } })).toThrow(/credentials/i);
    expect(() => assertHealthEvidence({ ok: true, txline: { network: "devnet", programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J", credentialsConfigured: true, dataLicense: { active: false, basis: "expired", expiresAt: "2026-07-19T23:59:59.999Z" } } })).toThrow(/licence/i);
  });

  it("requires live and replay sources to be explicitly separated", () => {
    const base: MatchOverview = { fixture, source: "demo-replay", phase: "FT", minute: 90, score: [1, 0], scoreKnown: true, updatedAt: fixture.startTime, momentCount: 3 };
    const live: MatchOverview = {
      ...base,
      fixture: { ...fixture, fixtureId: 43, competitionSource: "txline" },
      source: "txline-live",
      phase: "WAITING",
      scoreKnown: false,
    };
    expect(() => assertCatalogEvidence({ matches: [base, live] })).not.toThrow();
    expect(() => assertCatalogEvidence({ matches: [base] })).toThrow(/multiple|TxLINE/i);
  });

  it("proves a catch-up prefix contains no future moment", () => {
    expect(() => assertReplayIsolation(pulse(), pulse(moments.slice(0, 2)))).not.toThrow();
    const leaked = pulse([moments[0], moments[2]]);
    expect(() => assertReplayIsolation(pulse(), leaked)).toThrow(/future moment/i);
  });

  it("requires a signed relay to deliver exactly its committed cursor", () => {
    const evidence = {
      verified: true as const,
      capsule: {
        payload: { version: 1 as const, fixtureId: 42, cursor: 2, source: "demo-replay" as const, prefixHash: "a".repeat(64), issuedAt: 100, expiresAt: 200 },
        messageBase64: "message",
        signatureBase64: "signature",
        attestorPublicKey: "attestor",
      },
      pulse: { ...pulse(moments.slice(0, 2)), replayCursor: 2 },
    };
    expect(() => assertCapsuleEvidence(evidence)).not.toThrow();
    expect(() => assertCapsuleEvidence({ ...evidence, pulse: { ...evidence.pulse, moments: moments } })).toThrow(/outside/i);
  });

  it("requires executable programs and a confirmed clean receipt", () => {
    const evidence = {
      checkedAt: "2026-07-13T10:00:00.000Z",
      network: "devnet" as const,
      pulseProof: { programId: "pulse", executable: true, owner: "loader", explorerUrl: "https://example.com" },
      txline: { programId: "txline", executable: true, explorerUrl: "https://example.com" },
      receipt: { signature: "sig", confirmationStatus: "confirmed", slot: 123, error: null, explorerUrl: "https://example.com" },
      progression: {
        wallet: "wallet",
        fanProfile: "profile",
        fanAlias: "HA2NUKeaLDy9nxf7JvUWhQNDKySqheG68a2B8nj5o9QN",
        displayName: "Cryptovuive26",
        explorerUrl: "https://example.com",
        pointsEarned: 85,
        pointsSpent: 60,
        checkins: 1,
        quizClaims: 1,
        equippedBadge: 13,
        equippedFrame: 65_535,
        equippedCharacter: 65_535,
        quizReceipt: { signature: "quiz", confirmationStatus: "finalized", error: null, explorerUrl: "https://example.com" },
        rewardReceipt: { signature: "reward", confirmationStatus: "finalized", error: null, explorerUrl: "https://example.com" },
      },
    };
    expect(() => assertChainEvidence(evidence)).not.toThrow();
    expect(() => assertChainEvidence({ ...evidence, receipt: { ...evidence.receipt, error: { custom: 1 } } })).toThrow(/receipt/i);
    expect(() => assertChainEvidence({
      ...evidence,
      progression: { ...evidence.progression, equippedBadge: 65_535 },
    })).toThrow(/equipped reward/i);
  });

  it("keeps APIs and SSE outside the offline cache", () => {
    const worker = 'caches.match("/"); url.pathname.startsWith("/api/"); url.pathname.startsWith("/scores/stream")';
    expect(() => assertOfflineBoundary(worker)).not.toThrow();
    expect(() => assertOfflineBoundary('caches.match("/")')).toThrow(/boundary/i);
  });
});
