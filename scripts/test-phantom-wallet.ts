import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";

async function main() {
  const secret = JSON.parse(await readFile(resolve(".local-wallets/phantom-test-wallet.json"), "utf8")) as number[];
  const metadata = JSON.parse(await readFile(resolve(".local-wallets/phantom-test-wallet.public.json"), "utf8")) as { publicKey: string };
  assert.equal(secret.length, 64, "Solana secret key must contain 64 bytes");
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));
  assert.equal(wallet.publicKey.toBase58(), metadata.publicKey, "public metadata does not match secret key");

  const challenge = new TextEncoder().encode("PULSEPROOF_PHANTOM_WALLET_TEST_V1");
  const detached = nacl.sign.detached(challenge, wallet.secretKey);
  assert(nacl.sign.detached.verify(challenge, detached, wallet.publicKey.toBytes()), "signMessage-compatible signature failed");

  const transaction = new Transaction({
    feePayer: wallet.publicKey,
    recentBlockhash: "11111111111111111111111111111111",
  }).add(SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: wallet.publicKey, lamports: 0 }));
  transaction.partialSign(wallet);
  assert(transaction.verifySignatures(), "Phantom-compatible transaction signature failed");

  console.log(JSON.stringify({
    ok: true,
    publicKey: wallet.publicKey.toBase58(),
    assertions: ["64-byte Solana keypair", "public key consistency", "signMessage-compatible Ed25519", "transaction signature"],
    secretsPrinted: false,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
