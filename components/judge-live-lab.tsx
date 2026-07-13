"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Buffer } from "buffer";
import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  Activity,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  CloudOff,
  Database,
  Fingerprint,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  assertAttestationEvidence,
  assertCatalogEvidence,
  assertChainEvidence,
  assertHealthEvidence,
  assertOfflineBoundary,
  assertReplayIsolation,
} from "@/lib/judge-proof";
import type { MatchOverview, MatchPulse, MomentAttestation } from "@/types/pulse";
import styles from "./judge-live-lab.module.css";

type CheckId = "health" | "catalog" | "stream" | "replay" | "attestation" | "chain" | "offline";
type CheckState = {
  id: CheckId;
  label: string;
  detail: string;
  status: "idle" | "running" | "pass" | "fail";
  latency?: number;
  evidence?: string;
};

const INITIAL_CHECKS: CheckState[] = [
  { id: "health", label: "Production identity", detail: "Health, TxLINE network and active credentials", status: "idle" },
  { id: "catalog", label: "Source-labelled catalog", detail: "Live coverage and published-report replay stay separate", status: "idle" },
  { id: "stream", label: "Real SSE bridge", detail: "Connect to /api/scores/stream and observe public events", status: "idle" },
  { id: "replay", label: "Spoiler isolation", detail: "A two-event prefix cannot see any later match moment", status: "idle" },
  { id: "attestation", label: "Ed25519 receipt", detail: "Issue a fresh proof and verify it inside this browser", status: "idle" },
  { id: "chain", label: "Solana devnet", detail: "Read executable programs and a confirmed reference receipt", status: "idle" },
  { id: "offline", label: "Offline safety boundary", detail: "App shell is cacheable; APIs, SSE and proofs are not", status: "idle" },
];

const iconFor = (id: CheckId) => ({
  health: ShieldCheck,
  catalog: Database,
  stream: Radio,
  replay: Activity,
  attestation: Fingerprint,
  chain: BadgeCheck,
  offline: CloudOff,
})[id];

async function jsonResponse<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `${url} returned ${response.status}`);
  return body;
}

function observeStream(fixtureIds: number[]) {
  return new Promise<string>((resolve, reject) => {
    const eventSource = new EventSource(`/api/scores/stream?fixtureIds=${fixtureIds.slice(0, 3).join(",")}`);
    const seen = new Set<string>();
    const finish = (result?: string, error?: Error) => {
      window.clearTimeout(timeout);
      eventSource.close();
      if (error) reject(error); else resolve(result ?? "");
    };
    const maybeFinish = () => {
      if (seen.has("ready") && seen.has("pulse")) finish(`ready + pulse · ${fixtureIds.slice(0, 3).length} fixture${fixtureIds.length > 1 ? "s" : ""}`);
    };
    eventSource.addEventListener("ready", () => { seen.add("ready"); maybeFinish(); });
    eventSource.addEventListener("pulse", () => { seen.add("pulse"); maybeFinish(); });
    eventSource.addEventListener("moment", () => { seen.add("moment"); maybeFinish(); });
    eventSource.addEventListener("heartbeat", () => {
      seen.add("heartbeat");
      if (seen.has("ready")) finish(`ready + heartbeat · public stream stayed open`);
    });
    eventSource.onerror = () => finish(undefined, new Error(`SSE interrupted after: ${[...seen].join(", ") || "no events"}`));
    const timeout = window.setTimeout(() => finish(undefined, new Error(`SSE timed out after: ${[...seen].join(", ") || "no events"}`)), 18_000);
  });
}

