import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("unattended live capture reliability", () => {
  it("records the page headlessly and segments recoverable MP4 output", () => {
    const recorder = read("scripts/headless-live-page-recorder.mjs");
    expect(recorder).toContain('"--headless=new"');
    expect(recorder).toContain('"Page.startScreencast"');
    expect(recorder).toContain('"segment", "-segment_time", "300"');
    expect(recorder).toContain("segment_format_options");
    expect(recorder).toContain("expectedTeamsVisible");
    expect(recorder).toContain("Chrome DevTools command timed out");
    expect(recorder).toContain("resultFile");
  });

  it("preflights fixture identity, records SSE, and prevents system sleep", () => {
    const worker = read("scripts/capture-live-match-worker.ps1");
    expect(worker).toContain("fixture.homeTeam -ne $ExpectedHome");
    expect(worker).toContain("scores/stream?fixtureIds=$FixtureId");
    expect(worker).toContain("SetThreadExecutionState");
    expect(worker).toContain("attempts\\$attemptId");
    expect(worker).toContain("dataLicense.active");
    expect(worker).toContain("Recorder liveness file is stale");
    expect(worker).toContain("video output stopped growing");
    expect(worker).toContain("Start-EventLogger");
  });

  it("uses an OS-local absolute trigger with wake, retry, and watchdog semantics", () => {
    const scheduler = read("scripts/register-live-match-capture-task.ps1");
    expect(scheduler).toContain("$kickoff.ToLocalTime()");
    expect(scheduler).toContain("New-ScheduledTaskTrigger -Once -At $startLocal");
    expect(scheduler).toContain("-WakeToRun -StartWhenAvailable");
    expect(scheduler).toContain("-RestartCount 3");
    expect(scheduler).toContain("-LogonType S4U");
    expect(scheduler).toContain("ensure-live-match-capture.ps1");
    expect(scheduler).toContain("$RunName-preflight");
    expect(scheduler).toContain("-DurationSeconds 10");
    expect(scheduler).toContain("finalize-live-match-capture.ps1");
    expect(scheduler).toContain("[int]$CaptureWindowMinutes = 270");
    expect(scheduler).toContain("[int]$WatchdogIntervalMinutes = 1");
  });

  it("restarts a process that is alive but no longer publishing liveness", () => {
    const watchdog = read("scripts/ensure-live-match-capture.ps1");
    expect(watchdog).toContain("$stateAge -le 75");
    expect(watchdog).toContain("Stop-Process -Id $processId");
    expect(watchdog).toContain("Start-Sleep -Seconds 2");
  });

  it("assembles and hashes a complete recording only after duration validation", () => {
    const finalizer = read("scripts/finalize-live-match-capture.ps1");
    expect(finalizer).toContain("MinimumVideoSeconds = 7200");
    expect(finalizer).toContain("concat-segments.txt");
    expect(finalizer).toContain("Set-Content -Encoding ascii");
    expect(finalizer).toContain("Get-FileHash -Algorithm SHA256");
    expect(finalizer).toContain("coverageGapSeconds");
    expect(finalizer).toContain("uninterrupted");
  });

  it("never overwrites an earlier failed attempt", () => {
    const starter = read("scripts/start-live-match-capture.ps1");
    const worker = read("scripts/capture-live-match-worker.ps1");
    expect(starter).toContain("capture-requests.ndjson");
    expect(worker).toContain("yyyyMMdd-HHmmssfff");
    expect(worker).toContain("attempts\\$attemptId");
  });

  it("keeps an off-machine scheduled recorder with a manual rehearsal mode", () => {
    const workflow = read(".github/workflows/england-argentina-live-capture.yml");
    const remote = read("scripts/run-remote-live-capture.mjs");
    expect(workflow).toContain('cron: "35 18 15 7 *"');
    expect(workflow).toContain("timeout-minutes: 350");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("browser-actions/setup-chrome@v1");
    expect(workflow).toContain("command -v ffmpeg");
    expect(workflow).toContain("compression-level: 0");
    expect(remote).toContain("2026-07-15T23:30:00.000Z");
    expect(remote).toContain("fixtureId = 18241006");
    expect(remote).toContain("attemptNumber <= 5");
    expect(remote).toContain("capture-manifest.json");
    expect(remote).toContain("sha256");
  });
});
