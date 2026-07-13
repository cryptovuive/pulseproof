import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const directory = resolve(".local-wallets");
const secretJsonPath = resolve(directory, "phantom-test-wallet.json");
const phantomKeyPath = resolve(directory, "phantom-import-private-key.txt");
const metadataPath = resolve(directory, "phantom-test-wallet.public.json");
const force = process.argv.includes("--force");

async function exists(path: string) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

async function main() {
  await mkdir(directory, { recursive: true });
  if (!force && await exists(secretJsonPath)) {
    throw new Error("Test wallet already exists. Refusing to overwrite it; pass --force only when rotation is intentional.");
  }
  const wallet = Keypair.generate();
  const publicKey = wallet.publicKey.toBase58();
  await writeFile(secretJsonPath, `${JSON.stringify([...wallet.secretKey])}\n`, { encoding: "utf8", mode: 0o600 });
  await writeFile(phantomKeyPath, `${bs58.encode(wallet.secretKey)}\n`, { encoding: "utf8", mode: 0o600 });
  await writeFile(metadataPath, `${JSON.stringify({
    publicKey,
    networkUse: "localnet/devnet testing only",
    createdAt: new Date().toISOString(),
    secretJsonFile: "phantom-test-wallet.json",
    phantomImportFile: "phantom-import-private-key.txt",
  }, null, 2)}\n`, "utf8");
  try {
    await Promise.all([chmod(secretJsonPath, 0o600), chmod(phantomKeyPath, 0o600)]);
  } catch { /* Windows ACLs may not implement POSIX modes; directory remains gitignored */ }
  console.log(JSON.stringify({ ok: true, publicKey, metadataPath, secretsPrinted: false }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
