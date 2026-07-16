import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Road to the final Spoiler Shield", () => {
  const component = readFileSync(join(process.cwd(), "components", "matchday-command-center.tsx"), "utf8");
  const upcoming = readFileSync(join(process.cwd(), "components", "upcoming-match-hub.tsx"), "utf8");
  const dashboard = readFileSync(join(process.cwd(), "components", "pulse-dashboard.tsx"), "utf8");

  it("hides finished scores and winner styling while protection is active", () => {
    expect(component).toContain("const protectResult = spoilerFree && Boolean(entry.result)");
    expect(component).toContain('protectResult ? <EyeOff size={12} /> : entry.result.score[0]');
    expect(component).toContain("const homeWon = !protectResult");
    expect(component).toContain('"Start spoiler-free replay"');
  });

  it("does not reveal finalists or third-place participants through the bracket", () => {
    expect(component).toContain('protectParticipants ? "Finalist hidden"');
    expect(component).toContain('label="Final" spoilerFree={spoilerFree} hideParticipants');
    expect(component).toContain('label="Third place" spoilerFree={spoilerFree} hideParticipants');
    expect(component).toContain('"Fixture hidden by Spoiler Shield"');
  });

  it("also masks result-derived participants and source links in upcoming fixtures", () => {
    expect(dashboard).toContain("spoilerFree={preferences.spoilerFree}");
    expect(upcoming).toContain("spoilerFree && (Boolean(entry.participantPaths) || /^(final|third place)\\b/i.test(entry.fixture.stage))");
    expect(upcoming).toContain('"Qualifier hidden"');
    expect(upcoming).toContain("Source available after reveal");
    expect(upcoming).toContain('"protected by Spoiler Shield"');
    expect(upcoming).toContain('homeTeam: "Qualifier 1", awayTeam: "Qualifier 2"');
  });
});
