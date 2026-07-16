import { NextRequest } from "next/server";
import { txLineDataLicenseState } from "@/lib/hackathon-compliance";
import { DEMO_MOMENTS_BY_FIXTURE } from "@/lib/demo-data";
import { demoReplayEnabled } from "@/lib/pulse-service";
import { extractScoreRecords, parseSseJson, readSseMessages } from "@/lib/sse";
import {
  calculateMomentum,
  getFixturePulse,
  getFixtures,
  normalizeScoreRecord,
  openScoresStream,
  scoreRecordFixtureId,
} from "@/lib/txline";
import type { Fixture, MatchPulse, PulseMoment } from "@/types/pulse";
import { enrichFixtureFromVerifiedSchedule, isWorldCup2026Fixture, verifiedTxLineFixtures } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FIXTURES = 8;

function sse(event: string, value: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);
}

function requestedFixtureIds(request: NextRequest): number[] {
  const raw = request.nextUrl.searchParams.get("fixtureIds") ?? request.nextUrl.searchParams.get("fixtureId") ?? "";
  return [...new Set(raw.split(",").map(Number))];
}

function pulseUpdate(pulse: MatchPulse) {
  return {
    fixtureId: pulse.fixture.fixtureId,
    minute: pulse.minute,
    score: pulse.score,
    phase: pulse.phase,
    momentum: pulse.momentum,
    source: pulse.source,
    updatedAt: pulse.updatedAt,
    momentCount: pulse.moments.length,
  };
}

