"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Check, Clock3, Flag, Route, ShieldCheck, Trash2 } from "lucide-react";
import { TeamFlag } from "@/components/team-flag";
import { ALERT_KINDS, type AlertKind, type MatchAlert, type MatchAlertPreferences } from "@/lib/matchday-alerts";
import { formatKickoffCountdown } from "@/lib/schedule";
import { getTeamBranding } from "@/lib/team-branding";
import { buildTournamentJourney } from "@/lib/tournament-journey";
import type { MatchPulse, ScheduleEntry } from "@/types/pulse";

type NotificationPermissionState = NotificationPermission | "unsupported";

interface MatchdayCommandCenterProps {
  pulse: MatchPulse;
  followedTeams: string[];
  spoilerFree: boolean;
  alertPreferences: MatchAlertPreferences;
  alerts: MatchAlert[];
  notificationPermission: NotificationPermissionState;
  onAlertPreferencesChange: (preferences: MatchAlertPreferences) => void;
  onEnableBrowserNotifications: () => void;
  onClearAlerts: () => void;
}

const ALERT_LABELS: Record<AlertKind, string> = {
  kickoff: "Kick-off",
  goal: "Goal",
  "red-card": "Red card",
  var: "VAR",
  final: "Full time",
};

function matchLabel(entry: ScheduleEntry) {
  return `${entry.fixture.homeTeam} vs ${entry.fixture.awayTeam}`;
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

function BracketMatch({ entry, label }: { entry: ScheduleEntry; label: string }) {
  const home = getTeamBranding(entry.fixture.homeTeam);
  const away = getTeamBranding(entry.fixture.awayTeam);
  return (
    <article className={`bracket-match ${entry.coverage === "participants-pending" ? "pending" : ""}`}>
      <span>{label}</span>
      <div><i><TeamFlag flagKey={home.flagKey} /></i><strong>{home.code}</strong><b>{entry.fixture.homeTeam}</b></div>
      <div><i><TeamFlag flagKey={away.flagKey} /></i><strong>{away.code}</strong><b>{entry.fixture.awayTeam}</b></div>
      <small><Clock3 size={10} /> {kickoffLabel(entry.fixture.startTime)}</small>
    </article>
  );
}

export function MatchdayCommandCenter({
  pulse,
  followedTeams,
  spoilerFree,
  alertPreferences,
  alerts,
  notificationPermission,
  onAlertPreferencesChange,
  onEnableBrowserNotifications,
  onClearAlerts,
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
    void fetch("/api/schedule", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Tournament path is temporarily unavailable");
        return response.json() as Promise<{ entries: ScheduleEntry[]; source: "txline-fixtures" | "verified-schedule" }>;
      })
      .then((body) => {
        if (!active) return;
        setEntries(body.entries);
        setScheduleSource(body.source);
      })
      .catch((error: unknown) => {
        if (active) setScheduleError(error instanceof Error ? error.message : "Tournament path is temporarily unavailable");
      });
    return () => { active = false; };
  }, []);

  const journey = useMemo(() => buildTournamentJourney(entries, followedTeams), [entries, followedTeams]);
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
        <div className="command-status"><span><Route size={12} /> Road to final</span><b>{scheduleSource === "txline-fixtures" ? "TxLINE schedule" : "Source-linked schedule"}</b></div>
      </div>

      <div className="command-quick-grid">
        <article>
          <span>Continue</span>
          <strong>{pulse.fixture.homeTeam} vs {pulse.fixture.awayTeam}</strong>
          <small>{pulse.phase} · Fixture #{pulse.fixture.fixtureId}</small>
          <a href="#top">Return to match</a>
        </article>
        <article className={journey.nextForFan && followedTeams.some((team) => [journey.nextForFan?.fixture.homeTeam, journey.nextForFan?.fixture.awayTeam].includes(team)) ? "personal" : ""}>
          <span>{followedTeams.length ? "Next for you" : "Next confirmed"}</span>
          <strong>{journey.nextForFan ? matchLabel(journey.nextForFan) : "Awaiting schedule"}</strong>
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
          <div className="subhead"><div><Flag size={15} /><span>Road to the final</span></div><small>Winners are never inferred</small></div>
          {scheduleError ? <div className="command-empty">{scheduleError}</div> : journey.semifinals.length || journey.final ? (
            <div className="bracket-flow">
              <div className="bracket-round">
                <span>Semi-finals</span>
                {journey.semifinals.map((entry, index) => <BracketMatch key={entry.fixture.fixtureId} entry={entry} label={`SF${index + 1}`} />)}
              </div>
              <div className="bracket-connector"><span /><Route size={18} /><span /></div>
              <div className="bracket-round final-round">
                <span>Final</span>
                {journey.final ? <BracketMatch entry={journey.final} label="Final" /> : <div className="command-empty">Final fixture pending publication.</div>}
                {journey.thirdPlace && <p>Third place: <strong>{matchLabel(journey.thirdPlace)}</strong> · {kickoffLabel(journey.thirdPlace.fixture.startTime)}</p>}
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
