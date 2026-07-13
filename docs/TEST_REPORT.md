# Verification report

Date: 13 July 2026
Environment: Windows + WSL2 Ubuntu 24.04, Node.js 20.19, Rust 1.97, Solana CLI 2.3.0, Anchor 0.32.1.

## Automated unit tests

Command:

```bash
npm test
```

Result: **75/75 passed** across sixteen suites.

- TxLINE fixture and score-action schema normalisation.
- Sparse TxLINE fixtures never receive fabricated kick-off/competition metadata.
- Metadata-only coverage records never imply live play or award fan points.
- Momentum bounds.
- Canonical Ed25519 message verification.
- Post-signature points tampering rejection.
- Unique deterministic moment hashes.
- TxLINE proof digest changes the signed evidence hash.
- Fan Pass point and badge model.
- Duplicate-receipt model rejection.
- Smart Alert preference validation, supported-event classification, followed-team scope, verified-only delivery and Spoiler Shield copy protection.
- Road-to-the-Final construction preserves chronological semi-finals and intentionally leaves final/third-place participants TBD.
- Attestation rate-limit window and reset behaviour.
- Official team-code and flag-key mapping across every covered schedule team.
- Chunk-safe SSE parsing across split network boundaries and nested score envelopes.
- Three-fixture demo isolation, overview consistency and exact replay reconstruction.
- Hybrid catalog keeps active TxLINE fixtures and three labelled World Cup 2026 finished replays together without ID collisions.
- Structured scorer, assist, yellow-card and stoppage-time preservation (including 90+1 and 90+10).
- Exact-pair schedule enrichment labels current World Cup fixtures while leaving unmatched TxLINE devnet fixtures explicitly unavailable.
- My Pulse storage normalization, followed-team filtering, deep-link priority and last-fixture resume.
- Consumer timeline metadata suppression, deterministic Match Brief and live freshness labels.
- Progressive Catch-up counts prevent Spoiler Shield from leaking future goals or cards.
- Upcoming-fixture ordering, non-negative countdowns and RFC-style calendar reminders.
- Offline Recap Pack validation, metadata removal, raw-action sanitisation, de-duplication and an eight-match storage bound.
- PWA manifest contract plus service-worker guarantees that API and SSE traffic are never cached.

## Smart-contract compilation

Commands:

```bash
cargo check -p pulseproof
anchor build
```

Results:

- Rust/Anchor host compilation passed.
- Solana SBF release build passed.
- IDL and TypeScript types generated.
- Program ID synced to `74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn`.

## Real local-validator E2E

Command:

```powershell
npm run contract:e2e:windows
```

The harness creates an isolated ledger and payer, deploys the SBF binary, initialises config and executes real Solana transactions.

Repeatability regression: the wallet-backed suite was run twice consecutively. Each run selected an independent RPC/faucet/dynamic port range, captured the exact validator PID and shut it down cleanly. Both complete deployments and adversarial suites passed without shared PDA state.

Verified assertions:

1. Config pins the expected 32-byte attestor.
2. Valid Ed25519 claim succeeds.
3. Points, badge bitmap and claim counter update correctly.
4. Receipt PDA is created.
5. Duplicate receipt is rejected.
6. Altered points are rejected.
7. Altered evidence digest is rejected.
8. Wrong attestor is rejected.
9. Expired attestation is rejected.
10. Badge ≥64 and points >100 are rejected.
11. Far-future expiry is rejected.
12. Every rejected transaction leaves points/counter unchanged.

## Phantom-compatible disposable wallet

- Generated localnet/devnet-only public key: `8qdg3U5FXJD8H5Y5Fv6hsWxJbPLwaUmyUUYyFYVLsAyV`.
- Secret JSON and Phantom-import private key are stored only under gitignored `.local-wallets/` and never printed.
- Verified 64-byte key integrity, public-key consistency, detached `signMessage` semantics and transaction signatures.
- Used that same wallet as payer/owner for the full validator deployment, Fan Pass creation, valid claim and adversarial rejection suite.

## HTTP/API smoke tests

Production server was started on an isolated port and tested through HTTP.

| Check | Result |
|---|---|
| `/api/health` | 200 |
| `/api/matches` demo catalog | 200, three fixtures and correct source label |
| Multiplex replay SSE | One connection delivered moments for all three fixture IDs |
| Replay attestation | 200, 64-character evidence hash, Ed25519 signature returned |
| Eleventh attestation in one minute | 429 |
| Request body >4 KiB | 413 |
| CSP frame protection | `frame-ancestors 'none'` present |
| `/manifest.webmanifest` | 200, `application/manifest+json` |
| `/sw.js` | 200, JavaScript; CSP permits only same-origin workers/manifests |

