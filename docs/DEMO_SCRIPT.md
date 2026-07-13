# Demo video script — target 4:35

## 0:00–0:30 — problem

“Most football fans watch with a phone in hand, but today’s second screens are either raw scoreboards, noisy feeds or betting products. PulseProof gives mainstream fans a clear shared match pulse and a verifiable memory of the moments they actually watched—without wagers or financial rewards.”

Show the dashboard hero and labelled source badge.

## 0:30–1:25 — fan experience

- Start the replay before recording or use a live covered match.
- Show score, minute and stage changing.
- Point to momentum and explain it is an engagement visual, not betting probability.
- Show latest-signal copy and timeline receiving a goal/card/VAR event.
- Click a watch-room option; state that reactions have no stake, entry fee or prize.

## 1:25–2:15 — TxLINE integration

Open the architecture diagram or code briefly:

- `POST /auth/guest/start`
- `/api/fixtures/snapshot`
- `/api/scores/snapshot/{fixtureId}`
- `/api/scores/historical/{fixtureId}`
- `/api/scores/stat-validation?...&statKeys=`

Explain that the token stays server-side, sequence comes from TxLINE, and raw data is transformed rather than redistributed. If replaying, say clearly: “This replay uses externally cross-checked results with locally assigned demo sequence IDs; those IDs are not TxLINE records. The same server route prioritises TxLINE whenever the activated token is configured.”

## 2:15–3:25 — wallet and smart contract

- Connect the prepared devnet Phantom wallet.
- Claim a goal or final moment.
- Show local signature verification, then the confirmed Solana signature/explorer.
- Explain canonical fields: wallet, fixture, moment hash, points, badge, expiry.
- Show `FanPass` and `MomentReceipt` PDAs.
- Attempt a duplicate claim or show the passing replay-resistance test.

## 3:25–4:05 — architecture and safety

- TxLINE is live sports input.
- Attestor re-fetches the server-side record; stat-based moments also call validation proof and store only its digest.
- Ed25519 precompile verifies the signature.
- Contract pins attestor, requires five-minute expiry, clamps points/badge and prevents replay.
- No FIFA branding, wagering, token rewards or API credential in the client.

## 4:05–4:35 — commercial path and close

“PulseProof starts free for fans. Fan clubs, media and sponsors pay for branded rooms, engagement analytics and loyalty activation. The moat is the real-time, verifiable fan graph powered by TxLINE—not resale of the data. The demo, API health route, public repo and tests are available in the submission.”

End on the Proof of Watch card and repository URL.

## Recording checklist

- Keep final file below 5:00.
- Browser zoom 100%; hide bookmarks/private tabs.
- Never display API token, secret key, wallet seed or `.env`.
- Show the source link; do not call a fallback replay “live TxLINE”.
- Use a funded devnet wallet and pre-test the exact moment claim.
- Record backup clip of the Solana explorer transaction.
