import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { getTxLineConfig } from "@/lib/txline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PULSEPROOF_PROGRAM = process.env.NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID
  ?? "74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn";
const REFERENCE_RECEIPT = process.env.NEXT_PUBLIC_REFERENCE_RECEIPT
  ?? "vid5hzmuF2FJnzFvZa7251fLdh5d5eRrn4WyvPd85WVKAcnccBbJhKEUFXx5VAXgvBEYp9bjZcToSp5yfnJHHCR";

const explorerAddress = (address: string) => `https://explorer.solana.com/address/${address}?cluster=devnet`;
const explorerTransaction = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

export async function GET() {
  try {
    const txline = getTxLineConfig();
    if (txline.network !== "devnet") throw new Error("Judge proof is intentionally pinned to devnet");
    const rpcUrl = process.env.SOLANA_RPC_URL
      ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL
      ?? "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    const pulseProofKey = new PublicKey(PULSEPROOF_PROGRAM);
    const txlineKey = new PublicKey(txline.programId);
    const [pulseProofAccount, txlineAccount, receipt] = await Promise.all([
      connection.getAccountInfo(pulseProofKey, "confirmed"),
      connection.getAccountInfo(txlineKey, "confirmed"),
      connection.getSignatureStatus(REFERENCE_RECEIPT, { searchTransactionHistory: true }),
    ]);
    if (!pulseProofAccount) throw new Error("PulseProof program account was not found");
    if (!txlineAccount) throw new Error("TxLINE program account was not found");
    if (!receipt.value) throw new Error("Reference receipt was not found");

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      network: "devnet",
      pulseProof: {
        programId: PULSEPROOF_PROGRAM,
        executable: pulseProofAccount.executable,
        owner: pulseProofAccount.owner.toBase58(),
        explorerUrl: explorerAddress(PULSEPROOF_PROGRAM),
      },
      txline: {
        programId: txline.programId,
        executable: txlineAccount.executable,
        explorerUrl: explorerAddress(txline.programId),
      },
      receipt: {
        signature: REFERENCE_RECEIPT,
        confirmationStatus: receipt.value.confirmationStatus ?? null,
        slot: receipt.value.slot ?? null,
        error: receipt.value.err,
        explorerUrl: explorerTransaction(REFERENCE_RECEIPT),
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify devnet evidence" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
