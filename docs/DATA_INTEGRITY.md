# Data integrity and no-fabrication policy

PulseProof treats an incorrect fixture as a product failure, even when the UI is labelled demo. The data path follows these rules.

## Source priority

1. An activated TxLINE `/fixtures/snapshot` response is authoritative for fixture IDs, participants and kick-off timestamps.
2. Without TxLINE credentials, the fallback contains only cross-checked public schedule facts with an explicit provider URL and verification timestamp.
3. Participants that depend on future results are rendered as `TBD`; PulseProof never predicts or infers a winner.
4. If a fallback is older than six hours it is visibly marked `Schedule needs re-check`.
5. If a source is unavailable and no verified fallback exists, the UI shows an empty state instead of generating a match.

## Current verified bracket state

Checked at `2026-07-13T10:30:00Z`:

- Brazil were eliminated 1–2 by Norway in the round of 16.
- Norway were then eliminated 1–2 by England in the quarter-finals.
- Morocco, Portugal, Switzerland and Belgium are also eliminated.
- Semi-final 101: France vs Spain, 14 July at 19:00 UTC, Dallas Stadium.
- Semi-final 102: England vs Argentina, 15 July at 19:00 UTC, Atlanta Stadium.
- Match 103 and Match 104 keep both participants as `TBD` until the semi-finals finish.

## Runtime integrity checks

`scheduleIntegrityIssues()` rejects:

- duplicate schedule IDs;
- invalid kick-off or verification timestamps;
- an eliminated team in an externally confirmed future fixture;
- `TBD` in a fixture claimed to have confirmed participants;
- inferred team names in a fixture marked participants-pending.

The verified fallback is not returned by `/api/schedule` if any integrity issue is present.

## Historical replay

The local replay is no longer a fictional result simulation. It reflects these externally cross-checked results:

- Brazil 1–2 Norway (World Cup 2026, round of 16, Match 91): Haaland 79', 90'; Neymar penalty 90+10'; Neymar yellow card 90+6'.
- Portugal 0–1 Spain (World Cup 2026, round of 16, Match 93): Merino 90+1'; yellow cards for Bernardo Silva 89', Renato Veiga 90+3' and Ferran Torres 90+8'.
- France 2–0 Morocco (World Cup 2026, quarter-final, Match 97): Mbappé 60', Dembélé 66'.

The source URLs are displayed in the application. Exact scorer, assist, card and stoppage-time fields are taken from the linked FIFA full-time report or published match report. Locally assigned sequence IDs remain explicitly non-TxLINE and `verified: false`; only events received from the authenticated TxLINE adapter may be labelled TxLINE-verified.

## Required production behaviour

- Do not cache fixture participants beyond the source's freshness policy.
- Do not merge media-reported events into a TxLINE-labelled stream.
- Do not call an externally verified schedule “TxLINE-covered” until the fixture appears in the participant's TxLINE snapshot.
- Do not persist or redistribute raw TxLINE datasets.
