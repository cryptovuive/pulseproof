# Judge scorecard — conservative pre-submission assessment

Checked: 13 July 2026.

## Score if submitted today: 93/100

Engineering/product readiness is approximately **95/100**. The public 2:24 video now records the deployed UI changing state, a fresh seven-step production proof run and the finalized Explorer receipt instead of relying on presentation frames. A recording of an actual score-changing TxLINE stream event and an uninterrupted Phantom-confirmation flow remain the material evidence gaps.

| Area | Score | Evidence-backed judge view |
|---|---:|---|
| Real consumer problem and differentiation | 19/20 | The product handles a real before/during/after fan journey and now makes its combined moat explicit: prefix-safe Catch-up, strict source lanes, an offline-safe pack, non-transferable memory and a public verification flight recorder. The community layer is still local-only. |
| TxLINE integration | 18/20 | Participant-owned devnet subscription, fixture/snapshot/historical/stat-validation usage, canonical public SSE bridge and a newly recorded fresh `ready + pulse` browser test are real. A captured score-changing event from an active covered match is still missing. |
| Product and UX | 19/20 | My Pulse, local timezone, reminders, Road to Final, Smart Alerts, Quick Tour, installable PWA, consumer-safe offline Catch-up, accessibility labels, mobile layout and strict spoiler behavior form a credible consumer product. Background Web Push after the app is closed and real community state are not yet implemented. |
| Solana relevance and security | 18/20 | Public devnet program, Config/FanPass/Receipt PDAs, Ed25519 attestation binding and anti-replay behavior are strong and non-financial. The final submission still needs a short, visible Phantom-to-Explorer UI recording that a judge can follow without reading code. |
| Demo and submission evidence | 19/20 | A 2:24 1080p demo records real product controls, state changes, seven fresh production checks and the finalized Explorer receipt. Captions, transcript, chapters and the Judge Room remain public. The video honestly does not portray the existing Explorer claim as a newly clicked Phantom transaction. |

## Why this is not honestly 95–100 yet

1. The public SSE bridge has verified authentication, `ready`, `pulse` and heartbeat, but no recorded goal/card/VAR event from a match while it was actually being published.
2. The public app has not been recorded connecting Phantom, signing and opening the resulting Explorer transaction in one uninterrupted flow.
3. Watch-room votes and counts intentionally remain local; presenting them as a community feature at scale would be misleading.
4. Browser notifications work while PulseProof is active; closed-app Web Push still needs a consented push subscription and revocation backend.

## Improvements shipped after the audit

- Matchday Command Center: continue current context, next followed fixture and transparent Road to Final.
- Final and third-place participants remain explicitly `TBD`; bracket winners are never inferred.
- Smart Alerts: verified-event-only policy, granular event types, followed/all-covered scope and broadcast delay.
- Spoiler-protected alert copy and a persistent in-app inbox; replay/metadata cannot manufacture alert activity.
- Four-step Quick Product Tour so a time-constrained judge reaches TxLINE, Catch-up and Solana evidence quickly.
- Installable PWA and bounded Offline Recap Pack; API/SSE traffic is never cached and all verification/claim actions fail closed offline.
- Judge Submission Room with public video player, chapters, captions, transcript and direct evidence links.
- Reproducible 2:24 1080p live-capture renderer with three real browser clips, English narration, chapter metadata, direct HWND isolation and a hard five-minute gate.
- Automated coverage increased to 86 tests across 19 suites, plus a public seven-step live proof runner.

## Highest-return actions before submission

1. During the next active covered fixture, capture the canonical `/api/scores/stream` output receiving a real score-changing `moment` and the UI updating from it.
2. Record the participant-controlled Phantom wallet approving a public devnet claim and opening the resulting Explorer transaction in one uninterrupted clip.
3. Have the human participant personally review the 2:24 narration and be able to explain every architecture/security decision before submission.
4. Only after the hackathon evidence is complete, add real Web Push and a moderated backend watch room; neither should delay the core submission.

With the first two evidence gaps closed, a conservative expected score becomes **94–96/100**. A credible 100/100 cannot be guaranteed because ranking also depends on other submissions and judge preference.

## Recommended five-minute judge path

1. Open Quick Tour and show provenance, personalization, Catch-up and Proof of Watch in under 45 seconds.
2. Arm Smart Alerts, show the source-linked bracket and explain why finalists remain TBD.
3. Open a TxLINE-covered fixture and show the public SSE `ready`, `pulse`, heartbeat and, if available, a real `moment` update.
4. Enable Spoiler Shield, start Catch-up and prove that Event 1 reports zero future goals/cards/VAR.
5. Run Judge Verification Lab, connect Phantom, seal one moment and open the devnet Explorer transaction.
