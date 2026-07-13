import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("installable offline shell contract", () => {
  it("publishes a standalone sports app manifest", () => {
    expect(manifest()).toMatchObject({
      short_name: "PulseProof",
      id: "/",
      lang: "en",
      start_url: "/",
      scope: "/",
      display: "standalone",
      theme_color: "#d9ff43",
    });
    expect(manifest().icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/pulseproof-mark.svg", purpose: "any" }),
      expect.objectContaining({ src: "/pulseproof-mark.svg", purpose: "maskable" }),
    ]));
  });

  it("never caches API or SSE responses", () => {
    const worker = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
    expect(worker).toContain('url.pathname.startsWith("/api/")');
    expect(worker).toContain('url.pathname.startsWith("/scores/stream")');
    expect(worker).not.toContain('APP_SHELL = ["/api/');
  });

  it("provides a network-first navigation fallback and versioned cache cleanup", () => {
    const worker = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
    expect(worker).toContain('CACHE_NAME = "pulseproof-shell-v2"');
    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain('.catch(() => caches.match("/")');
    expect(worker).toContain('key.startsWith("pulseproof-shell-")');
  });
});