## UI/browser smoke tests

- Match Center renders three independent fixtures with BRA/NOR, POR/ESP and FRA/MAR flags/codes.
- Selecting Portugal–Spain updates the scoreboard to fixture `18198205`, `POR 0–1 ESP` without navigation.
- Catch-up loads seven on-pitch events, supports `1x/2x/4x`, jump-to-latest, and never includes technical metadata.
- Progressive Catch-up Event 1 reports zero future goals/cards/VAR and does not expose the final score.
- Live filter excludes historical replay; it never implies a completed match is currently live.
- Upcoming hub converted UTC to `Asia/Bangkok`, rendered France–Spain and England–Argentina, and kept third-place/final participants as `TBD`.
- Integrity regression rejects Brazil or another eliminated team in a confirmed future fixture.
- Saved filter returned exactly one selected fixture; calendar payload is covered by unit tests without triggering an unsolicited download.
- Matchday Command Center renders both semi-finals, a `TBD vs TBD` final and a `TBD vs TBD` third-place fixture without inferring winners.
- Quick Product Tour advances through all four fixture/personalization/Catch-up/Proof-of-Watch steps.
- Arming Smart Alerts without followed teams selects the explicit all-covered scope; event-type and 60-second delay choices persist after reload.
- Spoiler Shield hides finished scores and replaces future alert content with a generic protected update.
- Labelled replay Catch-up leaves Matchday Inbox empty; simulated or metadata records cannot create alert activity.
- Judge Verification Lab returned and locally verified a short-lived evidence-bound Ed25519 proof without Phantom or SOL.
- Browser result audit reached `FRA 2–0 MAR`, `POR 0–1 ESP` and `BRA 1–2 NOR`; the Live filter returned zero fixtures because all fallback matches are historical.
- Upcoming audit showed only `France–Spain`, `England–Argentina`, `TBD–TBD` and `TBD–TBD`, each with provenance and no eliminated participant.
- Watch-room vote changes `aria-pressed` and displays confirmation.
- A 390×844 responsive viewport retains the Command Center, accessible Quick Tour, TBD bracket and persisted alert state.
- Saving a finished replay changes the command-center count to `1 saved recap` and survives a full reload.
- With the production server then stopped, the controlled PWA reloads from its shell cache, enters the labelled `Offline library`, restores the saved match and runs Catch-up locally.
- Offline mode disables the live stream, Judge Verification Lab and on-chain claim path, and displays explicit reconnect copy instead of simulating verification.
- Production console verification is performed after each Railway deployment; development-only CSP/eval diagnostics are not production failures.

## Build and dependency checks

```bash
npm run lint
npm run build
npm audit --omit=dev
```

- ESLint: passed.
- Next.js production compilation and TypeScript: passed.
- Dependency audit: zero known vulnerabilities. A targeted `jayson → uuid@11.1.1` override removes the vulnerable transitive UUID release without downgrading or replacing `@solana/web3.js`.
- Compatibility checks generated a Jayson JSON-RPC request ID and completed a read-only Solana devnet `getVersion` call (`solana-core 4.1.0`) before the full test/build run.

## Public devnet and live-credential verification — 13 July 2026

- Activated TxLINE devnet level `1` with an Explorer-visible subscription transaction.
- Authenticated `fixtures/snapshot` returned five covered fixtures.
- Connected directly to `/api/scores/stream`: HTTP `200`, `text/event-stream`, heartbeat received, token redacted.
- Deployed the 285,632-byte PulseProof program to public devnet.
- Initialized the config PDA with a fixed local/production attestor public key.
- Created a Fan Pass and accepted an Ed25519 claim on devnet; receipt creation was confirmed and a duplicate claim was rejected.
- `75/75` unit/integration/contract tests, ESLint, production build and Phantom-compatible signature tests passed after release changes.
- GitHub Actions passed on the public `cryptovuive/pulseproof` repository.
- Railway health returned `ok: true`, `credentialsConfigured: true`, TxLINE devnet program `6pW64...wyP2J` and demo replay enabled as an explicitly labelled fallback.
- Public SSE returned `200 text/event-stream`, `ready`, an initial `pulse`, and a real heartbeat after 15 seconds without proxy buffering.
- Sparse devnet fixtures no longer invent a start time, competition or game state; metadata-only `coverage_update/comment` records are labelled `COVERED`, award zero points and never imply the match is live.

## Remaining external verification

- A score-changing TxLINE stream record during a covered live fixture; the current 30-second proof window contained only a genuine heartbeat.
- Phantom extension UI recording against the deployed program; the same disposable wallet already produced the Explorer-visible devnet claim through the transaction builder.
