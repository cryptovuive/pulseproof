import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://solana-devnet.api.onfinality.io/public";
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID ?? "74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn");
const FIXTURE_ID = Number(process.env.TXLINE_FIXTURE_ID ?? 18143850);
const REWARD = { id: "quiz-spark", index: 13, kind: "badge", kindCode: 0, cost: 60 } as const;
const sha256 = (value: string) => createHash("sha256").update(value).digest();
const discriminator = (name: string) => sha256(`global:${name}`).subarray(0, 8);
const u64 = (value: number | bigint) => { const output = Buffer.alloc(8); output.writeBigUInt64LE(BigInt(value)); return output; };
const i64 = (value: number | bigint) => { const output = Buffer.alloc(8); output.writeBigInt64LE(BigInt(value)); return output; };
const u32 = (value: number) => { const output = Buffer.alloc(4); output.writeUInt32LE(value); return output; };
const u16 = (value: number) => { const output = Buffer.alloc(2); output.writeUInt16LE(value); return output; };

type ProfileSnapshot = {
  pointsEarned: bigint;
  pointsSpent: bigint;
  checkins: number;
  quizClaims: number;
  lastCheckinDay: bigint;
  ownsQuizSpark: boolean;
  equippedBadge: number;
};

function parseProfile(data: Buffer): ProfileSnapshot {
  assert(data.length >= 119, "fan profile account has an unexpected layout");
  const firstWord = data.readBigUInt64LE(76);
  return {
    pointsEarned: data.readBigUInt64LE(40),
    pointsSpent: data.readBigUInt64LE(48),
    checkins: data.readUInt32LE(56),
    quizClaims: data.readUInt32LE(60),
    lastCheckinDay: data.readBigInt64LE(68),
    ownsQuizSpark: (firstWord & (1n << BigInt(REWARD.index))) !== 0n,
    equippedBadge: data.readUInt16LE(108),
  };
}

