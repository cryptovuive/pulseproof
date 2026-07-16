import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID ?? "74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn");
const WALLET_PATH = process.env.ANCHOR_WALLET ?? ".local-wallets/phantom-test-wallet.json";
const RETIRED_INDEX = 36;
const INVALID_REWARD_INDEX_ERROR = 6016;

const discriminator = (name: string) => createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
const u16 = (value: number) => {
  const output = Buffer.alloc(2);
  output.writeUInt16LE(value);
  return output;
};

async function main() {
  const walletBytes = JSON.parse(await readFile(WALLET_PATH, "utf8")) as number[];
  const payer = Keypair.fromSecretKey(Uint8Array.from(walletBytes));
  const connection = new Connection(RPC, "confirmed");
  const [fanProfile] = PublicKey.findProgramAddressSync(
    [Buffer.from("fan_profile"), payer.publicKey.toBuffer()],
    PROGRAM_ID,
  );
  assert(await connection.getAccountInfo(fanProfile, "confirmed"), "fan profile is required for the rejection probe");

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: fanProfile, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([discriminator("equip_reward"), Buffer.from([0]), u16(RETIRED_INDEX)]),
  });
  const latest = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({ feePayer: payer.publicKey, recentBlockhash: latest.blockhash }).add(instruction);
  transaction.sign(payer);
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    maxRetries: 5,
    skipPreflight: true,
  });
  // Some Solana RPC providers return a confirmation value for failed transactions,
  // while others reject the confirmation promise with the on-chain error. The
  // transaction metadata below is the canonical assertion in both cases.
  let confirmationThrew = false;
  try {
    await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  } catch {
    confirmationThrew = true;
  }

  let transactionDetails = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  for (let attempt = 0; !transactionDetails && attempt < 5; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    transactionDetails = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
  }
  assert(transactionDetails?.meta, "confirmed rejection transaction was not readable");
  assert(
    JSON.stringify(transactionDetails.meta.err).includes(`"Custom":${INVALID_REWARD_INDEX_ERROR}`),
    `expected custom error ${INVALID_REWARD_INDEX_ERROR}`,
  );
  assert(
    transactionDetails.meta.logMessages?.some((message) => message.includes("InvalidRewardIndex")),
    "program logs did not name InvalidRewardIndex",
  );

  console.log(JSON.stringify({
    ok: true,
    network: "devnet",
    programId: PROGRAM_ID.toBase58(),
    wallet: payer.publicKey.toBase58(),
    fanProfile: fanProfile.toBase58(),
    retiredIndex: RETIRED_INDEX,
    customError: INVALID_REWARD_INDEX_ERROR,
    confirmationThrew,
    signature,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
