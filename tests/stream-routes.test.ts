import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getCanonicalStream } from "@/app/api/scores/stream/route";
import { GET as getPublicAlias } from "@/app/scores/stream/route";

describe("public SSE route contracts", () => {
  afterEach(() => vi.useRealTimers());
  it("exposes the canonical API route", async () => {
    const response = await getCanonicalStream(
      new NextRequest("http://localhost/api/scores/stream"),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain("fixtureIds must contain");
  });

  it("keeps the documented TxLINE-style alias", async () => {
    const response = await getPublicAlias(
      new NextRequest("http://localhost/scores/stream"),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain("fixtureIds must contain");
  });

  it("fails closed for live TxLINE after the hackathon licence expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"));
    const response = await getCanonicalStream(
      new NextRequest("http://localhost/api/scores/stream?fixtureIds=101"),
    );
    expect(response.status).toBe(451);
    expect(response.headers.get("X-PulseProof-Data-License")).toBe("expired");
    await expect(response.text()).resolves.toContain("written TxODDS permission");
  });
});
