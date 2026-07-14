import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/capsules/route";
import { PORTUGAL_SPAIN_FIXTURE } from "@/lib/demo-data";
import { resetAttestationLimitsForTests } from "@/lib/rate-limit";
import type { CatchUpCapsuleRedemption } from "@/types/pulse";

describe("Catch-up Capsule API", () => {
  beforeEach(() => {
    process.env.DEMO_REPLAY_ENABLED = "true";
    resetAttestationLimitsForTests();
  });

  it("issues then redeems only the requested signed prefix", async () => {
    const issuedResponse = await POST(new NextRequest("http://localhost/api/capsules", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "capsule-test" },
      body: JSON.stringify({ fixtureId: PORTUGAL_SPAIN_FIXTURE.fixtureId, cursor: 2, mode: "replay" }),
    }));
    expect(issuedResponse.status).toBe(200);
    const issued = await issuedResponse.json() as { token: string };

    const redeemedResponse = await GET(new NextRequest(`http://localhost/api/capsules?token=${encodeURIComponent(issued.token)}`));
    expect(redeemedResponse.status).toBe(200);
    const redeemed = await redeemedResponse.json() as CatchUpCapsuleRedemption;
    expect(redeemed.verified).toBe(true);
    expect(redeemed.pulse.moments).toHaveLength(2);
    expect(redeemed.pulse.replayCursor).toBe(2);
    expect(redeemed.pulse.moments.map((moment) => moment.id)).toEqual(["por-esp-kickoff", "por-esp-halftime"]);
  });

  it("fails closed for a cursor beyond the published source prefix", async () => {
    const response = await POST(new NextRequest("http://localhost/api/capsules", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "capsule-test" },
      body: JSON.stringify({ fixtureId: PORTUGAL_SPAIN_FIXTURE.fixtureId, cursor: 99, mode: "replay" }),
    }));
    expect(response.status).toBe(409);
    await expect(response.text()).resolves.toContain("Cursor exceeds");
  });

  it("rejects a modified token before loading any replay", async () => {
    const response = await GET(new NextRequest("http://localhost/api/capsules?token=broken-token"));
    expect(response.status).toBe(400);
  });
});
