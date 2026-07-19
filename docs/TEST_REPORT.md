# Final verification report

**Verification date:** 19 July 2026

**Primary environment:** Windows, Node.js 22, npm, Rust/Anchor CI

**Release:** PulseProof public Railway deployment and Solana devnet program

## Release result

| Gate | Result |
|---|---|
| Vitest | **154/154 passed** |
| ESLint | Passed |
| Next.js production build and TypeScript | Passed |
| Native Rust contract invariants | Passed in GitHub CI |
| Runtime dependency audit | Zero known vulnerabilities |
| Tracked-secret pattern scan | No token, wallet key or signing key found |
| GitHub visibility | Public |
| GitHub CI | Green |
| Final MP4 | 4:49.046, 1080p, below five minutes |

Reproduce the main release gates:

```bash
npm ci
npm test
npm run lint
npm run build
npm audit --omit=dev
```

## Automated coverage

The 154 tests span these product and integrity surfaces:

- TxLINE fixture, score and action-schema normalization;
- uppercase/lowercase and sparse documented payload variants;
- strict network and program pairing;
- World Cup allow-list and exact-pair schedule enrichment;
- eliminated-team and future-winner guards;
- standard team codes and country flag keys;
- chunk-safe SSE parsing, multiplexing, de-duplication and heartbeat;
- multi-match catalog selection and replay isolation;
- complete finished-match replay and sequence preservation;
- scorer, assist, yellow/red card, substitution, VAR and stoppage-time details;
- progressive Catch-up and Spoiler Shield future-event isolation;
- signed Catch-up Capsule bounds, expiry, tamper rejection and source re-check;
- Match Brief determinism and unsupported-stat exclusion;
- My Pulse preferences, followed teams, deep links and resume behavior;
- upcoming fixture ordering, local countdown and calendar format;
- saved recaps and bounded Offline Recap Pack sanitization;
- service-worker exclusion of API, SSE and proof paths;
- smart alert verification, followed-team scope and spoiler-safe copy;
- wallet-session continuity across Live Center and Fan Zone;
- Fan Alias validation and persistence model;
- chat message signatures, room isolation, replay rejection and moderation;
- 10,000 stable quiz variants, two/four options and answer non-disclosure;
- daily/practice separation, scoring and receipt replay rejection;
- 36-item reward catalog parity, stable indexes, prices and availability;
- reward attestation wallet/kind/index/cost/digest binding;
- check-in streak, quiz claim, redemption, inventory and equipped-state models;
- Ed25519 canonical message and post-signature tamper rejection;
- deterministic moment and receipt hashes;
- contract duplicate receipt, overspend, expiry and kind-confusion rejection;
- retired reward index rejection;
- public Judge Room and final submission assets;
- caption duration, line length and forbidden dash-glyph rules;
- final V5 scene plan, Phantom desktop evidence and transcript parity.

## Smart-contract verification

Program ID: `74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn`

Contract gates:

```bash
cargo fmt --manifest-path programs/pulseproof/Cargo.toml -- --check
cargo test --manifest-path programs/pulseproof/Cargo.toml
npm run contract:e2e:windows
npm run contract:e2e:devnet
npm run contract:retired:devnet
```

The isolated local-validator harness deploys the SBF binary, initializes config and verifies real Solana state transitions. Its assertions include:

1. pinned attestor identity;
2. valid Ed25519 claim acceptance;
3. Fan Pass points, bitmap and counter mutation;
4. deterministic receipt creation;
5. duplicate receipt rejection;
6. altered points/evidence rejection;
7. wrong attestor rejection;
8. expired and far-future attestation rejection;
9. bounds on points and badge index;
10. no state mutation after a rejected transaction.

Public devnet evidence additionally proves program deployment, Fan Profile upgrade, catalog parity and an `InvalidRewardIndex` custom-6016 rejection for retired index `36`.

## API and stream verification

