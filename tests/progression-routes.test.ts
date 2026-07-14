import { NextRequest } from "next/server";
import { Keypair } from "@solana/web3.js";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as getQuiz, POST as postQuiz } from "@/app/api/quiz/route";
import { POST as postReward } from "@/app/api/rewards/attest/route";
import { getDailyQuizQuestions } from "@/lib/quiz-bank";
import { resetAttestationLimitsForTests } from "@/lib/rate-limit";
import { verifyProgressionAttestation } from "@/lib/progression-attestation";
import type { QuizAttestation, QuizRound, RewardAttestation } from "@/types/pulse";

describe("progression APIs", () => {
  beforeEach(() => resetAttestationLimitsForTests());

  it("serves a no-answer daily round then signs the graded wallet-bound claim", async () => {
    const roundResponse = await getQuiz();
    const round = await roundResponse.json() as QuizRound;
    const wallet = Keypair.generate().publicKey.toBase58();
    const privateQuestions = getDailyQuizQuestions(round.validForUtcDay);
    const response = await postQuiz(new NextRequest("http://localhost/api/quiz", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "quiz-route-test" },
      body: JSON.stringify({ wallet, roundId: round.roundId, answers: privateQuestions.map((question) => question.correctIndex) }),
    }));
    expect(response.status).toBe(200);
    const body = await response.json() as { score: number; points: number; attestation: QuizAttestation };
    expect(body.score).toBe(5);
    expect(body.points).toBe(70);
    expect(body.attestation.payload.wallet).toBe(wallet);
    expect(body.attestation.payload.quizHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyProgressionAttestation(body.attestation)).toBe(true);
  });

  it("signs only catalog-defined reward cost, kind and index", async () => {
    const wallet = Keypair.generate().publicKey.toBase58();
    const response = await postReward(new NextRequest("http://localhost/api/rewards/attest", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "reward-route-test" },
      body: JSON.stringify({ wallet, rewardId: "spoiler-warden" }),
    }));
    expect(response.status).toBe(200);
    const attestation = await response.json() as RewardAttestation;
    expect(attestation.payload).toMatchObject({ wallet, kind: 0, itemIndex: 10, cost: 240 });
    expect(attestation.payload.rewardHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyProgressionAttestation(attestation)).toBe(true);
  });

  it("rejects unknown reward IDs", async () => {
    const wallet = Keypair.generate().publicKey.toBase58();
    const response = await postReward(new NextRequest("http://localhost/api/rewards/attest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet, rewardId: "not-real" }),
    }));
    expect(response.status).toBe(404);
  });

  it("does not attest any retired shirt reward", async () => {
    const wallet = Keypair.generate().publicKey.toBase58();
    for (const rewardId of [
      "shirt-pele-1970",
      "shirt-maradona-1986",
      "shirt-zidane-1998",
      "shirt-ronaldo-2002",
      "shirt-iniesta-2010",
      "shirt-messi-2022",
    ]) {
      const response = await postReward(new NextRequest("http://localhost/api/rewards/attest", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `retired-${rewardId}` },
        body: JSON.stringify({ wallet, rewardId }),
      }));
      expect(response.status, rewardId).toBe(404);
    }
  });
});
