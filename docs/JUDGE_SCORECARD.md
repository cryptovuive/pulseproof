# Judge scorecard — conservative pre-submission assessment

Checked: 13 July 2026.

## Score if submitted today: 84/100

Engineering/product readiness is approximately **91/100**, but a hackathon judge scores the submitted evidence, not only the repository. The missing final demo video and missing recording of an actual score-changing TxLINE stream event therefore reduce the submission score materially.

| Area | Score | Evidence-backed judge view |
|---|---:|---|
| Real consumer problem and differentiation | 18/20 | The product handles a real before/during/after fan journey: fixture planning, multi-match coverage, spoiler-safe Catch-up, source provenance and Proof of Watch. It is more differentiated than a basic score page, although the community layer is still local-only. |
| TxLINE integration | 17/20 | Participant-owned devnet subscription, fixture/snapshot/historical/stat-validation usage, canonical public SSE bridge and public `ready`/`pulse`/`heartbeat` evidence are real. A captured score-changing event from an active covered match is still missing. |
| Product and UX | 18/20 | My Pulse, local timezone, reminders, Road to Final, Smart Alerts, Quick Tour, accessibility labels, mobile layout and strict spoiler behavior form a credible consumer product. Background Web Push after the app is closed and real community state are not yet implemented. |
| Solana relevance and security | 18/20 | Public devnet program, Config/FanPass/Receipt PDAs, Ed25519 attestation binding and anti-replay behavior are strong and non-financial. The final submission still needs a short, visible Phantom-to-Explorer UI recording that a judge can follow without reading code. |
| Demo and submission evidence | 13/20 | Railway, health, CI, APIs, replay and Judge Verification Lab are public. The required concise demo video is still a placeholder, and the strongest live TxLINE/Phantom proof is spread across docs rather than shown in one judge-ready recording. |

## Why this is not honestly 95–100 yet

1. No final demo video of five minutes or less is linked in the submission.
2. The public SSE bridge has verified authentication, `ready`, `pulse` and heartbeat, but no recorded goal/card/VAR event from a match while it was actually being published.
3. The public app has not been recorded connecting Phantom, signing and opening the resulting Explorer transaction in one uninterrupted flow.
4. Watch-room votes and counts intentionally remain local; presenting them as a community feature at scale would be misleading.
5. Browser notifications work while PulseProof is active; closed-app Web Push still needs a consented push subscription and revocation backend.

## Improvements shipped after the audit

- Matchday Command Center: continue current context, next followed fixture and transparent Road to Final.
- Final and third-place participants remain explicitly `TBD`; bracket winners are never inferred.
- Smart Alerts: verified-event-only policy, granular event types, followed/all-covered scope and broadcast delay.
- Spoiler-protected alert copy and a persistent in-app inbox; replay/metadata cannot manufacture alert activity.
- Four-step Quick Product Tour so a time-constrained judge reaches TxLINE, Catch-up and Solana evidence quickly.
- Automated coverage increased to 64 tests across 14 suites.

## Highest-return actions before submission

1. Record one 4:30–4:50 demo using the existing script: problem → Quick Tour → live/public TxLINE SSE → Catch-up → Judge Lab → Phantom → Explorer.
2. During the next active covered fixture, capture the canonical `/api/scores/stream` output receiving a real `moment` event and the UI updating from it.
3. Record the participant-controlled Phantom wallet completing a public devnet claim and show the exact Explorer receipt transaction.
4. Replace the `<https://...>` video placeholder and have the human participant personally review and explain every architecture/security decision.
5. Only after the hackathon evidence is complete, add real Web Push and a moderated backend watch room; neither should delay the core submission.

With the first three evidence gaps closed, a conservative expected score becomes **93–95/100**. A credible 100/100 cannot be guaranteed because ranking also depends on other submissions and judge preference.

## Recommended five-minute judge path

1. Open Quick Tour and show provenance, personalization, Catch-up and Proof of Watch in under 45 seconds.
2. Arm Smart Alerts, show the source-linked bracket and explain why finalists remain TBD.
3. Open a TxLINE-covered fixture and show the public SSE `ready`, `pulse`, heartbeat and, if available, a real `moment` update.
4. Enable Spoiler Shield, start Catch-up and prove that Event 1 reports zero future goals/cards/VAR.
5. Run Judge Verification Lab, connect Phantom, seal one moment and open the devnet Explorer transaction.
