import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://solana-devnet.api.onfinality.io/public";
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID ?? "74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn");
const discriminator = (name: string) => createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);

function aliasInstruction(owner: PublicKey, alias: PublicKey, name: string) {
  const bytes = Buffer.from(name, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32LE(bytes.length);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: alias, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("set_fan_alias"), length, bytes]),
  });
}

async function main() {
  const walletBytes = JSON.parse(await readFile(process.env.ANCHOR_WALLET ?? ".local-wallets/phantom-test-wallet.json", "utf8")) as number[];
  const payer = Keypair.fromSecretKey(Uint8Array.from(walletBytes));
  const connection = new Connection(RPC, "confirmed");
  const [alias] = PublicKey.findProgramAddressSync([Buffer.from("fan_alias"), payer.publicKey.toBuffer()], PROGRAM_ID);

  const createOrUpdateSignature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(aliasInstruction(payer.publicKey, alias, "PulseProof QA")),
    [payer],
    { commitment: "confirmed" },
  );
  const secondUpdateSignature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(aliasInstruction(payer.publicKey, alias, "Cryptovuive")),
    [payer],
    { commitment: "confirmed" },
  );

  const account = await connection.getAccountInfo(alias, "confirmed");
  assert(account, "fan alias PDA was not created");
  assert(account.owner.equals(PROGRAM_ID), "fan alias owner is not PulseProof");
  const length = account.data.readUInt32LE(40);
  assert.equal(account.data.subarray(44, 44 + length).toString("utf8"), "Cryptovuive", "fan alias update was not persisted");
  assert.equal(new PublicKey(account.data.subarray(8, 40)).toBase58(), payer.publicKey.toBase58(), "fan alias wallet binding failed");

  let invalidRejected = false;
  try {
    await sendAndConfirmTransaction(connection, new Transaction().add(aliasInstruction(payer.publicKey, alias, "bad/name")), [payer]);
  } catch {
    invalidRejected = true;
  }
  assert(invalidRejected, "unsafe display name was accepted");

  console.log(JSON.stringify({
    wallet: payer.publicKey.toBase58(),
    alias: alias.toBase58(),
    displayName: "Cryptovuive",
    createOrUpdateSignature,
    secondUpdateSignature,
    invalidRejected,
  }, null, 2));
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
