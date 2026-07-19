# Final demo video record

**Public video:** https://pulseproof-production-06fa.up.railway.app/pulseproof-demo.mp4

**Judge Room:** https://pulseproof-production-06fa.up.railway.app/submission

**Duration:** 4:49.046

**Format:** H.264/AAC, 1920x1080, 30 fps

**SHA-256:** `aa1b22060da889766f0091ff511b39ee27861fe828959e085afd7aead9578e59`

The final cut is a product test rather than a slide deck. Page captures show the deployed UI; desktop captures intentionally show Phantom during real devnet approvals. English male narration and sentence-level English WebVTT captions are included.

## Timeline

| Time | Chapter | Evidence shown |
|---:|---|---|
| 00:00 | Introducing PulseProof | Problem, before/during/after positioning and product promise |
| 00:18 | TxLINE-powered Live Center | World Cup catalog, source labels, official flags/codes, live/finished/upcoming state and public SSE architecture |
| 00:41 | Complete Catch-up replay | Start Catch-up, Event 1 through 9, score/momentum/timeline playback, speed controls, Match Brief, goal, substitution, chances and VAR with source sequences |
| 01:17 | One wallet across the product | Phantom session persists from Live Center into Fan Zone |
| 01:29 | Wallet-owned display name | Fan Alias edit is prepared on-chain |
| 01:40 | Alias transaction and receipt | Phantom approval, immediate alias state, confirmed receipt and Explorer link |
| 01:55 | Daily on-chain check-in | UTC streak preview and duplicate-claim guard |
| 02:05 | Immediate check-in state | Phantom approval, immediate points/streak update and confirmed receipt without reload |
| 02:18 | World Cup quiz | Five sourced questions, hidden answer sources, 5/5 result and daily/practice separation |
| 02:46 | Authorized quiz points | Phantom claim, immediate 70-point update and Explorer-verifiable receipt |
| 02:59 | Complete reward catalog | Scroll through all 36 original items, limited dates and fixed on-chain pricing |
| 03:27 | Atomic redeem and equip | Bolt Keeper becomes owned and active; points fall by the catalog price |
| 03:37 | Fixture-scoped match chat | On-chain alias, room isolation and moderation boundaries |
| 03:49 | Wallet-signed message | Phantom sign-message flow and immediate verified chat delivery |
| 04:07 | Eight fresh production checks | Health, catalog, SSE, spoiler isolation, Catch-up Capsule, Ed25519, Solana programs and offline boundary pass 8/8 |
| 04:39 | Every match leaves a memory | Product close and complete fan-memory loop |

## Integrity checklist

- Duration is below the track's five-minute hard limit.
- The video contains real product interaction and real Phantom devnet approval surfaces.
- Finished replay is represented as replay, never as a live match.
- The complete replay includes the event timeline and controls, not only a static score.
- TxLINE is described as the primary live input and the source sequences are visible.
- Wallet state updates and confirmed receipts appear immediately after successful actions.
- No seed phrase, private key, API token, signing key, `.env` file or personal message appears.
- Captions contain no dash glyphs and remain short enough not to hide important UI.
- Phantom desktop segments are cropped consistently with page-only segments.
- The final Judge Room sequence runs the product checks rather than relying on presentation claims.

## Reproducibility assets

- Scene specification: `submission-assets/video/v5-scenes.json`
- Render script: `scripts/render-final-demo-v5.ps1`
- Caption burn script: `scripts/burn-v5-captions.ps1`
- Browser capture script: `scripts/start-v5-browser-capture.ps1`
- Published captions: `public/pulseproof-demo.vtt`
- Published transcript: `public/pulseproof-demo-transcript.txt`
- Thumbnail: `public/pulseproof-demo-thumbnail.png`

Raw captures, generated audio, intermediate segments and PID files remain local and are intentionally excluded from Git. The final scene plan, renderer, captions, transcript, thumbnail and release MP4 are tracked.
