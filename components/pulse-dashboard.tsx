"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BadgeCheck,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Clock3,
  Goal,
  Radio,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Sparkles,
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
import { UpcomingMatchHub } from "@/components/upcoming-match-hub";
import { pulseAtMoment, summarizeCatchUp } from "@/lib/pulse-replay";
import type { MatchOverview, MatchPulse, MomentAttestation, PulseMoment } from "@/types/pulse";

type StreamStatus = "connecting" | "live" | "complete" | "paused" | "error";
const JUDGE_DEMO_WALLET = "8qdg3U5FXJD8H5Y5Fv6hsWxJbPLwaUmyUUYyFYVLsAyV";

function shortKey(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function verifyProof(attestation: MomentAttestation) {
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
  const [matchFilter, setMatchFilter] = useState<"all" | "live" | "finished">("all");
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [walletKey, setWalletKey] = useState<string>("");
  const [claiming, setClaiming] = useState<string>("");
  const [claimed, setClaimed] = useState<Record<string, { proof: boolean; signature?: string }>>({});
  const [notice, setNotice] = useState<string>("");
  const [judgeChecking, setJudgeChecking] = useState(false);
  const [judgeProof, setJudgeProof] = useState<MomentAttestation | null>(null);
  const [roomVote, setRoomVote] = useState<"home" | "away" | "even" | null>(null);
  const [roomCounts, setRoomCounts] = useState({ home: 0, away: 0, even: 0 });
  const streamRef = useRef<EventSource | null>(null);

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
    const preferred = fixtureBody.matches.find((match) => match.phase.includes("LIVE")) ?? fixtureBody.matches[0];
    const streamFixtureIds = fixtureBody.matches
      .filter((match) => match.source !== "demo-replay")
      .map((match) => match.fixture.fixtureId);
    return { streamFixtureIds, matches: fixtureBody.matches, pulses: byId, selected: preferred.fixture.fixtureId };
  }, []);

  useEffect(() => {
    let active = true;
    void loadInitial()
      .then(({ streamFixtureIds, matches: loadedMatches, pulses: loadedPulses, selected }) => {
        if (!active) return;
        setMatches(loadedMatches);
        setPulses(loadedPulses);
        setSelectedFixtureId(selected);
        if (!streamFixtureIds.length) {
          setStatus("complete");
          return;
        }
        const source = new EventSource(`/api/stream?fixtureIds=${streamFixtureIds.join(",")}`);
        streamRef.current = source;
        source.addEventListener("ready", () => setStatus("live"));
        source.addEventListener("moment", (event) => {
          const moment = JSON.parse((event as MessageEvent).data) as PulseMoment;
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
        setStatus("error");
        setNotice(error instanceof Error ? error.message : "Unable to start PulseProof");
      });
    return () => {
      active = false;
      streamRef.current?.close();
    };
  }, [loadInitial, streamGeneration]);

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
  const visibleMatches = useMemo(() => matches.filter((match) => {
    if (matchFilter === "finished") return match.phase === "FT";
    if (matchFilter === "live") return match.source !== "demo-replay" && ["LIVE", "HT", "ET", "PEN"].includes(match.phase);
    return true;
  }), [matchFilter, matches]);

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
    setRoomVote(null);
  };

  const startCatchUp = async () => {
    if (!livePulse) return;
    try {
      const query = livePulse.source === "demo-replay" ? "?mode=replay" : livePulse.phase === "FT" ? "?historical=true" : "";
      const response = await fetch(`/api/matches/${livePulse.fixture.fixtureId}${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Historical match log is not available yet");
      const full = (await response.json()) as MatchPulse;
      setCatchUp(full);
      setCatchUpIndex(1);
      setCatchUpPlaying(true);
      setNotice(`Catch-up loaded: ${full.moments.length} verified match events.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load catch-up");
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

  const latest = pulse.moments.at(-1);
  const displayMinute = latest?.minuteLabel ?? pulse.minute;
  const homeBrand = getTeamBranding(pulse.fixture.homeTeam);
  const awayBrand = getTeamBranding(pulse.fixture.awayTeam);
  const txLineDevnet = pulse.source !== "demo-replay" && pulse.provenance?.provider.includes("devnet");
  const competitionEvidenceUrl = pulse.provenance?.sourceUrl ?? pulse.fixture.competitionSourceUrl;
  const hasSignalMoments = pulse.moments.some((moment) => moment.type !== "moment");
  const scoreKnown = pulse.source === "demo-replay" || pulse.moments.some((moment) => Boolean(moment.score));
  const statusLabel = catchUp ? "Catch-up" : status === "live" ? (pulse.source === "demo-replay" ? "Demo replay" : "TxLINE connected") : status;
  const catchUpSummary = catchUp ? summarizeCatchUp(catchUp.moments) : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="PulseProof home">
          <span className="brand-mark"><Activity size={19} /></span>
          <span>PULSE<span>PROOF</span></span>
        </a>
        <div className="top-actions">
          <div className={`network-pill ${status}`}>
            {status === "live" || status === "complete" ? <Wifi size={14} /> : <WifiOff size={14} />}
            {statusLabel}
          </div>
          <button className="wallet-button" onClick={connectWallet}>
            <WalletCards size={16} />
            {walletKey ? shortKey(walletKey) : "Connect wallet"}
          </button>
        </div>
      </header>

      <section className="demo-banner" role="note">
        <div><Radio size={14} /> {pulse.source === "demo-replay" ? "Labelled demo mode" : txLineDevnet ? "TxLINE devnet coverage" : "Live TxLINE mode"}</div>
        <p>
          {pulse.source === "demo-replay"
            ? "Results and key moments are cross-checked from published reports; demo sequence IDs are not represented as TxLINE-verified data."
            : txLineDevnet
              ? pulse.fixture.competitionSource === "verified-schedule"
                ? "Fixture ID, teams and events come from TxLINE devnet; competition, round and kick-off are cross-checked separately against the published World Cup schedule."
                : "Fixture IDs, teams and events come from the activated TxLINE devnet feed. Missing competition or kick-off fields stay explicitly unavailable; the official schedule is sourced separately."
            : "Scores and match events are being read from TxLINE's live SSE feed using an activated Solana subscription."}
        </p>
        {competitionEvidenceUrl && <a className="banner-source" href={competitionEvidenceUrl} target="_blank" rel="noreferrer">Source · {pulse.provenance?.sourceUrl ? pulse.provenance.provider : competitionSourceLabel(pulse.fixture.competitionSource)}</a>}
        <button onClick={toggleStream}>{playing ? <CirclePause size={15} /> : <CirclePlay size={15} />} {playing ? "Pause" : "Restart"}</button>
      </section>

      <section className="match-center" aria-label="Match center">
        <div className="match-center-head">
          <div><span className="eyebrow">Multi-match center</span><h2>Follow every covered fixture</h2></div>
          <div className="match-filters" aria-label="Filter matches">
            {(["all", "live", "finished"] as const).map((filter) => (
              <button key={filter} className={matchFilter === filter ? "active" : ""} onClick={() => setMatchFilter(filter)}>{filter}</button>
            ))}
          </div>
        </div>
        <div className="match-strip">
          {visibleMatches.map((match) => {
            const home = getTeamBranding(match.fixture.homeTeam);
            const away = getTeamBranding(match.fixture.awayTeam);
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
                <span className="match-tile-team"><span className="match-flag"><TeamFlag flagKey={home.flagKey} /></span><strong>{home.code}</strong><b>{match.scoreKnown ? match.score[0] : "–"}</b></span>
                <span className="match-tile-team"><span className="match-flag"><TeamFlag flagKey={away.flagKey} /></span><strong>{away.code}</strong><b>{match.scoreKnown ? match.score[1] : "–"}</b></span>
                <span className="match-tile-foot"><Radio size={11} /> {match.momentCount} {match.source === "demo-replay" ? "report events · open recap" : "feed events"}</span>
              </button>
            );
          })}
          {!visibleMatches.length && <div className="empty-matches">No fixtures in this filter.</div>}
        </div>
      </section>

      <UpcomingMatchHub />

      <div className="dashboard-grid" id="top">
        <section className="main-column">
          <article className={`catchup-card panel ${catchUp ? "active" : ""}`}>
            <div className="catchup-intro">
              <span className="catchup-icon"><RotateCcw size={19} /></span>
              <div><span className="eyebrow">Missed the action?</span><h2>{catchUp ? "Catch-up is playing" : "Understand the match in 90 seconds"}</h2><p>Replay only the signal events—goals, pressure swings, cards and VAR—without watching the full broadcast.</p></div>
              {!catchUp ? <button className="catchup-primary" disabled={!hasSignalMoments} onClick={() => void startCatchUp()}><CirclePlay size={16} /> {hasSignalMoments ? "Start catch-up" : "No match moments yet"}</button> : <button className="catchup-exit" onClick={() => { setCatchUp(null); setCatchUpPlaying(false); }}><Radio size={14} /> Return live</button>}
            </div>
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
            <div className="teams">
              <div className="team team-home">
                <div className="team-orb" role="img" aria-label={`${homeBrand.canonicalName} flag, team code ${homeBrand.code}`}>
                  <TeamFlag flagKey={homeBrand.flagKey} className="flag-svg" />
                  <span className="team-code" aria-hidden="true">{homeBrand.code}</span>
                </div>
                <h1>{pulse.fixture.homeTeam}</h1>
                <span>Home</span>
              </div>
              <div className="score">
                <strong>{scoreKnown ? pulse.score[0] : "–"}</strong><i>:</i><strong>{scoreKnown ? pulse.score[1] : "–"}</strong>
                <small>Fixture #{pulse.fixture.fixtureId}</small>
              </div>
              <div className="team team-away">
                <div className="team-orb" role="img" aria-label={`${awayBrand.canonicalName} flag, team code ${awayBrand.code}`}>
                  <TeamFlag flagKey={awayBrand.flagKey} className="flag-svg" />
                  <span className="team-code" aria-hidden="true">{awayBrand.code}</span>
                </div>
                <h1>{pulse.fixture.awayTeam}</h1>
                <span>Away</span>
              </div>
            </div>
            <div className="momentum-block">
              <div className="section-label"><span>Match pulse</span><span>{hasSignalMoments ? `${pulse.momentum}% · ${100 - pulse.momentum}%` : "Awaiting sporting events"}</span></div>
              {hasSignalMoments ? <>
                <div className="momentum-track"><span style={{ width: `${pulse.momentum}%` }} /></div>
                <div className="momentum-labels"><span>{pulse.fixture.homeTeam} pressure</span><span>{pulse.fixture.awayTeam} pressure</span></div>
              </> : <div className="momentum-labels"><span>Coverage metadata only — no pressure estimate yet.</span></div>}
            </div>
          </article>

          <article className="pulse-card panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Latest signal</span>
                <h2>{latest?.title}</h2>
              </div>
              <div className="signal-icon"><Zap size={22} /></div>
            </div>
            <p>{latest?.description}</p>
            <div className="explain-row">
              <Sparkles size={15} /> Plain-language context generated deterministically from the {pulse.source === "demo-replay" ? "cross-checked fallback action" : "TxLINE action type"}.
            </div>
          </article>

          <article className="timeline panel">
            <div className="panel-heading compact">
              <div><span className="eyebrow">Live timeline</span><h2>{hasSignalMoments ? "Moments that moved the match" : "Verified feed metadata"}</h2></div>
              <span className="event-count">{pulse.moments.length} events</span>
            </div>
            <div className="timeline-list">
              {[...pulse.moments].reverse().map((moment) => (
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
                    <small><ShieldCheck size={12} /> {moment.verified ? "TxLINE feed event" : "Published-report replay"} · seq {moment.seq}</small>
                  </div>
                  <button
                    className={`claim-button ${claimed[moment.id]?.proof ? "claimed" : ""}`}
                    disabled={moment.points <= 0 || moment.badge <= 0 || claiming === moment.id || claimed[moment.id]?.proof}
                    onClick={() => void claimMoment(moment)}
                  >
                    {claimed[moment.id]?.signature ? <BadgeCheck size={15} /> : claimed[moment.id]?.proof ? <ShieldCheck size={15} /> : <Sparkles size={14} />}
                    {claiming === moment.id ? "Checking…" : claimed[moment.id]?.signature ? "On-chain" : claimed[moment.id]?.proof ? "Verified" : moment.points > 0 && moment.badge > 0 ? `+${moment.points}` : "Metadata"}
                  </button>
                </div>
              ))}
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

          <article className="trust-card panel">
            <span className="eyebrow">Why trust this?</span>
            <h3>Sports data with receipts.</h3>
            <div className="trust-step"><span>01</span><p><strong>TxLINE event</strong>Live score/action enters the server.</p></div>
            <div className="trust-step"><span>02</span><p><strong>Attested moment</strong>Server checks fixture + sequence and signs.</p></div>
            <div className="trust-step"><span>03</span><p><strong>Solana memory</strong>Contract prevents replay and updates your pass.</p></div>
            <div className="judge-lab">
              <div><span>Judge verification lab</span><b>No wallet · No SOL</b></div>
              <p>Issue and verify a real short-lived Ed25519 attestation for the latest visible event.</p>
              <button disabled={judgeChecking} onClick={() => void verifyForJudge()}>{judgeProof ? <BadgeCheck size={14} /> : <ShieldCheck size={14} />}{judgeChecking ? "Verifying…" : judgeProof ? "Proof verified" : "Verify sample proof"}</button>
              {judgeProof && <small><span>Evidence</span><code>{judgeProof.payload.evidenceHash.slice(0, 10)}…{judgeProof.payload.evidenceHash.slice(-8)}</code><span>Expires</span><code>{new Date(judgeProof.payload.expiresAt * 1_000).toLocaleTimeString()}</code></small>}
            </div>
            <a href="https://txline.txodds.com/documentation/worldcup" target="_blank" rel="noreferrer">Read the data flow <ChevronRight size={14} /></a>
          </article>
        </aside>
      </div>

      {notice && <button className="toast" aria-live="polite" onClick={() => setNotice("")}><span>{notice}</span><span aria-hidden="true">×</span></button>}
      <footer><span>PulseProof · Built for TxODDS World Cup Hackathon</span><span>No betting · No financial rewards · Data shown under hackathon access terms</span></footer>
    </main>
  );
}
