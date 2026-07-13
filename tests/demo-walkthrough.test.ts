import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("recordable judge walkthrough", () => {
  const dashboard = readFileSync(join(process.cwd(), "components", "pulse-dashboard.tsx"), "utf8");

  it("is opt-in and drives the same consumer controls shown to judges", () => {
    expect(dashboard).toContain('get("judgeDemo") !== "1"');
    expect(dashboard).toContain('params.get("demoDelay")');
    expect(dashboard).toContain('document.querySelector<HTMLButtonElement>(".catchup-primary")?.click()');
    expect(dashboard).toContain('document.querySelector<HTMLButtonElement>(".offline-save")?.click()');
    expect(dashboard).toContain('document.querySelector<HTMLButtonElement>(".judge-lab button")?.click()');
  });

  it("labels every action as a live walkthrough", () => {
    expect(dashboard).toContain("LIVE WALKTHROUGH");
    expect(dashboard).toContain("Actions call the same production UI and endpoints available to every judge.");
    expect(dashboard).toContain('id="event-timeline"');
  });
});
