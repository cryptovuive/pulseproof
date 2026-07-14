# Product growth research and ecosystem roadmap

Checked: 14 July 2026.

PulseProof should earn repeat use through relevance, continuity and trust—not fabricated depth, notification spam or financial incentives.

## Patterns worth adapting

| Product pattern | Public evidence | PulseProof adaptation |
|---|---|---|
| Favorite teams and personalized alerts | FotMob lists personalized news/alerts, instant goal notifications and home-screen live matches. | `My Pulse` stores followed teams locally, creates `My Matches` and resumes the last selected fixture. |
| A home screen shaped by favorites | SofaScore describes a home screen that adapts to fan favorites. | Match Center can reduce the catalog to followed participants without hiding the complete source catalog. |
| Before/during/after matchday loop | FotMob describes repeated use for line-ups/stats before kick-off, live moments during play and post-match follow-up. | Upcoming reminders → SSE match center → deterministic 90-second Catch-up → Proof of Watch. |
| Condensed replay and highlights | FIFA+ exposes full replays, extended highlights, highlights, goals and clips. | PulseProof provides a rights-safe event Catch-up and links published sources; it does not restream protected video. |
| Tournament path and granular alerts | LiveScore's World Cup 2026 hub exposes fixtures, a route to the final, commentary and selectable kick-off/goal/result alerts. | Matchday Command Center shows the source-linked knockout path while Smart Alerts expose only verified TxLINE event types with delay/spoiler controls. |
| Visual analysis and ratings | SofaScore exposes goal action animation, lineups, ratings and historical comparison. | Defer ratings, xG, lineups, shot maps and player comparison until a licensed provider supplies the underlying fields. |
| Daily knowledge loop and collection | FIFA's own tournament experiences use football trivia/points to give fans a lightweight reason to return. | A private-answer, source-linked daily quiz awards non-financial points through a replay-safe Solana receipt; points unlock identity cosmetics, never prizes or tokens. |

Research URLs:

- https://www.fotmob.com/aboutUs/advertise
- https://apps.apple.com/us/app/fotmob-soccer-live-scores/id488575683
- https://www.sofascore.com/news/sofascores-new-home-screen-a-smarter-faster-way-to-follow-sports
- https://www.sofascore.com/news/whats-new-in-sofascore-features-that-will-make-your-sport-experience-complete
- https://www.plus.fifa.com/en/catalogue/archive
- https://www.livescore.com/en/media/livescore-features-wc-2026/

## Implemented retention loop

1. **Plan:** source-linked upcoming fixtures, local timezone, countdown, reminders and calendar export.
2. **Personalize:** follow a national team; `My Matches` filters the catalog and persists without an account.
3. **Resume/share:** the last fixture and `?fixture=` deep link restore the exact context.
4. **Protect the experience:** Spoiler Shield hides finished scores, recap, timeline and final momentum until the fan chooses.
5. **Catch up:** a progressive event replay reveals only the prefix already watched; summary counts cannot leak future goals/cards.
6. **Relay safely:** a signed Catch-up Capsule lets a friend start from the same verified prefix without receiving any later event payload.
7. **Understand:** Match Brief uses only published on-pitch records and explicitly reports source-log coverage.
8. **Remember:** optional Solana Proof of Watch seals an attested moment without creating a transferable financial reward.
9. **Return:** Road to the Final and verified-event Smart Alerts give the fan a clear reason to come back without inventing news, engagement counts or unsupported statistics.
10. **Take it offline:** a fan can keep up to eight transformed finished-match recaps on the device; raw feeds, API/SSE responses and claim capability are deliberately excluded.
11. **Build identity:** daily Solana-clock check-in and sourced quiz claims grow one wallet-owned, non-transferable profile.
12. **Collect intentionally:** 42 non-transferable cosmetics create visible progression; six source-linked shirt tributes open a mannequin-worn front/back archive and seasonal pieces close at a disclosed time without pretending to have scarce supply.
13. **Meet real fans:** the live room starts empty, counts only connected SSE clients and never fabricates conversation or engagement.

## Accuracy gates for future features

No feature may enter the consumer UI unless all applicable gates pass:

- a provider and source URL are known;
- fixture identity and competition provenance are explicit;
- event timestamps preserve stoppage time;
- missing values stay unavailable instead of defaulting to zero;
- a source-log absence is not described as proof that an event never happened;
- replay/report events are never relabelled as TxLINE events;
- video is linked or embedded only when distribution rights permit it;
- derived ratings disclose their inputs and algorithm version;
- social counts come from a real backend and are never seeded with fake users.

## Next ecosystem increments

### Phase 2 — opt-in return triggers (partially shipped)

- Shipped: local-first Smart Alerts with separate toggles for kick-off, goal, red card, VAR and full time; only newly received verified TxLINE events qualify.
- Shipped: 0/30/60/120-second stream-delay control and generic protected alert copy whenever Spoiler Shield is active.
- Shipped: persistent in-app Matchday Inbox and optional browser notifications while the app is active; replay/metadata never create synthetic alerts.
- Shipped: installable PWA shell and an Offline Recap Pack for finished matches, with network-first navigation and a hard service-worker exclusion for every API/SSE route.
- Remaining: standards-based Web Push/service-worker delivery for alerts after the app is fully closed, which requires an explicit push-subscription privacy and revocation flow.
- Wallet-portable preferences only after a clear consent and privacy model; local-first remains the default.

### Phase 3 — richer licensed match intelligence

- Lineups, substitutions, player pages, team form and head-to-head only from licensed endpoints.
- Shot maps/xG only if coordinates and model provenance are supplied.
- Official FIFA+ highlight links attached to finished fixtures when a stable match-specific URL exists.

### Phase 4 — real community layer

- Shipped for the hackathon: one global ephemeral SSE room with real presence, bounded history, spam/link/wagering/secret moderation and no seeded users.
- Remaining: durable fixture-scoped rooms, wallet-signed identity, reports/blocks, cross-instance pub/sub and human moderator tooling.
- Event-linked reactions and polls with rate limits; no wagering, stakes or transferable prizes.
- Shipped: Verified Catch-up Capsules that cite the source lane, commit an exact prefix and fail closed when modified, expired or source-divergent.

## Metrics that protect product quality

- My Pulse activation rate and followed-team retention.
- Return rate in the 30 minutes before a followed kick-off.
- Catch-up starts, completion rate and spoiler exits.
- Source-link opens and proof-verification success rate.
- SSE reconnect/error rate and event freshness while a match is live.
- Notification disable rate and complaint rate as guardrails against spam.
- Daily quiz completion/claim rate, seven-day streak survival and points-to-cosmetic redemption conversion.
- Chat send/error/moderation rate; presence is operational telemetry, never a fake social-proof counter.

Raw browsing history, wallet identity and notification behavior must not be sold or used to create dark patterns.