| Route | Expected behavior |
|---|---|
| `/api/health` | HTTP 200 with network, program, credential and data-licence state |
| `/api/matches` | World Cup-gated catalog with distinct live/replay source lanes |
| `/api/matches/{fixtureId}` | Current score and normalized event state |
| `/api/scores/stream` | `text/event-stream`, no proxy buffering, `ready`/`pulse`/heartbeat and normalized moments |
| `/scores/stream` | Compatibility alias with the same stream contract |
| `/api/attest` | Short-lived wallet/fixture/moment/evidence-bound proof |
| `/api/capsules` | Exact-prefix issue/redeem with no future payload |
| `/api/community/chat` | Signature-gated bounded fixture room |
| `/api/quiz` | Answer-safe question delivery and server grading |
| `/api/rewards/attest` | Catalog-bound signed redemption or fail-closed rejection |

Security checks cover body-size limits, rate limiting, CSP/frame protection, no-store proof responses and server-only credentials.

A final 20-second public production probe on 19 July returned HTTP `200`, `Content-Type: text/event-stream`, `X-Accel-Buffering: no`, `ready` with `mode: txline-live`, a TxLINE pulse for fixture `18257865` at `FT` with score `[4,6]` and 39 source moments, followed by a heartbeat. The connection remained open until the client-side test timeout, which is the expected SSE behavior.

## Browser and UX verification

- Multi-match cards switch the selected fixture without page navigation.
- Live, Finished and followed-team filters do not mix source lanes.
- Spoiler Shield hides scores and Road-to-the-Final results.
- Start Catch-up advances the actual score, momentum and timeline state.
- Complete replay exposes Match Brief and every supported on-pitch event.
- Pause, resume, 1x, 2x and 4x replay controls remain functional.
- Wallet connection remains shared between Live Center and Fan Zone.
- Alias, check-in, quiz and reward state update immediately after successful confirmation.
- Duplicate daily claims and duplicate receipts are disabled or rejected.
- The reward view exposes all 36 items before selection.
- Chat displays the on-chain alias after fresh Phantom message signing.
- Mobile layouts retain the Command Center, Catch-up, Fan Zone and judge path without critical horizontal overflow.
- Offline mode restores only sanitized saved recap data and disables live/proof/write paths.
- Judge Room passes eight fresh checks against the deployed product.

## Final video verification

- File: `public/pulseproof-demo.mp4`
- Duration: `289.046440` seconds
- Container: MP4
- Video: H.264, 1920x1080, 30 fps
- Audio: AAC, 22.05 kHz, mono
- Size: `15,490,180` bytes
- SHA-256: `aa1b22060da889766f0091ff511b39ee27861fe828959e085afd7aead9578e59`
- Captions: sentence-level English WebVTT, final cue before five minutes
- Transcript: all 16 final V5 scene titles and narration blocks
- Phantom: real devnet approval/signature surfaces are visible in the relevant desktop segments
- Replay: complete Event 1 through 9 test plus Match Brief and full source-sequenced timeline

The local release file and the public Railway file were hash-compared and matched byte-for-byte before this report.

## Repository hygiene verification

- `.env.local`, wallet files, SBF keys, `target/`, `.next/`, `node_modules/`, logs and raw recording directories are ignored.
- Final V4/V5 raw video, audio and intermediate segments remain local and are not tracked.
- Obsolete V1 scene specifications and renderers were removed from the final repository.
- The final MP4 is the only large tracked release artifact; it is under 20 MB and is required by the public product/Judge Room.
- Direct runtime dependencies and media boundaries are listed in `THIRD_PARTY_NOTICES.md`.
- No general open-source licence is implied merely by repository visibility.

## Known production boundaries

These are deliberate limits, not hidden test failures:

- Live TxLINE calls fail closed after the published hackathon data-access window unless written permission is configured.
- Review after that window uses the labelled replay, final video, Judge Room, CI and Explorer evidence.
- Chat history/presence are bounded in memory for one hackathon service instance; managed pub/sub and durable moderation are post-hackathon work.
- Browser notifications work while the app is active; closed-app Web Push requires a subscription/revocation backend.
- The final demo proves the live pipeline and source-sequenced replay without depending on a goal occurring during the five-minute recording.