export function JudgeLiveLab() {
  const [checks, setChecks] = useState(INITIAL_CHECKS);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string>("");
  const autoRunRef = useRef(false);

  const update = useCallback((id: CheckId, next: Partial<CheckState>) => {
    setChecks((current) => current.map((check) => check.id === id ? { ...check, ...next } : check));
  }, []);

  const execute = useCallback(async <T,>(id: CheckId, task: () => Promise<{ value: T; evidence: string }>) => {
    update(id, { status: "running", latency: undefined, evidence: "Opening live check…" });
    const start = performance.now();
    try {
      const result = await task();
      update(id, { status: "pass", latency: Math.round(performance.now() - start), evidence: result.evidence });
      return result.value;
    } catch (error) {
      update(id, {
        status: "fail",
        latency: Math.round(performance.now() - start),
        evidence: error instanceof Error ? error.message : "Check failed",
      });
      return undefined;
    }
  }, [update]);

  const runAll = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setStartedAt(new Date().toISOString());
    setChecks(INITIAL_CHECKS);

    await execute("health", async () => {
      const body = await jsonResponse<unknown>("/api/health");
      assertHealthEvidence(body);
      return { value: body, evidence: `${body.txline.network} · ${body.txline.programId.slice(0, 8)}… · credentials active` };
    });

    const catalog = await execute("catalog", async () => {
      const body = await jsonResponse<{ matches: MatchOverview[] }>("/api/matches");
      assertCatalogEvidence(body);
      const live = body.matches.filter((match) => match.source === "txline-live").length;
      const replay = body.matches.filter((match) => match.source === "demo-replay").length;
      return { value: body.matches, evidence: `${body.matches.length} fixtures · ${live} TxLINE live · ${replay} labelled replay` };
    });

    await execute("stream", async () => {
      const ids = (catalog ?? []).filter((match) => match.source === "txline-live").map((match) => match.fixture.fixtureId);
      if (!ids.length) throw new Error("No covered fixture is available for an SSE test");
      const evidence = await observeStream(ids);
      return { value: evidence, evidence: `${evidence} · no polling` };
    });

    const replayPulse = await execute("replay", async () => {
      const replay = (catalog ?? []).find((match) => match.source === "demo-replay");
      if (!replay) throw new Error("No labelled replay is available for isolation testing");
      const base = `/api/matches/${replay.fixture.fixtureId}?mode=replay`;
      const [full, prefix] = await Promise.all([
        jsonResponse<MatchPulse>(base),
        jsonResponse<MatchPulse>(`${base}&cursor=2`),
      ]);
      assertReplayIsolation(full, prefix);
      return { value: full, evidence: `cursor=2 exposed 2/${full.moments.length} events · future IDs absent` };
    });

    await execute("attestation", async () => {
      const moment = replayPulse?.moments.at(-1);
      if (!replayPulse || !moment) throw new Error("No source moment is available for attestation");
      const proof = await jsonResponse<MomentAttestation>("/api/attest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: "8qdg3U5FXJD8H5Y5Fv6hsWxJbPLwaUmyUUYyFYVLsAyV",
          fixtureId: replayPulse.fixture.fixtureId,
          momentId: moment.id,
          mode: "replay",
        }),
      });
      assertAttestationEvidence(proof);
      const verified = nacl.sign.detached.verify(
        Buffer.from(proof.messageBase64, "base64"),
        Buffer.from(proof.signatureBase64, "base64"),
        bs58.decode(proof.attestorPublicKey),
      );
      if (!verified) throw new Error("Browser-side Ed25519 verification returned false");
      return { value: proof, evidence: `verified=true · evidence ${proof.payload.evidenceHash.slice(0, 10)}…` };
    });

    await execute("chain", async () => {
      const body = await jsonResponse<unknown>("/api/judge-proof");
      assertChainEvidence(body);
      return { value: body, evidence: `2 executable programs · receipt slot ${body.receipt.slot} · ${body.receipt.confirmationStatus}` };
    });

    await execute("offline", async () => {
      const response = await fetch(`/sw.js?judge=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Service worker returned ${response.status}`);
      const worker = await response.text();
      assertOfflineBoundary(worker);
      return { value: worker, evidence: "shell fallback present · /api/* and /scores/stream bypass cache" };
    });

    setRunning(false);
  }, [execute, running]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (autoRunRef.current || params.get("liveProof") !== "1") return;
    autoRunRef.current = true;
    const requestedDelay = Number(params.get("proofDelay") ?? 800);
    const delay = Number.isFinite(requestedDelay) ? Math.max(300, Math.min(requestedDelay, 10_000)) : 800;
    const timer = window.setTimeout(() => void runAll(), delay);
    return () => window.clearTimeout(timer);
  }, [runAll]);

  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.filter((check) => check.status === "fail").length;

  return (
    <section className={styles.liveLab} id="live-proof" aria-label="Live product verification lab">
      <header className={styles.liveLabHeader}>
        <div>
          <span>LIVE PRODUCT TEST · NO WALLET · NO SOL</span>
          <h2>Don&apos;t trust the pitch. Run the product.</h2>
          <p>One click exercises production APIs, a real SSE connection, spoiler isolation, browser-side signature verification, Solana devnet and the offline cache boundary.</p>
        </div>
        <button onClick={() => void runAll()} disabled={running} className={styles.liveLabButton}>
          {running ? <Activity className={styles.spin} /> : passed === checks.length ? <RotateCcw /> : <Play />}
          {running ? `Running ${passed + failed + 1}/${checks.length}` : passed === checks.length ? "Run again" : "Run live proof"}
        </button>
      </header>

      <div className={styles.liveLabSummary}>
        <div><strong>{passed}</strong><span>passed</span></div>
        <div><strong>{failed}</strong><span>failed</span></div>
        <div><strong>{checks.filter((check) => check.status === "running").length}</strong><span>running</span></div>
        <p>{startedAt ? `Fresh run started ${new Date(startedAt).toLocaleTimeString()}` : "Nothing here is a screenshot or prerecorded response."}</p>
      </div>

      <div className={styles.liveLabChecks}>
        {checks.map((check, index) => {
          const Icon = iconFor(check.id);
          return (
            <article key={check.id} className={`${styles.liveLabCheck} ${styles[check.status]}`} data-status={check.status}>
              <div className={styles.checkNumber}>{String(index + 1).padStart(2, "0")}</div>
              <Icon className={styles.checkIcon} />
              <div className={styles.checkCopy}>
                <div><h3>{check.label}</h3>{check.latency !== undefined && <time>{check.latency} ms</time>}</div>
                <p>{check.detail}</p>
                {check.evidence && <code>{check.evidence}</code>}
              </div>
              <div className={styles.checkStatus} aria-label={`${check.label}: ${check.status}`}>
                {check.status === "pass" ? <CheckCircle2 /> : check.status === "fail" ? <CircleAlert /> : check.status === "running" ? <Activity className={styles.spin} /> : <span />}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
