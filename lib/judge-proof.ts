import type { CatchUpCapsuleRedemption, MatchOverview, MatchPulse, MomentAttestation } from "@/types/pulse";

export type JudgeProofResult = {
  checkedAt: string;
  network: "devnet";
  pulseProof: {
    programId: string;
    executable: boolean;
    owner: string;
    explorerUrl: string;
  };
  txline: {
    programId: string;
    executable: boolean;
    explorerUrl: string;
  };
  receipt: {
    signature: string;
    confirmationStatus: string | null;
    slot: number | null;
    error: unknown;
    explorerUrl: string;
  };
  progression: {
    wallet: string;
    fanProfile: string;
    fanAlias: string;
    displayName: string;
    explorerUrl: string;
    pointsEarned: number;
    pointsSpent: number;
    checkins: number;
    quizClaims: number;
    equippedBadge: number;
    quizReceipt: { signature: string; confirmationStatus: string | null; error: unknown; explorerUrl: string };
    rewardReceipt: { signature: string; confirmationStatus: string | null; error: unknown; explorerUrl: string };
  };
};

export function assertHealthEvidence(value: unknown): asserts value is {
  ok: true;
  txline: { network: string; programId: string; credentialsConfigured: boolean; dataLicense: { active: boolean; basis: string; expiresAt: string } };
} {
  const body = value as { ok?: unknown; txline?: Record<string, unknown> };
  if (body?.ok !== true) throw new Error("Production health did not return ok=true");
  if (body.txline?.network !== "devnet") throw new Error("TxLINE is not configured for devnet");
  if (body.txline?.credentialsConfigured !== true) throw new Error("TxLINE credentials are not active");
  const dataLicense = body.txline?.dataLicense as Record<string, unknown> | undefined;
  if (dataLicense?.active !== true) throw new Error("TxLINE hackathon data licence is not active");
  if (typeof dataLicense.expiresAt !== "string" || !Number.isFinite(Date.parse(dataLicense.expiresAt))) {
    throw new Error("TxLINE data-licence expiry is missing");
  }
  if (typeof body.txline?.programId !== "string" || body.txline.programId.length < 32) {
    throw new Error("TxLINE program identity is missing");
  }
}

export function assertCatalogEvidence(value: unknown): asserts value is { matches: MatchOverview[] } {
  const body = value as { matches?: unknown };
  if (!Array.isArray(body?.matches) || body.matches.length < 2) {
    throw new Error("The match catalog did not expose multiple fixtures");
  }
  const matches = body.matches as MatchOverview[];
  if (!matches.some((match) => match.source === "demo-replay" && match.phase === "FT")) {
    throw new Error("The catalog has no labelled finished-match replay");
  }
  if (matches.some((match) => !match.fixture.competition || !match.fixture.competitionSource)) {
    throw new Error("A fixture is missing competition provenance");
  }
  if (matches.some((match) => match.fixture.competition !== "FIFA World Cup 2026")) {
    throw new Error("A non-World Cup 2026 fixture leaked into the consumer catalog");
  }
}

export function assertReplayIsolation(full: MatchPulse, prefix: MatchPulse) {
  if (full.source !== "demo-replay" || prefix.source !== "demo-replay") {
    throw new Error("Replay isolation must use a labelled demo replay");
  }
  if (full.fixture.fixtureId !== prefix.fixture.fixtureId) throw new Error("Replay fixtures do not match");
  if (prefix.moments.length !== 2 || full.moments.length <= prefix.moments.length) {
    throw new Error("The replay prefix was not truncated at the requested cursor");
  }
  const expectedIds = full.moments.slice(0, prefix.moments.length).map((moment) => moment.id);
  if (prefix.moments.some((moment, index) => moment.id !== expectedIds[index])) {
    throw new Error("A future moment leaked into the replay prefix");
  }
  const lastScore = prefix.moments.at(-1)?.score ?? [0, 0];
  if (prefix.score[0] !== lastScore[0] || prefix.score[1] !== lastScore[1]) {
    throw new Error("Replay score does not match the visible event prefix");
  }
}

