import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID ?? "74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn");
const AUTHORITY_PATH = process.env.ANCHOR_WALLET ?? ".local-wallets/phantom-test-wallet.json";
const TEST_POINTS = 1_000n;

const discriminator = (name: string) => createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
const u64 = (value: bigint) => {
  const output = Buffer.alloc(8);
  output.writeBigUInt64LE(value);
  return output;
};

async function main() {
  const ownerInput = process.env.TEST_WALLET;
  if (!ownerInput) throw new Error("TEST_WALLET is required; pass only the public devnet address");
  const owner = new PublicKey(ownerInput);
  const authorityBytes = JSON.parse(await readFile(AUTHORITY_PATH, "utf8")) as number[];
  const authority = Keypair.fromSecretKey(Uint8Array.from(authorityBytes));
  const connection = new Connection(RPC, "confirmed");
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const [profile] = PublicKey.findProgramAddressSync([Buffer.from("fan_profile"), owner.toBuffer()], PROGRAM_ID);
  const [epoch] = PublicKey.findProgramAddressSync([Buffer.from("fan_epoch"), owner.toBuffer()], PROGRAM_ID);
  const [alias] = PublicKey.findProgramAddressSync([Buffer.from("fan_alias"), owner.toBuffer()], PROGRAM_ID);
  assert(await connection.getAccountInfo(profile, "confirmed"), "target Fan Profile does not exist");

  const transaction = new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: profile, isSigner: false, isWritable: true },
      { pubkey: epoch, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("reset_devnet_test_profile"), owner.toBuffer(), u64(TEST_POINTS)]),
  }));

  const aliasExisted = Boolean(await connection.getAccountInfo(alias, "confirmed"));
  if (aliasExisted) {
    transaction.add(new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: config, isSigner: false, isWritable: false },
        { pubkey: alias, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      ],
      data: Buffer.concat([discriminator("close_devnet_test_alias"), owner.toBuffer()]),
    }));
  }

  const signature = await sendAndConfirmTransaction(connection, transaction, [authority], {
    commitment: "confirmed",
    maxRetries: 5,
  });
  const [profileInfo, epochInfo, aliasInfo] = await Promise.all([
    connection.getAccountInfo(profile, "confirmed"),
    connection.getAccountInfo(epoch, "confirmed"),
    connection.getAccountInfo(alias, "confirmed"),
  ]);
  assert(profileInfo && epochInfo, "reset accounts were not readable");
  const profileData = Buffer.from(profileInfo.data);
  const epochData = Buffer.from(epochInfo.data);
  const readU16 = (offset: number) => profileData.readUInt16LE(offset);
  assert.equal(profileData.readBigUInt64LE(40), TEST_POINTS);
  assert.equal(profileData.readBigUInt64LE(48), 0n);
  assert.equal(profileData.readUInt32LE(56), 0);
  assert.equal(profileData.readUInt32LE(60), 0);
  assert.equal(profileData.readBigInt64LE(68), -1n);
  assert.equal(profileData.subarray(76, 108).every((value) => value === 0), true);
  assert.deepEqual([readU16(108), readU16(110), readU16(112)], [65_535, 65_535, 65_535]);
  assert.equal(profileData.readUInt32LE(114), 0);
  assert.equal(aliasInfo, null);

  console.log(JSON.stringify({
    ok: true,
    network: "devnet",
    programId: PROGRAM_ID.toBase58(),
    owner: owner.toBase58(),
    profile: profile.toBase58(),
    epoch: Number(epochData.readBigUInt64LE(40)),
    availableTestPoints: Number(TEST_POINTS),
    aliasClosed: aliasExisted,
    immutableHistoryNotice: "Solana transaction history remains public and cannot be deleted; only current DApp state and receipt epoch were reset.",
    signature,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
