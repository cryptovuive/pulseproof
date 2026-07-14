# Submission-ready copy

The 2:24 live product-test video, judge room, app, repository and on-chain links below are submission-ready and publicly verifiable.

## Project name

PulseProof — Every Match Leaves a Memory

## One-liner

A TxLINE-powered live second screen that turns World Cup events into an accessible shared fan pulse and verifiable Proof-of-Watch memories on Solana.

## Problem

Fans already use a phone while watching football, but most second-screen products give them raw stats, noisy social feeds or betting flows. Casual fans still struggle to understand why a match is shifting, remote watch parties lack a shared rhythm, and digital fan memories are easy to fake or duplicate.

## Solution

PulseProof translates World Cup 2026 TxLINE score actions into a live score, momentum visual and plain-language moments; unverified competitions are filtered before rendering. A late fan can share an exact Catch-up position as a Verified Catch-up Capsule: the server commits only the visible event prefix, signs it with Ed25519 and re-checks the source on redemption, so the recipient receives no future-event payload. A fan can also check in daily, explore 10,000 source-preserving quiz variants, earn non-financial points and unlock 42 cosmetics including six interactive historical shirt tributes. Check-in, quiz claim, redemption and equipped identity live in a wallet-owned Fan Profile PDA; a separate Fan Alias PDA supplies the name for wallet-signed, fixture-scoped SSE chat.

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
- Anchor smart contract with Config, FanPass, FanProfile and moment/quiz/reward receipt PDAs.
- Solana Ed25519 precompile verification with exact preceding-instruction and message checks.
- Wallet/fixture/hash/points/badge/expiry are all signed; receipts stop duplicate claims.
- Source-linked historical fallback makes the demo reproducible without presenting local sequence IDs as live TxLINE data.
- `POST/GET /api/capsules` issues and redeems a bounded signed Catch-up prefix; modified, expired, over-cursor or source-divergent capsules fail closed.
- Installable PWA and bounded Offline Recap Pack preserve finished-match Catch-up on weak networks without caching API/SSE data or enabling offline claims.
- Solana-clock check-in, wallet-bound quiz receipt, catalog-bound redemption, 256-bit inventory and kind-safe equipped cosmetics are non-transferable and non-financial.
- Forty-two cosmetics include six front/back 3D shirt tributes; the sourced quiz engine exposes two/four choices and never sends answer keys before grading.
- Chat uses real SSE presence, bounded ephemeral storage and link/wagering/private-key/spam moderation; it contains no seeded engagement.
- Lint, TypeScript, production build, 114 unit/integration/contract/submission tests, SBF build and real public-devnet alias adversarial tests pass.

## Commercial path

The fan experience remains free. Fan clubs, publishers and sponsors pay for branded rooms, aggregate engagement analytics, campaign tooling and permissioned loyalty activations. Fan points remain non-financial. PulseProof does not resell or expose raw TxLINE data.

## Links

- Live app: `https://pulseproof-production-06fa.up.railway.app`
- Judge room: `https://pulseproof-production-06fa.up.railway.app/submission`
- Fan Zone: `https://pulseproof-production-06fa.up.railway.app/fan-zone`
- Demo video (2:24): `https://pulseproof-production-06fa.up.railway.app/pulseproof-demo.mp4`
- English captions: `https://pulseproof-production-06fa.up.railway.app/pulseproof-demo.vtt`
- 1080p thumbnail: `https://pulseproof-production-06fa.up.railway.app/pulseproof-demo-thumbnail.png`
- Public repository: `https://github.com/cryptovuive/pulseproof`
- Devnet program: `https://explorer.solana.com/address/74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn?cluster=devnet`
- Example transaction: `https://explorer.solana.com/tx/vid5hzmuF2FJnzFvZa7251fLdh5d5eRrn4WyvPd85WVKAcnccBbJhKEUFXx5VAXgvBEYp9bjZcToSp5yfnJHHCR?cluster=devnet`
- Fan progression upgrade: `https://explorer.solana.com/tx/5MdiMZ6czSTQumn5vrL2uJsmtBRp6SexTpTW23sRnKB7kj6iieUvZ5EfZtsW1cQF8wg1AnKM9r6zr2wda5yAgTUV?cluster=devnet`
- Quiz claim: `https://explorer.solana.com/tx/2dSD6oJMsZNAMSfCTYSkBXuMowc9hSC4dtp5rfwjJz8uYKGR7QJ6Wfy7jwFYYWewxsKA11XYqkX3t4pEPMqpAzxo?cluster=devnet`
- Reward redemption: `https://explorer.solana.com/tx/5y1ZXtGdmKRMfaSYpW321F9qBzaJQp3ttphfARVC2q9BXEM44dPBZHyUBpQbxN3n8dR9Xf28s8MbXPv2GnK5QpjA?cluster=devnet`
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
