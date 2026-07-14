import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { getTxLineConfig } from "@/lib/txline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PULSEPROOF_PROGRAM = process.env.NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID
  ?? "74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn";
const REFERENCE_RECEIPT = process.env.NEXT_PUBLIC_REFERENCE_RECEIPT
  ?? "vid5hzmuF2FJnzFvZa7251fLdh5d5eRrn4WyvPd85WVKAcnccBbJhKEUFXx5VAXgvBEYp9bjZcToSp5yfnJHHCR";
const PROGRESSION_WALLET = "8qdg3U5FXJD8H5Y5Fv6hsWxJbPLwaUmyUUYyFYVLsAyV";
const QUIZ_RECEIPT = "2dSD6oJMsZNAMSfCTYSkBXuMowc9hSC4dtp5rfwjJz8uYKGR7QJ6Wfy7jwFYYWewxsKA11XYqkX3t4pEPMqpAzxo";
const REWARD_RECEIPT = "5y1ZXtGdmKRMfaSYpW321F9qBzaJQp3ttphfARVC2q9BXEM44dPBZHyUBpQbxN3n8dR9Xf28s8MbXPv2GnK5QpjA";

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
    const progressionWallet = new PublicKey(PROGRESSION_WALLET);
    const [fanProfile] = PublicKey.findProgramAddressSync(
      [Buffer.from("fan_profile"), progressionWallet.toBuffer()],
      pulseProofKey,
    );
    const [pulseProofAccount, txlineAccount, receipt, profileAccount, quizReceipt, rewardReceipt] = await Promise.all([
      connection.getAccountInfo(pulseProofKey, "confirmed"),
      connection.getAccountInfo(txlineKey, "confirmed"),
      connection.getSignatureStatus(REFERENCE_RECEIPT, { searchTransactionHistory: true }),
      connection.getAccountInfo(fanProfile, "confirmed"),
      connection.getSignatureStatus(QUIZ_RECEIPT, { searchTransactionHistory: true }),
      connection.getSignatureStatus(REWARD_RECEIPT, { searchTransactionHistory: true }),
    ]);
    if (!pulseProofAccount) throw new Error("PulseProof program account was not found");
    if (!txlineAccount) throw new Error("TxLINE program account was not found");
    if (!receipt.value) throw new Error("Reference receipt was not found");
    if (!profileAccount || profileAccount.data.length < 119) throw new Error("Fan progression profile was not found");
    if (!quizReceipt.value || !rewardReceipt.value) throw new Error("Fan progression receipts were not found");

    const profileOwner = new PublicKey(profileAccount.data.subarray(8, 40)).toBase58();
    if (profileOwner !== PROGRESSION_WALLET) throw new Error("Fan progression owner binding failed");

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
      progression: {
        wallet: PROGRESSION_WALLET,
        fanProfile: fanProfile.toBase58(),
        explorerUrl: explorerAddress(fanProfile.toBase58()),
        pointsEarned: Number(profileAccount.data.readBigUInt64LE(40)),
        pointsSpent: Number(profileAccount.data.readBigUInt64LE(48)),
        checkins: profileAccount.data.readUInt32LE(56),
        quizClaims: profileAccount.data.readUInt32LE(60),
        equippedBadge: profileAccount.data.readUInt16LE(108),
        quizReceipt: {
          signature: QUIZ_RECEIPT,
          confirmationStatus: quizReceipt.value.confirmationStatus ?? null,
          error: quizReceipt.value.err,
          explorerUrl: explorerTransaction(QUIZ_RECEIPT),
        },
        rewardReceipt: {
          signature: REWARD_RECEIPT,
          confirmationStatus: rewardReceipt.value.confirmationStatus ?? null,
          error: rewardReceipt.value.err,
          explorerUrl: explorerTransaction(REWARD_RECEIPT),
        },
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify devnet evidence" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