async function main() {
  const walletBytes = JSON.parse(await readFile(process.env.ANCHOR_WALLET ?? ".local-wallets/phantom-test-wallet.json", "utf8")) as number[];
  const payer = Keypair.fromSecretKey(Uint8Array.from(walletBytes));
  const attestorSecret = bs58.decode((await readFile(process.env.ATTESTOR_SECRET_FILE ?? ".local-wallets/attestor-secret", "utf8")).trim());
  assert.equal(attestorSecret.length, 64, "attestor secret must be 64 bytes");
  const attestor = nacl.sign.keyPair.fromSecretKey(attestorSecret);
  const connection = new Connection(RPC, "confirmed");
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const configData = (await connection.getAccountInfo(config, "confirmed"))?.data;
  assert(configData, "config account is missing");
  assert.deepEqual(configData.subarray(40, 72), Buffer.from(attestor.publicKey), "on-chain attestor mismatch");

  const [fanProfile] = PublicKey.findProgramAddressSync([Buffer.from("fan_profile"), payer.publicKey.toBuffer()], PROGRAM_ID);
  const [fanEpoch] = PublicKey.findProgramAddressSync([Buffer.from("fan_epoch"), payer.publicKey.toBuffer()], PROGRAM_ID);
  let profileData = (await connection.getAccountInfo(fanProfile, "confirmed"))?.data;
  let createProfileSignature: string | undefined;
  if (!profileData) {
    const createProfile = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: fanProfile, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: discriminator("create_fan_profile"),
    });
    createProfileSignature = await sendAndConfirmTransaction(connection, new Transaction().add(createProfile), [payer]);
    profileData = (await connection.getAccountInfo(fanProfile, "confirmed"))?.data;
  }
  assert(profileData, "fan profile was not created");
  const before = parseProfile(profileData);
  const fanEpochData = (await connection.getAccountInfo(fanEpoch, "confirmed"))?.data;
  const epoch = fanEpochData ? fanEpochData.readBigUInt64LE(40) : 0n;

  const checkIn = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: fanProfile, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    data: discriminator("daily_check_in"),
  });
  const currentUtcDay = BigInt(Math.floor(Date.now() / 86_400_000));
  let checkInSignature: string | undefined;
  if (before.lastCheckinDay !== currentUtcDay) {
    checkInSignature = await sendAndConfirmTransaction(connection, new Transaction().add(checkIn), [payer]);
  }
  let duplicateCheckInRejected = false;
  try { await sendAndConfirmTransaction(connection, new Transaction().add(checkIn), [payer]); } catch { duplicateCheckInRejected = true; }
  assert(duplicateCheckInRejected, "second check-in in one UTC day must fail");

  const fixtureBytes = u64(FIXTURE_ID);
  const [fanPass] = PublicKey.findProgramAddressSync([Buffer.from("fan_pass"), payer.publicKey.toBuffer(), fixtureBytes], PROGRAM_ID);
  let createPassSignature: string | undefined;
  if (!(await connection.getAccountInfo(fanPass, "confirmed"))) {
    const createPass = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: config, isSigner: false, isWritable: false },
        { pubkey: fanPass, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([discriminator("create_match_pass"), fixtureBytes]),
    });
    createPassSignature = await sendAndConfirmTransaction(connection, new Transaction().add(createPass), [payer]);
  }

  const momentHash = sha256(`txline-devnet-${FIXTURE_ID}-${Date.now()}`);
  const evidenceHash = sha256("txline-subscription:54TvjbxjP41cBP4BebWWyoJNWex6evuwapHcYb9hWziErFkvpfFPgTkU9bc2K9iGUnXojEWiNHS1wUTiktiMXgbC");
  const momentPoints = 5;
  const badge = 0;
  const momentExpiresAt = Math.floor(Date.now() / 1000) + 300;
  const momentMessage = Buffer.from([
    "PULSEPROOF_V1", payer.publicKey.toBase58(), String(FIXTURE_ID), momentHash.toString("hex"),
    evidenceHash.toString("hex"), String(momentPoints), String(badge), String(momentExpiresAt),
  ].join("|"));
  const momentSignature = nacl.sign.detached(momentMessage, attestor.secretKey);
  const [receipt] = PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), payer.publicKey.toBuffer(), u64(epoch), momentHash],
    PROGRAM_ID,
  );
  const momentEd25519 = Ed25519Program.createInstructionWithPublicKey({ publicKey: attestor.publicKey, message: momentMessage, signature: momentSignature });
  const claimMoment = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: fanPass, isSigner: false, isWritable: true },
      { pubkey: fanProfile, isSigner: false, isWritable: true },
      { pubkey: fanEpoch, isSigner: false, isWritable: true },
      { pubkey: receipt, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("claim_moment"), momentHash, evidenceHash, u32(momentPoints), Buffer.from([badge]), i64(momentExpiresAt)]),
  });
  const claimSignature = await sendAndConfirmTransaction(connection, new Transaction().add(momentEd25519, claimMoment), [payer]);
  assert(await connection.getAccountInfo(receipt, "confirmed"), "moment receipt was not created");

  const quizHash = sha256(`world-cup-e2e-${payer.publicKey}-${Date.now()}`);
  const quizScore = 5;
  const quizPoints = 70;
  const quizExpiresAt = Math.floor(Date.now() / 1000) + 300;
  const quizMessage = Buffer.from([
    "PULSEPROOF_QUIZ_V1", payer.publicKey.toBase58(), quizHash.toString("hex"),
    String(quizScore), String(quizPoints), String(quizExpiresAt),
  ].join("|"));
  const quizSignature = nacl.sign.detached(quizMessage, attestor.secretKey);
  const [quizReceipt] = PublicKey.findProgramAddressSync(
    [Buffer.from("quiz_receipt"), payer.publicKey.toBuffer(), u64(epoch), quizHash],
    PROGRAM_ID,
  );
  const quizEd25519 = Ed25519Program.createInstructionWithPublicKey({ publicKey: attestor.publicKey, message: quizMessage, signature: quizSignature });
  const claimQuiz = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: fanProfile, isSigner: false, isWritable: true },
      { pubkey: fanEpoch, isSigner: false, isWritable: true },
      { pubkey: quizReceipt, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("claim_quiz"), quizHash, Buffer.from([quizScore]), u32(quizPoints), i64(quizExpiresAt)]),
  });
  const quizClaimSignature = await sendAndConfirmTransaction(connection, new Transaction().add(quizEd25519, claimQuiz), [payer]);
  assert(await connection.getAccountInfo(quizReceipt, "confirmed"), "quiz receipt was not created");
  let duplicateQuizRejected = false;
  try { await sendAndConfirmTransaction(connection, new Transaction().add(quizEd25519, claimQuiz), [payer]); } catch { duplicateQuizRejected = true; }
  assert(duplicateQuizRejected, "duplicate quiz claim must be rejected");

  let rewardRedeemSignature: string | undefined;
  const afterQuizData = (await connection.getAccountInfo(fanProfile, "confirmed"))?.data;
  assert(afterQuizData, "fan profile disappeared after quiz claim");
  if (!parseProfile(afterQuizData).ownsQuizSpark) {
    const rewardHash = sha256(`${REWARD.id}|${REWARD.index}|${REWARD.kind}|${REWARD.cost}`);
    const rewardExpiresAt = Math.floor(Date.now() / 1000) + 300;
    const rewardMessage = Buffer.from([
      "PULSEPROOF_REWARD_V1", payer.publicKey.toBase58(), rewardHash.toString("hex"),
      String(REWARD.kindCode), String(REWARD.index), String(REWARD.cost), String(rewardExpiresAt),
    ].join("|"));
    const rewardSignature = nacl.sign.detached(rewardMessage, attestor.secretKey);
    const [rewardReceipt] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_receipt"), payer.publicKey.toBuffer(), u64(epoch), rewardHash],
      PROGRAM_ID,
    );
    const rewardEd25519 = Ed25519Program.createInstructionWithPublicKey({ publicKey: attestor.publicKey, message: rewardMessage, signature: rewardSignature });
    const redeem = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: config, isSigner: false, isWritable: false },
        { pubkey: fanProfile, isSigner: false, isWritable: true },
        { pubkey: fanEpoch, isSigner: false, isWritable: true },
        { pubkey: rewardReceipt, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([discriminator("redeem_reward"), rewardHash, Buffer.from([REWARD.kindCode]), u16(REWARD.index), u64(REWARD.cost), i64(rewardExpiresAt)]),
    });
    rewardRedeemSignature = await sendAndConfirmTransaction(connection, new Transaction().add(rewardEd25519, redeem), [payer]);
    assert(await connection.getAccountInfo(rewardReceipt, "confirmed"), "reward receipt was not created");
  }

  const equip = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: fanProfile, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([discriminator("equip_reward"), Buffer.from([REWARD.kindCode]), u16(REWARD.index)]),
  });
  const equipSignature = await sendAndConfirmTransaction(connection, new Transaction().add(equip), [payer]);

  const wrongKindEquip = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: fanProfile, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([discriminator("equip_reward"), Buffer.from([3]), u16(REWARD.index)]),
  });
  let wrongKindRejected = false;
  try { await sendAndConfirmTransaction(connection, new Transaction().add(wrongKindEquip), [payer]); } catch { wrongKindRejected = true; }
  assert(wrongKindRejected, "a badge must not be equippable as a character");

  const finalData = (await connection.getAccountInfo(fanProfile, "confirmed"))?.data;
  assert(finalData, "final fan profile is missing");
  const finalProfile = parseProfile(finalData);
  assert(finalProfile.pointsEarned >= before.pointsEarned + BigInt(momentPoints + quizPoints), "earned points did not include signed claims");
  assert(finalProfile.quizClaims >= before.quizClaims + 1, "quiz claim counter did not increment");
  assert(finalProfile.ownsQuizSpark, "redeemed badge is absent from inventory");
  assert.equal(finalProfile.equippedBadge, REWARD.index, "redeemed badge was not equipped");

  console.log(JSON.stringify({
    ok: true,
    network: "devnet",
    programId: PROGRAM_ID.toBase58(),
    wallet: payer.publicKey.toBase58(),
    config: config.toBase58(),
    fanProfile: fanProfile.toBase58(),
    fanEpoch: fanEpoch.toBase58(),
    epoch: Number(epoch),
    fixtureId: FIXTURE_ID,
    fanPass: fanPass.toBase58(),
    receipt: receipt.toBase58(),
    quizReceipt: quizReceipt.toBase58(),
    signatures: {
      createProfile: createProfileSignature,
      checkIn: checkInSignature,
      createPass: createPassSignature,
      momentClaim: claimSignature,
      quizClaim: quizClaimSignature,
      rewardRedeem: rewardRedeemSignature,
      equipReward: equipSignature,
    },
    finalProfile: {
      pointsEarned: Number(finalProfile.pointsEarned),
      pointsSpent: Number(finalProfile.pointsSpent),
      checkins: finalProfile.checkins,
      quizClaims: finalProfile.quizClaims,
      ownsQuizSpark: finalProfile.ownsQuizSpark,
      equippedBadge: finalProfile.equippedBadge,
    },
    assertions: [
      "attestor pinned",
      "fan profile PDA created",
      "one check-in per UTC day",
      "TxLINE moment signed and claimed",
      "quiz Ed25519 claim accepted",
      "quiz replay rejected",
      "catalog reward redeemed",
      "reward equipped",
      "kind confusion rejected",
    ],
  }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
