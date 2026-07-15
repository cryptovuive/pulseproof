"use client";

import {
  ComputeBudgetProgram,
  Connection,
  Ed25519Program,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { Buffer } from "buffer";
import type { FanAlias, FanProfile, MomentAttestation, QuizAttestation, RewardAttestation } from "@/types/pulse";
import { decodeFanAlias, fanAliasAddress } from "@/lib/fan-alias";

export interface BrowserWallet {
  publicKey: PublicKey | null;
  isPhantom?: boolean;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  on?(event: "connect" | "disconnect" | "accountChanged", listener: (publicKey?: PublicKey | null) => void): void;
  off?(event: "connect" | "disconnect" | "accountChanged", listener: (publicKey?: PublicKey | null) => void): void;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  signAndSendTransaction(
    transaction: Transaction,
    options?: { preflightCommitment?: "processed" | "confirmed" | "finalized"; maxRetries?: number },
  ): Promise<{ signature: string }>;
}

declare global {
  interface Window {
    solana?: BrowserWallet;
  }
}

const textEncoder = new TextEncoder();
const COMPUTE_UNIT_LIMIT = 400_000;
const PRIORITY_FEE_MICRO_LAMPORTS = 10_000;

async function discriminator(name: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(`global:${name}`));
  return new Uint8Array(digest).slice(0, 8);
}

function u64(value: number | bigint): Uint8Array {
  const output = new Uint8Array(8);
  new DataView(output.buffer).setBigUint64(0, BigInt(value), true);
  return output;
}

function i64(value: number | bigint): Uint8Array {
  const output = new Uint8Array(8);
  new DataView(output.buffer).setBigInt64(0, BigInt(value), true);
  return output;
}

function u32(value: number): Uint8Array {
  const output = new Uint8Array(4);
  new DataView(output.buffer).setUint32(0, value, true);
  return output;
}

function u16(value: number): Uint8Array {
  const output = new Uint8Array(2);
  new DataView(output.buffer).setUint16(0, value, true);
  return output;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(arrays.reduce((length, array) => length + array.length, 0));
  let offset = 0;
  for (const array of arrays) {
    output.set(array, offset);
    offset += array.length;
  }
  return output;
}

function programId(): PublicKey {
  const configured = process.env.NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID;
  if (!configured) throw new Error("NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID is not configured");
  return new PublicKey(configured);
}

function connection() {
  return new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed",
  );
}

function profileAddress(owner: PublicKey, program = programId()) {
  return PublicKey.findProgramAddressSync([textEncoder.encode("fan_profile"), owner.toBytes()], program)[0];
}

function fanEpochAddress(owner: PublicKey, program = programId()) {
  return PublicKey.findProgramAddressSync([textEncoder.encode("fan_epoch"), owner.toBytes()], program)[0];
}

async function fanEpochValue(rpc: Connection, address: PublicKey) {
  const account = await rpc.getAccountInfo(address, "confirmed");
  if (!account) return 0n;
  const data = Buffer.from(account.data);
  if (data.length < 49) throw new Error("Fan epoch account has an unexpected layout");
  return data.readBigUInt64LE(40);
}

async function createProfileInstruction(owner: PublicKey, profile: PublicKey, program: PublicKey) {
  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: profile, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(await discriminator("create_fan_profile")),
  });
}

