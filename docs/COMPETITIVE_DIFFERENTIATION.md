# Competitive differentiation

Checked on 13 July 2026. This is a feature-level comparison, not a claim that every hackathon submission is publicly inspectable.

## What is already common

Live-score products already provide fixtures, favourites, notifications, play-by-play and finished-match recaps. FanCoach also markets instant explanations and fast Catch-up; Stathlon combines scoring, video and replay; LiveRecord records fandom activity on-chain. PulseProof must therefore be more than another scores UI, generic AI pundit or transferable fan-reward layer.

Reference products:

- [FanCoach](https://www.fancoach.ai/) — explanations, questions, predictions and Catch-up.
- [Stathlon](https://stathlon.com/) — scoring, streaming, clips and free replay.
- [LiveRecord](https://www.liverecord.fun/) — on-chain fandom and contribution scoring.
- [LiveScore World Cup features](https://www.livescore.com/en/media/livescore-features-wc-2026/) — mainstream score and tournament utility.
- [TxODDS Consumer and Fan Experiences](https://superteam.fun/earn/listing/consumer-and-fan-experiences) — the official judging criteria and example ideas.

## PulseProof's defensible combination

| Capability | Common score app | On-chain fan app | PulseProof |
| --- | --- | --- | --- |
| Multiple live fixtures | Usually | Sometimes | TxLINE-backed SSE, one multiplexed connection |
| Fast finished-match recap | Usually | Rarely | Progressive prefix replay with Spoiler Shield |
| Data-source honesty | Inconsistent | Inconsistent | Live, historical and report replay are impossible to confuse in the UI |
| Offline replay | Sometimes | Rarely | Sanitised consumer pack; APIs, SSE and proofs never enter cache |
| Fan memory | Account history | Often tokenised | Non-transferable receipt, no betting or financial reward |
| Anti-replay proof | No | Varies | Canonical Ed25519 message + preceding instruction + receipt PDA |
| Judge/user reproducibility | No | Rare | Seven-step in-product flight recorder validates SSE to Solana |

The novelty is not any single row. It is a **spoiler-safe, source-labelled, offline-capable fan memory loop whose trust chain is independently runnable inside the product**.

## Positioning sentence

> PulseProof is the trusted second screen for fans who arrive late: understand only what has happened so far, keep the recap offline, and seal a non-transferable memory with a source-bound receipt.

## Honest overlap assessment

- High overlap risk: fixtures, alerts, scores, favourites, generic recaps and local watch-room polls.
- Medium overlap risk: AI explanations, fan badges, proof of attendance and on-chain loyalty.
- Lower overlap risk: prefix-safe Catch-up + strict source lanes + consumer-safe offline pack + Ed25519/Solana anti-replay + a public SSE-to-chain verification flight recorder in one product.
- No honest audit can guarantee zero overlap with all current or future private submissions. The goal is a distinctive system-level combination and demonstrably stronger execution, not an unverifiable exclusivity claim.
