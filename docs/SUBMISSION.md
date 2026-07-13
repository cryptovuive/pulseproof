# Submission-ready copy

Replace the remaining video placeholder before submission. The app, repository and on-chain links below were verified publicly.

## Project name

PulseProof — Every Match Leaves a Memory

## One-liner

A TxLINE-powered live second screen that turns World Cup events into an accessible shared fan pulse and verifiable Proof-of-Watch memories on Solana.

## Problem

Fans already use a phone while watching football, but most second-screen products give them raw stats, noisy social feeds or betting flows. Casual fans still struggle to understand why a match is shifting, remote watch parties lack a shared rhythm, and digital fan memories are easy to fake or duplicate.

## Solution

PulseProof translates TxLINE score actions into a live score, momentum visual, plain-language moments and watch-room prompts. A fan can optionally connect a Solana wallet and seal selected moments. The server re-checks the fixture and sequence against TxLINE, signs a short-lived attestation, and the PulseProof program creates an anti-replay receipt while updating a non-transferable Fan Pass.

There are no wagers, deposits, entry fees, transferable rewards or prize pools.

## TxLINE endpoints used

1. `POST /auth/guest/start` — renewable guest JWT.
2. `GET /api/fixtures/snapshot` — covered fixture metadata.
3. `GET /api/scores/snapshot/{fixtureId}` — current score/action state.
4. `GET /api/scores/historical/{fixtureId}` — completed-match replay and real sequence values.
5. `GET /api/scores/stat-validation?fixtureId=...&seq=...&statKeys=...` — proof payload for goal/card/corner/final claims; PulseProof returns only a digest to minimise redistribution.

## Technical highlights

- Next.js application and server routes with a transformed SSE match stream.
- TxLINE credentials are server-only; network, API host and Solana program are paired.
- Deterministic schema normaliser handles documented upper/lower-case fields.
- Anchor smart contract with Config, FanPass and MomentReceipt PDAs.
- Solana Ed25519 precompile verification with exact preceding-instruction and message checks.
- Wallet/fixture/hash/points/badge/expiry are all signed; receipts stop duplicate claims.
- Source-linked historical fallback makes the demo reproducible without presenting local sequence IDs as live TxLINE data.
- Installable PWA and bounded Offline Recap Pack preserve finished-match Catch-up on weak networks without caching API/SSE data or enabling offline claims.
- Lint, production build, 74 unit/integration/contract tests and a real local-validator adversarial suite pass.

## Commercial path

The fan experience remains free. Fan clubs, publishers and sponsors pay for branded rooms, aggregate engagement analytics, campaign tooling and permissioned loyalty activations. Fan points remain non-financial. PulseProof does not resell or expose raw TxLINE data.

## Links

- Live app: `https://pulseproof-production-06fa.up.railway.app`
- Demo video (≤5 minutes): `<https://...>`
- Public repository: `https://github.com/cryptovuive/pulseproof`
- Devnet program: `https://explorer.solana.com/address/74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn?cluster=devnet`
- Example transaction: `https://explorer.solana.com/tx/vid5hzmuF2FJnzFvZa7251fLdh5d5eRrn4WyvPd85WVKAcnccBbJhKEUFXx5VAXgvBEYp9bjZcToSp5yfnJHHCR?cluster=devnet`
- Health endpoint: `https://pulseproof-production-06fa.up.railway.app/api/health`

## TxLINE feedback — edit after real use

What worked well:

- The unified fixture/score model and deterministic soccer stat keys make it practical to connect live UI and on-chain verification.
- Historical records with real sequence values are especially valuable for reproducible demos after a match.
- Separating guest JWT and activated API token gives a clear renewable credential flow.

Friction we observed:

- The public docs would benefit from a compact, typed example of the raw soccer score-action payload next to the normalisation guide.
- A browser-focused streaming example and an explicit token/JWT expiry table would reduce integration guesswork.
- A machine-readable endpoint-to-service-level coverage response would make automatic fallback messaging easier.

Do not submit this feedback unchanged unless it matches your actual experience.
