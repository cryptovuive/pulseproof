import { NextResponse } from "next/server";
import { listUpcomingSchedule } from "@/lib/schedule-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await listUpcomingSchedule();
    const verifiedAt = result.entries.reduce((latest, entry) => entry.provenance.verifiedAt > latest ? entry.provenance.verifiedAt : latest, "");
    const ageSeconds = verifiedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(verifiedAt)) / 1_000)) : null;
    return NextResponse.json({
      ...result,
      canonicalTimezone: "UTC",
      fetchedAt: new Date().toISOString(),
      freshness: { verifiedAt: verifiedAt || null, ageSeconds, stale: ageSeconds === null || ageSeconds > 21_600 },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load upcoming fixtures" },
      { status: 503 },
    );
  }
}
