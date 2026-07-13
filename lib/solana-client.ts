"use client";

import {
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
import type { MomentAttestation } from "@/types/pulse";

export interface BrowserWallet {
  publicKey: PublicKey | null;
  isPhantom?: boolean;
  connect(): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  signAndSendTransaction(transaction: Transaction): Promise<{ signature: string }>;
}

declare global {
  interface Window {
    solana?: BrowserWallet;
  }
}

const textEncoder = new TextEncoder();

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

export async function submitMomentClaim(wallet: BrowserWallet, attestation: MomentAttestation): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first");
  const owner = wallet.publicKey;
  const program = programId();
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed",
  );
  const fixtureSeed = u64(attestation.payload.fixtureId);
  const momentHash = Uint8Array.from(Buffer.from(attestation.payload.momentHash, "hex"));
  const evidenceHash = Uint8Array.from(Buffer.from(attestation.payload.evidenceHash, "hex"));
  const [config] = PublicKey.findProgramAddressSync([textEncoder.encode("config")], program);
  const [fanPass] = PublicKey.findProgramAddressSync(
    [textEncoder.encode("fan_pass"), owner.toBytes(), fixtureSeed],
    program,
  );
  const [receipt] = PublicKey.findProgramAddressSync(
    [textEncoder.encode("receipt"), owner.toBytes(), momentHash],
    program,
  );

  const transaction = new Transaction();
  const existingPass = await connection.getAccountInfo(fanPass, "confirmed");
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
    Ed25519Program.createInstructionWithPublicKey({
      publicKey: bs58.decode(attestation.attestorPublicKey),
      message: Buffer.from(attestation.messageBase64, "base64"),
      signature: Buffer.from(attestation.signatureBase64, "base64"),
    }),
    new TransactionInstruction({
      programId: program,
      keys: [
        { pubkey: config, isSigner: false, isWritable: false },
        { pubkey: fanPass, isSigner: false, isWritable: true },
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

  const latest = await connection.getLatestBlockhash("confirmed");
  transaction.feePayer = owner;
  transaction.recentBlockhash = latest.blockhash;
  const result = await wallet.signAndSendTransaction(transaction);
  await connection.confirmTransaction({ signature: result.signature, ...latest }, "confirmed");
  return result.signature;
}
