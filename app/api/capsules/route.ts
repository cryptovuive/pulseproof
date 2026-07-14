import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  decodeCatchUpCapsule,
  encodeCatchUpCapsule,
  hashCatchUpPrefix,
  issueCatchUpCapsule,
  verifyCatchUpCapsule,
} from "@/lib/catch-up-capsule";
import { sportingMoments } from "@/lib/match-experience";
import { pulseAtMoment } from "@/lib/pulse-replay";
import { demoReplayEnabled, loadPulse } from "@/lib/pulse-service";
import { consumeAttestationLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const issueSchema = z.object({
  fixtureId: z.number().int().positive(),
  cursor: z.number().int().min(1).max(500),
  mode: z.enum(["live", "replay"]),
});

function noStore(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", ...extraHeaders },
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 2_048) return noStore({ error: "Request body is too large" }, 413);
    const body = issueSchema.parse(await request.json());
    const forceDemo = body.mode === "replay";
    if (forceDemo && !demoReplayEnabled()) return noStore({ error: "Replay capsules are disabled" }, 403);
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = consumeAttestationLimit(`${forwardedFor}:capsule`);
    if (!limit.allowed) {
      return noStore({ error: "Too many capsule requests" }, 429, { "Retry-After": String(limit.retryAfterSeconds) });
    }

    let full = await loadPulse(body.fixtureId, { forceDemo, historical: false });
    if (!forceDemo && full.phase === "FT") full = await loadPulse(body.fixtureId, { historical: true });
    const moments = sportingMoments(full.moments);
    if (body.cursor > moments.length) return noStore({ error: "Cursor exceeds the currently published event prefix" }, 409);
    const visible = moments.slice(0, body.cursor);
    const capsule = issueCatchUpCapsule(body.fixtureId, full.source, visible, forceDemo);
    return noStore({ capsule, token: encodeCatchUpCapsule(capsule) }, 200, {
      "X-RateLimit-Remaining": String(limit.remaining),
    });
  } catch (error) {
    return noStore({ error: error instanceof Error ? error.message : "Capsule request failed" }, 400);
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token") ?? "";
    const capsule = decodeCatchUpCapsule(token);
    if (!verifyCatchUpCapsule(capsule)) return noStore({ error: "Capsule signature or expiry is invalid" }, 400);
    const forceDemo = capsule.payload.source === "demo-replay";
    if (forceDemo && !demoReplayEnabled()) return noStore({ error: "Replay capsules are disabled" }, 403);
    const full = await loadPulse(capsule.payload.fixtureId, { forceDemo, historical: !forceDemo });
    const moments = sportingMoments(full.moments);
    if (moments.length < capsule.payload.cursor) return noStore({ error: "Source no longer contains the signed prefix" }, 409);
    const visible = moments.slice(0, capsule.payload.cursor);
    if (hashCatchUpPrefix(visible) !== capsule.payload.prefixHash) {
      return noStore({ error: "Published events do not match the signed prefix" }, 409);
    }
    const pulse = pulseAtMoment({ ...full, moments: visible }, visible.length, "RELAY");
    return noStore({ verified: true, capsule, pulse });
  } catch (error) {
    return noStore({ error: error instanceof Error ? error.message : "Capsule could not be opened" }, 400);
  }
}
