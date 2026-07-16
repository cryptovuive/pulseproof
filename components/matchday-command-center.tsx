"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Check, Clock3, EyeOff, Flag, Route, ShieldCheck, Trash2 } from "lucide-react";
import { TeamFlag } from "@/components/team-flag";
import { ALERT_KINDS, type AlertKind, type MatchAlert, type MatchAlertPreferences } from "@/lib/matchday-alerts";
import { formatKickoffCountdown, scheduleParticipantLabel } from "@/lib/schedule";
import { getTeamBranding } from "@/lib/team-branding";
import { buildTournamentJourney } from "@/lib/tournament-journey";
import { stageParticipantsRevealKnockoutOutcome } from "@/lib/spoiler-protection";
import type { MatchPulse, ScheduleEntry } from "@/types/pulse";

type NotificationPermissionState = NotificationPermission | "unsupported";

interface MatchdayCommandCenterProps {
  pulse: MatchPulse;
  followedTeams: string[];
  spoilerFree: boolean;
  alertPreferences: MatchAlertPreferences;
  alerts: MatchAlert[];
  savedRecapCount: number;
  offlineMode: boolean;
  notificationPermission: NotificationPermissionState;
  onAlertPreferencesChange: (preferences: MatchAlertPreferences) => void;
  onEnableBrowserNotifications: () => void;
  onClearAlerts: () => void;
  onReplayFixture: (fixtureId: number) => void;
}

const ALERT_LABELS: Record<AlertKind, string> = {
  kickoff: "Kick-off",
  goal: "Goal",
  "red-card": "Red card",
  var: "VAR",
  final: "Full time",
};

function matchLabel(entry: ScheduleEntry) {
  return `${scheduleParticipantLabel(entry, "home")} vs ${scheduleParticipantLabel(entry, "away")}`;
}

function kickoffLabel(startTime: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startTime));
}

function BracketMatch({
  entry,
  label,
  spoilerFree,
  hideParticipants = false,
  onReplayFixture,
}: {
  entry: ScheduleEntry;
  label: string;
  spoilerFree: boolean;
  hideParticipants?: boolean;
  onReplayFixture: (fixtureId: number) => void;
}) {
  const protectResult = spoilerFree && Boolean(entry.result);
  const protectParticipants = spoilerFree && hideParticipants;
  const home = getTeamBranding(protectParticipants ? "TBD" : entry.fixture.homeTeam);
  const away = getTeamBranding(protectParticipants ? "TBD" : entry.fixture.awayTeam);
  const homeLabel = protectParticipants ? "Finalist hidden" : scheduleParticipantLabel(entry, "home");
  const awayLabel = protectParticipants ? "Finalist hidden" : scheduleParticipantLabel(entry, "away");
  const homeWon = !protectResult && entry.result?.winnerTeam === entry.fixture.homeTeam;
  const awayWon = !protectResult && entry.result?.winnerTeam === entry.fixture.awayTeam;
  return (
    <article className={`bracket-match ${entry.coverage === "participants-pending" ? "pending" : ""} ${entry.result ? "finished" : ""} ${protectResult || protectParticipants ? "protected" : ""}`}>
      <span>{label}<em>{protectResult || protectParticipants ? "Spoiler protected" : entry.result ? "FT" : "Scheduled"}</em></span>
      <div className={homeWon ? "winner" : ""}><i>{protectParticipants ? <EyeOff /> : <TeamFlag flagKey={home.flagKey} />}</i><strong>{protectParticipants ? "???" : home.code}</strong><b>{homeLabel}</b>{entry.result && <mark aria-label={protectResult ? "Score hidden" : undefined}>{protectResult ? <EyeOff size={12} /> : entry.result.score[0]}</mark>}</div>
      <div className={awayWon ? "winner" : ""}><i>{protectParticipants ? <EyeOff /> : <TeamFlag flagKey={away.flagKey} />}</i><strong>{protectParticipants ? "???" : away.code}</strong><b>{awayLabel}</b>{entry.result && <mark aria-label={protectResult ? "Score hidden" : undefined}>{protectResult ? <EyeOff size={12} /> : entry.result.score[1]}</mark>}</div>
      <small><Clock3 size={10} /> {entry.result ? `Match complete · ${kickoffLabel(entry.fixture.startTime)}` : kickoffLabel(entry.fixture.startTime)}</small>
      {entry.result && <button className="bracket-replay" onClick={() => onReplayFixture(entry.result!.replayFixtureId)}><Route size={11} /> {protectResult ? "Start spoiler-free replay" : "Replay same live view"}</button>}
    </article>
  );
}