export function assertCapsuleEvidence(value: unknown): asserts value is CatchUpCapsuleRedemption {
  const body = value as Partial<CatchUpCapsuleRedemption>;
  const cursor = body.capsule?.payload?.cursor;
  if (body.verified !== true) throw new Error("Catch-up Capsule was not verified");
  if (!body.capsule || !body.pulse || !Number.isSafeInteger(cursor) || (cursor ?? 0) <= 0) {
    throw new Error("Catch-up Capsule evidence is incomplete");
  }
  if (body.pulse.fixture.fixtureId !== body.capsule.payload.fixtureId) throw new Error("Capsule fixture binding failed");
  if (body.pulse.moments.length !== cursor || body.pulse.replayCursor !== cursor) {
    throw new Error("Capsule delivered data outside its signed prefix");
  }
  if (!/^[a-f0-9]{64}$/.test(body.capsule.payload.prefixHash)) throw new Error("Capsule prefix digest is invalid");
  if (body.capsule.payload.expiresAt <= body.capsule.payload.issuedAt) throw new Error("Capsule expiry is invalid");
}

export function assertAttestationEvidence(value: unknown): asserts value is MomentAttestation {
  const body = value as Partial<MomentAttestation>;
  if (!body.payload || typeof body.messageBase64 !== "string" || typeof body.signatureBase64 !== "string") {
    throw new Error("The attestation payload is incomplete");
  }
  if (typeof body.attestorPublicKey !== "string" || body.attestorPublicKey.length < 32) {
    throw new Error("The attestor public key is missing");
  }
  if (body.payload.expiresAt <= Math.floor(Date.now() / 1000)) throw new Error("The attestation is already expired");
  if (!/^[a-f0-9]{64}$/.test(body.payload.evidenceHash)) throw new Error("The evidence digest is malformed");
}

export function assertChainEvidence(value: unknown): asserts value is JudgeProofResult {
  const body = value as Partial<JudgeProofResult>;
  if (body.network !== "devnet") throw new Error("Chain evidence is not from Solana devnet");
  if (!body.pulseProof?.executable) throw new Error("PulseProof program is not executable");
  if (!body.txline?.executable) throw new Error("TxLINE program is not executable");
  if (!body.receipt || body.receipt.error !== null || !body.receipt.slot) {
    throw new Error("The reference receipt is not confirmed");
  }
  if (!(["confirmed", "finalized"] as Array<string | null>).includes(body.receipt.confirmationStatus)) {
    throw new Error("The reference receipt has insufficient confirmation");
  }
  if (!body.progression || body.progression.pointsEarned < 1 || body.progression.pointsSpent < 1) {
    throw new Error("The on-chain fan progression profile is incomplete");
  }
  if (body.progression.displayName !== "Cryptovuive" || body.progression.fanAlias.length < 32) {
    throw new Error("The on-chain fan alias proof is missing");
  }
  if (body.progression.checkins < 1 || body.progression.quizClaims < 1 || body.progression.equippedBadge === 65_535) {
    throw new Error("The on-chain check-in, quiz or equipped reward proof is missing");
  }
  for (const progressionReceipt of [body.progression.quizReceipt, body.progression.rewardReceipt]) {
    if (progressionReceipt.error !== null || !["confirmed", "finalized"].includes(progressionReceipt.confirmationStatus ?? "")) {
      throw new Error("A fan progression receipt is not confirmed");
    }
  }
}

export function assertOfflineBoundary(serviceWorker: string) {
  const required = [
    'url.pathname.startsWith("/api/")',
    'url.pathname.startsWith("/scores/stream")',
    'caches.match("/")',
  ];
  if (!required.every((token) => serviceWorker.includes(token))) {
    throw new Error("The service worker cache boundary is incomplete");
  }
}
