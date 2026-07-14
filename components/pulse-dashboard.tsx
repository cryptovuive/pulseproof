"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BadgeCheck,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Clock3,
  CloudOff,
  Compass,
  Download,
  Eye,
  EyeOff,
  Gift,
  Goal,
  Radio,
  RotateCcw,
  Share2,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Star,
  Trophy,
  Users,
  WalletCards,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import bs58 from "bs58";
import { Buffer } from "buffer";
import nacl from "tweetnacl";
import type { BrowserWallet } from "@/lib/solana-client";
import { submitMomentClaim } from "@/lib/solana-client";
import { getTeamBranding } from "@/lib/team-branding";
import { TeamFlag } from "@/components/team-flag";
import { MatchdayCommandCenter } from "@/components/matchday-command-center";
import { UpcomingMatchHub } from "@/components/upcoming-match-hub";
import {
  DEFAULT_FAN_PREFERENCES,
  filterMatches,
  fixtureHasFollowedTeam,
  normalizeFanPreferences,
  selectPreferredFixture,
  toggleFollowedTeam,
  type FanPreferences,
  type MatchFilter,
} from "@/lib/fan-preferences";
import {
  buildMatchAlert,
  DEFAULT_MATCH_ALERT_PREFERENCES,
  normalizeMatchAlertInbox,
  normalizeMatchAlertPreferences,
  shouldQueueMatchAlert,
  type MatchAlert,
  type MatchAlertPreferences,
} from "@/lib/matchday-alerts";
import { buildMatchBrief, freshnessLabel, sportingMoments } from "@/lib/match-experience";
import { pulseAtMoment, summarizeCatchUp } from "@/lib/pulse-replay";
import {
  buildSavedRecapPack,
  normalizeSavedRecaps,
  savedRecapOverview,
  upsertSavedRecap,
  type SavedRecapPack,
} from "@/lib/saved-recaps";
import type { MatchOverview, MatchPulse, MomentAttestation, PulseMoment } from "@/types/pulse";
import type { CatchUpCapsule, CatchUpCapsuleRedemption } from "@/types/pulse";

type StreamStatus = "connecting" | "live" | "complete" | "paused" | "error";
const JUDGE_DEMO_WALLET = "8qdg3U5FXJD8H5Y5Fv6hsWxJbPLwaUmyUUYyFYVLsAyV";
const FAN_PREFERENCES_KEY = "pulseproof.fan-preferences.v1";
const MATCH_ALERT_PREFERENCES_KEY = "pulseproof.match-alert-preferences.v1";
const MATCH_ALERT_INBOX_KEY = "pulseproof.match-alert-inbox.v1";
const SAVED_RECAPS_KEY = "pulseproof.saved-recaps.v1";
const TOUR_STEPS = [
  { target: "match-center", eyebrow: "01 · Choose", title: "Start with the fixture", body: "Every card states competition provenance, match stage, source coverage and whether the score is known." },
  { target: "command-center", eyebrow: "02 · Personalize", title: "Build your matchday", body: "Follow teams, see their next fixture, trace the road to the final and arm verified-event alerts without creating an account." },
  { target: "catch-up", eyebrow: "03 · Catch up", title: "Replay only what matters", body: "Spoiler Shield and progressive Catch-up let a late fan move from kick-off to now without future events leaking into the summary." },
  { target: "proof-of-watch", eyebrow: "04 · Verify", title: "Turn a moment into a receipt", body: "PulseProof re-checks the source event, verifies an Ed25519 attestation and can seal an anti-replay Fan Pass memory on Solana devnet." },
] as const;

