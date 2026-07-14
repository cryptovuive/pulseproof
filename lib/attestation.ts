import { createHash } from "node:crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
import type { AttestationPayload, DataSource, MomentAttestation, PulseMoment } from "@/types/pulse";

const DEV_SEED = createHash("sha256").update("pulseproof-local-demo-attestor-v1").digest();

export function hashMoment(moment: PulseMoment): string {
  return createHash("sha256")
    .update(`${moment.fixtureId}|${moment.seq}|${moment.txlineAction}|${moment.occurredAt}`)
    .digest("hex");
}

export function canonicalAttestationMessage(payload: AttestationPayload): Uint8Array {
  return new TextEncoder().encode(
    [
      "PULSEPROOF_V1",
      payload.wallet,
      payload.fixtureId.toString(),
      payload.momentHash,
      payload.evidenceHash,
      payload.points.toString(),
      payload.badge.toString(),
      payload.expiresAt.toString(),
    ].join("|"),
  );
}

function getAttestorKeypair(allowDemoKey: boolean): nacl.SignKeyPair {
  const configured = process.env.ATTESTOR_SECRET_KEY;
  if (configured) {
    const bytes = bs58.decode(configured);
    if (bytes.length !== nacl.sign.secretKeyLength) {
      throw new Error("ATTESTOR_SECRET_KEY must decode to exactly 64 bytes");
    }
    return nacl.sign.keyPair.fromSecretKey(bytes);
  }
  if (!allowDemoKey) throw new Error("ATTESTOR_SECRET_KEY is required outside demo replay");
  return nacl.sign.keyPair.fromSeed(DEV_SEED);
}

export function signAttestorMessage(message: Uint8Array, allowDemoKey: boolean) {
  const keypair = getAttestorKeypair(allowDemoKey);
  return {
    signatureBase64: Buffer.from(nacl.sign.detached(message, keypair.secretKey)).toString("base64"),
    attestorPublicKey: bs58.encode(keypair.publicKey),
  };
}

export function issueAttestation(
  wallet: string,
  moment: PulseMoment,
  source: DataSource,
  allowDemoKey: boolean,
  txlineProof?: MomentAttestation["txlineProof"],
): MomentAttestation {
  const momentHash = hashMoment(moment);
  const evidenceHash = createHash("sha256")
    .update(`${source}|${momentHash}|${txlineProof?.responseDigest ?? "feed-event"}`)
    .digest("hex");
  const payload: AttestationPayload = {
    wallet,
    fixtureId: moment.fixtureId,
    momentHash,
    evidenceHash,
    points: moment.points,
    badge: moment.badge,
    expiresAt: Math.floor(Date.now() / 1000) + 5 * 60,
  };
  const message = canonicalAttestationMessage(payload);
  const signed = signAttestorMessage(message, allowDemoKey);
  return {
    payload,
    messageBase64: Buffer.from(message).toString("base64"),
    ...signed,
    source,
    txlineProof,
  };
}

export function verifyAttestation(attestation: MomentAttestation): boolean {
  return nacl.sign.detached.verify(
    Buffer.from(attestation.messageBase64, "base64"),
    Buffer.from(attestation.signatureBase64, "base64"),
    bs58.decode(attestation.attestorPublicKey),
  );
}
