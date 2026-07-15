import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("judge submission assets", () => {
  it("ships a compact browser-playable MP4 container", () => {
    const path = join(root, "public", "pulseproof-demo.mp4");
    const header = readFileSync(path).subarray(4, 12).toString("ascii");
    const size = statSync(path).size;
    expect(header).toContain("ftyp");
    expect(size).toBeGreaterThan(1_000_000);
    expect(size).toBeLessThan(20_000_000);
    const thumbnail = readFileSync(join(root, "public", "pulseproof-demo-thumbnail.png"));
    expect(thumbnail.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(thumbnail.length).toBeGreaterThan(100_000);
  });

  it("publishes five live-demo caption cues and ends before five minutes", () => {
    const vtt = readFileSync(join(root, "public", "pulseproof-demo.vtt"), "utf8");
    const cues = [...vtt.matchAll(/(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})/g)];
    expect(cues).toHaveLength(5);
    const final = cues.at(-1)!;
    const finalSeconds = Number(final[5]) * 3600 + Number(final[6]) * 60 + Number(final[7]) + Number(final[8]) / 1000;
    expect(finalSeconds).toBeLessThan(300);
  });

  it("keeps one live capture/still and narration block per chapter", () => {
    const scenes = JSON.parse(readFileSync(join(root, "submission-assets", "video", "live-demo-scenes.json"), "utf8")) as Array<{ source: string; kind: string; title: string; text: string }>;
    expect(scenes).toHaveLength(5);
    expect(new Set(scenes.map((scene) => scene.source)).size).toBe(5);
    expect(scenes.filter((scene) => scene.kind === "video")).toHaveLength(3);
    expect(scenes.every((scene) => scene.title.length > 5 && scene.text.split(/\s+/).length > 25)).toBe(true);
  });

  it("connects the judge room to video, captions, public evidence and capture slides", () => {
    const page = readFileSync(join(root, "app", "submission", "page.tsx"), "utf8");
    expect(page).toContain("/pulseproof-demo.mp4");
    expect(page).toContain("/pulseproof-demo.vtt");
    expect(page).toContain("explorer.solana.com/tx/");
    expect(page).toContain("params.capture === \"1\"");
    expect(page).toContain("<JudgeLiveLab />");
    expect(page).toContain('href="/compliance"');
    expect(readFileSync(join(root, "components", "judge-live-lab.tsx"), "utf8")).toContain("Signed fan relay");
    expect(readFileSync(join(root, "app", "api", "judge-proof", "route.ts"), "utf8")).toContain("getSignatureStatus");
  });
});
