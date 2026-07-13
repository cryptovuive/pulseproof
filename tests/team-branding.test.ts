import { describe, expect, it } from "vitest";
import { getTeamBranding, SUPPORTED_TEAM_COUNT } from "@/lib/team-branding";

describe("team branding", () => {
  it.each([
    ["France", "FRA", "FR"],
    ["Morocco", "MAR", "MA"],
    ["Japan", "JPN", "JP"],
    ["South Korea", "KOR", "KR"],
    ["Korea Republic", "KOR", "KR"],
    ["DR Congo", "COD", "CD"],
    ["United States", "USA", "US"],
    ["Saudi Arabia", "KSA", "SA"],
    ["Côte d'Ivoire", "CIV", "CI"],
    ["Curaçao", "CUW", "CW"],
    ["England", "ENG", "GB-ENG"],
    ["Scotland", "SCO", "GB-SCT"],
  ])("maps %s to the correct team code and flag", (name, code, flagKey) => {
    expect(getTeamBranding(name)).toMatchObject({ code, flagKey });
  });

  it("supports every team currently present in the documented schedule", () => {
    expect(SUPPORTED_TEAM_COUNT).toBeGreaterThanOrEqual(45);
  });

  it("uses a safe fallback for an unknown future qualifier", () => {
    expect(getTeamBranding("Future United")).toMatchObject({ code: "FUX", flagKey: "UN" });
  });
});
