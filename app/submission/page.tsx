import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  BellRing,
  CalendarClock,
  CheckCircle2,
  CloudOff,
  Code2,
  ExternalLink,
  EyeOff,
  Film,
  Fingerprint,
  Goal,
  Link2,
  Radio,
  Route,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  WalletCards,
  Wifi,
} from "lucide-react";
import { PORTUGAL_SPAIN_FIXTURE, PORTUGAL_SPAIN_MOMENTS } from "@/lib/demo-data";
import { JudgeLiveLab } from "@/components/judge-live-lab";
import styles from "./page.module.css";
import moat from "./signature-moat.module.css";

const LIVE_APP = "https://pulseproof-production-06fa.up.railway.app";
const REPOSITORY = "https://github.com/cryptovuive/pulseproof";
const CI_RUN = "https://github.com/cryptovuive/pulseproof/actions";
const PROGRAM = "74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn";
const TRANSACTION = "vid5hzmuF2FJnzFvZa7251fLdh5d5eRrn4WyvPd85WVKAcnccBbJhKEUFXx5VAXgvBEYp9bjZcToSp5yfnJHHCR";
const EXPLORER = `https://explorer.solana.com/tx/${TRANSACTION}?cluster=devnet`;

const chapters = [
  ["00:00", "The late-fan problem"],
  ["00:15", "Real deployed product walkthrough"],
  ["01:19", "Eight fresh production checks"],
  ["01:45", "Public Solana devnet evidence"],
  ["02:03", "A defensible fan memory loop"],
];

function Brand() {
  return <div className={styles.brand}><Image src="/pulseproof-mark.svg" width={44} height={44} alt="" /><span>PULSE<span>PROOF</span></span></div>;
}

function CaptureFrame({ slide, eyebrow, title, children }: { slide: number; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <main className={styles.capture}>
      <header className={styles.captureHead}><Brand /><div><Radio size={17} /> TxLINE DEVNET <b>×</b> SOLANA</div></header>
      <section className={styles.captureBody}>
        <div className={styles.captureTitle}><span>{eyebrow}</span><h1>{title}</h1></div>
        {children}
      </section>
      <footer className={styles.captureFoot}><span>0{slide} / 09</span><b>pulseproof-production-06fa.up.railway.app</b><span>NO BETTING · NO FINANCIAL REWARDS</span></footer>
    </main>
  );
}

