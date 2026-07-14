import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { consumeAttestationLimit } from "@/lib/rate-limit";
import { getDailyQuizRound, gradeDailyQuiz } from "@/lib/quiz-bank";
import { issueQuizAttestation } from "@/lib/progression-attestation";

export const dynamic = "force-dynamic";

const submissionSchema = z.object({
  wallet: z.string().min(32).max(64),
  roundId: z.string().min(12).max(80),
  answers: z.array(z.number().int().min(0).max(3)).length(5),
});

const noStore = (body: unknown, status = 200, headers: Record<string, string> = {}) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "no-store, max-age=0", ...headers },
});

export async function GET() {
  return noStore(getDailyQuizRound());
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 4_096) return noStore({ error: "Request body is too large" }, 413);
    const body = submissionSchema.parse(await request.json());
    new PublicKey(body.wallet);
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = consumeAttestationLimit(`${forwardedFor}:${body.wallet}:quiz`);
    if (!limit.allowed) {
      return noStore({ error: "Too many quiz submissions" }, 429, { "Retry-After": String(limit.retryAfterSeconds) });
    }
    const graded = gradeDailyQuiz(body.roundId, body.answers);
    const attestation = graded.points > 0
      ? issueQuizAttestation(body.wallet, body.roundId, graded.score, graded.points, graded.results, process.env.NODE_ENV === "test")
      : null;
    return noStore({ ...graded, attestation }, 200, { "X-RateLimit-Remaining": String(limit.remaining) });
  } catch (error) {
    return noStore({ error: error instanceof Error ? error.message : "Quiz submission failed" }, 400);
  }
}
