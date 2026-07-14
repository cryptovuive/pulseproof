import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("recordable judge walkthrough", () => {
  const dashboard = readFileSync(join(process.cwd(), "components", "pulse-dashboard.tsx"), "utf8");

  it("is opt-in and drives the same consumer controls shown to judges", () => {
    expect(dashboard).toContain('get("judgeDemo") !== "1"');
    expect(dashboard).toContain('params.get("demoDelay")');
    expect(dashboard).toContain('document.querySelector<HTMLButtonElement>(".catchup-primary")?.click()');
    expect(dashboard).toContain('document.querySelector<HTMLButtonElement>(".capsule-share")?.click()');
    expect(dashboard).toContain('document.querySelector<HTMLButtonElement>(".offline-save")?.click()');
    expect(dashboard).toContain('document.querySelector<HTMLButtonElement>(".judge-lab button")?.click()');
    expect(dashboard).toContain('scrollIntoView({ behavior: "auto", block: "center" })');
  });

  it("labels every action as a live walkthrough", () => {
    expect(dashboard).toContain("LIVE WALKTHROUGH");
    expect(dashboard).toContain("Actions call the same production UI and endpoints available to every judge.");
    expect(dashboard).toContain("Verified Catch-up Capsule");
    expect(dashboard).toContain('id="event-timeline"');
  });

  it("redeems a shared capsule before the first match render to prevent spoiler flash", () => {
    const tokenLookup = dashboard.indexOf('const capsuleToken = params.get("capsule")');
    const catchUpHydration = dashboard.indexOf("setCatchUp(capsuleRedemption.pulse)");
    const ready = dashboard.indexOf("setPreferencesReady(true)", catchUpHydration);
    expect(tokenLookup).toBeGreaterThan(0);
    expect(catchUpHydration).toBeGreaterThan(tokenLookup);
    expect(ready).toBeGreaterThan(catchUpHydration);
    expect(dashboard).toContain("savedPreferences = { ...savedPreferences, spoilerFree: true }");
  });
});
