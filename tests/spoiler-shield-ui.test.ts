import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stageParticipantsRevealKnockoutOutcome } from "@/lib/spoiler-protection";

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
    expect(upcoming).toContain("stageParticipantsRevealKnockoutOutcome(entry.fixture.stage)");
    expect(upcoming).toContain('"Qualifier hidden"');
    expect(upcoming).toContain("Source available after reveal");
    expect(upcoming).toContain('"protected by Spoiler Shield"');
    expect(upcoming).toContain('homeTeam: "Qualifier 1", awayTeam: "Qualifier 2"');
  });

  it("covers both verified and TxLINE schedule shapes without masking semi-final pairings", () => {
    expect(stageParticipantsRevealKnockoutOutcome("Final · Match 104 · New York New Jersey Stadium")).toBe(true);
    expect(stageParticipantsRevealKnockoutOutcome("Third place · Match 103 · Miami Stadium")).toBe(true);
    expect(stageParticipantsRevealKnockoutOutcome("Semi-final · Match 102 · Atlanta Stadium")).toBe(false);
  });

  it("masks protected teams across match tiles, scoreboard, fan vote and chat", () => {
    expect(dashboard).toContain("const participantsProtected = preferences.spoilerFree && stageParticipantsRevealKnockoutOutcome");
    expect(dashboard).toContain('"Qualifiers hidden · open protected"');
    expect(dashboard).toContain('"Home qualifier hidden"');
    expect(dashboard).toContain('"Protected knockout fixture"');
    expect(component).toContain('"Knockout qualifiers hidden"');
  });
});
