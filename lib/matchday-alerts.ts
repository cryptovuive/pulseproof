import type { Fixture, PulseMoment } from "@/types/pulse";

export const ALERT_KINDS = ["kickoff", "goal", "red-card", "var", "final"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];
export type AlertDelay = 0 | 30 | 60 | 120;

export interface MatchAlertPreferences {
  enabled: boolean;
  kinds: AlertKind[];
  delaySeconds: AlertDelay;
  followedOnly: boolean;
  systemNotifications: boolean;
}

export interface MatchAlert {
  id: string;
  fixtureId: number;
  kind: AlertKind;
  title: string;
  body: string;
  createdAt: string;
  seen: boolean;
  protected: boolean;
}

export const DEFAULT_MATCH_ALERT_PREFERENCES: MatchAlertPreferences = {
  enabled: false,
  kinds: [...ALERT_KINDS],
  delaySeconds: 0,
  followedOnly: true,
  systemNotifications: false,
};

const VALID_DELAYS = new Set<AlertDelay>([0, 30, 60, 120]);

export function normalizeMatchAlertPreferences(value: unknown): MatchAlertPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_MATCH_ALERT_PREFERENCES;
  const record = value as Record<string, unknown>;
  const kinds = Array.isArray(record.kinds)
    ? [...new Set(record.kinds.filter((kind): kind is AlertKind => ALERT_KINDS.includes(kind as AlertKind)))]
    : [...ALERT_KINDS];
  const delaySeconds = VALID_DELAYS.has(record.delaySeconds as AlertDelay)
    ? record.delaySeconds as AlertDelay
    : 0;
  return {
    enabled: record.enabled === true,
    kinds,
    delaySeconds,
    followedOnly: record.followedOnly !== false,
    systemNotifications: record.systemNotifications === true,
  };
}

export function alertKindForMoment(moment: PulseMoment): AlertKind | null {
  if (moment.type === "kickoff") return "kickoff";
  if (moment.type === "goal") return "goal";
  if (moment.type === "card" && moment.cardColor === "red") return "red-card";
  if (moment.type === "var") return "var";
  if (moment.type === "final") return "final";
  return null;
}

export function shouldQueueMatchAlert(
  moment: PulseMoment,
  preferences: MatchAlertPreferences,
  fixtureIsFollowed: boolean,
): boolean {
  const kind = alertKindForMoment(moment);
  return Boolean(
    preferences.enabled
    && kind
    && preferences.kinds.includes(kind)
    && (!preferences.followedOnly || fixtureIsFollowed)
    && moment.verified,
  );
}

export function buildMatchAlert(
  moment: PulseMoment,
  fixture: Fixture,
  spoilerShield: boolean,
  createdAt = new Date().toISOString(),
): MatchAlert {
  const kind = alertKindForMoment(moment);
  if (!kind) throw new Error(`Moment ${moment.id} is not alertable`);
  const protectedUpdate = spoilerShield && kind !== "kickoff";
  const minute = moment.minuteLabel ?? String(moment.minute);
  return {
    id: `${moment.fixtureId}:${moment.seq}`,
    fixtureId: moment.fixtureId,
    kind,
    title: protectedUpdate ? "Verified match update" : moment.title,
    body: protectedUpdate
      ? `${fixture.homeTeam} vs ${fixture.awayTeam} · Open PulseProof when you are ready.`
      : `${minute}′ · ${moment.description}`,
    createdAt,
    seen: false,
    protected: protectedUpdate,
  };
}

export function normalizeMatchAlertInbox(value: unknown): MatchAlert[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MatchAlert => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const alert = item as Partial<MatchAlert>;
    return typeof alert.id === "string"
      && typeof alert.fixtureId === "number"
      && Number.isSafeInteger(alert.fixtureId)
      && ALERT_KINDS.includes(alert.kind as AlertKind)
      && typeof alert.title === "string"
      && typeof alert.body === "string"
      && typeof alert.createdAt === "string"
      && typeof alert.seen === "boolean"
      && typeof alert.protected === "boolean";
  }).slice(0, 20);
}
