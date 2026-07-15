# Verification report

Date: 14 July 2026
Environment: Windows + WSL2 Ubuntu 24.04, Node.js 20.19, Rust 1.97, Solana CLI 2.3.0, Anchor 0.32.1.

## Automated unit tests

Command:

```bash
npm test
```

Result: **133/133 passed** across twenty-six suites.

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
- Deterministic once-per-UTC-day streak awards, streak reset and capped day-seven bonus.
- Quiz answer non-disclosure, 10,000 stable variant IDs, deterministic daily/practice selection, exact two/four-option schema, official FIFA source links, stale-round rejection and signed result verification.
- Thirty-six unique catalog items with stable indexes, price bounds, seasonal close enforcement and six high-resolution atlas contracts; the smart contract and API both reject retired or out-of-range reward indexes.
- Eighteen sourced mascot records with the official 2026 trio split by host nation and playing role; JPEG integrity and the removal of misleading emoji markers are enforced.
- Reward attestation binds wallet, catalog digest, kind, item index and cost; unknown catalog identifiers fail closed.
- Chat verifies wallet signatures and FanAlias, rejects tampering/replay, isolates fixture rooms, blocks links/wagering/secrets/spam and enforces a 50-message ring bound.
- Fan progression model rejects quiz replay, overspending and duplicate reward redemption.
- Smart Alert preference validation, supported-event classification, followed-team scope, verified-only delivery and Spoiler Shield copy protection.
- Road-to-the-Final construction preserves chronological semi-finals and intentionally leaves final/third-place participants TBD.
- Attestation rate-limit window and reset behaviour.
- Official team-code and flag-key mapping across every covered schedule team.
- Chunk-safe SSE parsing across split network boundaries and nested score envelopes.
- Three-fixture demo isolation, overview consistency and exact replay reconstruction.
- Competition allow-list rejects unmatched, unavailable and Club World Cup labels; only proven men's World Cup 2026 fixtures reach the catalog or SSE bridge.
- Structured scorer, assist, yellow-card and stoppage-time preservation (including 90+1 and 90+10).
- Exact-pair schedule enrichment labels current World Cup fixtures while unmatched TxLINE devnet fixtures remain unavailable and excluded.
- My Pulse storage normalization, followed-team filtering, deep-link priority and last-fixture resume.
- Consumer timeline metadata suppression, deterministic Match Brief and live freshness labels.
- Progressive Catch-up counts prevent Spoiler Shield from leaking future goals or cards.
- Catch-up Capsule canonical signing, token bounds, expiry, tamper rejection, source re-check and exact-prefix redemption.
- Upcoming-fixture ordering, non-negative countdowns and RFC-style calendar reminders.
- Offline Recap Pack validation, metadata removal, raw-action sanitisation, de-duplication and an eight-match storage bound.
- PWA manifest contract plus service-worker guarantees that API and SSE traffic are never cached.
- Submission MP4 container/size contract, five live-demo caption cues, sub-five-minute final cue and one capture/still source per chapter.
- Judge room contract for the public video, captions, Explorer evidence and deterministic capture slides.

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
- Fan progression upgrade compiled to SBF and was deployed without changing the existing Program ID.

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

## Submission video verification

- Final duration: **144.046 seconds (2:24.046)**, below the five-minute limit enforced by the renderer.
- Video: H.264, 1920×1080, 30 fps; audio: AAC narration; MP4 size: 6,636,520 bytes.
- Five chapter markers, five English WebVTT caption cues and a full text transcript are included.
- A separate 1920×1080 PNG thumbnail is ready for the submission form or social preview.
- FFmpeg volume audit measured −22.2 dB mean and −3.3 dB peak, with no clipping.
- Sequential-decoder visual review sampled the complete encode at twelve-second intervals plus twenty frames across the Catch-up Capsule transition. It confirms the real product walkthrough, fresh 8/8 production proof run and finalized Explorer transaction; no compositor gap or personal desktop/session frame is present.
- SHA-256: `d1cf7d9aa8f355e1a5ffb8045b7d65d52cdf5b2b9e88393186a9c7d873685c45`.

## Public devnet and live-credential verification — 13 July 2026