async function signAndConfirm(wallet: BrowserWallet, transaction: Transaction, rpc = connection()) {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first");
  // Fetching a processed blockhash and running preflight at processed avoids
  // waiting an extra confirmation round before Phantom can submit. We still
  // resolve the action only after the network reports a confirmed result.
  const latest = await rpc.getLatestBlockhash("processed");
  transaction.instructions.unshift(
    ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNIT_LIMIT }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICRO_LAMPORTS }),
  );
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = latest.blockhash;
  const result = await wallet.signAndSendTransaction(transaction, {
    preflightCommitment: "processed",
    maxRetries: 5,
  });
  const confirmation = await rpc.confirmTransaction({ signature: result.signature, ...latest }, "confirmed");
  if (confirmation.value.err) {
    throw new Error(`Solana transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }
  return result.signature;
}

function signedProofInstruction(attestation: Pick<MomentAttestation, "attestorPublicKey" | "messageBase64" | "signatureBase64">) {
  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: bs58.decode(attestation.attestorPublicKey),
    message: Buffer.from(attestation.messageBase64, "base64"),
    signature: Buffer.from(attestation.signatureBase64, "base64"),
  });
}

export async function fetchFanProfile(ownerInput: string | PublicKey): Promise<FanProfile | null> {
  const owner = typeof ownerInput === "string" ? new PublicKey(ownerInput) : ownerInput;
  const address = profileAddress(owner);
  const account = await connection().getAccountInfo(address, "confirmed");
  if (!account) return null;
  const data = Buffer.from(account.data);
  if (data.length < 119) throw new Error("Fan profile account has an unexpected layout");
  const readU64 = (offset: number) => Number(data.readBigUInt64LE(offset));
  const readU32 = (offset: number) => data.readUInt32LE(offset);
  const readU16 = (offset: number) => data.readUInt16LE(offset);
  const equipped = (offset: number) => {
    const value = readU16(offset);
    return value === 65_535 ? null : value;
  };
  const pointsEarned = readU64(40);
  const pointsSpent = readU64(48);
  return {
    address: address.toBase58(),
    owner: new PublicKey(data.subarray(8, 40)).toBase58(),
    pointsEarned,
    pointsSpent,
    availablePoints: Math.max(0, pointsEarned - pointsSpent),
    checkins: readU32(56),
    quizClaims: readU32(60),
    currentStreak: readU16(64),
    bestStreak: readU16(66),
    lastCheckinDay: Number(data.readBigInt64LE(68)),
    inventory: [0, 1, 2, 3].flatMap((word) => {
      const bits = data.readBigUInt64LE(76 + word * 8);
      return Array.from({ length: 64 }, (_, bit) => word * 64 + bit).filter((_, bit) => (bits & (1n << BigInt(bit))) !== 0n);
    }),
    equippedBadge: equipped(108),
    equippedFrame: equipped(110),
    equippedCharacter: equipped(112),
    claims: readU32(114),
  };
}

export async function fetchFanAlias(ownerInput: string | PublicKey): Promise<FanAlias | null> {
  const owner = typeof ownerInput === "string" ? new PublicKey(ownerInput) : ownerInput;
  const address = fanAliasAddress(owner, programId());
  const account = await connection().getAccountInfo(address, "confirmed");
  if (!account) return null;
  return decodeFanAlias(account.data, address);
}

export async function submitFanAlias(wallet: BrowserWallet, displayName: string) {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first");
  const owner = wallet.publicKey;
  const program = programId();
  const alias = fanAliasAddress(owner, program);
  const name = textEncoder.encode(displayName);
  const transaction = new Transaction().add(new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: alias, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(concat(await discriminator("set_fan_alias"), u32(name.length), name)),
  }));
  return signAndConfirm(wallet, transaction);
}

export async function submitDailyCheckIn(wallet: BrowserWallet) {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first");
  const owner = wallet.publicKey;
  const program = programId();
  const rpc = connection();
  const profile = profileAddress(owner, program);
  const transaction = new Transaction();
  if (!(await rpc.getAccountInfo(profile, "confirmed"))) {
    transaction.add(await createProfileInstruction(owner, profile, program));
  }
  transaction.add(new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: profile, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(await discriminator("daily_check_in")),
  }));
  return signAndConfirm(wallet, transaction, rpc);
}

export async function submitMomentClaim(wallet: BrowserWallet, attestation: MomentAttestation): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first");
  const owner = wallet.publicKey;
  const program = programId();
  const rpc = connection();
  const fixtureSeed = u64(attestation.payload.fixtureId);
  const momentHash = Uint8Array.from(Buffer.from(attestation.payload.momentHash, "hex"));
  const evidenceHash = Uint8Array.from(Buffer.from(attestation.payload.evidenceHash, "hex"));
  const [config] = PublicKey.findProgramAddressSync([textEncoder.encode("config")], program);
  const [fanPass] = PublicKey.findProgramAddressSync(
    [textEncoder.encode("fan_pass"), owner.toBytes(), fixtureSeed],
    program,
  );
  const fanProfile = profileAddress(owner, program);
  const fanEpoch = fanEpochAddress(owner, program);
  const epoch = await fanEpochValue(rpc, fanEpoch);
  const [receipt] = PublicKey.findProgramAddressSync(
    [textEncoder.encode("receipt"), owner.toBytes(), u64(epoch), momentHash],
    program,
  );

  const transaction = new Transaction();
  if (!(await rpc.getAccountInfo(fanProfile, "confirmed"))) {
    transaction.add(await createProfileInstruction(owner, fanProfile, program));
  }
  const existingPass = await rpc.getAccountInfo(fanPass, "confirmed");
  if (!existingPass) {
    transaction.add(
      new TransactionInstruction({
        programId: program,
        keys: [
          { pubkey: config, isSigner: false, isWritable: false },
          { pubkey: fanPass, isSigner: false, isWritable: true },
          { pubkey: owner, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(concat(await discriminator("create_match_pass"), fixtureSeed)),
      }),
    );
  }

  transaction.add(
    signedProofInstruction(attestation),
    new TransactionInstruction({
      programId: program,
      keys: [
          { pubkey: config, isSigner: false, isWritable: false },
          { pubkey: fanPass, isSigner: false, isWritable: true },
          { pubkey: fanProfile, isSigner: false, isWritable: true },
          { pubkey: fanEpoch, isSigner: false, isWritable: true },
          { pubkey: receipt, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(
        concat(
          await discriminator("claim_moment"),
          momentHash,
          evidenceHash,
          u32(attestation.payload.points),
          Uint8Array.of(attestation.payload.badge),
          i64(attestation.payload.expiresAt),
        ),
      ),
    }),
  );
  return signAndConfirm(wallet, transaction, rpc);
}

export async function submitQuizClaim(wallet: BrowserWallet, attestation: QuizAttestation) {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first");
  const owner = wallet.publicKey;
  const program = programId();
  const rpc = connection();
  const profile = profileAddress(owner, program);
  const fanEpoch = fanEpochAddress(owner, program);
  const epoch = await fanEpochValue(rpc, fanEpoch);
  const quizHash = Uint8Array.from(Buffer.from(attestation.payload.quizHash, "hex"));
  const [config] = PublicKey.findProgramAddressSync([textEncoder.encode("config")], program);
  const [receipt] = PublicKey.findProgramAddressSync(
    [textEncoder.encode("quiz_receipt"), owner.toBytes(), u64(epoch), quizHash],
    program,
  );
  const transaction = new Transaction();
  if (!(await rpc.getAccountInfo(profile, "confirmed"))) {
    transaction.add(await createProfileInstruction(owner, profile, program));
  }
  transaction.add(
    signedProofInstruction(attestation),
    new TransactionInstruction({
      programId: program,
      keys: [
        { pubkey: config, isSigner: false, isWritable: false },
        { pubkey: profile, isSigner: false, isWritable: true },
        { pubkey: fanEpoch, isSigner: false, isWritable: true },
        { pubkey: receipt, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(concat(
        await discriminator("claim_quiz"),
        quizHash,
        Uint8Array.of(attestation.payload.score),
        u32(attestation.payload.points),
        i64(attestation.payload.expiresAt),
      )),
    }),
  );
  return signAndConfirm(wallet, transaction, rpc);
}

export async function submitRewardRedemption(wallet: BrowserWallet, attestation: RewardAttestation) {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first");
  const owner = wallet.publicKey;
  const program = programId();
  const rpc = connection();
  const profile = profileAddress(owner, program);
  const fanEpoch = fanEpochAddress(owner, program);
  const epoch = await fanEpochValue(rpc, fanEpoch);
  const rewardHash = Uint8Array.from(Buffer.from(attestation.payload.rewardHash, "hex"));
  const [config] = PublicKey.findProgramAddressSync([textEncoder.encode("config")], program);
  const [receipt] = PublicKey.findProgramAddressSync(
    [textEncoder.encode("reward_receipt"), owner.toBytes(), u64(epoch), rewardHash],
    program,
  );
  const transaction = new Transaction();
  if (!(await rpc.getAccountInfo(profile, "confirmed"))) {
    transaction.add(await createProfileInstruction(owner, profile, program));
  }
  transaction.add(
    signedProofInstruction(attestation),
    new TransactionInstruction({
      programId: program,
      keys: [
        { pubkey: config, isSigner: false, isWritable: false },
        { pubkey: profile, isSigner: false, isWritable: true },
        { pubkey: fanEpoch, isSigner: false, isWritable: true },
        { pubkey: receipt, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(concat(
        await discriminator("redeem_reward"),
        rewardHash,
        Uint8Array.of(attestation.payload.kind),
        u16(attestation.payload.itemIndex),
        u64(attestation.payload.cost),
        i64(attestation.payload.expiresAt),
      )),
    }),
  );
  return signAndConfirm(wallet, transaction, rpc);
}

export async function submitEquipReward(wallet: BrowserWallet, kind: number, itemIndex: number) {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first");
  const owner = wallet.publicKey;
  const program = programId();
  const profile = profileAddress(owner, program);
  const transaction = new Transaction().add(new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: profile, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(concat(await discriminator("equip_reward"), Uint8Array.of(kind), u16(itemIndex))),
  }));
  return signAndConfirm(wallet, transaction);
}
