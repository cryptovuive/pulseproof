import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { consumeAttestationLimit } from "@/lib/rate-limit";
import { getReward, rewardIsAvailable } from "@/lib/reward-catalog";
import { issueRewardAttestation } from "@/lib/progression-attestation";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

function errorResponse(error: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error }, { status, headers: { ...NO_STORE_HEADERS, ...headers } });
}

const requestSchema = z.object({
  wallet: z.string().min(32).max(64),
  rewardId: z.string().regex(/^[a-z0-9-]{2,64}$/),
});

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 2_048) return errorResponse("Request body is too large", 413);
    const body = requestSchema.parse(await request.json());
    new PublicKey(body.wallet);
    const reward = getReward(body.rewardId);
    if (!reward) return errorResponse("Reward was not found", 404);
    if (!rewardIsAvailable(reward)) return errorResponse("This seasonal reward is no longer available", 410);
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = consumeAttestationLimit(`${forwardedFor}:${body.wallet}:reward`);
    if (!limit.allowed) {
      return errorResponse("Too many reward requests", 429, { "Retry-After": String(limit.retryAfterSeconds) });
    }
    return NextResponse.json(issueRewardAttestation(body.wallet, reward, process.env.NODE_ENV === "test"), {
      headers: { ...NO_STORE_HEADERS, "X-RateLimit-Remaining": String(limit.remaining) },
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Reward attestation failed", 400);
  }
}
