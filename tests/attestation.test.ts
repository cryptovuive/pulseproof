import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { canonicalAttestationMessage, hashMoment, issueAttestation, verifyAttestation } from "@/lib/attestation";
import { DEMO_MOMENTS } from "@/lib/demo-data";

describe("moment attestations", () => {
  it("signs the canonical claim and verifies it", () => {
    const wallet = bs58.encode(nacl.sign.keyPair().publicKey);
    const attestation = issueAttestation(wallet, DEMO_MOMENTS[2], "demo-replay", true);
    expect(verifyAttestation(attestation)).toBe(true);
    expect(new TextDecoder().decode(canonicalAttestationMessage(attestation.payload))).toContain(
      `${wallet}|${DEMO_MOMENTS[2].fixtureId}|`,
    );
  });

  it("rejects a points value changed after signing", () => {
    const wallet = bs58.encode(nacl.sign.keyPair().publicKey);
    const attestation = issueAttestation(wallet, DEMO_MOMENTS[2], "demo-replay", true);
    attestation.payload.points += 99;
    attestation.messageBase64 = Buffer.from(canonicalAttestationMessage(attestation.payload)).toString("base64");
    expect(verifyAttestation(attestation)).toBe(false);
  });

  it("creates a unique deterministic hash per TxLINE sequence", () => {
    const hashes = DEMO_MOMENTS.map(hashMoment);
    expect(new Set(hashes).size).toBe(DEMO_MOMENTS.length);
    expect(hashMoment(DEMO_MOMENTS[0])).toBe(hashMoment(DEMO_MOMENTS[0]));
  });

  it("binds a TxLINE proof digest into the signed evidence hash", () => {
    const wallet = bs58.encode(nacl.sign.keyPair().publicKey);
    const first = issueAttestation(wallet, DEMO_MOMENTS[2], "txline-historical", true, {
      endpoint: "/scores/stat-validation?fixtureId=1&seq=2&statKeys=2",
      statKeys: [2],
      responseDigest: "a".repeat(64),
    });
    const second = issueAttestation(wallet, DEMO_MOMENTS[2], "txline-historical", true, {
      endpoint: "/scores/stat-validation?fixtureId=1&seq=2&statKeys=2",
      statKeys: [2],
      responseDigest: "b".repeat(64),
    });
    expect(first.payload.evidenceHash).not.toBe(second.payload.evidenceHash);
    expect(verifyAttestation(first)).toBe(true);
    expect(verifyAttestation(second)).toBe(true);
  });
});
