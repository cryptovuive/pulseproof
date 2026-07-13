# Judge scorecard — honest pre-submission assessment

## Current score: 93/100

| Area | Score | Judge view |
|---|---:|---|
| Real consumer problem | 18/20 | Fans genuinely miss matches, struggle to scan multiple games and cannot distinguish verified events from social noise. The before/live/after journey is coherent. |
| TxLINE integration | 18/20 | The participant-owned devnet token is activated through an Explorer-visible subscription. Fixtures and direct `/scores/stream` authentication are verified against TxLINE; a recorded score-changing event during a covered live fixture is still needed. |
| Product and UX | 19/20 | Flags/codes, multi-match center, local-time schedule, countdown, reminders, calendar, Catch-up, source provenance and mobile layout form a credible consumer product. |
| Solana relevance | 20/20 | The program, config, Fan Pass, receipt and Ed25519 claim are public on devnet. Duplicate submission was rejected after the valid claim landed. |
| Demo and submission readiness | 18/20 | Source-linked replay, verified schedule and Verification Lab work without a wallet or payment. Public SSE hosting and the final live-event video remain the release blockers. |

## What now feels distinctive

PulseProof is not another score page. Its differentiator is a complete fan lifecycle:

1. **Before:** discover TxLINE-covered fixtures, convert UTC to local time, save a reminder and export a calendar alarm.
2. **During:** follow several games through one real-time SSE connection and receive understandable signal moments.
3. **After or when late:** replay only meaningful changes through Catch-up.
4. **Trust:** verify an evidence-bound attestation without installing a wallet; optionally seal it into a non-transferable Solana Fan Pass.

## What would raise it above 90

1. Record a score-changing event from live `/scores/stream` during a covered fixture; the authenticated heartbeat connection is already verified.
2. Host the app on an SSE-compatible public URL with secrets configured server-side.
3. Import the disposable test wallet into Phantom manually and record the already verified flow through the UI.
5. Have the human participant review, customise and explain every major decision. The official terms permit only natural-person entries and allow disqualification for work materially controlled by an autonomous agent.

## Demo order a judge should see

1. Upcoming Fixtures: timezone conversion, reminder and calendar.
2. Match Center: three concurrent match cards and Live filter.
3. Catch-up: 4x playback and jump to latest.
4. Judge Verification Lab: proof succeeds with no wallet/SOL.
5. Phantom: connect the participant-controlled devnet wallet and seal one moment.
6. Explorer/terminal: show the receipt PDA and duplicate-claim rejection.
