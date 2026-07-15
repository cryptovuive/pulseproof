import { NextResponse } from "next/server";
import { txLineDataLicenseState } from "@/lib/hackathon-compliance";
import { demoReplayEnabled } from "@/lib/pulse-service";
import { getTxLineConfig, hasTxLineCredentials } from "@/lib/txline";

export async function GET() {
  const config = getTxLineConfig();
  const dataLicense = txLineDataLicenseState();
  return NextResponse.json({
    ok: true,
    service: "pulseproof",
    txline: {
      network: config.network,
      apiOrigin: config.apiOrigin,
      programId: config.programId,
      credentialsConfigured: hasTxLineCredentials(),
      dataLicense,
    },
    demoReplayEnabled: demoReplayEnabled(),
    timestamp: new Date().toISOString(),
  });
}
