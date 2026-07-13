import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

function expandHome(path: string) {
  return path.startsWith("~/") ? resolve(homedir(), path.slice(2)) : resolve(path);
}

async function main() {
  const walletPath = process.env.ANCHOR_WALLET;
  const attestorSecret = process.env.ATTESTOR_SECRET_KEY;
  const programIdValue = process.env.NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID;
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  if (!walletPath) throw new Error("ANCHOR_WALLET is required");
  if (!attestorSecret) throw new Error("ATTESTOR_SECRET_KEY is required");
  if (!programIdValue) throw new Error("NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID is required");

  const walletBytes = JSON.parse(await readFile(expandHome(walletPath), "utf8")) as number[];
  const payer = Keypair.fromSecretKey(Uint8Array.from(walletBytes));
  const attestorBytes = bs58.decode(attestorSecret);
  if (attestorBytes.length !== 64) throw new Error("ATTESTOR_SECRET_KEY must decode to 64 bytes");
  const attestorPublicKey = attestorBytes.slice(32);
  const programId = new PublicKey(programIdValue);
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
  const discriminator = createHash("sha256").update("global:initialize_config").digest().subarray(0, 8);
  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator, attestorPublicKey]),
  });
  const signature = await sendAndConfirmTransaction(new Connection(rpcUrl, "confirmed"), new Transaction().add(instruction), [payer]);
  console.log(JSON.stringify({ config: config.toBase58(), attestorPublicKey: bs58.encode(attestorPublicKey), signature }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
