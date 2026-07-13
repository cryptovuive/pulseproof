# PulseProof

PulseProof is a live football second screen that turns TxLINE score events into simple fan context and a verifiable **Proof of Watch** on Solana. It is designed for the TxODDS **Consumer and Fan Experiences** track.

## Public release

- Live app: [https://pulseproof-production-06fa.up.railway.app](https://pulseproof-production-06fa.up.railway.app)
- Health: [https://pulseproof-production-06fa.up.railway.app/api/health](https://pulseproof-production-06fa.up.railway.app/api/health)
- Public repository: [https://github.com/cryptovuive/pulseproof](https://github.com/cryptovuive/pulseproof)
- CI: [GitHub Actions](https://github.com/cryptovuive/pulseproof/actions)

The public release uses an activated TxLINE devnet token and a Railway-hosted SSE bridge. TxLINE devnet can publish fixture IDs/participants without authoritative competition or kick-off fields; PulseProof leaves those values explicitly unavailable and uses the separately source-linked schedule instead of inventing dates or tournament status.

## Verified devnet deployment

- PulseProof program: [`74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn`](https://explorer.solana.com/address/74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn?cluster=devnet)
- TxLINE free-tier subscription: [`54TvjbxjP41cBP4BebWWyoJNWex6evuwapHcYb9hWziErFkvpfFPgTkU9bc2K9iGUnXojEWiNHS1wUTiktiMXgbC`](https://explorer.solana.com/tx/54TvjbxjP41cBP4BebWWyoJNWex6evuwapHcYb9hWziErFkvpfFPgTkU9bc2K9iGUnXojEWiNHS1wUTiktiMXgbC?cluster=devnet)
- Program deployment: [`4z4ihcYmRc6rTv9hFB7D4yAvxqgPBMLubVYB954MfVBoiYijZ4CUwB7vPSEfgaRLWAuyH6avZvP519gvT4ceNdS`](https://explorer.solana.com/tx/4z4ihcYmRc6rTv9hFB7D4yAvxqgPBMLubVYB954MfVBoiYijZ4CUwB7vPSEfgaRLWAuyH6avZvP519gvT4ceNdS?cluster=devnet)
- Config initialization: [`3PeE9suRvD3XUi5j7GNERqYVAd7dyGHmEjy9DWmkpBwJZnTwV1ozdUXKz45Y21f9qT6WbMFRJdqSQvvruPFgr2MB`](https://explorer.solana.com/tx/3PeE9suRvD3XUi5j7GNERqYVAd7dyGHmEjy9DWmkpBwJZnTwV1ozdUXKz45Y21f9qT6WbMFRJdqSQvvruPFgr2MB?cluster=devnet)
- Verified claim: [`vid5hzmuF2FJnzFvZa7251fLdh5d5eRrn4WyvPd85WVKAcnccBbJhKEUFXx5VAXgvBEYp9bjZcToSp5yfnJHHCR`](https://explorer.solana.com/tx/vid5hzmuF2FJnzFvZa7251fLdh5d5eRrn4WyvPd85WVKAcnccBbJhKEUFXx5VAXgvBEYp9bjZcToSp5yfnJHHCR?cluster=devnet)

The project deliberately avoids wagering: there are no deposits, entry fees, transferable rewards, prize pools, odds-based financial actions, or pay-to-win mechanics. Fan points and badges are non-financial product signals.

## What is already implemented

- Polished, responsive match dashboard with score, phase, momentum, latest signal, timeline and watch room.
- Server-only TxLINE adapter with network consistency checks and guest-JWT renewal.
- TxLINE fixture snapshot, score snapshot, historical score and stat-validation integrations.
- Multi-match center for up to eight covered fixtures with live/finished filters and standard team flags/codes.
- Direct TxLINE `/scores/stream` SSE bridge with fixture filtering, sequence de-duplication, heartbeat and reconnect.
- Snapshot-to-now and historical Catch-up with timeline scrubbing and 1x/2x/4x playback.
- Upcoming Match Hub prefers complete TxLINE fixture metadata and otherwise uses a source-linked, integrity-checked schedule, with local timezone, countdown, saved reminders and `.ics` calendar export.
- Judge Verification Lab that proves an evidence-bound Ed25519 attestation without requiring Phantom, SOL or a transaction.
- Three completed World Cup 2026 replays with source-linked scores, scorer/assist details, cards and stoppage-time labels; local sequence IDs remain explicitly non-TxLINE.
- Phantom wallet connection and raw Solana transaction builder.
- Anchor program with config authority, per-wallet/per-fixture Fan Pass PDA, one receipt PDA per moment, badge bitmap and points.
- Ed25519 attestation verification through the Solana Ed25519 precompile; the claim instruction must immediately follow the signature-verification instruction.
- Server-side moment attestations tied to wallet, fixture, TxLINE sequence-derived hash, evidence digest, points, badge and a five-minute expiry.
- Forty-two automated unit/integration tests plus a Phantom-compatible wallet signature suite and real local-validator flow covering valid state transitions and adversarial/integrity assertions.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The included `.env.local` enables only the labelled demo replay. It contains no API token or signing secret.

```bash
npm run lint
npm test
npm run build
npm run contract:e2e:windows
npm run wallet:e2e:windows
npm run txline:verify
npm run contract:e2e:devnet
```

`wallet:create` generates a disposable Solana keypair that can be imported into Phantom for localnet/devnet testing. Its JSON and base58 import key stay under gitignored `.local-wallets/`, are never printed, and must never hold mainnet funds. Importing that private key into the Phantom extension remains a deliberate human action.

## Live TxLINE mode

Set these server-side variables in your deployment environment:

```dotenv
TXLINE_NETWORK=devnet
TXLINE_API_TOKEN=<activated token from the matching network>
ATTESTOR_SECRET_KEY=<base58 64-byte nacl secret key>
DEMO_REPLAY_ENABLED=true
```

`TXLINE_GUEST_JWT` is optional. If omitted, the server requests and caches a fresh guest JWT from the matching TxLINE host. Never put either credential in a `NEXT_PUBLIC_*` variable.

Network pairing is strict:

| Network | TxLINE API origin | TxLINE program |
|---|---|---|
| Mainnet | `https://txline.txodds.com` | `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` |
| Devnet | `https://txline-dev.txodds.com` | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |

The configured API token remains authoritative for every fixture ID it supplies. When replay is enabled, the catalog also exposes non-colliding finished World Cup cards as explicitly labelled, source-linked replays; they are never merged into the TxLINE event stream.

## Repository guide

- `app/api` — public application API; secrets remain here on the server.
- `lib/txline.ts` — TxLINE authentication, endpoint calls and schema normalisation.
- `lib/sse.ts` — chunk-safe upstream SSE parsing and score-envelope extraction.
- `lib/pulse-replay.ts` — deterministic catch-up reconstruction and high-signal summary.
- `lib/attestation.ts` — canonical message, moment hash and Ed25519 signing.
- `lib/solana-client.ts` — browser transaction construction for `create_match_pass` and `claim_moment`.
- `programs/pulseproof/src/lib.rs` — Anchor smart contract.
- `tests` — signature, integration-model and anti-replay tests.
- `docs/VI_HACKATHON_PLAN.md` — detailed Vietnamese product and compliance plan.
- `docs/ARCHITECTURE.md` — end-to-end data and trust architecture.
- `docs/DEPLOYMENT.md` — TxLINE activation, program deployment and app deployment checklist.
- `docs/DEMO_SCRIPT.md` — timed five-minute video script.
- `docs/SUBMISSION.md` — submission-ready English copy.
- `docs/THREAT_MODEL.md` — trust boundaries, attack paths and residual risks.
- `docs/TEST_REPORT.md` — reproducible verification evidence.
- `docs/LIVE_DATA_AND_REPLAY.md` — multi-match streaming, Catch-up and production operations.
- `docs/JUDGE_SCORECARD.md` — honest score, remaining blockers and >90-point submission path.
- `docs/DATA_INTEGRITY.md` — source priority, freshness, eliminated-team guards and no-fabrication rules.

## Important submission caveat

The listing says AI agents may participate, but the official TxODDS terms say entries must be created and submitted by natural persons and may disqualify work materially controlled by an autonomous agent. The human participant must therefore review, understand, test, materially customise and own this project, keep a development log, and personally submit it. Do not submit the scaffold unchanged or represent work you cannot explain.

## Data and brand compliance

- Raw TxLINE data is not persisted or republished as a dataset. Live responses are transformed into product UI and the proof endpoint stores/returns only a digest.
- Cross-checked fallback results cite their source; locally assigned replay sequence IDs remain `verified=false` and are never represented as TxLINE data.
- No FIFA/tournament logo, official trophy, kit art, trademarked crest or sponsorship claim is used.
- Confirm post-hackathon data rights with TxODDS before keeping the live integration online; the hackathon data licence is time-limited.

This project is not affiliated with or endorsed by FIFA or any tournament organiser.
