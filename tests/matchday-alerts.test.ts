import { describe, expect, it } from "vitest";
import {
  alertKindForMoment,
  buildMatchAlert,
  DEFAULT_MATCH_ALERT_PREFERENCES,
  normalizeMatchAlertInbox,
  normalizeMatchAlertPreferences,
  shouldQueueMatchAlert,
} from "@/lib/matchday-alerts";
import type { Fixture, PulseMoment } from "@/types/pulse";

const fixture: Fixture = {
  fixtureId: 42,
  homeTeam: "France",
  awayTeam: "Spain",
  startTime: "2026-07-14T19:00:00.000Z",
  competition: "FIFA World Cup 2026",
  competitionSource: "txline",
  stage: "Semi-final",
  gameState: 1,
};

const moment = (overrides: Partial<PulseMoment> = {}): PulseMoment => ({
  id: "42-9",
  fixtureId: 42,
  seq: 9,
  minute: 72,
  type: "goal",
  team: "home",
  title: "France take the lead",
  description: "A verified goal event arrived from TxLINE.",
  points: 15,
  badge: 1,
  txlineAction: "goal",
  occurredAt: "2026-07-14T20:27:00.000Z",
  verified: true,
  ...overrides,
});

describe("matchday alert policy", () => {
  it("falls back safely when stored preferences are malformed", () => {
    expect(normalizeMatchAlertPreferences("broken")).toEqual(DEFAULT_MATCH_ALERT_PREFERENCES);
  });

  it("removes unknown event kinds and invalid delays", () => {
    expect(normalizeMatchAlertPreferences({
      enabled: true,
      kinds: ["goal", "goal", "yellow-card", "var"],
      delaySeconds: 999,
      followedOnly: false,
      systemNotifications: true,
    })).toEqual({
      enabled: true,
      kinds: ["goal", "var"],
      delaySeconds: 0,
      followedOnly: false,
      systemNotifications: true,
    });
  });

  it("maps only supported sporting moments", () => {
    expect(alertKindForMoment(moment({ type: "kickoff" }))).toBe("kickoff");
    expect(alertKindForMoment(moment({ type: "goal" }))).toBe("goal");
    expect(alertKindForMoment(moment({ type: "card", cardColor: "red" }))).toBe("red-card");
    expect(alertKindForMoment(moment({ type: "card", cardColor: "yellow" }))).toBeNull();
    expect(alertKindForMoment(moment({ type: "moment" }))).toBeNull();
  });

  it("requires opt-in, a selected kind, verified data and the chosen team scope", () => {
    const enabled = { ...DEFAULT_MATCH_ALERT_PREFERENCES, enabled: true };
    expect(shouldQueueMatchAlert(moment(), enabled, true)).toBe(true);
    expect(shouldQueueMatchAlert(moment({ verified: false }), enabled, true)).toBe(false);
    expect(shouldQueueMatchAlert(moment(), enabled, false)).toBe(false);
    expect(shouldQueueMatchAlert(moment(), { ...enabled, kinds: ["var"] }, true)).toBe(false);
  });

  it("protects event type, score context and description under Spoiler Shield", () => {
    expect(buildMatchAlert(moment(), fixture, true, "2026-07-14T20:27:01.000Z")).toMatchObject({
      title: "Verified match update",
      body: "France vs Spain · Open PulseProof when you are ready.",
      protected: true,
    });
  });

  it("keeps exact verified context when spoiler protection is off", () => {
    expect(buildMatchAlert(moment(), fixture, false)).toMatchObject({
      title: "France take the lead",
      body: "72′ · A verified goal event arrived from TxLINE.",
      protected: false,
    });
  });

  it("drops malformed persisted inbox records", () => {
    const valid = buildMatchAlert(moment(), fixture, false);
    expect(normalizeMatchAlertInbox([valid, { id: "fake" }, null])).toEqual([valid]);
  });
});