- Activated TxLINE devnet level `1` with an Explorer-visible subscription transaction.
- Authenticated `fixtures/snapshot` returned five covered fixtures.
- Connected directly to `/api/scores/stream`: HTTP `200`, `text/event-stream`, heartbeat received, token redacted.
- Deployed the original 285,632-byte PulseProof program to public devnet.
- Initialized the config PDA with a fixed local/production attestor public key.
- Created a Fan Pass and accepted an Ed25519 claim on devnet; receipt creation was confirmed and a duplicate claim was rejected.
- `133/133` unit/integration/contract/submission tests, ESLint, TypeScript, production build, Cargo format and native Rust invariant tests pass. A digest-pinned Anchor 0.32.1 workflow built the deployed SBF so the catalog upgrade did not reuse a stale binary when the local WSL VM was unavailable.
- GitHub Actions passed on the public `cryptovuive/pulseproof` repository.
- Railway health returned `ok: true`, `credentialsConfigured: true`, TxLINE devnet program `6pW64...wyP2J` and demo replay enabled as an explicitly labelled fallback.
- Public SSE returned `200 text/event-stream`, `ready`, an initial `pulse`, and a real heartbeat after 15 seconds without proxy buffering.
- Sparse devnet fixtures no longer invent a start time, competition or game state; metadata-only `coverage_update/comment` records are labelled `COVERED`, award zero points and never imply the match is live.

## Public Fan Progression E2E — 14 July 2026

- Upgraded the same public program in slot `476138207`; ProgramData is now 416,704 bytes. Upgrade transaction: `5MdiMZ6...AgTUV` (finalized).
- Created Fan Profile PDA `GWW47tJr...XZGgZ` for disposable devnet wallet `8qdg3U5F...LsAyV`.
- Finalized daily check-in `Wx1UaexR...VUTjRK7`; an immediate second check-in was rejected.
- Finalized signed TxLINE moment claim `63Xd5qVC...LT97p` and signed quiz claim `2dSD6oJM...qpAzxo`; repeating the same quiz receipt was rejected.
- Finalized Quiz Spark redemption `5y1ZXtGd...K5QpjA` and equip transaction `2vgZH91e...XW3j7W`; attempting to equip the badge as a character was rejected.
- Read-back state: 85 points earned, 60 spent, one check-in, one quiz claim, reward index 13 owned and equipped.
- Upgrade, check-in, quiz, redemption and equip signatures were independently queried and all returned `Finalized`.
- Cosmetic atlases were converted from 14.55 MB of PNG source assets to 1.77 MB of 1536×1024 WebP production assets, an 87.8% transfer reduction while preserving the atlas dimensions.

## World Cup-only + Fan Alias upgrade — 14 July 2026

- Program upgraded at devnet slot `476152519`; upgrade signature `4iryzBYp...5qVk9R8` finalized while retaining Program ID `74cvsTMZ...UGxRMkn`.
- Fan Alias PDA `HA2NUKea...nj5o9QN` was created/updated twice and read back as `Cryptovuive`; signatures `2VGkYV36...P9GHqq` and `4BaHJBRb...htwuw` confirmed.
- Unsafe alias `bad/name` was rejected on-chain.
- Chat tests cover body tampering, signature replay, room isolation, moderation and bounded retention.
- Quiz tests enumerate all 10,000 stable IDs, validate 2/4-option bounds, verify no answer leak and grade both daily and practice sets.

## Retired reward hardening upgrade — 14 July 2026

- Removed six retired shirt rewards from the web catalog, API allowlist, assets and source; the public catalog now contains exactly 36 badges, medals, frames and original characters.
- Added an on-chain catalog upper bound and native Rust invariants so both `redeem_reward` and `equip_reward` reject index `36` or above before any inventory mutation.
- Reproducible SBF [workflow run 29336473514](https://github.com/cryptovuive/pulseproof/actions/runs/29336473514) produced a 409,544-byte artifact with SHA-256 `7701a26b1d713496e92144915ade70619a13aa9acc4eb50a4702c0e11cb039c8`.
- ProgramData read-back matched the complete 409,544-byte artifact exactly after the finalized slot `476217190` upgrade. Upgrade transaction: `5PLxviYF...nXqmM`.
- A real devnet `equip_reward(kind=0,index=36)` transaction was recorded and failed with `InvalidRewardIndex` / custom error `6016`. Rejection transaction: `3Zx3iHC...73mg7xi`.
- Every retired reward attestation ID returns HTTP `404`, an unsigned body and `Cache-Control: no-store, max-age=0`; an active reward remains signed and resolves to its stable on-chain index.

## Remaining external verification

- A score-changing TxLINE stream record during a covered live fixture; the current 30-second proof window contained only a genuine heartbeat.
- Phantom extension UI recording against the deployed program; the same disposable wallet already produced the Explorer-visible devnet claim through the transaction builder.
