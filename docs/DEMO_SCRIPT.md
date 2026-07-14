# Demo video — delivered at 2:24.046

Public video: `https://pulseproof-production-06fa.up.railway.app/pulseproof-demo.mp4`

Judge room: `https://pulseproof-production-06fa.up.railway.app/submission`

The reproducible scene specification is `submission-assets/video/live-demo-scenes.json`. `scripts/render-live-demo-video.ps1` records three real browser clips from isolated Chrome profiles, mixes narration, emits five WebVTT cues plus transcript/chapter metadata, and rejects any output of five minutes or longer.

## 0:00–0:15 — the late-fan problem

One concise positioning frame: a trusted second screen for a fan who arrives late, loses connectivity or wants context without spoilers.

## 0:15–1:19 — real deployed product walkthrough

The production app runs with the opt-in `judgeDemo=1` route and visibly labels every action as `LIVE WALKTHROUGH`.

1. Load the public World Cup finished-match replay with its published-report label.
2. Press Spoiler Shield; all finished scores become hidden.
3. Press Start Catch-up; the normal consumer handler fetches the replay and advances through the visible prefix.
4. Scroll the real event timeline while the summary changes.
5. Press Share safe relay; the server signs the exact current prefix and the UI exposes its digest/cursor without any future-event payload.
6. Save the sanitised offline recap using the same UI control available to a fan.
7. Press Judge Verification Lab; request and locally verify a fresh short-lived Ed25519 proof.

## 1:19–1:45 — eight fresh production checks

The production Judge Room runs, in sequence:

1. health/network/credential identity;
2. live-versus-replay catalog separation;
3. public SSE `ready + pulse` without polling;
4. two-event spoiler-prefix isolation;
5. signed Catch-up Capsule issue/redeem plus browser-side Ed25519 verification and exact two-event delivery;
6. fresh browser-side Ed25519 verification;
7. executable TxLINE/PulseProof programs plus finalized receipt status;
8. PWA cache boundary that excludes APIs, SSE and proofs.

## 1:45–2:03 — public devnet evidence

Solana Explorer visibly shows `Success`, `Finalized`, signature, fee payer and slot `475862643`. Narration explicitly calls this a reference receipt; it is not presented as a new Phantom click.

## 2:03–2:24 — differentiated close

The final frame explains the system-level combination: source honesty, signed no-spoiler relay, progressive Catch-up, offline retention, non-transferable anti-replay memory and an in-product SSE-to-Solana flight recorder.

## Recording integrity checklist

- H.264/AAC, 1920×1080, 30 fps, 144.046 seconds.
- Each live clip is captured by its isolated Chrome `HWND`, not by recording the desktop.
- No API token, secret key, seed phrase, `.env`, personal tab or private session appears.
- Finished report replay is never called live TxLINE data.
- The Explorer receipt is described as already finalized, not as a transaction clicked during this recording.
- Contact-sheet and dedicated midpoint review confirm product, 8/8 proof and Explorer frames.
