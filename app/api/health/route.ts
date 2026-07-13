import { NextResponse } from "next/server";
import { demoReplayEnabled } from "@/lib/pulse-service";
import { getTxLineConfig, hasTxLineCredentials } from "@/lib/txline";

export async function GET() {
  const config = getTxLineConfig();
  return NextResponse.json({
    ok: true,
    service: "pulseproof",
    txline: {
      network: config.network,
      apiOrigin: config.apiOrigin,
      programId: config.programId,
      credentialsConfigured: hasTxLineCredentials(),
    },
    demoReplayEnabled: demoReplayEnabled(),
    timestamp: new Date().toISOString(),
  });
}
