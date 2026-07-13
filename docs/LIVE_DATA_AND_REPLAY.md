# Live data, multi-match and Catch-up

## Product behaviour

PulseProof is now designed around one live match center rather than one hard-coded fixture:

- Up to eight TxLINE-covered fixtures are ranked by distance from the current time.
- One multiplexed server-sent-event connection updates all visible match cards.
- Selecting a card changes the scoreboard, timeline, team flags/codes and watch room without a page reload.
- `All`, `Live` and `Finished` filters let a fan find the useful match quickly.
- Catch-up condenses the event log into signal moments and supports pause, scrub, `1x`, `2x`, `4x`, jump-to-latest and return-to-live.

The included fallback contains three completed, externally cross-checked result timelines: Brazil 1–2 Norway, Portugal 0–1 Spain and France 2–0 Morocco. Their key moments cite published match reports, while their locally assigned sequence IDs remain `verified: false` and are never represented as TxLINE feed records.

## TxLINE endpoint mapping

| PulseProof need | TxLINE endpoint | When used |
|---|---|---|
| Fixture catalog | `/api/fixtures/snapshot` | Initial match-center load |
| Current state | `/api/scores/snapshot/{fixtureId}` | Initial sequence cursor and catch-up-to-now |
| Completed replay | `/api/scores/historical/{fixtureId}` | Catch-up after `FT` |
| Real-time update | `/api/scores/stream` | Direct upstream SSE bridge; `/scores/stream` and legacy `/api/stream` remain compatible |
| Claim evidence | `/api/scores/stat-validation` | Goal/card/corner/final attestation |

Every upstream call is server-only and carries the guest Bearer JWT plus `X-Api-Token`. The browser sees normalized product events, never the API credentials.

## Stream guarantees

- `fixtureIds` accepts one to eight unique positive integers; the older singular `fixtureId` remains compatible.
- Initial snapshots establish the last known sequence so reconnecting does not replay the whole feed.
- Events older than or equal to the last sequence are discarded per fixture.
- Network chunks may split an SSE line or event anywhere; `lib/sse.ts` buffers through the blank-line boundary and supports comments, IDs, retry values and multi-line data.
- Common nested JSON envelopes are traversed to locate score records, with a depth bound and object cycle protection.
- PulseProof sends its own heartbeat every 15 seconds and retries a closed TxLINE stream after 1.5 seconds.
- The UI preserves each fixture independently, so an event for match A cannot overwrite match B.

TxLINE may legitimately send only heartbeat traffic when no subscribed/covered fixture is currently active. That is not treated as fake activity or converted into synthetic live events.

## Catch-up rules

For a match in progress, Catch-up replays the current score snapshot. For an `FT` match, it requests the historical event log. The replay state is derived only from the prefix `moments[0..cursor]`:

- score: newest event at or before the cursor carrying a score;
- minute and timestamp: current cursor event;
- phase: `HT`, `FT`, otherwise `CATCH-UP`;
- momentum: bounded deterministic weighting over the latest eight visible events;
- summary: goals, cards, VAR reviews and the last three important swings.

Live SSE continues updating the per-fixture cache while the user watches Catch-up. `Return live` therefore jumps to the newest state rather than restarting the page.

## Offline Recap Pack

A fan may save a finished match after its on-pitch recap is available. PulseProof stores only the transformed consumer moments needed for Catch-up, sanitises the original action label and reward fields, de-duplicates by fixture, validates restored records and keeps at most eight matches on the device.

The service worker caches the application shell and static assets only. Requests under `/api/`, `/api/scores/stream`, `/scores/stream` and the legacy stream alias always go to the network and are never written to Cache Storage. If the initial match catalog cannot load, the UI may restore a saved recap as an explicitly labelled `Offline library`; streaming, attestations, Judge Verification Lab and on-chain claims remain disabled until reconnection.

## Production activation checklist

1. Activate a TxLINE token for the intended network and set `TXLINE_NETWORK` to the same environment.
2. Store `TXLINE_API_TOKEN` and `ATTESTOR_SECRET_KEY` only in server-side environment variables.
3. Call `/api/health`, then `/api/matches`; verify the response source is `txline-live` rather than `demo-replay`.
4. Open `/api/scores/stream?fixtureIds=<covered-id>` during an active covered fixture and verify `ready`, `pulse`, heartbeat and new `moment` events.
5. Test one in-progress Catch-up (snapshot path) and one completed Catch-up (historical path).
6. Confirm the normalized participant names resolve to the expected flag and official three-letter team code.
7. Set `DEMO_REPLAY_ENABLED=false` for a strict production deployment, or keep it true only if the fallback label remains visible.

## Verification commands

```bash
npm test
npm run lint
npm run build
npm run contract:e2e:windows
```

The local integration probe should additionally verify that one replay stream returns moments for fixture IDs `18187298`, `18198205` and `18209181` before timeout.
