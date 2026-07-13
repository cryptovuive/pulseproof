import { NextResponse } from "next/server";
import { listAvailableFixtures } from "@/lib/pulse-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await listAvailableFixtures();
    return NextResponse.json({ ...result, fetchedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load fixtures" },
      { status: 503 },
    );
  }
}
