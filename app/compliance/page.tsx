import Link from "next/link";
import {
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  Code2,
  ExternalLink,
  Fingerprint,
  Scale,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  HACKATHON_BRIEF_URL,
  HACKATHON_TERMS_URL,
  SUPERTEAM_TERMS_URL,
  txLineDataLicenseState,
} from "@/lib/hackathon-compliance";
import styles from "./page.module.css";

const REPOSITORY = "https://github.com/cryptovuive/pulseproof";
const EXPLORER = "https://explorer.solana.com/address/74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn?cluster=devnet";

const requirements = [
  ["Participant eligibility", "The registered natural person must meet the age, jurisdiction and exclusion rules, control the entry, and submit it personally through Superteam Earn."],
  ["Free evaluation", "The live product, labelled replay, Judge Lab, repository, CI and Explorer evidence are public. A judge does not need Phantom, SOL, a token purchase or a paid account."],
  ["Originality trail", "Product decisions, scoped pull requests, tests and public deployment history remain inspectable. Third-party packages are listed with their licences."],
  ["Data boundary", "TxLINE credentials remain server-only. The product transforms events into fan UI and proofs; it does not publish a downloadable raw TxLINE dataset."],
  ["Brand boundary", "PulseProof uses its own mark and original cosmetics. Official mascot artwork, FIFA logos, trophy art, team crests and sponsorship claims are excluded."],
  ["Consumer safety", "No wagers, deposits, entry fees, transferable rewards, prize pools or odds-based financial actions are implemented."],
] as const;

export default function CompliancePage() {
  const dataLicense = txLineDataLicenseState();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span>⌁</span>PULSE<b>PROOF</b></Link>
        <nav><Link href="/submission">Judge room</Link><Link href="/fan-zone">Fan Zone</Link></nav>
      </header>

      <section className={styles.hero}>
        <div><span>RULES · DATA · IP · JUDGE ACCESS</span><h1>Built to be inspected, not merely claimed.</h1><p>This is PulseProof&apos;s public compliance record for the TxODDS World Cup Hackathon. It maps the official requirements to concrete product controls and public evidence.</p></div>
        <aside><Scale /><span>TERMS CHECKED</span><strong>19 JUL 2026</strong><small>Rules may change. Re-check before submission.</small></aside>
      </section>

      <section className={styles.grid}>
        {requirements.map(([title, body], index) => <article key={title}><b>{String(index + 1).padStart(2, "0")}</b><CheckCircle2 /><h2>{title}</h2><p>{body}</p></article>)}
      </section>

      <section className={styles.dataState}>
        <div><ShieldCheck /><span>TXLINE DATA-LICENCE GUARD</span><h2>{dataLicense.active ? "Hackathon access is active" : "Live access is disabled"}</h2><p>Default expiry: {dataLicense.expiresAt}. After expiry, live upstream calls fail closed and labelled public-report replay remains available. Re-enabling requires an explicit environment flag backed by written TxODDS permission.</p></div>
        <strong data-active={dataLicense.active}>{dataLicense.basis.replace("-", " ")}</strong>
      </section>

      <section className={styles.evidence}>
        <a href={REPOSITORY} target="_blank" rel="noreferrer"><Code2 /><span>Source and pull requests</span><ExternalLink /></a>
        <a href={`${REPOSITORY}/actions`} target="_blank" rel="noreferrer"><BadgeCheck /><span>Reproducible CI</span><ExternalLink /></a>
        <a href={EXPLORER} target="_blank" rel="noreferrer"><WalletCards /><span>Public devnet program</span><ExternalLink /></a>
        <a href="/api/health" target="_blank" rel="noreferrer"><Fingerprint /><span>Runtime licence state</span><ExternalLink /></a>
      </section>

      <section className={styles.sources}>
        <BookOpenCheck /><div><h2>Primary rules</h2><p>The official track brief, Hackathon Terms and Superteam platform terms are the governing sources. The registered participant must re-check them and submit the entry personally.</p></div>
        <a href={HACKATHON_TERMS_URL} target="_blank" rel="noreferrer">Official Terms <ExternalLink /></a>
        <a href={HACKATHON_BRIEF_URL} target="_blank" rel="noreferrer">Official brief <ExternalLink /></a>
        <a href={SUPERTEAM_TERMS_URL} target="_blank" rel="noreferrer">Superteam Terms <ExternalLink /></a>
      </section>

      <footer><span>No betting · No financial rewards · No affiliation with FIFA or any tournament organiser</span><Link href="/">Return to product</Link></footer>
    </main>
  );
}
