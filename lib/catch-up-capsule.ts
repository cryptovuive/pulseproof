import { createHash } from "node:crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { signAttestorMessage } from "@/lib/attestation";
import type { CatchUpCapsule, CatchUpCapsulePayload, DataSource, PulseMoment } from "@/types/pulse";

export const CAPSULE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const CAPSULE_MAX_TOKEN_LENGTH = 4_096;

function canonicalMoment(moment: PulseMoment) {
  return JSON.stringify([
    moment.id,
    moment.fixtureId,
    moment.seq,
    moment.minute,
    moment.minuteLabel ?? "",
    moment.type,
    moment.team,
    moment.title,
    moment.description,
    moment.participant ?? "",
    moment.assist ?? "",
    moment.cardColor ?? "",
    moment.varOutcome ?? "",
    moment.score ?? null,
    moment.txlineAction,
    moment.occurredAt,
    moment.verified,
  ]);
}

export function hashCatchUpPrefix(moments: PulseMoment[]): string {
  if (!moments.length) throw new Error("A Catch-up Capsule needs at least one visible event");
  let digest = "PULSEPROOF_PREFIX_V1";
  for (const moment of moments) {
    digest = createHash("sha256").update(digest).update("\n").update(canonicalMoment(moment)).digest("hex");
  }
  return digest;
}

export function canonicalCapsuleMessage(payload: CatchUpCapsulePayload): Uint8Array {
  return new TextEncoder().encode([
    "PULSEPROOF_CATCHUP_V1",
    payload.version.toString(),
    payload.fixtureId.toString(),
    payload.cursor.toString(),
    payload.source,
    payload.prefixHash,
    payload.issuedAt.toString(),
    payload.expiresAt.toString(),
  ].join("|"));
}

export function issueCatchUpCapsule(
  fixtureId: number,
  source: DataSource,
  visibleMoments: PulseMoment[],
  allowDemoKey: boolean,
  nowSeconds = Math.floor(Date.now() / 1_000),
): CatchUpCapsule {
  if (!Number.isSafeInteger(fixtureId) || fixtureId <= 0) throw new Error("Invalid capsule fixture");
  if (!visibleMoments.length || visibleMoments.some((moment) => moment.fixtureId !== fixtureId)) {
    throw new Error("Capsule moments must belong to one fixture");
  }
  const payload: CatchUpCapsulePayload = {
    version: 1,
    fixtureId,
    cursor: visibleMoments.length,
    source,
    prefixHash: hashCatchUpPrefix(visibleMoments),
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + CAPSULE_MAX_AGE_SECONDS,
  };
  const message = canonicalCapsuleMessage(payload);
  return {
    payload,
    messageBase64: Buffer.from(message).toString("base64"),
    ...signAttestorMessage(message, allowDemoKey),
  };
}

export function verifyCatchUpCapsule(capsule: CatchUpCapsule, nowSeconds = Math.floor(Date.now() / 1_000)): boolean {
  if (!isCatchUpCapsule(capsule)) return false;
  if (capsule.payload.expiresAt < nowSeconds || capsule.payload.issuedAt > nowSeconds + 60) return false;
  const canonical = canonicalCapsuleMessage(capsule.payload);
  const supplied = Buffer.from(capsule.messageBase64, "base64");
  if (supplied.length !== canonical.length || !supplied.every((byte, index) => byte === canonical[index])) return false;
  try {
    return nacl.sign.detached.verify(
      supplied,
      Buffer.from(capsule.signatureBase64, "base64"),
      bs58.decode(capsule.attestorPublicKey),
    );
  } catch {
    return false;
  }
}

function isCatchUpCapsule(value: unknown): value is CatchUpCapsule {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const capsule = value as Partial<CatchUpCapsule>;
  const payload = capsule.payload as Partial<CatchUpCapsulePayload> | undefined;
  return payload?.version === 1
    && Number.isSafeInteger(payload.fixtureId) && (payload.fixtureId ?? 0) > 0
    && Number.isSafeInteger(payload.cursor) && (payload.cursor ?? 0) > 0 && (payload.cursor ?? 0) <= 500
    && ["txline-live", "txline-historical", "demo-replay"].includes(payload.source ?? "")
    && typeof payload.prefixHash === "string" && /^[a-f0-9]{64}$/.test(payload.prefixHash)
    && Number.isSafeInteger(payload.issuedAt)
    && Number.isSafeInteger(payload.expiresAt)
    && (payload.expiresAt ?? 0) > (payload.issuedAt ?? 0)
    && (payload.expiresAt ?? 0) - (payload.issuedAt ?? 0) <= CAPSULE_MAX_AGE_SECONDS
    && typeof capsule.messageBase64 === "string" && capsule.messageBase64.length <= 1_024
    && typeof capsule.signatureBase64 === "string" && capsule.signatureBase64.length <= 256
    && typeof capsule.attestorPublicKey === "string" && capsule.attestorPublicKey.length <= 64;
}

export function encodeCatchUpCapsule(capsule: CatchUpCapsule): string {
  return Buffer.from(JSON.stringify(capsule), "utf8").toString("base64url");
}

export function decodeCatchUpCapsule(token: string): CatchUpCapsule {
  if (!token || token.length > CAPSULE_MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("Invalid Catch-up Capsule token");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    throw new Error("Catch-up Capsule could not be decoded");
  }
  if (!isCatchUpCapsule(parsed)) throw new Error("Catch-up Capsule has an invalid shape");
  return parsed;
}
