import { NextRequest, NextResponse } from "next/server";
import { loadPulse } from "@/lib/pulse-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId: fixtureIdParam } = await context.params;
  const fixtureId = Number(fixtureIdParam);
  if (!Number.isSafeInteger(fixtureId) || fixtureId <= 0) {
    return NextResponse.json({ error: "fixtureId must be a positive integer" }, { status: 400 });
  }
  const cursorParam = request.nextUrl.searchParams.get("cursor");
  const cursor = cursorParam === null ? undefined : Number(cursorParam);
  const forceDemo = request.nextUrl.searchParams.get("mode") === "replay";
  const historical = request.nextUrl.searchParams.get("historical") === "true";

  try {
    const pulse = await loadPulse(fixtureId, { cursor, forceDemo, historical });
    return NextResponse.json(pulse, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load match pulse" },
      { status: 503 },
    );
  }
}