function CaptureSlide({ slide }: { slide: number }) {
  if (slide === 1) return (
    <CaptureFrame slide={slide} eyebrow="Every match leaves a memory" title="The trusted second screen for every kind of football fan.">
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <p>Scores tell you <em>what</em> happened. PulseProof explains <em>why it mattered</em>—then lets you keep a verifiable memory of the moment.</p>
          <div className={styles.heroTags}><span><Wifi /> Live context</span><span><EyeOff /> Spoiler-safe</span><span><Fingerprint /> Verifiable</span></div>
        </div>
        <div className={styles.pulseOrb}><span>90+1′</span><Goal size={82} /><strong>MERINO</strong><small>Spain take the lead</small></div>
      </div>
    </CaptureFrame>
  );

  if (slide === 2) return (
    <CaptureFrame slide={slide} eyebrow="One product · the whole matchday" title="Plan. Follow. Catch up. Remember.">
      <div className={styles.journeyGrid}>
        {[
          [<CalendarClock key="i" />, "BEFORE", "Upcoming Hub", "Source-linked fixtures, local time, reminders and calendar export."],
          [<Radio key="i" />, "LIVE", "Match Center", "One SSE connection keeps up to eight covered fixtures in sync."],
          [<Sparkles key="i" />, "MISSED IT", "90-second Catch-up", "Replay only goals, cards, VAR and momentum-changing signals."],
          [<WalletCards key="i" />, "AFTER", "Proof of Watch", "Seal a source-bound moment as a non-transferable fan memory."],
        ].map(([icon, label, title, body]) => <article key={String(title)}>{icon}<span>{label}</span><h2>{title}</h2><p>{body}</p></article>)}
      </div>
      <div className={styles.returnBar}><Route /><b>France vs Spain</b><span>Semi-final · Dallas Stadium · source-linked schedule</span><BellRing /><strong>Smart alerts armed</strong></div>
    </CaptureFrame>
  );

  if (slide === 3) return (
    <CaptureFrame slide={slide} eyebrow="Published-report replay · clearly labelled" title="Understand a finished match without leaking the ending.">
      <div className={styles.matchDemo}>
        <div className={styles.scoreCard}>
          <span>FIFA WORLD CUP 2026 · ROUND OF 16</span><small>Result cross-checked with published report</small>
          <div><b>🇵🇹</b><h2>POR</h2><strong>0</strong><em>FT</em><strong>1</strong><h2>ESP</h2><b>🇪🇸</b></div>
          <p><EyeOff /> Spoiler Shield can hide this result until Catch-up is complete.</p>
        </div>
        <div className={styles.timelineCard}>
          <header><span>ON-PITCH TIMELINE</span><b>{PORTUGAL_SPAIN_MOMENTS.length} verified report moments</b></header>
          {PORTUGAL_SPAIN_MOMENTS.slice(1).map((moment) => <div key={moment.id}><time>{moment.minuteLabel ?? `${moment.minute}′`}</time><i className={moment.type === "goal" ? styles.goalDot : ""} /><p><strong>{moment.title}</strong><span>{moment.description}</span></p></div>)}
        </div>
      </div>
    </CaptureFrame>
  );

  if (slide === 4) return (
    <CaptureFrame slide={slide} eyebrow="Accuracy is a product feature" title="Real coverage is shown. Missing context stays missing.">
      <div className={styles.accuracyGrid}>
        <section>
          <div className={styles.signalHead}><Wifi /><span>PUBLIC TXLINE DEVNET</span><b>CONNECTED</b></div>
          <article><span>COVERED</span><small>FIFA WORLD CUP 2026 · SEMI-FINAL</small><div><b>🇫🇷 FRA</b><em>—</em><b>🇪🇸 ESP</b></div><p>Competition cross-checked with published schedule</p></article>
          <article><span>WAITING</span><small>COMPETITION UNAVAILABLE · TXLINE DEVNET</small><div><b>🇻🇳 VIE</b><em>—</em><b>🇲🇾 MYA</b></div><p>Competition not supplied by TxLINE</p></article>
        </section>
        <pre><code>{`event: ready\ndata: { "mode": "txline-live" }\n\nevent: pulse\ndata: { "phase": "COVERED", "source": "txline-live" }\n\nevent: heartbeat\ndata: { "at": "2026-07-13T08:59:29Z" }`}</code></pre>
      </div>
      <div className={styles.guardrail}><ShieldCheck /><p><b>No fabrication rule</b> Eliminated teams are never placed into future fixtures. Finalists stay TBD until a source confirms them.</p></div>
    </CaptureFrame>
  );

  if (slide === 5) return (
    <CaptureFrame slide={slide} eyebrow="Retention for real-world networks" title="A finished match still works after the connection disappears.">
      <div className={styles.offlineGrid}>
        <div className={styles.phoneCard}><div><CloudOff /><b>OFFLINE LIBRARY</b></div><h2>{PORTUGAL_SPAIN_FIXTURE.homeTeam} vs {PORTUGAL_SPAIN_FIXTURE.awayTeam}</h2><p>Saved on this device · {PORTUGAL_SPAIN_MOMENTS.length} on-pitch moments</p><button><Film /> Start Catch-up</button></div>
        <div className={styles.offlineRules}>
          <article><b>01</b><div><h2>Consumer-safe pack</h2><p>Only transformed, finished-match moments. Technical feed metadata is removed.</p></div></article>
          <article><b>02</b><div><h2>Hard cache boundary</h2><p>The service worker never caches API, SSE or stat-validation responses.</p></div></article>
          <article><b>03</b><div><h2>Fail closed</h2><p>Streaming, attestations and on-chain claims stay disabled until reconnection.</p></div></article>
        </div>
      </div>
    </CaptureFrame>
  );

  if (slide === 6) return (
    <CaptureFrame slide={slide} eyebrow="Proof of Watch · public Solana devnet" title="A moment becomes a receipt—not a tradable reward.">
      <div className={styles.proofFlow}>
        <div><Radio /><span>TxLINE event</span><small>fixture + sequence</small></div><i>→</i>
        <div><Fingerprint /><span>Attested moment</span><small>evidence digest + expiry</small></div><i>→</i>
        <div><ShieldCheck /><span>Ed25519 verify</span><small>preceding precompile</small></div><i>→</i>
        <div><BadgeCheck /><span>MomentReceipt PDA</span><small>anti-replay memory</small></div>
      </div>
      <div className={styles.receipt}>
        <section><span>CONFIRMED TRANSACTION</span><h2>Proof accepted on Solana devnet</h2><p>{TRANSACTION}</p></section>
        <dl><div><dt>Program</dt><dd>{PROGRAM}</dd></div><div><dt>State</dt><dd>Config · FanPass · MomentReceipt</dd></div><div><dt>Wallet UX</dt><dd>Phantom-compatible raw Solana transaction</dd></div></dl>
      </div>
    </CaptureFrame>
  );

  if (slide === 7) return (
    <CaptureFrame slide={slide} eyebrow="Smart-contract safety" title="The proof is short-lived, bound and impossible to replay.">
      <div className={styles.securityGrid}>
        {[
          ["PRECEDING INSTRUCTION", "The claim must immediately follow Solana's Ed25519 verification instruction."],
          ["CANONICAL MESSAGE", "Wallet, fixture, moment hash, evidence digest, points, badge and expiry are signed."],
          ["RECEIPT PDA", "One deterministic receipt per wallet, fixture and source moment rejects duplicates."],
          ["BOUND LIMITS", "Five-minute expiry, future-time guard, maximum points and a 64-bit badge bitmap."],
          ["NON-FINANCIAL", "No deposits, odds, entry fees, prize pools or transferable fan rewards."],
          ["SERVER-ONLY SECRETS", "TxLINE token and attestor key never enter the browser bundle."],
        ].map(([title, body]) => <article key={title}><CheckCircle2 /><div><h2>{title}</h2><p>{body}</p></div></article>)}
      </div>
    </CaptureFrame>
  );

  if (slide === 8) return (
    <CaptureFrame slide={slide} eyebrow="Evidence a judge can reproduce" title="Not a mockup. A deployed, tested system.">
      <div className={styles.metrics}>
        <article><strong>110 / 110</strong><span>automated tests</span><small>24 suites</small></article>
        <article><strong>0</strong><span>known npm vulnerabilities</span><small>audit clean</small></article>
        <article><strong>200</strong><span>public health + SSE</span><small>Railway production</small></article>
        <article><strong>DEVNET</strong><span>program + receipt</span><small>Explorer visible</small></article>
      </div>
      <div className={styles.evidenceList}>
        <p><CheckCircle2 /> GitHub Actions: lint, test and production build green</p>
        <p><CheckCircle2 /> Local validator: valid claim plus eleven adversarial rejections</p>
        <p><CheckCircle2 /> Public SSE: ready, pulse and real heartbeat confirmed</p>
        <p><CheckCircle2 /> Public devnet: check-in, quiz, redeem, equip and adversarial rejections finalized</p>
        <p><CheckCircle2 /> PWA: server-offline reload and local Catch-up verified twice</p>
      </div>
    </CaptureFrame>
  );

  return (
    <CaptureFrame slide={9} eyebrow="Free for fans · valuable to partners" title="A trusted fan-engagement layer powered by real match events.">
      <div className={styles.closeGrid}>
        <section><Users /><h2>Fan clubs</h2><p>Branded match rooms and consented loyalty activations.</p></section>
        <section><Code2 /><h2>Publishers</h2><p>Embeddable match context and source-linked Catch-up.</p></section>
        <section><Trophy /><h2>Sponsors</h2><p>Non-financial campaigns with aggregate engagement analytics.</p></section>
      </div>
      <div className={styles.finalCta}><Brand /><div><h2>EVERY MATCH LEAVES A MEMORY.</h2><p>Live app · public repository · verified devnet program</p></div><ExternalLink /></div>
    </CaptureFrame>
  );
}

