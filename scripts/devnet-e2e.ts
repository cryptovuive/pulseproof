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
const sha256 = (value: string) => createHash("sha256").update(value).digest();
const discriminator = (name: string) => sha256(`global:${name}`).subarray(0, 8);
const u64 = (value: number | bigint) => { const output = Buffer.alloc(8); output.writeBigUInt64LE(BigInt(value)); return output; };
const i64 = (value: number | bigint) => { const output = Buffer.alloc(8); output.writeBigInt64LE(BigInt(value)); return output; };
const u32 = (value: number) => { const output = Buffer.alloc(4); output.writeUInt32LE(value); return output; };

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
  const evidenceHash = sha256(`txline-subscription:54TvjbxjP41cBP4BebWWyoJNWex6evuwapHcYb9hWziErFkvpfFPgTkU9bc2K9iGUnXojEWiNHS1wUTiktiMXgbC`);
  const points = 5;
  const badge = 0;
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  const message = Buffer.from([
    "PULSEPROOF_V1", payer.publicKey.toBase58(), String(FIXTURE_ID), momentHash.toString("hex"),
    evidenceHash.toString("hex"), String(points), String(badge), String(expiresAt),
  ].join("|"));
  const signature = nacl.sign.detached(message, attestor.secretKey);
  const [receipt] = PublicKey.findProgramAddressSync([Buffer.from("receipt"), payer.publicKey.toBuffer(), momentHash], PROGRAM_ID);
  const ed25519 = Ed25519Program.createInstructionWithPublicKey({ publicKey: attestor.publicKey, message, signature });
  const claim = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: fanPass, isSigner: false, isWritable: true },
      { pubkey: receipt, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("claim_moment"), momentHash, evidenceHash, u32(points), Buffer.from([badge]), i64(expiresAt)]),
  });
  const claimSignature = await sendAndConfirmTransaction(connection, new Transaction().add(ed25519, claim), [payer]);
  assert(await connection.getAccountInfo(receipt, "confirmed"), "claim receipt was not created");

  let duplicateRejected = false;
  try { await sendAndConfirmTransaction(connection, new Transaction().add(ed25519, claim), [payer]); } catch { duplicateRejected = true; }
  assert(duplicateRejected, "duplicate claim must be rejected");
  console.log(JSON.stringify({
    ok: true,
    network: "devnet",
    programId: PROGRAM_ID.toBase58(),
    config: config.toBase58(),
    fixtureId: FIXTURE_ID,
    fanPass: fanPass.toBase58(),
    receipt: receipt.toBase58(),
    createPassSignature,
    claimSignature,
    assertions: ["attestor pinned", "Fan Pass exists", "Ed25519 claim accepted", "receipt created", "duplicate rejected"],
  }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
