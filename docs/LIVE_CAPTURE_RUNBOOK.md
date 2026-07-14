# Unattended live capture runbook

## Failure found on France vs Spain

The Codex automation was created without a timezone-bearing `DTSTART` because immediate automation creation rejected that field. Its `BYHOUR=1;BYMINUTE=48` rule was interpreted as 01:48 UTC, or 08:48 in Bangkok, instead of 01:48 Bangkok. The machine stayed awake and the worker was never invoked. The incorrect jobs were deleted before their unintended UTC execution time.

## Replacement architecture

PulseProof now uses Windows Task Scheduler with an absolute local `StartBoundary`:

1. Start 15 minutes before the verified kickoff.
2. Wake the computer and run under an S4U background token, so a locked screen is not a blocker.
3. Run a watchdog every three minutes through the capture window.
4. Verify health, TxLINE credentials, fixture ID, and both teams before recording.
5. Launch headless Chrome and capture the product page through Chrome DevTools, independent of the desktop surface.
6. Record public SSE in parallel with receipt timestamps.
7. Write 15-minute MP4 segments so an interrupted final segment does not corrupt earlier footage.
8. Store retries in separate attempt directories and never overwrite earlier footage.
9. Prevent Windows sleep while the worker is active.
10. Validate every segment with FFprobe and produce a SHA-256 manifest after the window closes.

## Register a match

Use only a fixture already verified against the public API and an authoritative schedule:

```powershell
.\scripts\register-live-match-capture-task.ps1 `
  -FixtureId 18241006 `
  -ExpectedHome England `
  -ExpectedAway Argentina `
  -KickoffUtc '2026-07-15T19:00:00.000Z' `
  -RunName england-argentina-2026-07-16
```

## Physical limits

Wake timers can recover from sleep and `StartWhenAvailable` can recover a late start after boot. No local software can record while the computer is fully powered off, without electricity, or without network access. For the strongest guarantee, leave the computer powered, connected to the internet, and preferably on AC power.