function SubmissionPortal() {
  return (
    <main className={styles.portal}>
      <header><Brand /><Link href="/">Open live product <ExternalLink size={15} /></Link></header>
      <section className={styles.portalHero}>
        <span>JUDGE SUBMISSION ROOM · TXODDS WORLD CUP HACKATHON</span>
        <h1>PulseProof turns live match events into context, Catch-up and verifiable fan memories.</h1>
        <p>Everything below is public, source-labelled and reproducible. No wagering, financial rewards or fabricated community activity.</p>
      </section>
      <section className={moat.signatureMoat}>
        <div><span>NEW · DEFENSIBLE FAN UTILITY</span><h2>Send the moment, not the spoiler.</h2><p>A Verified Catch-up Capsule shares one Ed25519-signed event prefix. The recipient receives exactly that prefix—never a hidden future goal, card or VAR event—and the source is re-checked before playback.</p><Link href="/?fixture=18198205"><Link2 /> Try the safe relay flow <ExternalLink /></Link> <Link href="/fan-zone"><Sparkles /> Open Fan Zone <ExternalLink /></Link></div>
        <ol><li><b>01</b><span>Choose the exact Catch-up position</span></li><li><b>02</b><span>Sign its source-bound prefix digest</span></li><li><b>03</b><span>Redeem fail-closed with zero future payload</span></li></ol>
      </section>
      <JudgeLiveLab />
      <section className={styles.videoSection}>
        <video controls preload="metadata" poster="/pulseproof-demo-poster.svg"><source src="/pulseproof-demo.mp4" type="video/mp4" /><track default kind="captions" src="/pulseproof-demo.vtt" srcLang="en" label="English" /></video>
        <aside><span>DEMO CHAPTERS · UNDER 5 MINUTES</span>{chapters.map(([time, title]) => <div key={time}><time>{time}</time><p>{title}</p></div>)}</aside>
      </section>
      <section className={styles.verifyGrid}>
        <a href={`${LIVE_APP}/api/health`} target="_blank" rel="noreferrer"><Wifi /><span>Production health</span><small>TxLINE devnet credentials configured</small></a>
        <a href={EXPLORER} target="_blank" rel="noreferrer"><BadgeCheck /><span>Explorer receipt</span><small>Confirmed public devnet transaction</small></a>
        <a href={CI_RUN} target="_blank" rel="noreferrer"><CheckCircle2 /><span>Green CI</span><small>110 tests · lint · production build</small></a>
        <a href={REPOSITORY} target="_blank" rel="noreferrer"><Code2 /><span>Public repository</span><small>Architecture, threat model and test report</small></a>
      </section>
      <section className={styles.honesty}><ShieldCheck /><div><span>DEMO INTEGRITY</span><h2>Live is live. Replay is labelled replay.</h2><p>TxLINE coverage, public SSE and heartbeat evidence are live. Finished-match sequences in the consumer demo are externally cross-checked and explicitly not represented as TxLINE records.</p></div></section>
      <footer><Brand /><p>Built for the Consumer and Fan Experiences track.</p><a href={LIVE_APP}>Launch PulseProof <ExternalLink size={14} /></a></footer>
    </main>
  );
}

export default async function SubmissionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const capture = params.capture === "1";
  const raw = Array.isArray(params.slide) ? params.slide[0] : params.slide;
  const slide = Math.min(9, Math.max(1, Number(raw) || 1));
  return capture ? <CaptureSlide slide={slide} /> : <SubmissionPortal />;
}
