import { createHash } from "node:crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { signAttestorMessage } from "@/lib/attestation";
import { REWARD_KIND_CODE } from "@/lib/reward-catalog";
import type { QuizAttestation, RewardAttestation, RewardItem } from "@/types/pulse";

export function canonicalQuizMessage(payload: QuizAttestation["payload"]) {
  return new TextEncoder().encode([
    "PULSEPROOF_QUIZ_V1",
    payload.wallet,
    payload.quizHash,
    payload.score.toString(),
    payload.points.toString(),
    payload.expiresAt.toString(),
  ].join("|"));
}

export function issueQuizAttestation(
  wallet: string,
  roundId: string,
  score: number,
  points: number,
  results: QuizAttestation["results"],
  allowDemoKey = false,
): QuizAttestation {
  const payload = {
    wallet,
    quizHash: createHash("sha256").update(`${roundId}|${wallet}`).digest("hex"),
    score,
    points,
    expiresAt: Math.floor(Date.now() / 1000) + 5 * 60,
  };
  const message = canonicalQuizMessage(payload);
  return {
    payload,
    messageBase64: Buffer.from(message).toString("base64"),
    ...signAttestorMessage(message, allowDemoKey),
    results,
  };
}

export function canonicalRewardMessage(payload: RewardAttestation["payload"]) {
  return new TextEncoder().encode([
    "PULSEPROOF_REWARD_V1",
    payload.wallet,
    payload.rewardHash,
    payload.kind.toString(),
    payload.itemIndex.toString(),
    payload.cost.toString(),
    payload.expiresAt.toString(),
  ].join("|"));
}

export function issueRewardAttestation(wallet: string, reward: RewardItem, allowDemoKey = false): RewardAttestation {
  const payload = {
    wallet,
    rewardHash: createHash("sha256")
      .update(`${reward.id}|${reward.index}|${reward.kind}|${reward.price}`)
      .digest("hex"),
    kind: REWARD_KIND_CODE[reward.kind],
    itemIndex: reward.index,
    cost: reward.price,
    expiresAt: Math.floor(Date.now() / 1000) + 5 * 60,
  };
  const message = canonicalRewardMessage(payload);
  return {
    payload,
    messageBase64: Buffer.from(message).toString("base64"),
    ...signAttestorMessage(message, allowDemoKey),
    reward,
  };
}

export function verifyProgressionAttestation(attestation: QuizAttestation | RewardAttestation) {
  return nacl.sign.detached.verify(
    Buffer.from(attestation.messageBase64, "base64"),
    Buffer.from(attestation.signatureBase64, "base64"),
    bs58.decode(attestation.attestorPublicKey),
  );
}
