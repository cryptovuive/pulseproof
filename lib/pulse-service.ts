import {
  DEMO_DEFAULT_PHASE,
  DEMO_DATA_SOURCES,
  DEMO_FIXTURE,
  DEMO_FIXTURES,
  getDemoFixture,
  getDemoMomentsForFixture,
  getDemoOverviews,
} from "@/lib/demo-data";
import { calculateMomentum, getFixturePulse, getFixtures, hasTxLineCredentials } from "@/lib/txline";
import type { Fixture, MatchOverview, MatchPulse } from "@/types/pulse";

export function demoReplayEnabled(): boolean {
  return process.env.DEMO_REPLAY_ENABLED === "true";
}

export function buildDemoPulse(fixtureId = DEMO_FIXTURE.fixtureId, cursor?: number): MatchPulse {
  const fixture = getDemoFixture(fixtureId);
  if (!fixture) throw new Error(`Fixture ${fixtureId} is not available in demo replay`);
  const moments = getDemoMomentsForFixture(fixtureId, cursor);
  if (!moments.length) throw new Error(`Fixture ${fixtureId} has no demo moments`);
  const last = moments.at(-1)!;
  const fullLength = getDemoMomentsForFixture(fixtureId).length;
  const atEnd = moments.length === fullLength;
  return {
    fixture,
    source: "demo-replay",
    phase: atEnd ? DEMO_DEFAULT_PHASE[fixtureId] : last.type === "halftime" ? "HT" : "REPLAY",
    minute: last.minute,
    score: last.score ?? [0, 0],
    momentum: calculateMomentum(moments),
    updatedAt: new Date().toISOString(),
    moments,
    replayCursor: moments.length,
    provenance: {
      provider: DEMO_DATA_SOURCES[fixtureId].provider,
      sourceUrl: DEMO_DATA_SOURCES[fixtureId].url,
      verifiedAt: DEMO_DATA_SOURCES[fixtureId].checkedAt,
    },
  };
}

export async function listAvailableFixtures(): Promise<{
  fixtures: Fixture[];
  matches: MatchOverview[];
  source: "txline-live" | "demo-replay" | "hybrid";
}> {
  if (hasTxLineCredentials()) {
    try {
      const fixtures = await getFixtures();
      const candidates = [...fixtures]
        .sort((a, b) => {
          const aTime = Date.parse(a.startTime);
          const bTime = Date.parse(b.startTime);
          if (Number.isFinite(aTime) && Number.isFinite(bTime)) return Math.abs(aTime - Date.now()) - Math.abs(bTime - Date.now());
          if (Number.isFinite(aTime)) return -1;
          if (Number.isFinite(bTime)) return 1;
          return a.fixtureId - b.fixtureId;
        })
        .slice(0, 8);
      const loaded = await Promise.allSettled(candidates.map((fixture) => getFixturePulse(fixture)));
      const matches: MatchOverview[] = candidates.map((fixture, index) => {
        const result = loaded[index];
        if (result.status === "fulfilled") {
          return {
            fixture,
            source: result.value.source,
            phase: result.value.phase,
            minute: result.value.minute,
            score: result.value.score,
            scoreKnown: result.value.moments.some((moment) => Boolean(moment.score)),
            updatedAt: result.value.updatedAt,
            momentCount: result.value.moments.length,
          };
        }
        return { fixture, source: "txline-live", phase: "WAITING", minute: 0, score: [0, 0], scoreKnown: false, updatedAt: fixture.startTime, momentCount: 0 };
      });
      matches.sort((a, b) => {
        const liveDifference = Number(b.phase === "LIVE") - Number(a.phase === "LIVE");
        return liveDifference || b.momentCount - a.momentCount || a.fixture.fixtureId - b.fixture.fixtureId;
      });
      if (demoReplayEnabled()) {
        const liveIds = new Set(candidates.map((fixture) => fixture.fixtureId));
        const finished = getDemoOverviews().filter((match) => !liveIds.has(match.fixture.fixtureId));
        return {
          fixtures: [...candidates, ...finished.map((match) => match.fixture)],
          matches: [...matches, ...finished],
          source: finished.length ? "hybrid" : "txline-live",
        };
      }
      return { fixtures: candidates, matches, source: "txline-live" };
    } catch (error) {
      if (!demoReplayEnabled()) throw error;
    }
  }
  if (!demoReplayEnabled()) throw new Error("TxLINE credentials are required when demo replay is disabled");
  return { fixtures: DEMO_FIXTURES, matches: getDemoOverviews(), source: "demo-replay" };
}

export async function loadPulse(fixtureId: number, options: { historical?: boolean; cursor?: number; forceDemo?: boolean } = {}) {
  if (!options.forceDemo && hasTxLineCredentials()) {
    try {
      const listed = await getFixtures();
      const fixture = listed.find((item) => item.fixtureId === fixtureId);
      if (!fixture) throw new Error(`TxLINE fixture ${fixtureId} is not available to this subscription`);
      return await getFixturePulse(fixture, options.historical);
    } catch (error) {
      // Never disguise a live-source failure as replay for an unrelated fixture.
      if (!demoReplayEnabled() || !getDemoFixture(fixtureId)) throw error;
    }
  }
  if (!demoReplayEnabled()) throw new Error("Demo replay is disabled");
  return buildDemoPulse(fixtureId, options.cursor);
}
