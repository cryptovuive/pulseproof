"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellRing, CalendarPlus, Clock3, Radio } from "lucide-react";
import { TeamFlag } from "@/components/team-flag";
import { buildFixtureCalendar, formatKickoffCountdown } from "@/lib/schedule";
import { fixtureHasFollowedTeam } from "@/lib/fan-preferences";
import { getTeamBranding } from "@/lib/team-branding";
import type { ScheduleEntry } from "@/types/pulse";

const REMINDER_KEY = "pulseproof-fixture-reminders-v1";

function kickoffParts(startTime: string) {
  const date = new Date(startTime);
  return {
    date: new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date),
    time: new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(date),
    utc: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(date),
  };
}

export function UpcomingMatchHub({ followedTeams = [] }: { followedTeams?: string[] }) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [source, setSource] = useState<"txline-fixtures" | "verified-schedule">("verified-schedule");
  const [stale, setStale] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [timezone, setTimezone] = useState("Local time");
  const [reminders, setReminders] = useState<number[]>([]);
  const [filter, setFilter] = useState<"all" | "following" | "reminders">("all");

  useEffect(() => {
    const hydrateFrame = window.requestAnimationFrame(() => {
      setNow(Date.now());
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time");
    });
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.cancelAnimationFrame(hydrateFrame);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/schedule", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Upcoming fixture feed is unavailable");
        return response.json() as Promise<{
          entries: ScheduleEntry[];
          source: "txline-fixtures" | "verified-schedule";
          freshness: { verifiedAt: string | null; stale: boolean };
        }>;
      })
      .then((body) => {
        if (!active) return;
        setEntries(body.entries);
        setSource(body.source);
        setStale(body.freshness.stale);
        setVerifiedAt(body.freshness.verifiedAt);
        const availableIds = new Set(body.entries.map((entry) => entry.fixture.fixtureId));
        let stored: number[] = [];
        try {
          const parsed = JSON.parse(localStorage.getItem(REMINDER_KEY) ?? "[]") as unknown;
          if (Array.isArray(parsed)) stored = parsed.filter((value): value is number => Number.isSafeInteger(value));
        } catch { /* ignore malformed local preference */ }
        const valid = stored.filter((fixtureId) => availableIds.has(fixtureId));
        localStorage.setItem(REMINDER_KEY, JSON.stringify(valid));
        setReminders(valid);
      })
      .catch(() => {
        if (active) setEntries([]);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const shown = useMemo(
    () => filter === "reminders"
      ? entries.filter((entry) => reminders.includes(entry.fixture.fixtureId))
      : filter === "following"
        ? entries.filter((entry) => fixtureHasFollowedTeam(entry.fixture.homeTeam, entry.fixture.awayTeam, followedTeams))
        : entries,
    [entries, filter, followedTeams, reminders],
  );

  const toggleReminder = (fixtureId: number) => {
    setReminders((current) => {
      const next = current.includes(fixtureId) ? current.filter((id) => id !== fixtureId) : [...current, fixtureId];
      localStorage.setItem(REMINDER_KEY, JSON.stringify(next));
      return next;
    });
  };

  const downloadCalendar = (entry: ScheduleEntry) => {
    const blob = new Blob([buildFixtureCalendar(entry)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pulseproof-${entry.fixture.fixtureId}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="upcoming-hub" aria-label="Upcoming matches">
      <div className="upcoming-head">
        <div>
          <span className="eyebrow">Plan your matchday</span>
          <h2>Upcoming fixtures</h2>
          <p><Clock3 size={12} /> Times converted from UTC to <strong>{timezone}</strong></p>
        </div>
        <div className="upcoming-tools">
          <span className={`schedule-source ${source} ${stale ? "stale" : ""}`}><Radio size={11} /> {source === "txline-fixtures" ? "TxLINE snapshot" : stale ? "Schedule needs re-check" : "Cross-checked schedule"}</span>
          <div className="schedule-filters">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
            <button disabled={!followedTeams.length} className={filter === "following" ? "active" : ""} onClick={() => setFilter("following")}>Following {followedTeams.length || ""}</button>
            <button className={filter === "reminders" ? "active" : ""} onClick={() => setFilter("reminders")}><Bell size={11} /> Saved {reminders.length || ""}</button>
          </div>
        </div>
      </div>

      <div className="upcoming-list">
        {loading && <div className="schedule-empty">Loading fixture snapshot…</div>}
        {!loading && shown.map((entry, index) => {
          const home = getTeamBranding(entry.fixture.homeTeam);
          const away = getTeamBranding(entry.fixture.awayTeam);
          const kickoff = kickoffParts(entry.fixture.startTime);
          const saved = reminders.includes(entry.fixture.fixtureId);
          return (
            <article className={`upcoming-match ${index === 0 && filter === "all" ? "next" : ""} ${filter === "following" ? "personalized" : ""}`} key={entry.fixture.fixtureId}>
              <div className="upcoming-date">
                <span>{filter === "following" ? "For your followed team" : index === 0 && filter === "all" ? source === "txline-fixtures" ? "Next TxLINE-covered match" : "Next confirmed match" : entry.fixture.stage}</span>
                <strong>{kickoff.date}</strong>
                <small>{kickoff.time} · source {kickoff.utc}</small>
              </div>
              <div className="upcoming-teams">
                <span><span className="schedule-flag"><TeamFlag flagKey={home.flagKey} /></span><b>{home.code}</b><strong>{entry.fixture.homeTeam}</strong></span>
                <i>vs</i>
                <span><span className="schedule-flag"><TeamFlag flagKey={away.flagKey} /></span><b>{away.code}</b><strong>{entry.fixture.awayTeam}</strong></span>
              </div>
              <div className="upcoming-countdown"><span>Kick-off in</span><strong>{now ? formatKickoffCountdown(entry.fixture.startTime, now) : "—"}</strong></div>
              <div className="fixture-provenance">
                <span>{entry.coverage === "participants-pending" ? "Teams intentionally TBD" : entry.coverage === "txline-confirmed" ? "TxLINE fixture" : "Participants confirmed"}</span>
                {entry.provenance.sourceUrl ? <a href={entry.provenance.sourceUrl} target="_blank" rel="noreferrer">{entry.provenance.provider}</a> : <b>{entry.provenance.provider}</b>}
              </div>
              <div className="upcoming-actions">
                <button className={saved ? "saved" : ""} aria-pressed={saved} onClick={() => toggleReminder(entry.fixture.fixtureId)}>{saved ? <BellRing size={14} /> : <Bell size={14} />}{saved ? "Saved" : "Remind me"}</button>
                <button onClick={() => downloadCalendar(entry)}><CalendarPlus size={14} /> Calendar</button>
              </div>
            </article>
          );
        })}
        {!loading && !shown.length && <div className="schedule-empty">{filter === "reminders" ? "No saved matches yet. Choose Remind me on a fixture." : filter === "following" ? "No upcoming fixture currently includes a followed team." : "No future covered fixtures are currently published."}</div>}
      </div>
      {source === "verified-schedule" && <p className={`schedule-disclaimer ${stale ? "stale" : ""}`}>{stale ? "This fallback snapshot is older than six hours. Teams are never inferred; verify the linked sources or activate TxLINE before relying on it." : `Cross-checked ${verifiedAt ? new Date(verifiedAt).toLocaleString() : "recently"}. Final and third-place participants stay TBD until the semi-finals finish. An activated TxLINE token replaces this fallback with the current fixture snapshot.`}</p>}
    </section>
  );
}
