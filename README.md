# PulseProof

PulseProof is a live football second screen that turns TxLINE score events into simple fan context and a verifiable **Proof of Watch** on Solana. It is designed for the TxODDS **Consumer and Fan Experiences** track.

## Public release

- Live app: [https://pulseproof-production-06fa.up.railway.app](https://pulseproof-production-06fa.up.railway.app)
- Health: [https://pulseproof-production-06fa.up.railway.app/api/health](https://pulseproof-production-06fa.up.railway.app/api/health)
- Public repository: [https://github.com/cryptovuive/pulseproof](https://github.com/cryptovuive/pulseproof)
- CI: [GitHub Actions](https://github.com/cryptovuive/pulseproof/actions)
- Judge room: [https://pulseproof-production-06fa.up.railway.app/submission](https://pulseproof-production-06fa.up.railway.app/submission)
- Fan Zone: [https://pulseproof-production-06fa.up.railway.app/fan-zone](https://pulseproof-production-06fa.up.railway.app/fan-zone)
- 2:24 live product demo: [https://pulseproof-production-06fa.up.railway.app/pulseproof-demo.mp4](https://pulseproof-production-06fa.up.railway.app/pulseproof-demo.mp4)

The public release uses an activated TxLINE devnet token and a Railway-hosted SSE bridge. TxLINE devnet can publish fixture IDs/participants without authoritative competition or kick-off fields. PulseProof enriches only an exact current team-pair match from the separately source-linked verified schedule and labels that provenance; unmatched fixtures stay explicitly unavailable instead of receiving an invented tournament.

## Verified devnet deployment

- PulseProof program: [`74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn`](https://explorer.solana.com/address/74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn?cluster=devnet)
- TxLINE free-tier subscription: [`54TvjbxjP41cBP4BebWWyoJNWex6evuwapHcYb9hWziErFkvpfFPgTkU9bc2K9iGUnXojEWiNHS1wUTiktiMXgbC`](https://explorer.solana.com/tx/54TvjbxjP41cBP4BebWWyoJNWex6evuwapHcYb9hWziErFkvpfFPgTkU9bc2K9iGUnXojEWiNHS1wUTiktiMXgbC?cluster=devnet)
- Program deployment: [`4z4ihcYmRc6rTv9hFB7D4yAvxqgPBMLubVYB954MfVBoiYijZ4CUwB7vPSEfgaRLWAuyH6avZvP519gvT4ceNdS`](https://explorer.solana.com/tx/4z4ihcYmRc6rTv9hFB7D4yAvxqgPBMLubVYB954MfVBoiYijZ4CUwB7vPSEfgaRLWAuyH6avZvP519gvT4ceNdS?cluster=devnet)
- Fan progression upgrade: [`5MdiMZ6czSTQumn5vrL2uJsmtBRp6SexTpTW23sRnKB7kj6iieUvZ5EfZtsW1cQF8wg1AnKM9r6zr2wda5yAgTUV`](https://explorer.solana.com/tx/5MdiMZ6czSTQumn5vrL2uJsmtBRp6SexTpTW23sRnKB7kj6iieUvZ5EfZtsW1cQF8wg1AnKM9r6zr2wda5yAgTUV?cluster=devnet)
- Config initialization: [`3PeE9suRvD3XUi5j7GNERqYVAd7dyGHmEjy9DWmkpBwJZnTwV1ozdUXKz45Y21f9qT6WbMFRJdqSQvvruPFgr2MB`](https://explorer.solana.com/tx/3PeE9suRvD3XUi5j7GNERqYVAd7dyGHmEjy9DWmkpBwJZnTwV1ozdUXKz45Y21f9qT6WbMFRJdqSQvvruPFgr2MB?cluster=devnet)
- Verified claim: [`vid5hzmuF2FJnzFvZa7251fLdh5d5eRrn4WyvPd85WVKAcnccBbJhKEUFXx5VAXgvBEYp9bjZcToSp5yfnJHHCR`](https://explorer.solana.com/tx/vid5hzmuF2FJnzFvZa7251fLdh5d5eRrn4WyvPd85WVKAcnccBbJhKEUFXx5VAXgvBEYp9bjZcToSp5yfnJHHCR?cluster=devnet)

The project deliberately avoids wagering: there are no deposits, entry fees, transferable rewards, prize pools, odds-based financial actions, or pay-to-win mechanics. Fan points and badges are non-financial product signals.

## What is already implemented

- Polished, responsive match dashboard with score, phase, momentum, latest signal, timeline and watch room.
- Server-only TxLINE adapter with network consistency checks and guest-JWT renewal.
- TxLINE fixture snapshot, score snapshot, historical score and stat-validation integrations.
- Multi-match center for up to eight covered fixtures with live/finished filters and standard team flags/codes.
- Local-first `My Pulse` personalization with followed teams, `My Matches`, personalized upcoming fixtures, last-match resume and shareable fixture deep links.
- Matchday Command Center with a followed-team next action, source-linked Road to the Final, explicit TBD finalists and a compact return-to-match path.
- Opt-in Smart Alerts for kick-off, goal, red card, VAR and full time, with followed-team scope, 0–120 second broadcast delay, persistent in-app inbox and spoiler-protected copy.
- Four-step Quick Product Tour that takes a first-time fan or judge through fixture provenance, personalization, Catch-up and Solana Proof of Watch.
- Installable PWA with a consumer-safe Offline Recap Pack for finished matches; the service worker never caches API or SSE responses, and attestations/claims stay disabled offline.
- Spoiler Shield that protects finished scores, match brief, timeline and final momentum while keeping Catch-up progressive.
- Direct TxLINE `/scores/stream` SSE bridge exposed publicly at `/api/scores/stream` (plus `/scores/stream` compatibility alias), with fixture filtering, sequence de-duplication, heartbeat and reconnect.
- Snapshot-to-now and historical Catch-up with timeline scrubbing and 1x/2x/4x playback.
- Verified Catch-up Capsules: share an exact spoiler-safe event prefix as an Ed25519-signed link; redemption re-checks the source and returns zero future-event payloads.
- Upcoming Match Hub prefers complete TxLINE fixture metadata and otherwise uses a source-linked, integrity-checked schedule, with local timezone, countdown, saved reminders and `.ics` calendar export.
- Judge Verification Lab that proves an evidence-bound Ed25519 attestation without requiring Phantom, SOL or a transaction.
- Three completed World Cup 2026 replays with source-linked scores, scorer/assist details, cards and stoppage-time labels; local sequence IDs remain explicitly non-TxLINE.
- Consumer timeline removes technical coverage records, exposes honest empty states and produces a deterministic Match Brief only from on-pitch source events.
- Phantom wallet connection and raw Solana transaction builder.
- Anchor program with config authority, per-wallet/per-fixture Fan Pass PDA, one receipt PDA per moment, badge bitmap and points.
- On-chain Fan Profile PDA with deterministic daily check-in, UTC streak bonus, global earned/spent points, 256-slot non-transferable inventory and equipped badge/frame/character state.
- Daily five-question reward quiz plus ten-question unlimited practice sets drawn from a deterministic 10,000-variant catalog. Every variant preserves a server-side answer, two/four choices and its supporting FIFA source; practice cannot mint points.
- Cosmetic vault with 36 non-transferable rewards: badges, medals, avatar frames and original PulseProof profile characters.
- FIFA-sourced mascot archive: official, attributed media for Maple, Zayu and Clutch plus a neutral text-only history index from 1966–2022, so the app never presents invented emoji or imitation artwork as an official mascot.
- Fixture-scoped fan chat over SSE with real presence, no seeded/fake users and a bounded 50-message room window. Posting requires a fresh Phantom signature and reads the public display name from a wallet-owned Fan Alias PDA; spam, links, wagering terms, wallet secrets and signature replay are rejected.
- Signed reward redemption with catalog-bound kind, index, cost and digest; the program rejects overspending, duplicate ownership, receipt replay and badge/frame/character kind confusion.
- Ed25519 attestation verification through the Solana Ed25519 precompile; the claim instruction must immediately follow the signature-verification instruction.
- Server-side moment attestations tied to wallet, fixture, TxLINE sequence-derived hash, evidence digest, points, badge and a five-minute expiry.
- One hundred ten automated unit/integration/contract/submission tests plus Phantom-compatible wallet, local-validator and public-devnet flows covering valid state transitions and adversarial/integrity assertions.

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

The configured API token remains authoritative for every TxLINE fixture ID and event it supplies, but a fixture is rendered only when its competition metadata or exact-pair schedule enrichment proves it belongs to the men's FIFA World Cup 2026. Unavailable, club and women's competition labels are excluded. When replay is enabled, the catalog also exposes non-colliding finished World Cup cards as explicitly labelled, source-linked replays; they are never merged into the TxLINE event stream.

## Repository guide

- `app/api` — public application API; secrets remain here on the server.
- `lib/txline.ts` — TxLINE authentication, endpoint calls and schema normalisation.
- `lib/sse.ts` — chunk-safe upstream SSE parsing and score-envelope extraction.
- `lib/pulse-replay.ts` — deterministic catch-up reconstruction and high-signal summary.
- `lib/catch-up-capsule.ts` — canonical prefix commitment, bounded token format and Ed25519 issue/verification logic.
- `lib/saved-recaps.ts` — bounded, validated and consumer-safe offline recap packs.
- `lib/attestation.ts` — canonical message, moment hash and Ed25519 signing.
- `lib/solana-client.ts` — browser transaction construction for match claims, Fan Profile/Fan Alias, check-in, quiz claim, redemption and equipping.
- `lib/quiz-bank.ts` — source-backed facts, deterministic 10,000-variant catalog, daily/practice selection and grading.
- `lib/reward-catalog.ts` — cosmetic catalog, stable on-chain indexes, prices and seasonal availability.
- `lib/community-chat.ts` — bounded fixture rooms, moderation, presence, signature replay protection and SSE broadcast.
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
- `docs/PRODUCT_GROWTH_RESEARCH.md` — global product patterns, implemented retention loop, accuracy gates and ecosystem roadmap.

## Important submission caveat

The listing says AI agents may participate, but the official TxODDS terms say entries must be created and submitted by natural persons and may disqualify work materially controlled by an autonomous agent. The human participant must therefore review, understand, test, materially customise and own this project, keep a development log, and personally submit it. Do not submit the scaffold unchanged or represent work you cannot explain.

## Data and brand compliance

- Raw TxLINE data is not persisted or republished as a dataset. Live responses are transformed into product UI and the proof endpoint stores/returns only a digest.
- Cross-checked fallback results cite their source; locally assigned replay sequence IDs remain `verified=false` and are never represented as TxLINE data.
- No FIFA/tournament logo, official trophy, kit art, trademarked crest or sponsorship claim is used.
- Confirm post-hackathon data rights with TxODDS before keeping the live integration online; the hackathon data licence is time-limited.

This project is not affiliated with or endorsed by FIFA or any tournament organiser.
