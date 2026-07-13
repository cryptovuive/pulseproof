import type { MatchOverview, MatchPulse, MomentAttestation } from "@/types/pulse";

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
};

export function assertHealthEvidence(value: unknown): asserts value is {
  ok: true;
  txline: { network: string; programId: string; credentialsConfigured: boolean };
} {
  const body = value as { ok?: unknown; txline?: Record<string, unknown> };
  if (body?.ok !== true) throw new Error("Production health did not return ok=true");
  if (body.txline?.network !== "devnet") throw new Error("TxLINE is not configured for devnet");
  if (body.txline?.credentialsConfigured !== true) throw new Error("TxLINE credentials are not active");
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
  if (!matches.some((match) => match.source === "txline-live")) {
    throw new Error("The catalog has no TxLINE-covered fixture");
  }
  if (!matches.some((match) => match.source === "demo-replay" && match.phase === "FT")) {
    throw new Error("The catalog has no labelled finished-match replay");
  }
  if (matches.some((match) => !match.fixture.competition || !match.fixture.competitionSource)) {
    throw new Error("A fixture is missing competition provenance");
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
