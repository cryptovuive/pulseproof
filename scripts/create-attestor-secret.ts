import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import bs58 from "bs58";
import nacl from "tweetnacl";

async function main() {
  const output = resolve(process.env.ATTESTOR_OUTPUT_FILE ?? ".local-wallets/attestor-secret");
  const keypair = nacl.sign.keyPair();
  await mkdir(dirname(output), { recursive: true });
  try {
    await writeFile(output, bs58.encode(keypair.secretKey), { encoding: "utf8", mode: 0o600, flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`Refusing to overwrite existing attestor secret: ${output}`);
    }
    throw error;
  }
  console.log(JSON.stringify({
    created: true,
    output,
    publicKey: bs58.encode(keypair.publicKey),
    secret: "redacted",
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
