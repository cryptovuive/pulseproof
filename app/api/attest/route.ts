import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { issueAttestation } from "@/lib/attestation";
import { demoReplayEnabled, loadPulse } from "@/lib/pulse-service";
import { getStatValidationEvidence } from "@/lib/txline";
import { consumeAttestationLimit } from "@/lib/rate-limit";
import { z } from "zod";

const requestSchema = z.object({
  wallet: z.string().min(32).max(64),
  fixtureId: z.number().int().positive(),
  momentId: z.string().min(1).max(160),
  mode: z.enum(["live", "replay"]).default("live"),
});

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 4_096) {
      return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    }
    const body = requestSchema.parse(await request.json());
    new PublicKey(body.wallet);
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = consumeAttestationLimit(`${forwardedFor}:${body.wallet}`);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many attestation requests" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
    const forceDemo = body.mode === "replay";
    if (forceDemo && !demoReplayEnabled()) {
      return NextResponse.json({ error: "Demo replay attestations are disabled" }, { status: 403 });
    }

    // A live claim must be re-checked against the current authenticated snapshot.
    // Historical loading is reserved for the explicit Catch-up endpoint; forcing
    // it here makes covered devnet metadata fail when no historical log exists.
    const pulse = await loadPulse(body.fixtureId, { forceDemo, historical: false });
    const moment = pulse.moments.find((item) => item.id === body.momentId);
    if (!moment) return NextResponse.json({ error: "Moment was not found in the TxLINE-backed feed" }, { status: 404 });
    const txlineProof = forceDemo ? undefined : await getStatValidationEvidence(moment);
    const attestation = issueAttestation(body.wallet, moment, pulse.source, forceDemo, txlineProof);
    return NextResponse.json(attestation, {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(limit.remaining),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Attestation request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