function shortKey(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function verifyProof(attestation: Pick<MomentAttestation, "messageBase64" | "signatureBase64" | "attestorPublicKey">) {
  return nacl.sign.detached.verify(
    Buffer.from(attestation.messageBase64, "base64"),
    Buffer.from(attestation.signatureBase64, "base64"),
    bs58.decode(attestation.attestorPublicKey),
  );
}

const iconFor = (moment: PulseMoment) => {
  if (moment.type === "goal") return <Goal size={16} />;
  if (moment.type === "final") return <Trophy size={16} />;
  if (moment.type === "kickoff") return <CirclePlay size={16} />;
  if (moment.type === "card") return <span className={`card-icon ${moment.cardColor ?? "yellow"}`} />;
  if (moment.type === "var") return <span className="var-icon">VAR</span>;
  return <Zap size={15} />;
};

const competitionSourceLabel = (source: MatchPulse["fixture"]["competitionSource"]) => ({
  txline: "Competition from TxLINE",
  "verified-schedule": "Competition cross-checked with published schedule",
  "published-report": "Result cross-checked with published report",
  unavailable: "Competition not supplied by TxLINE",
})[source];

export function PulseDashboard() {
  const [pulses, setPulses] = useState<Record<number, MatchPulse>>({});
  const [matches, setMatches] = useState<MatchOverview[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<number>(0);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [playing, setPlaying] = useState(true);
  const [streamGeneration, setStreamGeneration] = useState(0);
  const [catchUp, setCatchUp] = useState<MatchPulse | null>(null);
  const [catchUpIndex, setCatchUpIndex] = useState(1);
  const [catchUpPlaying, setCatchUpPlaying] = useState(false);
  const [catchUpSpeed, setCatchUpSpeed] = useState(1);
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");
  const [preferences, setPreferences] = useState<FanPreferences>(DEFAULT_FAN_PREFERENCES);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [alertPreferences, setAlertPreferences] = useState<MatchAlertPreferences>(DEFAULT_MATCH_ALERT_PREFERENCES);
  const [alertInbox, setAlertInbox] = useState<MatchAlert[]>([]);
  const [alertsReady, setAlertsReady] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [savedRecaps, setSavedRecaps] = useState<SavedRecapPack[]>([]);
  const [savedRecapsReady, setSavedRecapsReady] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [revealedScores, setRevealedScores] = useState<Set<number>>(() => new Set());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [walletKey, setWalletKey] = useState<string>("");
  const [claiming, setClaiming] = useState<string>("");
  const [claimed, setClaimed] = useState<Record<string, { proof: boolean; signature?: string }>>({});
  const [notice, setNotice] = useState<string>("");
  const [judgeChecking, setJudgeChecking] = useState(false);
  const [judgeProof, setJudgeProof] = useState<MomentAttestation | null>(null);
  const [relayCapsule, setRelayCapsule] = useState<CatchUpCapsule | null>(null);
  const [relayUrl, setRelayUrl] = useState("");
  const [capsuleCreating, setCapsuleCreating] = useState(false);
  const [demoStep, setDemoStep] = useState("");
  const [roomVote, setRoomVote] = useState<"home" | "away" | "even" | null>(null);
  const [roomCounts, setRoomCounts] = useState({ home: 0, away: 0, even: 0 });
  const streamRef = useRef<EventSource | null>(null);
  const pulsesRef = useRef<Record<number, MatchPulse>>({});
  const preferencesRef = useRef<FanPreferences>(DEFAULT_FAN_PREFERENCES);
  const alertPreferencesRef = useRef<MatchAlertPreferences>(DEFAULT_MATCH_ALERT_PREFERENCES);
  const deliveredAlertIdsRef = useRef<Set<string>>(new Set());
  const alertTimersRef = useRef<Set<number>>(new Set());
  const demoRunRef = useRef(false);

  useEffect(() => { pulsesRef.current = pulses; }, [pulses]);
  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);
  useEffect(() => { alertPreferencesRef.current = alertPreferences; }, [alertPreferences]);

  const queueVerifiedAlert = useCallback((moment: PulseMoment, fixture: MatchPulse["fixture"]) => {
    const currentAlertPreferences = alertPreferencesRef.current;
    const fixtureIsFollowed = fixtureHasFollowedTeam(
      fixture.homeTeam,
      fixture.awayTeam,
      preferencesRef.current.followedTeams,
    );
    if (!shouldQueueMatchAlert(moment, currentAlertPreferences, fixtureIsFollowed)) return;
    const alertId = `${moment.fixtureId}:${moment.seq}`;
    if (deliveredAlertIdsRef.current.has(alertId)) return;
    deliveredAlertIdsRef.current.add(alertId);
    const timer = window.setTimeout(() => {
      alertTimersRef.current.delete(timer);
      const latestAlertPreferences = alertPreferencesRef.current;
      const stillFollowed = fixtureHasFollowedTeam(
        fixture.homeTeam,
        fixture.awayTeam,
        preferencesRef.current.followedTeams,
      );
      if (!shouldQueueMatchAlert(moment, latestAlertPreferences, stillFollowed)) return;
      const alert = buildMatchAlert(moment, fixture, preferencesRef.current.spoilerFree);
      setAlertInbox((current) => [alert, ...current.filter((item) => item.id !== alert.id)].slice(0, 20));
      if (latestAlertPreferences.systemNotifications && "Notification" in window && Notification.permission === "granted") {
        try { new Notification(alert.title, { body: alert.body, tag: alert.id }); } catch { /* in-app inbox remains available */ }
      }
    }, currentAlertPreferences.delaySeconds * 1_000);
    alertTimersRef.current.add(timer);
  }, []);

  const loadInitial = useCallback(async () => {
    const fixturesResponse = await fetch("/api/matches", { cache: "no-store" });
    if (!fixturesResponse.ok) throw new Error("Match feed is unavailable");
    const fixtureBody = (await fixturesResponse.json()) as { matches: MatchOverview[]; source: string };
    if (!fixtureBody.matches.length) throw new Error("No covered TxLINE fixture is available");
    const initial = await Promise.all(fixtureBody.matches.map(async ({ fixture, source }) => {
      const response = await fetch(`/api/matches/${fixture.fixtureId}${source === "demo-replay" ? "?mode=replay" : ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not initialise fixture ${fixture.fixtureId}`);
      return (await response.json()) as MatchPulse;
    }));
    const byId = Object.fromEntries(initial.map((item) => [item.fixture.fixtureId, item]));
    let savedPreferences = DEFAULT_FAN_PREFERENCES;
    try {
      savedPreferences = normalizeFanPreferences(JSON.parse(localStorage.getItem(FAN_PREFERENCES_KEY) ?? "null"));
    } catch {
      savedPreferences = DEFAULT_FAN_PREFERENCES;
    }
    const params = new URLSearchParams(window.location.search);
    const capsuleToken = params.get("capsule");
    let capsuleRedemption: CatchUpCapsuleRedemption | undefined;
    if (capsuleToken) {
      const capsuleResponse = await fetch(`/api/capsules?token=${encodeURIComponent(capsuleToken)}`, { cache: "no-store" });
      const capsuleBody = await capsuleResponse.json() as CatchUpCapsuleRedemption & { error?: string };
      if (!capsuleResponse.ok) throw new Error(capsuleBody.error ?? "This Catch-up Capsule is unavailable");
      if (!verifyProof(capsuleBody.capsule)) throw new Error("Catch-up Capsule signature did not verify in this browser");
      capsuleRedemption = capsuleBody;
      savedPreferences = { ...savedPreferences, spoilerFree: true };
    }
    const requestedFixtureId = Number(params.get("fixture"));
    const selected = selectPreferredFixture(
      fixtureBody.matches,
      capsuleRedemption?.pulse.fixture.fixtureId ?? (Number.isSafeInteger(requestedFixtureId) && requestedFixtureId > 0 ? requestedFixtureId : undefined),
      savedPreferences.lastFixtureId,
    );
    const streamFixtureIds = fixtureBody.matches
      .filter((match) => match.source !== "demo-replay")
      .map((match) => match.fixture.fixtureId);
    return { streamFixtureIds, matches: fixtureBody.matches, pulses: byId, selected, savedPreferences, capsuleRedemption };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let storedPreferences = DEFAULT_MATCH_ALERT_PREFERENCES;
      let storedInbox: MatchAlert[] = [];
      let storedRecaps: SavedRecapPack[] = [];
      try {
        storedPreferences = normalizeMatchAlertPreferences(JSON.parse(localStorage.getItem(MATCH_ALERT_PREFERENCES_KEY) ?? "null"));
        storedInbox = normalizeMatchAlertInbox(JSON.parse(localStorage.getItem(MATCH_ALERT_INBOX_KEY) ?? "[]"));
        storedRecaps = normalizeSavedRecaps(JSON.parse(localStorage.getItem(SAVED_RECAPS_KEY) ?? "[]"));
      } catch { /* malformed local state falls back safely */ }
      setAlertPreferences(storedPreferences);
      setAlertInbox(storedInbox);
      deliveredAlertIdsRef.current = new Set(storedInbox.map((alert) => alert.id));
      setSavedRecaps(storedRecaps);
      setNotificationPermission("Notification" in window ? Notification.permission : "unsupported");
      setAlertsReady(true);
      setSavedRecapsReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let active = true;
    void loadInitial()
      .then(({ streamFixtureIds, matches: loadedMatches, pulses: loadedPulses, selected, savedPreferences, capsuleRedemption }) => {
        if (!active) return;
        setMatches(loadedMatches);
        setPulses(loadedPulses);
        setSelectedFixtureId(selected);
        setPreferences({ ...savedPreferences, lastFixtureId: selected });
        if (capsuleRedemption) {
          setCatchUp(capsuleRedemption.pulse);
          setCatchUpIndex(1);
          setCatchUpPlaying(true);
          setRelayCapsule(capsuleRedemption.capsule);
          setRelayUrl(window.location.href);
          setNotice(`Verified safe relay: ${capsuleRedemption.capsule.payload.cursor} signed events, with no later moments delivered.`);
          window.setTimeout(() => document.getElementById("catch-up")?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
        }
        setPreferencesReady(true);
        setOfflineMode(false);
        if (!streamFixtureIds.length) {
          setStatus("complete");
          return;
        }
        const source = new EventSource(`/api/scores/stream?fixtureIds=${streamFixtureIds.join(",")}`);
        streamRef.current = source;
        source.addEventListener("ready", () => setStatus("live"));
        source.addEventListener("moment", (event) => {
          const moment = JSON.parse((event as MessageEvent).data) as PulseMoment;
          const currentPulse = pulsesRef.current[moment.fixtureId];
          if (currentPulse && !currentPulse.moments.some((item) => item.id === moment.id)) {
            queueVerifiedAlert(moment, currentPulse.fixture);
          }
          setPulses((current) => {
            const existing = current[moment.fixtureId];
            if (!existing || existing.moments.some((item) => item.id === moment.id)) return current;
            const updated = pulseAtMoment(
              { ...existing, moments: [...existing.moments, moment] },
              existing.moments.length + 1,
              existing.source === "demo-replay" ? "REPLAY" : "LIVE",
            );
            setMatches((items) => items.map((match) => match.fixture.fixtureId === moment.fixtureId ? {
              ...match,
              phase: updated.phase,
              minute: updated.minute,
              score: updated.score,
              scoreKnown: updated.moments.some((item) => Boolean(item.score)),
              updatedAt: updated.updatedAt,
              momentCount: updated.moments.length,
            } : match));
            return { ...current, [moment.fixtureId]: updated };
          });
        });
        source.addEventListener("pulse", (event) => {
          const update = JSON.parse((event as MessageEvent).data) as Partial<MatchPulse> & { fixtureId: number };
          setPulses((current) => current[update.fixtureId] ? { ...current, [update.fixtureId]: { ...current[update.fixtureId], ...update } } : current);
          setMatches((items) => items.map((match) => match.fixture.fixtureId === update.fixtureId ? { ...match, ...update } : match));
        });
        source.addEventListener("complete", () => setStatus("complete"));
        source.addEventListener("warning", (event) => {
          const warning = JSON.parse((event as MessageEvent).data) as { message?: string };
          setNotice(warning.message ?? "Live stream is reconnecting");
        });
        source.onerror = () => setStatus((current) => (current === "complete" ? current : "error"));
      })
      .catch((error: unknown) => {
        let storedRecaps: SavedRecapPack[] = [];
        let storedPreferences = DEFAULT_FAN_PREFERENCES;
        try {
          storedRecaps = normalizeSavedRecaps(JSON.parse(localStorage.getItem(SAVED_RECAPS_KEY) ?? "[]"));
          storedPreferences = normalizeFanPreferences(JSON.parse(localStorage.getItem(FAN_PREFERENCES_KEY) ?? "null"));
        } catch { /* malformed local fallback stays empty */ }
        if (active && storedRecaps.length) {
          const offlineMatches = storedRecaps.map(savedRecapOverview);
          const requestedFixtureId = Number(new URLSearchParams(window.location.search).get("fixture"));
          const selected = selectPreferredFixture(
            offlineMatches,
            Number.isSafeInteger(requestedFixtureId) && requestedFixtureId > 0 ? requestedFixtureId : undefined,
            storedPreferences.lastFixtureId,
          );
          setSavedRecaps(storedRecaps);
          setMatches(offlineMatches);
          setPulses(Object.fromEntries(storedRecaps.map((pack) => [pack.pulse.fixture.fixtureId, pack.pulse])));
          setSelectedFixtureId(selected);
          setPreferences({ ...storedPreferences, lastFixtureId: selected });
          setPreferencesReady(true);
          setOfflineMode(true);
          setPlaying(false);
          setStatus("paused");
          setNotice(`Network feed unavailable. Opened ${storedRecaps.length} saved recap${storedRecaps.length === 1 ? "" : "s"} from this device.`);
          return;
        }
        setStatus("error");
        setNotice(error instanceof Error ? error.message : "Unable to start PulseProof");
      });
    return () => {
      active = false;
      streamRef.current?.close();
    };
  }, [loadInitial, queueVerifiedAlert, streamGeneration]);

  useEffect(() => {
    if (!preferencesReady) return;
    localStorage.setItem(FAN_PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences, preferencesReady]);

  useEffect(() => {
    if (!alertsReady) return;
    localStorage.setItem(MATCH_ALERT_PREFERENCES_KEY, JSON.stringify(alertPreferences));
  }, [alertPreferences, alertsReady]);

  useEffect(() => {
    if (!alertsReady) return;
    localStorage.setItem(MATCH_ALERT_INBOX_KEY, JSON.stringify(alertInbox));
  }, [alertInbox, alertsReady]);

  useEffect(() => {
    if (!savedRecapsReady) return;
    localStorage.setItem(SAVED_RECAPS_KEY, JSON.stringify(savedRecaps));
  }, [savedRecaps, savedRecapsReady]);

  useEffect(() => () => {
    for (const timer of alertTimersRef.current) window.clearTimeout(timer);
    alertTimersRef.current.clear();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!catchUp || !catchUpPlaying) return;
    const timer = window.setInterval(() => {
      setCatchUpIndex((current) => {
        if (current >= catchUp.moments.length) {
          setCatchUpPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1_200 / catchUpSpeed);
    return () => window.clearInterval(timer);
  }, [catchUp, catchUpPlaying, catchUpSpeed]);

  const livePulse = pulses[selectedFixtureId] ?? null;
  const pulse = catchUp ? pulseAtMoment(catchUp, catchUpIndex) : livePulse;
  const visibleMatches = useMemo(
    () => filterMatches(matches, matchFilter, preferences.followedTeams),
    [matchFilter, matches, preferences.followedTeams],
  );
  const pulseReady = Boolean(pulse);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!pulseReady || demoRunRef.current || params.get("judgeDemo") !== "1") return;
    demoRunRef.current = true;
    const requestedDelay = Number(params.get("demoDelay") ?? 0);
    const demoDelay = Number.isFinite(requestedDelay) ? Math.max(0, Math.min(requestedDelay, 10_000)) : 0;
    const timers: number[] = [];
    const schedule = (delay: number, label: string, action: () => void) => {
      timers.push(window.setTimeout(() => {
        setDemoStep(label);
        action();
      }, delay));
    };
    // Instant positioning keeps the reproducible capture free of intermediate
    // compositor frames; normal user-driven navigation remains smooth elsewhere.
    const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "center" });

    setDemoStep("01 · Public product loaded from live deployment");
    schedule(demoDelay + 3_000, "02 · Finished score protected before Catch-up", () => {
      const shield = document.querySelector<HTMLButtonElement>('.my-pulse-bar button[aria-pressed="false"]');
      shield?.click();
      scroll("match-center");
    });
    schedule(demoDelay + 9_000, "03 · Starting real spoiler-safe Catch-up", () => {
      scroll("catch-up");
      window.setTimeout(() => document.querySelector<HTMLButtonElement>(".catchup-primary")?.click(), 900);
    });
    schedule(demoDelay + 20_000, "04 · Timeline advances from the visible event prefix", () => scroll("event-timeline"));
    schedule(demoDelay + 26_000, "05 · Signing a no-spoiler Catch-up Capsule", () => {
      scroll("catch-up");
      window.setTimeout(() => document.querySelector<HTMLButtonElement>(".capsule-share")?.click(), 700);
    });
    schedule(demoDelay + 33_000, "06 · Saving the consumer-safe recap on this device", () => {
      scroll("catch-up");
      window.setTimeout(() => document.querySelector<HTMLButtonElement>(".offline-save")?.click(), 700);
    });
    schedule(demoDelay + 43_000, "07 · Browser verifies a fresh Ed25519 receipt", () => {
      scroll("proof-of-watch");
      window.setTimeout(() => document.querySelector<HTMLButtonElement>(".judge-lab button")?.click(), 900);
    });
    schedule(demoDelay + 55_000, "08 · End-to-end product test complete", () => scroll("proof-of-watch"));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [pulseReady]);

  const toggleStream = () => {
    if (!pulse) return;
    if (playing) {
      streamRef.current?.close();
      setPlaying(false);
      setStatus("paused");
      return;
    }
    setPlaying(true);
    setStatus("connecting");
    setStreamGeneration((value) => value + 1);
  };

  const selectMatch = (fixtureId: number) => {
    setSelectedFixtureId(fixtureId);
    setCatchUp(null);
    setCatchUpPlaying(false);
    setRelayCapsule(null);
    setRelayUrl("");
    setRoomVote(null);
    setPreferences((current) => ({ ...current, lastFixtureId: fixtureId }));
    const url = new URL(window.location.href);
    url.searchParams.set("fixture", String(fixtureId));
    window.history.replaceState({}, "", url);
  };

  const toggleTeam = (team: string) => {
    setPreferences((current) => toggleFollowedTeam(current, team));
    setNotice(preferences.followedTeams.includes(team) ? `${team} removed from My Pulse.` : `${team} added to My Pulse.`);
  };

  const shareSelectedMatch = async () => {
    if (!pulse) return;
    const url = new URL(window.location.href);
    url.searchParams.set("fixture", String(pulse.fixture.fixtureId));
    try {
      await navigator.clipboard.writeText(url.toString());
      setNotice("Match link copied. It opens this exact fixture and resumes the same context.");
    } catch {
      setNotice(url.toString());
    }
  };

  const toggleSpoilerShield = () => {
    const next = !preferences.spoilerFree;
    setPreferences((current) => ({ ...current, spoilerFree: next }));
    if (next) setRevealedScores(new Set());
    setNotice(next ? "Spoiler Shield enabled for every finished match." : "Finished scores and recaps are visible again.");
  };

  const enableBrowserNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setNotice("This browser supports only the in-app Matchday Inbox.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      setAlertPreferences((current) => ({ ...current, enabled: true, systemNotifications: true }));
      setNotice("Browser notifications enabled. Alert delay and Spoiler Shield still apply.");
    } else {
      setAlertPreferences((current) => ({ ...current, systemNotifications: false }));
      setNotice(permission === "denied" ? "Browser notifications are blocked. The in-app inbox still works." : "Notification permission was not enabled.");
    }
  };

  const moveTour = (nextStep: number | null) => {
    setTourStep(nextStep);
    if (nextStep === null) return;
    window.setTimeout(() => document.getElementById(TOUR_STEPS[nextStep].target)?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
  };

  const toggleSavedRecap = () => {
    if (!livePulse) return;
    const fixtureId = livePulse.fixture.fixtureId;
    if (savedRecaps.some((pack) => pack.pulse.fixture.fixtureId === fixtureId)) {
      setSavedRecaps((current) => current.filter((pack) => pack.pulse.fixture.fixtureId !== fixtureId));
      setNotice("Offline recap removed from this device.");
      return;
    }
    try {
      const pack = buildSavedRecapPack(livePulse);
      setSavedRecaps((current) => upsertSavedRecap(current, pack));
      setNotice(`Offline recap saved: ${pack.pulse.moments.length} on-pitch moments, no technical metadata or raw feed archive.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "This recap cannot be saved yet");
    }
  };

  const startCatchUp = async () => {
    if (!livePulse) return;
    try {
      let full = livePulse;
      if (!offlineMode) {
        const query = livePulse.source === "demo-replay" ? "?mode=replay" : livePulse.phase === "FT" ? "?historical=true" : "";
        const response = await fetch(`/api/matches/${livePulse.fixture.fixtureId}${query}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Historical match log is not available yet");
        full = (await response.json()) as MatchPulse;
      }
      const signals = sportingMoments(full.moments);
      if (!signals.length) throw new Error("No on-pitch moments are available for catch-up yet");
      const replay = { ...full, moments: signals };
      setCatchUp(replay);
      setCatchUpIndex(1);
      setCatchUpPlaying(true);
      setRelayCapsule(null);
      setRelayUrl("");
      setNotice(`Catch-up loaded: ${signals.length} on-pitch moments. Metadata updates are hidden.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load catch-up");
    }
  };

  const shareCatchUpCapsule = async () => {
    if (!catchUp || offlineMode) return;
    setCapsuleCreating(true);
    try {
      const response = await fetch("/api/capsules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fixtureId: catchUp.fixture.fixtureId,
          cursor: catchUpIndex,
          mode: catchUp.source === "demo-replay" ? "replay" : "live",
        }),
      });
      const body = await response.json() as { capsule: CatchUpCapsule; token: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not create a Catch-up Capsule");
      if (!verifyProof(body.capsule)) throw new Error("New capsule signature did not verify locally");
      const url = new URL("/", window.location.origin);
      url.searchParams.set("fixture", String(catchUp.fixture.fixtureId));
      url.searchParams.set("capsule", body.token);
      setRelayCapsule(body.capsule);
      setRelayUrl(url.toString());
      setNotice(`Signed safe relay ready: exactly ${body.capsule.payload.cursor} visible events, zero future-event payloads.`);
      const copied = await Promise.race([
        navigator.clipboard.writeText(url.toString()).then(() => true).catch(() => false),
        new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 1_200)),
      ]);
      setNotice(copied
        ? `Signed safe relay copied: exactly ${body.capsule.payload.cursor} visible events, zero future-event payloads.`
        : "Signed safe relay verified. Clipboard access is unavailable; the Open signed relay link is ready below.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create a Catch-up Capsule");
    } finally {
      setCapsuleCreating(false);
    }
  };

  const connectWallet = async () => {
    if (wallet && walletKey) {
      await wallet.disconnect();
      setWallet(null);
      setWalletKey("");
      setNotice("Wallet disconnected. Your local match view remains available.");
      return;
    }
    const provider = window.solana;
    if (!provider?.isPhantom) {
      setNotice("Phantom was not detected. Install it or open this demo in a wallet-enabled browser.");
      return;
    }
    try {
      const result = await provider.connect();
      setWallet(provider);
      setWalletKey(result.publicKey.toBase58());
      setNotice("Wallet connected. You can now seal a moment on Solana.");
    } catch {
      setNotice("Wallet connection was cancelled.");
    }
  };

  const claimMoment = async (moment: PulseMoment) => {
    if (offlineMode) {
      setNotice("Reconnect to re-check this saved moment before requesting an attestation.");
      return;
    }
    if (!pulse || !walletKey) {
      await connectWallet();
      return;
    }
    setClaiming(moment.id);
    setNotice("Checking this moment against the server-side TxLINE feed…");
    try {
      const response = await fetch("/api/attest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: walletKey,
          fixtureId: moment.fixtureId,
          momentId: moment.id,
          mode: pulse.source === "demo-replay" ? "replay" : "live",
        }),
      });
      const body = (await response.json()) as MomentAttestation & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Moment attestation failed");
      if (!verifyProof(body)) throw new Error("Attestor signature did not verify locally");

      setClaimed((current) => ({ ...current, [moment.id]: { proof: true } }));
      if (!wallet) {
        setNotice("Attestation verified. Reconnect the wallet to write it on-chain.");
        return;
      }
      try {
        const signature = await submitMomentClaim(wallet, body);
        setClaimed((current) => ({ ...current, [moment.id]: { proof: true, signature } }));
        setNotice(`Moment sealed on Solana: ${shortKey(signature)}`);
      } catch (chainError) {
        setNotice(
          `Proof verified off-chain. Devnet write is pending contract deployment (${chainError instanceof Error ? chainError.message : "transaction unavailable"}).`,
        );
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not claim this moment");
    } finally {
      setClaiming("");
    }
  };

  const verifyForJudge = async () => {
    if (offlineMode) {
      setNotice("Judge verification requires a live connection to issue a fresh short-lived attestation.");
      return;
    }
    const moment = pulse?.moments.at(-1);
    if (!pulse || !moment) return;
    setJudgeChecking(true);
    setJudgeProof(null);
    try {
      const response = await fetch("/api/attest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: JUDGE_DEMO_WALLET,
          fixtureId: moment.fixtureId,
          momentId: moment.id,
          mode: pulse.source === "demo-replay" ? "replay" : "live",
        }),
      });
      const proof = (await response.json()) as MomentAttestation & { error?: string };
      if (!response.ok) throw new Error(proof.error ?? "Judge proof could not be issued");
      if (!verifyProof(proof)) throw new Error("Local Ed25519 verification failed");
      setJudgeProof(proof);
      setNotice("Judge proof verified locally: data, wallet, evidence and expiry are cryptographically bound.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Judge verification failed");
    } finally {
      setJudgeChecking(false);
    }
  };

  const points = useMemo(
    () => (pulse?.moments ?? []).reduce((sum, moment) => sum + (claimed[moment.id]?.proof ? moment.points : 0), 0),
    [claimed, pulse],
  );
  const claimedCount = Object.keys(claimed).length;
  const roomTotal = roomCounts.home + roomCounts.away + roomCounts.even;
  const roomPercent = (value: number) => roomTotal ? Math.round((value / roomTotal) * 100) : 0;
  const voteInRoom = (choice: "home" | "away" | "even") => {
    if (roomVote) return;
    setRoomVote(choice);
    setRoomCounts((current) => ({ ...current, [choice]: current[choice] + 1 }));
    setNotice("Your fan pulse was counted locally. No stake, payment or reward is attached.");
  };

  if (!pulse) {
    return (
      <main className="loading-shell">
        <div className="loading-mark"><Activity size={28} /> PULSEPROOF</div>
        <div className="loading-line"><span /></div>
        <p>{notice || "Connecting to the match pulse…"}</p>
      </main>
    );
  }

  const signalMoments = sportingMoments(pulse.moments);
  const latest = signalMoments.at(-1);
  const displayMinute = latest?.minuteLabel ?? pulse.minute;
  const homeBrand = getTeamBranding(pulse.fixture.homeTeam);
  const awayBrand = getTeamBranding(pulse.fixture.awayTeam);
  const txLineDevnet = !offlineMode && pulse.source !== "demo-replay" && pulse.provenance?.provider.includes("devnet");
  const competitionEvidenceUrl = pulse.provenance?.sourceUrl ?? pulse.fixture.competitionSourceUrl;
  const hasSignalMoments = signalMoments.length > 0;
  const scoreKnown = pulse.source === "demo-replay" || pulse.moments.some((moment) => Boolean(moment.score));
  const spoilerProtected = preferences.spoilerFree && livePulse?.phase === "FT" && !catchUp && !revealedScores.has(pulse.fixture.fixtureId);
  const scoreVisible = scoreKnown && !spoilerProtected;
  const statusLabel = offlineMode ? "Offline library" : catchUp ? "Catch-up" : status === "live" ? (pulse.source === "demo-replay" ? "Demo replay" : "TxLINE connected") : status;
  const catchUpSummary = catchUp ? summarizeCatchUp(pulse.moments) : null;
  const matchBrief = buildMatchBrief(pulse);
  const hiddenMetadataCount = pulse.moments.length - signalMoments.length;
  const currentSavedRecap = savedRecaps.find((pack) => pack.pulse.fixture.fixtureId === pulse.fixture.fixtureId);
  const freshness = offlineMode && currentSavedRecap
    ? `Saved offline · ${new Date(currentSavedRecap.savedAt).toLocaleString()}`
    : freshnessLabel(pulse, nowMs);
  const homeFollowed = preferences.followedTeams.includes(pulse.fixture.homeTeam);
  const awayFollowed = preferences.followedTeams.includes(pulse.fixture.awayTeam);
  const recapSaved = Boolean(currentSavedRecap);

  return (
    <main className="app-shell">
      {demoStep && <div className="judge-demo-run" role="status"><span>LIVE WALKTHROUGH</span><b>{demoStep}</b><small>Actions call the same production UI and endpoints available to every judge.</small></div>}
      <header className="topbar">
        <a className="brand" href="#top" aria-label="PulseProof home">
          <span className="brand-mark"><Activity size={19} /></span>
          <span>PULSE<span>PROOF</span></span>
        </a>
        <div className="top-actions">
          <div className={`network-pill ${status}`}>
            {offlineMode ? <CloudOff size={14} /> : status === "live" || status === "complete" ? <Wifi size={14} /> : <WifiOff size={14} />}
            {statusLabel}
          </div>
          <button className="tour-button" aria-label="Open quick product tour" onClick={() => moveTour(0)}><Compass size={15} /> Quick tour</button>
          <a className="fan-zone-link" href="/fan-zone"><Gift size={15} /> Fan Zone</a>
          <a className="submission-link" href="/submission"><ShieldCheck size={15} /> Judge room</a>
          <button className="wallet-button" onClick={connectWallet}>
            <WalletCards size={16} />
            {walletKey ? shortKey(walletKey) : "Connect wallet"}
          </button>
        </div>
      </header>

      <section className="demo-banner" role="note">
        <div>{offlineMode ? <CloudOff size={14} /> : <Radio size={14} />} {offlineMode ? "Offline recap pack" : pulse.source === "demo-replay" ? "Labelled demo mode" : txLineDevnet ? "TxLINE devnet coverage" : "Live TxLINE mode"}</div>
        <p>
          {offlineMode
            ? "This device is showing a locally saved, consumer-safe recap. Live APIs, attestations and claims remain disabled until reconnection."
            : pulse.source === "demo-replay"
            ? "Results and key moments are cross-checked from published reports; demo sequence IDs are not represented as TxLINE-verified data."
            : txLineDevnet
              ? pulse.fixture.competitionSource === "verified-schedule"
                ? "Fixture ID, teams and events come from TxLINE devnet; competition, round and kick-off are cross-checked separately against the published World Cup schedule."
                : "Fixture IDs, teams and events come from the activated TxLINE devnet feed. Missing competition or kick-off fields stay explicitly unavailable; the official schedule is sourced separately."
            : "Scores and match events are being read from TxLINE's live SSE feed using an activated Solana subscription."}
        </p>
        {competitionEvidenceUrl && <a className="banner-source" href={competitionEvidenceUrl} target="_blank" rel="noreferrer">Source · {pulse.provenance?.sourceUrl ? pulse.provenance.provider : competitionSourceLabel(pulse.fixture.competitionSource)}</a>}
        <button disabled={offlineMode} onClick={toggleStream}>{offlineMode ? <CloudOff size={15} /> : playing ? <CirclePause size={15} /> : <CirclePlay size={15} />} {offlineMode ? "Offline" : playing ? "Pause" : "Restart"}</button>
      </section>

      <section className="my-pulse-bar" aria-label="My Pulse preferences">
        <div><Star size={15} fill={preferences.followedTeams.length ? "currentColor" : "none"} /><span>My Pulse</span><b>{preferences.followedTeams.length} followed team{preferences.followedTeams.length === 1 ? "" : "s"}</b></div>
        <p>{preferences.followedTeams.length ? preferences.followedTeams.join(" · ") : "Follow a team below to create your personal matchday feed."}</p>
        <button disabled={!preferences.followedTeams.length} onClick={() => setMatchFilter("mine")}><Star size={13} /> My matches</button>
        <button className={preferences.spoilerFree ? "active" : ""} aria-pressed={preferences.spoilerFree} onClick={toggleSpoilerShield}>
          {preferences.spoilerFree ? <EyeOff size={13} /> : <Eye size={13} />} {preferences.spoilerFree ? "Spoiler shield on" : "Hide finished scores"}
        </button>
      </section>

      <section className="match-center" id="match-center" aria-label="Match center">
        <div className="match-center-head">
          <div><span className="eyebrow">Multi-match center</span><h2>Follow every covered fixture</h2></div>
          <div className="match-filters" aria-label="Filter matches">
            {(["all", "live", "finished", "mine"] as const).map((filter) => (
              <button key={filter} className={matchFilter === filter ? "active" : ""} onClick={() => setMatchFilter(filter)}>{filter}</button>
            ))}
          </div>
        </div>
        <div className="match-strip">
          {visibleMatches.map((match) => {
            const home = getTeamBranding(match.fixture.homeTeam);
            const away = getTeamBranding(match.fixture.awayTeam);
            const hideScore = preferences.spoilerFree && match.phase === "FT" && !revealedScores.has(match.fixture.fixtureId);
            return (
              <button
                className={`match-tile ${match.fixture.fixtureId === selectedFixtureId ? "selected" : ""}`}
                key={match.fixture.fixtureId}
                onClick={() => selectMatch(match.fixture.fixtureId)}
                aria-pressed={match.fixture.fixtureId === selectedFixtureId}
              >
                <span className="match-tile-top"><b>{match.phase}</b><small>{match.phase === "FT" ? "Full time" : match.minute ? `${match.minute}'` : match.phase === "COVERED" ? "Metadata only" : match.phase === "WAITING" ? "Awaiting events" : "Scheduled"}</small></span>
                <span className={`match-competition ${match.fixture.competition === "FIFA World Cup 2026" ? "world-cup" : "unverified"}`}>{match.fixture.competition}</span>
                <span className="match-stage"><span>{match.fixture.stage}</span><small>{competitionSourceLabel(match.fixture.competitionSource)}</small></span>
                <span className="match-tile-team"><span className="match-flag"><TeamFlag flagKey={home.flagKey} /></span><strong>{home.code}</strong><b>{hideScore ? "•" : match.scoreKnown ? match.score[0] : "–"}</b></span>
                <span className="match-tile-team"><span className="match-flag"><TeamFlag flagKey={away.flagKey} /></span><strong>{away.code}</strong><b>{hideScore ? "•" : match.scoreKnown ? match.score[1] : "–"}</b></span>
                <span className="match-tile-foot">{hideScore ? <EyeOff size={11} /> : <Radio size={11} />} {hideScore ? "Result hidden · open spoiler-free" : `${match.momentCount} ${match.source === "demo-replay" ? "report events · open recap" : "source records"}`}</span>
              </button>
            );
          })}
          {!visibleMatches.length && <div className="empty-matches">{matchFilter === "mine" ? "Follow France, Spain or another team below to build My Matches." : "No fixtures in this filter."}</div>}
        </div>
      </section>

      <MatchdayCommandCenter
        pulse={pulse}
        followedTeams={preferences.followedTeams}
        spoilerFree={preferences.spoilerFree}
        alertPreferences={alertPreferences}
        alerts={alertInbox}
        savedRecapCount={savedRecaps.length}
        offlineMode={offlineMode}
        notificationPermission={notificationPermission}
        onAlertPreferencesChange={setAlertPreferences}
        onEnableBrowserNotifications={() => void enableBrowserNotifications()}
        onClearAlerts={() => setAlertInbox([])}
      />

      <UpcomingMatchHub followedTeams={preferences.followedTeams} />

      <div className="dashboard-grid" id="top">
        <section className="main-column">
          <article className={`catchup-card panel ${catchUp ? "active" : ""}`} id="catch-up">
            <div className="catchup-intro">
              <span className="catchup-icon"><RotateCcw size={19} /></span>
              <div><span className="eyebrow">Missed the action?</span><h2>{catchUp ? "Catch-up is playing" : "Understand the match in 90 seconds"}</h2><p>Replay only the signal events—goals, pressure swings, cards and VAR—without watching the full broadcast.</p></div>
              <div className="catchup-actions">
                {!catchUp ? <button className="catchup-primary" disabled={!hasSignalMoments} onClick={() => void startCatchUp()}><CirclePlay size={16} /> {hasSignalMoments ? "Start catch-up" : "No match moments yet"}</button> : <button className="catchup-exit" onClick={() => { setCatchUp(null); setCatchUpPlaying(false); setRelayCapsule(null); setRelayUrl(""); }}><Radio size={14} /> {offlineMode ? "Return to saved recap" : "Return live"}</button>}
                {catchUp && !offlineMode && <button className="capsule-share" disabled={capsuleCreating} onClick={() => void shareCatchUpCapsule()}><Share2 size={14} /> {capsuleCreating ? "Signing…" : "Share safe relay"}</button>}
                {livePulse?.phase === "FT" && hasSignalMoments && <button className={`offline-save ${recapSaved ? "saved" : ""}`} aria-pressed={recapSaved} onClick={toggleSavedRecap}><Download size={14} /> {recapSaved ? "Saved offline" : "Save offline"}</button>}
              </div>
            </div>
            {relayCapsule && <div className="relay-proof" role="status"><ShieldCheck size={15} /><div><b>Verified Catch-up Capsule</b><span>Ed25519 signed · {relayCapsule.payload.cursor} event prefix · expires {new Date(relayCapsule.payload.expiresAt * 1_000).toLocaleDateString()}</span></div>{relayUrl && <a href={relayUrl} target="_blank" rel="noreferrer">Open signed relay</a>}<code>{relayCapsule.payload.prefixHash.slice(0, 10)}…{relayCapsule.payload.prefixHash.slice(-8)}</code></div>}
            {catchUp && catchUpSummary && (
              <div className="catchup-controls">
                <button className="replay-toggle" onClick={() => setCatchUpPlaying((value) => !value)} aria-label={catchUpPlaying ? "Pause catch-up" : "Play catch-up"}>{catchUpPlaying ? <CirclePause size={20} /> : <CirclePlay size={20} />}</button>
                <div className="replay-progress">
                  <div><span>Event {catchUpIndex} / {catchUp.moments.length}</span><strong>{pulse.minute}&apos; · {pulse.phase}</strong></div>
                  <input aria-label="Catch-up position" type="range" min="1" max={catchUp.moments.length} value={catchUpIndex} onChange={(event) => { setCatchUpIndex(Number(event.target.value)); setCatchUpPlaying(false); }} />
                </div>
                <div className="speed-controls" aria-label="Playback speed">
                  {[1, 2, 4].map((speed) => <button key={speed} className={catchUpSpeed === speed ? "active" : ""} onClick={() => setCatchUpSpeed(speed)}>{speed}×</button>)}
                </div>
                <button className="skip-end" onClick={() => { setCatchUpIndex(catchUp.moments.length); setCatchUpPlaying(false); }}><SkipForward size={15} /> Latest</button>
                <div className="catchup-stats"><span><b>{catchUpSummary.goals}</b> goals</span><span><b>{catchUpSummary.cards}</b> cards</span><span><b>{catchUpSummary.reviews}</b> VAR</span></div>
              </div>
            )}
          </article>

          <article className="scoreboard panel">
            <div className="scoreboard-meta">
              <div><span className="live-dot" /> {pulse.phase}</div>
              <span className="competition-meta"><b>{pulse.fixture.competition}</b><small>{pulse.fixture.stage}</small><em>{competitionSourceLabel(pulse.fixture.competitionSource)}</em></span>
              <span><Clock3 size={13} /> {displayMinute}&apos;</span>
            </div>
            <div className="freshness-row"><span><Wifi size={12} /> {freshness}</span><button onClick={() => void shareSelectedMatch()}><Share2 size={12} /> Copy match link</button></div>
            <div className="teams">
              <div className="team team-home">
                <div className="team-orb" role="img" aria-label={`${homeBrand.canonicalName} flag, team code ${homeBrand.code}`}>
                  <TeamFlag flagKey={homeBrand.flagKey} className="flag-svg" />
                  <span className="team-code" aria-hidden="true">{homeBrand.code}</span>
                </div>
                <h1>{pulse.fixture.homeTeam}</h1>
                <span>Home</span>
                <button className={`team-follow ${homeFollowed ? "active" : ""}`} aria-pressed={homeFollowed} onClick={() => toggleTeam(pulse.fixture.homeTeam)}><Star size={12} fill={homeFollowed ? "currentColor" : "none"} /> {homeFollowed ? "Following" : "Follow"}</button>
              </div>
              <div className="score">
                <strong>{scoreVisible ? pulse.score[0] : spoilerProtected ? "•" : "–"}</strong><i>:</i><strong>{scoreVisible ? pulse.score[1] : spoilerProtected ? "•" : "–"}</strong>
                <small>Fixture #{pulse.fixture.fixtureId}</small>
                {spoilerProtected && <button className="reveal-score" onClick={() => setRevealedScores((current) => new Set(current).add(pulse.fixture.fixtureId))}><Eye size={12} /> Reveal result</button>}
              </div>
              <div className="team team-away">
                <div className="team-orb" role="img" aria-label={`${awayBrand.canonicalName} flag, team code ${awayBrand.code}`}>
                  <TeamFlag flagKey={awayBrand.flagKey} className="flag-svg" />
                  <span className="team-code" aria-hidden="true">{awayBrand.code}</span>
                </div>
                <h1>{pulse.fixture.awayTeam}</h1>
                <span>Away</span>
                <button className={`team-follow ${awayFollowed ? "active" : ""}`} aria-pressed={awayFollowed} onClick={() => toggleTeam(pulse.fixture.awayTeam)}><Star size={12} fill={awayFollowed ? "currentColor" : "none"} /> {awayFollowed ? "Following" : "Follow"}</button>
              </div>
            </div>
            <div className="momentum-block">
              <div className="section-label"><span>Match pulse</span><span>{spoilerProtected ? "Protected" : hasSignalMoments ? `${pulse.momentum}% · ${100 - pulse.momentum}%` : "Awaiting sporting events"}</span></div>
              {spoilerProtected ? <div className="momentum-labels"><span>Spoiler Shield also hides the final momentum balance.</span></div> : hasSignalMoments ? <>
                <div className="momentum-track"><span style={{ width: `${pulse.momentum}%` }} /></div>
                <div className="momentum-labels"><span>{pulse.fixture.homeTeam} pressure</span><span>{pulse.fixture.awayTeam} pressure</span></div>
              </> : <div className="momentum-labels"><span>Coverage metadata only — no pressure estimate yet.</span></div>}
            </div>
          </article>

          <article className="pulse-card panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">{spoilerProtected ? "Spoiler shield" : pulse.phase === "FT" ? "Match brief" : "Latest signal"}</span>
                <h2>{spoilerProtected ? "The result is protected" : matchBrief.headline}</h2>
              </div>
              <div className="signal-icon">{spoilerProtected ? <EyeOff size={22} /> : <Zap size={22} />}</div>
            </div>
            {spoilerProtected
              ? <p>Start Catch-up to experience the match from kick-off, or reveal the full result when you are ready.</p>
              : <div className="brief-lines">{matchBrief.lines.map((line) => <p key={line}>{line}</p>)}</div>}
            <div className="explain-row">
              <Sparkles size={15} /> {spoilerProtected ? "No score, scorer or card details are exposed until you choose." : `Built deterministically from ${signalMoments.length} on-pitch source event${signalMoments.length === 1 ? "" : "s"}; no unsupported stats are inferred.`}
            </div>
          </article>

          <article className="timeline panel" id="event-timeline">
            <div className="panel-heading compact">
              <div><span className="eyebrow">On-pitch timeline</span><h2>{spoilerProtected ? "Timeline protected" : hasSignalMoments ? "Moments that moved the match" : "Waiting for sporting events"}</h2></div>
              <span className="event-count">{signalMoments.length} on-pitch</span>
            </div>
            <div className="timeline-list">
              {spoilerProtected ? (
                <div className="timeline-empty"><EyeOff size={20} /><strong>Spoiler shield is active</strong><span>Use Catch-up for a progressive replay, or reveal the result above.</span></div>
              ) : [...signalMoments].reverse().map((moment) => (
                <div className={`timeline-item ${moment.type}`} key={moment.id}>
                  <div className="minute">{moment.minuteLabel ?? moment.minute}&apos;</div>
                  <div className="event-node">{iconFor(moment)}</div>
                  <div className="event-copy">
                    <strong>{moment.title}</strong>
                    <span>{moment.description}</span>
                    {(moment.participant || moment.assist || moment.cardColor || moment.varOutcome) && (
                      <span className="event-details">
                        {moment.participant && <b>{moment.type === "goal" ? "Scorer" : moment.type === "card" ? "Player" : "Participant"}: {moment.participant}</b>}
                        {moment.assist && <b>Assist: {moment.assist}</b>}
                        {moment.cardColor && <b className={moment.cardColor}>{moment.cardColor} card</b>}
                        {moment.varOutcome && <b>VAR: {moment.varOutcome}</b>}
                      </span>
                    )}
                    <small><ShieldCheck size={12} /> {offlineMode ? "Saved consumer recap" : moment.verified ? "TxLINE feed event" : "Published-report replay"} · seq {moment.seq}</small>
                  </div>
                  <button
                    className={`claim-button ${claimed[moment.id]?.proof ? "claimed" : ""}`}
                    disabled={offlineMode || moment.points <= 0 || moment.badge <= 0 || claiming === moment.id || claimed[moment.id]?.proof}
                    onClick={() => void claimMoment(moment)}
                  >
                    {claimed[moment.id]?.signature ? <BadgeCheck size={15} /> : claimed[moment.id]?.proof ? <ShieldCheck size={15} /> : <Sparkles size={14} />}
                    {offlineMode ? "Reconnect" : claiming === moment.id ? "Checking…" : claimed[moment.id]?.signature ? "On-chain" : claimed[moment.id]?.proof ? "Verified" : moment.points > 0 && moment.badge > 0 ? `+${moment.points}` : "Metadata"}
                  </button>
                </div>
              ))}
              {!spoilerProtected && !signalMoments.length && <div className="timeline-empty"><Radio size={20} /><strong>TxLINE is connected</strong><span>No goal, shot, card, VAR or phase event has arrived. {hiddenMetadataCount ? `${hiddenMetadataCount} technical metadata update${hiddenMetadataCount === 1 ? " is" : "s are"} hidden from this consumer timeline.` : ""}</span></div>}
            </div>
          </article>
        </section>

        <aside className="side-column">
          <article className="passport panel">
            <div className="passport-top">
              <span>Proof of Watch</span>
              <ShieldCheck size={19} />
            </div>
            <div className="passport-score"><strong>{points}</strong><span>fan points</span></div>
            <div className="passport-stats">
              <div><strong>{claimedCount}</strong><span>Moments</span></div>
              <div><strong>{new Set(Object.keys(claimed).map((id) => pulse.moments.find((m) => m.id === id)?.badge)).size}</strong><span>Badges</span></div>
              <div><strong>{walletKey ? "1" : "0"}</strong><span>Wallet</span></div>
            </div>
            <div className="passport-foot"><span>{walletKey ? shortKey(walletKey) : "Connect to start"}</span><span>DEVNET</span></div>
          </article>

          <article className="room-card panel">
            <div className="room-title"><Users size={17} /><span>Watch room</span><b>{roomTotal} fans</b></div>
            <h3>{hasSignalMoments ? "Who owns the next ten minutes?" : "Fan room preview"}</h3>
            <p>This prototype vote stays local to your browser. No wagers, no entry fee—just a shared fan pulse.</p>
            <div className="room-options">
              <button className={roomVote === "home" ? "active" : ""} aria-pressed={roomVote === "home"} onClick={() => voteInRoom("home")}><span className="mini-orb flag-mini" aria-hidden="true"><TeamFlag flagKey={homeBrand.flagKey} className="mini-flag-svg" /></span>{pulse.fixture.homeTeam}<b>{roomPercent(roomCounts.home)}%</b></button>
              <button className={roomVote === "away" ? "active" : ""} aria-pressed={roomVote === "away"} onClick={() => voteInRoom("away")}><span className="mini-orb flag-mini" aria-hidden="true"><TeamFlag flagKey={awayBrand.flagKey} className="mini-flag-svg" /></span>{pulse.fixture.awayTeam}<b>{roomPercent(roomCounts.away)}%</b></button>
              <button className={roomVote === "even" ? "active" : ""} aria-pressed={roomVote === "even"} onClick={() => voteInRoom("even")}><span className="mini-orb neutral">–</span>Even<b>{roomPercent(roomCounts.even)}%</b></button>
            </div>
          </article>

          <article className="trust-card panel" id="proof-of-watch">
            <span className="eyebrow">Why trust this?</span>
            <h3>Sports data with receipts.</h3>
            <div className="trust-step"><span>01</span><p><strong>TxLINE event</strong>Live score/action enters the server.</p></div>
            <div className="trust-step"><span>02</span><p><strong>Attested moment</strong>Server checks fixture + sequence and signs.</p></div>
            <div className="trust-step"><span>03</span><p><strong>Solana memory</strong>Contract prevents replay and updates your pass.</p></div>
            <div className="judge-lab">
              <div><span>Judge verification lab</span><b>No wallet · No SOL</b></div>
              <p>Issue and verify a real short-lived Ed25519 attestation for the latest visible event.</p>
              <button disabled={judgeChecking || offlineMode} onClick={() => void verifyForJudge()}>{judgeProof ? <BadgeCheck size={14} /> : offlineMode ? <CloudOff size={14} /> : <ShieldCheck size={14} />}{offlineMode ? "Reconnect to verify" : judgeChecking ? "Verifying…" : judgeProof ? "Proof verified" : "Verify sample proof"}</button>
              {judgeProof && <small><span>Evidence</span><code>{judgeProof.payload.evidenceHash.slice(0, 10)}…{judgeProof.payload.evidenceHash.slice(-8)}</code><span>Expires</span><code>{new Date(judgeProof.payload.expiresAt * 1_000).toLocaleTimeString()}</code></small>}
            </div>
            <a href="https://txline.txodds.com/documentation/worldcup" target="_blank" rel="noreferrer">Read the data flow <ChevronRight size={14} /></a>
          </article>
        </aside>
      </div>

      {tourStep !== null && (
        <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="PulseProof product tour">
          <div className="tour-card">
            <div><span>{TOUR_STEPS[tourStep].eyebrow}</span><b>{tourStep + 1} / {TOUR_STEPS.length}</b></div>
            <h2>{TOUR_STEPS[tourStep].title}</h2>
            <p>{TOUR_STEPS[tourStep].body}</p>
            <div className="tour-progress">{TOUR_STEPS.map((step, index) => <span key={step.target} className={index <= tourStep ? "active" : ""} />)}</div>
            <div className="tour-actions">
              <button onClick={() => moveTour(null)}>Close</button>
              {tourStep > 0 && <button onClick={() => moveTour(tourStep - 1)}>Back</button>}
              <button className="primary" onClick={() => tourStep === TOUR_STEPS.length - 1 ? moveTour(null) : moveTour(tourStep + 1)}>{tourStep === TOUR_STEPS.length - 1 ? "Explore PulseProof" : "Next"}<ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      )}

      {notice && <button className="toast" aria-live="polite" onClick={() => setNotice("")}><span>{notice}</span><span aria-hidden="true">×</span></button>}
      <footer><span>PulseProof · Built for TxODDS World Cup Hackathon</span><span>No betting · No financial rewards · Data shown under hackathon access terms</span></footer>
    </main>
  );
}
