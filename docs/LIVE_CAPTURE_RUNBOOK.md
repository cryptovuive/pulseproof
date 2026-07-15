# Unattended live capture runbook

## Failure found on France vs Spain

The Codex automation was created without a timezone-bearing `DTSTART` because immediate automation creation rejected that field. Its `BYHOUR=1;BYMINUTE=48` rule was interpreted as 01:48 UTC, or 08:48 in Bangkok, instead of 01:48 Bangkok. The machine stayed awake and the worker was never invoked. The incorrect jobs were deleted before their unintended UTC execution time.

## Replacement architecture

PulseProof now uses Windows Task Scheduler with an absolute local `StartBoundary`:

1. Run a full ten-second headless recording rehearsal 75 minutes before kickoff.
2. Start the primary capture 15 minutes before the verified kickoff and an independent backup 20 minutes before kickoff.
3. Wake the computer and run under an S4U background token, so a locked screen is not a blocker.
4. Run a watchdog every minute through the capture window. A live PID is not enough: the worker, browser health file and growing video bytes must all remain fresh.
5. Verify health, TxLINE credentials, fixture ID, and both teams before recording.
6. Launch headless Chrome and capture the product page through Chrome DevTools, independent of the desktop surface.
7. Record public SSE in parallel with receipt timestamps.
8. Write recoverable fragmented five-minute MP4 segments so a damaged final segment cannot invalidate earlier footage.
9. Store retries in separate attempt directories and never overwrite earlier footage.
10. Prevent Windows sleep while the worker is active.
11. Restart the SSE logger independently if it exits, without interrupting video.
12. Validate every segment with FFprobe, assemble a full-match MP4 and produce a SHA-256 manifest after the window closes.

## Register a match

Use only a fixture already verified against the public API and an authoritative schedule:

```powershell
.\scripts\register-live-match-capture-task.ps1 `
  -FixtureId 18241006 `
  -ExpectedHome England `
  -ExpectedAway Argentina `
  -KickoffUtc '2026-07-15T19:00:00.000Z' `
  -RunName england-argentina-2026-07-16

.\scripts\register-live-match-capture-task.ps1 `
  -FixtureId 18241006 `
  -ExpectedHome England `
  -ExpectedAway Argentina `
  -KickoffUtc '2026-07-15T19:00:00.000Z' `
  -LeadMinutes 20 `
  -PreflightMinutes 90 `
  -RunName england-argentina-2026-07-16-backup
```

Both recorders use separate Chrome profiles, worker processes, video directories, SSE logs, watchdogs and final manifests. One capture can therefore fail without destroying the other copy.

## Physical limits

Wake timers can recover from sleep and `StartWhenAvailable` can recover a late start after boot. No local software can record while the computer is fully powered off, without electricity, or without network access. For the strongest guarantee, leave the computer powered, connected to the internet, and preferably on AC power.
