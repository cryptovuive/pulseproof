import { beforeEach, describe, expect, it } from "vitest";
import { consumeAttestationLimit, resetAttestationLimitsForTests } from "@/lib/rate-limit";

describe("attestation rate limiter", () => {
  beforeEach(resetAttestationLimitsForTests);

  it("allows ten requests and rejects the eleventh", () => {
    for (let index = 0; index < 10; index += 1) {
      expect(consumeAttestationLimit("ip:wallet", 1_000).allowed).toBe(true);
    }
    const rejected = consumeAttestationLimit("ip:wallet", 1_000);
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterSeconds).toBe(60);
  });

  it("opens a new window after expiry", () => {
    for (let index = 0; index < 10; index += 1) consumeAttestationLimit("ip:wallet", 1_000);
    expect(consumeAttestationLimit("ip:wallet", 61_001).allowed).toBe(true);
  });
});
