# Judge scorecard — conservative pre-submission assessment

Checked: 14 July 2026.

## Score if submitted today: 95/100

Engineering/product readiness is approximately **97/100**. The product now adds a consumer-facing, cryptographically verifiable differentiator: a Catch-up Capsule commits the exact visible event prefix, carries an Ed25519 signature and redeems with zero future-event payload. The public video records the deployed UI changing state, an eight-step production proof run and the finalized Explorer receipt instead of relying on presentation frames. A recording of an actual score-changing TxLINE stream event and an uninterrupted Phantom-confirmation flow remain the material evidence gaps.

| Area | Score | Evidence-backed judge view |
|---|---:|---|
| Real consumer problem and differentiation | 20/20 | The product handles a real before/during/after fan journey. The signed no-spoiler relay turns “send what I have watched so far” into a source-bound, independently verifiable consumer action rather than another generic score or recap surface. |
| TxLINE integration | 18/20 | Participant-owned devnet subscription, fixture/snapshot/historical/stat-validation usage, canonical public SSE bridge and a newly recorded fresh `ready + pulse` browser test are real. A captured score-changing event from an active covered match is still missing. |
| Product and UX | 20/20 | The matchday loop now continues into a Fan Zone: daily streak, 10,000-variant sourced quiz engine, 36 original cosmetics, sourced mascot archive, equipped avatar identity and wallet-signed fixture chat. My Pulse, reminders, PWA/offline Catch-up, Capsules, accessibility, mobile layout and strict spoiler behavior remain coherent rather than becoming separate feature demos. |
| Solana relevance and security | 20/20 | The same public devnet program now has wallet-owned Fan Profile, quiz/reward receipts, deterministic check-in, non-transferable inventory and equipped state. Public E2E proves replay, overspend and kind-confusion controls in addition to Ed25519 moment claims. |
| Demo and submission evidence | 17/20 | The existing 2:24 demo and Judge Room prove the original live product, but the video predates Fan Zone. The upgraded program and progression transactions are public and Judge Room-readable; a later submission cut should show the new loop visually. |

## Why this is not honestly 95–100 yet

1. The public SSE bridge has verified authentication, `ready`, `pulse` and heartbeat, but no recorded goal/card/VAR event from a match while it was actually being published.
2. The public app has not been recorded connecting Phantom, signing and opening the resulting Explorer transaction in one uninterrupted flow.
3. Watch-room votes and counts intentionally remain local; presenting them as a community feature at scale would be misleading.
4. Browser notifications work while PulseProof is active; closed-app Web Push still needs a consented push subscription and revocation backend.
5. Fan chat is intentionally ephemeral and single-instance for the hackathon build; durable cross-instance rooms, reports and moderator tools remain production work.

## Improvements shipped after the audit

- Matchday Command Center: continue current context, next followed fixture and transparent Road to Final.
- Final and third-place participants remain explicitly `TBD`; bracket winners are never inferred.
- Smart Alerts: verified-event-only policy, granular event types, followed/all-covered scope and broadcast delay.
- Spoiler-protected alert copy and a persistent in-app inbox; replay/metadata cannot manufacture alert activity.
- Four-step Quick Product Tour so a time-constrained judge reaches TxLINE, Catch-up and Solana evidence quickly.
- Installable PWA and bounded Offline Recap Pack; API/SSE traffic is never cached and all verification/claim actions fail closed offline.
- Judge Submission Room with public video player, chapters, captions, transcript and direct evidence links.
- Verified Catch-up Capsules with chained SHA-256 prefix commitment, bounded transport, Ed25519 signature, source re-check and fail-closed redemption.
- Reproducible 2:24 1080p live-capture renderer with three real browser clips, English narration, chapter metadata, direct HWND isolation and a hard five-minute gate.
- On-chain Fan Progression Economy: Solana-clock check-in streaks, signed quiz claims, signed catalog redemption, 256-slot inventory and equipped identity.
- Thirty-six non-transferable original cosmetics across badges, medals, frames and characters, plus an official-media 2026 mascot feature and a text-only historical mascot index without emoji or imitation artwork.
- Daily/practice quiz engine with 10,000 deterministic variants over stable FIFA-linked facts, answer non-disclosure and replay-safe wallet receipts.
- Real SSE fan chat with no seeded users, bounded history and strict link/wagering/secret moderation.
- Automated coverage increased to 117 tests across 24 suites, plus public browser, native contract and devnet proof runners.

## Highest-return actions before submission

1. During the next active covered fixture, capture the canonical `/api/scores/stream` output receiving a real score-changing `moment` and the UI updating from it.
2. Record the participant-controlled Phantom wallet approving a public devnet claim and opening the resulting Explorer transaction in one uninterrupted clip.
3. Have the human participant personally review the 2:24 narration and be able to explain every architecture/security decision before submission.
4. Before production scale, move chat presence/history to managed pub/sub plus durable moderation, and add real Web Push; neither should delay the core hackathon submission.

With the first two evidence gaps closed, a conservative expected score becomes **97–98/100**. A credible 100/100 or top-three probability cannot be guaranteed because ranking also depends on non-public submissions and judge preference.

## Recommended five-minute judge path

1. Open Quick Tour and show provenance, personalization, Catch-up and Proof of Watch in under 45 seconds.
2. Arm Smart Alerts, show the source-linked bracket and explain why finalists remain TBD.
3. Open a TxLINE-covered fixture and show the public SSE `ready`, `pulse`, heartbeat and, if available, a real `moment` update.
4. Enable Spoiler Shield, start Catch-up and prove that Event 1 reports zero future goals/cards/VAR.
5. Open Fan Zone, show sourced quiz → claim → redeem/equip, then run Judge Verification Lab and open the finalized devnet receipts.
