import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { consumeAttestationLimit } from "@/lib/rate-limit";
import { getDailyQuizRound, getPracticeQuizRound, gradeDailyQuiz, gradePracticeQuiz } from "@/lib/quiz-bank";
import { issueQuizAttestation } from "@/lib/progression-attestation";

export const dynamic = "force-dynamic";

const submissionSchema = z.object({
  wallet: z.string().min(32).max(64).optional(),
  roundId: z.string().min(12).max(80),
  answers: z.array(z.number().int().min(0).max(3)).min(5).max(10),
});

const noStore = (body: unknown, status = 200, headers: Record<string, string> = {}) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "no-store, max-age=0", ...headers },
});

export async function GET(request?: NextRequest) {
  const mode = request?.nextUrl.searchParams.get("mode");
  if (mode === "practice") {
    const seed = Number(request?.nextUrl.searchParams.get("seed") ?? Date.now());
    if (!Number.isSafeInteger(seed)) return noStore({ error: "Practice seed must be an integer" }, 400);
    return noStore(getPracticeQuizRound(seed));
  }
  return noStore(getDailyQuizRound());
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 4_096) return noStore({ error: "Request body is too large" }, 413);
    const body = submissionSchema.parse(await request.json());
    const practice = body.roundId.startsWith("world-cup-practice-");
    if (!practice && !body.wallet) throw new Error("Connect a wallet for the daily points round");
    if (body.wallet) new PublicKey(body.wallet);
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = consumeAttestationLimit(`${forwardedFor}:${body.wallet ?? "practice"}:quiz`);
    if (!limit.allowed) {
      return noStore({ error: "Too many quiz submissions" }, 429, { "Retry-After": String(limit.retryAfterSeconds) });
    }
    const graded = practice ? gradePracticeQuiz(body.roundId, body.answers) : gradeDailyQuiz(body.roundId, body.answers);
    const attestation = !practice && graded.points > 0
      ? issueQuizAttestation(body.wallet as string, body.roundId, graded.score, graded.points, graded.results, process.env.NODE_ENV === "test")
      : null;
    return noStore({ ...graded, attestation }, 200, { "X-RateLimit-Remaining": String(limit.remaining) });
  } catch (error) {
    return noStore({ error: error instanceof Error ? error.message : "Quiz submission failed" }, 400);
  }
}
