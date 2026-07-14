import { describe, expect, it } from "vitest";
import {
  canonicalCapsuleMessage,
  decodeCatchUpCapsule,
  encodeCatchUpCapsule,
  hashCatchUpPrefix,
  issueCatchUpCapsule,
  verifyCatchUpCapsule,
} from "@/lib/catch-up-capsule";
import { PORTUGAL_SPAIN_FIXTURE, PORTUGAL_SPAIN_MOMENTS } from "@/lib/demo-data";

describe("Verified Catch-up Capsules", () => {
  const now = 1_800_000_000;

  it("signs and round-trips one exact visible event prefix", () => {
    const visible = PORTUGAL_SPAIN_MOMENTS.slice(0, 3);
    const capsule = issueCatchUpCapsule(PORTUGAL_SPAIN_FIXTURE.fixtureId, "demo-replay", visible, true, now);
    const decoded = decodeCatchUpCapsule(encodeCatchUpCapsule(capsule));
    expect(decoded.payload).toMatchObject({ fixtureId: PORTUGAL_SPAIN_FIXTURE.fixtureId, cursor: 3, source: "demo-replay" });
    expect(decoded.payload.prefixHash).toBe(hashCatchUpPrefix(visible));
    expect(verifyCatchUpCapsule(decoded, now + 60)).toBe(true);
  });

  it("binds the cursor and prefix digest so tampering fails", () => {
    const capsule = issueCatchUpCapsule(PORTUGAL_SPAIN_FIXTURE.fixtureId, "demo-replay", PORTUGAL_SPAIN_MOMENTS.slice(0, 2), true, now);
    const tampered = structuredClone(capsule);
    tampered.payload.cursor = 3;
    tampered.messageBase64 = Buffer.from(canonicalCapsuleMessage(tampered.payload)).toString("base64");
    expect(verifyCatchUpCapsule(tampered, now + 1)).toBe(false);
  });

  it("produces a different commitment when a future event is added", () => {
    expect(hashCatchUpPrefix(PORTUGAL_SPAIN_MOMENTS.slice(0, 2))).not.toBe(hashCatchUpPrefix(PORTUGAL_SPAIN_MOMENTS.slice(0, 3)));
  });

  it("expires and rejects oversized or malformed transport tokens", () => {
    const capsule = issueCatchUpCapsule(PORTUGAL_SPAIN_FIXTURE.fixtureId, "demo-replay", PORTUGAL_SPAIN_MOMENTS.slice(0, 1), true, now);
    expect(verifyCatchUpCapsule(capsule, capsule.payload.expiresAt + 1)).toBe(false);
    expect(() => decodeCatchUpCapsule("x".repeat(4_097))).toThrow(/invalid/i);
    expect(() => decodeCatchUpCapsule("not+base64")).toThrow(/invalid/i);
  });
});
