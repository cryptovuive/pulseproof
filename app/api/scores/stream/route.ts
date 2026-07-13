import { NextRequest } from "next/server";
import { GET as openPulseStream } from "../../stream/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  return openPulseStream(request);
}