export function MatchdayCommandCenter({
  pulse,
  followedTeams,
  spoilerFree,
  alertPreferences,
  alerts,
  savedRecapCount,
  offlineMode,
  notificationPermission,
  onAlertPreferencesChange,
  onEnableBrowserNotifications,
  onClearAlerts,
  onReplayFixture,
}: MatchdayCommandCenterProps) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [scheduleSource, setScheduleSource] = useState<"txline-fixtures" | "verified-schedule">("verified-schedule");
  const [scheduleError, setScheduleError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => void fetch("/api/schedule", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("Tournament path is temporarily unavailable");
          return response.json() as Promise<{ entries: ScheduleEntry[]; tournamentEntries: ScheduleEntry[]; source: "txline-fixtures" | "verified-schedule" }>;
        })
        .then((body) => {
          if (!active) return;
          setEntries(body.tournamentEntries ?? body.entries);
          setScheduleSource(body.source);
          setScheduleError("");
        })
        .catch((error: unknown) => {
          if (active) setScheduleError(error instanceof Error ? error.message : "Tournament path is temporarily unavailable");
        });
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const journey = useMemo(() => buildTournamentJourney(entries, followedTeams), [entries, followedTeams]);
  const currentParticipantsProtected = spoilerFree && stageParticipantsRevealKnockoutOutcome(pulse.fixture.stage);
  const nextFixtureRevealsOutcome = spoilerFree && Boolean(journey.nextForFan && /final|third/i.test(journey.nextForFan.fixture.stage));
  const toggleKind = (kind: AlertKind) => {
    const kinds = alertPreferences.kinds.includes(kind)
      ? alertPreferences.kinds.filter((item) => item !== kind)
      : [...alertPreferences.kinds, kind];
    onAlertPreferencesChange({ ...alertPreferences, kinds });
  };

  const toggleAlertPower = () => {
    const enabled = !alertPreferences.enabled;
    onAlertPreferencesChange({
      ...alertPreferences,
      enabled,
      followedOnly: enabled && !followedTeams.length ? false : alertPreferences.followedOnly,
    });
  };

  return (
    <section className="command-center" id="command-center" aria-label="Matchday command center">
      <div className="command-head">
        <div><span className="eyebrow">Your tournament cockpit</span><h2>Matchday command center</h2></div>
        <div className="command-status"><span><Route size={12} /> Road to final</span><b>{offlineMode ? "Offline-safe mode" : scheduleSource === "txline-fixtures" ? "TxLINE schedule" : "Source-linked schedule"}</b><b>{savedRecapCount} saved recap{savedRecapCount === 1 ? "" : "s"}</b></div>
      </div>

      <div className="command-quick-grid">
        <article>
          <span>Continue</span>
          <strong>{currentParticipantsProtected ? "Knockout qualifiers hidden" : `${pulse.fixture.homeTeam} vs ${pulse.fixture.awayTeam}`}</strong>
          <small>{offlineMode ? "Saved on this device" : pulse.phase} · Fixture #{pulse.fixture.fixtureId}</small>
          <a href="#top">Return to match</a>
        </article>
        <article className={journey.nextForFan && followedTeams.some((team) => [journey.nextForFan?.fixture.homeTeam, journey.nextForFan?.fixture.awayTeam].includes(team)) ? "personal" : ""}>
          <span>{followedTeams.length ? "Next for you" : "Next confirmed"}</span>
          <strong>{nextFixtureRevealsOutcome ? "Fixture hidden by Spoiler Shield" : journey.nextForFan ? matchLabel(journey.nextForFan) : "Awaiting schedule"}</strong>
          <small>{journey.nextForFan ? `${formatKickoffCountdown(journey.nextForFan.fixture.startTime, now)} · ${journey.nextForFan.fixture.stage}` : "No future fixture published"}</small>
          <a href="#upcoming">Open schedule</a>
        </article>
        <article className={alertPreferences.enabled ? "alerts-armed" : ""}>
          <span>Smart alerts</span>
          <strong>{alertPreferences.enabled ? `${alertPreferences.kinds.length} event types armed` : "Alerts are paused"}</strong>
          <small>{alertPreferences.followedOnly ? "Followed teams only" : "Every covered fixture"} · {alertPreferences.delaySeconds ? `${alertPreferences.delaySeconds}s delay` : "no delay"}</small>
          <button onClick={toggleAlertPower}>{alertPreferences.enabled ? <BellOff size={11} /> : <Bell size={11} />}{alertPreferences.enabled ? "Pause alerts" : followedTeams.length ? "Arm alerts" : "Arm all covered"}</button>
        </article>
      </div>

      <div className="command-body">
        <div className="road-card">
          <div className="subhead"><div><Flag size={15} /><span>Road to the final</span></div><small>Finished results verified · future winners never inferred</small></div>
          {scheduleError ? <div className="command-empty">{scheduleError}</div> : journey.semifinals.length || journey.final ? (
            <div className="bracket-flow">
              <div className="bracket-round">
                <span>Semi-finals</span>
                {journey.semifinals.map((entry, index) => <BracketMatch key={entry.fixture.fixtureId} entry={entry} label={`SF${index + 1}`} spoilerFree={spoilerFree} onReplayFixture={onReplayFixture} />)}
              </div>
              <div className="bracket-connector"><span /><Route size={18} /><span /></div>
              <div className="bracket-round final-round">
                <span>Final</span>
                {journey.final ? <BracketMatch entry={journey.final} label="Final" spoilerFree={spoilerFree} hideParticipants onReplayFixture={onReplayFixture} /> : <div className="command-empty">Final fixture pending publication.</div>}
                {journey.thirdPlace && <BracketMatch entry={journey.thirdPlace} label="Third place" spoilerFree={spoilerFree} hideParticipants onReplayFixture={onReplayFixture} />}
              </div>
            </div>
          ) : <div className="command-empty">Loading the source-linked tournament path…</div>}
          {journey.nextForFan?.provenance.sourceUrl && <a className="journey-source" href={journey.nextForFan.provenance.sourceUrl} target="_blank" rel="noreferrer"><ShieldCheck size={11} /> Verify tournament schedule source</a>}
        </div>

        <aside className="alert-center">
          <div className="subhead"><div><Bell size={15} /><span>Alert center</span></div><small>{alerts.length} saved</small></div>
          <p>Opt-in alerts use only new verified TxLINE events. Replay and metadata records never trigger them.</p>
          <div className="alert-kinds" aria-label="Alert event types">
            {ALERT_KINDS.map((kind) => <button key={kind} className={alertPreferences.kinds.includes(kind) ? "active" : ""} aria-pressed={alertPreferences.kinds.includes(kind)} onClick={() => toggleKind(kind)}>{alertPreferences.kinds.includes(kind) && <Check size={10} />}{ALERT_LABELS[kind]}</button>)}
          </div>
          <div className="alert-policy">
            <label>Broadcast delay<select aria-label="Alert delay" value={alertPreferences.delaySeconds} onChange={(event) => onAlertPreferencesChange({ ...alertPreferences, delaySeconds: Number(event.target.value) as MatchAlertPreferences["delaySeconds"] })}><option value={0}>No delay</option><option value={30}>30 seconds</option><option value={60}>60 seconds</option><option value={120}>2 minutes</option></select></label>
            <label className="check-policy"><input type="checkbox" checked={alertPreferences.followedOnly} onChange={(event) => onAlertPreferencesChange({ ...alertPreferences, followedOnly: event.target.checked })} /> Followed teams only</label>
          </div>
          <button className={`browser-alert-button ${notificationPermission === "granted" ? "granted" : ""}`} disabled={notificationPermission === "unsupported" || notificationPermission === "denied"} onClick={onEnableBrowserNotifications}>
            {notificationPermission === "granted" ? <Check size={12} /> : <Bell size={12} />}
            {notificationPermission === "granted" ? "Browser notifications enabled" : notificationPermission === "denied" ? "Notifications blocked by browser" : notificationPermission === "unsupported" ? "In-app inbox only" : "Enable browser notifications"}
          </button>
          {spoilerFree && <div className="spoiler-alert-note"><ShieldCheck size={12} /> Spoiler Shield replaces event details with a protected update.</div>}
          <div className="alert-inbox-head"><span>Matchday inbox</span>{alerts.length > 0 && <button onClick={onClearAlerts}><Trash2 size={10} /> Clear</button>}</div>
          <div className="alert-inbox">
            {alerts.slice(0, 3).map((alert) => <article key={alert.id}><span>{alert.protected ? "Protected" : ALERT_LABELS[alert.kind]}</span><strong>{alert.title}</strong><small>{alert.body}</small></article>)}
            {!alerts.length && <div>No verified live alerts yet. This inbox never contains simulated activity.</div>}
          </div>
        </aside>
      </div>
    </section>
  );
}
