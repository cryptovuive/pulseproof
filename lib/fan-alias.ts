import { Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import type { FanAlias } from "@/types/pulse";

const encoder = new TextEncoder();

export function pulseProofProgramId() {
  const value = process.env.NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID;
  if (!value) throw new Error("NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID is not configured");
  return new PublicKey(value);
}

export function fanAliasAddress(owner: PublicKey, program = pulseProofProgramId()) {
  return PublicKey.findProgramAddressSync([encoder.encode("fan_alias"), owner.toBytes()], program)[0];
}

export function decodeFanAlias(dataInput: Uint8Array, address: PublicKey): FanAlias {
  const data = Buffer.from(dataInput);
  if (data.length < 53) throw new Error("Fan alias account has an unexpected layout");
  const owner = new PublicKey(data.subarray(8, 40));
  const byteLength = data.readUInt32LE(40);
  if (byteLength < 2 || byteLength > 48 || 44 + byteLength + 9 > data.length) {
    throw new Error("Fan alias account contains an invalid display name");
  }
  const displayName = data.subarray(44, 44 + byteLength).toString("utf8");
  const updatedAt = Number(data.readBigInt64LE(44 + byteLength));
  return { address: address.toBase58(), owner: owner.toBase58(), displayName, updatedAt };
}

export async function fetchFanAliasFromChain(ownerInput: string | PublicKey): Promise<FanAlias | null> {
  const owner = typeof ownerInput === "string" ? new PublicKey(ownerInput) : ownerInput;
  const program = pulseProofProgramId();
  const address = fanAliasAddress(owner, program);
  const rpc = new Connection(
    process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed",
  );
  const account = await rpc.getAccountInfo(address, "confirmed");
  if (!account) return null;
  if (!account.owner.equals(program)) throw new Error("Fan alias is not owned by the PulseProof program");
  const alias = decodeFanAlias(account.data, address);
  if (alias.owner !== owner.toBase58()) throw new Error("Fan alias owner mismatch");
  return alias;
}
