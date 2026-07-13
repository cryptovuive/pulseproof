import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as getCanonicalStream } from "@/app/api/scores/stream/route";
import { GET as getPublicAlias } from "@/app/scores/stream/route";

describe("public SSE route contracts", () => {
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
});
