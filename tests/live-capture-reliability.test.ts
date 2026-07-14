import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("unattended live capture reliability", () => {
  it("records the page headlessly and segments recoverable MP4 output", () => {
    const recorder = read("scripts/headless-live-page-recorder.mjs");
    expect(recorder).toContain('"--headless=new"');
    expect(recorder).toContain('"Page.startScreencast"');
    expect(recorder).toContain('"segment", "-segment_time", "900"');
    expect(recorder).toContain("resultFile");
  });

  it("preflights fixture identity, records SSE, and prevents system sleep", () => {
    const worker = read("scripts/capture-live-match-worker.ps1");
    expect(worker).toContain("fixture.homeTeam -ne $ExpectedHome");
    expect(worker).toContain("scores/stream?fixtureIds=$FixtureId");
    expect(worker).toContain("SetThreadExecutionState");
    expect(worker).toContain("attempts\\$attemptId");
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
  });

  it("never overwrites an earlier failed attempt", () => {
    const starter = read("scripts/start-live-match-capture.ps1");
    const worker = read("scripts/capture-live-match-worker.ps1");
    expect(starter).toContain("capture-requests.ndjson");
    expect(worker).toContain("yyyyMMdd-HHmmssfff");
    expect(worker).toContain("attempts\\$attemptId");
  });
});