export async function GET(request: NextRequest) {
  const fixtureIds = requestedFixtureIds(request);
  const invalid = !fixtureIds.length
    || fixtureIds.length > MAX_FIXTURES
    || fixtureIds.some((id) => !Number.isSafeInteger(id) || id <= 0);
  if (invalid) {
    return new Response(`fixtureIds must contain 1-${MAX_FIXTURES} positive integers`, { status: 400 });
  }

  const forceReplay = request.nextUrl.searchParams.get("mode") === "replay";
  if (forceReplay && !demoReplayEnabled()) return new Response("Demo replay is disabled", { status: 403 });
  const dataLicense = txLineDataLicenseState();
  if (!forceReplay && !dataLicense.active) {
    return new Response(
      `Live TxLINE access ended with the hackathon data licence at ${dataLicense.expiresAt}. Use labelled replay mode or obtain written TxODDS permission.`,
      { status: 451, headers: { "Cache-Control": "no-store", "X-PulseProof-Data-License": dataLicense.basis } },
    );
  }

  let closed = false;
  let replayTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  const upstreamAbort = new AbortController();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: string, value: unknown) => {
        if (!closed) controller.enqueue(sse(event, value));
      };
      const shutdown = () => {
        if (closed) return;
        closed = true;
        if (replayTimer) clearInterval(replayTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        upstreamAbort.abort();
        try { controller.close(); } catch { /* client already disconnected */ }
      };
      request.signal.addEventListener("abort", shutdown, { once: true });
      emit("ready", { fixtureIds, mode: forceReplay ? "demo-replay" : "txline-live" });
      heartbeatTimer = setInterval(() => emit("heartbeat", { at: new Date().toISOString() }), 15_000);

      if (forceReplay) {
        const unknown = fixtureIds.filter((id) => !DEMO_MOMENTS_BY_FIXTURE[id]);
        if (unknown.length) {
          emit("warning", { message: `Demo fixtures not found: ${unknown.join(", ")}` });
          shutdown();
          return;
        }
        const cursors = new Map(fixtureIds.map((id) => [id, 0]));
        const completed = new Set<number>();
        const tick = () => {
          for (const fixtureId of fixtureIds) {
            if (completed.has(fixtureId)) continue;
            const moments = DEMO_MOMENTS_BY_FIXTURE[fixtureId];
            const cursor = cursors.get(fixtureId) ?? 0;
            const moment = moments[cursor];
            if (moment) {
              emit("moment", moment);
              cursors.set(fixtureId, cursor + 1);
            }
            if (cursor + 1 >= moments.length) {
              completed.add(fixtureId);
              emit("fixture-complete", { fixtureId, moments: moments.length });
            }
          }
          if (completed.size === fixtureIds.length) {
            emit("complete", { fixtureIds, moments: [...cursors.values()].reduce((sum, value) => sum + value, 0) });
            if (replayTimer) clearInterval(replayTimer);
            replayTimer = undefined;
          }
        };
        tick();
        replayTimer = setInterval(tick, 1_300);
        return;
      }

      const runLiveBridge = async () => {
        const currentFixtures = (await getFixtures())
          .map((fixture) => enrichFixtureFromVerifiedSchedule(fixture))
          .filter(isWorldCup2026Fixture);
        const fixtureMap = new Map(verifiedTxLineFixtures().map((fixture) => [fixture.fixtureId, fixture]));
        for (const fixture of currentFixtures) fixtureMap.set(fixture.fixtureId, fixture);
        const missing = fixtureIds.filter((id) => !fixtureMap.has(id));
        if (missing.length) throw new Error(`TxLINE fixtures unavailable: ${missing.join(", ")}`);
        const lastSeq = new Map<number, number>();
        const recentMoments = new Map<number, PulseMoment[]>();
        const phases = new Map<number, string>();

        let refreshInFlight = false;
        const refreshSnapshots = async (initialize = false) => {
          if (refreshInFlight || closed) return;
          refreshInFlight = true;
          try {
            const snapshots = await Promise.allSettled(
              fixtureIds.map((id) => getFixturePulse(fixtureMap.get(id) as Fixture)),
            );
            snapshots.forEach((result, index) => {
              if (result.status !== "fulfilled") return;
              const fixtureId = fixtureIds[index];
              const moments = result.value.moments;
              recentMoments.set(fixtureId, moments.slice(-8));
              if (initialize) lastSeq.set(fixtureId, moments.at(-1)?.seq ?? -1);
              phases.set(fixtureId, result.value.phase);
              emit("pulse", pulseUpdate(result.value));
            });
          } finally {
            refreshInFlight = false;
          }
        };

        await refreshSnapshots(true);
        // The provider may drop the last SSE frame or remove a completed fixture
        // from its active catalogue. Snapshot reconciliation makes final scores
        // self-healing without advancing lastSeq, so a late SSE event is retained.
        const snapshotTimer = setInterval(() => void refreshSnapshots(), 30_000);

        try {
          while (!closed) {
            try {
              const response = await openScoresStream(upstreamAbort.signal);
              for await (const message of readSseMessages(response)) {
                if (closed) break;
                const payload = parseSseJson(message);
                for (const record of extractScoreRecords(payload)) {
                  const fixtureId = scoreRecordFixtureId(record);
                  if (!fixtureId || !fixtureIds.includes(fixtureId)) continue;
                  const fixture = fixtureMap.get(fixtureId);
                  if (!fixture) continue;
                  const moment = normalizeScoreRecord(record, fixture);
                  if (moment.seq <= (lastSeq.get(fixtureId) ?? -1)) continue;
                  lastSeq.set(fixtureId, moment.seq);
                  const moments = [...(recentMoments.get(fixtureId) ?? []), moment].slice(-8);
                  recentMoments.set(fixtureId, moments);
                  const previousPhase = phases.get(fixtureId) ?? "COVERED";
                  const phase = moment.type === "final"
                    ? "FT"
                    : moment.type === "halftime"
                      ? "HT"
                      : moment.type === "kickoff" || previousPhase === "LIVE"
                        ? "LIVE"
                        : previousPhase;
                  phases.set(fixtureId, phase);
                  emit("moment", moment);
                  emit("pulse", {
                    fixtureId,
                    minute: moment.minute,
                    score: moment.score,
                    phase,
                    momentum: calculateMomentum(moments),
                    source: "txline-live",
                    updatedAt: moment.occurredAt,
                  });
                }
              }
              if (!closed) emit("warning", { message: "TxLINE stream ended; reconnecting" });
            } catch (error) {
              if (closed || upstreamAbort.signal.aborted) break;
              emit("warning", { message: error instanceof Error ? error.message : "TxLINE stream interrupted" });
            }
            if (!closed) {
              await refreshSnapshots();
              await new Promise((resolve) => setTimeout(resolve, 1_500));
            }
          }
        } finally {
          clearInterval(snapshotTimer);
        }
      };

      void runLiveBridge().catch((error: unknown) => {
        emit("warning", { message: error instanceof Error ? error.message : "Live bridge failed" });
        shutdown();
      });
    },
    cancel() {
      closed = true;
      if (replayTimer) clearInterval(replayTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      upstreamAbort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
